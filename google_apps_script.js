/**
 * KruPortfolio AI - Google Drive Ingestion Daemon
 * 
 * Instructions:
 * 1. Open Google Apps Script (script.google.com).
 * 2. Create a new project and paste this code.
 * 3. Configure the settings (ROOT_FOLDER_ID, BACKEND_URL, SECRET_TOKEN, USER_ID) below.
 * 4. Run `initTrigger()` once to configure a time-driven trigger (runs every 10 minutes).
 */

// ==========================================
// CONFIGURATION SETTINGS
// ==========================================
const ROOT_FOLDER_ID = 'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE'; 
const BACKEND_URL = 'https://kruportfolio-e6a7srlns-gors-projects-fcf77064.vercel.app/api/drive-webhook';
const SECRET_TOKEN = 'your-secure-shared-secret-token-here';
const USER_ID = 'supabase-teacher-uuid-here'; // The teacher profile ID this folder maps to

const PROCESSED_TAG = '[kruportfolio_processed]';
const MAX_FILES_PER_CYCLE = 25; // Prevents Google Apps Script execution timeout (6 min limit)

/**
 * Main entry point run by the time-driven trigger
 */
function scanFolderForNewFiles() {
  try {
    const rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
    let filesProcessedCount = 0;
    
    // Process files recursively starting from the root folder
    processFilesInFolder(rootFolder, filesProcessedCount);
    
    Logger.log('Folder scan finished successfully.');
  } catch (error) {
    Logger.log('Critical error during folder scan: ' + error.toString());
  }
}

/**
 * Recursively scans folders and processes unprocessed files.
 */
function processFilesInFolder(folder, filesProcessedCount) {
  // 1. Process files in the current folder
  const files = folder.getFiles();
  
  while (files.hasNext() && filesProcessedCount < MAX_FILES_PER_CYCLE) {
    const file = files.next();
    
    if (shouldProcessFile(file)) {
      const success = sendFileToBackend(file, folder.getName());
      if (success) {
        markFileAsProcessed(file);
        filesProcessedCount++;
        Logger.log('Successfully processed file: ' + file.getName() + ' (ID: ' + file.getId() + ')');
      } else {
        Logger.log('Skipping metadata tag for file: ' + file.getName() + ' due to webhook failure.');
      }
    }
  }
  
  if (filesProcessedCount >= MAX_FILES_PER_CYCLE) {
    Logger.log('Reached maximum files limit (' + MAX_FILES_PER_CYCLE + ') for this cycle. Yielding.');
    return filesProcessedCount;
  }
  
  // 2. Recurse into subfolders
  const subfolders = folder.getFolders();
  while (subfolders.hasNext() && filesProcessedCount < MAX_FILES_PER_CYCLE) {
    const subfolder = subfolders.next();
    filesProcessedCount = processFilesInFolder(subfolder, filesProcessedCount);
  }
  
  return filesProcessedCount;
}

/**
 * Checks if the file should be processed based on its description tag and MIME type.
 */
function shouldProcessFile(file) {
  const description = file.getDescription() || '';
  
  // Skip if already processed
  if (description.indexOf(PROCESSED_TAG) !== -1) {
    return false;
  }
  
  // Skip folders or shortcut file pointers if any (DriveApp.getFiles() only returns files, but let's double check)
  const mimeType = file.getMimeType();
  if (mimeType === MimeType.FOLDER || mimeType === 'application/vnd.google-apps.shortcut') {
    return false;
  }
  
  return true;
}

/**
 * Sends the file metadata payload to the Supabase Edge Function
 */
function sendFileToBackend(file, parentFolderName) {
  const payload = {
    userId: USER_ID,
    fileId: file.getId(),
    fileName: file.getName(),
    mimeType: file.getMimeType(),
    createdTime: file.getDateCreated().toISOString(),
    downloadUrl: file.getDownloadUrl(),
    parentFolder: parentFolderName
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + SECRET_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true // Capture errors without crashing the thread
  };
  
  try {
    const response = UrlFetchApp.fetch(BACKEND_URL, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();
    
    if (responseCode === 202 || responseCode === 200) {
      return true;
    } else {
      Logger.log('Backend rejected request for file ' + file.getName() + ' with Status Code: ' + responseCode + '. Response: ' + responseBody);
      return false;
    }
  } catch (error) {
    Logger.log('HTTP Fetch Error during webhook dispatch for file ' + file.getName() + ': ' + error.toString());
    return false;
  }
}

/**
 * Appends the process tag to the file's description on Google Drive
 */
function markFileAsProcessed(file) {
  try {
    const currentDescription = file.getDescription() || '';
    const newDescription = currentDescription 
      ? currentDescription + '\n' + PROCESSED_TAG 
      : PROCESSED_TAG;
    
    file.setDescription(newDescription);
  } catch (error) {
    Logger.log('Failed to update file description metadata for file ' + file.getName() + ': ' + error.toString());
  }
}

/**
 * Configures the execution trigger to run every 10 minutes.
 * Run this function once from the Google Apps Script UI.
 */
function initTrigger() {
  // Delete existing triggers on scanFolderForNewFiles to avoid duplicate runs
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'scanFolderForNewFiles') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Create a time-driven trigger executing every 10 minutes
  ScriptApp.newTrigger('scanFolderForNewFiles')
    .timeBased()
    .everyMinutes(10)
    .create();
    
  Logger.log('Successfully initialized time-driven execution trigger (runs every 10 minutes).');
}

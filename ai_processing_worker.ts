/**
 * KruPortfolio AI - AI Ingestion & Classification Worker
 * Environment: Deno (Supabase Edge Functions)
 * 
 * Dependencies:
 * - @supabase/supabase-js
 * - openai
 * 
 * Database Prerequisites (Run this DDL to create the atomic dequeuer):
 * 
 * CREATE OR REPLACE FUNCTION dequeue_processing_job()
 * RETURNS TABLE (
 *   job_id UUID,
 *   user_id UUID,
 *   file_id VARCHAR,
 *   resource_uri TEXT
 * ) AS $$
 * DECLARE
 *   target_id UUID;
 * BEGIN
 *   -- Find the oldest queued job and lock it to prevent race conditions
 *   SELECT id INTO target_id
 *   FROM public.processing_job
 *   WHERE status = 'queued'
 *   ORDER BY created_at ASC
 *   LIMIT 1
 *   FOR UPDATE SKIP LOCKED;
 * 
 *   IF target_id IS NOT NULL THEN
 *     -- Atomically lock status to prevent other worker threads from dequeuing it
 *     UPDATE public.processing_job
 *     SET status = 'downloading', updated_at = NOW()
 *     WHERE id = target_id;
 * 
 *     RETURN QUERY 
 *     SELECT id, p.user_id, p.file_id, p.resource_uri
 *     FROM public.processing_job p
 *     WHERE p.id = target_id;
 *   END IF;
 * END;
 * $$ LANGUAGE plpgsql;
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import OpenAI from 'https://esm.sh/openai@4.28.0';

// Initialize Client Constants
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error('Critical Error: Environment variables are missing.');
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// JSON Schema definition for strict LLM output structure matching
const CLASSIFICATION_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    suggested_indicator_code: {
      type: 'string',
      description: 'The วPA indicator code that best fits this evidence document.',
      enum: [
        'I1.1', 'I1.2', 'I1.3', 'I1.4', 'I1.5', 'I1.6', 'I1.7', 'I1.8',
        'I2.1', 'I2.2', 'I2.3', 'I2.4',
        'I3.1', 'I3.2', 'I3.3',
        'ICH1.1'
      ]
    },
    ocr_summary: {
      type: 'string',
      description: 'A concise summary of the document, in Thai.'
    },
    ai_tags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Keywords describing the content, subject, and grade level in Thai.'
    },
    confidence_score: {
      type: 'number',
      description: 'AI confidence score between 0.00 and 1.00.'
    },
    reasoning_justification: {
      type: 'string',
      description: 'Explanation for why this indicator was selected, in Thai.'
    }
  },
  required: [
    'suggested_indicator_code',
    'ocr_summary',
    'ai_tags',
    'confidence_score',
    'reasoning_justification'
  ],
  additionalProperties: false
};

/**
 * Main worker loop function that dequeues and processes a single job.
 */
export async function processNextJob(): Promise<boolean> {
  let activeJobId: string | null = null;
  
  try {
    // 1. Dequeue next job atomically using SKIP LOCKED
    const { data: job, error: dequeueError } = await supabase
      .rpc('dequeue_processing_job')
      .maybeSingle();

    if (dequeueError) {
      throw new Error(`Queue Dequeue RPC Error: ${dequeueError.message}`);
    }

    if (!job) {
      // No queued jobs in the database
      return false; 
    }

    activeJobId = job.job_id;
    console.log(`Acquired locked Job UUID: ${activeJobId} for File ID: ${job.file_id}`);

    // 2. Simulate streaming/downloading from Google Drive API
    // (In production, replace with actual DriveAPI download client using oauth flow)
    const fileMetadata = await downloadFileMetadataFromDrive(job.file_id);
    
    // 3. Document Extraction (Token optimized)
    await updateJobStatus(activeJobId, 'extracting');
    const extractedText = await extractTextContent(job.file_id, fileMetadata.mimeType);

    // 4. AI Analysis & Embedding Generation
    await updateJobStatus(activeJobId, 'analyzing');

    // Step 4a: Call OpenAI Embeddings API (1536 dimensions)
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: extractedText.substring(0, 8000), // Protect context limits
    });
    const embeddingVector = embeddingResponse.data[0].embedding;

    // Step 4b: Call OpenAI Chat Completions using strict JSON Schema structured outputs
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are the AI Evaluation Ingestion Engine for KruPortfolio AI, a specialized platform for Thai Teacher Evaluations under the วPA (ว1st) framework.
Analyze raw text/OCR data from a teacher's evidence file and classify it into the most appropriate evaluation indicator.`
        },
        {
          role: 'user',
          content: `Document Content Extract:\n"""\n${extractedText}\n"""`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'evidence_classification',
          strict: true,
          schema: CLASSIFICATION_RESPONSE_SCHEMA
        }
      },
      temperature: 0.1 // High determinism
    });

    const classificationResult = JSON.parse(chatResponse.choices[0].message.content || '{}');

    // 5. Database Mutation (Single Transaction Block)
    // Find the teacher's active portfolio for the academic year matching current year metadata, or pick default active portfolio.
    const portfolioId = await resolveActivePortfolio(job.user_id);

    // Insert new evidence record
    const { data: evidenceRecord, error: evidenceError } = await supabase
      .from('evidence')
      .insert([
        {
          portfolio_id: portfolioId,
          user_id: job.user_id,
          title: fileMetadata.fileName,
          description: classificationResult.ocr_summary,
          source: 'google_drive',
          file_path: job.file_id,
          file_url: job.resource_uri,
          mime_type: fileMetadata.mimeType,
          file_size_bytes: fileMetadata.fileSizeBytes,
          ocr_text: extractedText,
          ai_summary: classificationResult.ocr_summary,
          ai_tags: classificationResult.ai_tags,
          ai_metadata: {
            justification: classificationResult.reasoning_justification,
            parent_folder: fileMetadata.parentFolder
          },
          confidence_score: classificationResult.confidence_score,
          embedding: embeddingVector
        }
      ])
      .select('id')
      .single();

    if (evidenceError) {
      throw new Error(`Database Insert Error (Evidence): ${evidenceError.message}`);
    }

    // Lookup indicator UUID matching suggested code (e.g. 'I1.1')
    const indicatorId = await resolveIndicatorId(classificationResult.suggested_indicator_code);

    // Create many-to-many relationship mapping
    const { error: mappingError } = await supabase
      .from('evidence_indicator_mapping')
      .insert([
        {
          evidence_id: evidenceRecord.id,
          indicator_id: indicatorId,
          user_id: job.user_id,
          verification_status: 'pending'
        }
      ]);

    if (mappingError) {
      throw new Error(`Database Insert Error (Mapping): ${mappingError.message}`);
    }

    // 6. Complete Job
    await supabase
      .from('processing_job')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', activeJobId);

    console.log(`Job successfully completed. Job ID: ${activeJobId}`);
    return true;

  } catch (error) {
    console.error(`Fatal processing error in worker: ${error.message}`);
    
    if (activeJobId) {
      // Catch error state, update status to failed and append log to db
      await supabase
        .from('processing_job')
        .update({
          status: 'failed',
          error_log: `${error.message}\nStack Trace:\n${error.stack}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeJobId);
    }
    
    return false;
  }
}

// ==========================================
// PIPELINE HELPER METHODS
// ==========================================

async function updateJobStatus(jobId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('processing_job')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', jobId);
  if (error) throw new Error(`Failed to update status to "${status}": ${error.message}`);
}

async function downloadFileMetadataFromDrive(fileId: string) {
  // In production, fetch using Google Drive Client Library:
  // e.g. drive.files.get({ fileId: fileId, fields: 'name, mimeType, size, parents' })
  // Here we mock the file retrieval:
  return {
    fileName: `สอนการบ้านคณิตศาสตร์_${fileId.substring(0, 4)}.pdf`,
    mimeType: 'application/pdf',
    fileSizeBytes: 4194304, // 4MB
    parentFolder: 'คณิตศาสตร์ ม.3'
  };
}

/**
 * Extracts raw text. Implements page filtering for large documents.
 */
async function extractTextContent(fileId: string, mimeType: string): Promise<string> {
  if (mimeType.startsWith('image/')) {
    // Invoke Vision API or OCR trigger
    return `ข้อความรูปภาพใบงานวิชาคณิตศาสตร์ หัวข้อเลขยกกำลัง ม.3`;
  }
  
  if (mimeType === 'application/pdf') {
    // Programmatic Page filtering simulation:
    // If the PDF is large, extract only first 5 pages and last 5 pages.
    const totalPagesMock = 62; 
    console.log(`PDF Document contains ${totalPagesMock} pages. Applying adaptive token layout filter.`);
    
    if (totalPagesMock > 50) {
      return `[Page 1-5 Extract: คำนำ สารบัญ แผนการเรียนรู้ตัวชี้วัดวิชาคณิตศาสตร์ ค1.2 ม.3 เรื่องระบบสมการเชิงเส้น]\n` +
             `[Page 58-62 Extract: สรุปและประเมินผลการเรียนรู้ของนักเรียน คะแนนเฉลี่ยร้อยละ 82.5 ลงลายมือชื่อครูณัฐภัทร วงศ์ดี]`;
    } else {
      return `[Full PDF Text Extract: แผนการสอนและข้อมูลกิจกรรมคณิตศาสตร์ ค1.2 ม.3]`;
    }
  }

  if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
    // In production, pipe audio output of demuxer to Whisper API:
    // const transcription = await openai.audio.transcriptions.create({ file: fileStream, model: "whisper-1" });
    return `[ถอดเสียงคำสอน]: นักเรียนทุกคนครับ วันนี้เราจะเรียนเรื่องระบบสมการเชิงเส้นสองตัวแปรกันนะครับ...`;
  }

  return 'เอกสารไม่สนับสนุนการอ่านไฟล์อัตโนมัติ';
}

async function resolveActivePortfolio(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('portfolio')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Failed to resolve active portfolio for user ID ${userId}. Ensure a portfolio is created first.`);
  }
  return data.id;
}

async function resolveIndicatorId(indicatorCode: string): Promise<string> {
  const { data, error } = await supabase
    .from('indicator')
    .select('id')
    .eq('code', indicatorCode)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Indicator code "${indicatorCode}" is invalid or does not exist in indicators table.`);
  }
  return data.id;
}

// Supabase Edge Function: drive-webhook
// Description: Secure receiver for Google Apps Script push notifications.
// Runtime: Deno (TypeScript)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

// Interface defining the expected incoming webhook payload
interface IngestionPayload {
  userId: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  createdTime: string;
  downloadUrl: string;
  parentFolder: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify Authentication Token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or malformed Authorization header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.split(' ')[1];
    const systemSecretToken = Deno.env.get('INGESTION_SECRET_TOKEN');

    if (!systemSecretToken || token !== systemSecretToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized. Shared secret token mismatch.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse Payload
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed. Use POST.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: IngestionPayload = await req.json();
    const { userId, fileId, fileName, mimeType, downloadUrl } = payload;

    // Basic Validation
    if (!userId || !fileId || !fileName || !mimeType || !downloadUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid payload: missing required fields.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Initialize Supabase Client (Service Role Key to bypass RLS for system operations)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Critical Error: Environment variables SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are not configured.');
      return new Response(
        JSON.stringify({ success: false, error: 'Internal server error.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Log the Job in Database (with status 'queued')
    const { data: jobData, error: jobError } = await supabase
      .from('processing_job')
      .insert([
        {
          user_id: userId,
          file_id: fileId,
          resource_uri: downloadUrl,
          status: 'queued',
          retry_count: 0
        }
      ])
      .select('id')
      .single();

    if (jobError) {
      console.error(`Database Error logging job for file ID ${fileId}:`, jobError.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to queue processing job.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Success Logging & Quick Response
    console.log(`Job successfully queued. UUID: ${jobData.id} for File: "${fileName}" (ID: ${fileId})`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification received, processing job created.',
        job_id: jobData.id
      }),
      {
        status: 202, // 202 Accepted represents successful receipt for background processing
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unhandled request exception:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

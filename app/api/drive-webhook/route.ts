import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ตรวจสอบความปลอดภัยด้วย Token ลับ
const INGESTION_SECRET_TOKEN = process.env.INGESTION_SECRET_TOKEN || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: Request) {
  try {
    // 1. ตรวจสอบสิทธิ์ Bearer Token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    if (!INGESTION_SECRET_TOKEN || token !== INGESTION_SECRET_TOKEN) {
      return NextResponse.json({ success: false, error: 'Token Mismatch' }, { status: 403 });
    }

    // 2. ดึงข้อมูล Metadata จาก Payload
    const payload = await req.json();
    const { userId, fileId, fileName, mimeType, downloadUrl } = payload;

    if (!userId || !fileId || !fileName || !mimeType || !downloadUrl) {
      return NextResponse.json({ success: false, error: 'Missing Fields' }, { status: 400 });
    }

    // 3. เชื่อมต่อกับ Supabase Database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 4. บันทึกคิวงานลงตาราง processing_job
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
      return NextResponse.json({ success: false, error: jobError.message }, { status: 500 });
    }

    // 5. ส่งสถานะตอบกลับทันที (202 Accepted)
    return NextResponse.json({
      success: true,
      message: 'Job queued successfully',
      job_id: jobData.id
    }, { status: 202 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

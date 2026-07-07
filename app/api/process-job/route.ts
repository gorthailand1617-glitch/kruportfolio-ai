import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// ป้องกัน Token ลัดในการเรียก API ตรงจากภายนอก
const INGESTION_SECRET_TOKEN = process.env.INGESTION_SECRET_TOKEN || '';

const CLASSIFICATION_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    suggested_indicator_code: {
      type: 'string',
      enum: [
        'I1.1', 'I1.2', 'I1.3', 'I1.4', 'I1.5', 'I1.6', 'I1.7', 'I1.8',
        'I2.1', 'I2.2', 'I2.3', 'I2.4',
        'I3.1', 'I3.2', 'I3.3',
        'ICH1.1'
      ]
    },
    ocr_summary: { type: 'string' },
    ai_tags: { type: 'array', items: { type: 'string' } },
    confidence_score: { type: 'number' },
    reasoning_justification: { type: 'string' }
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

export async function POST(req: Request) {
  let activeJobId: string | null = null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 1. ตรวจสอบสิทธิ์ความปลอดภัย
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    if (!INGESTION_SECRET_TOKEN || token !== INGESTION_SECRET_TOKEN) {
      return NextResponse.json({ success: false, error: 'Token Mismatch' }, { status: 403 });
    }

    // 2. ดึงข้อมูล Job ID หรือรับ Event Payload จาก Supabase Database Webhook
    const webhookPayload = await req.json();
    
    // Supabase Webhook ส่งข้อมูลแถวใหม่มาในรูปแบบ: { record: { id: "...", ... } }
    const jobId = webhookPayload.record?.id || webhookPayload.jobId;
    if (!jobId) {
      return NextResponse.json({ success: false, error: 'Missing Job ID' }, { status: 400 });
    }

    activeJobId = jobId;

    // 3. ดึงรายละเอียดของงานเพื่อประมวลผล
    const { data: job, error: jobError } = await supabase
      .from('processing_job')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message}`);
    }

    // ข้ามงานประมวลผลเสร็จแล้ว
    if (job.status === 'completed') {
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    // 4. อัปเดตสถานะงานเป็นกำลังดึงข้อมูล
    await supabase.from('processing_job').update({ status: 'extracting', updated_at: new Date().toISOString() }).eq('id', jobId);

    // จำลองดึงเอกสารต้นทางและจัดสกัดตัวอักษร OCR
    const fileMetadata = {
      fileName: `สอนการบ้านคณิตศาสตร์_${job.file_id.substring(0, 4)}.pdf`,
      mimeType: 'application/pdf',
      fileSizeBytes: 4194304,
      parentFolder: 'คณิตศาสตร์ ม.3'
    };

    const extractedText = `[คำอธิบายรายวิชาคณิตศาสตร์ ม.3 บูรณาการหัวข้อ สมการเชิงเส้นตัวแปรเดียวและระบบสมการและตัวชี้วัด ค1.2 ม.3/1 เพื่อมุ่งเน้นการจัดทำแผนการเรียนรู้ที่มีประสิทธิภาพ]`;

    // 5. เรียกใช้ OpenAI API เพื่อจำแนกประเภทและวิเคราะห์ข้อมูล
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    
    // 5a. สร้างเวกเตอร์ Embedding (1536-dim)
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: extractedText,
    });
    const embeddingVector = embeddingResponse.data[0].embedding;

    // 5b. จัดจำแนกหมวดหมู่ผ่าน Chat Completions ด้วย Structured Output JSON Schema
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are the AI Evaluation Ingestion Engine for KruPortfolio AI. Classify the teacher evidence text into the matching วPA indicator.'
        },
        {
          role: 'user',
          content: `Document Content:\n"""\n${extractedText}\n"""`
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
      temperature: 0.1
    });

    const classificationResult = JSON.parse(chatResponse.choices[0].message.content || '{}');

    // 6. อัปเดตข้อมูลลงตาราง evidence และ evidence_indicator_mapping
    // ค้นหา Portfolio ID ของคุณครูคนนี้
    const { data: portfolio } = await supabase
      .from('portfolio')
      .select('id')
      .eq('user_id', job.user_id)
      .limit(1)
      .maybeSingle();

    if (!portfolio) {
      throw new Error(`Active portfolio not found for User ID ${job.user_id}`);
    }

    // เพิ่มข้อมูลหลักฐานอ้างอิง
    const { data: evidenceRecord, error: evidenceError } = await supabase
      .from('evidence')
      .insert([
        {
          portfolio_id: portfolio.id,
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
      throw new Error(`Failed to insert evidence: ${evidenceError.message}`);
    }

    // ดึง Indicator ID ตามรหัสที่ AI แนะนำ
    const { data: indicator } = await supabase
      .from('indicator')
      .select('id')
      .eq('code', classificationResult.suggested_indicator_code)
      .single();

    if (!indicator) {
      throw new Error(`Indicator code ${classificationResult.suggested_indicator_code} is invalid.`);
    }

    // สร้างข้อมูลความสัมพันธ์
    await supabase.from('evidence_indicator_mapping').insert([
      {
        evidence_id: evidenceRecord.id,
        indicator_id: indicator.id,
        user_id: job.user_id,
        verification_status: 'pending'
      }
    ]);

    // 7. อัปเดตตารางคิวงานว่าเสร็จสิ้นแล้ว
    await supabase.from('processing_job').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', jobId);

    return NextResponse.json({ success: true, message: 'Job completed successfully', evidence_id: evidenceRecord.id });

  } catch (error: any) {
    console.error('API Error:', error.message);
    if (activeJobId) {
      await supabase.from('processing_job').update({
        status: 'failed',
        error_log: `${error.message}\nStack Trace:\n${error.stack}`,
        updated_at: new Date().toISOString()
      }).eq('id', activeJobId);
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

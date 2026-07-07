# KruPortfolio AI (Teacher Portfolio OS)
## คู่มือการนำระบบขึ้นระบบคลาวด์จริง (Production Deployment Guide)

เอกสารฉบับนี้อธิบายขั้นตอนการ Deploy ระบบ KruPortfolio AI ทั้งหมดเข้าสู่ระบบคลาวด์จริงทีละขั้นตอน (Step-by-Step) ประกอบด้วย Supabase (ฐานข้อมูลและหลังบ้าน), Vercel (หน้าบ้าน Next.js) และ Google Apps Script (ตัวตรวจจับและดึงไฟล์จาก Drive)

---

## 1. การเตรียมการและติดตั้งระบบฐานข้อมูลบน Supabase Production

### ขั้นตอนที่ 1.1: สร้างโปรเจกต์ใหม่บน Supabase
1. เข้าสู่ระบบที่ [database.supabase.com](https://database.supabase.com)
2. คลิก **New Project** เลือกองค์กร (Organization) และตั้งค่าโปรเจกต์:
   * **Name:** `kruportfolio-ai`
   * **Database Password:** (กำหนดรหัสผ่านที่ปลอดภัยและจดบันทึกไว้)
   * **Region:** เลือกโซนใกล้ประเทศไทย เช่น `Singapore (ap-southeast-1)`
3. รอระบบดำเนินการจัดเตรียมฐานข้อมูลประมาณ 2-3 นาที

### ขั้นตอนที่ 1.2: ติดตั้งสคีมาฐานข้อมูล (Database Schema DDL)
1. ไปที่เมนู **SQL Editor** ในแถบเมนูด้านซ้ายของ Supabase Dashboard
2. คลิก **New Query**
3. คัดลอกเนื้อหาทั้งหมดในสคริปต์ [schema.sql](file:///e:/---%20Sand%20Box%20---/Teacher%20Portfolio%20OS/schema.sql) มาวางในช่องกรอกข้อความ
4. คลิกปุ่ม **Run** ด้านล่างขวา เพื่อสร้างตาราง ดัชนี (Indexes) ระบบรักษาความปลอดภัย RLS, และข้อมูลตั้งต้น (Seed Data)
5. ตรวจสอบให้แน่ใจว่าไม่มีข้อผิดพลาด (Success) ปรากฏในแถบผลลัพธ์

### ขั้นตอนที่ 1.3: ติดตั้งฟังก์ชันจัดลำดับการทำงาน (AI Queue Lock Function)
1. คลิกสร้าง **New Query** ใน SQL Editor อีกครั้ง
2. วางโค้ดสร้างฟังก์ชันจัดการคิวแบบปรมาณู (Atomic Queue Dequeuer) ด้านล่างนี้:
   ```sql
   CREATE OR REPLACE FUNCTION dequeue_processing_job()
   RETURNS TABLE (
     job_id UUID,
     user_id UUID,
     file_id VARCHAR,
     resource_uri TEXT
   ) AS $$
   DECLARE
     target_id UUID;
   BEGIN
     -- ค้นหาคิวงานที่เก่าที่สุดและล็อกแถวนั้นเพื่อป้องกันการประมวลผลซ้ำ
     SELECT id INTO target_id
     FROM public.processing_job
     WHERE status = 'queued'
     ORDER BY created_at ASC
     LIMIT 1
     FOR UPDATE SKIP LOCKED;

     IF target_id IS NOT NULL THEN
       -- อัปเดตสถานะเป็นกำลังดาวน์โหลดเพื่อไม่ให้ Worker ตัวอื่นดึงซ้ำ
       UPDATE public.processing_job
       SET status = 'downloading', updated_at = NOW()
       WHERE id = target_id;

       RETURN QUERY 
       SELECT id, p.user_id, p.file_id, p.resource_uri
       FROM public.processing_job p
       WHERE p.id = target_id;
     END IF;
   END;
   $$ LANGUAGE plpgsql;
   ```
3. คลิกปุ่ม **Run** เพื่อบันทึกฟังก์ชันลงในฐานข้อมูล

---

## 2. การ Deploy Supabase Edge Functions (Backend API & AI Worker)

เราจะทำการติดตั้งเครื่องมือ Supabase CLI บนเครื่องพัฒนาของคุณ เพื่อความสะดวกในการตรวจสอบสิทธิ์และ Deploy ฟังก์ชันระบบหลังบ้าน

### ขั้นตอนที่ 2.1: ติดตั้งและตั้งค่า Supabase CLI
เปิด Terminal (เช่น PowerShell) ในเครื่องของคุณ และทำตามคำสั่งด้านล่างนี้:

1. **ติดตั้ง Supabase CLI** (ผ่าน Scoop หรือ Node.js npm):
   ```bash
   # ติดตั้งผ่าน npm
   npm install -g supabase
   ```
2. **เข้าสู่ระบบสิทธิ์นักพัฒนา** (Login):
   ```bash
   supabase login
   ```
   *(คำสั่งนี้จะเปิดเบราว์เซอร์ให้คุณยืนยันตัวตนกับบัญชี Supabase ของคุณ)*

3. **เตรียมโฟลเดอร์สำหรับ Edge Functions** (ในโฟลเดอร์โปรเจกต์):
   ```bash
   supabase init
   ```

4. **เชื่อมโยงโปรเจกต์คลาวด์** (Link Project):
   ```bash
   # ค้นหา Project Reference ID ได้จากหน้าตั้งค่าของ Supabase Dashboard
   supabase link --project-ref <your-project-reference-id>
   ```

### ขั้นตอนที่ 2.2: กำหนดค่าตัวแปรความลับ (Environment Secrets)
กำหนดคีย์ความปลอดภัยของ OpenAI และคีย์ยืนยันตัวตนสำหรับ Google Apps Script:
```bash
# กำหนดรหัสยืนยันตัวตนที่ตกลงร่วมกันกับ Google Apps Script
supabase secrets set INGESTION_SECRET_TOKEN="your-secure-shared-secret-token"

# กำหนด OpenAI API Key สำหรับการสร้าง Vector และประมวลผล AI Classification
supabase secrets set OPENAI_API_KEY="sk-proj-xxxxxxxxxxxxxxxx"
```

### ขั้นตอนที่ 2.3: บันทึกและ Deploy โค้ด Edge Functions
1. คัดลอกโค้ดจาก [supabase_edge_function.ts](file:///e:/---%20Sand%20Box%20---/Teacher%20Portfolio%20OS/supabase_edge_function.ts) และนำไปบันทึกไว้ในโครงสร้างโฟลเดอร์โปรเจกต์ของคุณที่:
   * `./supabase/functions/drive-webhook/index.ts`
2. คัดลอกโค้ดจาก [ai_processing_worker.ts](file:///e:/---%20Sand%20Box%20---/Teacher%20Portfolio%20OS/ai_processing_worker.ts) และบันทึกไว้ที่:
   * `./supabase/functions/ai-worker/index.ts`
3. สั่ง Deploy ทั้ง 2 ฟังก์ชันขึ้นระบบคลาวด์คราวเดียวด้วยคำสั่ง:
   ```bash
   supabase functions deploy drive-webhook
   supabase functions deploy ai-worker
   ```
4. ระบบจะส่งคืน URL ของ API ปลายทาง เช่น:
   * `https://<your-project-id>.supabase.co/functions/v1/drive-webhook`

---

## 3. การ Deploy หน้าบ้าน Next.js ขึ้น Vercel

### ขั้นตอนที่ 3.1: เตรียม Source Code ขึ้น Git Repository
1. ทำการสร้าง Git ในโฟลเดอร์โปรเจกต์ และ Push โค้ดทั้งหมดของคุณขึ้นไปยังบัญชี GitHub / GitLab หรือ Bitbucket:
   ```bash
   git init
   git add .
   git commit -m "feat: initial release of KruPortfolio AI"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

### ขั้นตอนที่ 3.2: นำเข้าโปรเจกต์บน Vercel Dashboard
1. ลงชื่อเข้าใช้ที่ [vercel.com](https://vercel.com)
2. คลิกปุ่ม **Add New...** จากนั้นเลือก **Project**
3. ค้นหาและเชื่อมต่อกับ Git Repository ที่คุณอัปโหลดไว้ในขั้นตอนก่อนหน้า
4. เลือก Framework Preset เป็น **Next.js** และระบุ Root Directory

### ขั้นตอนที่ 3.3: กำหนดค่าตัวแปรสภาพแวดล้อม (Environment Variables)
ในเมนู **Environment Variables** ให้กำหนดข้อมูลการเชื่อมต่อกับ Supabase Production:
*   `NEXT_PUBLIC_SUPABASE_URL` = `https://<your-project-id>.supabase.co`
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `(คีย์ระดับสาธารณะ คัดลอกมาจาก API Settings ใน Supabase Dashboard)`

### ขั้นตอนที่ 3.4: สั่ง Build & Deploy
1. คลิกปุ่ม **Deploy**
2. Vercel จะรวบรวมไฟล์และทำลายการพึ่งพา (Dependencies) ใน 1-2 นาที
3. เมื่อเสร็จสิ้น คุณจะได้ลิงก์หน้าแรกของระบบ เช่น `https://kruportfolio-ai.vercel.app`

---

## 4. การเชื่อมต่อ Google Apps Script บน Google Drive

### ขั้นตอนที่ 4.1: สร้างสคริปต์ตรวจจับไฟล์
1. เข้าไปที่ Google Drive ของผู้สอน และสร้างโฟลเดอร์กลางสำหรับอัปโหลดผลงาน (จดจำ Folder ID จากส่วนท้ายของ URL ในหน้าเบราว์เซอร์ไว้)
2. เปิดหน้า [script.google.com](https://script.google.com) และคลิก **New Project**
3. คัดลอกโค้ดทั้งหมดจากไฟล์ [google_apps_script.js](file:///e:/---%20Sand%20Box%20---/Teacher%20Portfolio%20OS/google_apps_script.js) ไปวางแทนที่ข้อมูลทั้งหมดในเอดิเตอร์
4. แก้ไขข้อมูลในส่วนของ **CONFIGURATION SETTINGS** ด้านบนสุดของไฟล์:
   * `ROOT_FOLDER_ID` = ไอดีโฟลเดอร์ Google Drive ที่คัดลอกมาในข้อ 1
   * `BACKEND_URL` = URL ของ Supabase Edge Function `drive-webhook` ที่ได้จากข้อ 2.3
   * `SECRET_TOKEN` = คีย์รหัสผ่านเดียวกันกับที่กำหนดใน `INGESTION_SECRET_TOKEN` ตอนตั้งค่า Secrets
   * `USER_ID` = UUID ของคุณผู้สอนในระบบ Supabase (สามารถนำมาจากตาราง `teacher_profile` เพื่อเชื่อมข้อมูล RLS)

### ขั้นตอนที่ 4.2: เปิดทำงานทริกเกอร์ตั้งเวลาสแกนอัตโนมัติ (Automated Trigger)
1. ในแถบเมนูด้านบนของ Apps Script Editor ให้คลิกเลือกฟังก์ชัน `initTrigger` จากกล่องตัวเลือกการรัน
2. คลิกปุ่ม **Run** (สิทธิ์ความปลอดภัยจะขออนุมัติใช้งานบัญชี ให้กดเข้าใช้งาน และเลือก Advanced -> Go to script (unsafe) เพื่อยืนยันสิทธิ์อนุญาตเข้าถึง Google Drive และเรียกใช้ API ภายนอก)
3. ระบบจะทำงานและจัดตั้งทริกเกอร์ให้เรียกใช้ฟังก์ชันสแกนไฟล์อัตโนมัติทุกๆ 10 นาทีโดยอัตโนมัติ
4. คุณสามารถทดลองคลิกเลือกฟังก์ชัน `scanFolderForNewFiles` และกด **Run** เพื่อทดสอบจำลองการประมวลผลไฟล์ได้ทันที!

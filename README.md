# KruPortfolio AI (Teacher Portfolio OS)

ระบบบริหารจัดการแฟ้มสะสมผลงานครูอัจฉริยะ (AI-First Teacher Portfolio Management System) ที่ออกแบบโครงสร้างตามเกณฑ์การประเมินวิทยฐานะข้าราชการครูและบุคลากรทางการศึกษา (วPA ว1st) รองรับการตรวจจับไฟล์ คัดแยกประเภท ค้นหาเชิงความหมาย (Semantic Search) และคำนวณสถิติความคืบหน้าแบบเรียลไทม์

---

## 📂 โครงสร้างไฟล์ในระบบ (Project Workspace)

### 1. โครงสร้างฐานข้อมูล & หลังบ้าน (Database & Backend)
*   **[schema.sql](file:///schema.sql)**: สคีมา DDL สำหรับฐานข้อมูล PostgreSQL (รองรับ Supabase) มีการเปิดใช้งานปลั๊กอิน `pgvector` ดัชนีแบบ HNSW และระบบความปลอดภัยแยกผู้เชี่ยวชาญ/ผู้สอนด้วย Row-Level Security (RLS)
*   **[backend_architecture.md](file:///backend_architecture.md)**: แผนผังการทำงาน (Sequence Diagram), API Webhook Contracts, OpenAI JSON Schema สำหรับบังคับโครงสร้างข้อมูลออก และแผนรับมือความเสียหาย (Error Recovery Plan)
*   **[google_apps_script.js](file:///google_apps_script.js)**: สคริปต์สแกนโฟลเดอร์ Google Drive แบบวนซ้ำ (Recursive) คัดกรองไฟล์ที่ยังไม่ได้ประมวลผลผ่านแท็ก Description และส่งข้อมูลไปยัง API
*   **[supabase_edge_function.ts](file:///supabase_edge_function.ts)**: API Webhook สำหรับเปิดรับสัญญาณจาก Google Apps Script และบันทึกงานเข้าคิวประมวลผลทันที (Fast Ingestion)
*   **[ai_processing_worker.ts](file:///ai_processing_worker.ts)**: ระบบประมวลผลคิวหลังบ้าน (AI Worker) คอยดึงไฟล์, ทำ OCR และสกัดข้อความ, ดึง Vector Embedding (1536-dim), คัดแยกหมวดหมู่ตามตัวชี้วัดผ่าน GPT-4o และอัปเดตลงตารางจริง

### 2. ส่วนติดต่อผู้ใช้ (Frontend Components)
*   **[frontend_design.md](file:///frontend_design.md)**: สรุปเส้นทางการเข้าถึงหน้าเว็บ (Next.js Routes) และโครงร่างหน้าจอตรวจสอบสำหรับคณะกรรมการ (Evaluator Wireframes)
*   **[EvaluatorCanvas.tsx](file:///EvaluatorCanvas.tsx)**: ส่วนหน้าจอการประเมินสำหรับคณะกรรมการ (iPad/Mobile Web Optimized) แสดงคะแนนรวม ตัวชี้วัดทั้ง 15 ตัวชี้วัด และลิงก์ตรวจเอกสารจริง
*   **[IngestionLedgerCard.tsx](file:///IngestionLedgerCard.tsx)**: การ์ดกล่องข้อความขาเข้าสำหรับผู้สอน ตรวจสอบความถูกต้องที่ประมวลผลโดย AI ก่อนบันทึกเข้าพอร์ตโฟลิโอจริง

### 3. คู่มือการติดตั้งระบบ (DevOps & Deploy)
*   **[deployment_guide.md](file:///deployment_guide.md)**: คู่มือขั้นตอนการ Deploy ทั้งระบบขึ้นคลาวด์จริงทีละสเต็ป (Supabase Production, Vercel, Google Apps Script)

---

## 🚀 ขั้นตอนการติดตั้งอย่างรวดเร็ว (Quick Start)

1.  **ฐานข้อมูล**: สร้างโปรเจกต์บน **Supabase** และนำสคริปต์ใน `schema.sql` ไปรันใน SQL Editor
2.  **หลังบ้าน**: Deploy ฟังก์ชัน `drive-webhook` และ `ai-worker` จาก CLI ขึ้น Supabase Edge Functions
3.  **หน้าบ้าน**: อัปโหลดโค้ดขึ้น Git และนำเข้าโปรเจกต์เข้าสู่ **Vercel**
4.  **Google Drive**: นำสคริปต์ใน `google_apps_script.js` ไปสร้างทริกเกอร์ใน Google Apps Script เพื่อคอยสแกนโฟลเดอร์

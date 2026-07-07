# KruPortfolio AI (Teacher Portfolio OS)
## Frontend Architecture & UX/UI Visual Design

This document details the frontend route structure, typography parameters, UI wireframe mockups, interactive component blueprints, and loading optimization strategies for the KruPortfolio AI web application.

---

## 1. Design Token System (Luxury Minimalism)

*   **Colors**:
    *   *Canvas Base*: Creamy Off-white (`#F8F9FA` to `#FCFBF9`)
    *   *Borders*: Minimal Slate Hairline (`#E2E8F0`, `0.5px solid`)
    *   *Text Primary*: Dark Obsidian Charcoal (`#0F172A`)
    *   *Text Secondary*: Neutral Gray (`#64748B`)
    *   *Accent Primary (Success/Progress)*: British Racing Green (`#064E3B`)
    *   *Accent Secondary (Warning/Pending)*: Ochre Gold (`#854D0E`)
*   **Typography**:
    *   *Thai Headers*: Sukhumvit Set / Prompt (Weight: 500/600)
    *   *Latin/Numbers*: Inter / Playfair Display (Weight: 400/500/700)
    *   *Sizing*: Large titles (32px, tracking-tight), section headers (18px, uppercase), body copy (14px, tracking-normal, line-height 1.6).

---

## 2. Premium Route Tree & Architecture

The application uses Next.js App Router conventions. Private workspace panels and public/evaluator review targets are separated into distinct root layouts:

```text
/app
├── (auth)
│   ├── login/                      # Monochromatic minimal login portal
│   └── layout.tsx
├── (dashboard)
│   ├── dashboard/                  # Teacher Private Workspace
│   │   ├── layout.tsx              # Dynamic fiscal-year sidebar & profile card
│   │   └── [pa_year]/              # Parameterized academic year (e.g., pa66, pa67)
│   │       ├── metrics/            # page.tsx: Dynamic milestone metrics
│   │       ├── ledger/             # page.tsx: AI Ingestion Ledger queue list
│   │       └── indicators/         # page.tsx: Main list of 15 indicators
│   │           └── [indicator_id]/ # page.tsx: Indicator details, files, mapping reviews
│   └── layout.tsx
└── (evaluator)
    └── view/                       # Public / Evaluator iPad-optimized canvas
        └── [teacher_slug]/         # Parameterized teacher workspace identifier
            └── [pa_year]/          # page.tsx: Dynamic evaluation profile
```

---

## 3. The Editorial Canvas Layout (Evaluator Landing Screen)

The layout is built like a high-end web editorial page. It maximizes white space, removes heavy tables, and emphasizes readability for ipad-wielding evaluation committees.

```text
+------------------------------------------------------------------------------------------------------+
|  KRUPORTFOLIO AI  [ คณะกรรมการผู้ประเมิน ]                                     [วิทยฐานะเป้าหมาย: ครูชำนาญการพิเศษ]  |
+------------------------------------------------------------------------------------------------------+
|                                                                                                      |
|  ครู ณัฐภัทร วงศ์ดี                                                                    ปีงบประมาณ: PA68 |
|  โรงเรียนสุวรรณารามวิทยาคม (สพม. กรุงเทพมหานคร เขต 1)                                                   |
|                                                                                                      |
|  +----------------------------------------------------------------+  +----------------------------+  |
|  |  OVERALL PROGRESS                                              |  |  QR CODE FOR VERIFICATION  |  |
|  |  [|||||||||||||||||||||||||||||||||||---------------]  72.50%   |  |  +----------------------+  |  |
|  |                                                                |  |  |                       |  |  |
|  |  D1: การจัดการเรียนรู้และการจัดการชั้นเรียน:   87.50% (7/8 ตัวชี้วัด)  |  |  |    [   QR IMAGE  ]   |  |  |
|  |  D2: การส่งเสริมและสนับสนุนการเรียนรู้:      75.00% (3/4 ตัวชี้วัด)  |  |  |                       |  |  |
|  |  D3: การพัฒนาตนเองและวิชาชีพ:            66.67% (2/3 ตัวชี้วัด)  |  |  +----------------------+  |  |
|  |  CH: ประเด็นท้าทายเพื่อพัฒนาผลลัพธ์:         0.00%  (0/1 ตัวชี้วัด)  |  |  สแกนเพื่อตรวจสอบผลงานจริง   |  |  |
|  +----------------------------------------------------------------+  +----------------------------+  |
|                                                                                                      |
|  --------------------------------------------------------------------------------------------------  |
|  EVALUATION DIMENSIONS & INDICATORS                                                                   |
|                                                                                                      |
|  [ ด้านที่ 1: การจัดการเรียนรู้และการจัดการชั้นเรียน ] -----------------------------------------------------  |
|                                                                                                      |
|  +------------------------------------------------------------------------------------------------+  |
|  |  ตัวชี้วัด 1.1 การสร้างและหรือพัฒนาหลักสูตร                                        [ VERIFIED ✓ ]    |
|  |  --------------------------------------------------------------------------------------------  |
|  |  AI Summary: แผนการจัดการเรียนรู้บูรณาการคณิตศาสตร์และศิลปะ มุ่งพัฒนาทักษะการคำนวณผ่านการออกแบบลวดลาย   |
|  |  และหลักฐานอ้างอิงเป็นหลักสูตรสถานศึกษากลุ่มสาระการเรียนรู้คณิตศาสตร์ ปีการศึกษา 2568                  |
|  |                                                                                                |
|  |  Evidence Links:  [📄 doc_01_curriculum.pdf]  [📄 doc_02_lesson_plan.pdf]                       |
|  +------------------------------------------------------------------------------------------------+  |
|                                                                                                      |
|  +------------------------------------------------------------------------------------------------+  |
|  |  ตัวชี้วัด 1.2 การออกแบบการจัดการเรียนรู้                                         [ VERIFIED ✓ ]    |
|  |  --------------------------------------------------------------------------------------------  |
|  |  AI Summary: แผนการเรียนรู้รายวิชาคณิตศาสตร์เพิ่มเติม ม.3 เน้นกิจกรรม Active Learning ผ่านการทำโครงงาน |
|  |                                                                                                |
|  |  Evidence Links:  [📄 doc_03_active_learning.pdf]                                              |
|  +------------------------------------------------------------------------------------------------+  |
|                                                                                                      |
|  +------------------------------------------------------------------------------------------------+  |
|  |  ตัวชี้วัด 1.3 การจัดกิจกรรมการเรียนรู้                                           [ PENDING ◌ ]    |
|  |  --------------------------------------------------------------------------------------------  |
|  |  AI Summary: วิดีโอบันทึกการสอนความยาว 60 นาที เรื่องทฤษฎีบทพีทาโกรัส และผลลัพธ์ชิ้นงานของนักเรียน      |
|  |                                                                                                |
|  |  Evidence Links:  [🎥 video_math_classroom.mp4]  [📄 student_worksheet_pythagoras.pdf]          |
|  +------------------------------------------------------------------------------------------------+  |
|                                                                                                      |
+------------------------------------------------------------------------------------------------------+
```

---

## 4. The "AI Ingestion Ledger" Component

This component acts as the inbox for incoming evidence linked from Google Drive. Teachers review the AI's classification suggestions before they are mapped into the official portfolio.

```text
+------------------------------------------------------------------------------------------------------+
| AI INGESTION LEDGER (รายการรอยืนยัน)                                                      [ กรอง: ล่าสุด ▾ ] |
+------------------------------------------------------------------------------------------------------+
|                                                                                                      |
|  +------------------------------------------------------------------------------------------------+  |
|  |  [📄 PDF PREVIEW]   Title: แผนการจัดการเรียนรู้วิชาคณิตศาสตร์_ม3_ภาคเรียนที่_1.pdf                       |
|  |  [ (Thumbnail)  ]   Source: Google Drive Sync (2026-07-07 19:30)                               |
|  |  [              ]   Size: 4.2 MB | Pages: 42 pages                                             |
|  |  --------------------------------------------------------------------------------------------  |
|  |  AI Extracted Content (OCR Snippet):                                                           |
|  |  "แผนการจัดการเรียนรู้มุ่งเน้นการสอนวิชาคณิตศาสตร์พื้นฐาน ม.3 เรื่องระบบสมการเชิงเส้นสองตัวแปร...     |
|  |   มีตัวชี้วัดที่ใช้คือ ค 1.2 ม.3/1 เพื่อส่งเสริมให้ผู้เรียนเข้าใจทักษะการแก้โจทย์ปัญหา..."              |
|  |  --------------------------------------------------------------------------------------------  |
|  |  AI SUGGESTED CLASSIFICATION:                                                                  |
|  |  [ Indicator 1.2: การออกแบบการจัดการเรียนรู้ ] (Confidence Score: 0.94)                         |
|  |  Justification: เอกสารเป็นแผนการจัดกิจกรรมการเรียนรู้ที่มีการกำหนดวัตถุประสงค์และการวัดผลชัดเจน    |
|  |  --------------------------------------------------------------------------------------------  |
|  |  [ อนุมัติผลงานเข้าสู่พอร์ตโฟลิโอ ]             [ ปรับแต่งหมวดหมู่ ]             [ ละทิ้งผลงาน ]           |
|  +------------------------------------------------------------------------------------------------+  |
|                                                                                                      |
+------------------------------------------------------------------------------------------------------+
```

---

## 5. Core Web Vitals & Asset Streaming Logic

To ensure the platform feels fast and fluid, especially on cellular networks during school site evaluations:

### 1. Embedded PDF Streaming (Dynamic Blob Rendering)
*   **Problem**: Standard `<iframe src="google-drive-link">` elements load full Google Drive web interfaces, which consume excessive memory, introduce layout shifts, and block main-thread rendering.
*   **Solution**: 
    1.  The frontend fetches the PDF from Supabase Storage or the Google Drive API proxy as a binary stream.
    2.  It loads a stripped-down, light PDF renderer (e.g., `PDF.js` or `react-pdf`) to render only the **first page** as a static placeholder image.
    3.  The remaining pages are lazy-loaded on demand when the user clicks or scrolls into the preview pane.

### 2. Video Streaming (Range Requests & Adaptive Player)
*   **Problem**: 60-minute classroom videos can exceed 1.5 GB. Loading these raw files blocks cellular bandwidth.
*   **Solution**:
    *   Deliver video content using an HLS (HTTP Live Streaming) player like `Hls.js` or standard video element configuration mapping to a Content Delivery Network (CDN) with range requests enabled (`HTTP 206 Partial Content`).
    *   Limit automatic download buffering. The player is initialized with `preload="none"` and displays an optimized thumbnail poster until clicked.

### 3. Progressive Metrics Calculation (State Revalidation)
*   *Stale-While-Revalidate (SWR)* caching is used to populate dashboards instantly.
*   The overall progress percentage (which requires crossing several tables) is queried once from the `view_dimension_progress` view and cached in the client-side state. When a teacher verifies a new evidence mapping in the ledger, the cache for only that specific dimension is revalidated in the background, updating the UI smoothly.

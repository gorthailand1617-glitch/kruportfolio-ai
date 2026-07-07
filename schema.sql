-- ============================================================================
-- KruPortfolio AI - Database Schema (PostgreSQL / Supabase Compatible)
-- Description: AI-First Teacher Portfolio Management System (วPA)
-- Version: 1.0.0
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS SETUP
-- ----------------------------------------------------------------------------
-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector extension for AI semantic search on evidence documents
CREATE EXTENSION IF NOT EXISTS vector;

-- ----------------------------------------------------------------------------
-- 2. ENUMS & DOMAINS
-- ----------------------------------------------------------------------------
DROP TYPE IF EXISTS public.portfolio_status CASCADE;
DROP TYPE IF EXISTS public.verification_status CASCADE;
DROP TYPE IF EXISTS public.upload_source CASCADE;

CREATE TYPE public.portfolio_status AS ENUM ('draft', 'submitted', 'under_review', 'completed');
CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE public.upload_source AS ENUM ('google_drive', 'direct_upload');

-- ----------------------------------------------------------------------------
-- 3. TABLES DEFINITION
-- ----------------------------------------------------------------------------

-- Table: teacher_profile
-- Stores teacher-specific profile information. Relates 1:1 with auth.users in Supabase.
CREATE TABLE public.teacher_profile (
    id UUID PRIMARY KEY, -- Maps directly to auth.users.id
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(150) NOT NULL,
    last_name VARCHAR(150) NOT NULL,
    academic_rank VARCHAR(100) DEFAULT 'ครูผู้ช่วย', -- Current rank/position
    school_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: academic_year
-- Represents the evaluation or academic year (e.g. PA66, PA67, PA68)
CREATE TABLE public.academic_year (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'PA66', 'PA67', 'PA68'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_dates CHECK (end_date > start_date)
);

-- Table: evaluation_dimension
-- Thai teacher evaluation dimensions (ด้านที่ 1 - ด้านที่ 3 + ประเด็นท้าทาย)
CREATE TABLE public.evaluation_dimension (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL, -- e.g., 'D1', 'D2', 'D3', 'CH'
    name VARCHAR(255) NOT NULL, -- e.g., 'ด้านทักษะการจัดการเรียนรู้และการจัดการชั้นเรียน'
    description TEXT,
    weight NUMERIC(5,2) DEFAULT 100.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: indicator
-- Specific indicators under each dimension (ตัวชี้วัด 1 - 15)
CREATE TABLE public.indicator (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dimension_id UUID NOT NULL REFERENCES public.evaluation_dimension(id) ON DELETE CASCADE,
    code VARCHAR(10) UNIQUE NOT NULL, -- e.g., 'I1.1', 'I1.2', ..., 'ICH1.1'
    name VARCHAR(255) NOT NULL, -- Thai indicator name
    description TEXT,
    max_score INTEGER NOT NULL DEFAULT 4, -- Rating scale is typically 1-4
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: portfolio
-- Links a teacher to an academic year, representing the annual evaluation folder
CREATE TABLE public.portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.teacher_profile(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_year(id) ON DELETE RESTRICT,
    target_rank VARCHAR(100) NOT NULL, -- Rank target evaluated for this year (e.g. ครูชำนาญการพิเศษ)
    status portfolio_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_teacher_academic_year UNIQUE (user_id, academic_year_id)
);

-- Table: evidence
-- Stores metadata of structural files uploaded/linked (Evidence points)
-- Contains AI OCR extraction, summaries, automatic tagging, and vector embeddings
CREATE TABLE public.evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES public.portfolio(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.teacher_profile(id) ON DELETE CASCADE, -- Duplicated for RLS efficiency
    title VARCHAR(255) NOT NULL,
    description TEXT,
    source upload_source NOT NULL DEFAULT 'google_drive',
    file_path TEXT NOT NULL, -- Path in Supabase storage or file ID in Google Drive
    file_url TEXT NOT NULL,  -- Clickable source link
    mime_type VARCHAR(100),
    file_size_bytes BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- AI and Machine Learning Capabilities
    ocr_text TEXT,               -- OCR text extract
    ai_summary TEXT,             -- AI-generated document summary
    ai_tags JSONB,               -- Automated tags array (e.g., ["Lesson Plan", "Math"])
    ai_metadata JSONB,           -- Rich document attributes (e.g., {"grade_level": "M3", "subject": "Math"})
    confidence_score NUMERIC(5,4) CONSTRAINT chk_confidence CHECK (confidence_score >= 0 AND confidence_score <= 1),
    embedding vector(1536)       -- 1536 dimensions for OpenAI or similar embedding outputs
);

-- Table: evidence_indicator_mapping
-- Junction table mapping evidence items to specific evaluation indicators
CREATE TABLE public.evidence_indicator_mapping (
    evidence_id UUID NOT NULL REFERENCES public.evidence(id) ON DELETE CASCADE,
    indicator_id UUID NOT NULL REFERENCES public.indicator(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.teacher_profile(id) ON DELETE CASCADE, -- Duplicated for RLS efficiency
    verification_status verification_status NOT NULL DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    verified_by UUID, -- ID of evaluator / headmaster (referencing profiles/users if applicable)
    evaluator_feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (evidence_id, indicator_id)
);

-- ----------------------------------------------------------------------------
-- 4. PERFORMANCE & VECTOR INDEXES
-- ----------------------------------------------------------------------------

-- Indexes on foreign keys and compound lookups for fast retrieval
CREATE INDEX IF NOT EXISTS idx_portfolio_user_year 
    ON public.portfolio (user_id, academic_year_id);

CREATE INDEX IF NOT EXISTS idx_evidence_portfolio 
    ON public.evidence (portfolio_id);

CREATE INDEX IF NOT EXISTS idx_evidence_user 
    ON public.evidence (user_id);

CREATE INDEX IF NOT EXISTS idx_indicator_dimension 
    ON public.indicator (dimension_id);

-- Junction table queries (joining portfolios, evidence and indicators)
CREATE INDEX IF NOT EXISTS idx_mapping_indicator 
    ON public.evidence_indicator_mapping (indicator_id);

CREATE INDEX IF NOT EXISTS idx_mapping_user_status 
    ON public.evidence_indicator_mapping (user_id, verification_status);

-- JSONB indexing for AI tags and AI metadata
CREATE INDEX IF NOT EXISTS idx_evidence_ai_tags 
    ON public.evidence USING gin (ai_tags);

CREATE INDEX IF NOT EXISTS idx_evidence_ai_metadata 
    ON public.evidence USING gin (ai_metadata);

-- Vector similarity index using HNSW (Cosine distance) for semantic searches
CREATE INDEX IF NOT EXISTS idx_evidence_embedding_hnsw 
    ON public.evidence USING hnsw (embedding vector_cosine_ops);

-- ----------------------------------------------------------------------------
-- 5. CALCULATED PROGRESS VIEW
-- ----------------------------------------------------------------------------

-- View to calculate progress percentage (%) per teacher, per academic year, per dimension
-- Completion is based on the presence of at least one 'verified' evidence point for each indicator.
CREATE OR REPLACE VIEW public.view_dimension_progress AS
WITH indicator_completion AS (
    -- Generates a grid of all portfolios and every system indicator
    SELECT 
        p.id AS portfolio_id,
        p.user_id,
        p.academic_year_id,
        ind.id AS indicator_id,
        ind.dimension_id,
        -- Evaluates if the indicator has at least one verified evidence point attached
        CASE 
            WHEN COUNT(m.evidence_id) FILTER (WHERE m.verification_status = 'verified') > 0 THEN 1
            ELSE 0
        END AS is_completed
    FROM public.portfolio p
    CROSS JOIN public.indicator ind
    LEFT JOIN public.evidence e ON e.portfolio_id = p.id AND e.user_id = p.user_id
    LEFT JOIN public.evidence_indicator_mapping m ON m.evidence_id = e.id AND m.indicator_id = ind.id AND m.user_id = p.user_id
    GROUP BY p.id, p.user_id, p.academic_year_id, ind.id, ind.dimension_id
)
SELECT 
    ic.user_id,
    ic.academic_year_id,
    ay.name AS academic_year_name,
    ed.id AS dimension_id,
    ed.code AS dimension_code,
    ed.name AS dimension_name,
    COUNT(ic.indicator_id) AS total_indicators,
    SUM(ic.is_completed) AS completed_indicators,
    ROUND(
        (SUM(ic.is_completed)::NUMERIC / COUNT(ic.indicator_id)::NUMERIC) * 100, 
        2
    ) AS progress_percentage
FROM indicator_completion ic
JOIN public.evaluation_dimension ed ON ed.id = ic.dimension_id
JOIN public.academic_year ay ON ay.id = ic.academic_year_id
GROUP BY ic.user_id, ic.academic_year_id, ay.name, ed.id, ed.code, ed.name;

-- ----------------------------------------------------------------------------
-- 6. ROW-LEVEL SECURITY (RLS) & POLICIES
-- ----------------------------------------------------------------------------

-- Enable RLS on user-specific tables to enforce strict multi-tenant isolation
ALTER TABLE public.teacher_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_indicator_mapping ENABLE ROW LEVEL SECURITY;

-- teacher_profile RLS Policies
CREATE POLICY "Allow individual read access to profile"
    ON public.teacher_profile FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Allow individual update access to profile"
    ON public.teacher_profile FOR UPDATE
    USING (auth.uid() = id);

-- portfolio RLS Policies
CREATE POLICY "Allow users to read their own portfolios"
    ON public.portfolio FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Allow users to manage their own portfolios"
    ON public.portfolio FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- evidence RLS Policies
CREATE POLICY "Allow users to read their own evidence"
    ON public.evidence FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Allow users to manage their own evidence"
    ON public.evidence FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- evidence_indicator_mapping RLS Policies
CREATE POLICY "Allow users to read their own indicator mappings"
    ON public.evidence_indicator_mapping FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Allow users to manage their own indicator mappings"
    ON public.evidence_indicator_mapping FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 7. AUTOMATION TRIGGERS (SUPABASE COMPATIBLE)
-- ----------------------------------------------------------------------------

-- Function to handle auto-creation of a teacher profile upon sign-up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.teacher_profile (id, email, first_name, last_name, school_name)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'first_name', ''),
        COALESCE(new.raw_user_meta_data->>'last_name', ''),
        COALESCE(new.raw_user_meta_data->>'school_name', 'โรงเรียนยังไม่ระบุ')
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the profile auto-creation
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 8. SYSTEM SEED DATA (วPA EVALUATION FRAMEWORK)
-- ----------------------------------------------------------------------------

-- Insert Standard Thai Academic/Fiscal Years
INSERT INTO public.academic_year (name, start_date, end_date, is_active) VALUES
('PA66', '2022-10-01', '2023-09-30', false),
('PA67', '2023-10-01', '2024-09-30', false),
('PA68', '2024-10-01', '2025-09-30', true),
('PA69', '2025-10-01', '2026-09-30', false)
ON CONFLICT (name) DO NOTHING;

-- Insert 4 วPA Dimensions
INSERT INTO public.evaluation_dimension (code, name, description, weight) VALUES
('D1', 'ด้านทักษะการจัดการเรียนรู้และการจัดการชั้นเรียน', 'ด้านที่ 1: การจัดการเรียนรู้และการจัดการชั้นเรียน (8 ตัวชี้วัด)', 40.00),
('D2', 'ด้านการส่งเสริมและสนับสนุนการจัดการเรียนรู้', 'ด้านที่ 2: การพัฒนาและบริหารจัดการข้อมูลสารสนเทศ (4 ตัวชี้วัด)', 30.00),
('D3', 'ด้านการพัฒนาตนเองและวิชาชีพ', 'ด้านที่ 3: การเข้าร่วมการแลกเปลี่ยนเรียนรู้และพัฒนาตนเอง (3 ตัวชี้วัด)', 20.00),
('CH', 'ประเด็นท้าทายเพื่อพัฒนาผู้เรียน', 'ส่วนที่ 2: ข้อตกลงในการพัฒนางานที่เป็นประเด็นท้าทาย', 10.00)
ON CONFLICT (code) DO NOTHING;

-- Insert 15 Indicators (ตัวชี้วัด) under their respective dimensions
INSERT INTO public.indicator (dimension_id, code, name, description) VALUES
-- ด้านที่ 1: ทักษะการจัดการเรียนรู้และการจัดการชั้นเรียน (D1)
((SELECT id FROM public.evaluation_dimension WHERE code = 'D1'), 'I1.1', 'การสร้างและหรือพัฒนาหลักสูตร', 'มีการวิเคราะห์หลักสูตร มาตรฐานการเรียนรู้ และตัวชี้วัด นำไปจัดทำรายวิชาและหน่วยการเรียนรู้'),
((SELECT id FROM public.evaluation_dimension WHERE code = 'D1'), 'I1.2', 'การออกแบบการจัดการเรียนรู้', 'เน้นผู้เรียนเป็นสำคัญ เพื่อให้ผู้เรียนมีความรู้ ทักษะ คุณลักษณะประจำวิชา คุณลักษณะอันพึงประสงค์'),
((SELECT id FROM public.evaluation_dimension WHERE code = 'D1'), 'I1.3', 'การจัดกิจกรรมการเรียนรู้', 'มีการอำนวยความสะดวกในการเรียนรู้ และส่งเสริมผู้เรียนได้พัฒนาเต็มตามศักยภาพ เรียนรู้และทำงานร่วมกัน'),
((SELECT id FROM public.evaluation_dimension WHERE code = 'D1'), 'I1.4', 'การเลือกและหรือพัฒนาสื่อ นวัตกรรม เทคโนโลยี และแหล่งเรียนรู้', 'สอดคล้องกับกิจกรรมการเรียนรู้ สามารถแก้ไขปัญหาในการเรียนรู้ของผู้เรียน'),
((SELECT id FROM public.evaluation_dimension WHERE code = 'D1'), 'I1.5', 'การวัดและประเมินผลการเรียนรู้', 'ด้วยวิธีการที่หลากหลาย เหมาะสม และสอดคล้องกับมาตรฐานการเรียนรู้ ให้ผู้เรียนพัฒนาการเรียนรู้อย่างต่อเนื่อง'),
((SELECT id FROM public.evaluation_dimension WHERE code = 'D1'), 'I1.6', 'การศึกษา วิเคราะห์ และสังเคราะห์ เพื่อแก้ไขปัญหาหรือพัฒนาการเรียนรู้', 'นำผลมาแก้ไขปัญหาหรือพัฒนาการจัดการเรียนรู้ที่ส่งผลต่อคุณภาพผู้เรียน'),
((SELECT id FROM public.evaluation_dimension WHERE code = 'D1'), 'I1.7', 'การจัดบรรยากาศที่ส่งเสริมและพัฒนาผู้เรียน', 'เหมาะสมกับความแตกต่างผู้เรียน กระตุ้นให้เกิดการคิด มีความสุข และเกิดความรู้ความเข้าใจ'),
((SELECT id FROM public.evaluation_dimension WHERE code = 'D1'), 'I1.8', 'การอบรมและพัฒนาคุณลักษณะที่ดีของผู้เรียน', 'คำนึงถึงความแตกต่างของผู้เรียน เพื่อสร้างเสริมคุณธรรม จริยธรรม ค่านิยมอันดีงาม'),

-- ด้านที่ 2: การส่งเสริมและสนับสนุนการจัดการเรียนรู้ (D2)
((SELECT id FROM public.evaluation_dimension WHERE code = 'D2'), 'I2.1', 'การจัดทำข้อมูลสารสนเทศของผู้เรียนและรายวิชา', 'มีข้อมูลเป็นปัจจุบันเพื่อใช้สนับสนุนการเรียนรู้ แกไขปัญหา และพัฒนาคุณภาพผู้เรียน'),
((SELECT id FROM public.evaluation_dimension WHERE code = 'D2'), 'I2.2', 'การดำเนินการตามระบบดูแลช่วยเหลือผู้เรียน', 'รวบรวมข้อมูล วิเคราะห์ ประสานความร่วมมือกับผู้เกี่ยวข้องเพื่อช่วยเหลือผู้เรียน'),
((SELECT id FROM public.evaluation_dimension WHERE code = 'D2'), 'I2.3', 'การปฏิบัติงานวิชาการ และงานอื่นๆ ของสถานศึกษา', 'ร่วมปฏิบัติงานวิชาการและโครงการต่างๆ เพื่อยกระดับคุณภาพการจัดการศึกษา'),
((SELECT id FROM public.evaluation_dimension WHERE code = 'D2'), 'I2.4', 'การประสานความร่วมมือกับผู้ปกครอง ภาคีเครือข่าย และหรือสถานประกอบการ', 'ร่วมมือเพื่อแก้ไขปัญหาและร่วมกันพัฒนาผู้เรียน'),

-- ด้านที่ 3: การพัฒนาตนเองและวิชาชีพ (D3)
((SELECT id FROM public.evaluation_dimension WHERE code = 'D3'), 'I3.1', 'การพัฒนาตนเองอย่างเป็นระบบและต่อเนื่อง', 'เพื่อให้มีความรู้ ความสามารถ ทักษะการใช้ภาษาไทย ภาษาอังกฤษ และเทคโนโลยีดิจิทัล'),
((SELECT id FROM public.evaluation_dimension WHERE code = 'D3'), 'I3.2', 'การมีส่วนร่วม และเป็นผู้นำในการแลกเปลี่ยนเรียนรู้ทางวิชาชีพ (PLC)', 'เพื่อแก้ไขปัญหาและสร้างนวัตกรรมในการจัดการเรียนรู้'),
((SELECT id FROM public.evaluation_dimension WHERE code = 'D3'), 'I3.3', 'การนำความรู้ ความสามารถ ทักษะที่ได้จากการพัฒนาตนเองและวิชาชีพมาใช้', 'นำมาใช้ในการพัฒนาการจัดการเรียนรู้ การพัฒนาคุณภาพผู้เรียน และการพัฒนานวัตกรรมการจัดการเรียนรู้'),

-- ส่วนที่ 2: ประเด็นท้าทาย (CH)
((SELECT id FROM public.evaluation_dimension WHERE code = 'CH'), 'ICH1.1', 'ข้อตกลงประเด็นท้าทายในการพัฒนาผลลัพธ์การเรียนรู้ของผู้เรียน', 'ประเด็นที่เสนอเพื่อพัฒนาผลลัพธ์ของผู้เรียน โดยแสดงระดับการปฏิบัติที่คาดหวังตามวิทยฐานะ')
ON CONFLICT (code) DO NOTHING;

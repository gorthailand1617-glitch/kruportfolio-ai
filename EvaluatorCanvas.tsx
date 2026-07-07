'use client';

import React, { useState } from 'react';
import { 
  CheckCircle, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  QrCode, 
  ArrowUpRight, 
  GraduationCap, 
  School, 
  Calendar 
} from 'lucide-react';

// Interfaces for component states & props
interface EvidenceItem {
  id: string;
  title: string;
  fileUrl: string;
  mimeType: string;
}

interface IndicatorItem {
  code: string;
  name: string;
  description: string;
  status: 'verified' | 'pending' | 'empty';
  aiSummary?: string;
  aiTags?: string[];
  evidence: EvidenceItem[];
}

interface DimensionGroup {
  id: string;
  code: string;
  name: string;
  progress: number;
  indicators: IndicatorItem[];
}

interface EvaluatorCanvasProps {
  teacherName?: string;
  schoolName?: string;
  academicRank?: string;
  targetRank?: string;
  academicYear?: string;
  qrUrl?: string;
  dimensions?: DimensionGroup[];
}

export default function EvaluatorCanvas({
  teacherName = 'ครู ณัฐภัทร วงศ์ดี',
  schoolName = 'โรงเรียนสุวรรณารามวิทยาคม (สพม. กรุงเทพมหานคร เขต 1)',
  academicRank = 'ครูชำนาญการ',
  targetRank = 'ครูชำนาญการพิเศษ',
  academicYear = 'PA68',
  qrUrl = 'https://kruportfolio.ai/view/nattaphat-wongdee/pa68',
  dimensions = mockDimensionsData
}: EvaluatorCanvasProps) {
  const [expandedIndicator, setExpandedIndicator] = useState<string | null>(null);

  const toggleAccordion = (code: string) => {
    setExpandedIndicator(expandedIndicator === code ? null : code);
  };

  // Helper to format status badges
  const renderStatusBadge = (status: 'verified' | 'pending' | 'empty') => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#064E3B] bg-[#E6F4EA] px-2.5 py-0.5 rounded-full">
            <CheckCircle className="w-3 h-3" /> ตรวจสอบแล้ว
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#854D0E] bg-[#FEF9C3] px-2.5 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> รอยืนยัน
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
            ไม่มีเอกสาร
          </span>
        );
    }
  };

  // Calculate global summary metrics
  const totalIndicatorsCount = dimensions.reduce((acc, dim) => acc + dim.indicators.length, 0);
  const verifiedCount = dimensions.reduce(
    (acc, dim) => acc + dim.indicators.filter(ind => ind.status === 'verified').length, 
    0
  );
  const globalProgress = Math.round((verifiedCount / totalIndicatorsCount) * 100);

  return (
    <div className="min-h-screen bg-[#FCFBF9] text-slate-900 font-sans selection:bg-[#E6F4EA] selection:text-[#064E3B] p-6 md:p-12 lg:p-16">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* ====================================================================
            1. EXECUTIVE HEADER AREA (Editorial Styling)
           ==================================================================== */}
        <header className="border-b border-slate-200/60 pb-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="space-y-3">
              <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                แฟ้มสะสมงานดิจิทัล วPA
              </span>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 font-serif">
                {teacherName}
              </h1>
              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-slate-400" /> {academicRank}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 hidden md:inline" />
                <span className="flex items-center gap-1.5">
                  <School className="w-4 h-4 text-slate-400" /> {schoolName}
                </span>
              </div>
            </div>
            
            {/* Target Rank Block */}
            <div className="bg-[#064E3B]/5 border border-[#064E3B]/10 rounded px-4 py-3 text-right md:self-stretch flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block">วิทยฐานะประเมิน</span>
              <span className="text-sm font-semibold text-[#064E3B]">{targetRank}</span>
            </div>
          </div>
        </header>

        {/* ====================================================================
            2. DIMENSION PROGRESS DASHBOARD & QR CODE
           ==================================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Progress Widgets Card */}
          <div className="lg:col-span-2 border border-slate-200/60 bg-white p-8 rounded-lg shadow-sm space-y-6">
            <div>
              <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">ความคืบหน้ารวมในการประเมิน</h2>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-semibold font-serif text-[#064E3B]">{globalProgress}%</span>
                <span className="text-xs text-slate-400">({verifiedCount}/{totalIndicatorsCount} ตัวชี้วัดเสร็จสิ้น)</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-[#064E3B] h-full rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${globalProgress}%` }}
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {dimensions.map((dim) => (
                <div key={dim.id} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-600 truncate mr-2">
                      {dim.code}: {dim.name}
                    </span>
                    <span className="font-semibold text-slate-800 shrink-0">{dim.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#064E3B] h-full rounded-full" 
                      style={{ width: `${dim.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Elegant QR Card */}
          <div className="border border-slate-200/60 bg-white p-6 rounded-lg shadow-sm flex flex-col items-center justify-between text-center gap-4">
            <div className="space-y-1">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400">สแกนตรวจสอบเอกสาร</h3>
              <p className="text-xs text-slate-500">สำหรับคณะกรรมการตรวจวิเคราะห์ผลงานประเมินจริง</p>
            </div>
            
            <div className="relative border border-slate-100 p-3 bg-[#FCFBF9] rounded">
              <QrCode className="w-32 h-32 text-slate-800" />
            </div>

            <a 
              href={qrUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 border-b border-dashed border-slate-400 pb-0.5 hover:border-slate-800 transition-colors"
            >
              ลิงก์เปิดเว็บตรง <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

        </section>

        {/* ====================================================================
            3. THE 15 INDICATORS ACCORDION LIST
           ==================================================================== */}
        <section className="space-y-8">
          <div className="flex justify-between items-baseline border-b border-slate-200/60 pb-3">
            <h2 className="text-lg font-serif font-semibold text-slate-800">
              รายละเอียดผลงานตามรายตัวชี้วัด (วPA)
            </h2>
            <div className="flex gap-2 items-center text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5" /> ปีงบประมาณ {academicYear}
            </div>
          </div>

          <div className="space-y-8">
            {dimensions.map((dim) => (
              <div key={dim.id} className="space-y-4">
                {/* Dimension Section Title */}
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 border-l-2 border-[#064E3B] pl-3">
                  {dim.code} — {dim.name}
                </h3>
                
                {/* Indicators Accordion list */}
                <div className="border border-slate-200/60 rounded-lg overflow-hidden divide-y divide-slate-200/60 bg-white">
                  {dim.indicators.map((ind) => {
                    const isExpanded = expandedIndicator === ind.code;
                    return (
                      <div key={ind.code} className="transition-colors hover:bg-slate-50/30">
                        {/* Header Row */}
                        <button
                          onClick={() => toggleAccordion(ind.code)}
                          className="w-full text-left px-6 py-4 flex justify-between items-center gap-4 focus:outline-none"
                        >
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-[#064E3B] tracking-wider block">
                              ตัวชี้วัดที่ {ind.code.replace('I', '')}
                            </span>
                            <span className="text-sm font-medium text-slate-800 block">
                              {ind.name}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0">
                            {renderStatusBadge(ind.status)}
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </button>

                        {/* Expandable Details Container */}
                        {isExpanded && (
                          <div className="px-6 pb-6 pt-2 border-t border-slate-100 bg-[#FCFBF9]/40 space-y-4">
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-400 uppercase tracking-widest block">คำจำกัดความตามกรอบ วPA</span>
                              <p className="text-xs text-slate-500 leading-relaxed">{ind.description}</p>
                            </div>

                            {ind.aiSummary && (
                              <div className="bg-[#E6F4EA]/30 border border-[#064E3B]/15 rounded p-4 space-y-2">
                                <span className="text-[10px] text-[#064E3B] uppercase tracking-widest font-semibold block">
                                  สรุปสังเคราะห์ผลงานจริง (AI Auto-Summary)
                                </span>
                                <p className="text-sm text-slate-700 leading-relaxed">
                                  {ind.aiSummary}
                                </p>
                                
                                {/* AI Tags */}
                                {ind.aiTags && (
                                  <div className="flex flex-wrap gap-1.5 pt-2">
                                    {ind.aiTags.map((tag) => (
                                      <span key={tag} className="text-[10px] text-slate-500 bg-white border border-slate-200/60 px-2 py-0.5 rounded">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Evidence files list */}
                            <div className="space-y-2">
                              <span className="text-[10px] text-slate-400 uppercase tracking-widest block">
                                เอกสารหลักฐานประกอบ ({ind.evidence.length})
                              </span>
                              
                              {ind.evidence.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {ind.evidence.map((file) => (
                                    <div 
                                      key={file.id} 
                                      className="flex justify-between items-center border border-slate-200/50 bg-white p-3 rounded hover:border-slate-300 transition-all shadow-sm"
                                    >
                                      <div className="flex items-center gap-2.5 truncate mr-2">
                                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                        <span className="text-xs font-medium text-slate-700 truncate">
                                          {file.title}
                                        </span>
                                      </div>
                                      
                                      <a
                                        href={file.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 border-l border-slate-100 pl-3 shrink-0 transition-colors"
                                      >
                                        เปิดหลักฐาน <ArrowUpRight className="w-3 h-3" />
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic">ยังไม่มีเอกสารหลักฐานได้รับการยืนยันสำหรับตัวชี้วัดนี้</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

// ==========================================
// SYSTEM SEED DATA (วPA EVALUATION CRITERIA MOCK)
// ==========================================
const mockDimensionsData: DimensionGroup[] = [
  {
    id: 'd1',
    code: 'ด้านที่ 1',
    name: 'ทักษะการจัดการเรียนรู้และการจัดการชั้นเรียน',
    progress: 87,
    indicators: [
      {
        code: 'I1.1',
        name: 'การสร้างและหรือพัฒนาหลักสูตร',
        description: 'มีการวิเคราะห์หลักสูตร มาตรฐานการเรียนรู้ และตัวชี้วัด นำไปจัดทำรายวิชาและหน่วยการเรียนรู้ ให้สอดคล้องกับบริบทของสถานศึกษา',
        status: 'verified',
        aiSummary: 'หลักฐานการวิเคราะห์รายวิชาคณิตศาสตร์ ม.3 และแบบประเมินหลักสูตร มุ่งพัฒนาผู้เรียนผ่านทักษะกระบวนการคิดวิจารณญาณ มีหน่วยการเรียนรู้บูรณาการชัดเจน',
        aiTags: ['คณิตศาสตร์ ม.3', 'แผนการเรียนรู้', 'หลักสูตรสถานศึกษา'],
        evidence: [
          { id: 'f1', title: 'หลักสูตรแกนกลางคณิตศาสตร์_ปี2568.pdf', fileUrl: '#', mimeType: 'application/pdf' },
          { id: 'f2', title: 'คำอธิบายรายวิชา_คณิตศาสตร์ม3.pdf', fileUrl: '#', mimeType: 'application/pdf' }
        ]
      },
      {
        code: 'I1.2',
        name: 'การออกแบบการจัดการเรียนรู้',
        description: 'เน้นผู้เรียนเป็นสำคัญ เพื่อให้ผู้เรียนมีความรู้ ทักษะ คุณลักษณะประจำวิชา คุณลักษณะอันพึงประสงค์ และสมรรถนะที่สำคัญตามหลักสูตร',
        status: 'verified',
        aiSummary: 'แผนการสอนคณิตศาสตร์ เรื่องระบบสมการเชิงเส้นสองตัวแปร เน้นกิจกรรม Active Learning ทำงานร่วมกันแบบสืบเสาะหาความรู้ด้วยตนเอง',
        aiTags: ['Active Learning', 'ระบบสมการเชิงเส้น', 'คณิตศาสตร์ ม.3'],
        evidence: [
          { id: 'f3', title: 'แผนการสอน_ActiveLearning_ม3.pdf', fileUrl: '#', mimeType: 'application/pdf' }
        ]
      },
      {
        code: 'I1.3',
        name: 'การจัดกิจกรรมการเรียนรู้',
        description: 'มีการอำนวยความสะดวกในการเรียนรู้ และส่งเสริมผู้เรียนได้พัฒนาเต็มตามศักยภาพ เรียนรู้และทำงานร่วมกัน',
        status: 'pending',
        aiSummary: 'คลิปวิดีโอบันทึกการจัดการเรียนรู้ในห้องเรียนชั้นมัธยมศึกษาปีที่ 3 เรื่องทฤษฎีบทพีทาโกรัส นักเรียนทำงานกลุ่มย่อย คลี่กระดาษรูปเรขาคณิตเพื่อทำความเข้าใจ',
        aiTags: ['วิดีโอสาธิตการสอน', 'ทฤษฎีบทพีทาโกรัส', 'การทำงานกลุ่ม'],
        evidence: [
          { id: 'f4', title: 'วิดีโอบันทึกการสอน_พีทาโกรัส_ม3.mp4', fileUrl: '#', mimeType: 'video/mp4' }
        ]
      }
    ]
  },
  {
    id: 'd2',
    code: 'ด้านที่ 2',
    name: 'การส่งเสริมและสนับสนุนการจัดการเรียนรู้',
    progress: 75,
    indicators: [
      {
        code: 'I2.1',
        name: 'การจัดทำข้อมูลสารสนเทศของผู้เรียนและรายวิชา',
        description: 'มีข้อมูลเป็นปัจจุบันเพื่อใช้สนับสนุนการเรียนรู้ แกไขปัญหา และพัฒนาคุณภาพผู้เรียน',
        status: 'verified',
        aiSummary: 'ตารางรายงานคะแนนผลสัมฤทธิ์ทางการเรียนของผู้เรียนในระบบสารสนเทศวิชาคณิตศาสตร์ ม.3 วิเคราะห์จุดบกพร่องตามพฤติกรรมเป็นรายบุคคล',
        aiTags: ['ตารางสรุปผลคะแนน', 'สารสนเทศนักเรียน', 'วิเคราะห์ผู้เรียน'],
        evidence: [
          { id: 'f5', title: 'สรุปสารสนเทศคะแนนสอบย่อย_ม3.xlsx', fileUrl: '#', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        ]
      }
    ]
  }
];

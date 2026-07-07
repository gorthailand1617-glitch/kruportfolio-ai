'use client';

import React, { useState } from 'react';
import EvaluatorCanvas from '../EvaluatorCanvas';
import IngestionLedgerCard from '../IngestionLedgerCard';
import { Sparkles, Layers, Eye, BookOpen, ExternalLink } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'evaluator' | 'ledger' | 'home'>('home');

  const handleApprove = (jobId: string) => {
    console.log(`Approved job: ${jobId}`);
    return new Promise<void>((resolve) => setTimeout(resolve, 800));
  };

  const handleEdit = (jobId: string) => {
    alert(`แก้ไขหมวดหมู่สำหรับคิวงาน ID: ${jobId}`);
  };

  const handleReject = (jobId: string) => {
    console.log(`Rejected job: ${jobId}`);
  };

  return (
    <div className="min-h-screen bg-[#FCFBF9] text-slate-900 flex flex-col">
      {/* Dynamic Header Toggle */}
      <nav className="border-b border-slate-200/60 bg-white/80 backdrop-blur sticky top-0 z-50 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#064E3B]" />
          <span className="font-serif font-semibold text-lg tracking-tight">KruPortfolio AI</span>
          <span className="text-[10px] bg-[#064E3B]/10 text-[#064E3B] px-2 py-0.5 rounded font-mono">v1.0.0</span>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/40">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-4 py-1.5 text-xs font-semibold rounded transition-all ${
              activeTab === 'home' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ภาพรวมระบบ
          </button>
          <button
            onClick={() => setActiveTab('evaluator')}
            className={`px-4 py-1.5 text-xs font-semibold rounded transition-all ${
              activeTab === 'evaluator' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            หน้าจอผู้ประเมิน
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-1.5 text-xs font-semibold rounded transition-all ${
              activeTab === 'ledger' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            กล่องยืนยันผลงาน AI
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <div className="max-w-4xl mx-auto px-6 py-16 md:py-24 space-y-16">
            
            {/* Hero Section */}
            <div className="text-center space-y-6">
              <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-[#064E3B] bg-[#E6F4EA] px-3 py-1 rounded-full">
                AI-First Teacher Portfolio OS (วPA)
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight font-serif text-slate-900 leading-tight">
                เปลี่ยนเอกสารสะสมผลงานครู <br className="hidden md:inline"/>ให้กลายเป็น <span className="italic text-[#064E3B]">ข้อมูลอันทรงคุณค่า</span>
              </h1>
              <p className="max-w-xl mx-auto text-sm text-slate-500 leading-relaxed">
                ระบบจัดการแฟ้มสะสมงานดิจิทัลอัจฉริยะ คัดกรองตัวชี้วัดอัตโนมัติด้วย GPT-4o OCR และ Vector Semantic Search เพื่อตอบสนองการประเมินวิทยฐานะตามกรอบประเมินข้าราชการครู วPA
              </p>
            </div>

            {/* Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              {/* Evaluator Card */}
              <button 
                onClick={() => setActiveTab('evaluator')}
                className="group border border-slate-200/60 bg-white p-8 rounded-lg text-left hover:border-slate-300 hover:shadow-md transition-all space-y-4"
              >
                <div className="p-3 bg-slate-50 rounded-lg w-fit group-hover:bg-[#E6F4EA]/50 transition-colors">
                  <Eye className="w-6 h-6 text-[#064E3B]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-slate-800 font-serif">หน้าจอสำหรับคณะกรรมการตรวจประเมิน</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    สแกน QR Code ตรวจประเมินผลงานครูผ่านแท็บเล็ต/มือถือ รวบรวมสรุปผลงานจาก AI ในแต่ละตัวชี้วัดภายใน 60 วินาที
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#064E3B] group-hover:translate-x-1 transition-transform">
                  ดูตัวอย่างหน้าประเมินจริง →
                </span>
              </button>

              {/* Ledger Card */}
              <button 
                onClick={() => setActiveTab('ledger')}
                className="group border border-slate-200/60 bg-white p-8 rounded-lg text-left hover:border-slate-300 hover:shadow-md transition-all space-y-4"
              >
                <div className="p-3 bg-slate-50 rounded-lg w-fit group-hover:bg-[#E6F4EA]/50 transition-colors">
                  <BookOpen className="w-6 h-6 text-[#064E3B]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-slate-800 font-serif">กล่องยืนยันผลงาน (AI Ingestion Ledger)</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    กล่องจดหมายรับงานที่อัปโหลดจาก Google Drive เพื่อให้คุณครูกดยืนยันการจับคู่ตัวชี้วัดหรือปรับแก้ไขประเภทก่อนจัดเก็บ
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#064E3B] group-hover:translate-x-1 transition-transform">
                  ดูตัวอย่างกล่องรับงาน →
                </span>
              </button>
            </div>

            {/* Architecture Footer */}
            <div className="border-t border-slate-200/60 pt-12 text-center space-y-4">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 block">สถาปัตยกรรมระบบคลาวด์</span>
              <div className="flex flex-wrap justify-center gap-8 text-xs text-slate-500 font-mono">
                <span>⚡ Next.js API Routes (Vercel)</span>
                <span>•</span>
                <span>🗄️ PostgreSQL (Supabase DB)</span>
                <span>•</span>
                <span>🤖 OpenAI GPT-4o / Embeddings</span>
                <span>•</span>
                <span>🚀 Google Apps Script</span>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'evaluator' && (
          <EvaluatorCanvas />
        )}

        {activeTab === 'ledger' && (
          <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
            <div className="space-y-1">
              <h2 className="text-lg font-serif font-semibold text-slate-800">กล่องยืนยันผลงาน AI (AI Ingestion Ledger)</h2>
              <p className="text-xs text-slate-500">ผลการประมวลผลเอกสารอ้างอิงที่อัปโหลดผ่าน Google Drive ที่เชื่อมต่อไว้</p>
            </div>
            
            <div className="space-y-6">
              <IngestionLedgerCard 
                jobId="job-001"
                fileName="แผนการจัดการเรียนรู้วิชาคณิตศาสตร์_ม3_ภาคเรียนที่_1.pdf"
                fileSize="4.2 MB"
                mimeType="application/pdf"
                sourceName="Google Drive Sync (คณิตศาสตร์ ม.3)"
                uploadedAt="2026-07-07 19:30"
                ocrSnippet="แผนการจัดการเรียนรู้ มุ่งเน้นการสอนวิชาคณิตศาสตร์พื้นฐาน ม.3 เรื่องระบบสมการเชิงเส้นสองตัวแปร... มีการกำหนดวัตถุประสงค์การเรียนรู้และตัวชี้วัด ค 1.2 ม.3/1"
                suggestedIndicatorCode="I1.2"
                suggestedIndicatorName="การออกแบบการจัดการเรียนรู้"
                confidenceScore={0.94}
                aiReasoning="เอกสารระบุโครงสร้างการจัดกิจกรรมการเรียนรู้แบบ Active Learning มีความสอดคล้องโดยตรงกับการออกแบบการจัดการเรียนรู้ตามตัวชี้วัด 1.2"
                onApprove={handleApprove}
                onEditCategory={handleEdit}
                onReject={handleReject}
              />

              <IngestionLedgerCard 
                jobId="job-002"
                fileName="บันทึกข้อตกลงและหลักสูตรสถานศึกษาคณิตศาสตร์.pdf"
                fileSize="2.8 MB"
                mimeType="application/pdf"
                sourceName="Google Drive Sync (หลักสูตรสถานศึกษา)"
                uploadedAt="2026-07-07 20:15"
                ocrSnippet="สอดคล้องตามกรอบนโยบายการจัดตั้งและวิเคราะห์หลักสูตรมาตรฐานกลุ่มสาระการเรียนรู้คณิตศาสตร์ ม.ต้น..."
                suggestedIndicatorCode="I1.1"
                suggestedIndicatorName="การสร้างและหรือพัฒนาหลักสูตร"
                confidenceScore={0.88}
                aiReasoning="ตัวเอกสารมีการวิเคราะห์หลักสูตรแกนกลางเพื่อปรับปรุงรายละเอียดรายวิชาให้ตรงตามเกณฑ์หลักสูตรสถานศึกษา"
                onApprove={handleApprove}
                onEditCategory={handleEdit}
                onReject={handleReject}
              />
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-white py-6 text-center text-xs text-slate-400">
        © 2026 KruPortfolio AI. Designed with luxury minimalism.
      </footer>
    </div>
  );
}

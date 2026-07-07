'use client';

import React, { useState } from 'react';
import { 
  Check, 
  Settings, 
  Trash2, 
  Sparkles, 
  FileText, 
  Layers, 
  AlertCircle, 
  CheckCircle 
} from 'lucide-react';

interface IngestionLedgerCardProps {
  jobId: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  sourceName: string;
  uploadedAt: string;
  ocrSnippet: string;
  suggestedIndicatorCode: string;
  suggestedIndicatorName: string;
  confidenceScore: number;
  aiReasoning: string;
  onApprove: (jobId: string) => void;
  onEditCategory: (jobId: string) => void;
  onReject: (jobId: string) => void;
}

export default function IngestionLedgerCard({
  jobId,
  fileName,
  fileSize,
  mimeType,
  sourceName,
  uploadedAt,
  ocrSnippet,
  suggestedIndicatorCode,
  suggestedIndicatorName,
  confidenceScore,
  aiReasoning,
  onApprove,
  onEditCategory,
  onReject
}: IngestionLedgerCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await onApprove(jobId);
      setIsSuccess(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = () => {
    onEditCategory(jobId);
  };

  const handleReject = () => {
    if (confirm('คุณต้องการละทิ้งเอกสารนี้หรือไม่?')) {
      onReject(jobId);
    }
  };

  // Convert confidence score to formatted string percentage
  const confidencePercent = Math.round(confidenceScore * 100);
  
  // Dynamic color for confidence label
  const getConfidenceColorClass = (score: number) => {
    if (score >= 0.8) return 'text-[#064E3B] bg-[#E6F4EA] border-[#064E3B]/10';
    if (score >= 0.5) return 'text-[#854D0E] bg-[#FEF9C3] border-[#854D0E]/10';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  if (isSuccess) {
    return (
      <div className="border border-[#064E3B]/20 bg-[#E6F4EA]/10 p-6 rounded-lg flex items-center justify-between transition-all duration-300">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-[#064E3B]" />
          <div className="space-y-0.5">
            <span className="text-sm font-semibold text-[#064E3B]">บันทึกผลงานสำเร็จ</span>
            <p className="text-xs text-slate-500">เอกสาร "{fileName}" ได้รับการจับคู่เข้าสู่พอร์ตโฟลิโอเรียบร้อยแล้ว</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-slate-200/60 bg-white hover:border-slate-300/80 transition-all rounded-lg overflow-hidden shadow-sm flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200/60">
      
      {/* ====================================================================
          LEFT PANEL: FILE METADATA & PREVIEW ICON
         ==================================================================== */}
      <div className="p-6 md:w-1/4 bg-[#FCFBF9]/60 flex flex-col justify-between gap-4 shrink-0">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white border border-slate-200/60 rounded">
              <FileText className="w-6 h-6 text-slate-400" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-slate-400 block uppercase tracking-wider">ชื่อเอกสารหลักฐาน</span>
              <span className="text-sm font-semibold text-slate-700 truncate block" title={fileName}>
                {fileName}
              </span>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-200/40 pt-4 text-xs text-slate-500">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block">แหล่งที่มา</span>
              <span className="font-medium text-slate-700">{sourceName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block">ขนาดไฟล์</span>
              <span className="font-medium text-slate-700">{fileSize}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block">ตรวจพบเมื่อ</span>
              <span className="font-medium text-slate-700">{uploadedAt}</span>
            </div>
          </div>
        </div>

        {/* Minimal Asset Preview Placeholder */}
        <div className="border border-dashed border-slate-200 rounded p-3 text-center text-slate-400 bg-white">
          <span className="text-[10px] uppercase tracking-wider block mb-1">เอกสารจำลองเพื่อประมวลผล</span>
          <span className="text-[11px] text-slate-500 font-medium">ดูพรีวิวหน้าแรก (Lazy Load)</span>
        </div>
      </div>

      {/* ====================================================================
          RIGHT PANEL: AI INSIGHTS & INTERACTION CONTROLS
         ==================================================================== */}
      <div className="p-6 flex-1 flex flex-col justify-between gap-6">
        
        {/* Top: AI Categorization suggested */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#064E3B]" />
              <span className="text-xs font-semibold text-[#064E3B] uppercase tracking-wider">
                ผลการจัดหมวดหมู่อัตโนมัติ (AI Suggestion)
              </span>
            </div>
            
            {/* Confidence score badge */}
            <div className={`inline-flex items-center gap-1 border text-[11px] px-2.5 py-0.5 rounded-full font-medium ${getConfidenceColorClass(confidenceScore)}`}>
              ความมั่นใจ {confidencePercent}%
            </div>
          </div>

          {/* Indicator code and explanation banner */}
          <div className="flex items-start gap-3 bg-[#FCFBF9] border border-slate-200/50 p-4 rounded">
            <Layers className="w-4 h-4 text-slate-500 mt-1 shrink-0" />
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-700">
                ตัวชี้วัดที่ {suggestedIndicatorCode.replace('I', '')}
              </span>
              <p className="text-sm font-semibold text-slate-900 leading-snug">
                {suggestedIndicatorName}
              </p>
            </div>
          </div>

          {/* OCR Content text snippet */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block">ข้อความที่สแกนตรวจพบ (OCR Snippet)</span>
            <div className="bg-slate-50 border border-slate-200/40 rounded p-3 text-xs text-slate-600 leading-relaxed font-mono whitespace-pre-line max-h-24 overflow-y-auto">
              "{ocrSnippet}"
            </div>
          </div>

          {/* AI Justification text */}
          <div className="flex gap-2 text-xs text-slate-500 leading-relaxed bg-[#E6F4EA]/15 px-3 py-2 rounded border border-[#064E3B]/5">
            <AlertCircle className="w-3.5 h-3.5 text-[#064E3B] mt-0.5 shrink-0" />
            <p>
              <strong className="text-slate-700">เหตุผลเชิงวิเคราะห์: </strong>{aiReasoning}
            </p>
          </div>
        </div>

        {/* Bottom: Action trigger buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="bg-[#064E3B] hover:bg-[#053e2f] active:bg-[#043327] text-white text-xs font-semibold px-4 py-2.5 rounded transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> อนุมัติผลงานเข้าสู่พอร์ต
            </button>
            
            <button
              onClick={handleEdit}
              disabled={isProcessing}
              className="bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Settings className="w-4 h-4 text-slate-400" /> ปรับแต่งหมวดหมู่
            </button>
          </div>

          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="text-slate-400 hover:text-red-700 p-2 rounded transition-colors disabled:opacity-50"
            title="ละทิ้งข้อมูลชั่วคราว"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
}

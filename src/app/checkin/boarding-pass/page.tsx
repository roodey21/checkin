'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCheckIn } from '@/context/CheckInContext';
import { Plane, Download, Printer, ArrowLeft, RefreshCw, Calendar, MapPin } from 'lucide-react';

const formatSeatId = (id: string) => {
  if (!id) return '';
  const parts = id.split('-');
  if (parts.length >= 4) {
    const table = parts[2].replace(/[T|Meja\s]/g, '');
    const seat = parts[3].replace('S', '');
    return `${table}-${seat}`;
  }
  return id;
};

export default function BoardingPassPage() {
  const router = useRouter();
  const { participant, selectedSeatId, logout, loading } = useCheckIn();
  const [downloading, setDownloading] = useState<string | null>(null);

  // Redirect if session is missing
  useEffect(() => {
    if (!loading && (!participant || !selectedSeatId)) {
      router.push('/checkin');
    }
  }, [participant, selectedSeatId, loading, router]);

  if (loading || !participant || !selectedSeatId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
        <span className="text-slate-600 text-sm">Menyiapkan boarding pass...</span>
      </div>
    );
  }

  // Export to JPG
  const handleDownloadJPG = async () => {
    setDownloading('jpg');
    const html2canvas = (await import('html2canvas')).default;
    const element = document.getElementById('boarding-pass-ticket');

    if (!element) {
      setDownloading(null);
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 3, // Super high quality
        useCORS: true,
        backgroundColor: '#f8fafc'
      });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = `BoardingPass_${participant.nama.replace(/\s+/g, '_')}_${selectedSeatId}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Gagal unduh JPG:', err);
    } finally {
      setDownloading(null);
    }
  };

  // Export to PDF
  const handleDownloadPDF = async () => {
    setDownloading('pdf');
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');
    const element = document.getElementById('boarding-pass-ticket');

    if (!element) {
      setDownloading(null);
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#f8fafc'
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // Compute width and height of canvas for landscape orientation
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      pdf.save(`BoardingPass_${participant.nama.replace(/\s+/g, '_')}_${selectedSeatId}.pdf`);
    } catch (err) {
      console.error('Gagal unduh PDF:', err);
    } finally {
      setDownloading(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen py-10 px-4 flex flex-col items-center justify-center max-w-4xl mx-auto">
      {/* Upper Navigation */}
      <div className="w-full flex justify-between items-center mb-10 no-print">
        <button
          onClick={() => router.push('/checkin/seat')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ubah Kursi</span>
        </button>

        <button
          onClick={() => {
            logout();
            router.push('/checkin');
          }}
          className="text-sm text-slate-600 hover:text-red-500 transition-colors"
        >
          Keluar Sesi
        </button>
      </div>

      {/* TICKET CONTAINER */}
      <div className="w-full overflow-x-auto pb-6 flex justify-center print-area">
        <div
          id="boarding-pass-ticket"
          className="w-[780px] h-[290px] bg-white rounded-3xl border border-slate-300 shadow-2xl flex overflow-hidden shrink-0 relative"
          style={{ fontFamily: 'sans-serif' }}
        >
          {/* LEFT: MAIN PASSENGER BOARDING CARD (70%) */}
          <div className="w-[70%] p-6 flex flex-col justify-between relative border-r-2 border-dotted border-slate-300 overflow-hidden bg-white">
            {/* Corner cutouts for ticket aesthetic */}
            <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-slate-50 rounded-full border border-slate-300 no-print z-20"></div>
            <div className="absolute -top-3 -right-3 w-6 h-6 bg-slate-50 rounded-full border border-slate-300 no-print z-20"></div>

            {/* Background World Map with whitespace padding */}
            <div className="absolute inset-0 pointer-events-none select-none z-0 p-4">
              <img
                src="/aset-peta.png"
                alt="Background Map"
                className="w-full h-full object-contain opacity-85"
              />
            </div>

            {/* Header info */}
            <div className="flex items-center relative z-10">
              <img
                src="/ptpn-airlines.png"
                alt="PTPN Airlines Logo"
                className="h-[18px] object-contain"
              />
              <div className="w-[1.5px] h-6 bg-[#1a2c5b]/30 mx-3"></div>
              <span className="font-sans text-xs font-bold text-[#1b2a57] tracking-wider uppercase">
                {participant.kategori === 'eksekutif' ? 'Executive Class' : 'Business Class'}
              </span>
            </div>

            {/* Center flight route graphic */}
            <div className="flex justify-center my-2 relative z-10">
              <img
                src="/aset-psn-ftr.png"
                alt="PSN - FTR"
                className="h-[52px] object-contain"
              />
            </div>

            {/* Middle passenger info */}
            <div className="grid grid-cols-2 gap-y-3 gap-x-6 relative z-10 px-2 mt-2">
              <div className="flex flex-col">
                <div className="text-[10px] font-serif lining-nums text-slate-500 tracking-wide leading-normal" style={{ fontFamily: '"Times New Roman", Times, serif' }}>Name</div>
                <div className="text-sm font-serif lining-nums font-bold text-[#1a2c5b] mt-0.5 truncate uppercase leading-normal pb-0.5" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                  {participant.nama}
                </div>
              </div>
              <div className="flex flex-col">
                <div className="text-[10px] font-serif lining-nums text-slate-500 tracking-wide leading-normal" style={{ fontFamily: '"Times New Roman", Times, serif' }}>Booking Number</div>
                <div className="text-sm font-serif lining-nums font-bold text-[#1a2c5b] mt-0.5 uppercase leading-normal pb-0.5" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                  {participant.booking_code}
                </div>
              </div>
              <div className="flex flex-col">
                <div className="text-[10px] font-serif lining-nums text-slate-500 tracking-wide leading-normal" style={{ fontFamily: '"Times New Roman", Times, serif' }}>Date</div>
                <div className="text-sm font-serif lining-nums font-bold text-[#1a2c5b] mt-0.5 leading-normal pb-0.5" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                  11 - 12 Juni 2026
                </div>
              </div>
              <div className="flex flex-col">
                <div className="text-[10px] font-serif lining-nums text-slate-500 tracking-wide leading-normal" style={{ fontFamily: '"Times New Roman", Times, serif' }}>Gate</div>
                <div className="text-sm font-serif lining-nums font-bold text-[#1a2c5b] mt-0.5 leading-normal pb-0.5" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                  A1
                </div>
              </div>
              <div className="flex flex-col">
                <div className="text-[10px] font-serif lining-nums text-slate-500 tracking-wide leading-normal" style={{ fontFamily: '"Times New Roman", Times, serif' }}>Boarding</div>
                <div className="text-sm font-serif lining-nums font-bold text-[#1a2c5b] mt-0.5 leading-normal pb-0.5" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                  08.00 WIB
                </div>
              </div>
              <div className="flex flex-col">
                <div className="text-[10px] font-serif lining-nums text-slate-500 tracking-wide leading-normal" style={{ fontFamily: '"Times New Roman", Times, serif' }}>Seat</div>
                <div className="text-sm font-serif lining-nums font-bold text-[#1a2c5b] mt-0.5 uppercase leading-normal pb-0.5" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                  {formatSeatId(selectedSeatId)}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: TICKET STUB / DETACHABLE PORTION (30%) */}
          <div className="w-[30%] p-5 bg-white flex flex-col justify-between relative overflow-hidden">
            {/* Corner cutouts for ticket aesthetic */}
            <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-slate-50 rounded-full border border-slate-300 no-print z-20"></div>
            <div className="absolute -top-3 -left-3 w-6 h-6 bg-slate-50 rounded-full border border-slate-300 no-print z-20"></div>

            {/* Watermark Logo in Blue */}
            <div className="absolute inset-0 pointer-events-none select-none z-0 flex items-center justify-center overflow-hidden opacity-85">
              <img
                src="/aset-logo.png"
                alt="Watermark Logo"
                className="w-[85%] h-auto object-contain"
              />
            </div>

            {/* Stub content details */}
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 relative z-10 px-1 mt-1">
              <div className="flex flex-col col-span-2">
                <div className="text-[8px] font-serif lining-nums text-slate-500 tracking-wide leading-tight" style={{ fontFamily: '"Times New Roman", Times, serif' }}>Name</div>
                <div className="text-[11px] font-serif lining-nums font-bold text-[#1a2c5b] mt-0.5 uppercase break-words leading-tight pb-0.5" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                  {participant.nama}
                </div>
              </div>
              <div className="flex flex-col col-span-2">
                <div className="text-[8px] font-serif lining-nums text-slate-500 tracking-wide leading-tight" style={{ fontFamily: '"Times New Roman", Times, serif' }}>Booking Number</div>
                <div className="text-[11px] font-serif lining-nums font-bold text-[#1a2c5b] mt-0.5 uppercase leading-tight pb-0.5" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                  {participant.booking_code}
                </div>
              </div>
              <div className="flex flex-col">
                <div className="text-[8px] font-serif lining-nums text-slate-500 tracking-wide leading-tight" style={{ fontFamily: '"Times New Roman", Times, serif' }}>Date</div>
                <div className="text-[11px] font-serif lining-nums font-bold text-[#1a2c5b] mt-0.5 leading-tight pb-0.5" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                  11-12 Jun
                </div>
              </div>
              <div className="flex flex-col">
                <div className="text-[8px] font-serif lining-nums text-slate-500 tracking-wide leading-tight" style={{ fontFamily: '"Times New Roman", Times, serif' }}>Gate</div>
                <div className="text-[11px] font-serif lining-nums font-bold text-[#1a2c5b] mt-0.5 leading-tight pb-0.5" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                  A1
                </div>
              </div>
              <div className="flex flex-col">
                <div className="text-[8px] font-serif lining-nums text-slate-500 tracking-wide leading-tight" style={{ fontFamily: '"Times New Roman", Times, serif' }}>Boarding</div>
                <div className="text-[11px] font-serif lining-nums font-bold text-[#1a2c5b] mt-0.5 leading-tight pb-0.5" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                  08.00
                </div>
              </div>
              <div className="flex flex-col">
                <div className="text-[8px] font-serif lining-nums text-slate-500 tracking-wide leading-tight" style={{ fontFamily: '"Times New Roman", Times, serif' }}>Seat</div>
                <div className="text-[11px] font-serif lining-nums font-bold text-[#1a2c5b] mt-0.5 uppercase leading-tight pb-0.5" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                  {formatSeatId(selectedSeatId)}
                </div>
              </div>
            </div>

            {/* Stub barcode / location scanner */}
            <div className="flex justify-center mt-1 relative z-10">
              <div className="p-1 border border-[#1a2c5b]/10 rounded-xl bg-white shadow-sm flex items-center justify-center overflow-hidden">
                <img
                  src="/barcode.png"
                  alt="Scan for Location"
                  className="w-[95px] h-[95px] object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EXPORT OPTIONS BAR */}
      <div className="w-full max-w-md grid grid-cols-3 gap-3 mt-8 no-print">
        <button
          onClick={handleDownloadJPG}
          disabled={!!downloading}
          className="flex flex-col items-center justify-center p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl text-slate-600 hover:text-slate-900 transition-all gap-2 text-xs font-semibold shadow-sm active:scale-[0.98] disabled:opacity-50"
        >
          <Download className="w-5 h-5 text-sky-400" />
          <span>{downloading === 'jpg' ? 'Memproses...' : 'Unduh JPG'}</span>
        </button>

        <button
          onClick={handleDownloadPDF}
          disabled={!!downloading}
          className="flex flex-col items-center justify-center p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl text-slate-600 hover:text-slate-900 transition-all gap-2 text-xs font-semibold shadow-sm active:scale-[0.98] disabled:opacity-50"
        >
          <Download className="w-5 h-5 text-indigo-400" />
          <span>{downloading === 'pdf' ? 'Memproses...' : 'Unduh PDF'}</span>
        </button>

        <button
          onClick={handlePrint}
          disabled={!!downloading}
          className="flex flex-col items-center justify-center p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl text-slate-600 hover:text-slate-900 transition-all gap-2 text-xs font-semibold shadow-sm active:scale-[0.98] disabled:opacity-50"
        >
          <Printer className="w-5 h-5 text-emerald-400" />
          <span>Cetak</span>
        </button>
      </div>

      <p className="text-center text-xs text-slate-600 mt-8 no-print">
        Simpan boarding pass Anda di handphone (JPG) atau cetak (PDF) untuk ditunjukkan saat memasuki area forum.
      </p>
    </div>
  );
}

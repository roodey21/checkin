'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCheckIn } from '@/context/CheckInContext';
import { Plane, Download, Printer, ArrowLeft, RefreshCw, Calendar, MapPin } from 'lucide-react';

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
        <span className="text-slate-400 text-sm">Menyiapkan boarding pass...</span>
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
        backgroundColor: '#030712' // Dark slate background
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
        backgroundColor: '#030712'
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
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ubah Kursi</span>
        </button>

        <button
          onClick={() => {
            logout();
            router.push('/checkin');
          }}
          className="text-sm text-slate-400 hover:text-red-400 transition-colors"
        >
          Keluar Sesi
        </button>
      </div>

      {/* TICKET CONTAINER */}
      <div className="w-full overflow-x-auto pb-6 flex justify-center print-area">
        <div
          id="boarding-pass-ticket"
          className="w-[780px] h-[260px] bg-gray-950 rounded-3xl border border-slate-800 shadow-2xl flex overflow-hidden shrink-0 relative"
          style={{ fontFamily: 'sans-serif' }}
        >
          {/* Accent decoration */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-400 to-indigo-500"></div>

          {/* LEFT: MAIN PASSENGER BOARDING CARD (70%) */}
          <div className="w-[70%] p-6 flex flex-col justify-between relative border-r border-dashed border-slate-800">
            {/* Corner cutouts for ticket aesthetic */}
            <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-slate-950 rounded-full border border-slate-800 no-print"></div>
            <div className="absolute -top-3 -right-3 w-6 h-6 bg-slate-950 rounded-full border border-slate-800 no-print"></div>

            {/* Header info */}
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">
                  Official Boarding Pass
                </span>
                <h2 className="text-sm font-extrabold text-white uppercase tracking-wider mt-0.5">
                  PTPN FINANCE & RISK LEADERS FORUM 2026
                </h2>
              </div>
              <Plane className="w-5 h-5 text-sky-400 rotate-45" />
            </div>

            {/* Middle passenger info */}
            <div className="grid grid-cols-2 gap-y-4 gap-x-2 mt-4">
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-slate-500">NAMA PESERTA</span>
                <span className="text-sm font-bold text-white uppercase line-clamp-1">{participant.nama}</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-slate-500">KATEGORI KELAS</span>
                <span className="text-sm font-extrabold text-sky-400 uppercase tracking-wide">
                  {participant.kategori}
                </span>
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-slate-500">KODE BOOKING</span>
                <span className="text-sm font-bold text-white font-mono tracking-wider">{participant.booking_code}</span>
              </div>
              <div className="flex gap-4">
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-slate-500">TANGGAL</span>
                  <span className="text-xs font-semibold text-slate-300">01 Juni 2026</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-slate-500">SEAT</span>
                  <span className="text-xs font-semibold text-slate-300">{selectedSeatId}</span>
                </div>
              </div>
            </div>

            {/* Footer Barcode / Info */}
            <div className="flex justify-between items-end mt-4 pt-3 border-t border-slate-900/60">
              <div className="flex items-center gap-4 text-[10px] text-slate-400">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span>19:00 WIB</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span>Main Ballroom</span>
                </div>
              </div>

              {/* Pseudo Barcode */}
              <div className="flex flex-col items-center">
                <div className="h-6 flex items-end gap-[1.5px] opacity-75">
                  <div className="w-[1px] h-full bg-slate-400"></div>
                  <div className="w-[2px] h-full bg-slate-400"></div>
                  <div className="w-[1px] h-full bg-slate-400"></div>
                  <div className="w-[3px] h-full bg-slate-400"></div>
                  <div className="w-[1px] h-full bg-slate-400"></div>
                  <div className="w-[2px] h-full bg-slate-400"></div>
                  <div className="w-[1px] h-full bg-slate-400"></div>
                  <div className="w-[4px] h-full bg-slate-400"></div>
                  <div className="w-[1px] h-full bg-slate-400"></div>
                  <div className="w-[2px] h-full bg-slate-400"></div>
                  <div className="w-[1px] h-full bg-slate-400"></div>
                  <div className="w-[3px] h-full bg-slate-400"></div>
                  <div className="w-[1px] h-full bg-slate-400"></div>
                  <div className="w-[2px] h-full bg-slate-400"></div>
                  <div className="w-[1px] h-full bg-slate-400"></div>
                  <div className="w-[4px] h-full bg-slate-400"></div>
                </div>
                <span className="text-[7px] text-slate-600 font-mono tracking-widest mt-1">PTPN2026FRL</span>
              </div>
            </div>
          </div>

          {/* RIGHT: TICKET STUB / DETACHABLE PORTION (30%) */}
          <div className="w-[30%] p-6 bg-slate-950 flex flex-col justify-between relative bg-gradient-to-br from-slate-900/40 to-slate-950/20">
            {/* Corner cutouts for ticket aesthetic */}
            <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-slate-950 rounded-full border border-slate-800 no-print"></div>
            <div className="absolute -top-3 -left-3 w-6 h-6 bg-slate-950 rounded-full border border-slate-800 no-print"></div>

            {/* Stub header */}
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">DETACHABLE STUB</span>
              <span className="text-[10px] font-extrabold text-white bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                {selectedSeatId}
              </span>
            </div>

            {/* Stub content details */}
            <div className="space-y-3 mt-4 flex-1 justify-center flex flex-col">
              <div>
                <span className="block text-[8px] uppercase tracking-wider text-slate-500">NAMA</span>
                <span className="text-xs font-bold text-white uppercase line-clamp-1">{participant.nama}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <span className="block text-[8px] uppercase tracking-wider text-slate-500">KELAS</span>
                  <span className="text-[10px] font-semibold text-slate-300 uppercase">{participant.kategori}</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-wider text-slate-500">KODE</span>
                  <span className="text-[10px] font-bold text-slate-300 font-mono">{participant.booking_code}</span>
                </div>
              </div>
            </div>

            {/* Stub footer logo */}
            <div className="text-right border-t border-slate-900/60 pt-3">
              <span className="text-[8px] font-extrabold text-slate-500 tracking-wider">BOARDING PASS</span>
            </div>
          </div>
        </div>
      </div>

      {/* EXPORT OPTIONS BAR */}
      <div className="w-full max-w-md grid grid-cols-3 gap-3 mt-8 no-print">
        <button
          onClick={handleDownloadJPG}
          disabled={!!downloading}
          className="flex flex-col items-center justify-center p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl text-slate-300 hover:text-white transition-all gap-2 text-xs font-semibold shadow active:scale-[0.98] disabled:opacity-50"
        >
          <Download className="w-5 h-5 text-sky-400" />
          <span>{downloading === 'jpg' ? 'Memproses...' : 'Unduh JPG'}</span>
        </button>

        <button
          onClick={handleDownloadPDF}
          disabled={!!downloading}
          className="flex flex-col items-center justify-center p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl text-slate-300 hover:text-white transition-all gap-2 text-xs font-semibold shadow active:scale-[0.98] disabled:opacity-50"
        >
          <Download className="w-5 h-5 text-indigo-400" />
          <span>{downloading === 'pdf' ? 'Memproses...' : 'Unduh PDF'}</span>
        </button>

        <button
          onClick={handlePrint}
          disabled={!!downloading}
          className="flex flex-col items-center justify-center p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl text-slate-300 hover:text-white transition-all gap-2 text-xs font-semibold shadow active:scale-[0.98] disabled:opacity-50"
        >
          <Printer className="w-5 h-5 text-emerald-400" />
          <span>Cetak</span>
        </button>
      </div>

      <p className="text-center text-xs text-slate-500 mt-8 no-print">
        Simpan boarding pass Anda di handphone (JPG) atau cetak (PDF) untuk ditunjukkan saat memasuki area forum.
      </p>
    </div>
  );
}

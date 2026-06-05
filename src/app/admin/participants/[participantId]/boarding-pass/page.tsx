'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAdminBoardingPassDataAction } from '@/app/actions/admin';
import { ArrowLeft, Plane, Printer, RefreshCw, Calendar, MapPin, AlertCircle } from 'lucide-react';

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

interface BoardingParticipant {
  id: string;
  nama: string;
  email: string;
  kategori: 'eksekutif' | 'bisnis';
  booking_code: string | null;
}

export default function AdminParticipantBoardingPassPage() {
  const router = useRouter();
  const params = useParams<{ participantId: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participant, setParticipant] = useState<BoardingParticipant | null>(null);
  const [seatId, setSeatId] = useState<string | null>(null);

  useEffect(() => {
    const loadBoardingPass = async () => {
      setLoading(true);
      setError(null);

      try {
        const participantId = params?.participantId;
        if (!participantId) {
          setError('ID peserta tidak ditemukan.');
          return;
        }

        const res = await getAdminBoardingPassDataAction(participantId);
        if (res.success && res.participant && res.seatId) {
          setParticipant(res.participant as BoardingParticipant);
          setSeatId(res.seatId);
        } else {
          setError(res.error || 'Data boarding pass tidak ditemukan.');
        }
      } catch (err) {
        console.error(err);
        setError('Terjadi kesalahan saat memuat boarding pass.');
      } finally {
        setLoading(false);
      }
    };

    loadBoardingPass();
  }, [params?.participantId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
        <span className="text-slate-600 text-sm">Menyiapkan boarding pass...</span>
      </div>
    );
  }

  if (error || !participant || !seatId) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto flex flex-col gap-6">
        <button
          onClick={() => router.push('/admin/participants')}
          className="w-fit inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard Admin</span>
        </button>

        <div className="glass-card p-6 rounded-2xl border border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">Boarding pass tidak tersedia</h2>
              <p className="text-sm text-slate-600 mt-1">{error || 'Peserta belum check-in.'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 flex flex-col items-center justify-center max-w-4xl mx-auto">
      <div className="w-full flex justify-between items-center mb-10 no-print">
        <button
          onClick={() => router.push('/admin/participants')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard Admin</span>
        </button>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all shadow"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Ticket</span>
        </button>
      </div>

      <div className="w-full overflow-x-auto pb-6 flex justify-center print-area">
        <div
          id="admin-boarding-pass-ticket"
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
                className="h-6 object-contain"
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
                  {formatSeatId(seatId)}
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
            <div className="absolute inset-0 pointer-events-none select-none z-0 flex items-center justify-center overflow-hidden opacity-[0.10]">
              <img 
                src="/vector-logo.png" 
                alt="Watermark Logo" 
                className="w-[85%] h-auto object-contain"
                style={{ filter: 'brightness(0) saturate(100%) invert(14%) sepia(45%) saturate(3000%) hue-rotate(215deg) brightness(95%) contrast(93%)' }}
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
                  {formatSeatId(seatId)}
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

      <p className="text-center text-xs text-slate-600 mt-6 no-print">
        Ticket ini dicetak dari portal admin untuk keperluan verifikasi peserta di lokasi acara.
      </p>
    </div>
  );
}

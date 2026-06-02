'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAdminBoardingPassDataAction } from '@/app/actions/admin';
import { ArrowLeft, Plane, Printer, RefreshCw, Calendar, MapPin, AlertCircle } from 'lucide-react';

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
          className="w-[780px] h-[260px] bg-white rounded-3xl border border-slate-200 shadow-2xl flex overflow-hidden shrink-0 relative"
          style={{ fontFamily: 'sans-serif' }}
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 to-amber-500"></div>

          <div className="w-[70%] p-6 flex flex-col justify-between relative border-r border-dashed border-slate-200">
            <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-slate-50 rounded-full border border-slate-200 no-print"></div>
            <div className="absolute -top-3 -right-3 w-6 h-6 bg-slate-50 rounded-full border border-slate-200 no-print"></div>

            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">
                  Official Boarding Pass
                </span>
                <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mt-0.5">
                  PTPN FINANCE & RISK LEADERS FORUM 2026
                </h2>
              </div>
              <Plane className="w-5 h-5 text-orange-400 rotate-45" />
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-2 mt-4">
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-slate-500">NAMA PESERTA</span>
                <span className="text-sm font-bold text-slate-900 uppercase line-clamp-1">{participant.nama}</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-slate-500">KATEGORI KELAS</span>
                <span className="text-sm font-extrabold text-orange-400 uppercase tracking-wide">{participant.kategori}</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-slate-500">KODE BOOKING</span>
                <span className="text-sm font-bold text-slate-900 font-mono tracking-wider">{participant.booking_code}</span>
              </div>
              <div className="flex gap-4">
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-slate-500">TANGGAL</span>
                  <span className="text-xs font-semibold text-slate-700">11-12 Juni 2026</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-slate-500">SEAT</span>
                  <span className="text-xs font-semibold text-slate-700">{seatId}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-end mt-4 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-4 text-[10px] text-slate-400">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span>08:00 - 17:00 WIB</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span>PT. LPP Agro Nusantara</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-[30%] p-6 bg-slate-100 flex flex-col justify-between relative bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-slate-50 rounded-full border border-slate-200 no-print"></div>
            <div className="absolute -top-3 -left-3 w-6 h-6 bg-slate-50 rounded-full border border-slate-200 no-print"></div>

            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-orange-400 uppercase tracking-widest">DETACHABLE STUB</span>
              <span className="text-[10px] font-extrabold text-slate-900 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                {seatId}
              </span>
            </div>

            <div className="space-y-3 mt-4 flex-1 justify-center flex flex-col">
              <div>
                <span className="block text-[8px] uppercase tracking-wider text-slate-500">NAMA</span>
                <span className="text-xs font-bold text-slate-900 uppercase line-clamp-1">{participant.nama}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <span className="block text-[8px] uppercase tracking-wider text-slate-500">KELAS</span>
                  <span className="text-[10px] font-semibold text-slate-700 uppercase">{participant.kategori}</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-wider text-slate-500">KODE</span>
                  <span className="text-[10px] font-bold text-slate-700 font-mono">{participant.booking_code}</span>
                </div>
              </div>
            </div>

            <div className="text-right border-t border-slate-200 pt-3">
              <span className="text-[8px] font-extrabold text-slate-500 tracking-wider">BOARDING PASS</span>
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

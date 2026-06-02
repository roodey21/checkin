'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCheckIn } from '@/context/CheckInContext';
import { getParticipantByCodeAction } from '@/app/actions/booking';
import { ArrowRight, Plane, Loader2, AlertCircle } from 'lucide-react';

function CheckInFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, setSelectedSeat } = useCheckIn();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-check if code is in the URL
  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam) {
      setCode(codeParam);
      handleCheckIn(codeParam);
    }
  }, [searchParams]);

  const handleCheckIn = async (bookingCode: string) => {
    if (!bookingCode.trim()) {
      setError('Harap masukkan kode booking Anda.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await getParticipantByCodeAction(bookingCode);
      if (res.success && res.participant) {
        login(res.participant);
        if (res.checkedIn && res.seatId) {
          setSelectedSeat(res.seatId);
          router.push('/checkin/boarding-pass');
        } else {
          setSelectedSeat(null);
          router.push('/checkin/seat');
        }
      } else {
        setError(res.error || 'Terjadi kesalahan.');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan koneksi ke server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 glass-card rounded-2xl border border-slate-200 shadow-2xl relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-4 border border-orange-500/25">
          <Plane className="w-8 h-8 text-orange-400 rotate-45" />
        </div>
        <span className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-1">
          Web Check-In Portal
        </span>
        <h1 className="text-xl font-extrabold text-slate-900 text-center leading-tight">
          Masukkan Kode Booking
        </h1>
        <p className="text-xs text-slate-600 text-center mt-2">
          Gunakan kode booking unik Anda yang dikirimkan via email untuk memilih tempat duduk.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleCheckIn(code);
        }}
        className="space-y-6"
      >
        <div className="space-y-2">
          <label htmlFor="booking-code" className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Kode Booking
          </label>
          <input
            id="booking-code"
            type="text"
            placeholder="Contoh: X7K2B9"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={loading}
            className="w-full px-4 py-3 bg-white/85 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-mono text-center text-lg tracking-widest shadow-sm"
          />
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/25 rounded-xl text-sm text-red-200">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-orange-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Memproses...</span>
            </>
          ) : (
            <>
              <span>Mulai Check-in</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Logos Header */}
      <div className="w-full max-w-md flex justify-between items-center px-4 mb-6">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-none">Danantara</span>
          <span className="text-[9px] font-extrabold text-slate-900 uppercase tracking-widest leading-none mt-1">Indonesia</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider leading-none">Perkebunan</span>
          <span className="text-[9px] font-extrabold text-slate-700 uppercase tracking-widest leading-none mt-1">Nusantara</span>
        </div>
      </div>

      <div className="text-center mb-8 max-w-md flex flex-col items-center">
        <h2 className="text-lg font-black tracking-[0.25em] text-slate-900">PTPN</h2>
        <h1 className="text-2xl font-extrabold text-sunset tracking-wider mt-1 uppercase leading-tight">
          Finance & Risk Leaders Forum 2026
        </h1>
        <div className="mt-3 inline-block bg-white/80 border border-orange-500/25 rounded-full px-4 py-1 text-[9px] text-slate-800 uppercase font-bold tracking-wider shadow-sm">
          Navigating The New Era of Financial Excellence
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-[9px] text-slate-500">
          <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">📅 11-12 Juni 2026</span>
          <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">📍 PT. LPP Agro Nusantara</span>
        </div>
      </div>

      <Suspense fallback={
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <span className="text-slate-400 text-sm">Memuat halaman...</span>
        </div>
      }>
        <CheckInFormContent />
      </Suspense>
    </div>
  );
}

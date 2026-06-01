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
    <div className="w-full max-w-md p-8 glass-card rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-sky-500/10 rounded-2xl flex items-center justify-center mb-4 border border-sky-500/25">
          <Plane className="w-8 h-8 text-sky-400 rotate-45" />
        </div>
        <span className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-1">
          PTPN Forum 2026
        </span>
        <h1 className="text-2xl font-extrabold text-white text-center leading-tight">
          Web Check-in
        </h1>
        <p className="text-sm text-slate-400 text-center mt-2">
          Masukkan kode booking unik Anda yang dikirimkan via email untuk memilih tempat duduk.
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
          <label htmlFor="booking-code" className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Kode Booking
          </label>
          <input
            id="booking-code"
            type="text"
            placeholder="Contoh: X7K2B9"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={loading}
            className="w-full px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-mono text-center text-lg tracking-widest"
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
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-sky-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
          <span className="text-slate-400 text-sm">Memuat halaman...</span>
        </div>
      }>
        <CheckInFormContent />
      </Suspense>
    </div>
  );
}

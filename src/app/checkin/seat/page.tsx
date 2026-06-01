'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCheckIn } from '@/context/CheckInContext';
import { supabase } from '@/lib/supabase';
import {
  lockSeatAction,
  unlockSeatAction,
  confirmBookingAction,
  getSeatsStatusAction
} from '@/app/actions/booking';
import { Plane, AlertTriangle, Clock, Check, ShieldAlert, LogOut } from 'lucide-react';

interface Seat {
  id: string;
  kategori: 'eksekutif' | 'bisnis';
  row_name: string;
  seat_number: number;
}

interface Booking {
  participant_id: string;
  seat_id: string;
}

interface Lock {
  participant_id: string;
  seat_id: string;
  locked_at: string;
}

export default function SeatSelectionPage() {
  const router = useRouter();
  const { participant, selectedSeatId, lockExpiresAt, setSelectedSeat, logout, loading: sessionLoading } = useCheckIn();
  
  const [seats, setSeats] = useState<Seat[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [locks, setLocks] = useState<Lock[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Redirect if no participant session
  useEffect(() => {
    if (!sessionLoading && !participant) {
      router.push('/checkin');
    }
  }, [participant, sessionLoading, router]);

  // Fetch initial seat states
  const fetchSeats = async () => {
    try {
      const res = await getSeatsStatusAction();
      if (res.success && res.seats) {
        setSeats(res.seats as Seat[]);
        setBookings(res.bookings || []);
        setLocks(res.locks || []);
      } else {
        setError(res.error || 'Gagal mengambil data kursi.');
      }
    } catch (err) {
      console.error(err);
      setError('Kesalahan koneksi database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!participant) return;

    fetchSeats();

    // Subscribe to realtime database updates
    const channel = supabase
      .channel('realtime_seats')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          fetchSeats();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'seat_locks' },
        () => {
          fetchSeats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [participant]);

  // Countdown timer handler for seat lock
  useEffect(() => {
    if (lockExpiresAt && selectedSeatId) {
      const expiry = new Date(lockExpiresAt).getTime();
      
      const updateTimer = () => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((expiry - now) / 1000));
        
        setTimeLeft(diff);

        if (diff === 0) {
          handleLockExpired();
        }
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    } else {
      setTimeLeft(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lockExpiresAt, selectedSeatId]);

  const handleLockExpired = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (participant) {
      await unlockSeatAction(participant.id);
    }
    setSelectedSeat(null);
    setTimeLeft(null);
    setError('Waktu pemilihan tempat duduk Anda (5 menit) telah kedaluwarsa. Silakan pilih kembali.');
    fetchSeats();
  };

  // Lock seat action
  const handleSelectSeat = async (seat: Seat) => {
    if (!participant) return;
    if (actionLoading) return;

    // Validate category selection
    if (seat.kategori !== participant.kategori) {
      setError(`Kategori kursi tidak sesuai! Anda terdaftar di kelas ${participant.kategori.toUpperCase()}.`);
      return;
    }

    // Check if already booked
    const isBooked = bookings.some((b) => b.seat_id === seat.id);
    if (isBooked) return;

    // Check if locked by someone else
    const lock = locks.find((l) => l.seat_id === seat.id);
    const isLockedByOther = lock && lock.participant_id !== participant.id;
    if (isLockedByOther) return;

    setActionLoading(true);
    setError(null);

    try {
      const res = await lockSeatAction(seat.id, participant.id);
      if (res.success && res.expiresAt) {
        setSelectedSeat(seat.id, res.expiresAt);
      } else {
        setError(res.error || 'Gagal memilih kursi. Mungkin sudah dipilih pengguna lain.');
        fetchSeats();
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan saat mengunci kursi.');
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm booking action
  const handleConfirmBooking = async () => {
    if (!participant || !selectedSeatId || actionLoading) return;

    setActionLoading(true);
    setError(null);

    try {
      const res = await confirmBookingAction(selectedSeatId, participant.id);
      if (res.success) {
        router.push('/checkin/boarding-pass');
      } else {
        setError(res.error || 'Gagal mengonfirmasi check-in. Kunci kursi Anda mungkin telah habis.');
        setSelectedSeat(null);
        fetchSeats();
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan saat mengonfirmasi check-in.');
    } finally {
      setActionLoading(false);
    }
  };

  // Formats time left to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (sessionLoading || !participant || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Clock className="w-8 h-8 text-sky-400 animate-spin" />
        <span className="text-slate-400 text-sm">Menyiapkan seat map...</span>
      </div>
    );
  }

  // Seperate seats into rows
  const executiveRows = ['E1', 'E2', 'E3', 'E4'];
  const businessRows = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'];

  const getSeatStatus = (seatId: string) => {
    const isBooked = bookings.some((b) => b.seat_id === seatId);
    if (isBooked) return 'booked';

    const lock = locks.find((l) => l.seat_id === seatId);
    if (lock) {
      return lock.participant_id === participant.id ? 'selected' : 'locked';
    }

    return 'available';
  };

  return (
    <div className="min-h-screen py-8 px-4 flex flex-col items-center justify-start max-w-6xl mx-auto">
      {/* Header */}
      <div className="w-full flex flex-col md:flex-row justify-between items-center mb-8 gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-500/10 rounded-xl border border-orange-500/20">
            <Plane className="w-6 h-6 text-orange-400 rotate-45" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Pilih Tempat Duduk</h1>
            <p className="text-xs text-slate-400">Selamat datang, <span className="text-orange-400 font-semibold">{participant.nama}</span> ({participant.kategori.toUpperCase()})</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Lock Timer */}
          {timeLeft !== null && selectedSeatId && (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm font-semibold animate-pulse">
              <Clock className="w-4 h-4" />
              <span>Sisa Waktu Kunci: {formatTime(timeLeft)}</span>
            </div>
          )}

          <button
            onClick={() => {
              if (selectedSeatId) unlockSeatAction(participant.id);
              logout();
            }}
            className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-500/30 rounded-xl text-sm transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="w-full flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/25 rounded-2xl text-sm text-red-200 mb-6 max-w-4xl">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
          <p className="flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-slate-400 hover:text-white font-bold">Tutup</button>
        </div>
      )}

      {/* Main Seat Map Layout */}
      <div className="w-full flex flex-col lg:flex-row gap-8 items-start justify-center">
        {/* Left Column: Seating Chart */}
        <div className="flex-1 w-full glass-card p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col items-center">
          {/* Stage representation */}
          <div className="w-full max-w-md bg-slate-900 border-2 border-slate-700 text-center py-4 rounded-xl mb-12 shadow-inner relative">
            <span className="text-xs font-bold text-slate-400 tracking-[0.3em] uppercase">STAGE / LAYAR UTAMA</span>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-sky-500 blur-[2px]"></div>
          </div>

          {/* Seat Grid */}
          <div className="w-full space-y-8 overflow-x-auto pb-4">
            {/* 1. Executive Section */}
            <div className="space-y-3 min-w-[320px]">
              <div className="text-center">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest bg-sky-500/10 px-3 py-1 rounded-full">Kategori Eksekutif (Baris Depan)</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                {executiveRows.map((rowName) => (
                  <div key={rowName} className="flex items-center gap-2">
                    <span className="w-8 text-right text-xs font-bold text-slate-500 mr-2">{rowName}</span>
                    <div className="flex gap-2">
                      {seats
                        .filter((s) => s.row_name === rowName)
                        .map((seat) => {
                          const status = getSeatStatus(seat.id);
                          const isEligible = participant.kategori === 'eksekutif';
                          return (
                            <button
                              key={seat.id}
                              onClick={() => isEligible && handleSelectSeat(seat)}
                              disabled={status === 'booked' || (status === 'locked' && selectedSeatId !== seat.id) || !isEligible || actionLoading}
                              className={`
                                w-11 h-11 rounded-lg text-xs font-bold flex flex-col items-center justify-center transition-all border relative
                                ${status === 'available' && isEligible && 'bg-slate-900/60 border-slate-700 text-sky-400 hover:border-sky-400 hover:bg-sky-500/10 hover:shadow-[0_0_12px_rgba(56,189,248,0.2)]'}
                                ${status === 'selected' && 'bg-indigo-600 border-indigo-400 text-white animate-pulse-ring ring-2 ring-indigo-500/40'}
                                ${status === 'locked' && 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 cursor-not-allowed'}
                                ${status === 'booked' && 'bg-red-500/15 border-red-500/30 text-red-500 cursor-not-allowed'}
                                {!isEligible && 'opacity-20 border-slate-800 text-slate-600 cursor-not-allowed bg-slate-950'}
                              `}
                              title={`${seat.id} - ${seat.kategori.toUpperCase()}`}
                            >
                              {status === 'booked' ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <span>{seat.seat_number}</span>
                              )}
                            </button>
                          );
                        })}
                    </div>
                    <span className="w-8 text-left text-xs font-bold text-slate-500 ml-2">{rowName}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-slate-800 my-6"></div>

            {/* 2. Business Section */}
            <div className="space-y-3 min-w-[320px]">
              <div className="text-center">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full">Kategori Bisnis</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                {businessRows.map((rowName) => {
                  const rowSeats = seats.filter((s) => s.row_name === rowName);
                  const isAisleStyle = rowName === 'B1' || rowName === 'B2'; // 7 seats
                  
                  return (
                    <div key={rowName} className="flex items-center gap-2">
                      <span className="w-8 text-right text-xs font-bold text-slate-500 mr-2">{rowName}</span>
                      <div className="flex gap-2">
                        {rowSeats.map((seat, index) => {
                          const status = getSeatStatus(seat.id);
                          const isEligible = participant.kategori === 'bisnis';
                          
                          // Render aisle in the middle (e.g. after index 3 or 4)
                          const hasAisle = isAisleStyle ? index === 3 || index === 4 : index === 3;
                          
                          return (
                            <React.Fragment key={seat.id}>
                              {hasAisle && index === (isAisleStyle ? 3 : 3) && <div className="w-4"></div>}
                              <button
                                onClick={() => isEligible && handleSelectSeat(seat)}
                                disabled={status === 'booked' || (status === 'locked' && selectedSeatId !== seat.id) || !isEligible || actionLoading}
                                className={`
                                  w-10 h-10 rounded-lg text-xs font-bold flex flex-col items-center justify-center transition-all border relative
                                  ${status === 'available' && isEligible && 'bg-slate-900/60 border-slate-700 text-indigo-400 hover:border-indigo-400 hover:bg-indigo-500/10 hover:shadow-[0_0_12px_rgba(99,102,241,0.2)]'}
                                  ${status === 'selected' && 'bg-indigo-600 border-indigo-400 text-white animate-pulse-ring ring-2 ring-indigo-500/40'}
                                  ${status === 'locked' && 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 cursor-not-allowed'}
                                  ${status === 'booked' && 'bg-red-500/15 border-red-500/30 text-red-500 cursor-not-allowed'}
                                  {!isEligible && 'opacity-20 border-slate-800 text-slate-600 cursor-not-allowed bg-slate-950'}
                                `}
                                title={`${seat.id} - ${seat.kategori.toUpperCase()}`}
                              >
                                {status === 'booked' ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : (
                                  <span>{seat.seat_number}</span>
                                )}
                              </button>
                            </React.Fragment>
                          );
                        })}
                      </div>
                      <span className="w-8 text-left text-xs font-bold text-slate-500 ml-2">{rowName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Legend & Summary */}
        <div className="w-full lg:w-80 space-y-6">
          {/* Status Legends */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-4">Legenda Status</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-slate-900 border border-slate-700"></div>
                <span className="text-slate-300">Tersedia</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-indigo-600 border border-indigo-400"></div>
                <span className="text-slate-300">Pilihan Anda</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-500/10 border border-yellow-500/30"></div>
                <span className="text-slate-300">Sedang Dikunci</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/40"></div>
                <span className="text-slate-300">Sudah Terisi</span>
              </div>
            </div>
          </div>

          {/* Confirm panel */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col gap-4 relative overflow-hidden">
            {/* Gradient border */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 to-indigo-600"></div>

            <h3 className="text-sm font-bold text-white">Ringkasan Check-in</h3>
            
            <div className="space-y-3 py-2 border-y border-slate-800 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Nama</span>
                <span className="font-semibold text-white">{participant.nama}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kategori Kelas</span>
                <span className="font-semibold text-sky-400 uppercase">{participant.kategori}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kursi Dipilih</span>
                <span className="font-bold text-white bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                  {selectedSeatId || 'Belum memilih'}
                </span>
              </div>
            </div>

            {selectedSeatId ? (
              <button
                onClick={handleConfirmBooking}
                disabled={actionLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50"
              >
                {actionLoading ? 'Menyimpan...' : 'Konfirmasi Check-in'}
              </button>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-xs">
                <AlertTriangle className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Pilihlah salah satu kursi yang tersedia sesuai kelas Anda untuk mengonfirmasi check-in.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

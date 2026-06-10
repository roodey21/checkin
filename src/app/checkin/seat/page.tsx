'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCheckIn } from '@/context/CheckInContext';
import { supabase } from '@/lib/supabase';
import {
  lockSeatAction,
  unlockSeatAction,
  confirmBookingAction,
  getSeatsStatusAction
} from '@/app/actions/booking';
import { Plane, AlertTriangle, Clock, Check, ShieldAlert, LogOut, ArrowLeft, Users, Move } from 'lucide-react';

interface Seat {
  id: string;
  kategori: 'eksekutif' | 'bisnis';
  row_name: string;
  table_name: string;
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
  const hasAutoFocusedRef = useRef(false);

  // Scroll and Drag state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.clientX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.clientX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

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

  // Auto-scroll to selected table on mount
  useEffect(() => {
    if (selectedSeatId && seats.length > 0 && !hasAutoFocusedRef.current && scrollContainerRef.current) {
      const activeSeat = seats.find(s => s.id === selectedSeatId);
      if (activeSeat) {
        hasAutoFocusedRef.current = true;
        setTimeout(() => {
          const tableEl = document.getElementById(`table-${activeSeat.table_name}`);
          if (tableEl) {
            tableEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        }, 300);
      }
    }
  }, [selectedSeatId, seats]);

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

  // Parse layout dynamically from loaded seats database
  // Group tables by row
  const rowsAndTables = useMemo(() => {
    const groupedRows: {
      row_name: string;
      kategori: 'eksekutif' | 'bisnis';
      tables: Array<{
        table_name: string;
        total_seats: number;
        occupied_seats: number;
        seat_list: Seat[];
      }>;
    }[] = [];

    const rowNames = Array.from(new Set(seats.map(s => s.row_name)));

    rowNames.forEach(rowName => {
      const rowSeats = seats.filter(s => s.row_name === rowName);
      const kategori = rowSeats[0]?.kategori || 'bisnis';
      const tableNames = Array.from(new Set(rowSeats.map(s => s.table_name)));

      const tables = tableNames.map(tableName => {
        const tableSeats = rowSeats.filter(s => s.table_name === tableName);

        let occupied = 0;
        tableSeats.forEach(seat => {
          const isBooked = bookings.some(b => b.seat_id === seat.id);
          const lock = locks.find(l => l.seat_id === seat.id);
          const isLockedByOther = lock && lock.participant_id !== participant?.id;
          if (isBooked || isLockedByOther) {
            occupied++;
          }
        });

        const sortedSeats = [...tableSeats].sort((a, b) => a.seat_number - b.seat_number);

        return {
          table_name: tableName,
          total_seats: sortedSeats.length,
          occupied_seats: occupied,
          seat_list: sortedSeats
        };
      });

      groupedRows.push({
        row_name: rowName,
        kategori,
        tables
      });
    });

    return groupedRows;
  }, [seats, bookings, locks, participant]);

  const getSeatStatus = (seatId: string) => {
    const isBooked = bookings.some((b) => b.seat_id === seatId);
    if (isBooked) return 'booked';

    const lock = locks.find((l) => l.seat_id === seatId);
    if (lock) {
      return lock.participant_id === participant?.id ? 'selected' : 'locked';
    }

    return 'available';
  };

  if (sessionLoading || !participant || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Clock className="w-8 h-8 text-orange-500 animate-spin" />
        <span className="text-slate-400 text-sm">Menyiapkan seat map...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 flex flex-col items-center justify-start max-w-6xl mx-auto">
      {/* Banner Event */}
      <div className="w-full mb-6 overflow-hidden rounded-3xl border border-slate-200 shadow-md">
        <img
          src="/banner-event.png"
          alt="PTPN Finance & Risk Leaders Forum 2026 Banner"
          className="w-full h-auto object-cover block"
        />
      </div>

      {/* Header */}
      <div className="w-full flex flex-col md:flex-row justify-between items-center mb-8 gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-500/10 rounded-xl border border-orange-500/20">
            <Plane className="w-6 h-6 text-orange-500 rotate-45" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Pilih Tempat Duduk</h1>
            <p className="text-xs text-slate-600">Selamat datang, <span className="text-orange-600 font-extrabold">{participant.nama}</span> (<span className="font-bold">{participant.kategori.toUpperCase()}</span>)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Lock Timer */}
          {timeLeft !== null && selectedSeatId && (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-250 rounded-xl text-yellow-700 text-sm font-semibold animate-pulse">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span>Sisa Waktu Kunci: {formatTime(timeLeft)}</span>
            </div>
          )}

          <button
            onClick={() => {
              if (selectedSeatId) unlockSeatAction(participant.id);
              logout();
            }}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-650 hover:text-red-550 hover:border-red-500/20 hover:bg-red-50 rounded-xl text-sm transition-all shadow-sm font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="w-full flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-800 mb-6 max-w-4xl shadow-sm animate-fade-in">
          <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
          <p className="flex-1 font-medium">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-400 hover:text-red-850 font-bold">Tutup</button>
        </div>
      )}

      {/* Main Grid split */}
      <div className="w-full flex flex-col lg:flex-row gap-8 items-start justify-center">

        {/* Left Column: Seating Chart Ballroom */}
        <div className="flex-1 w-full glass-card p-6 rounded-3xl border border-slate-200 bg-white/70 shadow-xl flex flex-col items-center relative min-h-[460px] overflow-hidden">

          {/* Swipe / Pan Instruction Hint */}
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-6 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full shrink-0">
            <Move className="w-3.5 h-3.5 text-slate-400" />
            <span>Geser denah untuk melihat seluruh area ballroom</span>
          </div>

          <div
            ref={scrollContainerRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className="w-full overflow-x-auto pb-4 cursor-grab active:cursor-grabbing select-none"
          >
            <div className="min-w-[640px] flex flex-col items-center p-2">
              {/* Stage representation */}
              <div className="w-full max-w-md bg-slate-105 border border-slate-200/80 text-center py-4 rounded-xl mb-12 shadow-sm relative shrink-0">
                <span className="text-xs font-bold text-slate-700 tracking-[0.3em] uppercase">STAGE / PANGGUNG UTAMA</span>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-orange-500"></div>
              </div>

              {/* Rows and tables layout */}
              <div className="w-full space-y-12">
                {rowsAndTables.map((row) => (
                  <div key={row.row_name} className="space-y-6">
                    <div className="text-center">
                      <span className={`text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border
                        ${row.kategori === 'eksekutif' ? 'bg-orange-50 border-orange-200 text-orange-650' : 'bg-indigo-50 border border-indigo-200 text-indigo-650'}
                      `}>
                        {row.row_name} - Kelas {row.kategori.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex justify-center gap-4">
                      {/* Left Entrance Box */}
                      {row.row_name.toUpperCase() === 'BARIS 2' && (
                        <div className="w-8 h-[145px] border-2 border-dashed border-slate-250 rounded-xl bg-slate-50/60 flex items-center justify-center shadow-inner shrink-0">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest [writing-mode:vertical-lr] rotate-180">
                            Pintu Masuk
                          </span>
                        </div>
                      )}

                      {row.tables.map((table) => {
                        const isEligible = participant.kategori === row.kategori;

                        return (
                          <div
                            key={table.table_name}
                            id={`table-${table.table_name}`}
                            className={`relative w-[120px] h-[145px] flex items-center justify-center transition-opacity shrink-0
                              ${isEligible ? 'opacity-100' : 'opacity-40'}
                            `}
                          >
                            {/* The Center Round Table */}
                            <div className="w-[76px] h-[76px] rounded-full bg-white border-2 border-orange-500 shadow-sm flex flex-col items-center justify-center z-10 select-none">
                              <span className="text-[10px] font-black text-slate-800 uppercase tracking-wide">{table.table_name}</span>
                              <span className="text-[9px] text-slate-500 font-bold font-mono">
                                {table.occupied_seats}/{table.total_seats}
                              </span>
                            </div>

                            {/* Radial Seats */}
                            {table.seat_list.map((seat, index) => {
                              const status = getSeatStatus(seat.id);
                              const seatCount = table.total_seats;
                              const radius = seatCount <= 6 ? 56 : seatCount <= 8 ? 60 : 64;
                              const angleStart = seatCount <= 6 ? 155 : seatCount <= 8 ? 160 : 165;
                              const angleEnd = seatCount <= 6 ? 25 : seatCount <= 8 ? 20 : 15;
                              const angleRange = angleStart - angleEnd;
                              const angleDeg = seatCount > 1 ? angleStart - (angleRange * index) / (seatCount - 1) : 90;
                              const angleRad = (angleDeg * Math.PI) / 180;
                              const x = Math.cos(angleRad) * radius;
                              const y = Math.sin(angleRad) * radius;

                              const isChairEligible = isEligible;
                              const isSeatClickable = isChairEligible && status === 'available' && !actionLoading;

                              // Chair size based on seat count
                              const size = seatCount <= 6 ? 22 : seatCount <= 8 ? 19 : 17;

                              return (
                                <button
                                  key={seat.id}
                                  onClick={() => isSeatClickable && handleSelectSeat(seat)}
                                  disabled={!isSeatClickable && status !== 'selected'}
                                  style={{
                                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                                    left: '50%',
                                    top: '50%',
                                    position: 'absolute',
                                    width: `${size}px`,
                                    height: `${size}px`,
                                  }}
                                  className={`
                                    rounded-full text-[9px] font-extrabold flex items-center justify-center transition-all z-20 shadow-sm
                                    ${status === 'available' && isChairEligible && 'bg-white border border-slate-300 text-slate-850 hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600 hover:scale-105'}
                                    ${status === 'available' && !isChairEligible && 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'}
                                    ${status === 'selected' && 'bg-blue-600 border border-blue-400 text-white animate-pulse-ring ring-1 ring-blue-500/30'}
                                    ${status === 'locked' && 'bg-amber-500 border border-amber-600 text-white cursor-not-allowed'}
                                    ${status === 'booked' && 'bg-red-600 border border-red-700 text-white cursor-not-allowed'}
                                  `}
                                  title={`${seat.row_name} - ${seat.table_name} - Kursi ${seat.seat_number}`}
                                >
                                  <span>{seat.seat_number}</span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}

                      {/* Right Entrance Box Spacer to keep tables centered */}
                      {row.row_name.toUpperCase() === 'BARIS 2' && (
                        <div className="w-8 h-[145px] shrink-0 pointer-events-none" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Legends & Actions */}
        <div className="w-full lg:w-80 space-y-6">
          {/* Status Legends */}
          <div className="glass-card p-5 rounded-2xl border border-slate-200 bg-white/70 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Informasi Status</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-white border border-slate-300"></div>
                <span className="text-slate-700 font-semibold">Tersedia</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-600 border border-blue-400"></div>
                <span className="text-slate-700 font-semibold">Pilihan Anda</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-500 border border-amber-600"></div>
                <span className="text-slate-700 font-semibold">Sedang Dikunci</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-600 border border-red-700"></div>
                <span className="text-slate-700 font-semibold">Sudah Terisi</span>
              </div>
            </div>
          </div>

          {/* Confirm panel */}
          <div className="glass-card p-6 rounded-2xl border border-slate-200 bg-white/70 shadow-sm flex flex-col gap-4 relative overflow-hidden">
            {/* Gradient border */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-500"></div>

            <h3 className="text-sm font-bold text-slate-900">Ringkasan Check-in</h3>

            <div className="space-y-3 py-2 border-y border-slate-100 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama</span>
                <span className="font-bold text-slate-900">{participant.nama}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kategori Kelas</span>
                <span className="font-extrabold text-orange-600 uppercase">{participant.kategori}</span>
              </div>
              <div className="flex justify-between flex-wrap gap-2">
                <span className="text-slate-500">Kursi Dipilih</span>
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  {selectedSeatId ? (
                    (() => {
                      const matched = seats.find(s => s.id === selectedSeatId);
                      return matched ? `${matched.table_name} - Kursi ${matched.seat_number}` : selectedSeatId;
                    })()
                  ) : (
                    'Belum memilih'
                  )}
                </span>
              </div>
            </div>

            {selectedSeatId ? (
              <button
                onClick={handleConfirmBooking}
                disabled={actionLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50 text-xs"
              >
                {actionLoading ? 'Menyimpan...' : 'Konfirmasi Check-in'}
              </button>
            ) : (
              <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-650 text-xs shadow-inner">
                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <span>Pilihlah salah satu meja di ballroom, kemudian tentukan kursi kosong Anda untuk mengonfirmasi check-in.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSeatsStatusAction } from '@/app/actions/booking';
import {
  getParticipantsListAction,
  checkAdminSessionAction,
  adminLogoutAction
} from '@/app/actions/admin';
import {
  Loader2,
  Printer,
  ArrowLeft,
  LogOut,
  Info,
  Check,
  RefreshCw
} from 'lucide-react';

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

interface ParticipantDisplay {
  id: string;
  nama: string;
  email: string;
  no_wa: string;
  kategori: string;
  booking_code: string | null;
  checkedIn: boolean;
  seatId: string | null;
}

export default function AdminSeatsPrintPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [locks, setLocks] = useState<Lock[]>([]);
  const [participants, setParticipants] = useState<ParticipantDisplay[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [seatsRes, participantsRes] = await Promise.all([
        getSeatsStatusAction(),
        getParticipantsListAction()
      ]);

      if (seatsRes.success && seatsRes.seats) {
        setSeats(seatsRes.seats as Seat[]);
        setBookings(seatsRes.bookings || []);
        setLocks(seatsRes.locks || []);
      } else {
        setError(seatsRes.error || 'Gagal mengambil data kursi.');
      }

      if (participantsRes.success && participantsRes.participants) {
        setParticipants(participantsRes.participants);
      } else {
        setError(participantsRes.error || 'Gagal mengambil data peserta.');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan koneksi server.');
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await checkAdminSessionAction();
      if (!isAuth) {
        router.push('/admin');
        return;
      }
      await fetchData();
      setLoading(false);
    };
    checkAuth();
  }, [router]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await adminLogoutAction();
    router.push('/admin');
  };

  const handlePrint = () => {
    window.print();
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
          if (isBooked) {
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
  }, [seats, bookings]);

  // Map seat id to occupant name / details
  const getSeatStatus = (seatId: string) => {
    const isBooked = bookings.some((b) => b.seat_id === seatId);
    if (isBooked) return 'booked';

    const lock = locks.find((l) => l.seat_id === seatId);
    if (lock) return 'locked';

    return 'available';
  };

  const getSeatOccupant = (seatId: string) => {
    const booking = bookings.find((b) => b.seat_id === seatId);
    if (booking) {
      const p = participants.find((part) => part.id === booking.participant_id);
      return p ? p.nama : 'Sudah Dipesan';
    }

    const lock = locks.find((l) => l.seat_id === seatId);
    if (lock) {
      const p = participants.find((part) => part.id === lock.participant_id);
      return p ? `${p.nama} (Memilih...)` : 'Sedang Dikunci';
    }

    return null;
  };

  // Participant list sorted by seating code
  const bookedParticipants = useMemo(() => {
    return participants
      .filter((p) => p.checkedIn && p.seatId)
      .map((p) => {
        const seat = seats.find((s) => s.id === p.seatId);
        return {
          participant: p,
          seat: seat
        };
      })
      .filter((item) => item.seat !== undefined)
      .sort((a, b) => {
        const seatA = a.seat!;
        const seatB = b.seat!;

        // Sort by kategori (executive first)
        if (seatA.kategori !== seatB.kategori) {
          return seatA.kategori === 'eksekutif' ? -1 : 1;
        }

        // Sort by row name
        const rowCompare = seatA.row_name.localeCompare(seatB.row_name, undefined, { numeric: true });
        if (rowCompare !== 0) return rowCompare;

        // Sort by table name
        const tableCompare = seatA.table_name.localeCompare(seatB.table_name, undefined, { numeric: true });
        if (tableCompare !== 0) return tableCompare;

        // Sort by seat number
        return seatA.seat_number - seatB.seat_number;
      });
  }, [participants, seats]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <span className="text-slate-600 text-sm font-semibold">Memuat susunan layout...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 max-w-7xl mx-auto flex flex-col gap-6 print:p-0 print:bg-white print:max-w-full">
      
      {/* CSS overrides for standard printing formatting */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-area {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
          .print-break-before {
            page-break-before: always !important;
            break-before: page !important;
          }
          .print-force-colors {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Header (hidden on print) */}
      <div className="no-print flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Portal Admin</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Print Preview Susunan Kursi</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-orange-500' : 'text-slate-500'}`} />
            <span>Segarkan</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-red-500/20 hover:text-red-500 text-slate-650 font-semibold rounded-xl text-sm transition-all shadow-sm"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>Keluar Portal</span>
          </button>
        </div>
      </div>

      {/* Navigation tabs (hidden on print) */}
      <div className="no-print flex flex-wrap gap-3">
        <Link
          href="/admin/participants"
          className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
        >
          Daftar Peserta
        </Link>
        <Link
          href="/admin/participants/add"
          className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
        >
          Tambah Peserta Manual
        </Link>
        <Link
          href="/admin/seats"
          className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
        >
          Kelola Kursi
        </Link>
        <Link
          href="/admin/seats/print"
          className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-900 text-white text-sm font-semibold shadow-sm"
        >
          Print Denah Kursi
        </Link>
      </div>

      {/* Action panel (hidden on print) */}
      <div className="no-print bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-start gap-3 text-slate-600 max-w-2xl">
          <Info className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-slate-900">Panduan Cetak Halaman</p>
            <p>Klik tombol <strong>Cetak Denah & Daftar</strong> di samping untuk mencetak susunan layout meja serta list data peserta. Halaman ini sudah dioptimalkan agar susunan ballroom berada di halaman pertama, dan daftar peserta dicetak di halaman berikutnya.</p>
          </div>
        </div>
        
        <button
          onClick={handlePrint}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-extrabold rounded-xl text-sm transition-all shadow-lg hover:shadow-orange-500/20"
        >
          <Printer className="w-5 h-5" />
          <span>Cetak Denah & Daftar</span>
        </button>
      </div>

      {/* PRINT AREA CONTAINER */}
      <div className="print-area bg-white border border-slate-200 rounded-3xl p-8 shadow-xl flex flex-col items-center gap-8 print:p-0 print:border-none print:shadow-none">
        
        {/* PAGE 1: BALLROOM LAYOUT */}
        <div className="w-full flex flex-col items-center select-none print-force-colors">
          
          {/* Print Event Header */}
          <div className="w-full text-center border-b-2 border-slate-200 pb-4 mb-6">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block">Danantara Indonesia & Perkebunan Nusantara</span>
            <h2 className="text-xl font-black text-slate-900 mt-1 uppercase">PTPN Finance & Risk Leaders Forum 2026</h2>
            <p className="text-xs text-slate-600 mt-0.5">Denah Tata Letak Meja & Kursi Ballroom</p>
          </div>

          {/* Interactive Legends (Only visible on web, clean style on print) */}
          <div className="w-full flex justify-center gap-6 mb-8 text-xs font-semibold flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-white border border-slate-300"></div>
              <span className="text-slate-700">Tersedia</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-amber-600"></div>
              <span className="text-slate-700 font-semibold">Sedang Dipilih (Lock)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-red-600 border border-red-700"></div>
              <span className="text-slate-700 font-semibold">Sudah Terisi (Booked)</span>
            </div>
          </div>

          {/* Stage / Panggung Utama */}
          <div className="w-full max-w-md bg-slate-100 border border-slate-350 text-center py-3.5 rounded-xl mb-10 shadow-sm relative shrink-0">
            <span className="text-xs font-extrabold text-slate-700 tracking-[0.3em] uppercase">STAGE / PANGGUNG UTAMA</span>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-orange-500"></div>
          </div>

          {/* Layout Container */}
          <div className="w-full flex flex-col items-center gap-10">
            {rowsAndTables.length === 0 ? (
              <p className="text-sm text-slate-450 italic py-12">Belum ada layout meja terkonfigurasi di database.</p>
            ) : (
              rowsAndTables.map((row) => (
                <div key={row.row_name} className="w-full space-y-4">
                  <div className="text-center">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border print-force-colors
                      ${row.kategori === 'eksekutif' ? 'bg-orange-50 border-orange-200 text-orange-750' : 'bg-indigo-50 border border-indigo-200 text-indigo-750'}
                    `}>
                      {row.row_name} - Kelas {row.kategori.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex justify-center gap-4 flex-wrap">
                    {/* Left Entrance Box */}
                    {row.row_name.toUpperCase() === 'BARIS 2' && (
                      <div className="w-8 h-[145px] border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest [writing-mode:vertical-lr] rotate-180">
                          Pintu Masuk
                        </span>
                      </div>
                    )}

                    {row.tables.map((table) => (
                      <div
                        key={table.table_name}
                        className="relative w-[120px] h-[145px] flex items-center justify-center shrink-0"
                      >
                        {/* Center Table Circle */}
                        <div className="w-[76px] h-[76px] rounded-full bg-white border-2 border-orange-500 shadow-sm flex flex-col items-center justify-center z-10">
                          <span className="text-[10px] font-black text-slate-800 uppercase tracking-wide">{table.table_name}</span>
                          <span className="text-[9px] text-slate-500 font-bold font-mono">
                            {table.occupied_seats}/{table.total_seats}
                          </span>
                        </div>

                        {/* Radial Seats */}
                        {table.seat_list.map((seat, index) => {
                          const status = getSeatStatus(seat.id);
                          const occupant = getSeatOccupant(seat.id);
                          const seatCount = table.total_seats;
                          const radius = seatCount <= 6 ? 56 : seatCount <= 8 ? 60 : 64;
                          const angleStart = seatCount <= 6 ? 155 : seatCount <= 8 ? 160 : 165;
                          const angleEnd = seatCount <= 6 ? 25 : seatCount <= 8 ? 20 : 15;
                          const angleRange = angleStart - angleEnd;
                          const angleDeg = seatCount > 1 ? angleStart - (angleRange * index) / (seatCount - 1) : 90;
                          const angleRad = (angleDeg * Math.PI) / 180;
                          const x = Math.cos(angleRad) * radius;
                          const y = Math.sin(angleRad) * radius;

                          // Size
                          const size = seatCount <= 6 ? 22 : seatCount <= 8 ? 19 : 17;

                          return (
                            <div
                              key={seat.id}
                              style={{
                                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                                left: '50%',
                                top: '50%',
                                position: 'absolute',
                                width: `${size}px`,
                                height: `${size}px`,
                              }}
                              className={`
                                rounded-full text-[9px] font-black flex items-center justify-center z-20 shadow-sm border print-force-colors transition-all cursor-help
                                ${status === 'available' && 'bg-white border-slate-350 text-slate-800'}
                                ${status === 'locked' && 'bg-amber-500 border-amber-600 text-white'}
                                ${status === 'booked' && 'bg-red-650 border-red-850 text-white'}
                              `}
                              title={occupant || `${seat.row_name} - ${seat.table_name} - Kursi ${seat.seat_number} (Tersedia)`}
                            >
                              {status === 'booked' ? (
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              ) : (
                                <span>{seat.seat_number}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}

                    {/* Right Entrance Box Spacer */}
                    {row.row_name.toUpperCase() === 'BARIS 2' && (
                      <div className="w-8 h-[145px] shrink-0 pointer-events-none" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PAGE 2: PARTICIPANT LIST */}
        <div className="w-full flex flex-col print-break-before print-force-colors pt-8 border-t border-slate-200 print:border-none print:pt-0">
          
          <div className="w-full text-center pb-4 mb-6 border-b border-slate-200">
            <h3 className="text-md font-extrabold text-slate-900 uppercase tracking-wider">Daftar Reservasi & Tempat Duduk Peserta</h3>
            <p className="text-xs text-slate-500 mt-0.5">Total Hadir / Check-In: <span className="font-bold text-orange-600">{bookedParticipants.length}</span> / {participants.length} Peserta</p>
          </div>

          {bookedParticipants.length === 0 ? (
            <p className="text-center text-xs text-slate-450 italic py-8">Belum ada peserta yang melakukan check-in tempat duduk.</p>
          ) : (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-2 gap-x-8 gap-y-2.5">
              {bookedParticipants.map(({ participant: p, seat }) => (
                <div 
                  key={p.id} 
                  className="py-1.5 px-3 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 print:bg-transparent rounded-lg print:rounded-none"
                >
                  <span className="font-mono text-xs font-bold text-orange-650 shrink-0 uppercase">
                    [{seat!.table_name} - S{seat!.seat_number}]
                  </span>
                  <span className="text-slate-800 text-sm font-semibold truncate max-w-[200px] uppercase text-right">
                    {p.nama}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

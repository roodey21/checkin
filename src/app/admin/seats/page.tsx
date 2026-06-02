'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  checkAdminSessionAction,
  adminLogoutAction,
  createSeatAction,
  deleteSeatAction,
  getSeatsListAction
} from '@/app/actions/admin';
import { LogOut, Loader2, AlertCircle, Plus, Trash2, Route, Users, Crown, LayoutGrid, X, AlertTriangle } from 'lucide-react';

interface SeatRecord {
  id: string;
  kategori: 'eksekutif' | 'bisnis';
  row_name: string;
  seat_number: number;
  created_at?: string;
}

export default function AdminSeatsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [seats, setSeats] = useState<SeatRecord[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [category, setCategory] = useState<'eksekutif' | 'bisnis'>('bisnis');
  const [rowName, setRowName] = useState('B9');
  const [seatNumber, setSeatNumber] = useState('1');
  const [deleteTarget, setDeleteTarget] = useState<SeatRecord | null>(null);
  const [showAddSeatModal, setShowAddSeatModal] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await checkAdminSessionAction();
      if (!isAuth) {
        router.push('/admin');
        return;
      }

      await fetchSeats();
    };

    checkAuth();
  }, [router]);

  const fetchSeats = async () => {
    setError(null);
    try {
      const res = await getSeatsListAction();
      if (res.success && res.seats) {
        setSeats(res.seats as SeatRecord[]);
      } else {
        setError(res.error || 'Gagal mengambil daftar kursi.');
      }
    } catch (err) {
      console.error(err);
      setError('Kesalahan koneksi ke server.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await adminLogoutAction();
    router.push('/admin');
  };

  const handleAddSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('add');
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await createSeatAction({
        kategori: category,
        row_name: rowName,
        seat_number: Number(seatNumber),
      });

      if (res.success) {
        setSuccessMsg(`Kursi ${rowName}-${seatNumber} berhasil ditambahkan.`);
        setShowAddSeatModal(false);
        await fetchSeats();
      } else {
        setError(res.error || 'Gagal menambah kursi.');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan server.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteSeat = async () => {
    if (!deleteTarget) return;

    const seatId = deleteTarget.id;
    setActionLoading(seatId);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await deleteSeatAction(seatId);
      if (res.success) {
        setSuccessMsg(`Kursi ${seatId} berhasil dihapus.`);
        await fetchSeats();
      } else {
        setError(res.error || 'Gagal menghapus kursi.');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan server.');
    } finally {
      setActionLoading(null);
      setDeleteTarget(null);
    }
  };

  const groupedSeats = useMemo(() => {
    return {
      eksekutif: seats.filter((seat) => seat.kategori === 'eksekutif'),
      bisnis: seats.filter((seat) => seat.kategori === 'bisnis'),
    };
  }, [seats]);

  const previewRows = useMemo(() => {
    return {
      eksekutif: ['E1', 'E2', 'E3', 'E4'],
      bisnis: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'],
    };
  }, []);

  const getPreviewSeatTone = (kategori: 'eksekutif' | 'bisnis') =>
    kategori === 'eksekutif'
      ? 'border-sky-200 bg-sky-50 text-sky-700'
      : 'border-indigo-200 bg-indigo-50 text-indigo-700';

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
        <span className="text-slate-600 text-sm">Memuat daftar kursi...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Portal Admin</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Kelola List Kursi</h1>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-red-500/20 hover:text-red-500 text-slate-600 font-semibold rounded-xl text-sm transition-all shadow-sm"
        >
          <LogOut className="w-4.5 h-4.5" />
          <span>Keluar Portal</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/participants"
          className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
        >
          Daftar Peserta
        </Link>
        <Link
          href="/admin/seats"
          className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-900 text-white text-sm font-semibold shadow-sm"
        >
          Kelola Kursi
        </Link>
        <button
          onClick={() => setShowAddSeatModal(true)}
          className="px-4 py-2 rounded-xl border border-sky-200 bg-sky-600 text-white text-sm font-semibold shadow-sm hover:bg-sky-500 transition-all inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah Kursi
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/25 rounded-2xl text-sm text-red-700">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-slate-500 font-bold hover:text-slate-900">Tutup</button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-sm text-emerald-700">
          <Crown className="w-5 h-5 text-emerald-500 shrink-0" />
          <p className="flex-1">{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)} className="text-xs text-slate-500 font-bold hover:text-slate-900">Tutup</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[460px_1fr] gap-6 items-start">
        <div className="glass-card p-7 rounded-3xl border border-slate-200 shadow-xl space-y-5 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <LayoutGrid className="w-4.5 h-4.5 text-sky-500" />
              <h3 className="text-sm font-bold text-slate-900">Preview Susunan Kursi</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">Preview mengikuti data kursi yang tersimpan, disusun vertikal per kategori.</p>

            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-slate-900">Eksekutif</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 bg-sky-100 px-2.5 py-1 rounded-full">
                    {groupedSeats.eksekutif.length} kursi
                  </span>
                </div>
                <div className="space-y-2 overflow-x-auto pb-1">
                  {previewRows.eksekutif.map((rowName) => {
                    const rowSeats = groupedSeats.eksekutif.filter((seat) => seat.row_name === rowName);
                    return (
                      <div key={rowName} className="flex items-center gap-2 min-w-max">
                        <span className="w-8 text-right text-xs font-bold text-slate-500">{rowName}</span>
                        <div className="flex gap-1.5">
                          {rowSeats.length > 0 ? (
                            rowSeats.map((seat) => (
                              <div
                                key={seat.id}
                                className={`w-7 h-7 rounded-md border text-[10px] font-bold flex items-center justify-center ${getPreviewSeatTone('eksekutif')}`}
                                title={seat.id}
                              >
                                {seat.seat_number}
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">Belum ada kursi</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-slate-900">Bisnis</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-full">
                    {groupedSeats.bisnis.length} kursi
                  </span>
                </div>
                <div className="space-y-2 overflow-x-auto pb-1">
                  {previewRows.bisnis.map((rowName) => {
                    const rowSeats = groupedSeats.bisnis.filter((seat) => seat.row_name === rowName);
                    return (
                      <div key={rowName} className="flex items-center gap-2 min-w-max">
                        <span className="w-8 text-right text-xs font-bold text-slate-500">{rowName}</span>
                        <div className="flex gap-1.5">
                          {rowSeats.length > 0 ? (
                            rowSeats.map((seat) => (
                              <div
                                key={seat.id}
                                className={`w-7 h-7 rounded-md border text-[10px] font-bold flex items-center justify-center ${getPreviewSeatTone('bisnis')}`}
                                title={seat.id}
                              >
                                {seat.seat_number}
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">Belum ada kursi</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-5 rounded-3xl border border-slate-200 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Route className="w-5 h-5 text-sky-500" />
              <h2 className="text-lg font-bold text-slate-900">Kategori Eksekutif</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Seat ID</th>
                    <th className="py-3 px-4">Baris</th>
                    <th className="py-3 px-4">Nomor</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {groupedSeats.eksekutif.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 px-4 text-center text-slate-500">Belum ada kursi eksekutif.</td>
                    </tr>
                  ) : (
                    groupedSeats.eksekutif.map((seat) => (
                      <tr key={seat.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">{seat.id}</td>
                        <td className="py-3 px-4">{seat.row_name}</td>
                        <td className="py-3 px-4">{seat.seat_number}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setDeleteTarget(seat)}
                            disabled={actionLoading === seat.id}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm disabled:opacity-50"
                          >
                            {actionLoading === seat.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                            <span>Hapus</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-card p-5 rounded-3xl border border-slate-200 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg font-bold text-slate-900">Kategori Bisnis</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Seat ID</th>
                    <th className="py-3 px-4">Baris</th>
                    <th className="py-3 px-4">Nomor</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {groupedSeats.bisnis.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 px-4 text-center text-slate-500">Belum ada kursi bisnis.</td>
                    </tr>
                  ) : (
                    groupedSeats.bisnis.map((seat) => (
                      <tr key={seat.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">{seat.id}</td>
                        <td className="py-3 px-4">{seat.row_name}</td>
                        <td className="py-3 px-4">{seat.seat_number}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setDeleteTarget(seat)}
                            disabled={actionLoading === seat.id}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm disabled:opacity-50"
                          >
                            {actionLoading === seat.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                            <span>Hapus</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showAddSeatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-start justify-between p-5 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Tambah Kursi Baru</h3>
                <p className="text-sm text-slate-600 mt-1">Tambahkan baris dan nomor kursi untuk kategori eksekutif atau bisnis.</p>
              </div>
              <button
                onClick={() => setShowAddSeatModal(false)}
                className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all"
                aria-label="Tutup modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSeat} className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as 'eksekutif' | 'bisnis')}
                  className="w-full px-4 py-3 bg-white/85 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-sm"
                >
                  <option value="bisnis">Bisnis</option>
                  <option value="eksekutif">Eksekutif</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Baris</label>
                <input
                  type="text"
                  value={rowName}
                  onChange={(e) => setRowName(e.target.value.toUpperCase())}
                  placeholder="Contoh: B9 atau E5"
                  className="w-full px-4 py-3 bg-white/85 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Nomor Kursi</label>
                <input
                  type="number"
                  min="1"
                  value={seatNumber}
                  onChange={(e) => setSeatNumber(e.target.value)}
                  className="w-full px-4 py-3 bg-white/85 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSeatModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'add'}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-sky-500/20 active:scale-[0.98] disabled:opacity-50"
                >
                  {actionLoading === 'add' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>Tambah Kursi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-start justify-between p-5 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Hapus kursi?</h3>
                  <p className="text-sm text-slate-600">Tindakan ini tidak bisa dibatalkan.</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteTarget(null)}
                className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all"
                aria-label="Tutup modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-700">
                Anda akan menghapus kursi <span className="font-bold text-slate-900">{deleteTarget.id}</span>.
                Pastikan kursi ini memang sudah tidak dipakai.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteSeat}
                  disabled={actionLoading === deleteTarget.id}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all disabled:opacity-50"
                >
                  {actionLoading === deleteTarget.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>Ya, hapus</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
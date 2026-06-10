'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  checkAdminSessionAction,
  adminLogoutAction,
  getSeatsListAction,
  generateSeatingLayoutAction,
  SeatingRowConfig,
  SeatingTableConfig
} from '@/app/actions/admin';
import {
  LogOut,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  LayoutGrid,
  AlertTriangle,
  Save,
  CheckCircle,
  Undo
} from 'lucide-react';

interface SeatRecord {
  id: string;
  kategori: 'eksekutif' | 'bisnis';
  row_name: string;
  table_name: string;
  seat_number: number;
}

export default function AdminSeatsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeSeats, setActiveSeats] = useState<SeatRecord[]>([]);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Layout Configuration Form States
  const [newKategori, setNewKategori] = useState<'eksekutif' | 'bisnis'>('eksekutif');
  const [newRowName, setNewRowName] = useState('Baris 1');
  const [newTablesCount, setNewTablesCount] = useState(4);
  const [defaultSeatsPerTable, setDefaultSeatsPerTable] = useState(6);

  // Current config draft
  const [layoutConfig, setLayoutConfig] = useState<SeatingRowConfig[]>([
    {
      kategori: 'eksekutif',
      row_name: 'Baris 1',
      tables: [
        { table_name: 'Meja E1', seats_count: 6 },
        { table_name: 'Meja E2', seats_count: 6 },
        { table_name: 'Meja E3', seats_count: 6 },
        { table_name: 'Meja E4', seats_count: 6 }
      ]
    },
    {
      kategori: 'bisnis',
      row_name: 'Baris 2',
      tables: [
        { table_name: 'Meja B1', seats_count: 6 },
        { table_name: 'Meja B2', seats_count: 6 },
        { table_name: 'Meja B3', seats_count: 6 },
        { table_name: 'Meja B4', seats_count: 6 }
      ]
    },
    {
      kategori: 'bisnis',
      row_name: 'Baris 3',
      tables: [
        { table_name: 'Meja B5', seats_count: 6 },
        { table_name: 'Meja B6', seats_count: 6 },
        { table_name: 'Meja B7', seats_count: 6 },
        { table_name: 'Meja B8', seats_count: 6 }
      ]
    }
  ]);

  const [showConfirmResetModal, setShowConfirmResetModal] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await checkAdminSessionAction();
      if (!isAuth) {
        router.push('/admin');
        return;
      }
      await fetchActiveSeats();
    };
    checkAuth();
  }, [router]);

  const fetchActiveSeats = async () => {
    try {
      const res = await getSeatsListAction();
      if (res.success && res.seats) {
        setActiveSeats(res.seats as SeatRecord[]);
      } else {
        setError(res.error || 'Gagal mengambil data kursi aktif.');
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

  // Add a new row to configuration draft
  const handleAddRowConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRowName.trim()) {
      setError('Nama baris tidak boleh kosong.');
      return;
    }

    // Check if row name already exists in config
    if (layoutConfig.some(row => row.row_name.toLowerCase() === newRowName.trim().toLowerCase())) {
      setError(`Baris dengan nama "${newRowName}" sudah terdaftar.`);
      return;
    }

    const tables: SeatingTableConfig[] = [];
    const prefix = newKategori === 'eksekutif' ? 'E' : 'B';
    
    // Auto-generate tables based on row and count
    // e.g. for Row 1, Tables: Meja E1, Meja E2, etc.
    // Or let's name them: Meja R<RowNumber> - T<TableNumber>
    const rowClean = newRowName.replace(/\D/g, ''); // get only numbers if any
    const rowNum = rowClean || '1';

    for (let i = 1; i <= newTablesCount; i++) {
      tables.push({
        table_name: `Meja ${prefix}${rowNum}-${i}`,
        seats_count: defaultSeatsPerTable
      });
    }

    setLayoutConfig([...layoutConfig, {
      kategori: newKategori,
      row_name: newRowName.trim(),
      tables
    }]);

    setSuccessMsg(`Baris "${newRowName}" berhasil ditambahkan ke draft.`);
    
    // Increment default row name for ease of use
    const nextRowMatch = newRowName.match(/\d+/);
    if (nextRowMatch) {
      const nextNum = parseInt(nextRowMatch[0]) + 1;
      setNewRowName(newRowName.replace(/\d+/, nextNum.toString()));
    }
  };

  // Delete a row configuration from draft
  const handleDeleteRowConfig = (index: number) => {
    const updated = [...layoutConfig];
    updated.splice(index, 1);
    setLayoutConfig(updated);
  };

  // Update a specific table seats count in draft
  const handleTableSeatsChange = (rowIndex: number, tableIndex: number, seatsCount: number) => {
    const updated = [...layoutConfig];
    updated[rowIndex].tables[tableIndex].seats_count = Math.max(1, seatsCount);
    setLayoutConfig(updated);
  };

  // Update a specific table name in draft
  const handleTableNameChange = (rowIndex: number, tableIndex: number, newName: string) => {
    const updated = [...layoutConfig];
    updated[rowIndex].tables[tableIndex].table_name = newName;
    setLayoutConfig(updated);
  };

  // Submit and Save configuration to Database
  const handleSaveLayout = async () => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await generateSeatingLayoutAction(layoutConfig);
      if (res.success) {
        setSuccessMsg(`Berhasil memperbarui layout! Total ${res.count} kursi dibuat.`);
        setShowConfirmResetModal(false);
        await fetchActiveSeats();
      } else {
        setError(res.error || 'Gagal menyimpan layout kursi.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Terjadi kesalahan server saat menyimpan layout.');
    } finally {
      setActionLoading(false);
    }
  };

  // Aggregate stats from layout draft
  const draftStats = useMemo(() => {
    let tablesCount = 0;
    let seatsCount = 0;
    layoutConfig.forEach(row => {
      tablesCount += row.tables.length;
      row.tables.forEach(table => {
        seatsCount += table.seats_count;
      });
    });
    return { tablesCount, seatsCount };
  }, [layoutConfig]);

  // Aggregate stats from active DB seats
  const activeStats = useMemo(() => {
    const uniqueTables = new Set(activeSeats.map(s => s.table_name));
    return {
      tablesCount: uniqueTables.size,
      seatsCount: activeSeats.length
    };
  }, [activeSeats]);

  // Group active DB seats for display
  const groupedActiveSeats = useMemo(() => {
    const map = new Map<string, Map<string, SeatRecord[]>>();
    
    activeSeats.forEach(seat => {
      if (!map.has(seat.row_name)) {
        map.set(seat.row_name, new Map());
      }
      const rowMap = map.get(seat.row_name)!;
      if (!rowMap.has(seat.table_name)) {
        rowMap.set(seat.table_name, []);
      }
      rowMap.get(seat.table_name)!.push(seat);
    });

    return map;
  }, [activeSeats]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        <span className="text-slate-600 text-sm">Memuat pengaturan layout...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Portal Admin</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Pengaturan Layout Denah Acara</h1>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-red-500/20 hover:text-red-500 text-slate-600 font-semibold rounded-xl text-sm transition-all shadow-sm"
        >
          <LogOut className="w-4.5 h-4.5" />
          <span>Keluar Portal</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3">
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
          className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-900 text-white text-sm font-semibold shadow-sm"
        >
          Kelola Kursi
        </Link>
        <Link
          href="/admin/seats/print"
          className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
        >
          Print Denah Kursi
        </Link>
      </div>

      {/* Message Notifications */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-800 shadow-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="flex-1 font-medium">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-400 font-bold hover:text-red-850">Tutup</button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-250 rounded-2xl text-sm text-emerald-800 shadow-sm animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          <p className="flex-1 font-medium">{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)} className="text-xs text-emerald-400 font-bold hover:text-emerald-850">Tutup</button>
        </div>
      )}

      {/* Dashboard split */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-8 items-start">
        
        {/* Left Column: Seating Layout Draft Configurator */}
        <div className="space-y-6">
          {/* Add Row Form Card */}
          <div className="glass-card p-6 rounded-3xl border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Plus className="w-5 h-5 text-orange-500" />
              <h2 className="text-md font-bold text-slate-900">Tambah Baris & Meja Baru</h2>
            </div>
            
            <form onSubmit={handleAddRowConfig} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Kategori</label>
                <select
                  value={newKategori}
                  onChange={(e) => setNewKategori(e.target.value as 'eksekutif' | 'bisnis')}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-sm"
                >
                  <option value="eksekutif">Eksekutif</option>
                  <option value="bisnis">Bisnis</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Nama Baris</label>
                <input
                  type="text"
                  value={newRowName}
                  onChange={(e) => setNewRowName(e.target.value)}
                  placeholder="Contoh: Baris 4"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Jumlah Meja</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={newTablesCount}
                  onChange={(e) => setNewTablesCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Kursi per Meja</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={defaultSeatsPerTable}
                  onChange={(e) => setDefaultSeatsPerTable(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full sm:col-span-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition-all shadow-sm"
              >
                + Tambah Baris ke Draft
              </button>
            </form>
          </div>

          {/* Draft Visual Configurator */}
          <div className="glass-card p-6 rounded-3xl border border-slate-200 shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-orange-500" />
                <h2 className="text-md font-bold text-slate-900">Draft Layout Meja & Kursi</h2>
              </div>
              <span className="text-[10px] text-slate-500">
                Draft: <strong>{draftStats.tablesCount} Meja</strong>, <strong>{draftStats.seatsCount} Kursi</strong>
              </span>
            </div>

            {layoutConfig.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8 italic">Tidak ada baris terdaftar dalam draft. Tambahkan di atas.</p>
            ) : (
              <div className="space-y-6">
                {layoutConfig.map((row, rIdx) => (
                  <div key={rIdx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                    {/* Row Header */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-900 bg-white px-3 py-1 rounded-md border border-slate-200">
                          {row.row_name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border
                          ${row.kategori === 'eksekutif' ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-indigo-50 border border-indigo-200 text-indigo-600'}
                        `}>
                          {row.kategori}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteRowConfig(rIdx)}
                        className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Baris</span>
                      </button>
                    </div>

                    {/* Tables grid configurator */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {row.tables.map((table, tIdx) => (
                        <div key={tIdx} className="bg-white border border-slate-200 p-3 rounded-xl space-y-2.5 animate-fade-in">
                          {/* Table Name */}
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Nama Meja</span>
                            <input
                              type="text"
                              value={table.table_name}
                              onChange={(e) => handleTableNameChange(rIdx, tIdx, e.target.value)}
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-900 text-xs font-bold focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                            />
                          </div>

                          {/* Table Seats Count */}
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Jumlah Kursi</span>
                            <input
                              type="number"
                              min="1"
                              max="12"
                              value={table.seats_count}
                              onChange={(e) => handleTableSeatsChange(rIdx, tIdx, Number(e.target.value))}
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-900 text-xs font-mono font-bold focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Seating Summary & Saving trigger */}
        <div className="space-y-6">
          {/* Apply Card */}
          <div className="glass-card p-6 rounded-3xl border border-slate-200 shadow-xl space-y-4 relative overflow-hidden">
            {/* Border glow */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-500"></div>

            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Simpan Layout</h3>
            
            <div className="space-y-3 py-2 border-y border-slate-100 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Meja Baru</span>
                <span className="font-bold text-slate-900">{draftStats.tablesCount} Meja</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Kursi Baru</span>
                <span className="font-bold text-orange-600">{draftStats.seatsCount} Kursi</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-[10px] leading-relaxed shadow-sm">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <span>
                <strong>PERINGATAN:</strong> Menyimpan layout baru akan <strong>MENGHAPUS</strong> seluruh data meja/kursi aktif saat ini dan <strong>MEMBATALKAN</strong> check-in / booking semua peserta yang ada!
              </span>
            </div>

            <button
              onClick={() => setShowConfirmResetModal(true)}
              disabled={actionLoading || draftStats.seatsCount === 0}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-orange-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
            >
              <Save className="w-4 h-4" />
              <span>Terapkan Layout Baru</span>
            </button>
          </div>

          {/* Active Seating Layout Display */}
          <div className="glass-card p-6 rounded-3xl border border-slate-200 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">Layout Aktif (Database)</h3>
            
            <div className="flex gap-4 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200 justify-around text-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Total Meja</span>
                <span className="text-sm font-bold text-slate-900">{activeStats.tablesCount}</span>
              </div>
              <div className="w-px bg-slate-200"></div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Total Kursi</span>
                <span className="text-sm font-bold text-orange-600">{activeStats.seatsCount}</span>
              </div>
            </div>

            {activeSeats.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6 italic">Database kosong. Gunakan panel draf untuk membuat layout.</p>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {Array.from(groupedActiveSeats.entries()).map(([rowName, rowMap]) => (
                  <div key={rowName} className="space-y-2 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{rowName}</span>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {Array.from(rowMap.entries()).map(([tableName, seatList]) => (
                        <div key={tableName} className="bg-slate-50 p-2 rounded-lg flex justify-between items-center border border-slate-200">
                          <span className="text-xs font-semibold text-slate-700">{tableName}</span>
                          <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded text-orange-600 border border-slate-200">
                            {seatList.length} Kursi
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Confirmation Reset Warning Modal */}
      {showConfirmResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden relative p-6 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Terapkan Layout Baru?</h3>
                <p className="text-xs text-slate-500 leading-normal">
                  Tindakan ini akan mengosongkan data kursi yang lama, menghapus semua database check-in, dan membatalkan pesanan kursi dari semua peserta.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setShowConfirmResetModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-650 hover:text-slate-900 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleSaveLayout}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow"
              >
                {actionLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Ya, Hapus & Simpan Layout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
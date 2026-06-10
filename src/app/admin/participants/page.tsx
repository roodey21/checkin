'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import {
  checkAdminSessionAction,
  adminLogoutAction,
  uploadParticipantsAction,
  generateBookingCodesAction,
  sendEmailsAction,
  getParticipantsListAction,
  deleteParticipantAction
} from '@/app/actions/admin';
import {
  Users,
  CheckCircle,
  Clock,
  Search,
  Upload,
  Key,
  Mail,
  LogOut,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  Check,
  Printer,
  Trash2,
  AlertTriangle,
  X,
  Plus
} from 'lucide-react';

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

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantDisplay[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk Download States
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [activePrintParticipant, setActivePrintParticipant] = useState<ParticipantDisplay | null>(null);
  const offscreenRendererRef = useRef<HTMLDivElement>(null);

  // Participant Manual Delete State and Handler
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleDeleteParticipant = async () => {
    if (!deleteTarget) return;

    setActionLoading(deleteTarget);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await deleteParticipantAction(deleteTarget);
      if (res.success) {
        setSuccessMsg('Peserta berhasil dihapus.');
        setDeleteTarget(null);
        await fetchParticipants();
      } else {
        setError(res.error || 'Gagal menghapus peserta.');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan server.');
    } finally {
      setActionLoading(null);
    }
  };

  // Authenticate Admin Session on Mount
  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await checkAdminSessionAction();
      if (!isAuth) {
        router.push('/admin');
      } else {
        fetchParticipants();
      }
    };
    checkAuth();
  }, [router]);

  // Fetch Participant List
  const fetchParticipants = async () => {
    setError(null);
    try {
      const res = await getParticipantsListAction();
      if (res.success && res.participants) {
        setParticipants(res.participants);
      } else {
        setError(res.error || 'Gagal mengambil data peserta.');
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

  // CSV Reader
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setActionLoading('upload');
    setError(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setError('File kosong atau rusak.');
        setActionLoading(null);
        return;
      }

      try {
        const lines = text.split(/\r?\n/);
        const parsed: Array<{ nama: string; email: string; no_wa: string; kategori: string }> = [];

        // Parsing lines skipping header
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Simple CSV parser
          const parts = line.split(',');
          if (parts.length >= 2) {
            parsed.push({
              nama: parts[0]?.trim() || '',
              email: parts[1]?.trim() || '',
              no_wa: parts[2]?.trim() || '',
              kategori: parts[3]?.trim() || '',
            });
          }
        }

        if (parsed.length === 0) {
          setError('Tidak ada data valid yang ditemukan dalam CSV.');
          setActionLoading(null);
          return;
        }

        const res = await uploadParticipantsAction(parsed);
        if (res.success) {
          setSuccessMsg(`Berhasil mengunggah ${res.count} peserta dari CSV.`);
          fetchParticipants();
        } else {
          setError(res.error || 'Gagal mengunggah data.');
        }
      } catch (err: any) {
        console.error(err);
        setError('Gagal membaca file CSV. Pastikan format kolom sesuai.');
      } finally {
        setActionLoading(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  // Generate Booking Codes
  const handleGenerateCodes = async () => {
    setActionLoading('generate');
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await generateBookingCodesAction();
      if (res.success) {
        setSuccessMsg(`Berhasil men-generate ${res.count} kode booking baru.`);
        fetchParticipants();
      } else {
        setError(res.error || 'Gagal men-generate kode booking.');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan server.');
    } finally {
      setActionLoading(null);
    }
  };

  // Send Emails
  const handleSendEmails = async () => {
    setActionLoading('email');
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await sendEmailsAction();
      if (res.success) {
        let msg = `Pengiriman selesai! Berhasil: ${res.sentCount} email.`;
        if (res.failedCount && res.failedCount > 0) {
          msg += ` Gagal: ${res.failedCount} email.`;
        }
        setSuccessMsg(msg);
        if (res.errors) {
          console.error('Email errors:', res.errors);
        }
      } else {
        setError(res.error || 'Gagal mengirim email.');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan server saat mengirim email.');
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk download checked-in participants tickets in ZIP
  const handleBulkDownloadTickets = async () => {
    const checkedInParticipants = participants.filter((p) => p.checkedIn && p.seatId);
    if (checkedInParticipants.length === 0) {
      setError('Tidak ada peserta yang sudah check-in untuk diunduh tiketnya.');
      return;
    }

    setBulkDownloading(true);
    setError(null);
    setSuccessMsg(null);
    const total = checkedInParticipants.length;
    setBulkProgress({ current: 0, total });

    const zip = new JSZip();

    try {
      for (let i = 0; i < total; i++) {
        const participant = checkedInParticipants[i];
        
        // Render current participant in offscreen DOM
        setActivePrintParticipant(participant);
        setBulkProgress({ current: i + 1, total });

        // Wait for render and image loading to execute completely
        await new Promise((resolve) => setTimeout(resolve, 300));

        const element = offscreenRendererRef.current;
        if (!element) {
          throw new Error('Renderer elemen tidak ditemukan.');
        }

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const base64Data = imgData.split(',')[1];

        const cleanName = participant.nama.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        const cleanClass = participant.kategori.toUpperCase();
        const formattedSeat = formatSeatId(participant.seatId || '').replace('-', '_');
        const filename = `${cleanClass}_Seat_${formattedSeat}_${cleanName}.jpg`;

        zip.file(filename, base64Data, { base64: true });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Tiket_Boarding_Pass_Bulk_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessMsg(`Berhasil mengunduh ${total} tiket dalam bentuk ZIP.`);
    } catch (err: any) {
      console.error('Bulk download error:', err);
      setError(err.message || 'Gagal mengunduh bulk tiket.');
    } finally {
      setBulkDownloading(false);
      setActivePrintParticipant(null);
    }
  };

  // Filter participants by search term
  const filteredParticipants = participants.filter(
    (p) =>
      p.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.booking_code && p.booking_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Summary Metrics
  const totalCount = participants.length;
  const checkedInCount = participants.filter((p) => p.checkedIn).length;
  const pendingCheckIn = totalCount - checkedInCount;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        <span className="text-slate-600 text-sm">Memuat dashboard admin...</span>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen p-6 max-w-7xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Portal Admin</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Kelola Peserta & Kursi</h1>
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
          className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-900 text-white text-sm font-semibold shadow-sm"
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
          className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
        >
          Print Denah Kursi
        </Link>
      </div>

      {/* Message Notifications */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-800 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="flex-1 font-medium">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-400 font-bold hover:text-red-850">Tutup</button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-250 rounded-2xl text-sm text-emerald-800 shadow-sm">
          <Check className="w-5 h-5 text-emerald-500 shrink-0" />
          <p className="flex-1 font-medium">{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)} className="text-xs text-emerald-400 font-bold hover:text-emerald-850">Tutup</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-slate-200 flex items-center justify-between shadow">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Peserta</span>
            <p className="text-3xl font-black text-slate-900">{totalCount}</p>
          </div>
          <div className="w-12 h-12 bg-sky-500/10 rounded-xl flex items-center justify-center border border-sky-500/25">
            <Users className="w-6 h-6 text-sky-500" />
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-200 flex items-center justify-between shadow">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Sudah Check-in</span>
            <p className="text-3xl font-black text-emerald-600">{checkedInCount}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/25">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-200 flex items-center justify-between shadow">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Belum Check-in</span>
            <p className="text-3xl font-black text-amber-600">{pendingCheckIn}</p>
          </div>
          <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center border border-yellow-500/25">
            <Clock className="w-6 h-6 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Action Controls Panel */}
      <div className="glass-card p-6 rounded-3xl border border-slate-200 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          {/* CSV File Input */}
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleCSVUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={actionLoading !== null}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold rounded-xl text-sm transition-all shadow-sm"
          >
            {actionLoading === 'upload' ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin text-purple-400" />
            ) : (
              <Upload className="w-4.5 h-4.5 text-purple-400" />
            )}
            <span>Unggah CSV</span>
          </button>

          {/* Generate Codes */}
          <button
            onClick={handleGenerateCodes}
            disabled={actionLoading !== null || totalCount === 0}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold rounded-xl text-sm transition-all shadow-sm"
          >
            {actionLoading === 'generate' ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin text-sky-400" />
            ) : (
              <Key className="w-4.5 h-4.5 text-sky-400" />
            )}
            <span>Generate Kode Booking</span>
          </button>

          {/* Send Invitation Emails */}
          <button
            onClick={handleSendEmails}
            disabled={actionLoading !== null || totalCount === 0}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg hover:shadow-purple-500/20"
          >
            {actionLoading === 'email' ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
            ) : (
              <Mail className="w-4.5 h-4.5" />
            )}
            <span>Kirim Email Undangan</span>
          </button>

          {/* Cetak Bulk (.zip) */}
          <button
            onClick={handleBulkDownloadTickets}
            disabled={actionLoading !== null || bulkDownloading || participants.filter((p) => p.checkedIn && p.seatId).length === 0}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bulkDownloading ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                <span>Memproses ({bulkProgress.current}/{bulkProgress.total})</span>
              </>
            ) : (
              <>
                <Printer className="w-4.5 h-4.5" />
                <span>Cetak Bulk (.zip)</span>
              </>
            )}
          </button>
        </div>

        {/* CSV Format Note */}
        <div className="flex items-center gap-3 p-3.5 bg-slate-100 rounded-2xl border border-slate-200 max-w-sm">
          <FileSpreadsheet className="w-8 h-8 text-slate-500 shrink-0" />
          <div className="text-[10px] text-slate-500 leading-normal">
            <span className="font-bold text-slate-900 block mb-0.5">Format CSV Google Form:</span>
            nama,email,no_wa,kategori
          </div>
        </div>
      </div>

      {/* Participant List & Table */}
      <div className="glass-card rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
        {/* Search Header */}
        <div className="p-5 border-b border-slate-200 flex justify-between items-center gap-4 flex-col sm:flex-row">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider shrink-0">Daftar Peserta</h3>
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Cari nama, email atau kode booking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/85 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm transition-all shadow-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="py-4 px-6">Nama</th>
                <th className="py-4 px-6">Email</th>
                <th className="py-4 px-6">WhatsApp</th>
                <th className="py-4 px-6">Kelas</th>
                <th className="py-4 px-6 text-center">Kode Booking</th>
                <th className="py-4 px-6 text-center">Status Seat</th>
                <th className="py-4 px-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-6 text-center text-slate-500 text-sm">
                    Tidak ada data peserta ditemukan.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">{p.nama}</td>
                    <td className="py-4 px-6 text-slate-600">{p.email}</td>
                    <td className="py-4 px-6 text-slate-600 font-mono">{p.no_wa || '-'}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border
                        ${p.kategori === 'eksekutif' ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}
                      `}
                      >
                        {p.kategori}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {p.booking_code ? (
                        <span className="font-mono bg-slate-100 px-2.5 py-1 rounded border border-slate-200 text-slate-800 tracking-wider text-xs">
                          {p.booking_code}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Belum dibuat</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {p.checkedIn && p.seatId ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                          <span>Checked In</span>
                          <span className="bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded font-black font-mono text-[9px]">
                            {p.seatId}
                          </span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-500 text-xs italic">
                          Belum Check-in
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {p.checkedIn && p.seatId ? (
                          <Link
                            href={`/admin/participants/${p.id}/boarding-pass`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50 transition-all shadow-sm text-xs font-semibold"
                          >
                            <Printer className="w-3.5 h-3.5 text-sky-500" />
                            <span>Cetak</span>
                          </Link>
                        ) : null}
                        <button
                          onClick={() => setDeleteTarget(p.id)}
                          disabled={actionLoading !== null}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm text-xs font-semibold disabled:opacity-50"
                        >
                          {actionLoading === p.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          )}
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* Delete Confirmation Modal */}
    {deleteTarget && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Hapus Peserta?</h3>
              <p className="text-xs text-slate-500 leading-normal">
                Tindakan ini akan menghapus peserta secara permanen dari sistem dan membatalkan pesanan kursi mereka jika sudah melakukan check-in.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t border-slate-200">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-650 hover:text-slate-900 text-xs font-semibold"
            >
              Batal
            </button>
            <button
              onClick={handleDeleteParticipant}
              disabled={actionLoading !== null}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow"
            >
              {actionLoading === deleteTarget ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Ya, Hapus</span>
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Hidden offscreen renderer for bulk download */}
    {activePrintParticipant && (
      <div 
        style={{ 
          position: 'absolute', 
          left: '-9999px', 
          top: '0', 
          zIndex: -100,
          pointerEvents: 'none'
        }}
      >
        <div
          ref={offscreenRendererRef}
          className="w-[780px] h-[290px] bg-white rounded-3xl border border-slate-300 shadow-none flex overflow-hidden shrink-0 relative"
          style={{ fontFamily: 'sans-serif' }}
        >
          {/* LEFT: MAIN PASSENGER BOARDING CARD (70%) */}
          <div className="w-[70%] p-6 flex flex-col justify-between relative border-r-2 border-dotted border-slate-300 overflow-hidden bg-white">
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
                {activePrintParticipant.kategori === 'eksekutif' ? 'First Class' : 'Business Class'}
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
                  {activePrintParticipant.nama}
                </div>
              </div>
              <div className="flex flex-col">
                <div className="text-[10px] font-serif lining-nums text-slate-500 tracking-wide leading-normal" style={{ fontFamily: '"Times New Roman", Times, serif' }}>Booking Number</div>
                <div className="text-sm font-serif lining-nums font-bold text-[#1a2c5b] mt-0.5 uppercase leading-normal pb-0.5" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                  {activePrintParticipant.booking_code}
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
                  {formatSeatId(activePrintParticipant.seatId || '')}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: TICKET STUB / DETACHABLE PORTION (30%) */}
          <div className="w-[30%] p-5 bg-white flex flex-col justify-between relative overflow-hidden">
            {/* Watermark Logo in Blue */}
            <div className="absolute inset-0 pointer-events-none select-none z-0 flex items-center justify-center overflow-hidden opacity-85">
              <img
                src="/aset-logo.png"
                alt="Watermark Logo"
                className="w-[85%] h-auto object-contain"
              />
            </div>

            {/* Stub content details */}
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 relative z-10 px-1 mt-1">
              <div className="flex flex-col col-span-2">
                <div className="text-[8px] font-serif lining-nums text-slate-500 tracking-wide leading-tight" style={{ fontFamily: '"Times New Roman", Times, serif' }}>Name</div>
                <div className="text-[11px] font-serif lining-nums font-bold text-[#1a2c5b] mt-0.5 uppercase break-words leading-tight pb-0.5" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                  {activePrintParticipant.nama}
                </div>
              </div>
              <div className="flex flex-col col-span-2">
                <div className="text-[8px] font-serif lining-nums text-slate-500 tracking-wide leading-tight" style={{ fontFamily: '"Times New Roman", Times, serif' }}>Booking Number</div>
                <div className="text-[11px] font-serif lining-nums font-bold text-[#1a2c5b] mt-0.5 uppercase leading-tight pb-0.5" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                  {activePrintParticipant.booking_code}
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
                  {formatSeatId(activePrintParticipant.seatId || '')}
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
    )}
    </>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  checkAdminSessionAction,
  adminLogoutAction,
  uploadParticipantsAction,
  generateBookingCodesAction,
  sendEmailsAction,
  getParticipantsListAction
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
  Check
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

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantDisplay[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        <span className="text-slate-400 text-sm">Memuat dashboard admin...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Portal Admin</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Kelola Peserta & Kursi</h1>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-red-500/20 hover:text-red-400 text-slate-400 font-semibold rounded-xl text-sm transition-all"
        >
          <LogOut className="w-4.5 h-4.5" />
          <span>Keluar Portal</span>
        </button>
      </div>

      {/* Message Notifications */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/25 rounded-2xl text-sm text-red-200">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-slate-400 font-bold hover:text-white">Tutup</button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-sm text-emerald-200">
          <Check className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="flex-1">{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)} className="text-xs text-slate-400 font-bold hover:text-white">Tutup</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center justify-between shadow">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Peserta</span>
            <p className="text-3xl font-black text-white">{totalCount}</p>
          </div>
          <div className="w-12 h-12 bg-sky-500/10 rounded-xl flex items-center justify-center border border-sky-500/25">
            <Users className="w-6 h-6 text-sky-400" />
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center justify-between shadow">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sudah Check-in</span>
            <p className="text-3xl font-black text-emerald-400">{checkedInCount}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/25">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center justify-between shadow">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Belum Check-in</span>
            <p className="text-3xl font-black text-yellow-400">{pendingCheckIn}</p>
          </div>
          <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center border border-yellow-500/25">
            <Clock className="w-6 h-6 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Action Controls Panel */}
      <div className="glass-card p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
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
            className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white font-semibold rounded-xl text-sm transition-all shadow"
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
            className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white font-semibold rounded-xl text-sm transition-all shadow"
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
        </div>

        {/* CSV Format Note */}
        <div className="flex items-center gap-3 p-3.5 bg-slate-950 rounded-2xl border border-slate-900/60 max-w-sm">
          <FileSpreadsheet className="w-8 h-8 text-slate-500 shrink-0" />
          <div className="text-[10px] text-slate-400 leading-normal">
            <span className="font-bold text-white block mb-0.5">Format CSV Google Form:</span>
            nama,email,no_wa,kategori
          </div>
        </div>
      </div>

      {/* Participant List & Table */}
      <div className="glass-card rounded-3xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
        {/* Search Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center gap-4 flex-col sm:flex-row">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider shrink-0">Daftar Peserta</h3>
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Cari nama, email atau kode booking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-300 placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm transition-all"
            />
            <Search className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="py-4 px-6">Nama</th>
                <th className="py-4 px-6">Email</th>
                <th className="py-4 px-6">WhatsApp</th>
                <th className="py-4 px-6">Kelas</th>
                <th className="py-4 px-6 text-center">Kode Booking</th>
                <th className="py-4 px-6 text-center">Status Seat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-6 text-center text-slate-500 text-sm">
                    Tidak ada data peserta ditemukan.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="py-4 px-6 font-bold text-white">{p.nama}</td>
                    <td className="py-4 px-6 text-slate-400">{p.email}</td>
                    <td className="py-4 px-6 text-slate-400 font-mono">{p.no_wa || '-'}</td>
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
                        <span className="font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-900 text-slate-200 tracking-wider text-xs">
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
                        <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-900 text-slate-500 text-xs italic">
                          Belum Check-in
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

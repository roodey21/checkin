'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  checkAdminSessionAction,
  adminLogoutAction,
  createParticipantAction
} from '@/app/actions/admin';
import {
  UserPlus,
  ArrowLeft,
  Mail,
  LogOut,
  Loader2,
  AlertCircle,
  Check,
  Plus,
  RefreshCw,
  Sparkles
} from 'lucide-react';

export default function AddParticipantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Success report details
  const [addedInfo, setAddedInfo] = useState<{
    nama: string;
    email: string;
    bookingCode: string | null;
    emailSent: boolean;
    emailError?: string;
  } | null>(null);

  // Form States
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [noWa, setNoWa] = useState('');
  const [kategori, setKategori] = useState<'eksekutif' | 'bisnis'>('bisnis');
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [customBookingCode, setCustomBookingCode] = useState('');
  const [sendEmail, setSendEmail] = useState(true);

  // Authenticate Admin Session on Mount
  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await checkAdminSessionAction();
      if (!isAuth) {
        router.push('/admin');
      } else {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await adminLogoutAction();
    router.push('/admin');
  };

  const handleResetForm = () => {
    setNama('');
    setEmail('');
    setNoWa('');
    setKategori('bisnis');
    setAutoGenerate(true);
    setCustomBookingCode('');
    setSendEmail(true);
    setError(null);
    setSuccessMsg(null);
    setAddedInfo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama || !email) {
      setError('Nama dan Email wajib diisi.');
      return;
    }

    if (!autoGenerate && customBookingCode.trim().length > 0 && customBookingCode.trim().length !== 6) {
      setError('Kode booking kustom harus tepat 6 karakter alfanumerik.');
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    setAddedInfo(null);

    try {
      const res = await createParticipantAction({
        nama,
        email,
        no_wa: noWa,
        kategori,
        booking_code: autoGenerate ? undefined : customBookingCode.toUpperCase(),
        auto_generate_code: autoGenerate,
        send_email: sendEmail
      });

      if (res.success) {
        let msg = `Peserta "${nama}" berhasil ditambahkan.`;
        if (res.booking_code) {
          msg += ` Kode Booking: ${res.booking_code}.`;
        }
        if (sendEmail) {
          if (res.emailSent) {
            msg += ' Email undangan berhasil terkirim!';
          } else {
            msg += ` Namun, email gagal terkirim: ${res.emailError || 'Kesalahan SMTP'}.`;
          }
        }

        setSuccessMsg(msg);
        setAddedInfo({
          nama,
          email,
          bookingCode: res.booking_code || null,
          emailSent: !!res.emailSent,
          emailError: res.emailError
        });

        // Keep form filled so admin can review success details, but reset main states if they click reset
      } else {
        setError(res.error || 'Gagal menambahkan peserta.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Terjadi kesalahan server.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        <span className="text-slate-600 text-sm">Memverifikasi sesi admin...</span>
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
          <h1 className="text-2xl font-extrabold text-slate-900">Tambah Peserta Manual</h1>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-red-500/20 hover:text-red-500 text-slate-600 font-semibold rounded-xl text-sm transition-all shadow-sm"
        >
          <LogOut className="w-4.5 h-4.5" />
          <span>Keluar Portal</span>
        </button>
      </div>

      {/* Navigation Tabs Menu */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/participants"
          className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
        >
          Daftar Peserta
        </Link>
        <Link
          href="/admin/participants/add"
          className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-900 text-white text-sm font-semibold shadow-sm"
        >
          Tambah Peserta Manual
        </Link>
        <Link
          href="/admin/seats"
          className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
        >
          Kelola Kursi
        </Link>
      </div>

      {/* Alert Banners */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-800 animate-fade-in shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold">Gagal Menambahkan Peserta</h4>
            <p className="mt-1 text-red-700">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-xs text-red-400 font-bold hover:text-red-800">Tutup</button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-900 animate-fade-in shadow-sm">
          <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold">Peserta Berhasil Ditambahkan!</h4>
            <p className="mt-1 text-emerald-700">{successMsg}</p>
            {addedInfo && (
              <div className="mt-3 bg-white/70 rounded-xl p-3 border border-emerald-100 flex flex-wrap gap-4 text-xs font-medium">
                <div>
                  <span className="text-slate-500 block">Nama</span>
                  <span className="text-slate-900 font-bold">{addedInfo.nama}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Email</span>
                  <span className="text-slate-900 font-mono">{addedInfo.email}</span>
                </div>
                {addedInfo.bookingCode && (
                  <div>
                    <span className="text-slate-500 block">Kode Booking</span>
                    <span className="font-mono bg-slate-900 text-white px-2 py-0.5 rounded text-[10px] tracking-wider font-extrabold">{addedInfo.bookingCode}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 block">Status Email</span>
                  {addedInfo.emailSent ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">Terkirim ✓</span>
                  ) : sendEmail ? (
                    <span className="text-red-500 font-bold flex items-center gap-1" title={addedInfo.emailError}>Gagal (Arahkan kursor) ⚠</span>
                  ) : (
                    <span className="text-slate-400 italic">Tidak Dikirim</span>
                  )}
                </div>
              </div>
            )}
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-xs text-emerald-400 font-bold hover:text-emerald-800">Tutup</button>
        </div>
      )}

      {/* Main Form Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="glass-card p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Formulir Peserta Baru</h2>
              <p className="text-xs text-slate-500 mt-0.5">Formulir ini digunakan untuk menyisipkan data peserta langsung ke database.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 shadow-sm text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Alamat Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Contoh: budi@gmail.com"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 shadow-sm text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Nomor WhatsApp (Opsional)</label>
                <input
                  type="text"
                  value={noWa}
                  onChange={(e) => setNoWa(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 shadow-sm text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Kategori Kelas</label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value as 'eksekutif' | 'bisnis')}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 shadow-sm text-sm"
                >
                  <option value="bisnis">Bisnis</option>
                  <option value="eksekutif">Eksekutif</option>
                </select>
              </div>
            </div>

            {/* Booking Code Config */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                Pengaturan Kode Booking
              </h3>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoGenerate"
                  checked={autoGenerate}
                  onChange={(e) => setAutoGenerate(e.target.checked)}
                  className="w-4.5 h-4.5 text-purple-600 focus:ring-purple-500 border-slate-300 rounded"
                />
                <label htmlFor="autoGenerate" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Buat Kode Booking Otomatis (6 Karakter Acak)
                </label>
              </div>

              {!autoGenerate && (
                <div className="space-y-1.5 max-w-sm pl-7 animate-fade-in">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Kode Booking Kustom</label>
                  <input
                    type="text"
                    maxLength={6}
                    required={!autoGenerate}
                    value={customBookingCode}
                    onChange={(e) => setCustomBookingCode(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
                    placeholder="Contoh: PTPN01"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-xs font-mono font-bold tracking-widest uppercase shadow-sm"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Harus 6 karakter alfanumerik.</span>
                </div>
              )}
            </div>

            {/* Email Dispatch Option */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-purple-500" />
                Distribusi Undangan
              </h3>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="w-4.5 h-4.5 text-purple-600 focus:ring-purple-500 border-slate-300 rounded"
                />
                <label htmlFor="sendEmail" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Kirim email undangan berisi kode booking secara instan setelah ditambahkan
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <button
                type="button"
                onClick={handleResetForm}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 transition-all text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Bersihkan Formulir</span>
              </button>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Link
                  href="/admin/participants"
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali ke Daftar</span>
                </Link>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg hover:shadow-purple-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4.5 h-4.5" />
                      <span>Simpan & Daftarkan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Informative Side Panel */}
        <div className="glass-card p-6 rounded-3xl border border-slate-200 shadow-xl space-y-4">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">Panduan Input Manual</h3>
          <ul className="space-y-3 text-xs text-slate-600 leading-relaxed list-disc pl-4">
            <li>
              <strong>Data Duplikat</strong>: Alamat email harus unik. Sistem akan menolak jika email tersebut sudah terdaftar.
            </li>
            <li>
              <strong>Kode Booking</strong>: Setiap peserta membutuhkan kode booking unik 6 karakter untuk masuk ke portal check-in. Anda dapat memilih auto-generate atau memasukkannya secara manual.
            </li>
            <li>
              <strong>Nomor WhatsApp</strong>: Gunakan format internasional jika memungkinkan (contoh: <code>08123456789</code> atau <code>628123456789</code>).
            </li>
            <li>
              <strong>Kategori Kelas</strong>: Memengaruhi tabel manakah di dalam denah ballroom yang berhak dipilih oleh peserta tersebut saat check-in (Eksekutif hanya di meja Eksekutif, Bisnis di meja Bisnis).
            </li>
            <li>
              <strong>SMTP Undangan</strong>: Jika fitur kirim undangan instan aktif, pastikan setelan SMTP di server <code>.env.local</code> telah berjalan dengan benar.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

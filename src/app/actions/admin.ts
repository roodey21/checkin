'use server';

import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase';
import nodemailer from 'nodemailer';

// Admin Login
export async function adminLoginAction(password: string) {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  if (password === adminPassword) {
    const cookieStore = cookies();
    cookieStore.set('admin_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });
    return { success: true };
  }
  return { success: false, error: 'Password salah!' };
}

// Check Admin Session
export async function checkAdminSessionAction() {
  const cookieStore = cookies();
  return cookieStore.get('admin_session')?.value === 'authenticated';
}

// Admin Logout
export async function adminLogoutAction() {
  const cookieStore = cookies();
  cookieStore.delete('admin_session');
  return { success: true };
}

// Upload CSV Participants
export async function uploadParticipantsAction(participants: Array<{ nama: string; email: string; no_wa: string; kategori: string }>) {
  try {
    const isAdmin = await checkAdminSessionAction();
    if (!isAdmin) return { success: false, error: 'Unauthorized.' };

    const supabase = getSupabaseAdmin();

    const formatted = participants.map((p) => ({
      nama: p.nama.trim(),
      email: p.email.trim().toLowerCase(),
      no_wa: p.no_wa ? p.no_wa.trim() : null,
      kategori: p.kategori.trim().toLowerCase() === 'eksekutif' ? 'eksekutif' : 'bisnis',
    }));

    const { error } = await supabase
      .from('participants')
      .upsert(formatted, { onConflict: 'email' });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, count: formatted.length };
  } catch (error: any) {
    console.error('uploadParticipantsAction error:', error);
    return { success: false, error: error.message || 'Terjadi kesalahan server.' };
  }
}

// Generate Booking Codes
export async function generateBookingCodesAction() {
  try {
    const isAdmin = await checkAdminSessionAction();
    if (!isAdmin) return { success: false, error: 'Unauthorized.' };

    const supabase = getSupabaseAdmin();

    // Get all participants
    const { data: participants, error: pError } = await supabase
      .from('participants')
      .select('id, booking_code');

    if (pError) throw pError;

    // Collect existing codes
    const existingCodes = new Set(
      participants
        .map((p) => p.booking_code)
        .filter((code): code is string => !!code)
    );

    const generateUniqueCode = (): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      do {
        code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
      } while (existingCodes.has(code));
      existingCodes.add(code);
      return code;
    };

    let updatedCount = 0;

    for (const p of participants) {
      if (!p.booking_code) {
        const newCode = generateUniqueCode();
        const { error } = await supabase
          .from('participants')
          .update({ booking_code: newCode })
          .eq('id', p.id);

        if (error) throw error;
        updatedCount++;
      }
    }

    return { success: true, count: updatedCount };
  } catch (error: any) {
    console.error('generateBookingCodesAction error:', error);
    return { success: false, error: error.message || 'Gagal generate kode booking.' };
  }
}

// Send Email Invitation containing Booking Code using SMTP
export async function sendEmailsAction() {
  try {
    const isAdmin = await checkAdminSessionAction();
    if (!isAdmin) return { success: false, error: 'Unauthorized.' };

    const supabase = getSupabaseAdmin();

    // Get participants who have a booking code
    const { data: participants, error: pError } = await supabase
      .from('participants')
      .select('*')
      .not('booking_code', 'is', null);

    if (pError) throw pError;

    if (!participants || participants.length === 0) {
      return { success: false, error: 'Tidak ada peserta dengan kode booking yang siap dikirim.' };
    }

    // SMTP Configurations
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || `"PTPN Finance & Risk Leaders Forum" <${user}>`;

    if (!host || !user || !pass) {
      return { success: false, error: 'Konfigurasi SMTP (.env.local) belum lengkap.' };
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: { user, pass },
    });

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Send emails sequentially or in parallel batches
    for (const p of participants) {
      try {
        const checkinUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkin?code=${p.booking_code}`;

        const htmlContent = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px 20px; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #1e293b;">
            <div style="text-align: center; margin-bottom: 30px;">
              <span style="font-size: 10px; font-weight: 800; color: #f97316; text-transform: uppercase; letter-spacing: 0.15em;">Danantara Indonesia & Perkebunan Nusantara</span>
              <h2 style="font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 10px; margin-bottom: 5px; text-transform: uppercase;">PTPN Finance & Risk Leaders Forum 2026</h2>
              <p style="font-size: 11px; color: #94a3b8; font-style: italic; margin-top: 5px; margin-bottom: 10px;">"Navigating The New Era of Financial Excellence"</p>
              <div style="height: 2px; width: 60px; background-color: #f97316; margin: 15px auto;"></div>
            </div>

            <div style="background-color: #1e293b; padding: 25px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 35px;">
              <p style="margin-top: 0; font-size: 16px; line-height: 1.6; color: #e2e8f0;">Halo <strong>${p.nama}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.6; color: #94a3b8;">Anda terdaftar sebagai peserta forum dengan kategori kelas <strong>${p.kategori.toUpperCase()}</strong>. Detail acara:</p>
              <ul style="font-size: 13px; color: #cbd5e1; line-height: 1.6; padding-left: 20px; margin: 10px 0;">
                <li><strong>Tanggal:</strong> 11-12 Juni 2026</li>
                <li><strong>Waktu:</strong> 08:00 - 17:00 WIB</li>
                <li><strong>Tempat:</strong> PT. LPP Agro Nusantara</li>
              </ul>
              <p style="font-size: 14px; line-height: 1.6; color: #94a3b8;">Silakan lakukan proses check-in tempat duduk Anda menggunakan kode booking di bawah ini:</p>
              
              <div style="text-align: center; margin: 25px 0; background-color: #0f172a; padding: 15px; border-radius: 6px; border: 1px dashed #f97316;">
                <span style="display: block; font-size: 11px; color: #94a3b8; text-transform: uppercase; margin-bottom: 5px;">Kode Booking Anda</span>
                <span style="font-size: 32px; font-weight: 800; color: #f97316; letter-spacing: 4px; font-family: monospace;">${p.booking_code}</span>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${checkinUrl}" style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; padding: 12px 30px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px; display: inline-block; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);">Mulai Check-in Sekarang</a>
              </div>
            </div>

            <div style="text-align: center; font-size: 11px; color: #64748b; line-height: 1.5;">
              <p>Harap tidak membagikan kode booking ini kepada siapapun.</p>
              <p>&copy; 2026 PTPN Finance & Risk Leaders Forum. All rights reserved.</p>
            </div>
          </div>
        `;

        await transporter.sendMail({
          from,
          to: p.email,
          subject: `[Undangan Check-in] PTPN Finance & Risk Leaders Forum 2026 - ${p.nama}`,
          html: htmlContent,
        });

        sentCount++;
      } catch (err: any) {
        console.error(`Gagal kirim email ke ${p.email}:`, err);
        failedCount++;
        errors.push(`${p.email}: ${err.message}`);
      }
    }

    return {
      success: true,
      sentCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error('sendEmailsAction error:', error);
    return { success: false, error: error.message || 'Gagal mengirim email.' };
  }
}

// Fetch all participants with bookings status
export async function getParticipantsListAction() {
  try {
    const isAdmin = await checkAdminSessionAction();
    if (!isAdmin) return { success: false, error: 'Unauthorized.' };

    const supabase = getSupabaseAdmin();

    // Query participants and join bookings
    const { data, error } = await supabase
      .from('participants')
      .select(`
        *,
        bookings (
          seat_id
        )
      `)
      .order('nama', { ascending: true });

    if (error) throw error;

    // Format output
    const formatted = data.map((p: any) => ({
      id: p.id,
      nama: p.nama,
      email: p.email,
      no_wa: p.no_wa,
      kategori: p.kategori,
      booking_code: p.booking_code,
      checkedIn: p.bookings && p.bookings.length > 0,
      seatId: p.bookings && p.bookings.length > 0 ? p.bookings[0].seat_id : null,
    }));

    return { success: true, participants: formatted };
  } catch (error: any) {
    console.error('getParticipantsListAction error:', error);
    return { success: false, error: error.message || 'Gagal mengambil data peserta.' };
  }
}

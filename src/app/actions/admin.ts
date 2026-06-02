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

// Helper to generate the premium email invitation template
function getInvitationEmailHtml(nama: string, kategori: string, booking_code: string) {
  const checkinUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkin?code=${booking_code}`;
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px 20px; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 30px;">
        <span style="font-size: 10px; font-weight: 800; color: #f97316; text-transform: uppercase; letter-spacing: 0.15em;">Danantara Indonesia & Perkebunan Nusantara</span>
        <h2 style="font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 10px; margin-bottom: 5px; text-transform: uppercase;">PTPN Finance & Risk Leaders Forum 2026</h2>
        <p style="font-size: 11px; color: #94a3b8; font-style: italic; margin-top: 5px; margin-bottom: 10px;">"Navigating The New Era of Financial Excellence"</p>
        <div style="height: 2px; width: 60px; background-color: #f97316; margin: 15px auto;"></div>
      </div>

      <div style="background-color: #1e293b; padding: 25px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 35px;">
        <p style="margin-top: 0; font-size: 16px; line-height: 1.6; color: #e2e8f0;">Halo <strong>${nama}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #94a3b8;">Anda terdaftar sebagai peserta forum dengan kategori kelas <strong>${kategori.toUpperCase()}</strong>. Detail acara:</p>
        <ul style="font-size: 13px; color: #cbd5e1; line-height: 1.6; padding-left: 20px; margin: 10px 0;">
          <li><strong>Tanggal:</strong> 11-12 Juni 2026</li>
          <li><strong>Waktu:</strong> 08:00 - 17:00 WIB</li>
          <li><strong>Tempat:</strong> PT. LPP Agro Nusantara</li>
        </ul>
        <p style="font-size: 14px; line-height: 1.6; color: #94a3b8;">Silakan lakukan proses check-in tempat duduk Anda menggunakan kode booking di bawah ini:</p>
        
        <div style="text-align: center; margin: 25px 0; background-color: #0f172a; padding: 15px; border-radius: 6px; border: 1px dashed #f97316;">
          <span style="display: block; font-size: 11px; color: #94a3b8; text-transform: uppercase; margin-bottom: 5px;">Kode Booking Anda</span>
          <span style="font-size: 32px; font-weight: 800; color: #f97316; letter-spacing: 4px; font-family: monospace;">${booking_code}</span>
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
}

// Helper to send individual invitation email
async function sendInvitationEmailHelper(transporter: any, from: string, to: string, nama: string, kategori: string, booking_code: string) {
  const html = getInvitationEmailHtml(nama, kategori, booking_code);
  await transporter.sendMail({
    from,
    to,
    subject: `[Undangan Check-in] PTPN Finance & Risk Leaders Forum 2026 - ${nama}`,
    html,
  });
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
        await sendInvitationEmailHelper(transporter, from, p.email, p.nama, p.kategori, p.booking_code);
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

    // Query participants
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('*')
      .order('nama', { ascending: true });

    if (participantsError) throw participantsError;

    // Query bookings separately to avoid relation cardinality ambiguity
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('participant_id, seat_id');

    if (bookingsError) throw bookingsError;

    const bookingByParticipantId = new Map<string, string>();
    for (const b of bookings || []) {
      if (b.participant_id && b.seat_id) {
        bookingByParticipantId.set(b.participant_id, b.seat_id);
      }
    }

    // Format output
    const formatted = (participants || []).map((p: any) => {
      const seatId = bookingByParticipantId.get(p.id) || null;

      return {
      id: p.id,
      nama: p.nama,
      email: p.email,
      no_wa: p.no_wa,
      kategori: p.kategori,
      booking_code: p.booking_code,
      checkedIn: !!seatId,
      seatId,
    };
    });

    return { success: true, participants: formatted };
  } catch (error: any) {
    console.error('getParticipantsListAction error:', error);
    return { success: false, error: error.message || 'Gagal mengambil data peserta.' };
  }
}

// Fetch one participant boarding-pass data for admin printing
export async function getAdminBoardingPassDataAction(participantId: string) {
  try {
    const isAdmin = await checkAdminSessionAction();
    if (!isAdmin) return { success: false, error: 'Unauthorized.' };

    const supabase = getSupabaseAdmin();

    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id, nama, email, kategori, booking_code')
      .eq('id', participantId)
      .maybeSingle();

    if (participantError) throw participantError;
    if (!participant) {
      return { success: false, error: 'Peserta tidak ditemukan.' };
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('seat_id')
      .eq('participant_id', participantId)
      .maybeSingle();

    if (bookingError) throw bookingError;
    if (!booking?.seat_id) {
      return { success: false, error: 'Peserta belum check-in atau belum memiliki kursi.' };
    }

    return {
      success: true,
      participant,
      seatId: booking.seat_id,
    };
  } catch (error: any) {
    console.error('getAdminBoardingPassDataAction error:', error);
    return { success: false, error: error.message || 'Gagal mengambil data boarding pass.' };
  }
}

// Fetch all seats for admin management
export async function getSeatsListAction() {
  try {
    const isAdmin = await checkAdminSessionAction();
    if (!isAdmin) return { success: false, error: 'Unauthorized.' };

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('seats')
      .select('*')
      .order('kategori', { ascending: true })
      .order('row_name', { ascending: true })
      .order('table_name', { ascending: true })
      .order('seat_number', { ascending: true });

    if (error) throw error;

    return { success: true, seats: data };
  } catch (error: any) {
    console.error('getSeatsListAction error:', error);
    return { success: false, error: error.message || 'Gagal mengambil daftar kursi.' };
  }
}

// Create a new seat entry
export async function createSeatAction(input: {
  kategori: 'eksekutif' | 'bisnis';
  row_name: string;
  table_name: string;
  seat_number: number;
}) {
  try {
    const isAdmin = await checkAdminSessionAction();
    if (!isAdmin) return { success: false, error: 'Unauthorized.' };

    const kategori = input.kategori?.trim().toLowerCase();
    const rowName = input.row_name?.trim().toUpperCase();
    const tableName = input.table_name?.trim();
    const seatNumber = Number(input.seat_number);

    if (!rowName || !tableName || !Number.isInteger(seatNumber) || seatNumber <= 0) {
      return { success: false, error: 'Data kursi belum lengkap atau tidak valid.' };
    }

    const normalizedKategori = kategori === 'eksekutif' ? 'eksekutif' : 'bisnis';
    const classCode = normalizedKategori === 'eksekutif' ? 'E' : 'B';
    const rowClean = rowName.replace(/\s+/g, '');
    const tableClean = tableName.replace(/\s+/g, '');
    const seatId = `${classCode}-${rowClean}-${tableClean}-S${seatNumber}`;
    const supabase = getSupabaseAdmin();

    const { data: existingSeat, error: lookupError } = await supabase
      .from('seats')
      .select('id')
      .eq('id', seatId)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (existingSeat) {
      return { success: false, error: 'Kode kursi sudah ada. Gunakan baris/meja/nomor yang berbeda.' };
    }

    const { error } = await supabase.from('seats').insert({
      id: seatId,
      kategori: normalizedKategori,
      row_name: rowName,
      table_name: tableName,
      seat_number: seatNumber,
    });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('createSeatAction error:', error);
    return { success: false, error: error.message || 'Gagal menambah kursi.' };
  }
}

// Delete a seat entry if it is not in use
export async function deleteSeatAction(seatId: string) {
  try {
    const isAdmin = await checkAdminSessionAction();
    if (!isAdmin) return { success: false, error: 'Unauthorized.' };

    const supabase = getSupabaseAdmin();

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('seat_id')
      .eq('seat_id', seatId)
      .maybeSingle();

    if (bookingError) throw bookingError;
    if (booking) {
      return { success: false, error: 'Kursi ini sudah dipakai dan tidak bisa dihapus.' };
    }

    const { data: lockedSeat, error: lockError } = await supabase
      .from('active_seat_locks')
      .select('seat_id')
      .eq('seat_id', seatId)
      .maybeSingle();

    if (lockError) throw lockError;
    if (lockedSeat) {
      return { success: false, error: 'Kursi ini sedang dikunci dan tidak bisa dihapus.' };
    }

    const { error } = await supabase.from('seats').delete().eq('id', seatId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('deleteSeatAction error:', error);
    return { success: false, error: error.message || 'Gagal menghapus kursi.' };
  }
}

export interface SeatingTableConfig {
  table_name: string;
  seats_count: number;
}

export interface SeatingRowConfig {
  kategori: 'eksekutif' | 'bisnis';
  row_name: string;
  tables: SeatingTableConfig[];
}

// Reconfigure the entire seating layout dynamically
export async function generateSeatingLayoutAction(layoutConfig: SeatingRowConfig[]) {
  try {
    const isAdmin = await checkAdminSessionAction();
    if (!isAdmin) return { success: false, error: 'Unauthorized.' };

    const supabase = getSupabaseAdmin();

    // 1. Delete all existing seats (cascades to bookings and locks)
    const { error: deleteError } = await supabase
      .from('seats')
      .delete()
      .neq('id', 'placeholder-non-existent-id'); // Deletes all rows

    if (deleteError) {
      return { success: false, error: 'Gagal membersihkan layout kursi lama: ' + deleteError.message };
    }

    // 2. Prepare bulk insert list
    const seatsToInsert = [];
    for (const row of layoutConfig) {
      for (const table of row.tables) {
        for (let i = 1; i <= table.seats_count; i++) {
          const classCode = row.kategori === 'eksekutif' ? 'E' : 'B';
          const rowClean = row.row_name.replace(/\s+/g, '');
          const tableClean = table.table_name.replace(/\s+/g, '');
          const seatId = `${classCode}-${rowClean}-${tableClean}-S${i}`;

          seatsToInsert.push({
            id: seatId,
            kategori: row.kategori,
            row_name: row.row_name.trim(),
            table_name: table.table_name.trim(),
            seat_number: i,
          });
        }
      }
    }

    if (seatsToInsert.length === 0) {
      return { success: false, error: 'Konfigurasi kosong. Tidak ada kursi yang dibuat.' };
    }

    // 3. Bulk insert new seats
    const { error: insertError } = await supabase
      .from('seats')
      .insert(seatsToInsert);

    if (insertError) {
      return { success: false, error: 'Gagal mengunggah layout kursi baru: ' + insertError.message };
    }

    return { success: true, count: seatsToInsert.length };
  } catch (error: any) {
    console.error('generateSeatingLayoutAction error:', error);
    return { success: false, error: error.message || 'Terjadi kesalahan server.' };
  }
}

// Add a single participant manually
export async function createParticipantAction(input: {
  nama: string;
  email: string;
  no_wa?: string;
  kategori: 'eksekutif' | 'bisnis';
  booking_code?: string;
  auto_generate_code?: boolean;
  send_email?: boolean;
}) {
  try {
    const isAdmin = await checkAdminSessionAction();
    if (!isAdmin) return { success: false, error: 'Unauthorized.' };

    const name = input.nama?.trim();
    const email = input.email?.trim().toLowerCase();
    const noWa = input.no_wa?.trim() || null;
    const kategori = input.kategori;
    let bookingCode = input.booking_code?.trim() || null;

    if (!name || !email || !kategori) {
      return { success: false, error: 'Nama, Email, dan Kategori harus diisi.' };
    }

    const supabase = getSupabaseAdmin();

    // Check if participant already exists by email
    const { data: existing, error: lookupError } = await supabase
      .from('participants')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (existing) {
      return { success: false, error: 'Email sudah terdaftar untuk peserta lain.' };
    }

    // Determine booking code
    if (input.auto_generate_code || (input.send_email && !bookingCode)) {
      // Fetch existing booking codes to ensure uniqueness
      const { data: allParticipants, error: pError } = await supabase
        .from('participants')
        .select('booking_code');
      if (pError) throw pError;

      const existingCodes = new Set(
        (allParticipants || [])
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
        return code;
      };

      bookingCode = generateUniqueCode();
    } else if (bookingCode) {
      // Check if manually provided code is already in use
      const { data: codeExisting, error: codeLookupError } = await supabase
        .from('participants')
        .select('id')
        .eq('booking_code', bookingCode)
        .maybeSingle();

      if (codeLookupError) throw codeLookupError;
      if (codeExisting) {
        return { success: false, error: 'Kode booking sudah digunakan oleh peserta lain.' };
      }
    }

    const { error } = await supabase.from('participants').insert({
      nama: name,
      email,
      no_wa: noWa,
      kategori,
      booking_code: bookingCode,
    });

    if (error) throw error;

    let emailSent = false;
    let emailError: string | undefined = undefined;

    if (input.send_email && bookingCode) {
      try {
        const host = process.env.SMTP_HOST;
        const port = parseInt(process.env.SMTP_PORT || '587');
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        const from = process.env.SMTP_FROM || `"PTPN Finance & Risk Leaders Forum" <${user}>`;

        if (!host || !user || !pass) {
          throw new Error('Konfigurasi SMTP (.env.local) belum lengkap.');
        }

        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });

        await sendInvitationEmailHelper(transporter, from, email, name, kategori, bookingCode);
        emailSent = true;
      } catch (err: any) {
        console.error('Failed to send immediate invitation email:', err);
        emailError = err.message || 'Gagal mengirim email undangan.';
      }
    }

    return { success: true, booking_code: bookingCode, emailSent, emailError };
  } catch (error: any) {
    console.error('createParticipantAction error:', error);
    return { success: false, error: error.message || 'Gagal menambahkan peserta.' };
  }
}

// Delete a participant manually
export async function deleteParticipantAction(participantId: string) {
  try {
    const isAdmin = await checkAdminSessionAction();
    if (!isAdmin) return { success: false, error: 'Unauthorized.' };

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('id', participantId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('deleteParticipantAction error:', error);
    return { success: false, error: error.message || 'Gagal menghapus peserta.' };
  }
}

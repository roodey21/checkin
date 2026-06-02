'use server';

import { getSupabaseAdmin } from '@/lib/supabase';

// Get participant and check-in status by booking code
export async function getParticipantByCodeAction(bookingCode: string) {
  try {
    const supabase = getSupabaseAdmin();
    
    // Find participant
    const { data: participant, error: pError } = await supabase
      .from('participants')
      .select('*')
      .eq('booking_code', bookingCode.trim().toUpperCase())
      .single();

    if (pError || !participant) {
      return { success: false, error: 'Kode booking tidak ditemukan.' };
    }

    // Check if already booked
    const { data: booking, error: bError } = await supabase
      .from('bookings')
      .select('seat_id')
      .eq('participant_id', participant.id)
      .maybeSingle();

    return {
      success: true,
      participant,
      checkedIn: !!booking,
      seatId: booking ? booking.seat_id : null,
    };
  } catch (error: any) {
    console.error('getParticipantByCodeAction error:', error);
    return { success: false, error: error.message || 'Terjadi kesalahan server.' };
  }
}

// Lock seat for 5 minutes
export async function lockSeatAction(seatId: string, participantId: string) {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase.rpc('lock_seat', {
      p_seat_id: seatId,
      p_participant_id: participantId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Kursi tidak dapat dikunci. Mungkin sudah dipesan atau dikunci oleh pengguna lain.' };
    }

    // Calculate expiry time (current time + 5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    return { success: true, expiresAt };
  } catch (error: any) {
    console.error('lockSeatAction error:', error);
    return { success: false, error: error.message || 'Gagal mengunci kursi.' };
  }
}

// Unlock seat
export async function unlockSeatAction(participantId: string) {
  try {
    const supabase = getSupabaseAdmin();
    
    const { error } = await supabase.rpc('unlock_seat', {
      p_participant_id: participantId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('unlockSeatAction error:', error);
    return { success: false, error: error.message || 'Gagal melepas kunci kursi.' };
  }
}

// Confirm booking and finalize check-in
export async function confirmBookingAction(seatId: string, participantId: string) {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase.rpc('confirm_booking', {
      p_seat_id: seatId,
      p_participant_id: participantId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Gagal mengonfirmasi check-in. Kunci kursi Anda mungkin telah kedaluwarsa.' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('confirmBookingAction error:', error);
    return { success: false, error: error.message || 'Gagal mengonfirmasi check-in.' };
  }
}

// Fetch all seats and their status (booked, locked)
export async function getSeatsStatusAction() {
  try {
    const supabase = getSupabaseAdmin();
    
    // Get all seats
    const { data: seats, error: sError } = await supabase
      .from('seats')
      .select('*')
      .order('row_name', { ascending: true })
      .order('table_name', { ascending: true })
      .order('seat_number', { ascending: true });

    if (sError) throw sError;

    // Get all confirmed bookings
    const { data: bookings, error: bError } = await supabase
      .from('bookings')
      .select('*');

    if (bError) throw bError;

    // Get active locks (filtered using view)
    const { data: locks, error: lError } = await supabase
      .from('active_seat_locks')
      .select('*');

    if (lError) throw lError;

    return {
      success: true,
      seats,
      bookings,
      locks,
    };
  } catch (error: any) {
    console.error('getSeatsStatusAction error:', error);
    return { success: false, error: error.message || 'Gagal mengambil status kursi.' };
  }
}

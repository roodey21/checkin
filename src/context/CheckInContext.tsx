'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Participant {
  id: string;
  nama: string;
  email: string;
  no_wa: string;
  kategori: 'eksekutif' | 'bisnis';
  booking_code: string;
}

interface CheckInContextType {
  participant: Participant | null;
  selectedSeatId: string | null;
  lockExpiresAt: string | null;
  login: (participant: Participant) => void;
  logout: () => void;
  setSelectedSeat: (seatId: string | null, expiresAt?: string | null) => void;
  loading: boolean;
}

const CheckInContext = createContext<CheckInContextType | undefined>(undefined);

export const CheckInProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [lockExpiresAt, setLockExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load session from localStorage on mount
    const stored = localStorage.getItem('flight_checkin_participant');
    if (stored) {
      try {
        setParticipant(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
    
    const storedSeat = localStorage.getItem('flight_checkin_selected_seat');
    if (storedSeat) {
      setSelectedSeatId(storedSeat);
    }

    const storedExpiry = localStorage.getItem('flight_checkin_lock_expiry');
    if (storedExpiry) {
      setLockExpiresAt(storedExpiry);
    }
    
    setLoading(false);
  }, []);

  const login = (p: Participant) => {
    setParticipant(p);
    localStorage.setItem('flight_checkin_participant', JSON.stringify(p));
  };

  const logout = () => {
    setParticipant(null);
    setSelectedSeatId(null);
    setLockExpiresAt(null);
    localStorage.removeItem('flight_checkin_participant');
    localStorage.removeItem('flight_checkin_selected_seat');
    localStorage.removeItem('flight_checkin_lock_expiry');
  };

  const setSelectedSeat = (seatId: string | null, expiresAt?: string | null) => {
    setSelectedSeatId(seatId);
    if (seatId) {
      localStorage.setItem('flight_checkin_selected_seat', seatId);
    } else {
      localStorage.removeItem('flight_checkin_selected_seat');
    }

    if (expiresAt) {
      setLockExpiresAt(expiresAt);
      localStorage.setItem('flight_checkin_lock_expiry', expiresAt);
    } else {
      setLockExpiresAt(null);
      localStorage.removeItem('flight_checkin_lock_expiry');
    }
  };

  return (
    <CheckInContext.Provider value={{ participant, selectedSeatId, lockExpiresAt, login, logout, setSelectedSeat, loading }}>
      {children}
    </CheckInContext.Provider>
  );
};

export const useCheckIn = () => {
  const context = useContext(CheckInContext);
  if (context === undefined) {
    throw new Error('useCheckIn must be used within a CheckInProvider');
  }
  return context;
};

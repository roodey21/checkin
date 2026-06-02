-- Setup database for Ballroom Web Check-in System (Round Table Layout)

-- Drop existing tables and views if they exist to allow clean reset
DROP VIEW IF EXISTS active_seat_locks;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS seat_locks CASCADE;
DROP TABLE IF EXISTS seats CASCADE;
DROP TABLE IF EXISTS participants CASCADE;

-- 1. Create participants table
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  no_wa TEXT,
  kategori TEXT CHECK (kategori IN ('eksekutif', 'bisnis')) NOT NULL,
  booking_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create seats table
CREATE TABLE seats (
  id TEXT PRIMARY KEY, -- e.g. E-R1-T1-S1 (Class-Row-Table-Seat)
  kategori TEXT CHECK (kategori IN ('eksekutif', 'bisnis')) NOT NULL,
  row_name TEXT NOT NULL, -- e.g. Row 1, Row 2, Row 3
  table_name TEXT NOT NULL, -- e.g. Meja E1, Meja B1
  seat_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID UNIQUE REFERENCES participants(id) ON DELETE CASCADE,
  seat_id TEXT UNIQUE REFERENCES seats(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create seat_locks table
CREATE TABLE seat_locks (
  seat_id TEXT PRIMARY KEY REFERENCES seats(id) ON DELETE CASCADE,
  participant_id UUID UNIQUE REFERENCES participants(id) ON DELETE CASCADE,
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create active seat locks view
CREATE OR REPLACE VIEW active_seat_locks AS
SELECT seat_id, participant_id, locked_at
FROM seat_locks
WHERE locked_at > (timezone('utc'::text, now()) - INTERVAL '5 minutes');

-- 6. PostgreSQL function for atomic seat locking
CREATE OR REPLACE FUNCTION lock_seat(p_seat_id TEXT, p_participant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_lock_exists BOOLEAN;
  v_booking_exists BOOLEAN;
BEGIN
  -- Hapus lock yang sudah expired
  DELETE FROM seat_locks WHERE locked_at <= (timezone('utc'::text, now()) - INTERVAL '5 minutes');

  -- Cek apakah kursi sudah di-booking
  SELECT EXISTS (
    SELECT 1 FROM bookings WHERE seat_id = p_seat_id
  ) INTO v_booking_exists;

  IF v_booking_exists THEN
    RETURN FALSE;
  END IF;

  -- Cek apakah kursi sedang di-lock oleh orang lain
  SELECT EXISTS (
    SELECT 1 FROM seat_locks WHERE seat_id = p_seat_id AND participant_id != p_participant_id
  ) INTO v_lock_exists;

  IF v_lock_exists THEN
    RETURN FALSE;
  END IF;

  -- Hapus lock lain milik participant ini
  DELETE FROM seat_locks WHERE participant_id = p_participant_id;

  -- Insert lock baru atau update jika milik sendiri
  INSERT INTO seat_locks (seat_id, participant_id, locked_at)
  VALUES (p_seat_id, p_participant_id, timezone('utc'::text, now()))
  ON CONFLICT (seat_id) DO UPDATE
  SET locked_at = timezone('utc'::text, now());

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. PostgreSQL function for unlocking seat
CREATE OR REPLACE FUNCTION unlock_seat(p_participant_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM seat_locks WHERE participant_id = p_participant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. PostgreSQL function for confirming booking
CREATE OR REPLACE FUNCTION confirm_booking(p_seat_id TEXT, p_participant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_lock_valid BOOLEAN;
BEGIN
  -- Pastikan lock masih valid dan milik participant ini
  SELECT EXISTS (
    SELECT 1 FROM seat_locks
    WHERE seat_id = p_seat_id 
      AND participant_id = p_participant_id
      AND locked_at > (timezone('utc'::text, now()) - INTERVAL '5 minutes')
  ) INTO v_lock_valid;

  IF NOT v_lock_valid THEN
    RETURN FALSE;
  END IF;

  -- Masukkan ke table bookings
  INSERT INTO bookings (participant_id, seat_id)
  VALUES (p_participant_id, p_seat_id)
  ON CONFLICT (participant_id) DO UPDATE SET seat_id = p_seat_id;

  -- Hapus dari seat_locks
  DELETE FROM seat_locks WHERE participant_id = p_participant_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Row Level Security Policies
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_locks ENABLE ROW LEVEL SECURITY;

-- Create public read policies
CREATE POLICY "Allow public read access to seats" ON seats FOR SELECT USING (true);
CREATE POLICY "Allow public read access to bookings" ON bookings FOR SELECT USING (true);
CREATE POLICY "Allow public read access to seat_locks" ON seat_locks FOR SELECT USING (true);

-- Enable Realtime for bookings and seat_locks
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE seat_locks;

-- 10. Seed Seats Data (Default Ballroom Setup: 12 Tables, 6 Seats Each)
-- Executive Rows (Row 1, Tables E1 - E4, 24 Seats)
INSERT INTO seats (id, kategori, row_name, table_name, seat_number) VALUES
-- Table E1
('E-R1-TE1-S1', 'eksekutif', 'Baris 1', 'Meja E1', 1),
('E-R1-TE1-S2', 'eksekutif', 'Baris 1', 'Meja E1', 2),
('E-R1-TE1-S3', 'eksekutif', 'Baris 1', 'Meja E1', 3),
('E-R1-TE1-S4', 'eksekutif', 'Baris 1', 'Meja E1', 4),
('E-R1-TE1-S5', 'eksekutif', 'Baris 1', 'Meja E1', 5),
('E-R1-TE1-S6', 'eksekutif', 'Baris 1', 'Meja E1', 6),
-- Table E2
('E-R1-TE2-S1', 'eksekutif', 'Baris 1', 'Meja E2', 1),
('E-R1-TE2-S2', 'eksekutif', 'Baris 1', 'Meja E2', 2),
('E-R1-TE2-S3', 'eksekutif', 'Baris 1', 'Meja E2', 3),
('E-R1-TE2-S4', 'eksekutif', 'Baris 1', 'Meja E2', 4),
('E-R1-TE2-S5', 'eksekutif', 'Baris 1', 'Meja E2', 5),
('E-R1-TE2-S6', 'eksekutif', 'Baris 1', 'Meja E2', 6),
-- Table E3
('E-R1-TE3-S1', 'eksekutif', 'Baris 1', 'Meja E3', 1),
('E-R1-TE3-S2', 'eksekutif', 'Baris 1', 'Meja E3', 2),
('E-R1-TE3-S3', 'eksekutif', 'Baris 1', 'Meja E3', 3),
('E-R1-TE3-S4', 'eksekutif', 'Baris 1', 'Meja E3', 4),
('E-R1-TE3-S5', 'eksekutif', 'Baris 1', 'Meja E3', 5),
('E-R1-TE3-S6', 'eksekutif', 'Baris 1', 'Meja E3', 6),
-- Table E4
('E-R1-TE4-S1', 'eksekutif', 'Baris 1', 'Meja E4', 1),
('E-R1-TE4-S2', 'eksekutif', 'Baris 1', 'Meja E4', 2),
('E-R1-TE4-S3', 'eksekutif', 'Baris 1', 'Meja E4', 3),
('E-R1-TE4-S4', 'eksekutif', 'Baris 1', 'Meja E4', 4),
('E-R1-TE4-S5', 'eksekutif', 'Baris 1', 'Meja E4', 5),
('E-R1-TE4-S6', 'eksekutif', 'Baris 1', 'Meja E4', 6);

-- Business Rows (Row 2, Tables B1 - B4, 24 Seats)
INSERT INTO seats (id, kategori, row_name, table_name, seat_number) VALUES
-- Table B1
('B-R2-TB1-S1', 'bisnis', 'Baris 2', 'Meja B1', 1),
('B-R2-TB1-S2', 'bisnis', 'Baris 2', 'Meja B1', 2),
('B-R2-TB1-S3', 'bisnis', 'Baris 2', 'Meja B1', 3),
('B-R2-TB1-S4', 'bisnis', 'Baris 2', 'Meja B1', 4),
('B-R2-TB1-S5', 'bisnis', 'Baris 2', 'Meja B1', 5),
('B-R2-TB1-S6', 'bisnis', 'Baris 2', 'Meja B1', 6),
-- Table B2
('B-R2-TB2-S1', 'bisnis', 'Baris 2', 'Meja B2', 1),
('B-R2-TB2-S2', 'bisnis', 'Baris 2', 'Meja B2', 2),
('B-R2-TB2-S3', 'bisnis', 'Baris 2', 'Meja B2', 3),
('B-R2-TB2-S4', 'bisnis', 'Baris 2', 'Meja B2', 4),
('B-R2-TB2-S5', 'bisnis', 'Baris 2', 'Meja B2', 5),
('B-R2-TB2-S6', 'bisnis', 'Baris 2', 'Meja B2', 6),
-- Table B3
('B-R2-TB3-S1', 'bisnis', 'Baris 2', 'Meja B3', 1),
('B-R2-TB3-S2', 'bisnis', 'Baris 2', 'Meja B3', 2),
('B-R2-TB3-S3', 'bisnis', 'Baris 2', 'Meja B3', 3),
('B-R2-TB3-S4', 'bisnis', 'Baris 2', 'Meja B3', 4),
('B-R2-TB3-S5', 'bisnis', 'Baris 2', 'Meja B3', 5),
('B-R2-TB3-S6', 'bisnis', 'Baris 2', 'Meja B3', 6),
-- Table B4
('B-R2-TB4-S1', 'bisnis', 'Baris 2', 'Meja B4', 1),
('B-R2-TB4-S2', 'bisnis', 'Baris 2', 'Meja B4', 2),
('B-R2-TB4-S3', 'bisnis', 'Baris 2', 'Meja B4', 3),
('B-R2-TB4-S4', 'bisnis', 'Baris 2', 'Meja B4', 4),
('B-R2-TB4-S5', 'bisnis', 'Baris 2', 'Meja B4', 5),
('B-R2-TB4-S6', 'bisnis', 'Baris 2', 'Meja B4', 6);

-- Business Rows (Row 3, Tables B5 - B8, 24 Seats)
INSERT INTO seats (id, kategori, row_name, table_name, seat_number) VALUES
-- Table B5
('B-R3-TB5-S1', 'bisnis', 'Baris 3', 'Meja B5', 1),
('B-R3-TB5-S2', 'bisnis', 'Baris 3', 'Meja B5', 2),
('B-R3-TB5-S3', 'bisnis', 'Baris 3', 'Meja B5', 3),
('B-R3-TB5-S4', 'bisnis', 'Baris 3', 'Meja B5', 4),
('B-R3-TB5-S5', 'bisnis', 'Baris 3', 'Meja B5', 5),
('B-R3-TB5-S6', 'bisnis', 'Baris 3', 'Meja B5', 6),
-- Table B6
('B-R3-TB6-S1', 'bisnis', 'Baris 3', 'Meja B6', 1),
('B-R3-TB6-S2', 'bisnis', 'Baris 3', 'Meja B6', 2),
('B-R3-TB6-S3', 'bisnis', 'Baris 3', 'Meja B6', 3),
('B-R3-TB6-S4', 'bisnis', 'Baris 3', 'Meja B6', 4),
('B-R3-TB6-S5', 'bisnis', 'Baris 3', 'Meja B6', 5),
('B-R3-TB6-S6', 'bisnis', 'Baris 3', 'Meja B6', 6),
-- Table B7
('B-R3-TB7-S1', 'bisnis', 'Baris 3', 'Meja B7', 1),
('B-R3-TB7-S2', 'bisnis', 'Baris 3', 'Meja B7', 2),
('B-R3-TB7-S3', 'bisnis', 'Baris 3', 'Meja B7', 3),
('B-R3-TB7-S4', 'bisnis', 'Baris 3', 'Meja B7', 4),
('B-R3-TB7-S5', 'bisnis', 'Baris 3', 'Meja B7', 5),
('B-R3-TB7-S6', 'bisnis', 'Baris 3', 'Meja B7', 6),
-- Table B8
('B-R3-TB8-S1', 'bisnis', 'Baris 3', 'Meja B8', 1),
('B-R3-TB8-S2', 'bisnis', 'Baris 3', 'Meja B8', 2),
('B-R3-TB8-S3', 'bisnis', 'Baris 3', 'Meja B8', 3),
('B-R3-TB8-S4', 'bisnis', 'Baris 3', 'Meja B8', 4),
('B-R3-TB8-S5', 'bisnis', 'Baris 3', 'Meja B8', 5),
('B-R3-TB8-S6', 'bisnis', 'Baris 3', 'Meja B8', 6);

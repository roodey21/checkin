-- Setup database for Web Check-in System

-- 1. Create participants table
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  no_wa TEXT,
  kategori TEXT CHECK (kategori IN ('eksekutif', 'bisnis')) NOT NULL,
  booking_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create seats table
CREATE TABLE IF NOT EXISTS seats (
  id TEXT PRIMARY KEY, -- e.g. E1-1, B1-1
  kategori TEXT CHECK (kategori IN ('eksekutif', 'bisnis')) NOT NULL,
  row_name TEXT NOT NULL, -- e.g. E1, B1
  seat_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID UNIQUE REFERENCES participants(id) ON DELETE CASCADE,
  seat_id TEXT UNIQUE REFERENCES seats(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create seat_locks table
CREATE TABLE IF NOT EXISTS seat_locks (
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

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access to seats" ON seats;
DROP POLICY IF EXISTS "Allow public read access to bookings" ON bookings;
DROP POLICY IF EXISTS "Allow public read access to seat_locks" ON seat_locks;

-- Create public read policies
CREATE POLICY "Allow public read access to seats" ON seats FOR SELECT USING (true);
CREATE POLICY "Allow public read access to bookings" ON bookings FOR SELECT USING (true);
CREATE POLICY "Allow public read access to seat_locks" ON seat_locks FOR SELECT USING (true);

-- Enable Realtime for bookings and seat_locks
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE seat_locks;

-- 10. Seed Seats Data
-- Executive (20 seats)
INSERT INTO seats (id, kategori, row_name, seat_number) VALUES
('E1-1', 'eksekutif', 'E1', 1), ('E1-2', 'eksekutif', 'E1', 2), ('E1-3', 'eksekutif', 'E1', 3), ('E1-4', 'eksekutif', 'E1', 4), ('E1-5', 'eksekutif', 'E1', 5),
('E2-1', 'eksekutif', 'E2', 1), ('E2-2', 'eksekutif', 'E2', 2), ('E2-3', 'eksekutif', 'E2', 3), ('E2-4', 'eksekutif', 'E2', 4), ('E2-5', 'eksekutif', 'E2', 5),
('E3-1', 'eksekutif', 'E3', 1), ('E3-2', 'eksekutif', 'E3', 2), ('E3-3', 'eksekutif', 'E3', 3), ('E3-4', 'eksekutif', 'E3', 4), ('E3-5', 'eksekutif', 'E3', 5),
('E4-1', 'eksekutif', 'E4', 1), ('E4-2', 'eksekutif', 'E4', 2), ('E4-3', 'eksekutif', 'E4', 3), ('E4-4', 'eksekutif', 'E4', 4), ('E4-5', 'eksekutif', 'E4', 5)
ON CONFLICT (id) DO NOTHING;

-- Business B1 & B2 (7 seats each, 14 total)
INSERT INTO seats (id, kategori, row_name, seat_number) VALUES
('B1-1', 'bisnis', 'B1', 1), ('B1-2', 'bisnis', 'B1', 2), ('B1-3', 'bisnis', 'B1', 3), ('B1-4', 'bisnis', 'B1', 4), ('B1-5', 'bisnis', 'B1', 5), ('B1-6', 'bisnis', 'B1', 6), ('B1-7', 'bisnis', 'B1', 7),
('B2-1', 'bisnis', 'B2', 1), ('B2-2', 'bisnis', 'B2', 2), ('B2-3', 'bisnis', 'B2', 3), ('B2-4', 'bisnis', 'B2', 4), ('B2-5', 'bisnis', 'B2', 5), ('B2-6', 'bisnis', 'B2', 6), ('B2-7', 'bisnis', 'B2', 7)
ON CONFLICT (id) DO NOTHING;

-- Business B3-B8 (6 seats each, 36 total)
INSERT INTO seats (id, kategori, row_name, seat_number) VALUES
('B3-1', 'bisnis', 'B3', 1), ('B3-2', 'bisnis', 'B3', 2), ('B3-3', 'bisnis', 'B3', 3), ('B3-4', 'bisnis', 'B3', 4), ('B3-5', 'bisnis', 'B3', 5), ('B3-6', 'bisnis', 'B3', 6),
('B4-1', 'bisnis', 'B4', 1), ('B4-2', 'bisnis', 'B4', 2), ('B4-3', 'bisnis', 'B4', 3), ('B4-4', 'bisnis', 'B4', 4), ('B4-5', 'bisnis', 'B4', 5), ('B4-6', 'bisnis', 'B4', 6),
('B5-1', 'bisnis', 'B5', 1), ('B5-2', 'bisnis', 'B5', 2), ('B5-3', 'bisnis', 'B5', 3), ('B5-4', 'bisnis', 'B5', 4), ('B5-5', 'bisnis', 'B5', 5), ('B5-6', 'bisnis', 'B5', 6),
('B6-1', 'bisnis', 'B6', 1), ('B6-2', 'bisnis', 'B6', 2), ('B6-3', 'bisnis', 'B6', 3), ('B6-4', 'bisnis', 'B6', 4), ('B6-5', 'bisnis', 'B6', 5), ('B6-6', 'bisnis', 'B6', 6),
('B7-1', 'bisnis', 'B7', 1), ('B7-2', 'bisnis', 'B7', 2), ('B7-3', 'bisnis', 'B7', 3), ('B7-4', 'bisnis', 'B7', 4), ('B7-5', 'bisnis', 'B7', 5), ('B7-6', 'bisnis', 'B7', 6),
('B8-1', 'bisnis', 'B8', 1), ('B8-2', 'bisnis', 'B8', 2), ('B8-3', 'bisnis', 'B8', 3), ('B8-4', 'bisnis', 'B8', 4), ('B8-5', 'bisnis', 'B8', 5), ('B8-6', 'bisnis', 'B8', 6)
ON CONFLICT (id) DO NOTHING;

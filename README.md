# PTPN Finance & Risk Leaders Forum 2026
## Web Check-in System

### Tech Stack
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Realtime + RLS)
- **Email**: Nodemailer (SMTP)
- **Export**: html2canvas + jsPDF

---

### Setup Instructions

#### 1. Install dependencies
```bash
npm install
```

#### 2. Setup Supabase
1. Buat project baru di [supabase.com](https://supabase.com)
2. Buka **SQL Editor** dan jalankan file `supabase/schema.sql`
3. Salin **Project URL** dan **anon key** dari Settings > API

#### 3. Configure environment
```bash
cp .env.example .env.local
```
Isi semua nilai di `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — dari Supabase Settings > API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — dari Supabase Settings > API
- `SUPABASE_SERVICE_ROLE_KEY` — dari Supabase Settings > API (jangan expose ke client!)
- `ADMIN_PASSWORD` — password untuk akses `/admin`
- SMTP credentials untuk kirim email

#### 4. Run development server
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000)

---

### Routes

| Route | Keterangan |
|-------|------------|
| `/` | Redirect ke `/checkin` |
| `/checkin` | Halaman input kode booking |
| `/checkin/seat` | Seat map & pilih kursi |
| `/checkin/boarding-pass` | Boarding pass + download |
| `/admin` | Admin panel (password protected) |
| `/admin/participants` | Kelola peserta & kode booking |

---

### Database Structure

```
participants     → data peserta + kode booking
seats            → 70 kursi (20 eksekutif + 50 bisnis)
bookings         → relasi peserta ↔ kursi (setelah konfirmasi)
```

### Seat Layout

**Eksekutif (baris depan, dekat stage):**
- E1, E2, E3, E4 — masing-masing 5 kursi

**Bisnis:**
- B1, B2 — masing-masing 7 kursi (48 + 2 extra = 50 total)
- B3–B8 — masing-masing 6 kursi

---

### Admin Workflow

1. Buka `/admin` dan login dengan `ADMIN_PASSWORD`
2. Upload CSV dari Google Form (format: nama, email, no_wa, kategori)
3. Klik **Generate Kode Booking** — sistem auto-generate kode unik
4. Klik **Kirim Email** — semua peserta dapat email undangan + kode

**Format CSV yang diterima:**
```
nama,email,no_wa,kategori
John Doe,john@example.com,08123456789,eksekutif
Jane Smith,jane@example.com,08987654321,bisnis
```

---

### Realtime Seat Locking

- Peserta klik kursi → kursi di-**lock** selama **5 menit**
- Semua sesi lain melihat kursi berubah jadi kuning (locked) secara realtime
- Jika tidak dikonfirmasi dalam 5 menit, lock otomatis dilepas
- Konfirmasi → kursi berubah merah (taken) secara realtime

---

### Boarding Pass Export

- **Download JPG** — via html2canvas, cocok untuk simpan di HP
- **Download PDF** — via jsPDF, optimal untuk cetak
- **Print** — via window.print() dengan print stylesheet

---

### Deployment

```bash
npm run build
npm start
```

Atau deploy ke **Vercel** (recommended):
1. Push ke GitHub
2. Import di vercel.com
3. Set environment variables di Vercel dashboard

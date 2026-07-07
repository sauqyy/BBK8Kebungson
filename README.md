# Kas KKN — Dashboard Bendahara

Dashboard sederhana untuk mengelola kas KKN: bendahara mengelola anggota & memantau seluruh kas, anggota bisa mencatat pemasukan/pengeluaran sendiri.

## Stack

- Backend: Flask + SQLAlchemy + Flask-JWT-Extended (Python)
- Frontend: React + Vite + Tailwind CSS v4 + Recharts
- Database: PostgreSQL (production) / SQLite (dev tanpa setup)

## Fitur

- Login dengan role **bendahara** dan **anggota**
- Ringkasan: saldo, total pemasukan/pengeluaran, arus kas bulanan, pengeluaran per kategori, transaksi terbaru
- Transaksi: cari & filter, tambah pemasukan/pengeluaran, upload bukti (foto/PDF), export laporan ke Excel & PDF
- Anggota: rekap disetor/dikeluarkan/jumlah transaksi per anggota, bendahara bisa tambah/hapus anggota + isi rekening saat menambah
- Penggantian dana: saat anggota mengajukan pengeluaran pakai uang pribadi, muncul di daftar "Menunggu Penggantian" bendahara — bendahara bisa lihat rekening (+ salin nomor), lalu konfirmasi sudah bayar (dengan upload bukti transfer opsional) yang otomatis mengirim notifikasi email ke anggota tersebut

## Menjalankan secara lokal

### Backend

```
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env        # lalu sesuaikan DATABASE_URL kalau pakai PostgreSQL
python seed.py                 # buat tabel + isi data contoh
python run.py                  # jalan di http://127.0.0.1:5000
```

Tanpa `DATABASE_URL` di `.env`, backend otomatis pakai SQLite lokal (`backend/instance/kas_kkn.db`) — cocok untuk coba-coba tanpa install PostgreSQL.

Untuk pakai PostgreSQL, install PostgreSQL lalu isi di `.env`:
```
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/kas_kkn
```

#### Notifikasi email (opsional)

Supaya notifikasi "penggantian sudah dibayar" benar-benar terkirim, isi di `.env`:
```
MAIL_USERNAME=emailkamu@gmail.com
MAIL_PASSWORD=app-password-16-digit   # dari myaccount.google.com/apppasswords, BUKAN password login biasa
```
Kalau dikosongkan, fitur email otomatis di-skip (aksi tetap tersimpan, hanya notifikasi emailnya tidak terkirim).

`MAIL_TEST_OVERRIDE_TO` bisa diisi untuk mengarahkan SEMUA email ke satu alamat tertentu — berguna untuk testing supaya tidak nyasar ke email anggota yang belum tentu asli. Kosongkan di pemakaian sungguhan supaya email terkirim ke masing-masing anggota.

### Frontend

```
cd frontend
npm install
npm run dev                    # jalan di http://localhost:5173, proxy /api ke backend
```

### Akun demo (setelah `python seed.py`)

Semua akun pakai password: `password123`

| Nama | Email | Role |
|---|---|---|
| Ahmad Fauzi | ahmad.fauzi@kkn.local | bendahara |
| Rafi Pratama | rafi.pratama@kkn.local | anggota |
| Siti Rahayu | siti.rahayu@kkn.local | anggota |
| Budi Santoso | budi.santoso@kkn.local | anggota |
| Dewi Lestari | dewi.lestari@kkn.local | anggota |
| Andi Wijaya | andi.wijaya@kkn.local | anggota |

## Catatan

- Hanya bendahara yang bisa menambah/menghapus anggota dan menghapus transaksi milik orang lain.
- Anggota bisa menambah transaksi dan menghapus transaksinya sendiri.
- File bukti transaksi disimpan di `backend/uploads/`.

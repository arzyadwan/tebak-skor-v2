# Product Requirements Document (PRD)
## Aplikasi Tebak Skor Bola untuk Event Nobar

**Versi:** 1.0
**Tanggal:** 15 Juli 2026
**Pemilik Produk:** [Nama Anda]

---

## 1. Latar Belakang & Tujuan

Acara nonton bareng (nobar) sering kali membutuhkan elemen interaktif agar penonton lebih terlibat sebelum dan selama pertandingan berlangsung. Aplikasi ini dibuat untuk memungkinkan penonton menebak skor pertandingan sebelum kick-off, lalu menampilkan papan peringkat (leaderboard) dan skor pertandingan secara live, lengkap dengan daftar tebakan seluruh peserta.

**Tujuan utama:**
- Meningkatkan engagement peserta nobar melalui fitur tebak skor.
- Menyediakan panitia (host) satu tempat untuk mengelola pertandingan, mengumpulkan tebakan, dan menampilkan hasil secara real-time di layar acara.
- Menentukan pemenang secara otomatis dan transparan.

---

## 2. Target Pengguna

| Peran | Deskripsi |
|---|---|
| **Peserta (Penonton)** | Mengisi nama dan tebakan skor melalui website sebelum batas waktu yang ditentukan. |
| **Host/Admin (Anda)** | Membuat event, menentukan pertandingan, mengatur waktu tutup tebakan, memasukkan skor live, dan menampilkan papan skor ke layar acara. |

---

## 3. Ruang Lingkup Produk

### 3.1 Fitur untuk Peserta
1. **Form Input Tebakan**
   - Input nama/nickname peserta.
   - Pilih pertandingan (jika ada lebih dari satu di event yang sama).
   - Input tebakan skor (Tim A - Tim B).
   - Opsional: tebakan pencetak gol pertama, atau tebakan lain sebagai fitur tambahan.
   - Validasi: satu peserta hanya bisa submit satu tebakan per pertandingan (dicegah lewat device/browser session atau nomor HP/nama unik).
2. **Konfirmasi Submit**
   - Menampilkan ringkasan tebakan setelah berhasil dikirim.
   - Tebakan terkunci setelah waktu tutup submission (misalnya kick-off dimulai) — tidak bisa diedit lagi.
3. **Halaman Status (opsional)**
   - Peserta bisa melihat tebakannya sendiri sudah tercatat.

### 3.2 Fitur untuk Host/Admin
1. **Dashboard Admin**
   - Login sederhana (password/PIN) khusus host.
   - Buat/edit event dan pertandingan (nama tim, jadwal, waktu tutup tebakan).
   - Lihat jumlah peserta yang sudah submit secara real-time.
2. **Input Skor Live**
   - Admin memasukkan/update skor berjalan (live score) selama pertandingan.
   - Update skor otomatis memperbarui halaman papan skor tanpa refresh manual (real-time).
3. **Halaman Papan Skor (Display Publik/Layar Nobar)**
   - Menampilkan skor live pertandingan secara mencolok.
   - Menampilkan leaderboard/papan peringkat peserta berdasarkan ketepatan tebakan (misalnya: skor tepat = poin tertinggi, tebak menang/kalah/seri tepat tapi skor beda = poin lebih rendah).
   - Menampilkan daftar seluruh tebakan peserta (nama + tebakan skor masing-masing), bisa di-highlight mana yang paling mendekati skor aktual.
4. **Penentuan Pemenang**
   - Sistem otomatis menghitung dan mengurutkan peserta berdasarkan skema poin setelah pertandingan selesai (final score dimasukkan admin).

### 3.3 Di Luar Ruang Lingkup (Non-Goals) — v1
- Integrasi otomatis dengan API skor bola pihak ketiga (skor tetap diinput manual oleh admin di v1).
- Sistem pembayaran/hadiah otomatis.
- Aplikasi mobile native (fokus web responsif dulu).
- Multi-event bersamaan yang kompleks (v1 fokus 1 event nobar dengan 1 atau beberapa pertandingan).

---

## 4. Alur Pengguna (User Flow)

**Peserta:**
1. Buka link/QR code website tebak skor yang dibagikan admin.
2. Isi nama dan tebakan skor pertandingan.
3. Submit → dapat konfirmasi.
4. Menunggu pertandingan dimulai; form ditutup otomatis.

**Admin:**
1. Login ke dashboard admin.
2. Buat event & pertandingan, atur waktu tutup submission.
3. Bagikan link form ke peserta (QR code/tautan).
4. Saat pertandingan berlangsung, buka halaman "Papan Skor" di layar besar/proyektor nobar, lalu update skor live dari dashboard admin (bisa dari HP terpisah).
5. Setelah pertandingan selesai, sistem menampilkan pemenang berdasarkan tebakan paling akurat.

---

## 5. Skema Penilaian (Contoh — bisa disesuaikan)

| Kondisi Tebakan | Poin |
|---|---|
| Skor tebakan tepat persis (misal 2-1 dan hasil akhir 2-1) | 3 poin |
| Selisih gol & hasil (menang/seri/kalah) tepat, tapi skor persis beda | 1 poin |
| Hasil (menang/seri/kalah) tepat saja | 1 poin |
| Semua salah | 0 poin |

*(Skema ini adalah contoh default; sebaiknya dikonfirmasi sesuai keinginan Anda dan bisa dibuat konfigurable oleh admin.)*

---

## 6. Kebutuhan Non-Fungsional

| Aspek | Kebutuhan |
|---|---|
| **Real-time update** | Papan skor & leaderboard harus update otomatis (live) tanpa perlu refresh manual — bisa pakai polling interval singkat atau websocket. |
| **Device** | Harus responsif — peserta submit dari HP, papan skor ditampilkan di layar besar/TV/proyektor. |
| **Kapasitas** | Cukup untuk skala event nobar kecil-menengah (puluhan hingga ratusan peserta). |
| **Keamanan sederhana** | Admin dashboard diproteksi PIN/password; peserta tidak butuh akun, cukup submit sekali. |
| **Ketersediaan** | Harus stabil selama durasi pertandingan (90+ menit non-stop). |
| **Anti-duplikat submission** | Mencegah 1 orang submit berkali-kali (misalnya via cek nama unik, session, atau nomor HP). |

---

## 7. Halaman/Screen yang Dibutuhkan

1. **Landing/Form Tebakan** (untuk peserta)
2. **Halaman Konfirmasi** (setelah submit)
3. **Dashboard Admin** (login, kelola event, input skor live)
4. **Halaman Papan Skor Publik** (live score + leaderboard + daftar tebakan — ini yang ditampilkan ke layar nobar)

---

## 8. Metrik Keberhasilan

- Jumlah peserta yang berhasil submit tebakan sebelum waktu tutup.
- Tidak ada kendala teknis (crash/lag) saat live update skor berlangsung.
- Panitia dapat menampilkan hasil pemenang dengan mudah di akhir acara.

---

## 9. Pertanyaan Terbuka (Perlu Konfirmasi Sebelum Development)

1. Berapa perkiraan jumlah peserta yang akan ikut nobar ini?
2. Apakah hanya 1 pertandingan per event, atau ada beberapa pertandingan sekaligus?
3. Apakah skema poin di atas sudah sesuai, atau ada aturan tebakan khusus (misal tebak pencetak gol, kartu, dll)?
4. Apakah dibutuhkan hadiah/reward yang perlu dicatat sistem (misal otomatis menandai top 3)?
5. Apakah acara ini sekali pakai (one-off event) atau akan dipakai berulang untuk nobar berikutnya?

---

## 10. Rencana Teknis Singkat (Opsional — high level)

- **Frontend:** Web app responsif (form peserta + halaman papan skor publik + dashboard admin).
- **Backend/Database:** Penyimpanan data event, pertandingan, tebakan peserta, dan skor live.
- **Real-time:** Mekanisme polling/refresh otomatis singkat (misal setiap 3–5 detik) atau websocket agar papan skor selalu ter-update saat admin input skor baru.

---

*Dokumen ini adalah draf awal PRD dan dapat disesuaikan berdasarkan masukan lebih lanjut, terutama terkait skema poin, jumlah peserta, dan fitur tambahan yang diinginkan.*

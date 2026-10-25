# Sistem Kehadiran QR Sekolah Rendah Malaysia

Sistem Kehadiran QR Sekolah Rendah Malaysia ialah aplikasi web moden, selamat dan responsif yang dibina dari awal (*from scratch*) untuk merekod kehadiran murid sekolah rendah menggunakan kad kod QR unik. Sistem ini dioptimumkan untuk kapasiti sekolah rendah Malaysia (1–300 murid), dengan sokongan peranti telefon pintar Android, tablet, komputer riba dan desktop.

---

## 1. STRUKTUR PROJEK

```text
qr-kehadiran-sekolah/
├── .env.example                     # Templat pemboleh ubah persekitaran Firebase & Sekolah
├── .gitignore                       # Mengelakkan kebocoran rahsia dan node_modules
├── firebase.json                    # Konfigurasi Firebase Hosting, Functions & Emulators
├── firestore.rules                  # Peraturan keselamatan Firestore (RBAC & Deny-by-default)
├── firestore.indexes.json           # Indeks komposit Firestore untuk pertanyaan laporan pantas
├── index.html                       # HTML root templat rasmi sekolah
├── package.json                     # Konfigurasi pakej dan skrip binaan/ujian
├── tsconfig.json                    # Konfigurasi asas TypeScript
├── tsconfig.app.json                # Konfigurasi TypeScript React/Vite
├── vercel.json                      # Konfigurasi SPA routing fallback untuk Vercel
├── vite.config.ts                   # Konfigurasi Vite & Tailwind CSS v4
├── vitest.config.ts                 # Konfigurasi suit ujian automatik
│
├── functions/                       # Backend Cloud Functions (Node.js & Firebase Admin SDK)
│   ├── src/
│   │   ├── index.ts                 # Operasi atomik kehadiran, bootstrap & token crypto
│   │   └── types.ts                 # Definisi jenis data TypeScript backend
│   ├── package.json                 # Pakej fungsi backend
│   └── tsconfig.json                # Binaan TypeScript fungsi
│
├── src/
│   ├── components/
│   │   ├── attendance/
│   │   │   ├── AttendanceCorrectionModal.tsx  # Pembetulan kehadiran dengan sebab mandatori
│   │   │   └── SessionControl.tsx             # Kawalan sesi buka/tutup & ambang lewat
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx                  # Susun atur aplikasi utama
│   │   │   ├── Navbar.tsx                     # Bar navigasi atas & lencana peranan
│   │   │   ├── ProtectedRoute.tsx             # Kawalan capaian berasaskan peranan & bootstrap
│   │   │   └── Sidebar.tsx                    # Menu navigasi 10 paparan & laci mudah alih
│   │   ├── qr/
│   │   │   ├── QRCardView.tsx                 # Paparan kad individu & susun atur A4 (8 kad/muka)
│   │   │   └── QRScanner.tsx                  # Pengimbas html5-qrcode & penindasan pendua
│   │   ├── students/
│   │   │   ├── ImportModal.tsx                # Import CSV/Excel dengan pratonton & validasi
│   │   │   ├── StudentModal.tsx               # Tambah & kemaskini maklumat murid
│   │   │   └── TransferClassModal.tsx         # Pindah kelas murid mengekalkan rekod lampau
│   │   └── ui/
│   │       ├── Badge.tsx                      # Lencana status (Hadir, Lewat, Tidak Hadir)
│   │       ├── Button.tsx                     # Butang UI serba guna
│   │       ├── Card.tsx                       # Kad kontena UI
│   │       └── Modal.tsx                      # Kotak dialog modal responsif
│   ├── hooks/
│   │   └── useAuth.tsx                        # Konteks pengesahan & pengurusan peranan pengguna
│   ├── pages/
│   │   ├── AttendancePage.tsx                 # Semakan kehadiran harian & senarai belum hadir
│   │   ├── AuditLogsPage.tsx                  # Paparan jejak audit transaksi keselamatan
│   │   ├── ClassesPage.tsx                    # Pengurusan senarai kelas Tahun 1 hingga Tahun 6
│   │   ├── DashboardPage.tsx                  # Dashboard statistik eksekutif & imbasan terkini
│   │   ├── LoginPage.tsx                      # Log masuk guru/staf & tetapan semula kata laluan
│   │   ├── PrintCardsPage.tsx                 # Penjanaan kod & cetakan kad QR
│   │   ├── ReportsPage.tsx                    # Laporan bulanan, peratusan & eksport Excel
│   │   ├── ScanPage.tsx                       # Antara muka pengimbas kehadiran mudah alih
│   │   ├── SettingsPage.tsx                   # Takwim cuti/hari sekolah & waktu ambang sesi
│   │   └── UsersPage.tsx                      # Pengurusan akaun pentadbir, guru dan staf
│   ├── services/
│   │   ├── attendanceService.ts               # Transaksi rekod imbasan, pembetulan & sesi
│   │   ├── auditService.ts                    # Penulisan log audit tidak boleh dipadam
│   │   ├── authService.ts                     # Log masuk, bootstrap pentadbir & peranan
│   │   ├── calendarService.ts                 # Takwim hari persekolahan & cuti
│   │   ├── classService.ts                    # Operasi pangkalan data kelas
│   │   ├── firebase.ts                        # Inisialisasi Firebase Web SDK & Emulator
│   │   ├── qrService.ts                       # Hashing SHA-256 & penjanaan imej QR
│   │   └── studentService.ts                  # Pendaftaran murid, import pukal & templat
│   ├── types/
│   │   └── index.ts                           # Definisi model data (Student, Class, Record, dsb.)
│   ├── utils/
│   │   ├── dateUtils.ts                       # Utiliti tarikh & waktu (Asia/Kuala_Lumpur)
│   │   └── exportExcel.ts                     # Eksport Excel (xlsx) & perlindungan Formula Injection
│   ├── App.tsx                                # Struktur routing aplikasi
│   ├── index.css                              # Gaya Tailwind CSS v4 & peraturan cetakan A4
│   └── main.tsx                               # Titik mula aplikasi React
│
└── tests/                                     # Suit Ujian Automatik
    ├── attendance.test.ts                     # Ujian logik kehadiran, pendua, sesi & token
    ├── calendar-reports.test.ts               # Ujian takwim, cuti, formula peratusan & Excel
    ├── security-auth.test.ts                  # Ujian keselamatan akses & kenaikan peranan
    └── students-classes.test.ts               # Ujian import pendua & snapshot sejarah kelas
```

---

## 2. CIRI-CIRI UTAMA SISTEM

### A. Pengurusan Peranan Pengguna (RBAC)
1. **Pentadbir (ADMIN):**
   - Mengurus pendaftaran dan pemindahan kelas murid.
   - Mengimport murid pukal melalui Excel / CSV dengan pengesahan format lajur.
   - Menjana dan mencetak kad QR (individu atau pukal helaian A4).
   - Membatalkan kad QR yang hilang dan menjana kad penggantian secara automatik.
   - Menetapkan masa buka/tutup sesi dan ambang had lewat (contoh: 07:30 pagi).
   - Membetulkan rekod kehadiran dengan **sebab mandatori** dan jejak audit penuh.
   - Menjana dan mengeksport 4 lembaran buku kerja Excel rasmi.
   - Mengurus peranan akaun guru & staf serta takwim persekolahan.
2. **Guru (TEACHER):**
   - Mengimbas kad QR murid menggunakan kamera telefon atau komputer riba.
   - Melihat senarai kehadiran kelas dan menyemak murid yang belum hadir.
3. **Staf Bertugas (STAFF):**
   - Mengimbas kad kehadiran murid pada sesi yang aktif.
   - Melihat pengesahan visual murid (nama penuh, kelas dan waktu pengesahan).

### B. Keselamatan Kad Kod QR
- Kod QR **TIDAK MENGANDUNGI** nama, nombor kad pengenalan (IC) atau maklumat peribadi murid.
- Kod QR hanya mengandungi **token rawak kriptografik berkepadatan tinggi** (`SKRM_...`).
- Pangkalan data hanya menyimpan nilai **SHA-256 hash** bagi token tersebut.
- Token boleh dibatalkan (*revoked*) pada bila-bila masa jika kad hilang tanpa memadamkan rekod kehadiran lampau.

### C. Kehadiran Sesi Pagi & Sesi Pulang
- Sesi **PAGI** dan **PULANG** beroperasi secara berasingan.
- Penentuan status `HADIR` atau `LEWAT` dihitung secara automatik berdasarkan waktu pelayan (*server time*) berbanding ambang masa yang ditetapkan oleh pihak sekolah.
- ID rekod deterministik: `${studentId}_${tarikh}_${sesi}` menjamin tiada rekod pendua tercipta semasa imbasan serentak.

### D. Laporan dan Eksport Excel Kebal Suntikan Formula
- Formula peratusan kehadiran rasmi:  
  $$\text{Peratus Kehadiran} = \frac{\text{Hadir} + \text{Lewat}}{\text{Jumlah Hari Persekolahan Layak}} \times 100\%$$
- Menghasilkan 4 lembaran kerja lengkap (`Ringkasan Bulanan`, `Rekod Kehadiran`, `Statistik Kelas`, `Rekod Individu`).
- Perlindungan *Formula Injection / DDE*: semua teks yang bermula dengan `=`, `+`, `-`, atau `@` disanitasi secara automatik dengan tanda petikan tunggal (`'`).

---

## 3. ARAHAN PEMASANGAN & MENJALANKAN SISTEM SECARA TEMPATAN

### Keperluan Sistem:
- **Node.js**: Versi 18 atau ke atas (disyorkan Node.js 20 LTS atau 22).
- **Pengurus Pakej**: `npm`.

### Langkah-langkah:

1. **Buka Terminal dan Navigasi ke Direktori Projek:**
   ```bash
   cd qr-kehadiran-sekolah
   ```

2. **Pasang Ketergantungan Frontend:**
   ```bash
   npm install
   ```

3. **Pasang Ketergantungan Cloud Functions:**
   ```bash
   cd functions
   npm install
   cd ..
   ```

4. **Sediakan Fail Persekitaran (`.env`):**
   Salin fail templat `.env.example` kepada `.env`:
   ```bash
   cp .env.example .env
   ```
   *(Pada Windows PowerShell: `Copy-Item .env.example .env`)*  
   Kemaskini nilai konfigurasi Firebase daripada Firebase Console projek anda.

5. **Jalankan Suit Ujian Automatik:**
   ```bash
   npm test
   ```

6. **Jalankan Pelayan Pembangunan Tempatan:**
   ```bash
   npm run dev
   ```
   Aplikasi akan boleh diakses melalui pelayar di `http://localhost:3000`.

7. **Jalankan Ujian Binaan Pengeluaran (*Production Build*):**
   ```bash
   npm run build
   ```

---

## 4. PANDUAN PENYEDIAAN FIREBASE (FIREBASE SETUP INSTRUCTIONS)

Ikuti langkah-langkah di bawah dalam [Firebase Console](https://console.firebase.google.com/):

### Langkah 1: Cipta Projek Firebase Baharu
1. Tekan **"Add project"** dan namakan projek (contoh: `kehadiran-sk-seri-makmur`).
2. Nyahaktifkan atau aktifkan Google Analytics mengikut pilihan sekolah.
3. Tekan **"Create project"**.

### Langkah 2: Aktifkan Firebase Authentication
1. Pada menu sebelah kiri, pilih **Build > Authentication**.
2. Tekan **"Get started"**.
3. Pada tab **Sign-in method**, pilih **Email/Password**.
4. Aktifkan suis **Enable** bagi *Email/Password* (tinggalkan *Email link* tidak bertanda).
5. Tekan **Save**.

### Langkah 3: Cipta Pangkalan Data Cloud Firestore
1. Pada menu sebelah kiri, pilih **Build > Firestore Database**.
2. Tekan **"Create database"**.
3. Pilih lokasi pangkalan data terdekat dengan Malaysia: **asia-southeast1 (Singapore)**.
4. Pilih **"Start in production mode"** (jangan pilih test mode).
5. Tekan **Create**.

### Langkah 4: Muat Naik Peraturan Keselamatan (`firestore.rules`)
1. Pasang Firebase CLI pada komputer anda (sekiranya belum ada):
   ```bash
   npm install -g firebase-tools
   ```
2. Log masuk ke akaun Google anda:
   ```bash
   firebase login
   ```
3. Pautkan ke projek Firebase anda:
   ```bash
   firebase use --add
   ```
4. Muat naik peraturan keselamatan dan indeks:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

### Langkah 5: Muat Naik Cloud Functions (Pilihan / Pengeluaran)
1. Firebase Cloud Functions memerlukan akaun pelan **Blaze (Pay as you go)**.
   *(Nota: Kos operasi kehadiran bagi sekolah 300 murid berada dalam had kuota percuma bulanan Google Cloud 2 juta panggilan/bulan).*
2. Bina dan muat naik fungsi:
   ```bash
   firebase deploy --only functions
   ```
3. *Sistem ini juga dilengkapi dengan mod sandaran selamat (fallback transaction) terus ke Firestore sekiranya fungsi Cloud Functions belum diaktifkan.*

### Langkah 6: Dapatkan Kunci Konfigurasi Web App
1. Di Firebase Console, pergi ke **Project Settings** (ikon gear di atas kiri) > **General**.
2. Pada bahagian **Your apps**, tekan ikon Web (`</>`).
3. Namakan aplikasi (contoh: `Web Kehadiran Sekolah`).
4. Salin kunci konfigurasi dan tampal ke dalam fail `.env` projek anda:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=projek-anda.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=projek-anda
   VITE_FIREBASE_STORAGE_BUCKET=projek-anda.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=1:...
   ```

---

## 5. PROSEDUR PENTADBIR PERTAMA (FIRST-ADMIN BOOTSTRAP)

Bagi menjamin keselamatan tanpa perlu *hardcode* kata laluan di dalam kod:

1. Buka aplikasi web di pelayar.
2. Di halaman log masuk, daftarkan akaun emel pentadbir sekolah (contoh: melalui Firebase Authentication Console > Users > Add user).
3. Log masuk menggunakan emel dan kata laluan tersebut.
4. Sistem akan mengesan bahawa **belum ada Pentadbir (ADMIN) berdaftar dalam pangkalan data**.
5. Skrin **"Penyediaan Akaun Sekolah"** akan dipaparkan dengan butang khas:  
   **"Lantik Sebagai Pentadbir Utama (ADMIN)"**.
6. Tekan butang tersebut. Akaun anda akan secara automatik dilantik sebagai `ADMIN` yang sah dan satu rekod log audit permulaan akan direkodkan.
7. Selepas Pentadbir pertama wujud, prosedur bootstrap ditutup serta-merta untuk menghalang mana-mana pengguna lain melantik diri sendiri.

---

## 6. PANDUAN PENYEDIAAN GITHUB & DEPLOYMENT KE VERCEL

### Langkah A: Muat Naik ke GitHub
1. Pastikan fail `.env` disenaraikan dalam `.gitignore` (sudah dikonfigurasi).
2. Mulakan repositori git tempatan:
   ```bash
   git init
   git add .
   git commit -m "feat: inisialisasi sistem kehadiran qr sekolah rendah malaysia"
   ```
3. Cipta repositori baharu di GitHub (disyorkan: **Private** bagi menjaga privasi sekolah).
4. Sambungkan dan tolak kod:
   ```bash
   git remote add origin https://github.com/NAMA_AKAUN/qr-kehadiran-sekolah.git
   git branch -M main
   git push -u origin main
   ```

### Langkah B: Penerbitan (*Deployment*) ke Vercel
1. Log masuk ke [Vercel](https://vercel.com/) menggunakan akaun GitHub anda.
2. Tekan **"Add New..." > "Project"**.
3. Pilih repositori `qr-kehadiran-sekolah` dan tekan **"Import"**.
4. Di bahagian **Project Configuration**:
   - **Framework Preset**: Pilih `Vite`.
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Buka bahagian **Environment Variables** dan masukkan pemboleh ubah daripada fail `.env`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_SCHOOL_NAME` (contoh: `SK SERI MAKMUR`)
   - `VITE_SCHOOL_CODE` (contoh: `BBA1234`)
   - `VITE_TIMEZONE` (`Asia/Kuala_Lumpur`)
6. Tekan **"Deploy"**.
7. Selepas siap, tambahkan domain pengeluaran Vercel anda (contoh: `https://qr-kehadiran-sekolah.vercel.app`) ke dalam **Firebase Console > Authentication > Settings > Authorized domains**.

---

## 7. KEPUTUSAN UJIAN AUTOMATIK (*TEST RESULTS*)

Suit ujian komprehensif mengesahkan 18 keperluan logik perniagaan dan keselamatan:

```text
✓ tests/attendance.test.ts (9 tests)
  ✓ 1. Menerima imbasan kad QR yang sah dan merekod status HADIR
  ✓ 2. Menolak imbasan kod QR yang tidak sah atau tiada dalam rekod
  ✓ 3. Menolak kod QR lama yang telah dibatalkan (Revoked QR)
  ✓ 4. Menolak imbasan kad sekiranya murid berstatus TIDAK AKTIF
  ✓ 5. Menghalang rekod pendua untuk murid pada tarikh dan sesi yang sama
  ✓ 6. Memastikan rekod kehadiran Pagi dan Pulang beroperasi secara bebas
  ✓ 7. Menolak sebarang imbasan sekiranya sesi telah DITUTUP oleh pentadbir
  ✓ 10. Memerlukan peranan ADMIN dan sebab mandatori (≥ 5 aksara) untuk pembetulan
  ✓ 18. Mengendalikan cubaan imbasan serentak tanpa menghasilkan rekod pendua

✓ tests/security-auth.test.ts (3 tests)
  ✓ 8. Menolak sebarang capaian daripada pengguna tidak berdaftar atau tanpa pengesahan
  ✓ 9. Menghalang guru atau staf daripada menaikkan peranan mereka kepada ADMIN (Privilege Escalation)
  ✓ 11. Merekodkan transaksi perubahan peranan ke dalam log audit dengan telus

✓ tests/calendar-reports.test.ts (4 tests)
  ✓ 12. Tidak mengira hari cuti sekolah atau hujung minggu sebagai ketidakhadiran murid
  ✓ 13. Tidak menganggap imbasan yang belum direkodkan sebagai ponteng sebelum sesi disahkan
  ✓ 14. Mengira peratusan kehadiran bulanan mengikut formula rasmi: (Hadir + Lewat) ÷ Hari Layak × 100%
  ✓ 15. Mencegah spreadsheet formula injection dengan menambah petikan tunggal pada medan berbahaya

✓ tests/students-classes.test.ts (2 tests)
  ✓ 16. Mengesan nombor murid pendua dalam sistem dan di dalam fail kelompok import
  ✓ 17. Memastikan rekod kehadiran lampau mengekalkan nama dan ID kelas asal selepas murid dipindahkan ke kelas baharu

Test Files: 4 passed (4)
Tests:      18 passed (18)
Duration:   ~611ms
```

---

## 8. HAD SISTEM (KNOWN LIMITATIONS) & AMALAN TERBAIK

1. **Mod Luar Talian (*Offline Scanning*):**
   Versi 1 memerlukan sambungan internet semasa pengimbasan bagi mengesahkan token secara masa nyata (*real-time*) dan menghalang rekod pendua rentas peranti. Mod luar talian penuh dengan *background sync* tidak disertakan dalam versi 1 mengikut spesifikasi projek.
2. **Kebenaran Akses Kamera (*Camera Permissions*):**
   Pelayar telefon (Android Chrome / Safari) memerlukan sambungan protokol selamat **HTTPS** untuk membenarkan akses kepada perkakasan kamera.
3. **Pengesahan Visual Guru:**
   Imbasan kad QR membuktikan kad telah diimbas di hadapan kamera. Guru bertugas dinasihatkan membuat pengesahan visual ringkas pada wajah murid semasa imbasan dijalankan untuk mengelakkan salah guna kad.

---

## 9. TINDAKAN MANUAL SEBELUM SISTEM BOLEH DIGUNAKAN DI SEKOLAH

Sebelum melancarkan sistem kehadiran kepada murid dan guru:
1. **Daftarkan Kelas Sekolah:** Masukkan senarai kelas (contoh: 1 ARIF, 2 BESTARI, dsb.) di menu **Senarai Kelas**.
2. **Daftarkan Murid:** Muat turun templat rasmi di menu **Pengurusan Murid > Import Fail Excel**, isikan maklumat murid dan muat naik semula.
3. **Cetak Kad QR Murid:** Masuk ke menu **Cetak Kad QR**, pilih mod **Cetakan Pukal A4**, cetak di atas kertas tebal/kad (*laminate*) dan agihkan kepada murid.
4. **Daftarkan Akaun Guru & Staf Bertugas:** Daftarkan emel guru di Firebase Auth atau menu Pengurusan Akaun dan berikan peranan `TEACHER` atau `STAFF`.
5. **Uji Imbasan Perintis:** Jalankan sesi latihan imbasan percubaan bersama guru bertugas menggunakan peranti telefon pintar guru.

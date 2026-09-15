# PYTHONIA — Akademi Kode Nusantara

Game pembelajaran Python baru untuk siswa SMA kelas X–XII. Siswa dapat belajar sendiri melalui 12 misi bertingkat atau membuka ruang kolaborasi hingga 8 pemain.

## Fitur

- Kota pixel-art besar yang dapat dijelajahi dengan karakter manusia beranimasi.
- Kontrol keyboard **WASD/tombol panah + E** dan kontrol sentuh untuk ponsel.
- D-pad arah dan tombol interaksi otomatis tampil pada ponsel, tablet, perangkat berlayar sentuh, serta mode landscape; tombol Tim, Jurnal, dan Menu tetap tersedia pada layar kecil.
- Tata kota mengikuti pola game Kota Komputasional: alun-alun dan fountain di pusat, jalan utama, 9 gedung besar, pepohonan, NPC, serta kamera yang mengikuti pemain.
- Setiap gedung dapat dimasuki melalui pintu dan memiliki interior tersendiri, terminal misi, mentor, dan pintu keluar kembali ke kota.
- Collision aktif pada batas kota, gedung, dan fountain; pemain tidak dapat berjalan menembus objek utama.
- 12 misi berurutan: kuis konsep, susun kode, praktik Python, dan debugging.
- Eksekusi Python asli di browser menggunakan Pyodide WebAssembly.
- Progres solo tersimpan otomatis di browser (`localStorage`).
- Dasbor XP, akurasi, streak, rekomendasi, dan ekspor laporan CSV.
- Multiplayer Firebase: ruang 6 karakter, karakter pemain lain tampil pada kota/interior yang sama, status siap, progres anggota, chat, dan Relay Algoritma.
- Responsif untuk laptop, tablet, dan ponsel.
- Workflow GitHub Actions untuk GitHub Pages sudah disertakan.

## Struktur tingkat

| Tingkat | Dunia | Materi | Misi |
| --- | --- | --- | --- |
| Kelas X | Pulau Logika | Algoritma, variabel, percabangan, perulangan | 01–04 |
| Kelas XI | Kepulauan Data | List, fungsi, dictionary, debugging | 05–08 |
| Kelas XII | Benteng Rekayasa | OOP, class, pipeline data, proyek analisis | 09–12 |

## A. Mencoba mode solo

Mode solo langsung berfungsi tanpa Firebase. Karena browser perlu memuat modul dan Pyodide, jangan membuka `index.html` langsung sebagai `file://`.

1. Ekstrak ZIP.
2. Buka Terminal/Command Prompt di folder hasil ekstraksi.
3. Jalankan:

   ```bash
   npm start
   ```

   Jika Node.js belum terpasang, gunakan:

   ```bash
   python3 -m http.server 8080 --directory dist
   ```

4. Buka `http://localhost:4173`. Jika memakai perintah Python alternatif, buka `http://localhost:8080`.

Di Windows, Anda juga dapat mengklik dua kali `start.bat` setelah Node.js terpasang.

Pada menu utama pilih **Mulai solo**, isi profil, kemudian:

- gunakan `W`, `A`, `S`, `D` atau tombol panah untuk berjalan;
- dekati pintu gedung atau NPC sampai prompt interaksi muncul;
- tekan `E`, `Enter`, atau `Spasi` untuk berinteraksi;
- setelah masuk gedung, dekati terminal bernomor untuk membuka misi dan gunakan pintu bawah untuk kembali ke kota;
- pada ponsel gunakan D-pad dan tombol **Interaksi**;
- buka **Jurnal** untuk melihat peta misi, daftar misi, dan progres belajar.

Koneksi internet diperlukan saat pertama kali mesin Python mengunduh Pyodide `314.0.7` dari CDN. Kuis dan susun kode tetap dapat dibuka apabila Pyodide tidak tersedia.

## B. Mengaktifkan multiplayer Firebase

### 1. Buat project Firebase

1. Masuk ke [Firebase Console](https://console.firebase.google.com/).
2. Klik **Create a project / Buat project**.
3. Beri nama, misalnya `pythonia-sekolah`.
4. Google Analytics tidak diwajibkan untuk game ini.
5. Tunggu sampai project selesai dibuat.

### 2. Aktifkan Anonymous Authentication

1. Buka project Firebase.
2. Pilih **Build → Authentication**.
3. Klik **Get started** jika diminta.
4. Buka tab **Sign-in method**.
5. Pilih **Anonymous**, aktifkan, lalu klik **Save**.

Game menggunakan akun anonim agar siswa tidak perlu memasukkan email atau kata sandi.

### 3. Buat Realtime Database

1. Pilih **Build → Realtime Database**.
2. Klik **Create Database**.
3. Pilih lokasi terdekat. Untuk Indonesia biasanya `asia-southeast1` jika tersedia.
4. Pilih **Start in locked mode**. Rules game akan dipasang pada langkah berikutnya.
5. Setelah database dibuat, salin URL yang terlihat di bagian atas halaman Data. Contoh:

   ```text
   https://pythonia-sekolah-default-rtdb.asia-southeast1.firebasedatabase.app
   ```

### 4. Ambil Web API Key

1. Klik ikon roda gigi di Firebase → **Project settings**.
2. Pada tab **General**, lihat bagian **Your project**.
3. Salin nilai **Web API Key**.
4. Jika belum ada aplikasi web, klik ikon `</>`, beri nama aplikasi, lalu **Register app**. Firebase akan menampilkan konfigurasi web; nilai yang diperlukan hanya `apiKey` dan `databaseURL`.

`apiKey` Firebase untuk aplikasi web memang dikirim ke browser; keamanan data tetap ditentukan oleh Authentication dan Database Rules. Jangan memasukkan service-account key atau private key ke repository.

### 5. Isi konfigurasi game

Buka `dist/multiplayer-config.json`, lalu ganti kedua placeholder:

```json
{
  "provider": "firebase",
  "firebase": {
    "apiKey": "API_KEY_WEB_FIREBASE_ANDA",
    "databaseURL": "https://PROJECT-ANDA-default-rtdb.asia-southeast1.firebasedatabase.app"
  },
  "maxPlayers": 8,
  "pollIntervalMs": 1500
}
```

Gunakan URL database persis seperti yang ditampilkan Firebase. Lokasi database tertentu dapat memakai akhiran `firebaseio.com`; itu juga valid.

### 6. Pasang Realtime Database Rules

1. Di Firebase, buka **Realtime Database → Rules**.
2. Hapus rules lama.
3. Salin seluruh isi `firebase.rules.json` dari paket ini.
4. Klik **Publish**.

Rules ini tidak menggunakan `numChildren()`. Metode itu tidak tersedia dalam bahasa Firebase Realtime Database Rules dan merupakan penyebab pesan **No such method/property 'numChildren'** pada rules sebelumnya. Batas 8 pemain diperiksa oleh game di sisi klien. Jika sekolah membutuhkan pembatasan jumlah yang benar-benar atomik di server, gunakan Cloud Functions atau desain delapan slot tetap.

Rules mengizinkan:

- hanya pengguna terautentikasi anonim yang membuat atau bergabung;
- hanya anggota ruang yang membaca data ruang;
- pemain hanya mengubah profilnya sendiri;
- hanya host yang mengubah status atau menutup ruang;
- hanya anggota yang mengirim chat dan mengisi Relay Algoritma;
- semua field penting divalidasi tipe dan panjangnya.

### 7. Uji multiplayer secara lokal

1. Jalankan server lokal seperti pada bagian A.
2. Buka game pada dua browser atau satu jendela normal dan satu incognito.
3. Isi profil berbeda di masing-masing jendela.
4. Di jendela pertama pilih **Main bersama → Buat ruang**.
5. Salin kode 6 karakter.
6. Di jendela kedua pilih **Main bersama → Gabung ruang** dan masukkan kode.
7. Keduanya menekan **Saya siap**; host menekan **Mulai sesi**.

## C. Menerbitkan ke GitHub Pages

### Cara paling mudah melalui website GitHub

1. Masuk ke [GitHub](https://github.com/) dan klik **New repository**.
2. Beri nama, misalnya `pythonia-akademi-kode`.
3. Pilih **Public**, lalu klik **Create repository**.
4. Pada halaman repository, pilih **uploading an existing file**.
5. Unggah **seluruh isi folder `pythonia-akademi-kode`**, bukan folder ZIP-nya. Pastikan yang berada di akar repository adalah `README.md`, `package.json`, `firebase.rules.json`, folder `dist`, dan folder `.github`.
6. Klik **Commit changes**.
7. Buka **Settings → Pages**.
8. Pada **Build and deployment**, atur **Source** menjadi **GitHub Actions**.
9. Buka tab **Actions** dan tunggu workflow “Deploy PYTHONIA ke GitHub Pages” berwarna hijau.
10. Kembali ke **Settings → Pages** untuk melihat alamat situs, biasanya:

    ```text
    https://NAMA-AKUN.github.io/pythonia-akademi-kode/
    ```

Setiap perubahan yang dikirim ke branch `main` akan otomatis divalidasi dan diterbitkan kembali.

### Alternatif melalui Git

```bash
git init
git add .
git commit -m "Publikasikan PYTHONIA"
git branch -M main
git remote add origin https://github.com/NAMA-AKUN/pythonia-akademi-kode.git
git push -u origin main
```

Setelah push, tetap pilih **Settings → Pages → Source → GitHub Actions**.

## Pemecahan masalah

| Gejala | Pemeriksaan |
| --- | --- |
| Multiplayer belum dikonfigurasi | Pastikan dua placeholder pada `dist/multiplayer-config.json` sudah diganti. |
| Anonymous Authentication belum aktif | Firebase → Authentication → Sign-in method → Anonymous → Enable. |
| Akses Firebase ditolak | Pastikan Rules sudah dipublikasikan pada **Realtime Database**, bukan Firestore. |
| Teman tidak dapat bergabung | Periksa kode ruang, databaseURL, koneksi, dan bahwa room belum lebih dari 24 jam. |
| Python gagal dimuat | Pastikan internet aktif dan jaringan sekolah mengizinkan `cdn.jsdelivr.net`. |
| GitHub Pages menampilkan 404 | Pastikan Source adalah GitHub Actions dan workflow berhasil. |
| Perubahan belum muncul | Tunggu workflow Actions selesai, lalu lakukan hard refresh browser. |

## Validasi sebelum mengunggah

Jalankan:

```bash
npm run validate
```

Perintah ini memeriksa struktur deployment, JSON, jumlah misi, pembagian tingkat, dan memastikan Firebase Rules tidak memakai `numChildren()`.

## Catatan privasi dan penggunaan kelas

- Profil solo tersimpan hanya pada browser siswa.
- Nama panggilan, kelas, progres ringkas, dan chat disimpan sementara di Realtime Database saat multiplayer.
- Ruang diberi waktu kedaluwarsa 24 jam, tetapi penghapusan otomatis memerlukan mekanisme terjadwal terpisah. Host dapat menutup ruang dengan keluar.
- Gunakan nama panggilan, bukan nama lengkap atau data pribadi siswa.

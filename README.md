# Portofolio Arsyad Kariman

Situs portofolio statis: **HTML + CSS + JavaScript murni**, tanpa build step. Bisa di-host di mana saja
(GitHub Pages, Netlify, Vercel, VPS, dll). Gaya mengikuti referensi: latar navy gelap, aksen biru,
efek kaca, meteor, orb, partikel, loader pembuka, dan lanyard 3D interaktif.

```
index.html            halaman utama (semua teks ada di sini)
css/style.css         seluruh gaya
js/config.js          PENGATURAN: nama, teks ketik, gambar, kunci form & komentar
js/main.js            logika halaman
js/lanyard.min.js     lanyard 3D (hasil bundel dari src/lanyard.js, sudah termasuk Three.js)
src/lanyard.js        kode sumber lanyard (hanya perlu kalau mau mengubah lanyard)
vendor/               GSAP + ScrollTrigger
assets/skills/        ikon skill
supabase.sql          tabel komentar publik
favicon.svg, .nojekyll
```

## 1. Coba di komputer
Cukup buka `index.html`. Atau, supaya sama persis dengan hosting sungguhan:

```bash
python3 -m http.server 8000     # lalu buka http://localhost:8000
```

## 2. Pasang gambar karakter (bagian About)
Taruh file gambarmu di `assets/ellen.png`. Kalau namanya/format lain (mis. `assets/ellen.webp`),
ubah `portraitSrc` di `js/config.js`. Paling bagus PNG/WebP berlatar transparan, tinggi sekitar 1000 px.
Selama file belum ada, situs menampilkan bingkai cadangan.

## 3. Form kontak yang berfungsi (gratis, Web3Forms)
1. Daftar di <https://web3forms.com>, masukkan emailmu (pesan akan masuk ke sana).
2. Salin **Access Key** yang dikirim ke emailmu.
3. Tempel di `js/config.js` pada `web3formsAccessKey`.

Access key memang publik (aman ditaruh di kode). Emailmu tidak tampil di situs.

## 4. Komentar publik (gratis, Supabase)
1. Buat akun dan proyek baru di <https://supabase.com> (gratis).
2. **SQL Editor → New query**, tempel isi `supabase.sql`, klik **Run**.
3. **Project Settings → API**: salin **Project URL** dan kunci **anon / publishable**.
4. Tempel ke `supabaseUrl` dan `supabaseAnonKey` di `js/config.js`.

Penting:
- Pakai kunci **anon/publishable** saja. **Jangan pernah** menaruh kunci `service_role` / `secret` di situs.
- Komentar langsung tampil tanpa moderasi. Hapus yang tidak pantas lewat **Table Editor → comments**.
- Pengamannya: batas panjang di database, jeda antar komentar, honeypot anti-bot, dan batas 15 komentar/menit.
  Jeda di browser bisa dilewati orang yang paham teknis, jadi batas di database itulah pelindung utamanya.
- Selama dua kolom itu kosong, komentar hanya tersimpan di browser pengunjung (mode demo).

## 5. Pasang di GitHub Pages
1. Buat repo baru di GitHub (mis. `portofolio`), lalu upload **isi** folder ini ke root repo
   (`index.html` harus berada di root, bukan di dalam subfolder).
2. **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**.
3. Tunggu 1–2 menit. Alamatnya `https://ryzxll.github.io/portofolio/`.
   Kalau repo diberi nama `ryzxll.github.io`, alamatnya langsung `https://ryzxll.github.io/`.

Dengan git:
```bash
git init && git add . && git commit -m "portofolio"
git branch -M main
git remote add origin https://github.com/ryzxll/portofolio.git
git push -u origin main
```
Semua path di situs bersifat relatif, jadi aman dipasang di subfolder.

## 6. Mengubah isi
| Yang diubah | Di mana |
|---|---|
| Nama di kartu lanyard, teks ketik di hero | `js/config.js` |
| Bio hero, About, Pendidikan, Spotify, footer | `index.html` |
| Daftar skill | `index.html` (blok `skills-grid`) + ikon di `assets/skills/` |
| Link sosial | `index.html` (di hero dan footer) |
| Warna | variabel `:root` di `css/style.css` |
| Projek | ganti kartu `empty-card` di `panel-projects` dengan kartu projekmu |

Catatan isi:
- **Bash** dan **Git** di daftar skill adalah tambahan dari saya, hapus barisnya kalau tidak sesuai.
- Link YouTube diasumsikan `youtube.com/@ext4-FS`. Cek lagi kalau URL channelmu berbeda.
- Ikon C# dan Termux adalah glyph sederhana buatan sendiri (tidak ada di set ikon merek).

## 7. Mengubah lanyard (opsional)
Kartu, warna, fisika (`gravity`, `damping`), dan gambar kartu ada di `src/lanyard.js`. Setelah mengedit:
```bash
npm install
npm run build:lanyard      # menghasilkan js/lanyard.min.js
```
Di HP lanyard memakai versi ringan, dan jika WebGL tidak tersedia muncul kartu cadangan statis.

## Kredit
Three.js (MIT), GSAP (lisensi standar GSAP, gratis), Simple Icons (CC0) dan Lucide (ISC) untuk ikon.

/*
 * Pengaturan situs — edit di sini, tidak perlu menyentuh file lain.
 * Detail langkah-langkahnya ada di README.md.
 */
window.PORTFOLIO_CONFIG = {
  // Nama yang tampil di kartu lanyard (dipisah per kata, otomatis jadi dua baris)
  name: "Arsyad Kariman",

  // Gambar karakter di bagian About. Taruh file-nya di folder assets/ dengan nama ini,
  // atau ganti path-nya. Paling bagus PNG/WebP dengan latar transparan.
  portraitSrc: "assets/ellen.png",

  // Teks yang diketik bergantian di hero
  roles: [
    "Python Programmer",
    "C++ Developer",
    "Rust Enthusiast",
    "Linux & Reverse Engineering",
  ],

  // Form kontak (Web3Forms, gratis). Daftar di https://web3forms.com, lalu tempel Access Key.
  // Access key memang dirancang publik, aman ditaruh di sini.
  web3formsAccessKey: "",

  // Komentar publik (Supabase, gratis). Buat proyek sendiri, jalankan supabase.sql,
  // lalu isi dua baris ini. Jika kosong, komentar hanya tersimpan di browser pengunjung (mode demo).
  supabaseUrl: "",
  supabaseAnonKey: "",
};

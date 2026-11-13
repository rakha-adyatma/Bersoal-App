<div align="center">
  <img src="public/logo.png" alt="Logo BERSOAL" width="120" />
  <h1>BERSOAL - Evaluasi Pembelajaran (HOTS AI Generator)</h1>
  <p>
    <strong>Platform Edutech berbasis AI untuk menyusun instrumen evaluasi HOTS (Higher Order Thinking Skills) yang selaras dengan kurikulum.</strong>
  </p>
  <p>
    <a href="https://bersoal.vercel.app" target="_blank">
      <img src="https://img.shields.io/badge/Live_Demo-Bersoal_App-4f46e5?style=for-the-badge&logo=vercel" alt="Live Demo" />
    </a>
  </p>
</div>

<hr />

## Tentang Proyek Ini

**BERSOAL** adalah aplikasi berbasis web yang dirancang untuk membantu pendidik di Indonesia menyusun instrumen evaluasi berstandar HOTS (tingkat kognitif C4, C5, dan C6). Melalui integrasi kecerdasan buatan, sistem ini secara otomatis menghasilkan butir soal berbasis stimulus nyata dan fenomena kontekstual, guna menghindari metode pengujian yang berpusat pada hafalan (*rote learning*).

Sistem ini memfasilitasi pembuatan soal secara dinamis dalam bentuk Lembar Soal dan Kunci Jawaban beserta Rubrik, yang dapat diekspor langsung ke dalam format PDF secara rapi dan terstruktur.

## Fitur Utama

*   **AI-Powered Generation:** Menggunakan integrasi Google Gemini API untuk menghasilkan butir soal dan distraktor yang logis secara otomatis.
*   **Paradigma Deep Learning:** Mengadopsi prinsip *Meaningful Learning, Mindful Learning*, dan *Joyful Learning* dalam setiap narasi soal.
*   **Export to PDF:** Pencetakan langsung ke format PDF dengan pengaturan tata letak (*Hanging Indent*) yang presisi dan penyediaan ruang jawaban berupa garis putus-putus (*vector line*) untuk tipe soal uraian.
*   **Parallel Batching:** Arsitektur asinkron yang memungkinkan penyusunan soal tipe campuran (Pilihan Ganda & Uraian) dalam jumlah besar secara bersamaan.
*   **Dark Mode Support:** Antarmuka responsif yang dilengkapi dengan mode gelap untuk kenyamanan penggunaan visual.

## Teknologi & Dependensi (Tech Stack)

*   **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript
*   **Backend & Server:** Node.js, Express.js (`express`)
*   **AI Engine:** Google Generative AI (`@google/generative-ai`)
*   **PDF Generator:** PDFKit (`pdfkit`)
*   **Environment Management:** Dotenv (`dotenv`)
*   **Deployment:** Vercel (Serverless Functions)

## Panduan Instalasi
1. Clone repositori ini:
   ```bash
   git clone https://github.com/rakha-adyatma/Bersoal-App.git
   cd Bersoal-App
   ```

2. Instalasi dependensi:
   ```bash
   npm install
   ```

3. Konfigurasi Environment Variables:
   Buat file bernama `.env` pada direktori *root* aplikasi dan tambahkan konfigurasi berikut:
   ```env
   GEMINI_API_KEY=KODE_API_GEMINI_ANDA_DI_SINI
   PORT=3000
   ```

4. Menjalankan server lokal:
   ```bash
   npm start
   ```

## Cakupan Kurikulum & Kejuruan (SMK)

BERSOAL mendukung penyusunan instrumen asesmen analitis berbasis kompetensi kejuruan SMK pada jenjang **Kelas X** dan **Kelas XI** dengan 4 Konsentrasi Keahlian utama:
- **TKR (Teknik Kendaraan Ringan):** Meliputi mata pelajaran umum dan kejuruan (Dasar Program Keahlian, Teknik Kendaraan Ringan, TSM, dll).
- **TKJ (Teknik Komputer dan Jaringan):** Meliputi Dasar Program Keahlian, Teknik Komputer dan Jaringan, Otomasi Industri, KIK, Informatika, dll.
- **DKV (Desain Komunikasi Visual):** Meliputi Dasar Program Keahlian, Desain Komunikasi Visual, Bisnis Digital, KIK, Seni Budaya, dll.
- **AK (Akuntansi):** Meliputi Dasar Program Keahlian, Akuntansi, Layanan Perbankan, KIK, Matematika, dll.

Pendidik dapat secara fleksibel memasukkan beberapa topik/materi spesifik sesuai silabus dan capaian pembelajaran (CP) modul ajar masing-masing.

## Kontribusi

Kontribusi dalam bentuk pelaporan *bug*, saran fitur, maupun *Pull Request* (PR) sangat diapresiasi. Silakan buka *issue* baru pada repositori ini untuk mendiskusikan perubahan atau pengembangan yang ingin diusulkan.

## Pengembang

Proyek ini dikembangkan dengan dedikasi oleh **Rakha Adyatma**.

<p>
  <a href="https://github.com/rakha-adyatma" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
  </a>
  <a href="https://linkedin.com/in/" target="_blank">
    <img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" />
  </a>
</p>

---
<div align="center">
  <sub>© 2026 BERSOAL - Evaluasi Pembelajaran. All rights reserved.</sub>
</div>
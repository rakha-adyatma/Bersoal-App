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

**BERSOAL** adalah aplikasi berbasis web yang dirancang untuk membantu pendidik di Indonesia menyusun instrumen evaluasi berstandar HOTS (tingkat kognitif C4, C5, dan C6). Melalui integrasi kecerdasan buatan, sistem ini secara otomatis menghasilkan butir soal berbasis stimulus nyata dan fenomena kontekstual, guna menghindari metode pengujian yang berpusat pada hafalan (rote learning).

Sistem ini memfasilitasi pembuatan soal secara dinamis dalam bentuk Lembar Soal dan Kunci Jawaban beserta Rubrik, yang dapat diekspor langsung ke dalam format PDF secara rapi dan terstruktur.

## Fitur Utama

*   **AI-Powered Generation:** Menggunakan integrasi Google Gemini API untuk menghasilkan butir soal dan distraktor yang logis secara otomatis.
*   **Paradigma Deep Learning:** Mengadopsi prinsip *Meaningful Learning, Mindful Learning*, dan *Joyful Learning* dalam setiap narasi soal.
*   **Export to PDF:** Pencetakan langsung ke format PDF dengan pengaturan tata letak (*Hanging Indent*) yang presisi dan penyediaan ruang jawaban berupa garis putus-putus (*vector line*) untuk tipe soal uraian.
*   **Parallel Batching:** Arsitektur asinkron yang memungkinkan penyusunan soal tipe campuran (Pilihan Ganda & Uraian) dalam jumlah besar secara bersamaan.
*   **Dark Mode Support:** Antarmuka responsif yang dilengkapi dengan mode gelap untuk kenyamanan penggunaan visual.

## Teknologi yang Digunakan

*   **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript
*   **Backend:** Node.js, Express.js
*   **AI Engine:** Google Generative AI (Gemini API)
*   **PDF Generator:** PDFKit
*   **Deployment:** Vercel (Serverless Functions)

## Panduan Instalasi (Local Development)

Untuk menjalankan dan mengembangkan proyek ini di lingkungan lokal, silakan ikuti langkah-langkah berikut:

1. **Clone repositori:**
   ```bash
   git clone [https://github.com/rakha-adyatma/Bersoal-App.git](https://github.com/rakha-adyatma/Bersoal-App.git)
   cd Bersoal-App
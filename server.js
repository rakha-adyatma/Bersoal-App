const express = require('express');
const path = require('path');
const { generateHotsQuestions, JENIS_VALID } = require('./hotsGenerator');
const { buildPdfSoal, buildPdfKunci } = require('./hotsPdf');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Penyimpanan sementara (In-Memory)
const generatedDataStore = {};

app.post('/generate', async (req, res) => {
  try {
    const { mataPelajaran, jenjang, jenisSoal, materi, jumlahSoal, jumlahPG, jumlahUraian } = req.body;

    if (!JENIS_VALID.includes(jenisSoal)) {
      return res.status(400).send("Jenis soal tidak valid.");
    }

    const judulSoal = `Soal HOTS ${mataPelajaran} - ${jenjang}`;
    const deskripsiMateri = `Materi: ${materi} untuk ${jenjang}`;

    // Jalankan Generator
    const hotsData = await generateHotsQuestions({
      mataPelajaran,
      judulSoal,
      deskripsi: deskripsiMateri,
      jenisSoal,
      jumlahSoal,
      jumlahPG,
      jumlahUraian
    });

    // Simpan ke memory
    const timestamp = Date.now();
    generatedDataStore[timestamp] = hotsData;

    // Desain Success Page (Senada dengan Home Index)
    const successHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <title>Berhasil Meracik Soal - BERSOAL</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>body { font-family: 'Inter', sans-serif; background-color: #f8fafc; }</style>
    </head>
    <body class="flex h-screen overflow-hidden text-slate-800">
        <div id="sidebarBackdrop" class="fixed inset-0 bg-slate-900/50 z-30 hidden" onclick="toggleSidebar()"></div>

        <!-- SIDEBAR -->
        <aside id="sidebar" class="w-64 bg-[#4f46e5] text-white flex-col h-full shadow-2xl z-40 fixed md:relative hidden md:flex transition-all">
            <div class="h-20 flex items-center px-6 border-b border-white/10">
                <img src="/logo.png" alt="Logo" class="h-10 w-auto object-contain rounded-xl bg-white p-1 shadow-md mr-3">
                <div>
                    <h1 class="text-xl font-bold tracking-wide">Bersoal</h1>
                    <p class="text-[10px] text-indigo-200 tracking-wider font-semibold">EVALUASI PEMBELAJARAN</p>
                </div>
            </div>
            <nav class="flex-1 px-4 py-6">
                <a href="/" class="flex items-center gap-3 bg-white/20 px-4 py-3 rounded-xl font-medium text-sm">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    Kembali ke Beranda
                </a>
            </nav>
        </aside>

        <!-- MAIN AREA -->
        <div class="flex-1 flex flex-col h-full relative">
            <header class="h-16 bg-white border-b border-slate-200 flex items-center px-4 sm:px-8 z-10">
                <button onclick="toggleSidebar()" class="bg-indigo-600 text-white rounded-lg p-2 md:hidden">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </button>
                <div class="ml-4 md:ml-0 font-semibold text-slate-600 text-sm">Panel Unduhan PDF</div>
            </header>

            <main class="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex items-center justify-center">
                <div class="max-w-2xl w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center relative overflow-hidden">
                    <div class="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h2 class="text-2xl font-bold text-slate-800 mb-2">Penyusunan Sukses!</h2>
                    <p class="text-slate-500 mb-8 text-sm">Instrumen evaluasi <strong>${mataPelajaran}</strong> telah berhasil diracik dan disesuaikan dengan standar HOTS.</p>
                    
                    <div class="flex flex-col sm:flex-row gap-4 justify-center">
                        <a href="/download/soal/${timestamp}" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 px-6 rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                            Unduh PDF Lembar Soal
                        </a>
                        <a href="/download/kunci/${timestamp}" class="bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3.5 px-6 rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                            Unduh PDF Kunci Jawaban
                        </a>
                    </div>
                    <div class="mt-8">
                        <a href="/" class="text-slate-400 hover:text-indigo-600 font-semibold text-sm transition-colors">← Buat Instrumen Lainnya</a>
                    </div>
                </div>
            </main>
        </div>
        <script>
            function toggleSidebar() {
                document.getElementById('sidebar').classList.toggle('hidden');
                document.getElementById('sidebar').classList.toggle('flex');
                document.getElementById('sidebarBackdrop').classList.toggle('hidden');
            }
        </script>
    </body>
    </html>
    `;
    res.send(successHtml);

  } catch (error) {
    console.error(error);
    res.status(500).send(`Terjadi kesalahan: ${error.message}`);
  }
});

app.get('/download/soal/:id', async (req, res) => {
  const data = generatedDataStore[req.params.id];
  if (!data) return res.status(404).send("Data tidak ditemukan atau kedaluwarsa.");

  try {
    const doc = buildPdfSoal(data);
    res.setHeader('Content-Type', 'application/pdf');
    // SYNTAX YANG DIPERBAIKI (Hilangkan backslash sebelum backtick)
    res.setHeader('Content-Disposition', `attachment; filename="HOTS_SOAL_${data.mataPelajaran.replace(/\s/g, '_')}_${req.params.id}.pdf"`);
    doc.pipe(res);
    doc.end();
  } catch (e) {
    res.status(500).send("Gagal membuat PDF soal.");
  }
});

app.get('/download/kunci/:id', async (req, res) => {
  const data = generatedDataStore[req.params.id];
  if (!data) return res.status(404).send("Data tidak ditemukan atau kedaluwarsa.");

  try {
    const doc = buildPdfKunci(data);
    res.setHeader('Content-Type', 'application/pdf');
    // SYNTAX YANG DIPERBAIKI (Hilangkan backslash sebelum backtick)
    res.setHeader('Content-Disposition', `attachment; filename="HOTS_KUNCI_${data.mataPelajaran.replace(/\s/g, '_')}_${req.params.id}.pdf"`);
    doc.pipe(res);
    doc.end();
  } catch (e) {
    res.status(500).send("Gagal membuat PDF kunci jawaban.");
  }
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
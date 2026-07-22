const express = require("express");
const fs = require("fs");
const path = require("path");
const { generateHotsQuestions } = require("./hotsGenerator");
const { generateHotsPdf } = require("./hotsPdf");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const outputDir = path.join(__dirname, "public", "output");
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

app.post("/generate", async (req, res) => {
    try {
        const { mataPelajaran, jenjang, jenisSoal, jumlahSoal, materi } = req.body;
        const materiPendek = materi.split(":")[0].trim();

        const dataKonteks = {
            mataPelajaran: mataPelajaran,
            judulSoal: `Evaluasi ${jenjang} - ${materiPendek}`,
            deskripsi: `Pendidikan tingkat ${jenjang}. Konteks materi: ${materi}`,
            jenisSoal: jenisSoal,
            jumlahSoal: parseInt(jumlahSoal)
        };

        console.log(`\n⏳ Menerima pesanan soal ${mataPelajaran} (${jenjang})...`);

        const dataSoal = await generateHotsQuestions(dataKonteks);
        const pdf = await generateHotsPdf(dataSoal, dataKonteks);

        const soalPath = path.join(outputDir, pdf.soal.filename);
        const kunciPath = path.join(outputDir, pdf.kunci.filename);
        fs.writeFileSync(soalPath, pdf.soal.buffer);
        fs.writeFileSync(kunciPath, pdf.kunci.buffer);

        console.log("✅ Berhasil! Mengirim file ke browser.");

        // UI Halaman Sukses yang Sudah Direvisi (Mobile-Friendly & Proporsional)
        res.send(`
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <!-- Meta Viewport yang benar agar ukuran selalu pas di HP -->
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <title>Soal Berhasil Dibuat - BERSOAL</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                <script src="https://cdn.tailwindcss.com"></script>
                <style> body { font-family: 'Inter', sans-serif; } </style>
            </head>
            <body class="bg-slate-100 min-h-screen flex items-center justify-center p-4 md:p-8">
                
                <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto overflow-hidden border border-slate-200 text-center p-6 md:p-8">
                    
                    <!-- Ikon Sukses -->
                    <div class="w-16 h-16 md:w-20 md:h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl md:text-4xl shadow-inner">
                        🎉
                    </div>
                    
                    <h1 class="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Sukses!</h1>
                    <p class="text-slate-600 text-base mt-2">Soal <b class="text-indigo-600">${mataPelajaran}</b> berhasil diracik.</p>
                    
                    <!-- Kotak Detail Materi -->
                    <div class="bg-slate-50 border border-slate-200 p-4 md:p-5 rounded-xl my-6 text-left space-y-2">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-indigo-500 text-lg">📚</span>
                            <p class="text-indigo-700 font-bold text-sm">Konteks Materi:</p>
                        </div>
                        <p class="text-slate-800 font-semibold text-base leading-snug">${materi}</p>
                        
                        <div class="border-t border-slate-200 mt-3 pt-3 flex flex-col md:flex-row md:justify-between text-slate-500 text-sm gap-2">
                            <div class="flex items-center gap-1.5">
                                <span>🎓</span> <span>${jenjang}</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <span>📝</span> <span>${jumlahSoal} ${jenisSoal}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Tombol Aksi -->
                    <div class="space-y-3 mt-4">
                        <a href="/output/${pdf.soal.filename}" download class="w-full flex justify-center items-center gap-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold rounded-xl text-base transition-all shadow-md hover:shadow-lg">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            Download PDF Soal
                        </a>
                        <a href="/output/${pdf.kunci.filename}" download class="w-full flex justify-center items-center gap-2 py-3.5 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold rounded-xl text-base transition-all shadow-md hover:shadow-lg">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                            Download Kunci Jawaban
                        </a>
                    </div>
                    
                    <!-- Link Kembali -->
                    <div class="mt-8">
                        <a href="/" class="inline-flex items-center justify-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-base font-semibold transition-colors">
                            <span>&larr;</span> Buat Soal Lainnya
                        </a>
                    </div>
                </div>
            </body>
            </html>
        `);

    } catch (error) {
        console.error("❌ Error:", error.message);
        res.send(`
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <title>Error - BERSOAL</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style> body { font-family: sans-serif; } </style>
            </head>
            <body class="bg-slate-100 min-h-screen flex items-center justify-center p-4">
                <div class="bg-white p-6 md:p-8 rounded-2xl shadow-xl max-w-md w-full text-center border-t-4 border-red-500">
                    <div class="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">⚠️</div>
                    <h2 class="text-xl font-bold text-slate-800 mb-2">Terjadi Kesalahan</h2>
                    <p class="text-base text-slate-600 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">${error.message}</p>
                    <a href="/" class="block w-full py-3 bg-slate-800 hover:bg-slate-900 text-white text-base font-bold rounded-xl transition-all shadow-md">&larr; Coba Lagi</a>
                </div>
            </body>
            </html>
        `);
    }
});

app.listen(PORT, () => {
    console.log("===========================================");
    console.log(`🚀 Server berjalan! Buka browser dan ketik:`);
    console.log(`👉 http://localhost:${PORT}`);
    console.log("===========================================");
});
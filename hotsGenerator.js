require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const JENIS_VALID = ["Pilihan Ganda", "Uraian"];

// Prompt Sistem - Paradigma Deep Learning Kemendikdasmen & Konteks Nyata
const SYSTEM_PROMPT = `Anda adalah Ahli Evaluasi Pendidikan dan Pembuat Instrumen Asesmen tingkat SMA/SMK di Indonesia. 
Keahlian utama Anda adalah menyusun instrumen evaluasi HOTS (C4-Menganalisis, C5-Mengevaluasi, C6-Mencipta) yang selaras dengan paradigma Deep Learning (Pembelajaran Mendalam) dari Kemendikdasmen.

ATURAN MUTLAK PENYUSUNAN SOAL:
1. Bermakna, Kontekstual & Realistis (Meaningful Learning): Setiap soal WAJIB diawali dengan stimulus. Stimulus harus berupa situasi dunia nyata yang sangat dekat dan relevan dengan keseharian siswa remaja masa kini (Gen Z). Jika menggunakan karya sastra atau artikel jurnalistik, WAJIB menggunakan karya faktual/nyata dan MENCANTUMKAN atribusinya (Judul, Penulis, Tahun Terbit) di dalam stimulus.
2. Menalar & Kritis (Mindful Learning): DILARANG keras membuat soal hafalan (C1-C3). Pertanyaan harus menantang siswa untuk menguraikan masalah, mengevaluasi solusi, atau mensintesis ide baru berdasarkan stimulus.
3. Eksploratif & Menggugah (Joyful Learning): Kemas narasi soal agar menarik, tidak mengintimidasi, dan memicu rasa ingin tahu siswa layaknya memecahkan sebuah tantangan riil.
4. Distraktor Psikometrik: Opsi jawaban salah (pengecoh) HARUS mencerminkan miskonsepsi umum atau kesalahan logika yang paling sering dialami siswa.
5. Pembahasan Reflektif: Berikan penjelasan mengapa jawaban tersebut benar secara konsep, dan uraikan letak kesalahan pada opsi lainnya secara edukatif.

ATURAN FORMAT OUTPUT:
- Jawab HANYA menggunakan struktur JSON murni yang valid.
- Dilarang menggunakan backticks markdown (seperti \`\`\`json).
- Dilarang menggunakan enter (newline) asli di dalam nilai string; gunakan "\\n".`;

function buildUserPrompt(mataPelajaran, deskripsi, jenisSoal, batchSize) {
  let spesifikMapel = "";
  if (mataPelajaran === "Informatika") {
    spesifikMapel = "Stimulus berupa kasus IT sehari-hari siswa (algoritma sosmed, jaringan Wi-Fi, error kode, IoT). Uji logika komputasional/troubleshooting.";
  } else if (mataPelajaran === "Bahasa Inggris") {
    spesifikMapel = "Soal WAJIB Bahasa Inggris. Uji 'implied meaning'. Gunakan kutipan sastra/berita asli (sebutkan Title, Author, Year) atau dialog riil Gen Z.";
  } else {
    spesifikMapel = "Fokus literasi kritis. Gunakan kutipan sastra/esai Indonesia asli (sebutkan Judul, Penulis, Tahun) atau isu sosial Gen Z.";
  }

  return `Mapel: ${mataPelajaran}
Konteks: ${deskripsi}
Instruksi Tambahan: ${spesifikMapel}

PERINGATAN KERAS: Buat TEPAT ${batchSize} soal. JANGAN KURANG DAN JANGAN LEBIH!

Buat ${batchSize} soal ${jenisSoal} dalam struktur JSON berikut:
{
  "soal": [
    {
      "pertanyaan": "[STIMULUS NYATA/KUTIPAN BESERTA SUMBER] \\n\\n [PERTANYAAN NALAR]",
      "opsi": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
      "jawabanBenar": "A",
      "pembahasan": "..."
    }
  ]
}`;
}

function repairJsonBackslashes(text) {
  return text.replace(/\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, "\\\\");
}

function parseGeminiJson(raw) {
  let text = String(raw || "").trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    return JSON.parse(repairJsonBackslashes(text));
  }
}

const MODELS = ["gemini-3.1-flash-lite", "gemini-flash-latest"];

async function generateHotsQuestions({ mataPelajaran, judulSoal, deskripsi, jenisSoal, jumlahSoal }) {
  judulSoal = String(judulSoal || "Evaluasi HOTS").trim();
  deskripsi = String(deskripsi || "").trim();
  jenisSoal = String(jenisSoal || "Pilihan Ganda").trim();
  mataPelajaran = String(mataPelajaran || "Umum").trim();
  const totalSoal = Number(jumlahSoal);

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  // KUNCI PERBAIKAN: Memecah jumlah soal menjadi kloter (batch) maksimal 8 soal per proses AI
  // agar AI tidak kehabisan memori token (Max Output Tokens).
  const MAX_PER_BATCH = 8;
  const batches = [];
  let sisa = totalSoal;
  while (sisa > 0) {
    batches.push(Math.min(sisa, MAX_PER_BATCH));
    sisa -= MAX_PER_BATCH;
  }

  // Fungsi untuk menjalankan 1 kloter (batch)
  const fetchBatch = async (batchSize) => {
    const prompt = buildUserPrompt(mataPelajaran, deskripsi, jenisSoal, batchSize);
    let parsed = null;

    outer: for (const name of MODELS) {
      const model = genAI.getGenerativeModel({
        model: name,
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192, temperature: 0.7 },
      });

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await model.generateContent(prompt);
          parsed = parseGeminiJson(result.response.text());
          if (parsed && Array.isArray(parsed.soal) && parsed.soal.length > 0) {
            break outer; // Jika berhasil, keluar dari loop
          }
          parsed = null;
        } catch (e) {
          parsed = null;
        }
      }
    }

    if (!parsed || !parsed.soal) {
      throw new Error("Gagal memproses batch soal.");
    }
    return parsed.soal;
  };

  try {
    // Menjalankan semua kloter secara BERSAMAAN (Paralel) agar cepat
    const results = await Promise.all(batches.map(size => fetchBatch(size)));
    
    // Menggabungkan kembali semua kloter soal menjadi satu daftar panjang
    let semuaSoal = [];
    results.forEach(arr => {
      semuaSoal = semuaSoal.concat(arr);
    });

    // Merapikan nomor urut 1 sampai 25
    semuaSoal = semuaSoal.slice(0, totalSoal); // Pastikan jumlahnya tepat
    semuaSoal.forEach((item, index) => {
      item.nomor = index + 1;
      item.levelBloom = item.levelBloom || "C4/C5/C6";
    });

    return {
      judul: judulSoal,
      mataPelajaran: mataPelajaran,
      jenisSoal: jenisSoal,
      soal: semuaSoal
    };

  } catch (error) {
    throw new Error("Sistem AI gagal memproses keseluruhan soal. Silakan coba lagi.");
  }
}

module.exports = { generateHotsQuestions, JENIS_VALID };
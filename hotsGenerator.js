require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const JENIS_VALID = ["Pilihan Ganda", "Uraian"];

// Prompt Sistem yang jauh lebih kompleks dan terstruktur
const SYSTEM_PROMPT = `Anda adalah Ahli Evaluasi Pendidikan dan Pembuat Instrumen Soal tingkat SMA/SMK di Indonesia. 
Keahlian utama Anda adalah menyusun soal berbasis HOTS (Higher Order Thinking Skills - Taksonomi Bloom level C4 Menganalisis, C5 Mengevaluasi, C6 Mencipta).

ATURAN MUTLAK PEMBUATAN SOAL:
1. WAJIB BERBASIS STIMULUS: Setiap soal HARUS diawali dengan stimulus (konteks masalah). 
   - Untuk Bahasa: Gunakan kutipan teks sastra/artikel/percakapan faktual.
   - Untuk Informatika: Gunakan studi kasus sistem, pseudocode, cuplikan kode error, atau skenario logika algoritma.
2. DILARANG MEMBUAT SOAL HAFALAN (C1-C3) seperti "Apa pengertian dari..." atau "Sebutkan...". Pertanyaan harus menuntut penalaran, pemecahan masalah, atau evaluasi dari stimulus yang diberikan.
3. DISTRAKTOR LOGIS (Untuk Pilihan Ganda): Opsi jawaban salah (pengecoh) tidak boleh asal-asalan. Distraktor harus berupa jawaban yang mungkin dipilih siswa jika mereka mengalami miskonsepsi atau kesalahan logika/perhitungan.
4. PEMBAHASAN MENDALAM: Jelaskan mengapa jawaban benar itu benar, dan mengapa opsi lain salah.

ATURAN FORMAT (SANGAT PENTING):
- Output HANYA boleh berupa JSON murni yang valid.
- JANGAN sertakan markdown backticks (seperti \`\`\`json) di awal atau akhir.
- JANGAN gunakan karakter newline asli (Enter) di dalam string nilai JSON, gunakan \\n jika perlu pemisah baris di dalam teks stimulus/opsi.`;

function buildUserPrompt({ mataPelajaran, judulSoal, deskripsi, jenisSoal, jumlahSoal }) {
  // Instruksi spesifik menyesuaikan mapel
  let spesifikMapel = "";
  if (mataPelajaran === "Informatika") {
    spesifikMapel = "Pastikan stimulus berupa skenario komputasional, pseudocode, arsitektur jaringan, atau kasus troubleshooting algoritma.";
  } else if (mataPelajaran === "Bahasa Inggris") {
    spesifikMapel = "Stimulus dan pertanyaan WAJIB dalam Bahasa Inggris (English Language). Uji pemahaman tersirat (implied meaning), inferensi, dan evaluasi argumen.";
  } else {
    spesifikMapel = "Stimulus gunakan bahasa Indonesia yang baku. Fokus pada literasi membaca, evaluasi opini, atau analisis struktur teks secara kritis.";
  }

  return `Buat ${jumlahSoal} soal HOTS dengan format ${jenisSoal} untuk Mata Pelajaran: ${mataPelajaran}.
Konteks / Capaian Pembelajaran: ${deskripsi}
Instruksi Tambahan: ${spesifikMapel}

Struktur JSON yang WAJIB dipatuhi:
{
  "judul": "${judulSoal}",
  "mataPelajaran": "${mataPelajaran}",
  "jenisSoal": "${jenisSoal}",
  "soal": [
    {
      "nomor": 1,
      "levelBloom": "C4/C5/C6",
      "pertanyaan": "[STIMULUS KASUS] \\n\\n [PERTANYAAN ANALITIS]",
      "opsi": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
      "jawabanBenar": "A",
      "pembahasan": "..."
    }
  ]
}
Catatan: Jika jenis soal adalah "Uraian", biarkan object "opsi" tetap ada namun bernilai string kosong atau hapus key "opsi", lalu tuliskan rubrik penilaian pada "jawabanBenar".`;
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

const MODELS = ["gemini-flash-latest", "gemini-3.1-flash-lite"];

async function generateHotsQuestions({ mataPelajaran, judulSoal, deskripsi, jenisSoal, jumlahSoal }) {
  judulSoal = String(judulSoal || "").trim();
  deskripsi = String(deskripsi || "").trim();
  jenisSoal = String(jenisSoal || "").trim();
  mataPelajaran = String(mataPelajaran || "").trim();
  jumlahSoal = Number(jumlahSoal);

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const makeModel = (name) =>
    genAI.getGenerativeModel({
      model: name,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192, // Diperbesar karena output soal yang kompleks butuh token panjang
        temperature: 0.7, 
      },
    });

  const prompt = buildUserPrompt({ mataPelajaran, judulSoal, deskripsi, jenisSoal, jumlahSoal });

  let parsed = null;
  outer: for (const name of MODELS) {
    const model = makeModel(name);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        parsed = parseGeminiJson(result.response.text());
        if (parsed && Array.isArray(parsed.soal) && parsed.soal.length > 0) {
          break outer;
        }
        parsed = null;
      } catch (e) {
        parsed = null;
      }
    }
  }

  if (!parsed) {
    throw new Error("Sistem AI gagal mengonstruksi struktur JSON yang valid. Silakan coba klik tombol buat soal sekali lagi.");
  }

  parsed.judul = parsed.judul || judulSoal;
  parsed.mataPelajaran = parsed.mataPelajaran || mataPelajaran;
  parsed.jenisSoal = parsed.jenisSoal || jenisSoal;
  return parsed;
}

module.exports = { generateHotsQuestions, JENIS_VALID };
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const JENIS_VALID = ["Pilihan Ganda", "Uraian"];

// Prompt dipadatkan (Diet Prompt) agar AI memproses lebih cepat tanpa kehilangan bobot HOTS
const SYSTEM_PROMPT = `Anda AI pembuat soal evaluasi HOTS (C4-C6) SMA/SMK berparadigma Deep Learning.
ATURAN FINAL:
1. STIMULUS NYATA: Wajib berikan stimulus otentik sebelum pertanyaan (kasus IT, tren Gen Z, atau kutipan sastra/artikel asli). Jika mengutip karya, WAJIB cantumkan [Judul, Penulis, Tahun].
2. NALAR (BUKAN HAFALAN): Pertanyaan harus menguji pemecahan masalah, evaluasi, atau analisis.
3. DISTRAKTOR (Opsi Salah): Harus menjebak berdasarkan miskonsepsi umum/kesalahan logika siswa.
4. PEMBAHASAN: Singkat, padat, dan jelaskan letak kesalahan opsi lain.
5. FORMAT: Hanya output JSON murni (tanpa backticks markdown \`\`\`json). Gunakan "\\n" untuk baris baru.`;

function buildUserPrompt({ mataPelajaran, judulSoal, deskripsi, jenisSoal, jumlahSoal }) {
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

Buat ${jumlahSoal} soal ${jenisSoal} dalam struktur JSON berikut:
{
  "judul": "${judulSoal}",
  "mataPelajaran": "${mataPelajaran}",
  "jenisSoal": "${jenisSoal}",
  "soal": [
    {
      "nomor": 1,
      "levelBloom": "C4/C5/C6",
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

// Menggunakan flash-lite jika tersedia untuk kecepatan ekstra, fallback ke flash-latest
const MODELS = ["gemini-3.1-flash-lite", "gemini-flash-latest"];

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
        maxOutputTokens: 8192, 
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
    throw new Error("Waktu AI habis atau gagal. Mohon coba kurangi jumlah soal atau klik buat soal lagi.");
  }

  parsed.judul = parsed.judul || judulSoal;
  parsed.mataPelajaran = parsed.mataPelajaran || mataPelajaran;
  parsed.jenisSoal = parsed.jenisSoal || jenisSoal;
  return parsed;
}

module.exports = { generateHotsQuestions, JENIS_VALID };
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

PERINGATAN KERAS JUMLAH SOAL:
Anda WAJIB menghasilkan TEPAT ${jumlahSoal} soal. JANGAN PERNAH berhenti, memotong, atau merangkum output sebelum soal ke-${jumlahSoal} selesai ditulis beserta pembahasannya!

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
}
Catatan Penting: Jika jenis soal "Uraian", tetap sediakan key "opsi" namun kosongkan (""), lalu berikan rubrik penilaian pada "jawabanBenar".`;
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
    throw new Error("Waktu AI habis atau AI gagal mengonstruksi JSON sesuai format. Mohon kurangi jumlah soal (misal: 10 soal) dan coba lagi.");
  }

  parsed.judul = parsed.judul || judulSoal;
  parsed.mataPelajaran = parsed.mataPelajaran || mataPelajaran;
  parsed.jenisSoal = parsed.jenisSoal || jenisSoal;
  return parsed;
}

module.exports = { generateHotsQuestions, JENIS_VALID };
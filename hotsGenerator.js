require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const JENIS_VALID = ["Pilihan Ganda", "Uraian"];

const SYSTEM_PROMPT = `Pembuat soal HOTS Bahasa Indonesia SMA/SMK (Taksonomi Bloom C4-C6: Analisis, Evaluasi, Kreasi).
Aturan:
1. Variasikan bentuk soal: sebagian memakai kutipan sastra/berita ASLI dengan sumber jelas (dilarang mengarang kutipan), sebagian lagi berupa pertanyaan analitis konseptual tanpa teks panjang.
2. Output HANYA JSON murni valid tanpa markdown backticks atau newline asli di dalam string (gunakan \\n untuk baris baru).`;

function buildUserPrompt({ judulSoal, deskripsi, jenisSoal, jumlahSoal }) {
  return `Buat ${jumlahSoal} soal HOTS ${jenisSoal} Bahasa Indonesia.
Materi: ${deskripsi}

Format JSON wajib:
{
  "judul": "${judulSoal}",
  "mataPelajaran": "Bahasa Indonesia",
  "jenisSoal": "${jenisSoal}",
  "soal": [
    {
      "nomor": 1,
      "levelBloom": "C4",
      "pertanyaan": "...",
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

const MODELS = ["gemini-flash-latest", "gemini-3.1-flash-lite"];

async function generateHotsQuestions({ judulSoal, deskripsi, jenisSoal, jumlahSoal }) {
  judulSoal = String(judulSoal || "").trim();
  deskripsi = String(deskripsi || "").trim();
  jenisSoal = String(jenisSoal || "").trim();
  jumlahSoal = Number(jumlahSoal);

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const makeModel = (name) =>
    genAI.getGenerativeModel({
      model: name,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 4096, // Diturunkan dari 8192 untuk menghemat batas output
        temperature: 0.7, 
      },
    });

  const prompt = buildUserPrompt({ judulSoal, deskripsi, jenisSoal, jumlahSoal });

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
    throw new Error("Gemini gagal menghasilkan soal yang valid. Coba lagi.");
  }

  parsed.judul = parsed.judul || judulSoal;
  parsed.mataPelajaran = "Bahasa Indonesia";
  parsed.jenisSoal = parsed.jenisSoal || jenisSoal;
  return parsed;
}

module.exports = { generateHotsQuestions, JENIS_VALID };
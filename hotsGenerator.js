require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const JENIS_VALID = ["Pilihan Ganda", "Uraian", "Campuran"];

const SYSTEM_PROMPT = `Anda adalah Ahli Evaluasi Pendidikan tingkat SMA/SMK berparadigma Deep Learning.
ATURAN MUTLAK:
1. Kontekstual: Selalu gunakan stimulus/studi kasus dunia nyata, fenomena Gen Z, atau kutipan karya NYATA (wajib sebutkan Judul/Sumber).
2. Nalar Kritis: Uji analisis dan logika tingkat tinggi (HOTS C4-C6), bukan sekadar mengingat (C1-C3).
3. Distraktor Logis: Opsi pengecoh harus logis berdasarkan kemungkinan miskonsepsi siswa.
4. Output JSON Murni: Jangan gunakan backticks markdown, berikan hanya objek JSON valid. Gunakan "\\n" untuk pindah baris.`;

function buildUserPrompt(mataPelajaran, deskripsi, jenisSoalType, batchSize) {
  let spesifikMapel = "";
  if (mataPelajaran === "Informatika") {
    spesifikMapel = "Stimulus kasus IT otentik (jaringan, IoT, AI, algoritma sosmed).";
  } else if (mataPelajaran === "Bahasa Inggris") {
    spesifikMapel = "Soal WAJIB Bahasa Inggris. Uji 'implied meaning'. Pakai kutipan nyata (sertakan Title, Author).";
  } else {
    spesifikMapel = "Gunakan literasi kritis, karya otentik, atau fenomena sosial terkini.";
  }

  return `Mapel: ${mataPelajaran}
Materi: ${deskripsi}
Instruksi Tambahan: ${spesifikMapel}

PERINGATAN: Buat TEPAT ${batchSize} soal ${jenisSoalType}. Tidak boleh kurang atau lebih!

Hasilkan JSON dengan struktur persis seperti ini:
{
  "soal": [
    {
      "levelBloom": "C4, C5, atau C6 (PILIH SALAH SATU SAJA beserta kata kerjanya, contoh: 'C4 - Menganalisis' atau 'C5 - Mengevaluasi')",
      "pertanyaan": "[STIMULUS NYATA] \\n\\n [PERTANYAAN NALAR]",
      "opsi": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
      "jawabanBenar": "A",
      "pembahasan": "..."
    }
  ]
}
Catatan Penting: Jika jenis soal "Uraian", biarkan kunci "opsi" berupa string kosong (""), dan berikan rubrik di "jawabanBenar".`;
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

async function generateHotsQuestions({ mataPelajaran, judulSoal, deskripsi, jenisSoal, jumlahSoal, jumlahPG, jumlahUraian }) {
  judulSoal = String(judulSoal || "Evaluasi HOTS").trim();
  mataPelajaran = String(mataPelajaran || "Umum").trim();
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const MAX_PER_BATCH = 8;

  const generateSpecificType = async (typeLabel, totalRequired) => {
    if (totalRequired <= 0) return [];
    
    let batches = [];
    let sisa = totalRequired;
    while (sisa > 0) {
      batches.push(Math.min(sisa, MAX_PER_BATCH));
      sisa -= MAX_PER_BATCH;
    }

    const fetchBatch = async (batchSize) => {
      const prompt = buildUserPrompt(mataPelajaran, deskripsi, typeLabel, batchSize);
      let parsed = null;

      outer: for (const name of MODELS) {
        const model = genAI.getGenerativeModel({
          model: name, systemInstruction: SYSTEM_PROMPT,
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192, temperature: 0.7 },
        });

        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const result = await model.generateContent(prompt);
            parsed = parseGeminiJson(result.response.text());
            if (parsed && Array.isArray(parsed.soal) && parsed.soal.length > 0) break outer;
            parsed = null;
          } catch (e) { parsed = null; }
        }
      }
      if (!parsed || !parsed.soal) throw new Error(`Gagal memproses batch soal ${typeLabel}`);
      
      parsed.soal.forEach(q => q.tipeSpesifik = typeLabel);
      return parsed.soal;
    };

    const results = await Promise.all(batches.map(size => fetchBatch(size)));
    let combined = [];
    results.forEach(arr => combined = combined.concat(arr));
    return combined.slice(0, totalRequired);
  };

  try {
    let semuaSoal = [];
    
    if (jenisSoal === "Campuran") {
       const pgData = await generateSpecificType("Pilihan Ganda", Number(jumlahPG));
       const uraianData = await generateSpecificType("Uraian", Number(jumlahUraian));
       semuaSoal = [...pgData, ...uraianData];
    } else {
       semuaSoal = await generateSpecificType(jenisSoal, Number(jumlahSoal));
    }

    // LOGIKA PERBAIKAN PENOMORAN DAN LEVEL BLOOM
    let noPG = 1;
    let noUraian = 1;

    semuaSoal.forEach((item) => {
      // Jika AI masih membandel memberikan format C4/C5/C6, kita bersihkan
      if (!item.levelBloom || item.levelBloom.includes("C4/C5/C6")) {
          item.levelBloom = "C4 - Analisis"; 
      }

      let isUraian = item.tipeSpesifik === "Uraian";
      if (!item.tipeSpesifik) isUraian = jenisSoal === "Uraian";

      // Memisahkan penomoran Uraian dan PG
      if (isUraian) {
          item.nomor = noUraian++;
          item.isUraian = true;
      } else {
          item.nomor = noPG++;
          item.isUraian = false;
      }
    });

    return { judul: judulSoal, mataPelajaran, jenisSoal, soal: semuaSoal };

  } catch (error) {
    throw new Error("Sistem AI gagal memproses keseluruhan soal. Silakan coba lagi.");
  }
}

module.exports = { generateHotsQuestions, JENIS_VALID };
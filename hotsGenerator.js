require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const JENIS_VALID = ["Pilihan Ganda", "Uraian", "Campuran"];

const SYSTEM_PROMPT = `Anda adalah Ahli Evaluasi Pendidikan tingkat SMA/SMK berparadigma Deep Learning.
ATURAN MUTLAK:
1. Kontekstual: Selalu gunakan stimulus/studi kasus dunia nyata, fenomena Gen Z, atau kutipan karya NYATA (wajib sebutkan Judul/Sumber).
2. Nalar Kritis: Uji analisis dan logika tingkat tinggi (HOTS C4-C6), bukan sekadar mengingat (C1-C3).
3. Distraktor Logis: Opsi pengecoh harus logis berdasarkan kemungkinan miskonsepsi siswa.
4. Output JSON Murni: Jangan gunakan backticks markdown, berikan hanya objek JSON valid. Gunakan "\\n" untuk pindah baris.`;

function buildUserPrompt(mataPelajaran, jenjang, jurusan, deskripsi, jenisSoalType, batchSize) {
  let spesifikKonteks = "";
  if (jurusan && jurusan.includes("TKR")) {
    spesifikKonteks = "Kaitkan stimulus secara kuat dengan dunia Teknik Kendaraan Ringan, prosedur bengkel/SOP otomotif, investigasi troubleshooting mesin, sistem kelistrikan kendaraan, transmisi, atau sasis.";
  } else if (jurusan && jurusan.includes("TKJ")) {
    spesifikKonteks = "Kaitkan stimulus dengan infrastruktur IT nyata, arsitektur jaringan (LAN/WAN/Cloud), protokol, konfigurasi routing/switching, keamanan siber (cybersecurity), atau troubleshooting server.";
  } else if (jurusan && jurusan.includes("DKV")) {
    spesifikKonteks = "Kaitkan stimulus dengan industri kreatif, brief desain dari klien, prinsip tata letak/komposisi visual, tipografi, psikologi warna, branding, UI/UX, atau produksi multimedia.";
  } else if (jurusan && jurusan.includes("AK")) {
    spesifikKonteks = "Kaitkan stimulus dengan siklus akuntansi perusahaan nyata, jurnal transaksi, laporan keuangan, analisis audit, perpajakan, atau operasional perbankan.";
  } else {
    spesifikKonteks = "Gunakan konteks kejuruan vokasi yang relevan, studi kasus dunia kerja nyata, dan pemecahan masalah otentik.";
  }

  let spesifikMapel = "";
  if (mataPelajaran === "Informatika") {
    spesifikMapel = "Stimulus kasus IT otentik (jaringan, IoT, AI, algoritma, analisis data).";
  } else if (mataPelajaran === "Bahasa Inggris") {
    spesifikMapel = "Soal WAJIB Bahasa Inggris. Uji 'implied meaning', analisis teks otentik, atau komunikasi profesional bahasa Inggris.";
  } else if (mataPelajaran === "Matematika") {
    spesifikMapel = "Stimulus WAJIB berupa masalah kontekstual terapan. Uji kemampuan pemodelan dan penalaran matematis, BUKAN sekadar hitungan rumus langsung.";
  }

  return `Jenjang/Tingkat: ${jenjang || 'SMK'}
Jurusan / Konsentrasi Keahlian: ${jurusan || 'Kejuruan'}
Mata Pelajaran: ${mataPelajaran}
Topik/Cakupan Materi: ${deskripsi}
Instruksi Konteks: ${spesifikKonteks} ${spesifikMapel}

PERINGATAN: Buat TEPAT ${batchSize} soal ${jenisSoalType}. Tidak boleh kurang atau lebih!
Semua butir soal WAJIB berpusat pada topik materi di atas dan menguji nalar analitis tingkat tinggi (HOTS C4, C5, atau C6), bukan sekadar mengingat (C1-C3).

Hasilkan JSON dengan struktur persis seperti ini:
{
  "soal": [
    {
      "levelBloom": "C4, C5, atau C6 (PILIH SALAH SATU SAJA, contoh: 'C4 - Menganalisis')",
      "pertanyaan": "[STIMULUS NYATA] \\n\\n [PERTANYAAN NALAR]. DILARANG KERAS MENGKETIK OPSI JAWABAN ATAU TITIK-TITIK KOSONG (....) DI TEKS INI!",
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

const MODELS = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-2.5-flash-lite"];

async function generateHotsQuestions({ mataPelajaran, jenjang, jurusan, judulSoal, deskripsi, jenisSoal, jumlahSoal, jumlahPG, jumlahUraian }) {
  judulSoal = String(judulSoal || "Evaluasi HOTS").trim();
  mataPelajaran = String(mataPelajaran || "Umum").trim();
  jenjang = String(jenjang || "").trim();
  jurusan = String(jurusan || "").trim();
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("KODE_API_GEMINI")) {
    throw new Error("GEMINI_API_KEY belum diatur atau tidak valid di file .env / Vercel Environment Variables. Silakan dapatkan API Key di https://aistudio.google.com/app/apikey");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
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
      const prompt = buildUserPrompt(mataPelajaran, jenjang, jurusan, deskripsi, typeLabel, batchSize);
      let parsed = null;
      let lastError = null;
      let quotaExceeded = false;
      let invalidKey = false;

      outer: for (const name of MODELS) {
        const modelOptions = {
          model: name,
          systemInstruction: SYSTEM_PROMPT,
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192, temperature: 0.7 }
        };

        if (apiKey.startsWith("AQ.")) {
          modelOptions.requestOptions = { customHeaders: { 'x-goog-api-key': apiKey } };
        }

        const model = genAI.getGenerativeModel(modelOptions);

        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const result = await model.generateContent(prompt);
            parsed = parseGeminiJson(result.response.text());
            if (parsed && Array.isArray(parsed.soal) && parsed.soal.length > 0) break outer;
            parsed = null;
          } catch (e) {
            const errMsg = e.message || String(e);
            console.error(`Error dengan model ${name} (percobaan ${attempt + 1}):`, errMsg);
            lastError = errMsg;
            if (errMsg.includes("Quota exceeded") || errMsg.includes("429")) quotaExceeded = true;
            if (errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID")) invalidKey = true;
            parsed = null;
          }
        }
      }

      if (!parsed || !parsed.soal) {
        if (invalidKey) {
          throw new Error("API Key Gemini tidak valid. Silakan periksa GEMINI_API_KEY di .env atau Vercel Environment Variables.");
        }
        if (quotaExceeded) {
          throw new Error("Batas kuota gratis Gemini API terlampaui (Rate Limit / Quota Exceeded). Silakan tunggu 20 detik dan coba lagi.");
        }
        throw new Error(`Gagal memproses soal ${typeLabel}: ${lastError || 'Tidak ada respons dari AI'}`);
      }
      
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

    let noPG = 1;
    let noUraian = 1;

    semuaSoal.forEach((item) => {
      if (!item.levelBloom || item.levelBloom.includes("C4/C5/C6")) {
          item.levelBloom = "C4 - Analisis"; 
      }

      let isUraian = item.tipeSpesifik === "Uraian";
      if (!item.tipeSpesifik) isUraian = jenisSoal === "Uraian";

      if (isUraian) {
          item.nomor = noUraian++;
          item.isUraian = true;
      } else {
          item.nomor = noPG++;
          item.isUraian = false;
      }
    });

    return { judul: judulSoal, mataPelajaran, jenjang, jurusan, jenisSoal, soal: semuaSoal };

  } catch (error) {
    console.error("Overall generateHotsQuestions Error:", error.message || error);
    throw error;
  }
}

module.exports = { generateHotsQuestions, JENIS_VALID };
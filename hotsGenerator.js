require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const JENIS_VALID = [
  "Pilihan Ganda Standar",
  "Pilihan Ganda Kompleks",
  "Benar atau Salah",
  "Uraian"
];

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

  let instruksiTipe = "";
  let contohJson = "";

  if (jenisSoalType === "Pilihan Ganda Standar") {
    instruksiTipe = `Tipe Soal: PILIHAN GANDA STANDAR (Hanya 1 jawaban benar dari 5 opsi: A, B, C, D, E).
Opsi distraktor harus logis dan mengecoh berdasarkan miskonsepsi umum.`;
    contohJson = `{
  "soal": [
    {
      "levelBloom": "C4, C5, atau C6 (contoh: 'C4 - Menganalisis')",
      "pertanyaan": "[STIMULUS NYATA] \\n\\n [PERTANYAAN NALAR]. DILARANG KERAS MENGKETIK OPSI JAWABAN ATAU TITIK-TITIK KOSONG DI TEKS INI!",
      "opsi": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
      "jawabanBenar": "A",
      "pembahasan": "Penjelasan mengapa A benar dan opsi lain salah."
    }
  ]
}`;
  } else if (jenisSoalType === "Pilihan Ganda Kompleks") {
    instruksiTipe = `Tipe Soal: PILIHAN GANDA KOMPLEKS (Memiliki LEBIH DARI 1 jawaban benar, minimal 2 atau 3 opsi benar dari A, B, C, D, E).
Wajib sertakan instruksi "(Pilihlah lebih dari satu jawaban yang benar)" di teks pertanyaan.
Kunci "jawabanBenar" berisi daftar opsi yang benar, misal: "A, C" atau "B, D, E".`;
    contohJson = `{
  "soal": [
    {
      "levelBloom": "C4, C5, atau C6 (contoh: 'C4 - Menganalisis')",
      "pertanyaan": "[STIMULUS NYATA] \\n\\n [PERTANYAAN NALAR]. (Pilihlah lebih dari satu jawaban yang benar)",
      "opsi": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
      "jawabanBenar": "A, C",
      "pembahasan": "Penjelasan mengapa opsi A dan C benar, sedangkan opsi lainnya salah."
    }
  ]
}`;
  } else if (jenisSoalType === "Benar atau Salah") {
    instruksiTipe = `Tipe Soal: BENAR ATAU SALAH ([ B ] / [ S ]).
Stimulus studi kasus diikuti sebuah pernyataan analitis mendalam di mana siswa harus menentukan apakah pernyataan tersebut Benar atau Salah.
Kunci "opsi" diisi null.
Kunci "jawabanBenar" HANYA bernilai "B" (jika pernyataan Benar) atau "S" (jika pernyataan Salah).
Kunci "pembahasan" wajib menjelaskan analisis lengkap mengapa pernyataan bernilai Benar/Salah.`;
    contohJson = `{
  "soal": [
    {
      "levelBloom": "C4, C5, atau C6 (contoh: 'C4 - Menganalisis')",
      "pertanyaan": "[STIMULUS KASUS DUNIA NYATA DAN PERNYATAAN ANALITIS]",
      "opsi": null,
      "jawabanBenar": "B",
      "pembahasan": "Penjelasan mendalam mengapa pernyataan tersebut bernilai Benar."
    }
  ]
}`;
  } else if (jenisSoalType === "Uraian") {
    instruksiTipe = `Tipe Soal: URAIAN / ESAI ANALITIS TINGKAT TINGGI.
Pertanyaan terbuka evaluatif atau pemecahan masalah (C5/C6).
Kunci "opsi" diisi null.
Kunci "jawabanBenar" berisi Rubrik Penilaian dan Kriteria Skor.
Kunci "pembahasan" berisi solusi komprehensif.`;
    contohJson = `{
  "soal": [
    {
      "levelBloom": "C5, atau C6 (contoh: 'C5 - Mengevaluasi')",
      "pertanyaan": "[STIMULUS KASUS DUNIA NYATA] \\n\\n [PERTANYAAN URAIAN TINGKAT TINGGI]",
      "opsi": null,
      "jawabanBenar": "Rubrik Penilaian: Skor 4 jika..., Skor 3 jika..., Skor 2 jika...",
      "pembahasan": "Uraian pemecahan masalah dan pembahasan menyeluruh."
    }
  ]
}`;
  }

  return `Jenjang/Tingkat: ${jenjang || 'SMK'}
Jurusan / Konsentrasi Keahlian: ${jurusan || 'Kejuruan'}
Mata Pelajaran: ${mataPelajaran}
Topik/Cakupan Materi: ${deskripsi}
Instruksi Konteks: ${spesifikKonteks} ${spesifikMapel}

${instruksiTipe}

PERINGATAN SANGAT PENTING:
- Buat TEPAT ${batchSize} butir soal ${jenisSoalType}. Tidak boleh kurang dan tidak boleh lebih!
- Semua butir soal WAJIB berpusat pada materi di atas dan menguji nalar HOTS (C4, C5, C6).
- Format HANYA JSON murni tanpa markdown!

Struktur JSON:
${contohJson}`;
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

async function callVikeyApi(prompt, modelName, apiKey) {
  const payload = JSON.stringify({
    model: modelName || "anthropic/haiku-5.5",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ],
    temperature: 0.7
  });

  const response = await fetch("https://api.vikey.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: payload
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vikey API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content) {
    throw new Error("Respons kosong dari Vikey API");
  }
  return content;
}

async function generateHotsQuestions({
  mataPelajaran,
  jenjang,
  jurusan,
  judulSoal,
  deskripsi,
  selectedTypes = [],
  jumlahPGStandar = 0,
  jumlahPGKompleks = 0,
  jumlahBenarSalah = 0,
  jumlahUraian = 0,
  jenisSoal,
  jumlahSoal,
  jumlahPG
}) {
  judulSoal = String(judulSoal || "Evaluasi HOTS").trim();
  mataPelajaran = String(mataPelajaran || "Umum").trim();
  jenjang = String(jenjang || "").trim();
  jurusan = String(jurusan || "").trim();
  
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  const vikeyApiKey = process.env.VIKEY_API_KEY;
  const vikeyModel = process.env.VIKEY_MODEL || "anthropic/haiku-5.5";
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (provider === 'vikey') {
    if (!vikeyApiKey) {
      throw new Error("VIKEY_API_KEY belum diatur di file .env / Vercel Environment Variables.");
    }
  } else {
    if (!geminiApiKey || geminiApiKey.includes("KODE_API_GEMINI")) {
      throw new Error("GEMINI_API_KEY belum diatur atau tidak valid di file .env / Vercel Environment Variables. Silakan dapatkan API Key di https://aistudio.google.com/app/apikey");
    }
  }

  const genAI = (provider !== 'vikey' && geminiApiKey) ? new GoogleGenerativeAI(geminiApiKey) : null;
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

      if (provider === 'vikey') {
        try {
          const rawText = await callVikeyApi(prompt, vikeyModel, vikeyApiKey);
          parsed = parseGeminiJson(rawText);
        } catch (e) {
          lastError = e.message || String(e);
          console.error(`Error pemanggilan Vikey (${vikeyModel}):`, lastError);
        }
      } else {
        let quotaExceeded = false;
        let invalidKey = false;

        outer: for (const name of MODELS) {
          const modelOptions = {
            model: name,
            systemInstruction: SYSTEM_PROMPT,
            generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192, temperature: 0.7 }
          };

          if (geminiApiKey && geminiApiKey.startsWith("AQ.")) {
            modelOptions.requestOptions = { customHeaders: { 'x-goog-api-key': geminiApiKey } };
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

        if ((!parsed || !parsed.soal) && quotaExceeded) {
          throw new Error("Batas kuota gratis Gemini API terlampaui. Silakan tunggu 20 detik dan coba lagi.");
        }
        if ((!parsed || !parsed.soal) && invalidKey) {
          throw new Error("API Key Gemini tidak valid. Silakan periksa GEMINI_API_KEY.");
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
    let requests = [];

    if (Array.isArray(selectedTypes) && selectedTypes.length > 0) {
      if (selectedTypes.includes("Pilihan Ganda Standar") && Number(jumlahPGStandar) > 0) {
        requests.push({ type: "Pilihan Ganda Standar", count: Number(jumlahPGStandar) });
      }
      if (selectedTypes.includes("Pilihan Ganda Kompleks") && Number(jumlahPGKompleks) > 0) {
        requests.push({ type: "Pilihan Ganda Kompleks", count: Number(jumlahPGKompleks) });
      }
      if (selectedTypes.includes("Benar atau Salah") && Number(jumlahBenarSalah) > 0) {
        requests.push({ type: "Benar atau Salah", count: Number(jumlahBenarSalah) });
      }
      if (selectedTypes.includes("Uraian") && Number(jumlahUraian) > 0) {
        requests.push({ type: "Uraian", count: Number(jumlahUraian) });
      }
    }

    // Fallback legacy jika jenisSoal tunggal
    if (requests.length === 0) {
      if (jenisSoal === "Campuran") {
        requests.push({ type: "Pilihan Ganda Standar", count: Number(jumlahPG) || 5 });
        requests.push({ type: "Uraian", count: Number(jumlahUraian) || 5 });
      } else if (jenisSoal === "Uraian") {
        requests.push({ type: "Uraian", count: Number(jumlahSoal) || 5 });
      } else {
        requests.push({ type: "Pilihan Ganda Standar", count: Number(jumlahSoal) || 5 });
      }
    }

    // Eksekusi paralel pembuatan butir soal
    const results = await Promise.all(requests.map(r => generateSpecificType(r.type, r.count)));
    let semuaSoal = [];
    results.forEach(arr => {
      semuaSoal = semuaSoal.concat(arr);
    });

    let noPGStandar = 1;
    let noPGKompleks = 1;
    let noBenarSalah = 1;
    let noUraian = 1;

    semuaSoal.forEach((item) => {
      if (!item.levelBloom || item.levelBloom.includes("C4/C5/C6")) {
        item.levelBloom = "C4 - Analisis"; 
      }

      if (item.tipeSpesifik === "Pilihan Ganda Standar") {
        item.nomor = noPGStandar++;
        item.isUraian = false;
      } else if (item.tipeSpesifik === "Pilihan Ganda Kompleks") {
        item.nomor = noPGKompleks++;
        item.isUraian = false;
      } else if (item.tipeSpesifik === "Benar atau Salah") {
        item.nomor = noBenarSalah++;
        item.isUraian = false;
      } else if (item.tipeSpesifik === "Uraian") {
        item.nomor = noUraian++;
        item.isUraian = true;
      }
    });

    const activeTypes = requests.map(r => r.type);
    return {
      judul: judulSoal,
      mataPelajaran,
      jenjang,
      jurusan,
      jenisSoal: activeTypes.join(', '),
      selectedTypes: activeTypes,
      soal: semuaSoal
    };

  } catch (error) {
    console.error("Overall generateHotsQuestions Error:", error.message || error);
    throw error;
  }
}

module.exports = { generateHotsQuestions, JENIS_VALID };
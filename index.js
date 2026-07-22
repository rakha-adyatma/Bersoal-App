const fs = require("fs");
const { generateHotsQuestions } = require("./hotsGenerator");
const { generateHotsPdf } = require("./hotsPdf");

async function main() {
  console.log("⏳ Sedang memproses pembuatan soal via Gemini AI...");

  try {
    // Kamu bisa mengganti topik soalnya di sini
    const dataKonteks = {
      mataPelajaran: "Informatika",
      judulSoal: "Modul Evaluasi Coding dan AI",
      deskripsi: "Pemahaman logika pemrograman Python dan implementasi Artificial Intelligence sederhana menggunakan lingkungan Google Colab.",
      jenisSoal: "Pilihan Ganda", 
      jumlahSoal: 5
    };

    // 1. Generate JSON Soal
    const dataSoal = await generateHotsQuestions(dataKonteks);
    console.log("✅ Soal berhasil dibuat! Sedang merender file PDF...");

    // 2. Generate PDF Soal & Kunci Jawaban
    const pdf = await generateHotsPdf(dataSoal, dataKonteks);

    // 3. Simpan ke hardisk
    fs.writeFileSync(pdf.soal.filename, pdf.soal.buffer);
    fs.writeFileSync(pdf.kunci.filename, pdf.kunci.buffer);

    console.log("\n🎉 SUKSES! File berhasil disimpan di foldermu:");
    console.log(`📄 Soal   : ${pdf.soal.filename}`);
    console.log(`🗝️  Kunci  : ${pdf.kunci.filename}\n`);

  } catch (error) {
    console.error("❌ Terjadi Kesalahan:", error.message);
  }
}

main();
const PDFDocument = require('pdfkit');
const path = require('path');

// Mengambil font menggunakan process.cwd() agar terbaca oleh server Vercel
function getFonts() {
  return {
    normal: path.join(process.cwd(), 'assets', 'fonts', 'DejaVuSans.ttf'),
    bold: path.join(process.cwd(), 'assets', 'fonts', 'DejaVuSans-Bold.ttf')
  };
}

function buildPdfSoal(data) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const fonts = getFonts();

  // Bagian Header (Kop Soal)
  doc.font(fonts.bold).fontSize(16).text(data.judul, { align: 'center' });
  doc.fontSize(12).text(`Mata Pelajaran: ${data.mataPelajaran}`, { align: 'center' });
  doc.text(`Jenis Ujian: ${data.jenisSoal}`, { align: 'center' });
  doc.moveDown(2);

  // Iterasi pencetakan soal
  data.soal.forEach((item) => {
    let labelBloom = item.levelBloom ? ` ${item.levelBloom} ` : '';
    
    // Nomor Soal dan Level Kognitif
    doc.font(fonts.bold).fontSize(11).text(`No. ${item.nomor} | ${labelBloom}`);
    
    // Pertanyaan (Stimulus)
    doc.font(fonts.normal).fontSize(11).text(item.pertanyaan, { align: 'justify' });
    doc.moveDown(0.5);

    // Cek apakah soal ini punya opsi jawaban (Pilihan Ganda) atau Uraian
    if (item.opsi && typeof item.opsi === 'object' && Object.keys(item.opsi).length > 0) {
      const labels = ['A', 'B', 'C', 'D', 'E'];
      labels.forEach(opt => {
        if (item.opsi[opt]) {
          doc.text(`${opt}. ${item.opsi[opt]}`);
        }
      });
      doc.moveDown(1.5);
    } else {
      // Jika Uraian, berikan ruang kosong/jarak
      doc.moveDown(5); 
    }
  });

  return doc;
}

function buildPdfKunci(data) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const fonts = getFonts();

  // Bagian Header Kunci Jawaban
  doc.font(fonts.bold).fontSize(16).text(`KUNCI JAWABAN & RUBRIK`, { align: 'center' });
  doc.fontSize(12).text(`${data.judul}`, { align: 'center' });
  doc.text(`Mata Pelajaran: ${data.mataPelajaran}`, { align: 'center' });
  doc.moveDown(2);

  // Iterasi pencetakan kunci dan pembahasan
  data.soal.forEach((item) => {
    let labelBloom = item.levelBloom ? ` ${item.levelBloom} ` : '';
    
    doc.font(fonts.bold).fontSize(11).text(`No. ${item.nomor} | ${labelBloom}`);
    
    // Cek tipe soal berdasarkan isi jawabanBenar
    if (item.opsi && typeof item.opsi === 'object' && Object.keys(item.opsi).length > 0) {
       doc.font(fonts.bold).text(`Jawaban: ${item.jawabanBenar}`);
    } else {
       doc.font(fonts.bold).text(`Rubrik Penilaian:`);
       doc.font(fonts.normal).text(item.jawabanBenar, { align: 'justify' });
    }
    
    doc.font(fonts.normal).text(`Pembahasan: ${item.pembahasan}`, { align: 'justify' });
    doc.moveDown(1.5);
  });

  return doc;
}

module.exports = { buildPdfSoal, buildPdfKunci };
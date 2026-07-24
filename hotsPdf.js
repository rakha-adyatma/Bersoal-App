const PDFDocument = require('pdfkit');
const path = require('path');

function getFonts() {
  return {
    normal: path.join(process.cwd(), 'assets', 'fonts', 'DejaVuSans.ttf'),
    bold: path.join(process.cwd(), 'assets', 'fonts', 'DejaVuSans-Bold.ttf')
  };
}

// Fungsi serbaguna untuk mencetak Kop Surat di setiap file
function cetakHeader(doc, data, fonts, isKunci = false) {
  doc.font(fonts.bold).fontSize(14).text(isKunci ? 'KUNCI JAWABAN & RUBRIK PENILAIAN' : 'INSTRUMEN EVALUASI HOTS', { align: 'center' });
  doc.fontSize(12).text(data.judul, { align: 'center' });
  doc.moveDown(0.5);
  
  doc.font(fonts.normal).fontSize(10);
  doc.text(`Mata Pelajaran    : ${data.mataPelajaran}`);
  doc.text(`Tipe Asesmen      : ${data.jenisSoal}`);
  
  // Menggambar garis lurus pemisah header
  const y = doc.y + 5;
  doc.moveTo(50, y).lineTo(545, y).stroke();
  doc.moveDown(1.5);
}

function buildPdfSoal(data) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const fonts = getFonts();

  cetakHeader(doc, data, fonts, false);

  const soalPG = data.soal.filter(s => !s.isUraian);
  const soalUraian = data.soal.filter(s => s.isUraian);

  // BAGIAN A: PILIHAN GANDA
  if (soalPG.length > 0) {
    if (data.jenisSoal === 'Campuran') {
       doc.font(fonts.bold).fontSize(11).text('A. PILIHAN GANDA');
       doc.moveDown(0.5);
    }
    soalPG.forEach(item => {
       doc.font(fonts.bold).fontSize(10).text(`No. ${item.nomor}  |  Level: ${item.levelBloom}`);
       doc.font(fonts.normal).text(item.pertanyaan, { align: 'justify' });
       doc.moveDown(0.5);
       
       if (item.opsi && typeof item.opsi === 'object') {
         ['A', 'B', 'C', 'D', 'E'].forEach(opt => {
           if (item.opsi[opt]) doc.text(`${opt}. ${item.opsi[opt]}`);
         });
       }
       doc.moveDown(1.5);
    });
  }

  // BAGIAN B: URAIAN
  if (soalUraian.length > 0) {
    // Jika sebelumnya ada Pilihan Ganda, pindah ke Halaman Baru!
    if (soalPG.length > 0) doc.addPage(); 
    
    if (data.jenisSoal === 'Campuran') {
       doc.font(fonts.bold).fontSize(11).text('B. URAIAN');
       doc.moveDown(0.5);
    }
    soalUraian.forEach(item => {
       doc.font(fonts.bold).fontSize(10).text(`No. ${item.nomor}  |  Level: ${item.levelBloom}`);
       doc.font(fonts.normal).text(item.pertanyaan, { align: 'justify' });
       doc.moveDown(1);
       
       // Mencetak garis titik-titik kosong untuk dijawab siswa
       for (let i = 0; i < 5; i++) {
          doc.text('................................................................................................................................................................', { align: 'left', opacity: 0.5 });
          doc.moveDown(0.5);
       }
       doc.moveDown(1);
    });
  }

  return doc;
}

function buildPdfKunci(data) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const fonts = getFonts();

  cetakHeader(doc, data, fonts, true);

  const soalPG = data.soal.filter(s => !s.isUraian);
  const soalUraian = data.soal.filter(s => s.isUraian);

  if (soalPG.length > 0) {
    if (data.jenisSoal === 'Campuran') {
       doc.font(fonts.bold).fontSize(11).text('A. PILIHAN GANDA');
       doc.moveDown(0.5);
    }
    soalPG.forEach(item => {
       doc.font(fonts.bold).fontSize(10).text(`No. ${item.nomor}  |  Level: ${item.levelBloom}`);
       doc.text(`Jawaban: ${item.jawabanBenar}`);
       doc.font(fonts.normal).text(`Pembahasan: ${item.pembahasan}`, { align: 'justify' });
       doc.moveDown(1.5);
    });
  }

  if (soalUraian.length > 0) {
    if (soalPG.length > 0) doc.addPage(); // Pindah Halaman
    if (data.jenisSoal === 'Campuran') {
       doc.font(fonts.bold).fontSize(11).text('B. URAIAN');
       doc.moveDown(0.5);
    }
    soalUraian.forEach(item => {
       doc.font(fonts.bold).fontSize(10).text(`No. ${item.nomor}  |  Level: ${item.levelBloom}`);
       doc.text(`Rubrik Penilaian:`);
       doc.font(fonts.normal).text(item.jawabanBenar, { align: 'justify' });
       doc.moveDown(0.5);
       doc.text(`Pembahasan Tambahan: ${item.pembahasan}`, { align: 'justify' });
       doc.moveDown(1.5);
    });
  }

  return doc;
}

module.exports = { buildPdfSoal, buildPdfKunci };
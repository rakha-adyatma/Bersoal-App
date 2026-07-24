const PDFDocument = require('pdfkit');
const path = require('path');

function getFonts() {
  return {
    normal: path.join(process.cwd(), 'assets', 'fonts', 'DejaVuSans.ttf'),
    bold: path.join(process.cwd(), 'assets', 'fonts', 'DejaVuSans-Bold.ttf')
  };
}

function cetakHeader(doc, data, fonts, isKunci = false) {
  doc.font(fonts.bold).fontSize(14).text(isKunci ? 'KUNCI JAWABAN & RUBRIK PENILAIAN' : 'INSTRUMEN EVALUASI HOTS', { align: 'center' });
  doc.fontSize(12).text(data.judul, { align: 'center' });
  doc.moveDown(0.5);
  
  doc.font(fonts.normal).fontSize(10);
  doc.text(`Mata Pelajaran    : ${data.mataPelajaran}`);
  doc.text(`Tipe Asesmen      : ${data.jenisSoal}`);
  
  const y = doc.y + 5;
  doc.moveTo(50, y).lineTo(545, y).lineWidth(1).stroke();
  doc.moveDown(1.5);
}

function buildPdfSoal(data) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const fonts = getFonts();

  cetakHeader(doc, data, fonts, false);

  const soalPG = data.soal.filter(s => !s.isUraian);
  const soalUraian = data.soal.filter(s => s.isUraian);

  if (soalPG.length > 0) {
    if (data.jenisSoal === 'Campuran') {
       doc.font(fonts.bold).fontSize(11).text('A. PILIHAN GANDA');
       doc.moveDown(0.5);
    }
    soalPG.forEach(item => {
       doc.font(fonts.bold).fontSize(10).text(`No. ${item.nomor}  |  Level: ${item.levelBloom}`);
       
       // CLEANUP: Menghapus opsi nyasar atau titik-titik (....) bawaan AI di dalam teks pertanyaan
       let teksPertanyaan = item.pertanyaan
           .replace(/\n\s*[A-E]\.\s+[\s\S]*$/i, '') 
           .replace(/\.{4,}/g, '') // Memusnahkan titik-titik lebih dari 4
           .trim();
       
       doc.font(fonts.normal).text(teksPertanyaan, { align: 'justify' });
       doc.moveDown(0.5);
       
       // TEKNIK HANGING INDENT: A,B,C terpisah dari teks panjang agar menjorok rapi
       if (item.opsi && typeof item.opsi === 'object') {
         const startX = 50; 
         ['A', 'B', 'C', 'D', 'E'].forEach(opt => {
           if (item.opsi[opt]) {
             let teksOpsi = item.opsi[opt].replace(/^[A-E]\.\s*/i, '').trim();
             let currentY = doc.y;
             
             // Cetak huruf opsi (misal: 'A.')
             doc.text(`${opt}.`, startX, currentY);
             // Cetak teks jawabannya (digeser 18 pixel ke kanan)
             doc.text(teksOpsi, startX + 18, currentY, { align: 'justify', width: 477 });
           }
         });
       }
       doc.moveDown(1.5);
    });
  }

  if (soalUraian.length > 0) {
    if (soalPG.length > 0) doc.addPage(); 
    
    if (data.jenisSoal === 'Campuran') {
       doc.font(fonts.bold).fontSize(11).text('B. URAIAN');
       doc.moveDown(0.5);
    }
    soalUraian.forEach(item => {
       doc.font(fonts.bold).fontSize(10).text(`No. ${item.nomor}  |  Level: ${item.levelBloom}`);
       
       // CLEANUP: Mencegah AI mencetak titik-titik bawaan
       let teksPertanyaan = item.pertanyaan.replace(/\.{4,}/g, '').trim();
       doc.font(fonts.normal).text(teksPertanyaan, { align: 'justify' });
       
       // MENGGAMBAR GARIS PUTUS-PUTUS VEKTOR (Bersih dan sejajar)
       for (let i = 0; i < 5; i++) {
          doc.moveDown(1.5);
          let yLine = doc.y;
          doc.lineWidth(0.5).strokeOpacity(0.5)
             .moveTo(50, yLine)
             .lineTo(545, yLine)
             .dash(3, { space: 4 }) // Membuat efek garis putus-putus titik
             .stroke()
             .undash() // Reset agar teks di bawahnya tidak error
             .strokeOpacity(1);
       }
       doc.moveDown(2);
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
    if (soalPG.length > 0) doc.addPage();
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
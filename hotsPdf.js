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
  doc.moveTo(50, y).lineTo(545, y).lineWidth(1).strokeColor('#000000').stroke();
  doc.moveDown(1.5);
}

// ALGORITMA PEMBERSIH TEKS (Menebas opsi dobel dan titik-titik buatan AI)
function cleanPertanyaan(text) {
  if (!text) return "";
  let lines = text.split('\n');
  
  // 1. Buang paksa baris yang dimulai dengan A., B., C., D., E. 
  let cleanLines = lines.filter(line => !/^\s*[A-E][\.\)]\s/i.test(line));
  
  // 2. Buang paksa baris yang sengaja diketik AI berisi titik-titik (....) atau garis bawah (____)
  cleanLines = cleanLines.filter(line => !/^[\.\s_]{4,}$/.test(line));
  
  // 3. Bersihkan titik-titik nyasar di akhir kalimat
  return cleanLines.join('\n').replace(/[\._]{4,}/g, '').trim();
}

function buildPdfSoal(data) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const fonts = getFonts();

  cetakHeader(doc, data, fonts, false);

  const soalPG = data.soal.filter(s => !s.isUraian);
  const soalUraian = data.soal.filter(s => s.isUraian);

  // ===================== BAGIAN A: PILIHAN GANDA =====================
  if (soalPG.length > 0) {
    if (data.jenisSoal === 'Campuran') {
       doc.font(fonts.bold).fontSize(11).text('A. PILIHAN GANDA');
       doc.moveDown(0.5);
    }
    soalPG.forEach(item => {
       let teksPertanyaan = cleanPertanyaan(item.pertanyaan);
       doc.font(fonts.bold).fontSize(10).text(`No. ${item.nomor}  |  Level: ${item.levelBloom}`);
       doc.font(fonts.normal).text(teksPertanyaan, { align: 'justify' });
       doc.moveDown(0.5);
       
       if (item.opsi && typeof item.opsi === 'object') {
         ['A', 'B', 'C', 'D', 'E'].forEach(opt => {
           if (item.opsi[opt]) {
             let teksOpsi = item.opsi[opt].replace(/^[A-E][\.\)]\s*/i, '').trim();
             
             // PERLINDUNGAN HALAMAN: Cek apakah teks opsi ini akan menabrak bawah halaman
             let textHeight = doc.heightOfString(teksOpsi, { width: 459, align: 'justify' });
             if (doc.y + textHeight + 10 > doc.page.height - doc.page.margins.bottom) {
                 doc.addPage(); // Jika tidak muat, paksa pindah halaman DULU sebelum dicetak
             }
             
             // HANGING INDENT: A. di kiri, teks menjolok rapi di kanan
             let currentY = doc.y;
             doc.text(`${opt}.`, 50, currentY);
             doc.text(teksOpsi, 68, currentY, { align: 'justify', width: 459 });
             doc.x = 50; // Kembalikan posisi x ke awal
           }
         });
       }
       doc.moveDown(1.5);
    });
  }

  // ===================== BAGIAN B: URAIAN =====================
  if (soalUraian.length > 0) {
    if (soalPG.length > 0) doc.addPage(); 
    
    if (data.jenisSoal === 'Campuran') {
       doc.font(fonts.bold).fontSize(11).text('B. URAIAN');
       doc.moveDown(0.5);
    }
    soalUraian.forEach(item => {
       let teksPertanyaan = cleanPertanyaan(item.pertanyaan);
       
       // PERLINDUNGAN HALAMAN URAIAN
       let qHeight = doc.heightOfString(teksPertanyaan, { align: 'justify' });
       if (doc.y + qHeight + 40 > doc.page.height - doc.page.margins.bottom) {
           doc.addPage();
       }
       
       doc.font(fonts.bold).fontSize(10).text(`No. ${item.nomor}  |  Level: ${item.levelBloom}`);
       doc.font(fonts.normal).text(teksPertanyaan, { align: 'justify' });
       
       // CETAK 5 GARIS JAWABAN (Menggunakan Vektor Solid Abu-abu Rapi, bukan ketikan titik)
       for (let i = 0; i < 5; i++) {
          doc.moveDown(1.5);
          if (doc.y > doc.page.height - doc.page.margins.bottom - 10) {
              doc.addPage(); // Cek lagi jangan sampai garis keluar halaman
          }
          let yLine = doc.y;
          doc.lineWidth(0.5).strokeColor('#888888')
             .moveTo(50, yLine)
             .lineTo(545, yLine)
             .stroke();
       }
       doc.strokeColor('#000000'); // Kembalikan tinta ke hitam
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
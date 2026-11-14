const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

function getFonts() {
  const fontDir = path.join(__dirname, 'assets', 'fonts');
  const normalPath = path.join(fontDir, 'DejaVuSans.ttf');
  const boldPath = path.join(fontDir, 'DejaVuSans-Bold.ttf');
  if (fs.existsSync(normalPath) && fs.existsSync(boldPath)) {
    return { normal: normalPath, bold: boldPath };
  }
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
  doc.text(`Mata Pelajaran      : ${data.mataPelajaran}`);
  if (data.jenjang) {
    doc.text(`Tingkat / Kelas     : ${data.jenjang}`);
  }
  if (data.jurusan) {
    doc.text(`Konsentrasi Keahlian: ${data.jurusan}`);
  }
  doc.text(`Tipe Asesmen        : ${data.jenisSoal}`);
  
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

  const soalPGStandar = data.soal.filter(s => s.tipeSpesifik === 'Pilihan Ganda Standar' || (!s.tipeSpesifik && !s.isUraian));
  const soalPGKompleks = data.soal.filter(s => s.tipeSpesifik === 'Pilihan Ganda Kompleks');
  const soalBenarSalah = data.soal.filter(s => s.tipeSpesifik === 'Benar atau Salah');
  const soalUraian = data.soal.filter(s => s.tipeSpesifik === 'Uraian' || (!s.tipeSpesifik && s.isUraian));

  const sections = [];
  if (soalPGStandar.length > 0) sections.push({ key: 'pgStandar', title: 'PILIHAN GANDA STANDAR', items: soalPGStandar });
  if (soalPGKompleks.length > 0) sections.push({ key: 'pgKompleks', title: 'PILIHAN GANDA KOMPLEKS (LEBIH DARI 1 JAWABAN BENAR)', items: soalPGKompleks });
  if (soalBenarSalah.length > 0) sections.push({ key: 'benarSalah', title: 'BENAR ATAU SALAH ([ B ] / [ S ])', items: soalBenarSalah });
  if (soalUraian.length > 0) sections.push({ key: 'uraian', title: 'URAIAN / ESAI', items: soalUraian });

  const abjad = ['A', 'B', 'C', 'D'];

  sections.forEach((sec, sIdx) => {
    if (sIdx > 0) {
      doc.addPage();
    }

    const heading = sections.length > 1 ? `BAGIAN ${abjad[sIdx]}: ${sec.title}` : sec.title;
    doc.font(fonts.bold).fontSize(11).text(heading);
    doc.moveDown(0.7);

    sec.items.forEach(item => {
      let teksPertanyaan = cleanPertanyaan(item.pertanyaan);

      // Cek proteksi awal soal
      let estHeight = doc.heightOfString(teksPertanyaan, { width: 495, align: 'justify' }) + 40;
      if (doc.y + estHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
      }

      doc.font(fonts.bold).fontSize(10).text(`No. ${item.nomor}  |  Level: ${item.levelBloom}`);
      doc.font(fonts.normal).text(teksPertanyaan, { align: 'justify' });
      doc.moveDown(0.4);

      if (sec.key === 'pgStandar') {
        if (item.opsi && typeof item.opsi === 'object') {
          ['A', 'B', 'C', 'D', 'E'].forEach(opt => {
            if (item.opsi[opt]) {
              let teksOpsi = item.opsi[opt].replace(/^[A-E][\.\)]\s*/i, '').trim();
              let textHeight = doc.heightOfString(teksOpsi, { width: 459, align: 'justify' });
              if (doc.y + textHeight + 10 > doc.page.height - doc.page.margins.bottom) {
                doc.addPage();
              }
              let currentY = doc.y;
              doc.text(`${opt}.`, 50, currentY);
              doc.text(teksOpsi, 68, currentY, { align: 'justify', width: 459 });
              doc.x = 50;
            }
          });
        }
        doc.moveDown(1.5);

      } else if (sec.key === 'pgKompleks') {
        if (item.opsi && typeof item.opsi === 'object') {
          ['A', 'B', 'C', 'D', 'E'].forEach(opt => {
            if (item.opsi[opt]) {
              let teksOpsi = item.opsi[opt].replace(/^[A-E][\.\)]\s*/i, '').trim();
              let textHeight = doc.heightOfString(teksOpsi, { width: 445, align: 'justify' });
              if (doc.y + textHeight + 10 > doc.page.height - doc.page.margins.bottom) {
                doc.addPage();
              }
              let currentY = doc.y;
              doc.text(`[  ] ${opt}.`, 50, currentY);
              doc.text(teksOpsi, 82, currentY, { align: 'justify', width: 445 });
              doc.x = 50;
            }
          });
        }
        doc.moveDown(1.5);

      } else if (sec.key === 'benarSalah') {
        if (doc.y + 35 > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
        }
        let currentY = doc.y + 2;
        doc.font(fonts.bold).fontSize(10).text('[ B ]       [ S ]', 70, currentY);
        doc.x = 50;
        doc.moveDown(1.6);

      } else if (sec.key === 'uraian') {
        for (let i = 0; i < 5; i++) {
          doc.moveDown(1.5);
          if (doc.y > doc.page.height - doc.page.margins.bottom - 10) {
            doc.addPage();
          }
          let yLine = doc.y;
          doc.lineWidth(0.5).strokeColor('#888888')
             .moveTo(50, yLine)
             .lineTo(545, yLine)
             .stroke();
        }
        doc.strokeColor('#000000');
        doc.moveDown(2);
      }
    });
  });

  return doc;
}

function buildPdfKunci(data) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const fonts = getFonts();

  cetakHeader(doc, data, fonts, true);

  const soalPGStandar = data.soal.filter(s => s.tipeSpesifik === 'Pilihan Ganda Standar' || (!s.tipeSpesifik && !s.isUraian));
  const soalPGKompleks = data.soal.filter(s => s.tipeSpesifik === 'Pilihan Ganda Kompleks');
  const soalBenarSalah = data.soal.filter(s => s.tipeSpesifik === 'Benar atau Salah');
  const soalUraian = data.soal.filter(s => s.tipeSpesifik === 'Uraian' || (!s.tipeSpesifik && s.isUraian));

  const sections = [];
  if (soalPGStandar.length > 0) sections.push({ key: 'pgStandar', title: 'PILIHAN GANDA STANDAR', items: soalPGStandar });
  if (soalPGKompleks.length > 0) sections.push({ key: 'pgKompleks', title: 'PILIHAN GANDA KOMPLEKS', items: soalPGKompleks });
  if (soalBenarSalah.length > 0) sections.push({ key: 'benarSalah', title: 'BENAR ATAU SALAH', items: soalBenarSalah });
  if (soalUraian.length > 0) sections.push({ key: 'uraian', title: 'URAIAN / ESAI', items: soalUraian });

  const abjad = ['A', 'B', 'C', 'D'];

  sections.forEach((sec, sIdx) => {
    if (sIdx > 0) {
      doc.addPage();
    }

    const heading = sections.length > 1 ? `BAGIAN ${abjad[sIdx]}: ${sec.title}` : sec.title;
    doc.font(fonts.bold).fontSize(11).text(heading);
    doc.moveDown(0.7);

    sec.items.forEach(item => {
      let estHeight = 70;
      if (doc.y + estHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
      }

      doc.font(fonts.bold).fontSize(10).text(`No. ${item.nomor}  |  Level: ${item.levelBloom}`);

      if (sec.key === 'pgStandar') {
        doc.text(`Jawaban: ${item.jawabanBenar}`);
        doc.font(fonts.normal).text(`Pembahasan: ${item.pembahasan}`, { align: 'justify' });
      } else if (sec.key === 'pgKompleks') {
        doc.text(`Kunci Jawaban: ${item.jawabanBenar}`);
        doc.font(fonts.normal).text(`Pembahasan: ${item.pembahasan}`, { align: 'justify' });
      } else if (sec.key === 'benarSalah') {
        const isB = String(item.jawabanBenar || '').toUpperCase().includes('B');
        doc.text(`Kunci Jawaban: ${isB ? 'BENAR [ B ]' : 'SALAH [ S ]'}`);
        doc.font(fonts.normal).text(`Pembahasan: ${item.pembahasan}`, { align: 'justify' });
      } else if (sec.key === 'uraian') {
        doc.text(`Rubrik Penilaian:`);
        doc.font(fonts.normal).text(item.jawabanBenar, { align: 'justify' });
        doc.moveDown(0.5);
        doc.font(fonts.bold).text(`Pembahasan Solusi:`);
        doc.font(fonts.normal).text(item.pembahasan, { align: 'justify' });
      }

      doc.moveDown(1.5);
    });
  });

  return doc;
}

module.exports = { buildPdfSoal, buildPdfKunci };
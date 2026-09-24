// Approach C: client-side PDF library (pdfkit) with an embedded Bangla TTF.
// pdfkit has no HarfBuzz-style shaping engine: it maps each Unicode codepoint
// to a glyph via the font's cmap and draws glyphs left to right. It does not
// run the Bangla shaping rules (conjunct formation, reph, reordering of
// vowel signs). This script renders the same stress-test strings used in
// the HTML layouts so the failure mode is visible directly in the PDF.
import PDFDocument from 'pdfkit';
import { createWriteStream } from 'node:fs';

const stressNames = [
  'মোঃ ক্ষিতীশ চন্দ্র বর্মন',
  'নন্তু রায় (ন্ত)',
  'শ্রীময়ী দাশগুপ্তা',
  'র্ধেন্দু শর্মা',
  'ব্যাসদেব ভট্টাচার্য্য',
  'John Rahman মোহাম্মদ',
  'عبدالله মোঃ আব্দুল্লাহ',
  'মোঃ আব্দুল্লাহ আল মামুনুর রশিদ চৌধুরী তালুকদার',
  'প্রাপ্ত নম্বর: ৯৫/১০০ (Bangla digits)',
];

const doc = new PDFDocument({ size: 'A4', margin: 40 });
doc.pipe(createWriteStream(new URL('./approach-c-stress-test.pdf', import.meta.url)));

const fontPath = new URL('../layouts/fonts-ttf/NotoSansBengali-Regular.ttf', import.meta.url);
doc.font(fontPath.pathname).fontSize(11);
doc.text('Approach C — pdfkit + embedded Noto Sans Bengali TTF (no shaping engine)', { underline: true });
doc.moveDown();

stressNames.forEach((line, i) => {
  doc.fontSize(9).fillColor('gray').text(`${i + 1}.`, { continued: true });
  doc.fillColor('black').fontSize(13).text('  ' + line);
  doc.moveDown(0.5);
});

doc.end();
console.log('wrote approach-c-stress-test.pdf');

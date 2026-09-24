// Generates static HTML marksheets for the spike. No dependencies.
// Run: node generate.mjs
import { writeFileSync } from 'node:fs';

const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const toBn = (n) => String(n).split('').map((c) => (c >= '0' && c <= '9' ? bnDigits[+c] : c)).join('');

// Stress-test name set: conjuncts (ক্ষ, ন্ত, শ্র, reph র্, ya-phala ্য), Bangla digits,
// mixed Bangla+English+Arabic script, and one very long name.
const stressNames = [
  'মোঃ ক্ষিতীশ চন্দ্র বর্মন',            // ক্ষ conjunct
  'নন্তু রায় (ন্ত)',                       // ন্ত conjunct
  'শ্রীময়ী দাশগুপ্তা',                     // শ্র conjunct
  'র্ধেন্দু শর্মা',                         // reph
  'ব্যাসদেব ভট্টাচার্য্য',                  // ya-phala + double conjunct
  'John Rahman মোহাম্মদ',                 // mixed Bangla+English
  'عبدالله মোঃ আব্দুল্লাহ',                // mixed Bangla+Arabic
  'মোঃ আব্দুল্লাহ আল মামুনুর রশিদ চৌধুরী তালুকদার', // very long name
];

const subjects8 = [
  'বাংলা ১ম পত্র', 'বাংলা ২য় পত্র', 'ইংরেজি ১ম পত্র', 'ইংরেজি ২য় পত্র',
  'গণিত', 'বিজ্ঞান', 'বাংলাদেশ ও বিশ্বপরিচয়', 'ধর্ম শিক্ষা',
];
const subjects12 = [...subjects8, 'তথ্য ও যোগাযোগ প্রযুক্তি', 'কৃষি শিক্ষা', 'শারীরিক শিক্ষা', 'চারু ও কারুকলা'];

function grade(pct) {
  if (pct >= 80) return ['A+', 5.0];
  if (pct >= 70) return ['A', 4.0];
  if (pct >= 60) return ['A-', 3.5];
  if (pct >= 50) return ['B', 3.0];
  if (pct >= 40) return ['C', 2.0];
  if (pct >= 33) return ['D', 1.0];
  return ['F', 0.0];
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function header(institution, examTitle) {
  return `
  <div class="header">
    <div class="institution">${institution}</div>
    <div class="meta">সিদ্ধেশ্বরী, ঢাকা · প্রতিষ্ঠা: ১৯৮৫ · EIIN: ১২৩৪৫৬</div>
    <div class="title">${examTitle}</div>
  </div>`;
}

// ---------- Layout 1: 8-12 subjects, total/grade/GPA/merit position ----------
function layout1Sheet(student, subjects, rand) {
  let total = 0, gpaSum = 0;
  const rows = subjects.map((s) => {
    const marks = Math.floor(30 + rand() * 70);
    total += marks;
    const [g, gp] = grade(marks);
    gpaSum += gp;
    return `<tr><td class="subject">${s}</td><td>${toBn(100)}</td><td>${toBn(marks)}</td><td>${g}</td><td>${gp.toFixed(1)}</td></tr>`;
  });
  const gpa = (gpaSum / subjects.length).toFixed(2);
  const [finalGrade] = grade(Math.round((total / (subjects.length * 100)) * 100));
  return `
  <div class="sheet">
    ${header('আদর্শ উচ্চ বিদ্যালয়', 'বার্ষিক পরীক্ষা ২০২৬ — মার্কশিট')}
    <div class="studentgrid">
      <div><span class="label">নাম:</span> ${student.name}</div>
      <div><span class="label">রোল:</span> ${toBn(student.roll)}</div>
      <div><span class="label">শ্রেণি:</span> নবম শ্রেণি</div>
      <div><span class="label">শাখা:</span> ক</div>
      <div><span class="label">পিতার নাম:</span> মোঃ আব্দুর রহিম</div>
      <div><span class="label">জন্ম তারিখ:</span> ${toBn('01/01/2011')}</div>
    </div>
    <table class="marks">
      <thead><tr><th>বিষয়</th><th>পূর্ণমান</th><th>প্রাপ্ত নম্বর</th><th>গ্রেড</th><th>গ্রেড পয়েন্ট</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>
    <div class="summary">
      <div class="item">মোট নম্বর<b>${toBn(total)} / ${toBn(subjects.length * 100)}</b></div>
      <div class="item">জিপিএ<b>${toBn(gpa)}</b></div>
      <div class="item">সর্বমোট গ্রেড<b>${finalGrade}</b></div>
      <div class="item">মেধাক্রম<b>${toBn(student.merit)}</b></div>
    </div>
    <div class="signatures">
      <div class="sig"><div class="line">শ্রেণি শিক্ষক</div></div>
      <div class="sig"><div class="line">পরীক্ষা নিয়ন্ত্রক</div></div>
      <div class="sig"><div class="line">প্রধান শিক্ষক</div></div>
    </div>
  </div>`;
}

function buildLayout1(count, subjects, filename) {
  const rand = seededRandom(42);
  let sheets = '';
  for (let i = 1; i <= count; i++) {
    const name = i <= stressNames.length ? stressNames[i - 1] : `শিক্ষার্থী নং ${toBn(i)}`;
    sheets += layout1Sheet({ name, roll: i, merit: ((i - 1) % 40) + 1 }, subjects, rand);
  }
  writeFileSync(filename, page(sheets, `Layout 1 (${count} students)`));
}

// ---------- Layout 2: components (written/MCQ/practical) + class test ----------
function layout2Sheet(student, rand) {
  const subjects = [
    { name: 'বাংলা', hasP: false }, { name: 'ইংরেজি', hasP: false },
    { name: 'গণিত', hasP: false }, { name: 'বিজ্ঞান', hasP: true },
    { name: 'কৃষি শিক্ষা', hasP: true }, { name: 'তথ্য ও যোগাযোগ প্রযুক্তি', hasP: true },
  ];
  let grand = 0;
  const rows = subjects.map((s) => {
    const written = Math.floor(20 + rand() * 40);
    const mcq = Math.floor(10 + rand() * 20);
    const practical = s.hasP ? Math.floor(10 + rand() * 15) : null;
    const classTest = Math.floor(5 + rand() * 10);
    const total = written + mcq + (practical || 0) + classTest;
    grand += total;
    return `<tr><td class="subject">${s.name}</td><td>${toBn(written)}</td><td>${toBn(mcq)}</td><td>${practical !== null ? toBn(practical) : '—'}</td><td>${toBn(classTest)}</td><td><b>${toBn(total)}</b></td></tr>`;
  });
  return `
  <div class="sheet">
    ${header('আদর্শ উচ্চ বিদ্যালয়', 'অর্ধবার্ষিক পরীক্ষা ২০২৬ — মার্কশিট (উপ-উপাদানসহ)')}
    <div class="studentgrid">
      <div><span class="label">নাম:</span> ${student.name}</div>
      <div><span class="label">রোল:</span> ${toBn(student.roll)}</div>
    </div>
    <table class="marks">
      <thead><tr><th>বিষয়</th><th>লিখিত</th><th>MCQ</th><th>ব্যবহারিক</th><th>শ্রেণি পরীক্ষা</th><th>মোট</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>
    <div class="summary">
      <div class="item">সর্বমোট<b>${toBn(grand)}</b></div>
    </div>
  </div>`;
}

function buildLayout2(filename) {
  const rand = seededRandom(7);
  let sheets = '';
  stressNames.forEach((name, i) => {
    sheets += layout2Sheet({ name, roll: i + 1 }, rand);
  });
  writeFileSync(filename, page(sheets, 'Layout 2'));
}

// ---------- Layout 3: transcript style with header + signatures ----------
function layout3Sheet(student) {
  const rows = subjects8.map((s, i) => {
    const [g, gp] = grade(60 + ((i * 7) % 35));
    return `<tr><td class="subject">${s}</td><td>${g}</td><td>${gp.toFixed(1)}</td></tr>`;
  });
  return `
  <div class="sheet">
    ${header('আদর্শ উচ্চ বিদ্যালয়', 'একাডেমিক ট্রান্সক্রিপ্ট')}
    <div class="studentgrid">
      <div><span class="label">নাম:</span> ${student.name}</div>
      <div><span class="label">রোল:</span> ${toBn(student.roll)}</div>
      <div><span class="label">শিক্ষাবর্ষ:</span> ${toBn(2026)}</div>
      <div><span class="label">সনদ নং:</span> TR-${toBn(student.roll)}-২৬</div>
    </div>
    <table class="marks">
      <thead><tr><th>বিষয়</th><th>গ্রেড</th><th>গ্রেড পয়েন্ট</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>
    <div class="summary"><div class="item">সামগ্রিক জিপিএ<b>${toBn('4.42')}</b></div></div>
    <div class="signatures">
      <div class="sig"><div class="line">রেজিস্ট্রার</div></div>
      <div class="sig"><div class="line">প্রধান শিক্ষক</div></div>
      <div class="sig"><div class="line">সিলমোহর</div></div>
    </div>
  </div>`;
}

function buildLayout3(filename) {
  let sheets = '';
  stressNames.forEach((name, i) => { sheets += layout3Sheet({ name, roll: i + 1 }); });
  writeFileSync(filename, page(sheets, 'Layout 3'));
}

function page(body, title) {
  return `<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<link rel="stylesheet" href="./shared.css" />
</head>
<body>
${body}
</body>
</html>`;
}

buildLayout1(1, subjects8, 'layout1.html');
buildLayout1(100, subjects12, 'layout1-batch100.html');
buildLayout2('layout2.html');
buildLayout3('layout3.html');
console.log('generated layout1.html, layout1-batch100.html, layout2.html, layout3.html');

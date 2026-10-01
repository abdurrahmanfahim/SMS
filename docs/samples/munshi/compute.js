/**
 * সব computed field-এর হিসাব এখানে — pure functions, কোথাও store হয় না
 * (merit rank ছাড়া বাকিগুলো per-response সাথে সাথে বসিয়ে দেখানো যায়,
 *  কিন্তু আমরা কোনোটাই DB-তে persist করি না — সবসময় raw মার্কস থেকে recompute করি,
 *  যাতে ফর্মের লজিক পরে বদলালেও পুরনো ডেটা সঠিক থাকে)
 */

const DIGIT_MAPS = {
  en: "0123456789",
  bn: "০১২৩৪৫৬৭৮৯",
  ar: "٠١٢٣٤٥٦٧٨٩", // Eastern Arabic-Indic digits (আরবি/উর্দু কনটেক্সটে ব্যবহৃত)
};

/** একটা সংখ্যাকে বাংলা/ইংরেজি/আরবি সংখ্যা-লিপিতে রূপান্তর করে (ক্রমিক নং, মেধাস্থান)। */
export function formatDigits(n, script = "bn") {
  if (n === null || n === undefined || n === "") return "";
  const map = DIGIT_MAPS[script] || DIGIT_MAPS.bn;
  return String(n).replace(/[0-9]/g, (d) => map[Number(d)]);
}

/** যেকোনো স্ক্রিপ্টের সংখ্যা (বাংলা/আরবি/ইংরেজি) কে আগে ইংরেজিতে নরমালাইজ করে। */
export function toEnglishDigits(str) {
  let result = String(str);
  for (const script of ["bn", "ar"]) {
    const map = DIGIT_MAPS[script];
    result = result.replace(new RegExp(`[${map}]`, "g"), (d) => String(map.indexOf(d)));
  }
  return result;
}

/**
 * আজকের তারিখ "yyyy-MM-dd" আকারে — লোকাল ক্যালেন্ডার তারিখ, UTC না।
 * new Date().toISOString().slice(0, 10) দিয়ে করলে UTC তারিখ পাওয়া যায় —
 * বাংলাদেশে (UTC+6, DST নেই) রাত ১২টা থেকে ভোর ৬টার মধ্যে UTC তারিখ এখনো
 * "গতকাল" থাকে, তাই সেই সময়ে ভুল ("গতকাল") তারিখ পাওয়া যেত। হাজিরার
 * date স্ট্রিং সবসময় এই ফাংশনের (বা getFullYear/getMonth/getDate-ভিত্তিক
 * সমতুল্য লজিকের) মাধ্যমে বসানো হয়, তাই "আজ"-এর যেকোনো হিসাব — ড্যাশবোর্ড
 * সামারি হোক বা হাজিরা এন্ট্রি — এই একই ফাংশন ব্যবহার করা জরুরি, নাহলে
 * মধ্যরাত-থেকে-ভোরের এই ৬ ঘণ্টায় দুই জায়গায় "আজ" ভিন্ন তারিখ বোঝাবে।
 */
export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * নাম্বার এন্ট্রির সময় ব্যবহারকারী যেকোনো স্ক্রিপ্টে (বাংলা/আরবি/ইংরেজি)
 * সংখ্যা টাইপ করলেও সেটাকে টার্গেট স্ক্রিপ্টে (সাধারণত "মোট নাম্বার" ফিল্ডের
 * নির্ধারিত ভাষা) স্বয়ংক্রিয়ভাবে কনভার্ট করে — সংখ্যা ছাড়া অন্য টেক্সট
 * ("অনুপস্থিত" ইত্যাদি) অপরিবর্তিত থাকে।
 */
export function convertDigitsToScript(str, targetScript = "bn") {
  if (str === null || str === undefined || str === "") return str ?? "";
  const normalized = toEnglishDigits(str);
  const map = DIGIT_MAPS[targetScript] || DIGIT_MAPS.bn;
  return normalized.replace(/[0-9]/g, (d) => map[Number(d)]);
}

/** গড় নাম্বার সবসময় দশমিকের পর ঠিক ২ ঘর দেখায় (হিসাবে পূর্ণ নির্ভুলতা থাকে, শুধু ডিসপ্লে গোল হয়)। */
export function formatAverage(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return n;
  return n.toFixed(2);
}

const BN_ORDINALS = ["প্রথম", "দ্বিতীয়", "তৃতীয়", "চতুর্থ", "পঞ্চম", "ষষ্ঠ", "সপ্তম", "অষ্টম", "নবম", "দশম"];
const AR_ORDINALS = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر"];

/**
 * মেধাস্থান অর্ডিনাল শব্দে দেখায় — "প্রথম স্থান", "الأول", "1st Place"।
 * ১০-এর বেশি হলে সংখ্যা + যথাযথ প্রত্যয় দিয়ে ফলব্যাক করে (১১তম স্থান, المركز ١١, 11th Place)।
 */
export function formatMeritRank(n, script = "bn") {
  if (!n || n < 1) return "";
  if (script === "ar") {
    if (n <= 10) return AR_ORDINALS[n - 1];
    return `المركز ${formatDigits(n, "ar")}`;
  }
  if (script === "en") {
    const rem100 = n % 100;
    const suffix = rem100 >= 11 && rem100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th";
    return `${n}${suffix} Place`;
  }
  // bn (ডিফল্ট)
  if (n <= 10) return `${BN_ORDINALS[n - 1]} স্থান`;
  return `${formatDigits(n, "bn")}তম স্থান`;
}

/**
 * ক্রমিক নং (Serial No) — Roster-এর ক্রম অনুযায়ী অটো বাড়তে থাকে।
 * orderedStudentIds: roster থেকে প্রাপ্ত ছাত্রদের ID, যে ক্রমে দেখানো হচ্ছে সেই ক্রমে।
 * @returns Map<studentId, serialNumber>
 */
export function computeSerialNumbers(orderedStudentIds, field) {
  const start = field.config?.start ?? 1;
  const map = new Map();
  orderedStudentIds.forEach((studentId, idx) => {
    map.set(studentId, start + idx);
  });
  return map;
}

/**
 * যেকোনো মান থেকে সংখ্যা বের করে — বাংলা/আরবি/ইংরেজি সংখ্যা তিনটাই বোঝে।
 * "অনুপস্থিত"-এর মতো টেক্সট বা ফাঁকা মান হলে নিরাপদে ০ ধরে নেয়, যাতে
 * মোট/গড়/স্তর হিসাব কখনো ভুল বা NaN না হয়ে যায়। আসল লেখাটা (values অবজেক্টে)
 * অপরিবর্তিত থেকে যায় — শুধু হিসাবের সময়ই ০ হিসেবে গণনা হয়।
 *
 * (আগে এখানে আলাদা একটা bnToEnDigits() ছিল যেটা শুধু বাংলা সংখ্যা বুঝত, আরবি
 * বুঝত না — কিন্তু এন্ট্রি পেজে "মোট"/"গড়" ফিল্ডের numberFormat আরবি সেট করা
 * থাকলে টাইপ করা সংখ্যা অটো-কনভার্ট হয়ে আরবি অঙ্কেই সেভ হয় (দেখুন
 * convertDigitsToScript ও EntryPage-এর handleChange), আর তখন এই ফাংশন সেটা
 * পার্স করতে না পেরে চুপচাপ ০ ধরে নিত — স্ক্রিনে ঠিকঠাক সংখ্যা দেখা গেলেও
 * মোট/গড় নিঃশব্দে ভুল হয়ে যেত, কোনো ওয়ার্নিং ছাড়াই। এখন toEnglishDigits()
 * ব্যবহার করা হচ্ছে যেটা বাংলা ও আরবি — দুটোই normalize করে।)
 */
export function num(v) {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(toEnglishDigits(String(v).trim()));
  return Number.isFinite(n) ? n : 0;
}


/** একটা raw_marks ফিল্ডের মান, প্রয়োজনে তার নিজের পূর্ণমান (max) দিয়ে শতকরায়
 * রূপান্তরিত করে দেয় — বিভিন্ন বিষয়ের পূর্ণমান আলাদা হলে (যেমন স্কুলে কোনো
 * বিষয় ৫০, কোনোটা ১০০, কোনোটা ১৫০) raw নম্বর সরাসরি যোগ/গড় করলে ফলাফল
 * বিকৃত হয়ে যায় — তাই আগে প্রতিটাকে "একই ভাষায়" (%) আনা হয়।
 * পূর্ণমান কনফিগার করা না থাকলে raw মানই ফেরত দেয় (fallback)। */
function sourceValue(id, values, fields, usePercentage) {
  const raw = num(values[id]);
  if (!usePercentage) return raw;
  const srcField = fields?.find((f) => f.id === id);
  const max = srcField?.config?.max;
  return max ? (raw / max) * 100 : raw;
}

/** "মোট নাম্বার" সবসময় raw নম্বরের যোগফল — এটা "কত নম্বর পেয়েছে" বোঝায়
 * (যেমন ৩০০-এর মধ্যে ২১৫), নিজে থেকেই অর্থবহ, শতকরায় রূপান্তরের দরকার নেই।
 * (usePercentage এখানে ইচ্ছাকৃতভাবে উপেক্ষা করা হয় — এটা শুধু "গড়"-এর জন্য,
 * যেহেতু গড়-ই গ্রেডের সোর্স এবং সেটাকে ০-১০০ স্কেলে থাকতে হয়।) */
export function computeTotal(values, field) {
  const ids = field.config?.sourceFieldIds || [];
  return ids.reduce((sum, id) => sum + num(values[id]), 0);
}

/** "মোট নাম্বার" সাধারণত পূর্ণসংখ্যাই থাকে (raw নম্বরের যোগফল), তাই যেমন আছে
 * তেমনই দেখায়। কেউ ভবিষ্যতে দশমিক নম্বর (যেমন ৮৫.৫) দিলে যোগফলে যেন লম্বা
 * ফ্লোটিং-পয়েন্ট artifact না দেখায়, তাই সেক্ষেত্রে ২ দশমিকে গোল করে দেয়। */
export function formatTotal(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return n;
  return Number.isInteger(n) ? n : n.toFixed(2);
}

/**
 * একটা raw_marks এন্ট্রিতে সমস্যা থাকলে জানায় — ঋণাত্মক সংখ্যা, বা পূর্ণমানের
 * চেয়ে বেশি। এই দুটোই "মোট"/"গড়" ভুল হওয়ার সবচেয়ে সাধারণ কারণ, তাই এন্ট্রি
 * পেজ ও রিপোর্ট পেজ — যেখানেই raw নম্বর দেখানো হয়, সেখানেই একই নিয়মে এই
 * ফাংশনটা ব্যবহার হয়, যাতে দুই জায়গায় দুই রকম হিসাব না হয়ে যায়।
 * @returns "negative" | "over" | null
 */
export function markIssue(raw, max) {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = num(raw);
  if (n < 0) return "negative";
  if (max !== undefined && max !== null && max !== "" && n > Number(max)) return "over";
  return null;
}

/**
 * একটা নম্বরকে তার পূর্ণমানের সাপেক্ষে "ভালো/মাঝারি/দুর্বল" — এই তিন স্তরে ভাগ
 * করে, রিপোর্ট টেবিলে দ্রুত চোখ বুলিয়ে বোঝার জন্য (কে কে দুর্বল করেছে)।
 * নির্দিষ্ট কোনো গ্রেড-স্কিমের উপর নির্ভর করে না (প্রতিটা ক্লাসের গ্রেড রেঞ্জ
 * আলাদা হতে পারে) — তার বদলে ৮০%/৫০% এই সাধারণ, বহুল-ব্যবহৃত থ্রেশহোল্ড
 * ব্যবহার করে। max না থাকলে বা মান না থাকলে null (কোনো রঙ প্রযোজ্য না)।
 * @returns "good" | "mid" | "low" | null
 */
export function scoreLevel(raw, max) {
  if (raw === undefined || raw === null || raw === "") return null;
  if (max === undefined || max === null || max === "" || Number(max) <= 0) return null;
  const pct = (num(raw) / Number(max)) * 100;
  if (pct >= 80) return "good";
  if (pct >= 50) return "mid";
  return "low";
}

export function computeAverage(values, field, fields) {
  const ids = field.config?.sourceFieldIds || [];
  const divisor = field.config?.divisor || ids.length || 1;
  const usePercentage = !!field.config?.usePercentage;
  const sum = ids.reduce((s, id) => s + sourceValue(id, values, fields, usePercentage), 0);
  return divisor ? sum / divisor : 0;
}

/** একটা সংখ্যা কোন রেঞ্জে পড়ে তার লেবেল বের করে (গ্রেড রেঞ্জ ম্যাচিং) — গ্রেড
 * ফিল্ড এবং শিক্ষক-পারফরম্যান্স উভয় জায়গায় ব্যবহৃত। */
export function labelForRange(value, ranges) {
  const match = (ranges || []).find((r) => value >= r.min && value <= r.max);
  return match ? match.label : "";
}

export function computeGrade(values, computedValues, field) {
  const sourceId = field.config?.sourceFieldId;
  const score = computedValues[sourceId] ?? num(values[sourceId]);
  return labelForRange(score, field.config?.ranges);
}

/**
 * একটা response-এর সব computed (total/average/grade) মান হিসাব করে একটা flat
 * object হিসেবে দেয়: { [fieldId]: value }. merit_rank এখানে বাদ — সেটা
 * computeMeritRanks() দিয়ে পুরো ফর্মের সব response একসাথে দেখে হিসাব হয়।
 */
export function computeDerivedValues(fields, values) {
  const computed = {};
  // total/average আগে, কারণ grade সাধারণত এদের উপর নির্ভর করতে পারে
  for (const field of fields) {
    if (field.type === "total") computed[field.id] = computeTotal(values, field);
    if (field.type === "average") computed[field.id] = computeAverage(values, field, fields);
  }
  for (const field of fields) {
    if (field.type === "grade") computed[field.id] = computeGrade(values, computed, field);
  }
  return computed;
}

/**
 * মেধাস্থান (Merit Rank) — শুধু এই ফর্মের মধ্যেই হিসাব হয় (locked decision)।
 * sourceFieldId (সাধারণত total বা average) এর মান অনুযায়ী rank দেয়া হয়,
 * সমান মান হলে একই rank (dense ranking), শুধু topN পর্যন্ত rank number বসে,
 * বাকিরা null পায়।
 *
 * @returns Map<studentId, rank|null>
 */
export function computeMeritRanks(fields, responses, meritField) {
  const sourceId = meritField.config?.sourceFieldId;
  const topN = meritField.config?.topN ?? responses.length;

  const scored = responses.map((r) => {
    const derived = computeDerivedValues(fields, r.values || {});
    const score = derived[sourceId] ?? num(r.values?.[sourceId]);
    return { studentId: r.studentId, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // "ডেন্স র‍্যাংকিং" — ২ জন ১ম হলে তার পরের জন ২য় (৩য় না)। প্রতিটা নতুন
  // (আগেরটার চেয়ে কম) স্কোরে র‍্যাংক ঠিক ১ বাড়ে, ওই স্কোরে কতজন টাই করেছে
  // তার উপর নির্ভর করে না। (আগে "seen" গুনে র‍্যাংক বসানো হতো — সেটা
  // "কম্পিটিশন র‍্যাংকিং" (১,১,৩), যেটা এখানে অনভিপ্রেত ছিল।)
  const ranks = new Map();
  let rank = 0;
  let prevScore = null;
  for (const { studentId, score } of scored) {
    if (score !== prevScore) {
      rank += 1;
      prevScore = score;
    }
    ranks.set(studentId, rank <= topN ? rank : null);
  }
  return ranks;
}

/** ভালো গ্রেড থেকে খারাপ গ্রেডের দিকে সবুজ থেকে লালে গ্রেডিয়েন্ট রঙ (চার্টে ব্যবহারের জন্য) */
export function gradeColorForIndex(idx, total) {
  // L bumped 40→48 / 45→52 so slices stay readable against dark-mode
  // cards too, without needing a light/dark flag threaded through
  // every caller (ClassComparisonPage, SubjectReportPage, TeacherDetailPage).
  if (total <= 1) return "hsl(142 60% 48%)";
  const hue = 142 - (142 * idx) / (total - 1);
  return `hsl(${hue} 65% 52%)`;
}

/** একটা ফর্মের সব রেসপন্স থেকে গ্রেড বণ্টন বের করে — কতজন কোন গ্রেড পেয়েছে।
 * কোনো রেঞ্জে না পড়লে "অনির্ধারিত"-এ যোগ হয়। gradeField না থাকলে null।
 * প্রতিটা গ্রেডের রঙ তার রেঞ্জ-অর্ডার অনুযায়ী স্থির (০ জন থাকলেও), যাতে
 * বিভিন্ন পরীক্ষার চার্ট পাশাপাশি রাখলেও একই গ্রেডের রঙ সবসময় এক থাকে। */
export function computeGradeDistribution(fields, responses) {
  const gradeField = fields.find((f) => f.type === "grade");
  if (!gradeField) return null;

  const ranges = gradeField.config?.ranges || [];
  const counts = new Map(ranges.map((r) => [r.label, 0]));
  let uncovered = 0;
  for (const r of responses) {
    const derived = computeDerivedValues(fields, r.values || {});
    const g = derived[gradeField.id];
    if (g && counts.has(g)) counts.set(g, counts.get(g) + 1);
    else uncovered += 1;
  }
  const data = ranges.map((r, idx) => ({
    name: r.label,
    count: counts.get(r.label) || 0,
    color: gradeColorForIndex(idx, ranges.length),
  }));
  if (uncovered > 0) data.push({ name: "অনির্ধারিত", count: uncovered, color: "hsl(220 9% 60%)" });
  return { gradeField, data, total: data.reduce((s, d) => s + d.count, 0) };
}

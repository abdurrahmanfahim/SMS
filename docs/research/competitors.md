# প্রতিযোগী বিশ্লেষণ (Competitor teardown)

Access date for every source below: 2026-09-23 (desk research only; no vendor was contacted, per task boundaries). All facts are paraphrased from public marketing/review pages; nothing is copied verbatim. Where a fact could not be confirmed from a public source it is marked **unknown** rather than guessed.

Legend for module coverage: ✅ confirmed from source · ⚠️ implied/partial · ❌ not offered · **unknown** not stated publicly.

---

## বাংলাদেশি প্রোডাক্ট (5)

### 1. Edufy (edufy.com.bd)
- **URL / access date:** https://edufy.com.bd/blog/best-school-management-software-in-bangladesh-a-comprehensive-guide-for-2025 — 2026-09-23
- **Public pricing:** Vendor's own blog states the *market* range for Bangladeshi school software generally runs BDT 10,000–50,000 per year; no fixed price list found on Edufy's own site for its own plans (**unknown** exact Edufy price).
- **Module coverage:** Attendance ✅, fee collection ✅, parent/educator communication ✅. Exams, marks/result engine, guardians/roles: **unknown** (not detailed on the page found).
- **Bangla support quality:** Not demonstrated on this page (English-only marketing copy found); **unknown**.
- **Onboarding/support model:** Positions itself for small and rural schools, implying self-serve/low-touch onboarding; **unknown** specifics.
- **Visible weaknesses:** Marketing copy is generic ("all-in-one", "affordable") with few concrete specs or screenshots; hard to verify real feature depth from the public site alone.

### 2. Pipilika Soft (pipilikasoft.com)
- **URL / access date:** https://pipilikasoft.com/best-school-management-software-in-bangladesh/ — 2026-09-23
- **Public pricing:** Not published; **unknown**.
- **Module coverage:** Online/offline admissions ✅, attendance ✅, academic operations ✅, results ✅, online and bank fee collection ✅, digital library ✅, payroll ✅, employee leave ✅.
- **Bangla support quality:** Targets Bangladeshi schools, colleges, universities and madrasas explicitly, so Bangla support is plausible but not shown with screenshots; **unknown** quality.
- **Onboarding/support model:** Positioned as broad "one platform" for many institution types (school to medical college), which usually means sales-led onboarding; **unknown** confirmed.
- **Visible weaknesses:** Breadth over depth — claims to serve schools, colleges, universities, polytechnics, nursing and medical colleges simultaneously, which is a common red flag for shallow module depth in any one segment.

### 3. School360 (school360.com.bd)
- **URL / access date:** https://school360.com.bd/ — 2026-09-23
- **Public pricing:** Not published on the homepage; **unknown**.
- **Module coverage:** Online admission ✅, biometric attendance for staff and students ✅, online fee payment ✅, printed seat plans/admit cards/ID cards/marksheets ✅. Exam result engine and parent portal: ⚠️ implied by marksheet printing but not detailed.
- **Bangla support quality:** A client testimonial on the homepage is in English describing use in a Bangladeshi institute; Bangla UI quality itself is **unknown** from the page.
- **Onboarding/support model:** Testimonial-driven marketing suggests direct sales/relationship-based onboarding; **unknown** specifics.
- **Visible weaknesses:** Heavy reliance on biometric hardware for attendance, which raises cost and hardware-dependency concerns for smaller institutions with tighter budgets.

### 4. ShikkhaPlus (Ambala IT)
- **URL / access date:** https://ambalait.com/blogs/shikkhaplus-the-all-in-one-educational-institution-management-software — 2026-09-23
- **Public pricing:** Not published; **unknown**.
- **Module coverage:** Admissions ✅, attendance ✅, fee collection ✅, exams ✅, parent communication ✅. Explicitly targets schools, colleges, universities **and** madrasas in one product.
- **Bangla support quality:** Claims local-language support as a selling point; actual UI quality **unknown** without a live demo.
- **Onboarding/support model:** Marketed with "intuitive dashboard" and "real-time notifications"; **unknown** onboarding process (self-serve vs. sales-led).
- **Visible weaknesses:** Same breadth-over-depth pattern as Pipilika Soft — one product spanning school through university is a scope claim that is hard to verify without a demo.

### 5. Ekattor 7 / Ekattor 8 (Creative Item / CodeCanyon)
- **URL / access date:** https://codecanyon.net/comments/30410206 (vendor Q&A thread) — 2026-09-23
- **Public pricing:** Sold as a self-hosted PHP script (Ekattor 7) and a newer Laravel-based SaaS version (Ekattor 8) on CodeCanyon, a one-time-purchase script marketplace; exact price **unknown** from this page, but the CodeCanyon model implies a one-time license fee rather than a recurring subscription, unlike most competitors here.
- **Module coverage:** Add-ons mentioned include student assignments, online courses, Zoom live classes, exam-marks-by-SMS, alumni, biometric attendance, multi-school support, an SMS centre, and ID cards — a modular add-on architecture rather than one fixed bundle.
- **Bangla support quality:** **unknown** (not shown on this page).
- **Onboarding/support model:** Self-hosted script model — the buyer (or a local vendor) installs and maintains it; Ekattor 8 adds a hosted SaaS option with a mobile app, which Ekattor 7 does not have.
- **Visible weaknesses:** A self-hosted PHP script sold on a marketplace is typically weaker on ongoing security patching, multi-tenant isolation and formal support SLAs than a vendor-run SaaS — relevant since our own product is RLS-isolated multi-tenant SaaS.

---

## ওপেন সোর্স (3)

### 6. openSIS Classic (OS4ED)
- **URL / access date:** https://github.com/OS4ED/openSIS-Classic — 2026-09-23
- **License / cost:** GNU GPL, free and open source, self-hosted (PHP + MySQL/MariaDB).
- **Module coverage:** Student and staff data ✅, scheduling ✅, attendance ✅, gradebook/grades ✅, report cards ✅, transcripts ✅, built-in communication ✅, bulk data import ✅. No Bangladesh-specific exam board or Bangla-language mention found.
- **Bangla support quality:** **unknown** / not evidenced — this is a US-built K-12 SIS with no Bangladesh localisation claim found.
- **Onboarding/support model:** Self-install (Apache/MySQL/PHP stack); community support via GitHub, not a vendor helpdesk.
- **Visible weaknesses:** No mobile-first or phone-only design claim, no Bangla i18n found, no local fee/payment-method (bKash-style) support — would need heavy customisation for our market.

### 7. Gibbon (GibbonEdu)
- **URL / access date:** https://www.linuxlinks.com/gibbon-school-management-system/ — 2026-09-23
- **License / cost:** GNU GPL v3, free and open source, self-hosted.
- **Module coverage:** Student-centred records ✅, teacher planning/teaching/assessment ✅, unified access for teachers/students/parents/admins ✅ with configurable permission levels.
- **Bangla support quality:** Supports 22 actively-translated languages with right-to-left and UTF-8 support; whether Bangla is one of the 22 is **unknown** from this page.
- **Onboarding/support model:** Self-hosted; support via its GitHub repository/community, not a commercial vendor.
- **Visible weaknesses:** General-purpose international-school orientation (used by international and home schools); no evidence of Bangladesh exam-board, fee-in-poisha, or bKash-style payment support.

### 8. OpenEduCat Community Edition
- **URL / access date:** https://openeducat.org/education-software-bangladesh/ and https://openeducat.org/k12-school-management-software-in-bangladesh/ — 2026-09-23
- **License / cost:** LGPLv3, explicitly "forever free" self-hosted Community Edition (Odoo-based); paid Enterprise tier exists for extra capabilities.
- **Module coverage:** Admissions ✅, attendance ✅ (with SMS alerts to parents in Bangla), exams/results ✅, fee collection in BDT with instalments ✅ (states support for bKash and other mobile payment methods), library ✅, hostel ✅, timetable ✅, parent portal ✅. This is the most Bangladesh-tailored open-source option found — its marketing explicitly names SSC/HSC boards, BANBEIS reporting, and Alia/Qawmi madrasa boards.
- **Bangla support quality:** Vendor states the platform supports both Bangla and English for all stakeholders.
- **Onboarding/support model:** Self-host on a small cloud VM (vendor suggests ~$20/month for ~500 students); support via GitHub Discussions/Discord for the free tier, paid support for Enterprise.
- **Visible weaknesses:** Built on Odoo, a large general-purpose ERP framework — likely heavier to self-host and operate than a purpose-built app, and self-hosting shifts all security/RLS-equivalent responsibility to the school's own IT capacity, which our target segment mostly lacks.

---

## গ্লোবাল প্রোডাক্ট (2)

### 9. PowerSchool SIS
- **URL / access date:** https://www.capterra.ca/software/154883/powerschool-student-information-system and https://test.spendbase.co/?p=35993 — 2026-09-23
- **Public pricing:** Per-student pricing starting around US$7/student; third-party pricing breakdowns describe tiers roughly in the $3–8 (Core), $5–10 (Pro) and $8–15 (Premier) per student per year range, with custom Enterprise pricing above that.
- **Module coverage:** Scheduling ✅, attendance ✅, gradebook (PowerTeacher Pro) ✅, state/district reporting ✅, health/immunization records ✅, parent/student portals ✅, mobile app ✅.
- **Bangla support quality:** No Bangla or Bangladesh-market mention found; built for US K-12 public/charter/independent school districts. **unknown**/likely absent.
- **Onboarding/support model:** District/enterprise sales-led onboarding typical of US K-12 SIS vendors; not designed for single small institutions in our target size range.
- **Visible weaknesses:** Priced and built for large US school districts, not phone-only, low-budget Bangladeshi institutions; per-student annual pricing at this level would be far above what our target segment can pay.

### 10. Fedena (Foradian Technologies)
- **URL / access date:** https://www.capterra.co.za/software/126199/fedena-pro and https://www.softwareadvice.com.au/software/371638/fedena — 2026-09-23
- **Public pricing:** Starting around US$1,299/year for the "Pro Plus" tier; Enterprise and "Learn" tiers are quote-only.
- **Module coverage:** Admissions ✅, examinations ✅, online fee collection ✅, transportation ✅, HR/finance ✅, timetable generator ✅, Moodle LMS integration ✅, customizable dashboard "dashlets" ✅.
- **Bangla support quality:** Supported languages listed include Arabic, Chinese, Dutch, English, French, German, Italian, Japanese, Korean, Portuguese, Russian, Spanish and Turkish — Bangla is not in that list, so localisation for Bangladesh is effectively absent.
- **Onboarding/support model:** Cloud SaaS with annual subscription including phone/email/knowledge-base support; primary market is listed as India, Middle East and Africa, not Bangladesh specifically.
- **Visible weaknesses:** No Bangla localisation found despite serving nearby markets; pricing (~$1,299/year and up) is high relative to the BDT 10,000–50,000/year range Bangladeshi vendors advertise, and it is not madrasa-aware.

---

## ফিচার ম্যাট্রিক্স (আমাদের README §1.2 মডিউল অনুযায়ী)

| প্রোডাক্ট | ভর্তি/ছাত্র-অভিভাবক (M1) | উপস্থিতি/পরীক্ষা-ফলাফল (M2) | ফি/টেক্সট অ্যালার্ট/পোর্টাল (M3) | মাদ্রাসা-সচেতন | বাংলা ভাষা |
|---|---|---|---|---|---|
| Edufy | ⚠️ | ⚠️ | ✅ (fee) | **unknown** | **unknown** |
| Pipilika Soft | ✅ | ✅ | ✅ | ✅ (নাম উল্লেখ) | **unknown** |
| School360 | ✅ | ⚠️ | ✅ | **unknown** | **unknown** |
| ShikkhaPlus | ✅ | ✅ | ✅ | ✅ (নাম উল্লেখ) | **unknown** |
| Ekattor 7/8 | ⚠️ | ✅ (marks by SMS) | ⚠️ | **unknown** | **unknown** |
| openSIS | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gibbon | ✅ | ✅ | ❌ | ❌ | **unknown** |
| OpenEduCat CE | ✅ | ✅ | ✅ (bKash-style) | ✅ (Alia/Qawmi নামোল্লেখ) | ✅ |
| PowerSchool SIS | ✅ | ✅ | ❌ (no fee module found) | ❌ | ❌ |
| Fedena | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## ইনসাইট ও তাৎপর্য (Scope/pricing implications)

1. **স্থানীয় প্রতিযোগীরা ফিচারের গভীরতা কমই প্রমাণ করে।** বেশিরভাগ বাংলাদেশি ভেন্ডরের সাইটে দাম, স্ক্রিনশট বা মডিউলের বিস্তারিত নেই (unknown-এর সংখ্যা লক্ষ্য করুন) — *তাৎপর্য:* আমাদের নিজেদের মার্কেটিং সাইটে সুনির্দিষ্ট ফিচার তালিকা ও দাম দেখানো একটা সহজ পার্থক্য তৈরি করতে পারে।
2. **স্থানীয় বাজারের দাম BDT 10,000–50,000/বছরের ঘরে, আর গ্লোবাল প্রোডাক্ট ($1,299+/বছর, বা প্রতি ছাত্র $7+/বছর) অনেক বেশি।** *তাৎপর্য:* D-11 (দাম পাইলট থেকে ঠিক হবে) অনুযায়ী, আমাদের প্রাথমিক প্রাইসিং স্থানীয় BDT রেঞ্জের কাছাকাছি রাখাই বাস্তবসম্মত হবে, গ্লোবাল বেঞ্চমার্কের কাছাকাছি নয়।
3. **মাদ্রাসা-সচেতনতা (Alia/Qawmi আলাদা বোর্ড) কেবল একটি প্রতিযোগীতে (OpenEduCat) স্পষ্টভাবে পাওয়া গেছে, আর কোনো গ্লোবাল প্রোডাক্টে নেই।** *তাৎপর্য:* মাদ্রাসা সাপোর্ট একটি বাস্তব পার্থক্য (differentiator) হতে পারে যদি আমরা এটা ঠিকভাবে বানাই — README-এর "madrasa" স্কোপ ধরে রাখা ঠিক আছে।
4. **ফোন-শুধু, টাচ-শুধু ব্যবহারের দাবি কোনো প্রতিযোগীর মার্কেটিং কপিতে স্পষ্টভাবে পাওয়া যায়নি** — বেশিরভাগ ওয়েব ড্যাশবোর্ড/ডেস্কটপ-ওরিয়েন্টেড মনে হয়। *তাৎপর্য:* D-16 (mobile-complete) সত্যিকারের পার্থক্য হতে পারে, কিন্তু ইন্টারভিউতে যাচাই করা দরকার এটা আসলেই গ্রাহকের কাছে গুরুত্বপূর্ণ কিনা, নাকি শুধু আমাদের অনুমান।
5. **ওপেন সোর্স বিকল্পগুলো (openSIS, Gibbon) বিনামূল্যে হলেও সেলফ-হোস্টিং দাবি করে**, যা আমাদের লক্ষ্য প্রতিষ্ঠানের (সীমিত IT সক্ষমতা) জন্য বাস্তবে বাধা। *তাৎপর্য:* "ফ্রি" সবসময় প্রতিদ্বন্দ্বী নয় — হোস্টেড, জিরো-সেটআপ SaaS হওয়াটাই আমাদের আসল সুবিধা হতে পারে, শুধু দাম নয়।
6. **Ekattor-এর মতো এক-কালীন লাইসেন্স (CodeCanyon) মডেল স্থানীয় বাজারে বিদ্যমান** — অনেক ছোট প্রতিষ্ঠান হয়ত মাসিক সাবস্ক্রিপশনের চেয়ে এককালীন কেনার মানসিকতায় অভ্যস্ত। *তাৎপর্য:* সাবস্ক্রিপশন মডেলে আপত্তি (objection) ইন্টারভিউতে সরাসরি জিজ্ঞাসা করা দরকার (আছে, প্রশ্ন ১০)।

## অজানা / যাচাই করা যায়নি
- ৫টি বাংলাদেশি ভেন্ডরের কারো সঠিক দাম তালিকা পাবলিক সাইটে পাওয়া যায়নি (সব বিক্রয়-কল-ভিত্তিক মনে হয়)।
- কোনো প্রতিযোগীর প্রকৃত ব্যবহারকারী সংখ্যা (কতগুলো স্কুল সক্রিয়ভাবে ব্যবহার করছে) স্বাধীনভাবে যাচাই করা যায়নি।

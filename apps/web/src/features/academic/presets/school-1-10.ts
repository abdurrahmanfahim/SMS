import type { Preset } from "./types";

/**
 * Class 1 to 10 school: ten levels, sections A and B, common subjects. The subject list is a
 * common starting point (Bangladesh national curriculum names), not an official syllabus; every
 * name stays editable after it is applied.
 */
export const school110Preset: Preset = {
  id: "school-1-10",
  titleKey: "academic.preset.school110.title",
  descriptionKey: "academic.preset.school110.description",
  levels: [
    { key: "c1", nameBn: "প্রথম শ্রেণি", nameEn: "Class 1", sortOrder: 1, category: "school" },
    { key: "c2", nameBn: "দ্বিতীয় শ্রেণি", nameEn: "Class 2", sortOrder: 2, category: "school" },
    { key: "c3", nameBn: "তৃতীয় শ্রেণি", nameEn: "Class 3", sortOrder: 3, category: "school" },
    { key: "c4", nameBn: "চতুর্থ শ্রেণি", nameEn: "Class 4", sortOrder: 4, category: "school" },
    { key: "c5", nameBn: "পঞ্চম শ্রেণি", nameEn: "Class 5", sortOrder: 5, category: "school" },
    { key: "c6", nameBn: "ষষ্ঠ শ্রেণি", nameEn: "Class 6", sortOrder: 6, category: "school" },
    { key: "c7", nameBn: "সপ্তম শ্রেণি", nameEn: "Class 7", sortOrder: 7, category: "school" },
    { key: "c8", nameBn: "অষ্টম শ্রেণি", nameEn: "Class 8", sortOrder: 8, category: "school" },
    { key: "c9", nameBn: "নবম শ্রেণি", nameEn: "Class 9", sortOrder: 9, category: "school" },
    { key: "c10", nameBn: "দশম শ্রেণি", nameEn: "Class 10", sortOrder: 10, category: "school" },
  ],
  sectionNames: ["A", "B"],
  subjects: [
    { key: "bn", nameBn: "বাংলা", nameEn: "Bangla", code: "BAN" },
    { key: "en", nameBn: "ইংরেজি", nameEn: "English", code: "ENG" },
    { key: "math", nameBn: "গণিত", nameEn: "Mathematics", code: "MAT" },
    { key: "sci", nameBn: "বিজ্ঞান", nameEn: "Science", code: "SCI" },
    {
      key: "bgs",
      nameBn: "বাংলাদেশ ও বিশ্বপরিচয়",
      nameEn: "Bangladesh and Global Studies",
      code: "BGS",
    },
    {
      key: "rel",
      nameBn: "ধর্ম ও নৈতিক শিক্ষা",
      nameEn: "Religion and Moral Education",
      code: "REL",
    },
    {
      key: "ict",
      nameBn: "তথ্য ও যোগাযোগ প্রযুক্তি",
      nameEn: "Information and Communication Technology",
      code: "ICT",
    },
    {
      key: "pe",
      nameBn: "শারীরিক শিক্ষা ও স্বাস্থ্য",
      nameEn: "Physical Education and Health",
      code: "PHE",
    },
    { key: "art", nameBn: "চারু ও কারুকলা", nameEn: "Art and Crafts", code: "ART" },
  ],
  classSubjects: [
    { levelKey: "c1", subjectKeys: ["bn", "en", "math", "rel", "art"] },
    { levelKey: "c2", subjectKeys: ["bn", "en", "math", "rel", "art"] },
    { levelKey: "c3", subjectKeys: ["bn", "en", "math", "sci", "bgs", "rel", "art"] },
    { levelKey: "c4", subjectKeys: ["bn", "en", "math", "sci", "bgs", "rel", "art"] },
    { levelKey: "c5", subjectKeys: ["bn", "en", "math", "sci", "bgs", "rel", "art"] },
    { levelKey: "c6", subjectKeys: ["bn", "en", "math", "sci", "bgs", "rel", "ict", "pe"] },
    { levelKey: "c7", subjectKeys: ["bn", "en", "math", "sci", "bgs", "rel", "ict", "pe"] },
    { levelKey: "c8", subjectKeys: ["bn", "en", "math", "sci", "bgs", "rel", "ict", "pe"] },
    { levelKey: "c9", subjectKeys: ["bn", "en", "math", "sci", "bgs", "rel", "ict", "pe"] },
    { levelKey: "c10", subjectKeys: ["bn", "en", "math", "sci", "bgs", "rel", "ict", "pe"] },
  ],
};

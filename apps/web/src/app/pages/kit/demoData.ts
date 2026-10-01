/** Deterministic sample students for the dev kit. Not real data. */
export interface DemoStudent {
  id: string;
  name: string;
  roll: number;
  section: "ক" | "খ" | "গ";
  phone: string;
  present: boolean;
}

const FIRST = [
  "রুবেল",
  "সুমাইয়া",
  "আব্দুর",
  "তানভীর",
  "নুসরাত",
  "ফারহান",
  "মেহেদী",
  "তাসনিম",
  "জান্নাত",
  "ইমরান",
];
const LAST = ["হোসেন", "আক্তার", "রহমান", "ইসলাম", "চৌধুরী", "খান", "সরকার", "মিয়া"];
const SECTIONS = ["ক", "খ", "গ"] as const;

export function makeStudents(count: number): DemoStudent[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `s${i + 1}`,
    name: `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`,
    roll: (i % 60) + 1,
    section: SECTIONS[i % 3]!,
    phone: `017${String(10000000 + ((i * 7919) % 90000000)).slice(0, 8)}`,
    present: i % 5 !== 0,
  }));
}

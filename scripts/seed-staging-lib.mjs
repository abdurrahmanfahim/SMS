// Pure helpers for scripts/seed-staging.mjs (no network, no secrets). Tested by seed-staging-lib.test.mjs.
import { randomInt } from "node:crypto";

// No look-alike characters (0/O, 1/l/I) so the Owner can copy a password from a phone screen.
const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Random password from the OS CSPRNG. Never derived from anything in the repo. */
export function generatePassword(length = 20) {
  let out = "";
  for (let i = 0; i < length; i += 1) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/**
 * The staging seed plan: 2 institutions and 3 synthetic users, one of them (salma) with two
 * memberships so the institution picker can be exercised. Contains no passwords.
 */
export function buildSeedPlan(emailDomain = "example.com") {
  const institutions = [
    { slug: "staging-school", name_bn: "আদর্শ স্কুল (স্টেজিং)", name_en: "Adarsha School (staging)", type: "school" },
    { slug: "staging-madrasa", name_bn: "নূরানী মাদ্রাসা (স্টেজিং)", name_en: "Nurani Madrasa (staging)", type: "madrasa" },
  ];
  const users = [
    {
      handle: "rahim",
      email: `sms-staging-rahim@${emailDomain}`,
      full_name: "রহিম উদ্দিন",
      memberships: [{ institution: "staging-school", role: "institution_admin" }],
    },
    {
      handle: "karim",
      email: `sms-staging-karim@${emailDomain}`,
      full_name: "করিম হোসেন",
      memberships: [{ institution: "staging-madrasa", role: "teacher" }],
    },
    {
      handle: "salma",
      email: `sms-staging-salma@${emailDomain}`,
      full_name: "সালমা খাতুন",
      memberships: [
        { institution: "staging-school", role: "teacher" },
        { institution: "staging-madrasa", role: "accountant" },
      ],
    },
  ];
  return { institutions, users };
}

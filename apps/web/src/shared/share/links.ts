import { normalizeBdPhone } from "@sms/domain/src/phone";

/** Digits of a Bangladeshi mobile number in international form without the plus (`8801712345678`), or null if it is not a valid number. */
function internationalDigits(phone: string | undefined): string | null {
  if (!phone) return null;
  const result = normalizeBdPhone(phone);
  return result.ok ? result.e164.slice(1) : null;
}

/**
 * WhatsApp link with the message filled in. With a valid Bangladeshi mobile number the chat with
 * that person opens; without one WhatsApp lets the sender choose the contact.
 *
 * @example whatsappLink("ফলাফল প্রকাশ হয়েছে", "01712345678")
 * // "https://wa.me/8801712345678?text=%E0%A6%AB..."
 */
export function whatsappLink(text: string, phone?: string): string {
  const digits = internationalDigits(phone);
  return `https://wa.me/${digits ?? ""}?text=${encodeURIComponent(text)}`;
}

/**
 * SMS link with the message filled in. The `?&body=` form is the one that opens the message on
 * both Android and iPhone. Without a valid number the sender chooses the recipient.
 */
export function smsLink(text: string, phone?: string): string {
  const digits = internationalDigits(phone);
  return `sms:${digits ? `+${digits}` : ""}?&body=${encodeURIComponent(text)}`;
}

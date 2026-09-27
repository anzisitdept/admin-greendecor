/**
 * Phone normalisation and the phone -> Firebase Auth key mapping.
 *
 * This is a deliberate copy of `src/lib/phone.ts` in the customer-facing
 * `green-decor` project. The two apps are separate repositories with no shared
 * package, and the mapping MUST stay byte-identical on both sides: a mismatch
 * means an admin types a valid number, the storefront hashes it to a different
 * synthetic email, and nobody can ever sign in.
 */

/** Normalises a PKR phone number to digits with a 92 country code. */
export function normalizeContact(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('0092')) digits = digits.slice(4);
  else if (digits.startsWith('92')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);

  digits = `92${digits}`;

  if (!/^923\d{9}$/.test(digits)) return null;
  return digits;
}

export function formatContact(input: string): string {
  const normalized = normalizeContact(input);
  if (!normalized) return input.trim();
  return `+${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6)}`;
}

export const PHONE_AUTH_EMAIL_DOMAIN = 'greendecor.com';

/** Builds the Firebase Auth email for a phone number. */
export function phoneToAuthEmail(normalizedPhone: string): string {
  return `${normalizedPhone}@${PHONE_AUTH_EMAIL_DOMAIN}`;
}

/** Recovers the phone number from a synthetic auth email, else null. */
export function phoneFromAuthEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const suffix = `@${PHONE_AUTH_EMAIL_DOMAIN}`;
  if (!email.toLowerCase().endsWith(suffix)) return null;
  const local = email.slice(0, -suffix.length);
  return /^923\d{9}$/.test(local) ? local : null;
}

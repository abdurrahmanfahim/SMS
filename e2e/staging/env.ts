/** Reads a required environment variable and fails loudly (never skips) when it is missing. */
export function need(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}. See docs/runbooks/deploy.md.`);
  return value;
}

export interface Account {
  email: string;
  password: string;
}

export function account(kind: "SINGLE" | "MULTI" | "OTHER"): Account {
  return { email: need(`E2E_STAGING_${kind}_EMAIL`), password: need(`E2E_STAGING_${kind}_PASSWORD`) };
}

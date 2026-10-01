import type { SmsClient } from "@sms/db";

/** In-memory stand-in for the Supabase client, for the skeleton tests only. */
export interface FakeData {
  users: Record<string, { password: string; id: string }>;
  profiles: { id: string; full_name: string }[];
  memberships: { institution_id: string; profile_id: string; role: string; status: string }[];
  institutions: { id: string; name_bn: string | null; name_en: string | null }[];
}

export function fakeClient(data: FakeData, opts: { failLoad?: boolean } = {}) {
  let sessionUserId: string | null = null;
  const rows = (table: string): Record<string, unknown>[] => {
    if (table === "profiles") return data.profiles;
    if (table === "memberships") return data.memberships;
    return data.institutions;
  };
  /** Mimics RLS: only what the signed-in user may read. */
  const visible = (table: string): Record<string, unknown>[] => {
    if (sessionUserId === null) return [];
    if (table === "profiles") return data.profiles.filter((p) => p.id === sessionUserId);
    if (table === "memberships")
      return data.memberships.filter((m) => m.profile_id === sessionUserId);
    const mine = data.memberships
      .filter((m) => m.profile_id === sessionUserId && m.status === "active")
      .map((m) => m.institution_id);
    return data.institutions.filter((i) => mine.includes(i.id));
  };
  const query = (table: string) => {
    let filtered = visible(table);
    const chain = {
      select: () => chain,
      eq: (column: string, value: unknown) => {
        filtered = filtered.filter((r) => r[column] === value);
        return chain;
      },
      maybeSingle: () =>
        Promise.resolve(
          opts.failLoad
            ? { data: null, error: { message: "boom" } }
            : { data: filtered[0] ?? null, error: null },
        ),
      then: (resolve: (v: unknown) => unknown) =>
        resolve(
          opts.failLoad
            ? { data: null, error: { message: "boom" } }
            : { data: filtered, error: null },
        ),
    };
    void rows;
    return chain;
  };
  const client = {
    from: query,
    auth: {
      getSession: () =>
        Promise.resolve({
          data: { session: sessionUserId ? { user: { id: sessionUserId } } : null },
        }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
      signInWithPassword: ({ email, password }: { email: string; password: string }) => {
        const user = data.users[email];
        if (!user || user.password !== password) {
          return Promise.resolve({
            data: { user: null },
            error: { status: 400, message: "invalid" },
          });
        }
        sessionUserId = user.id;
        return Promise.resolve({ data: { user: { id: user.id } }, error: null });
      },
      signOut: () => {
        sessionUserId = null;
        return Promise.resolve({ error: null });
      },
    },
    /** Test helper: pretend a session was restored from storage. */
    __setSession: (id: string | null) => {
      sessionUserId = id;
    },
  };
  return client as unknown as SmsClient & { __setSession: (id: string | null) => void };
}

export const SAMPLE: FakeData = {
  users: {
    "one@test.invalid": { id: "u1", password: "pw-one" },
    "two@test.invalid": { id: "u2", password: "pw-two" },
    "none@test.invalid": { id: "u3", password: "pw-none" },
  },
  profiles: [
    { id: "u1", full_name: "Rahim" },
    { id: "u2", full_name: "Salma" },
    { id: "u3", full_name: "Nobody" },
  ],
  institutions: [
    { id: "i1", name_bn: "স্কুল এক", name_en: "School One" },
    { id: "i2", name_bn: null, name_en: "Madrasa Two" },
  ],
  memberships: [
    { institution_id: "i1", profile_id: "u1", role: "institution_admin", status: "active" },
    { institution_id: "i1", profile_id: "u2", role: "teacher", status: "active" },
    { institution_id: "i2", profile_id: "u2", role: "accountant", status: "active" },
  ],
};

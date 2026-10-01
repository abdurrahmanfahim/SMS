import type { SmsClient } from "@sms/db";
import { useEffect, useSyncExternalStore } from "react";

export type MembershipRole =
  "institution_admin" | "teacher" | "accountant" | "guardian" | "student";

export interface InstitutionOption {
  id: string;
  nameBn: string | null;
  nameEn: string | null;
  /** The signed-in user's active roles in this institution. */
  roles: MembershipRole[];
}

export type SessionState =
  | { status: "loading" }
  /** The build has no Supabase URL or anon key. */
  | { status: "unconfigured" }
  | { status: "signed_out" }
  | {
      status: "signed_in";
      userId: string;
      fullName: string;
      institutions: InstitutionOption[];
      /** Null until the user picks one (only when they belong to more than one). */
      activeInstitutionId: string | null;
    };

export type SignInResult = { ok: true } | { ok: false; reason: "invalid" | "failed" };

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const INSTITUTION_STORAGE_KEY = "sms.skeleton.institution";

/**
 * Session store for the walking skeleton. Supabase persists the session itself; this store adds
 * the profile, the memberships and the chosen institution on top. All data is read through the
 * anon client, so Postgres RLS decides what a user can see (never this code).
 * M1-W2 replaces it (docs/tasks/M1-W2.md step 1).
 */
export type ClientSource = () => SmsClient | null | Promise<SmsClient | null>;

export function createSessionStore(getClient: ClientSource, storage: StorageLike | null) {
  let state: SessionState = { status: "loading" };
  let started = false;
  const listeners = new Set<() => void>();

  const set = (next: SessionState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  const readStored = () => {
    try {
      return storage?.getItem(INSTITUTION_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  };
  const writeStored = (id: string | null) => {
    try {
      if (id === null) storage?.removeItem(INSTITUTION_STORAGE_KEY);
      else storage?.setItem(INSTITUTION_STORAGE_KEY, id);
    } catch {
      /* the choice just will not persist */
    }
  };

  async function loadFor(client: SmsClient, userId: string): Promise<SessionState> {
    const [profile, memberships, institutions] = await Promise.all([
      client.from("profiles").select("id, full_name").eq("id", userId).maybeSingle(),
      client.from("memberships").select("institution_id, role, status").eq("profile_id", userId),
      client.from("institutions").select("id, name_bn, name_en"),
    ]);
    if (profile.error || memberships.error || institutions.error) {
      throw new Error("load failed");
    }
    const rolesByInstitution = new Map<string, MembershipRole[]>();
    for (const m of memberships.data ?? []) {
      if (m.status !== "active") continue;
      rolesByInstitution.set(m.institution_id, [
        ...(rolesByInstitution.get(m.institution_id) ?? []),
        m.role as MembershipRole,
      ]);
    }
    const options: InstitutionOption[] = (institutions.data ?? [])
      .filter((i) => rolesByInstitution.has(i.id))
      .map((i) => ({
        id: i.id,
        nameBn: i.name_bn,
        nameEn: i.name_en,
        roles: rolesByInstitution.get(i.id) ?? [],
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
    const stored = readStored();
    const first = options[0];
    const active =
      stored !== null && options.some((o) => o.id === stored)
        ? stored
        : options.length === 1 && first
          ? first.id
          : null;
    writeStored(active);
    return {
      status: "signed_in",
      userId,
      fullName: profile.data?.full_name ?? "",
      institutions: options,
      activeInstitutionId: active,
    };
  }

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** Restores a persisted session and follows sign-in/sign-out from other tabs. Idempotent. */
    async start(): Promise<void> {
      if (started) return;
      started = true;
      const client = await getClient();
      if (!client) return set({ status: "unconfigured" });
      client.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT" || (!session && event !== "INITIAL_SESSION")) {
          writeStored(null);
          set({ status: "signed_out" });
        }
      });
      try {
        const { data } = await client.auth.getSession();
        const user = data.session?.user;
        set(user ? await loadFor(client, user.id) : { status: "signed_out" });
      } catch {
        set({ status: "signed_out" });
      }
    },

    async signIn(email: string, password: string): Promise<SignInResult> {
      const client = await getClient();
      if (!client) return { ok: false, reason: "failed" };
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        return { ok: false, reason: error?.status === 400 ? "invalid" : "failed" };
      }
      try {
        set(await loadFor(client, data.user.id));
        return { ok: true };
      } catch {
        await client.auth.signOut();
        set({ status: "signed_out" });
        return { ok: false, reason: "failed" };
      }
    },

    async signOut(): Promise<void> {
      writeStored(null);
      set({ status: "signed_out" });
      await (await getClient())?.auth.signOut();
    },

    selectInstitution(id: string): void {
      if (state.status !== "signed_in" || !state.institutions.some((i) => i.id === id)) return;
      writeStored(id);
      set({ ...state, activeInstitutionId: id });
    },

    /** Forgets the chosen institution so the picker shows again. */
    clearInstitution(): void {
      if (state.status !== "signed_in") return;
      writeStored(null);
      set({ ...state, activeInstitutionId: null });
    },
  };
}

export type SessionStore = ReturnType<typeof createSessionStore>;

let client: Promise<SmsClient | null> | undefined;
/**
 * Loads the Supabase client on first use, in its own chunk. Importing it statically would add
 * about 60 KB gzip to every page's first load, including pages that never sign in.
 */
function envClient(): Promise<SmsClient | null> {
  client ??= import("@sms/db").then((db) => db.createSmsClientFromEnv()).catch(() => null);
  return client;
}

function browserStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** The app-wide store (created on first use, never at import time). */
let shared: SessionStore | undefined;
export function sessionStore(): SessionStore {
  shared ??= createSessionStore(envClient, browserStorage());
  return shared;
}

/** Tests only: swaps the app-wide store for one built on a fake client. */
export function setSessionStoreForTests(store: SessionStore | undefined): void {
  shared = store;
}

/** Current session state; starts the store on first use. */
export function useSession(store: SessionStore = sessionStore()): SessionState {
  useEffect(() => {
    void store.start();
  }, [store]);
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

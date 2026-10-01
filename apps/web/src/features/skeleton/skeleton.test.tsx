import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { features } from "../../app/features";
import { registerMessages, setLocale } from "../../shared/i18n";

import { fakeClient, SAMPLE } from "./fake-client";
import { createSessionStore, setSessionStoreForTests } from "./session";
import { skeletonRoutes } from "./skeleton-routes";

function mount(path: string, opts: { restore?: string } = {}) {
  const client = fakeClient(SAMPLE);
  if (opts.restore) client.__setSession(opts.restore);
  setSessionStoreForTests(createSessionStore(() => client, null));
  const router = createMemoryRouter(skeletonRoutes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

async function signIn(email: string, password: string) {
  fireEvent.change(await screen.findByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  });
}

describe("skeleton screens", () => {
  beforeEach(() => {
    // Same as main.tsx: the shell collects every feature's texts by glob.
    registerMessages("bn", features.translations.bn);
    registerMessages("en", features.translations.en);
    setLocale("en");
  });
  afterEach(() => {
    cleanup();
    setSessionStoreForTests(undefined);
  });

  it("route guard: a signed-out visitor to the dashboard lands on sign-in", async () => {
    const router = mount("/app/dashboard");
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/auth/sign-in");
  });

  it("route guard: the picker is not reachable while signed out", async () => {
    const router = mount("/auth/pick-institution");
    await screen.findByRole("heading", { name: "Sign in" });
    expect(router.state.location.pathname).toBe("/auth/sign-in");
  });

  it("a one-institution user signs in and sees the hello dashboard", async () => {
    const router = mount("/auth/sign-in");
    await signIn("one@test.invalid", "pw-one");
    expect(await screen.findByRole("heading", { name: "Welcome, Rahim" })).toBeInTheDocument();
    expect(screen.getByTestId("institution-name")).toHaveTextContent("School One");
    expect(router.state.location.pathname).toBe("/app/dashboard");
    expect(screen.queryByRole("button", { name: "Switch institution" })).toBeNull();
  });

  it("a two-institution user sees the picker, then the dashboard for the chosen one", async () => {
    const router = mount("/auth/sign-in");
    await signIn("two@test.invalid", "pw-two");
    expect(
      await screen.findByRole("heading", { name: "Choose an institution" }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/auth/pick-institution");
    fireEvent.click(screen.getByRole("button", { name: /Madrasa Two/ }));
    expect(await screen.findByRole("heading", { name: "Welcome, Salma" })).toBeInTheDocument();
    expect(screen.getByTestId("institution-name")).toHaveTextContent("Madrasa Two");
    expect(screen.getByRole("button", { name: "Switch institution" })).toBeInTheDocument();
  });

  it("the dashboard of a two-institution user without a choice goes to the picker", async () => {
    const router = mount("/app/dashboard", { restore: "u2" });
    await screen.findByRole("heading", { name: "Choose an institution" });
    expect(router.state.location.pathname).toBe("/auth/pick-institution");
  });

  it("session persistence: a restored session skips sign-in", async () => {
    const router = mount("/auth/sign-in", { restore: "u1" });
    await screen.findByRole("heading", { name: "Welcome, Rahim" });
    expect(router.state.location.pathname).toBe("/app/dashboard");
  });

  it("a wrong password shows an error and keeps the user on sign-in", async () => {
    const router = mount("/auth/sign-in");
    await signIn("one@test.invalid", "wrong");
    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is not correct.");
    expect(router.state.location.pathname).toBe("/auth/sign-in");
  });

  it("empty fields are flagged and nothing is sent", async () => {
    mount("/auth/sign-in");
    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: "Sign in" }));
    });
    expect(screen.getAllByText(/Fill in this field/)).toHaveLength(2);
  });

  it("sign-out returns to sign-in and the dashboard is guarded again", async () => {
    const router = mount("/auth/sign-in");
    await signIn("one@test.invalid", "pw-one");
    await screen.findByRole("heading", { name: "Welcome, Rahim" });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    });
    await waitFor(() => expect(router.state.location.pathname).toBe("/auth/sign-in"));
    await act(async () => {
      await router.navigate("/app/dashboard");
    });
    await screen.findByRole("heading", { name: "Sign in" });
    expect(router.state.location.pathname).toBe("/auth/sign-in");
  });
});

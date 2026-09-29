/**
 * Dev-only tools (role switcher, /dev/kit) are on in `vite dev` and in builds made with
 * `VITE_ENABLE_DEV_TOOLS=true` (used by the e2e run). Production builds strip them.
 */
export const devToolsEnabled: boolean =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_TOOLS === "true";

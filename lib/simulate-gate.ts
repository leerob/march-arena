/**
 * Single toggle for sim UI, `/api/simulate`, and related nav/copy.
 *
 * Set in `.env` / Vercel:
 *   NEXT_PUBLIC_SHOW_SIM=true   → full sim (local default in development)
 *   NEXT_PUBLIC_SHOW_SIM=false  → bracket + stats only (production default)
 *
 * If unset: `true` when NODE_ENV === "development", else `false`.
 */
export function showSim(): boolean {
  const v = process.env.NEXT_PUBLIC_SHOW_SIM?.trim().toLowerCase();
  if (v === "true") return true;
  if (v === "false") return false;
  return process.env.NODE_ENV === "development";
}

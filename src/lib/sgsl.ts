import { parseHTML } from "linkedom";

export const SGSL_BASE = "https://blogs.ntu.edu.sg/sgslsignbank/";
export type SgslResult = { kind: "found" | "possible" | "missing" | "failed"; url: string | null; candidates: string[] };
export const normaliseWord = (word: string) => word.trim().toLowerCase();
export function sgslUrl(word: string) {
  const trimmed = word.trim();
  return `${SGSL_BASE}word/?frm-word=${encodeURIComponent(trimmed.charAt(0).toUpperCase() + trimmed.slice(1))}`;
}
export function detectSgsl(html: string, word: string): "found" | "missing" | "failed" {
  const { document } = parseHTML(html);
  document.querySelectorAll("script,style").forEach((node) => node.remove());
  const text = document.documentElement.textContent ?? "";
  // The site's entry is h1.h3; h1.entry-title is only the generic “Word” page title.
  const headingMatches = Array.from(document.querySelectorAll("h1.h3")).some(
    (heading) => normaliseWord(heading.textContent ?? "") === normaliseWord(word),
  );
  if (/description of sign/i.test(text) && headingMatches) return "found";
  if (/no entries found/i.test(text)) return "missing";
  return "failed";
}
export function parseSgslList(html: string): string[] | null {
  const { document } = parseHTML(html);
  // NTU exposes its complete alphabetical word list in the sign-search select.
  const names = Array.from(document.querySelectorAll('select[name="item_meta[130]"] option[value]'))
    .map((option) => option.getAttribute("value")?.trim() ?? "").filter(Boolean);
  return names.length ? [...new Set(names)] : null;
}
export function sgslCandidates(word: string, names: string[]) {
  const prefix = `${normaliseWord(word)} (`;
  return names.filter((name) => normaliseWord(name).startsWith(prefix));
}
export function sgslPatch(result: SgslResult, manual: boolean, checkedAt: string) {
  if (manual || result.kind === "failed") return null;
  return { sgsl_url: result.url, sgsl_candidates: result.candidates, sgsl_checked_at: checkedAt };
}
export function assertSgslStaff(isStaff: boolean | null) {
  if (isStaff !== true) throw new Error("Programme staff access is required.");
}
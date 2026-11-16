import { parseHTML } from "linkedom";

export const SGSL_BASE = "https://blogs.ntu.edu.sg/sgslsignbank/";
export type SgslResult = {
  kind: "found" | "possible" | "missing" | "failed";
  url: string | null;
  candidates: string[];
};
export const normaliseWord = (word: string) => word.trim().toLowerCase();
/** Signbank page address for a word; the site expects a capital first letter. */
export function sgslUrl(word: string) {
  const trimmed = word.trim();
  return `${SGSL_BASE}word/?frm-word=${encodeURIComponent(trimmed.charAt(0).toUpperCase() + trimmed.slice(1))}`;
}
export type SgslDetection = {
  kind: "found" | "possible" | "missing" | "failed";
  headings: string[];
};
/** Read a Signbank page and classify it. Anything unrecognised is "failed", never "missing". */
export function detectSgsl(html: string, word: string): SgslDetection {
  const { document } = parseHTML(html);
  document.querySelectorAll("script,style").forEach((node) => node.remove());
  const text = document.documentElement.textContent ?? "";
  // The site's entry is h1.h3; h1.entry-title is only the generic “Word” page title.
  const headings = [
    ...new Set(
      Array.from(document.querySelectorAll("h1.h3"))
        .map((h) => (h.textContent ?? "").trim())
        .filter(Boolean),
    ),
  ];
  if (/description of sign/i.test(text)) {
    if (headings.some((h) => normaliseWord(h) === normaliseWord(word)))
      return { kind: "found", headings: [] };
    // A sign page with variant headings (e.g. "Light (Noun)", "Light 2") needs staff review.
    if (headings.length) return { kind: "possible", headings };
    return { kind: "failed", headings: [] };
  }
  if (/no entries found/i.test(text)) return { kind: "missing", headings: [] };
  return { kind: "failed", headings: [] };
}
/** Extract the word list from the Signbank search page; null if the page layout is not as expected. */
export function parseSgslList(html: string): string[] | null {
  const { document } = parseHTML(html);
  // NTU exposes its complete alphabetical word list in the sign-search select.
  const names = Array.from(document.querySelectorAll('select[name="item_meta[130]"] option[value]'))
    .map((option) => option.getAttribute("value")?.trim() ?? "")
    .filter(Boolean);
  return names.length ? [...new Set(names)] : null;
}
/** Entries named like "word (…)", e.g. "Light (Noun)" for "light". */
export function sgslCandidates(word: string, names: string[]) {
  const prefix = `${normaliseWord(word)} (`;
  return names.filter((name) => normaliseWord(name).startsWith(prefix));
}
/** Database fields to save for a result, or null when nothing should change (manual link or failed fetch). */
export function sgslPatch(result: SgslResult, manual: boolean, checkedAt: string) {
  if (manual || result.kind === "failed") return null;
  return { sgsl_url: result.url, sgsl_candidates: result.candidates, sgsl_checked_at: checkedAt };
}
/** Throw unless the database confirmed the caller is programme staff. */
export function assertSgslStaff(isStaff: boolean | null) {
  if (isStaff !== true) throw new Error("Programme staff access is required.");
}

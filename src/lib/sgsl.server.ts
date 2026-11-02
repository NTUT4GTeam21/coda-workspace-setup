import { detectSgsl, parseSgslList, sgslCandidates, sgslUrl, SGSL_BASE, type SgslResult } from "./sgsl";

async function fetchSignbank(url: string) {
  // Sequential requests, including the first request in each invocation, stay gentle on NTU.
  await new Promise((resolve) => setTimeout(resolve, 3000));
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { Accept: "text/html" } });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}
export async function loadSgslList() {
  const html = await fetchSignbank(`${SGSL_BASE}word-2/`);
  return html === null ? null : parseSgslList(html);
}
export async function checkSgslWord(word: string, list: string[] | null): Promise<SgslResult> {
  const url = sgslUrl(word);
  const html = await fetchSignbank(url);
  const detection = html === null ? "failed" : detectSgsl(html, word);
  if (detection === "found") return { kind: "found", url, candidates: [] };
  if (detection === "failed" || list === null) return { kind: "failed", url: null, candidates: [] };
  const candidates = sgslCandidates(word, list);
  return { kind: candidates.length ? "possible" : "missing", url: null, candidates };
}
import { describe, expect, it } from "vitest";
import { detectSgsl } from "@/lib/sgsl";

const page = (body: string) => `<html><body><h1 class="entry-title">Word</h1>${body}</body></html>`;

describe("detectSgsl", () => {
  it("exact heading with a sign description is found", () => {
    expect(detectSgsl(page('<h1 class="h3">RAIN</h1><p>Description of Sign</p>'), "rain").kind).toBe("found");
  });
  it("variant heading with a sign description is possible", () => {
    const r = detectSgsl(page('<h1 class="h3">Light (Noun)</h1><h1 class="h3">Light 2</h1><p>Description of Sign</p>'), "light");
    expect(r).toEqual({ kind: "possible", headings: ["Light (Noun)", "Light 2"] });
  });
  it("No Entries Found is missing", () => {
    expect(detectSgsl(page("<p>No Entries Found</p>"), "zebra").kind).toBe("missing");
  });
  it("unrecognised page is failed", () => {
    expect(detectSgsl(page("<p>Too many requests</p>"), "rain").kind).toBe("failed");
  });
});

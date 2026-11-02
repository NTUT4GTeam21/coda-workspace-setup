import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertSgslStaff, normaliseWord, sgslPatch } from "./sgsl";
import { checkSgslWord, loadSgslList } from "./sgsl.server";

export const beginSgslRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (role.error) throw new Error("Staff access could not be verified.");
    assertSgslStaff(role.data);
    const { data, error } = await context.supabase.from("word_cards").select("word").eq("sgsl_manual", false);
    if (error) throw new Error("Word cards could not load.");
    const unique = new Map<string, string>();
    for (const row of data ?? []) if (row.word.trim()) unique.set(normaliseWord(row.word), row.word.trim());
    return { words: [...unique.values()], list: await loadSgslList() };
  });

export const checkSgslBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ words: z.array(z.string().trim().min(1).max(120)).max(3), list: z.array(z.string().max(200)).max(10000).nullable() }))
  .handler(async ({ context, data }) => {
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (role.error) throw new Error("Staff access could not be verified.");
    assertSgslStaff(role.data);
    const counts = { found: 0, possible: 0, missing: 0, failed: 0 };
    const { data: cards, error } = await context.supabase.from("word_cards").select("id, word").eq("sgsl_manual", false);
    if (error) throw new Error("Word cards could not load.");
    for (const word of [...new Set(data.words.map(normaliseWord))]) {
      const matches = (cards ?? []).filter((card) => normaliseWord(card.word) === word);
      if (!matches.length) continue;
      const result = await checkSgslWord(matches[0].word, data.list);
      const patch = sgslPatch(result, false, new Date().toISOString());
      if (patch) {
        // Re-check manual flag and original word at write time to protect concurrent staff edits.
        for (const card of matches) {
          const saved = await context.supabase.from("word_cards").update(patch).eq("id", card.id).eq("word", card.word).eq("sgsl_manual", false);
          if (saved.error) throw new Error("SgSL results could not be saved. Please retry.");
        }
      }
      counts[result.kind]++;
    }
    return counts;
  });

const wordInput = z.object({
  id: z.string().uuid().optional(), bookId: z.string().uuid(), word: z.string().trim().min(1).max(120),
  definition: z.string().trim(), pronunciation: z.string().trim(), example_sentence: z.string().trim(),
  sign_bank_url: z.string().url().nullable(), sgsl_url: z.string().url().nullable(),
});
export const saveSgslWordCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(wordInput)
  .handler(async ({ context, data }) => {
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (role.error) throw new Error("Staff access could not be verified.");
    assertSgslStaff(role.data);
    const { id, bookId, ...fields } = data;
    const old = id ? await context.supabase.from("word_cards").select("word,sgsl_url,sgsl_manual").eq("id", id).eq("book_id", bookId).single() : null;
    if (old?.error) throw new Error("Word card could not load.");
    const overrideChanged = fields.sgsl_url !== (old?.data?.sgsl_url ?? null);
    const manual = fields.sgsl_url !== null && (overrideChanged || old?.data?.sgsl_manual === true);
    // An unchanged auto-found URL remains automatic; clearing it opts back into checking.
    const mustCheck = !id || fields.word !== old?.data?.word || (overrideChanged && fields.sgsl_url === null);
    const payload = { ...fields, sgsl_manual: manual, ...(manual || mustCheck ? { sgsl_candidates: [] } : {}) };
    const saved = id
      ? await context.supabase.from("word_cards").update(payload).eq("id", id).eq("book_id", bookId).select("id").single()
      : await context.supabase.from("word_cards").insert({ ...payload, book_id: bookId, status: "draft" }).select("id").single();
    if (saved.error || !saved.data) throw new Error("Word card could not be saved.");
    let result: string | null = null;
    if (mustCheck && !manual) {
      const checked = await checkSgslWord(fields.word, await loadSgslList());
      result = checked.kind;
      const patch = sgslPatch(checked, false, new Date().toISOString());
      if (patch) {
        const updated = await context.supabase.from("word_cards").update(patch).eq("id", saved.data.id).eq("word", fields.word).eq("sgsl_manual", false);
        if (updated.error) throw new Error("Word saved, but its sign result could not save. Please re-check.");
      }
    }
    return { result };
  });
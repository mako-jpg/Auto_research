import { isAuthenticated } from "../../lib/auth.js";
import {
  isValidPriority,
  normalizeCategories,
  normalizeOutputTypes,
  normalizeResearchMode,
  normalizeRecurringFrequency,
  normalizeDayOfWeek,
  normalizeDayOfMonth,
  normalizeRecurringTime,
  normalizeCustomDates,
  normalizeSourceUrl,
  normalizeBoolean,
  normalizeRevisionNote,
} from "../../lib/schema.js";
import { loadMemos, saveMemos } from "../../lib/store.js";

const VALID_STATUSES = new Set(["pending", "researching", "drafted", "active", "done", "archived"]);

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const { id } = req.query;
  const memos = await loadMemos();
  const index = memos.findIndex((m) => m.id === id);

  if (req.method === "PUT") {
    if (index === -1) {
      res.status(404).json({ error: "not found" });
      return;
    }
    const payload = req.body || {};
    if (payload.status && !VALID_STATUSES.has(payload.status)) {
      res.status(400).json({ error: `status must be one of ${[...VALID_STATUSES].join(", ")}` });
      return;
    }
    if (payload.priority !== undefined) {
      if (!isValidPriority(payload.priority)) {
        res.status(400).json({ error: "priority must be an integer from 1 to 5" });
        return;
      }
      payload.priority = Number(payload.priority);
    }
    if (payload.categories !== undefined) {
      payload.categories = normalizeCategories(payload.categories);
    }
    if (payload.outputTypes !== undefined) {
      payload.outputTypes = normalizeOutputTypes(payload.outputTypes);
    }
    if (payload.researchMode !== undefined) {
      payload.researchMode = normalizeResearchMode(payload.researchMode);
    }
    if (payload.recurringFrequency !== undefined) {
      payload.recurringFrequency = normalizeRecurringFrequency(payload.recurringFrequency);
    }
    if (payload.recurringDayOfWeek !== undefined) {
      payload.recurringDayOfWeek = normalizeDayOfWeek(payload.recurringDayOfWeek);
    }
    if (payload.recurringDayOfMonth !== undefined) {
      payload.recurringDayOfMonth = normalizeDayOfMonth(payload.recurringDayOfMonth);
    }
    if (payload.recurringTime !== undefined) {
      payload.recurringTime = normalizeRecurringTime(payload.recurringTime);
    }
    if (payload.recurringCustomDates !== undefined) {
      payload.recurringCustomDates = normalizeCustomDates(payload.recurringCustomDates);
    }
    if (payload.sourceUrl !== undefined) {
      payload.sourceUrl = normalizeSourceUrl(payload.sourceUrl);
    }
    if (payload.obsidianSave !== undefined) {
      payload.obsidianSave = normalizeBoolean(payload.obsidianSave);
    }
    if (payload.revisionRequested !== undefined) {
      payload.revisionRequested = normalizeBoolean(payload.revisionRequested);
    }
    if (payload.revisionNote !== undefined) {
      payload.revisionNote = normalizeRevisionNote(payload.revisionNote);
    }

    const memo = memos[index];
    const editableKeys = [
      "title",
      "brief",
      "categories",
      "priority",
      "outputTypes",
      "researchMode",
      "recurringFrequency",
      "recurringDayOfWeek",
      "recurringDayOfMonth",
      "recurringTime",
      "recurringCustomDates",
      "sourceUrl",
      "obsidianSave",
      "revisionRequested",
      "revisionNote",
      "status",
      "outputs",
      "history",
      "last_processed_at",
      "slug",
    ];
    for (const key of editableKeys) {
      if (key in payload) memo[key] = payload[key];
    }
    memo.updated_at = new Date().toISOString().replace(/\.\d+Z$/, "Z");

    await saveMemos(memos);
    res.status(200).json(memo);
    return;
  }

  if (req.method === "DELETE") {
    if (index === -1) {
      res.status(404).json({ error: "not found" });
      return;
    }
    memos.splice(index, 1);
    await saveMemos(memos);
    res.status(204).end();
    return;
  }

  res.status(405).json({ error: "method not allowed" });
}

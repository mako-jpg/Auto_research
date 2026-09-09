import crypto from "node:crypto";
import { isAuthenticated } from "../lib/auth.js";
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
} from "../lib/schema.js";
import { loadMemos, saveMemos } from "../lib/store.js";

const DEFAULT_PRIORITY = 3;

function nowIso() {
  return new Date().toISOString().replace(/\.\d+Z$/, "Z");
}

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  if (req.method === "GET") {
    const memos = await loadMemos();
    res.status(200).json(memos);
    return;
  }

  if (req.method === "POST") {
    const payload = req.body || {};
    const title = (payload.title || "").trim();
    const brief = (payload.brief || "").trim();
    const sourceUrl = normalizeSourceUrl(payload.sourceUrl);
    const willAttachScreenshot = Boolean(payload.willAttachScreenshot);
    if (!title) {
      res.status(400).json({ error: "title is required" });
      return;
    }
    if (!brief && !sourceUrl && !willAttachScreenshot) {
      res.status(400).json({ error: "brief, sourceUrl, or a screenshot attachment is required" });
      return;
    }

    const priority = payload.priority === undefined ? DEFAULT_PRIORITY : Number(payload.priority);
    if (!isValidPriority(priority)) {
      res.status(400).json({ error: "priority must be an integer from 1 to 5" });
      return;
    }

    const memo = {
      id: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
      title,
      brief,
      categories: normalizeCategories(payload.categories),
      priority,
      outputTypes: normalizeOutputTypes(payload.outputTypes) || ["article", "video"],
      researchMode: normalizeResearchMode(payload.researchMode) || "once",
      recurringFrequency: normalizeRecurringFrequency(payload.recurringFrequency) || "weekly",
      recurringDayOfWeek: normalizeDayOfWeek(payload.recurringDayOfWeek) ?? null,
      recurringDayOfMonth: normalizeDayOfMonth(payload.recurringDayOfMonth) ?? null,
      recurringTime: normalizeRecurringTime(payload.recurringTime) ?? null,
      recurringCustomDates: normalizeCustomDates(payload.recurringCustomDates) ?? [],
      sourceUrl: sourceUrl || null,
      screenshot: false,
      status: "pending",
      created_at: nowIso(),
      updated_at: nowIso(),
      outputs: {},
      history: [],
      last_processed_at: null,
      slug: null,
    };

    const memos = await loadMemos();
    memos.unshift(memo);
    await saveMemos(memos);
    res.status(201).json(memo);
    return;
  }

  res.status(405).json({ error: "method not allowed" });
}

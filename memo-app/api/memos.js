import crypto from "node:crypto";
import { isAuthenticated } from "../lib/auth.js";
import { loadMemos, saveMemos } from "../lib/store.js";

const VALID_PRIORITIES = new Set(["low", "normal", "high"]);

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
    if (!title || !brief) {
      res.status(400).json({ error: "title and brief are required" });
      return;
    }

    const priority = payload.priority || "normal";
    if (!VALID_PRIORITIES.has(priority)) {
      res.status(400).json({ error: `priority must be one of ${[...VALID_PRIORITIES].join(", ")}` });
      return;
    }

    let tags = payload.tags || [];
    tags = typeof tags === "string"
      ? tags.split(",").map((t) => t.trim()).filter(Boolean)
      : tags.map((t) => String(t).trim()).filter(Boolean);

    const memo = {
      id: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
      title,
      brief,
      tags,
      priority,
      status: "pending",
      notes: (payload.notes || "").trim(),
      created_at: nowIso(),
      updated_at: nowIso(),
      outputs: {},
    };

    const memos = await loadMemos();
    memos.unshift(memo);
    await saveMemos(memos);
    res.status(201).json(memo);
    return;
  }

  res.status(405).json({ error: "method not allowed" });
}

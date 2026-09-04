import { isAuthenticated } from "../../lib/auth.js";
import { loadMemos, saveMemos } from "../../lib/store.js";

const VALID_STATUSES = new Set(["pending", "researching", "drafted", "done", "archived"]);
const VALID_PRIORITIES = new Set(["low", "normal", "high"]);

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
    if (payload.priority && !VALID_PRIORITIES.has(payload.priority)) {
      res.status(400).json({ error: `priority must be one of ${[...VALID_PRIORITIES].join(", ")}` });
      return;
    }

    const memo = memos[index];
    for (const key of ["title", "brief", "tags", "priority", "status", "notes", "outputs"]) {
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

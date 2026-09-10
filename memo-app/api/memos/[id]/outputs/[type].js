import { isAuthenticated } from "../../../../lib/auth.js";
import { loadMemos, loadOutput, saveOutput } from "../../../../lib/store.js";

const VALID_TYPES = new Set(["research", "article", "video"]);

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const { id, type, date } = req.query;
  if (!VALID_TYPES.has(type)) {
    res.status(400).json({ error: `type must be one of ${[...VALID_TYPES].join(", ")}` });
    return;
  }
  if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "date must be in YYYY-MM-DD format" });
    return;
  }

  const memos = await loadMemos();
  const memoExists = memos.some((m) => m.id === id);
  if (!memoExists) {
    res.status(404).json({ error: "memo not found" });
    return;
  }

  if (req.method === "GET") {
    const content = await loadOutput(id, type, date);
    if (content === null) {
      res.status(404).json({ error: "output not found" });
      return;
    }
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.status(200).send(content);
    return;
  }

  if (req.method === "PUT") {
    // Vercel's default body parser only auto-stringifies "text/plain";
    // other text/* types (e.g. text/markdown) arrive as a raw Buffer.
    let body;
    if (typeof req.body === "string") {
      body = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      body = req.body.toString("utf-8");
    } else {
      body = "";
    }
    if (!body.trim()) {
      res.status(400).json({ error: "request body must not be empty (send it with a text/* Content-Type)" });
      return;
    }
    await saveOutput(id, type, body, date);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: "method not allowed" });
}

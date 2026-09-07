import { isAuthenticated } from "../../../../lib/auth.js";
import { loadMemos, loadOutput, saveOutput } from "../../../../lib/store.js";

const VALID_TYPES = new Set(["article", "video"]);

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const { id, type } = req.query;
  if (!VALID_TYPES.has(type)) {
    res.status(400).json({ error: `type must be one of ${[...VALID_TYPES].join(", ")}` });
    return;
  }

  const memos = await loadMemos();
  const memoExists = memos.some((m) => m.id === id);
  if (!memoExists) {
    res.status(404).json({ error: "memo not found" });
    return;
  }

  if (req.method === "GET") {
    const content = await loadOutput(id, type);
    if (content === null) {
      res.status(404).json({ error: "output not found" });
      return;
    }
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.status(200).send(content);
    return;
  }

  if (req.method === "PUT") {
    // Vercel auto-parses the body to a string for any text/* Content-Type
    // (e.g. text/markdown, text/plain), so req.body is already the content.
    const body = typeof req.body === "string" ? req.body : "";
    if (!body.trim()) {
      res.status(400).json({ error: "request body must not be empty (send it with a text/* Content-Type)" });
      return;
    }
    await saveOutput(id, type, body);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: "method not allowed" });
}

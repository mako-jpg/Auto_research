import { isAuthenticated } from "../../../lib/auth.js";
import { loadMemos, saveMemos, loadScreenshot, saveScreenshot } from "../../../lib/store.js";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB safety cap

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const { id } = req.query;
  const memos = await loadMemos();
  const index = memos.findIndex((m) => m.id === id);
  if (index === -1) {
    res.status(404).json({ error: "memo not found" });
    return;
  }

  if (req.method === "GET") {
    const result = await loadScreenshot(id);
    if (!result) {
      res.status(404).json({ error: "screenshot not found" });
      return;
    }
    res.setHeader("Content-Type", result.contentType || "application/octet-stream");
    res.status(200).send(result.buffer);
    return;
  }

  if (req.method === "PUT") {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.startsWith("image/")) {
      res.status(400).json({ error: "request body must be an image/* upload" });
      return;
    }
    if (!Buffer.isBuffer(req.body)) {
      res.status(400).json({ error: "request body could not be read as binary image data" });
      return;
    }
    if (req.body.length > MAX_BYTES) {
      res.status(413).json({ error: "screenshot too large (max 8MB)" });
      return;
    }

    await saveScreenshot(id, req.body, contentType);
    memos[index].screenshot = true;
    memos[index].updated_at = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    await saveMemos(memos);
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method === "DELETE") {
    memos[index].screenshot = false;
    memos[index].updated_at = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    await saveMemos(memos);
    res.status(204).end();
    return;
  }

  res.status(405).json({ error: "method not allowed" });
}

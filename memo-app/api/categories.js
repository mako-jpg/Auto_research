import { isAuthenticated } from "../lib/auth.js";
import { loadCategories, saveCategories } from "../lib/store.js";

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  if (req.method === "GET") {
    const categories = await loadCategories();
    res.status(200).json(categories);
    return;
  }

  if (req.method === "POST") {
    const payload = req.body || {};
    const name = (payload.name || "").trim();
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const categories = await loadCategories();
    if (!categories.includes(name)) {
      categories.push(name);
      await saveCategories(categories);
    }
    res.status(201).json(categories);
    return;
  }

  res.status(405).json({ error: "method not allowed" });
}

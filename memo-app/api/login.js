import { checkLoginCredentials, createSessionCookie } from "../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  const { email, password } = req.body || {};
  if (!checkLoginCredentials(email, password)) {
    res.status(401).json({ error: "メールアドレスまたはパスワードが違います" });
    return;
  }

  res.setHeader("Set-Cookie", createSessionCookie());
  res.status(200).json({ ok: true });
}

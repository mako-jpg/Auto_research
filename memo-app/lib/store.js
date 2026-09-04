import { put, get } from "@vercel/blob";

const PATHNAME = "memos.json";

function token() {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

export async function loadMemos() {
  const result = await get(PATHNAME, { access: "private", useCache: false, token: token() });
  if (!result || result.statusCode !== 200) return [];
  const text = await new Response(result.stream).text();
  const data = JSON.parse(text);
  return data.memos || [];
}

export async function saveMemos(memos) {
  await put(PATHNAME, JSON.stringify({ memos }, null, 2), {
    access: "private",
    contentType: "application/json",
    allowOverwrite: true,
    token: token(),
  });
}

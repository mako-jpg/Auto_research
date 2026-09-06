import { put, get } from "@vercel/blob";

const MEMOS_PATHNAME = "memos.json";

function token() {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

async function getBlobText(pathname) {
  const result = await get(pathname, { access: "private", useCache: false, token: token() });
  if (!result || result.statusCode !== 200) return null;
  return new Response(result.stream).text();
}

async function putBlobText(pathname, text, contentType) {
  await put(pathname, text, {
    access: "private",
    contentType,
    allowOverwrite: true,
    token: token(),
  });
}

export async function loadMemos() {
  const text = await getBlobText(MEMOS_PATHNAME);
  if (!text) return [];
  const data = JSON.parse(text);
  return data.memos || [];
}

export async function saveMemos(memos) {
  await putBlobText(MEMOS_PATHNAME, JSON.stringify({ memos }, null, 2), "application/json");
}

function outputPathname(memoId, type) {
  return `outputs/${memoId}/${type}.md`;
}

export async function loadOutput(memoId, type) {
  return getBlobText(outputPathname(memoId, type));
}

export async function saveOutput(memoId, type, content) {
  await putBlobText(outputPathname(memoId, type), content, "text/markdown");
}

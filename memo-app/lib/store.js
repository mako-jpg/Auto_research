import { put, get } from "@vercel/blob";

const MEMOS_PATHNAME = "memos.json";
const CATEGORIES_PATHNAME = "categories.json";

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

async function getBlobBinary(pathname) {
  const result = await get(pathname, { access: "private", useCache: false, token: token() });
  if (!result || result.statusCode !== 200) return null;
  const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
  return { buffer, contentType: result.blob.contentType };
}

async function putBlobBinary(pathname, buffer, contentType) {
  await put(pathname, buffer, {
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

export async function loadCategories() {
  const text = await getBlobText(CATEGORIES_PATHNAME);
  if (!text) return [];
  const data = JSON.parse(text);
  return data.categories || [];
}

export async function saveCategories(categories) {
  await putBlobText(CATEGORIES_PATHNAME, JSON.stringify({ categories }, null, 2), "application/json");
}

function outputPathname(memoId, type) {
  return `outputs/${memoId}/${type}.md`;
}

function datedOutputPathname(memoId, type, date) {
  return `outputs/${memoId}/${type}/${date}.md`;
}

export async function loadOutput(memoId, type, date) {
  const pathname = date ? datedOutputPathname(memoId, type, date) : outputPathname(memoId, type);
  return getBlobText(pathname);
}

// When `date` is given (recurring memos), the dated snapshot is kept
// permanently for history, and the plain (undated) "latest" copy is also
// overwritten so a plain GET without ?date= always resolves to the newest run.
export async function saveOutput(memoId, type, content, date) {
  if (date) {
    await putBlobText(datedOutputPathname(memoId, type, date), content, "text/markdown");
  }
  await putBlobText(outputPathname(memoId, type), content, "text/markdown");
}

function screenshotPathname(memoId) {
  return `screenshots/${memoId}`;
}

export async function loadScreenshot(memoId) {
  return getBlobBinary(screenshotPathname(memoId));
}

export async function saveScreenshot(memoId, buffer, contentType) {
  await putBlobBinary(screenshotPathname(memoId), buffer, contentType);
}

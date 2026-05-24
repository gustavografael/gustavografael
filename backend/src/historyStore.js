import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../data");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function readHistory() {
  try {
    const file = await readFile(HISTORY_FILE, "utf8");
    return JSON.parse(file);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function saveRun(run, limit = 25) {
  await ensureDataDir();
  const history = await readHistory();
  const nextHistory = [run, ...history.filter((item) => item.id !== run.id)].slice(0, limit);
  await writeFile(HISTORY_FILE, JSON.stringify(nextHistory, null, 2), "utf8");
  return run;
}

export async function getRunById(id) {
  const history = await readHistory();
  return history.find((item) => item.id === id) ?? null;
}

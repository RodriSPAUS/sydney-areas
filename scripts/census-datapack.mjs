/**
 * Reading the ABS Census 2021 GCP DataPack (SAL, NSW, short headers) straight
 * from the cached zip in data/cache/. Shared by scripts/fetch-census-2021.mjs
 * and scripts/build-suburb-metrics.mjs. Nothing here downloads.
 */
import { spawn, spawnSync } from "node:child_process";

export const DATA_DIR = "2021 Census GCP Suburbs and Localities for NSW";

export const ANCESTRY_LABEL = {
  Aust: "Australian",
  Aust_Abor: "Australian Aboriginal",
  Chinese: "Chinese",
  Croatian: "Croatian",
  Dutch: "Dutch",
  English: "English",
  Filipino: "Filipino",
  French: "French",
  German: "German",
  Greek: "Greek",
  Hungarian: "Hungarian",
  Indian: "Indian",
  Irish: "Irish",
  Italian: "Italian",
  Korean: "Korean",
  Lebanese: "Lebanese",
  Macedonian: "Macedonian",
  Maltese: "Maltese",
  Maori: "Māori",
  NZ: "New Zealander",
  Polish: "Polish",
  Russian: "Russian",
  Samoan: "Samoan",
  Scottish: "Scottish",
  Serbian: "Serbian",
  Sth_African: "South African",
  Spanish: "Spanish",
  Sri_Lankan: "Sri Lankan",
  Vietnamese: "Vietnamese",
  Welsh: "Welsh",
  Other: "Other",
};

export const LANG_LABEL = {
  Afrikaans: "Afrikaans",
  Arabic: "Arabic",
  AIndLng: "Aboriginal languages",
  CL_Canton: "Cantonese",
  CL_Mandarin: "Mandarin",
  CL_Oth: "Other Chinese languages",
  SAL_Filipin: "Filipino",
  SAL_Indon: "Indonesian",
  IAL_Hindi: "Hindi",
  IAL_Urdu: "Urdu",
  IAL_Punjabi: "Punjabi",
  IAL_Bengali: "Bengali",
  IAL_Nepali: "Nepali",
  IAL_Oth: "Other Indo-Aryan languages",
  Greek: "Greek",
  Italian: "Italian",
  Korean: "Korean",
  Spanish: "Spanish",
  Tamil: "Tamil",
  Thai: "Thai",
  Turkish: "Turkish",
  Vietnamese: "Vietnamese",
  Serbian: "Serbian",
};

export const MISSING = new Set(["", "null", "na", "n.a.", "n/a", "..", "...", "-", "*"]);

export function parseNum(raw) {
  const t = String(raw ?? "").trim().toLowerCase();
  if (MISSING.has(t)) return null;
  const n = Number(String(raw).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else inQuotes = false;
      } else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

export async function* csvRowStrings(readable) {
  let buf = "";
  let inQuotes = false;
  for await (const chunk of readable) {
    const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') inQuotes = !inQuotes;
      if ((c === "\n" || c === "\r") && !inQuotes) {
        if (c === "\r" && text[i + 1] === "\n") i += 1;
        if (buf.length) yield buf;
        buf = "";
        continue;
      }
      buf += c;
    }
  }
  if (buf.length) yield buf;
}

function unzipCsvStream(zipPath, entry) {
  const child = spawn("unzip", ["-p", zipPath, entry], { stdio: ["ignore", "pipe", "ignore"] });
  const done = new Promise((resolve, reject) => {
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`unzip -p failed (${code}) for ${entry}`));
    });
  });
  return { stdout: child.stdout, done };
}

export async function readCsvByCode(zipPath, entry, pick) {
  const { stdout, done } = unzipCsvStream(zipPath, entry);
  let header = null;
  const byCode = new Map();
  for await (const line of csvRowStrings(stdout)) {
    const cols = parseCsvLine(line.replace(/^\uFEFF/, ""));
    if (!header) {
      header = cols;
      continue;
    }
    const rec = Object.fromEntries(header.map((h, i) => [h, cols[i]]));
    const code = String(rec.SAL_CODE_2021 ?? "").replace(/^SAL/i, "");
    if (!code) continue;
    const prev = byCode.get(code) ?? {};
    byCode.set(code, { ...prev, ...pick(rec) });
  }
  await done;
  return byCode;
}

export function mergeMaps(maps) {
  const out = new Map();
  for (const m of maps) {
    for (const [code, row] of m) {
      out.set(code, { ...(out.get(code) ?? {}), ...row });
    }
  }
  return out;
}

/** First row of a DataPack CSV, as column names. */
export async function readCsvHeader(zipPath, entry) {
  const { stdout, done } = unzipCsvStream(zipPath, entry);
  let header = [];
  for await (const line of csvRowStrings(stdout)) {
    header = parseCsvLine(line.replace(/^\uFEFF/, ""));
    break;
  }
  stdout.destroy();
  await done.catch(() => {});
  return header;
}

/** Every file name inside the zip. */
export function listZip(zipPath) {
  const res = spawnSync("unzip", ["-Z1", zipPath], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (res.error?.code === "ENOENT") throw new Error("unzip is required to read the Census DataPack.");
  if (res.status !== 0) throw new Error(`unzip -Z1 failed for ${zipPath}`);
  return res.stdout.split(/\r?\n/).filter(Boolean);
}

export function entry(name) {
  return `${DATA_DIR}/${name}`;
}

export function labelAncestry(key) {
  return ANCESTRY_LABEL[key] ?? key.replace(/_/g, " ");
}

export function labelLang(key) {
  if (LANG_LABEL[key]) return LANG_LABEL[key];
  return key.replace(/^CL_/, "").replace(/^IAL_/, "").replace(/^SAL_/, "").replace(/_/g, " ");
}

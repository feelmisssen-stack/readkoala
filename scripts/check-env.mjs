import fs from "fs";
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;

const raw = fs.readFileSync(".env.local", "utf8");
const match = raw.match(/^STDICT_API_KEY=(.*)$/m);
const rawValue = match ? match[1] : "";
const stripped = rawValue.replace(/^["']|["']$/g, "").trim();
const fileValueLen = stripped.length;
const firstCharCode = stripped.length > 0 ? stripped.charCodeAt(0) : null;
const quoteCharCodes = rawValue.slice(0, 2).split("").map((c) => c.charCodeAt(0));

loadEnvConfig(process.cwd());
const envLen = (process.env.STDICT_API_KEY || "").trim().length;

console.log(JSON.stringify({
  hasStdictLine: !!match,
  fileValueLen,
  envValueLen: envLen,
  hasBom: fs.readFileSync(".env.local")[0] === 0xef,
  rawValueLen: rawValue.length,
  quoteCharCodes,
  firstCharCode,
}));

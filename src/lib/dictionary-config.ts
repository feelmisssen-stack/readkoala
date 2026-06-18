import fs from "fs";
import path from "path";

const CONFIG_DIR = path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(CONFIG_DIR, "dictionary-config.json");

interface DictionaryConfig {
  stdictApiKey?: string;
}

function ensureDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function readDictionaryConfig(): DictionaryConfig {
  ensureDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8")) as DictionaryConfig;
  } catch {
    return {};
  }
}

export function writeDictionaryConfig(config: DictionaryConfig) {
  ensureDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function getStdictApiKey(): string | undefined {
  const fromEnv =
    process.env.STDICT_API_KEY?.trim() || process.env.KOREAN_DICT_API_KEY?.trim();
  if (fromEnv) return fromEnv;

  const fromFile = readDictionaryConfig().stdictApiKey?.trim();
  return fromFile || undefined;
}

export function isDictionaryApiConfigured(): boolean {
  return Boolean(getStdictApiKey());
}

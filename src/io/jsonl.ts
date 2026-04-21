import fs from "node:fs";

export function writeJsonl(filePath: string, records: unknown[]): void {
  const lines = records.map((record) => JSON.stringify(record));
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

export function readJsonl<T>(filePath: string): T[] {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map((line) => JSON.parse(line) as T);
}

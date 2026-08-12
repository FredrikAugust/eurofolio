import { readdir, stat } from "node:fs/promises";
import path from "node:path";

async function filesUnder(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(entryPath) : [entryPath];
    }),
  );
  return nested.flat();
}

async function main() {
  const chunksDirectory = path.join(process.cwd(), ".next", "static", "chunks");
  const files = (await filesUnder(chunksDirectory)).filter((file) =>
    file.endsWith(".js"),
  );
  const sizes = await Promise.all(
    files.map(async (file) => ({
      file: path.relative(process.cwd(), file),
      bytes: (await stat(file)).size,
    })),
  );

  sizes.sort((left, right) => right.bytes - left.bytes);
  const total = sizes.reduce((sum, item) => sum + item.bytes, 0);
  console.log(JSON.stringify({ totalBytes: total, chunks: sizes }, null, 2));
}

void main();

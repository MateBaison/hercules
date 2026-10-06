import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";

const manifest = z
  .object({
    exercises: z.number().int(),
    files: z.array(
      z.object({
        path: z.string(),
        bytes: z.number().int(),
        sha256: z.string().length(64),
      }),
    ),
  })
  .parse(
    JSON.parse(
      await readFile("migration-baseline/manifest.json", "utf8"),
    ) as unknown,
  );
for (const file of manifest.files) {
  if (
    !/^(public|migration-baseline)\//.test(file.path) ||
    file.path.includes("..")
  )
    throw new Error("Unsafe manifest path");
  const contents = await readFile(resolve(file.path));
  const hash = createHash("sha256").update(contents).digest("hex");
  if (hash !== file.sha256 || contents.length !== file.bytes)
    throw new Error(`Baseline changed: ${file.path}`);
}
console.log(
  `Verified ${manifest.files.length} files against the preserved SHA-256 baseline.`,
);

import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";
import { z } from "zod";

// Migration tooling only. No account tokens, network Supabase calls or real user data.
if (!process.argv[2])
  throw new Error(
    "Provide the original workspace path explicitly; do not recapture a baseline from an unrelated folder.",
  );
const sourceRoot = resolve(process.argv[2]);
const published = join(sourceRoot, "site-preview/dist");
const destination = resolve("migration-baseline");
const browserPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const digest = (data: Buffer) =>
  createHash("sha256").update(data).digest("hex");
const captureSchema = z.object({
  exercises: z.array(z.record(z.string(), z.unknown())),
  muscleImages: z.record(z.string(), z.string()),
  imageVariants: z.record(z.string(), z.record(z.string(), z.string())),
  automaticPools: z.record(z.string(), z.array(z.string())),
  snapshot: z.record(z.string(), z.unknown()),
  translations: z.record(z.string(), z.unknown()),
  retired: z.array(z.string()),
});

const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    const file = resolve(
      published,
      pathname === "/" ? "index.html" : `.${pathname}`,
    );
    if (!file.startsWith(published + sep)) {
      response.writeHead(404).end();
      return;
    }
    const types: Record<string, string> = {
      ".html": "text/html",
      ".jpg": "image/jpeg",
      ".png": "image/png",
      ".svg": "image/svg+xml",
    };
    response.setHeader(
      "Content-Type",
      types[extname(file)] ?? "application/octet-stream",
    );
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise<void>((accept) => server.listen(0, "127.0.0.1", accept));
const address = server.address();
if (!address || typeof address === "string")
  throw new Error("Baseline server unavailable");
const browser = await chromium.launch({
  headless: true,
  ...(browserPath ? { executablePath: browserPath } : {}),
});
try {
  const page = await browser.newPage();
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  await page.goto(`http://127.0.0.1:${address.port}/`);
  await page.waitForSelector(".auth-layout");
  const serialized: unknown = await page.evaluate(`JSON.stringify({
    exercises: EX.map(e => ({...e, image: EXERCISE_IMAGES[e.id] || ('exercises/' + e.id + '.jpg'), tracking: isTimedExercise(e.id) ? 'seconds' : 'reps'})),
    muscleImages: MUSCLE_IMAGES,
    imageVariants: EXERCISE_IMAGE_VARIANTS,
    automaticPools: AUTO_ROUTINE_EXERCISES,
    snapshot: accountSnapshot(),
    translations: UI_TRANSLATIONS,
    retired: [...RETIRED_EXERCISES]
  })`);
  const capture = captureSchema.parse(
    JSON.parse(z.string().parse(serialized)) as unknown,
  );
  await mkdir(destination, { recursive: true });
  for (const [filename, relative] of [
    ["portable.html", "outputs/MrGymson_mobile.html"],
    ["published.html", "site-preview/dist/index.html"],
    ["supabase-setup.sql", "outputs/Configurar_Supabase_MrGymson.sql"],
  ]) {
    if (!filename || !relative) throw new Error("Invalid baseline mapping");
    await cp(join(sourceRoot, relative), join(destination, filename));
  }
  await cp(join(published, "assets"), resolve("public/assets"), {
    recursive: true,
  });
  await cp(
    join(published, "hercules.webmanifest"),
    resolve("public/hercules.webmanifest"),
  );
  await mkdir("src/data/legacy", { recursive: true });
  for (const [name, value] of Object.entries(capture)) {
    await writeFile(
      join("src/data/legacy", `${name}.json`),
      JSON.stringify(value, null, 2) + "\n",
    );
  }
  const files: Array<{ path: string; bytes: number; sha256: string }> = [];
  async function inventory(directory: string, prefix: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (prefix === "migration-baseline/" && entry.name === "manifest.json")
        continue;
      const relative = `${prefix}${entry.name}`;
      if (entry.isDirectory())
        await inventory(join(directory, entry.name), relative + "/");
      else {
        const contents = await readFile(join(directory, entry.name));
        files.push({
          path: relative,
          bytes: contents.length,
          sha256: digest(contents),
        });
      }
    }
  }
  await inventory(resolve("public"), "public/");
  await inventory(destination, "migration-baseline/");
  files.sort((a, b) => a.path.localeCompare(b.path));
  await writeFile(
    join(destination, "manifest.json"),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        exercises: capture.exercises.length,
        files,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      exercises: capture.exercises.length,
      muscleGroups: Object.keys(capture.muscleImages).length,
      hashedFiles: files.length,
      cloudRequests: 0,
    }),
  );
} finally {
  await browser.close();
  await new Promise<void>((accept, reject) =>
    server.close((error) => (error ? reject(error) : accept())),
  );
}

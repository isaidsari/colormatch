import { watch } from "fs";
import { join } from "path";

const ROOT = import.meta.dir;

async function build() {
  const result = await Bun.build({
    entrypoints: [join(ROOT, "src/script.ts")],
    outdir: join(ROOT, "dist"),
    target: "browser",
    sourcemap: "inline",
  });
  if (!result.success) {
    console.error("Build failed:");
    result.logs.forEach((l) => console.error(l));
  } else {
    console.log(`[${new Date().toLocaleTimeString()}] Built`);
  }
}

await build();

watch(join(ROOT, "src"), { recursive: true }, async (_, filename) => {
  if (filename?.endsWith(".ts")) {
    await build();
  }
});

const mime: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".ts": "application/javascript",
  ".png": "image/png",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
};

Bun.serve({
  port: 3001,
  fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname === "/" ? "/index.html" : url.pathname;
    const ext = path.slice(path.lastIndexOf("."));
    const file = Bun.file(join(ROOT, path));
    return new Response(file, {
      headers: { "Content-Type": mime[ext] ?? "text/plain" },
    });
  },
});

console.log("Dev server: http://localhost:3001");

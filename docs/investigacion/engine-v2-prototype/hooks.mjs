// Resuelve imports sin extensión y el alias "@/" del repo al correr .ts con Node.
import { existsSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
const REPO = fileURLToPath(new URL("../../../", import.meta.url));
export async function resolve(specifier, context, next) {
  let target = specifier;
  if (specifier.startsWith("@/")) target = pathToFileURL(path.join(REPO, specifier.slice(2))).href;
  const isRelative = target.startsWith("./") || target.startsWith("../");
  if ((isRelative || target.startsWith("file:")) && !path.extname(target.split("?")[0])) {
    const base = target.startsWith("file:") ? fileURLToPath(target) : fileURLToPath(new URL(target, context.parentURL));
    for (const ext of [".ts", ".tsx"]) if (existsSync(base + ext)) return next(pathToFileURL(base + ext).href, context);
  }
  return next(target, context);
}

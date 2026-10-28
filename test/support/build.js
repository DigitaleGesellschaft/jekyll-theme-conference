/**
 * Builds the fixture site once into a temporary directory
 *
 * Usage: `node test/support/build.js` prints the output directory.
 * Set BUNDLE to override the bundler command (e.g. "bundle _2.7.1_").
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const FIXTURE_DIR = join(ROOT, "test/fixture");
export const SITE_DIR = process.env.SITE_DIR || join(tmpdir(), "jekyll-theme-conference-test-site");
export const BASEURL = "/conf";

// Build warnings (stderr) per output directory
const warnings = {};

// Build the fixture, optionally with an extra config file overriding
// settings, e.g. buildSite("_config.style-full.yml") -> <SITE_DIR>-style-full
export function buildSite(extraConfig) {
  const variant = extraConfig ? `-${extraConfig.replace(/^_config\.|\.yml$/g, "")}` : "";
  const siteDir = SITE_DIR + variant;
  const configs = ["_config.yml", extraConfig].filter(Boolean).join(",");
  mkdirSync(siteDir, { recursive: true });

  // Build in UTC to prove timestamps do not depend on the build machine
  const [cmd, ...args] = (process.env.BUNDLE || "bundle").split(" ");
  const { status, stderr } = spawnSync(
    cmd,
    [...args, "exec", "jekyll", "build", "--quiet", "--disable-disk-cache", "--config", configs, "--destination", siteDir],
    { cwd: FIXTURE_DIR, env: { ...process.env, TZ: "UTC", JEKYLL_ENV: "production" }, stdio: ["ignore", "ignore", "pipe"], encoding: "utf8" },
  );
  process.stderr.write(stderr);
  warnings[siteDir] = stderr;

  if (status !== 0) {
    throw new Error(`Build failed with status ${status}`);
  }

  if (!existsSync(join(siteDir, "index.html"))) {
    throw new Error(`Build produced no index.html in ${siteDir}`);
  }
  return siteDir;
}

export function buildWarnings(siteDir) {
  return warnings[siteDir];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(buildSite());
}

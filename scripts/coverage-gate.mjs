#!/usr/bin/env node
// Coverage of the lines a PR changed, not of the whole codebase.
//
//   coverage-gate.mjs --base <ref>    Diff HEAD against <ref> (default: $GITHUB_BASE_REF or main)
//   coverage-gate.mjs --diff <file>   Use a unified diff from a file instead of git
//   coverage-gate.mjs --report <path> Coverage report (default: iggy.config.json coverageReport,
//                                     else coverage/lcov.info, coverage.xml or cover.out)
//
// Reads lcov (JS/TS), Cobertura XML (pytest-cov) and Go cover profiles.
// production mode: fails below thresholds.changedLineCoverage, or when nothing
// was measured. prototype mode: reports the same numbers and never fails.

import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
import { StateError, isTestFile, isUnderSourceDirs, loadConfig, projectDir } from "../hooks/lib/vibe-state.mjs";

const DEFAULT_REPORTS = ["coverage/lcov.info", "coverage.xml", "cover.out"];
const SOURCE_EXTENSIONS = { node: /\.[cm]?[jt]sx?$/, python: /\.py$/, go: /\.go$/ };

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function toProjectPath(path) {
  const clean = path.trim().replace(/\\/g, "/");
  return (isAbsolute(clean) ? relative(projectDir(), clean) : clean).replace(/^\.\//, "");
}

// git quotes unusual paths C-style: "b/caf\303\251.js". Undo that.
function unquoteGitPath(path) {
  if (!path.startsWith('"')) return path;
  const bytes = [];
  const body = path.slice(1, -1);
  for (let i = 0; i < body.length; i++) {
    if (body[i] !== "\\") {
      bytes.push(...Buffer.from(body[i]));
      continue;
    }
    const next = body[++i];
    if (/[0-7]/.test(next)) {
      bytes.push(parseInt(body.slice(i, i + 3), 8));
      i += 2;
    } else {
      bytes.push(({ n: 10, t: 9, '"': 34, "\\": 92 })[next] ?? next.charCodeAt(0));
    }
  }
  return Buffer.from(bytes).toString("utf8");
}

// --- Changed lines ------------------------------------------------------------

export function changedLines(diff) {
  const changed = new Map();
  let file = null;
  let line = 0;
  let previous = "";
  for (const raw of diff.split("\n")) {
    const text = raw.replace(/\r$/, "");
    // A file header is "+++ " right after "--- ". Anywhere else it's an added
    // line whose content starts with "++ ".
    const isHeader = text.startsWith("+++ ") && previous.startsWith("--- ");
    previous = text;
    if (isHeader) {
      const target = unquoteGitPath(text.slice(4).trim());
      file = target === "/dev/null" ? null : target.replace(/^b\//, "");
      if (file && !changed.has(file)) changed.set(file, new Set());
      continue;
    }
    if (text.startsWith("--- ") && !file) continue;
    const hunk = text.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      line = Number(hunk[1]);
      continue;
    }
    if (text.startsWith("diff --git ")) {
      file = null;
      continue;
    }
    if (!file) continue;
    if (text.startsWith("+")) changed.get(file).add(line++);
    else if (!text.startsWith("-") && !text.startsWith("\\")) line++;
  }
  return changed;
}

function git(args) {
  return execFileSync("git", args, { cwd: projectDir(), encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
}

// An all-zero base is what GitHub sends for a branch's first push: compare
// against the empty tree, so every line counts as changed.
function gitDiff(base) {
  try {
    if (/^0+$/.test(base)) {
      const emptyTree = git(["hash-object", "-t", "tree", "/dev/null"]).trim();
      return git(["diff", "--unified=0", "--no-color", emptyTree, "HEAD"]);
    }
    return git(["diff", "--unified=0", "--no-color", `${base}...HEAD`]);
  } catch (error) {
    const reason = String(error.stderr || error.message).split("\n").find(Boolean) ?? "unknown error";
    throw new StateError(`couldn't diff against ${base}: ${reason}`);
  }
}

// Diff paths start at the repository root. When the project lives in a
// subfolder (a monorepo), strip that prefix and drop files outside it.
function relativeToProjectDir(changed) {
  let prefix = "";
  try {
    prefix = execFileSync("git", ["rev-parse", "--show-prefix"], { cwd: projectDir(), encoding: "utf8" }).trim();
  } catch {
    return changed;
  }
  if (!prefix) return changed;
  const scoped = new Map();
  for (const [file, lines] of changed) {
    if (file.startsWith(prefix)) scoped.set(file.slice(prefix.length), lines);
  }
  return scoped;
}

// --- Coverage reports: file -> Map(line -> hits) ---------------------------------

function parseLcov(text) {
  const coverage = new Map();
  let lines = null;
  for (const row of text.split("\n")) {
    if (row.startsWith("SF:")) {
      lines = new Map();
      coverage.set(toProjectPath(row.slice(3)), lines);
    } else if (row.startsWith("DA:") && lines) {
      const [number, hits] = row.slice(3).split(",");
      lines.set(Number(number), Number(hits));
    }
  }
  return coverage;
}

// Cobertura file names are relative to one of the <source> folders. Pick the
// source under which the file exists; otherwise keep the name as written.
function coberturaPath(filename, sources) {
  for (const source of sources) {
    const candidate = toProjectPath(join(source, filename));
    if (!candidate.startsWith("..") && existsSync(join(projectDir(), candidate))) return candidate;
  }
  return toProjectPath(filename);
}

function parseCobertura(text) {
  const coverage = new Map();
  const sources = [...text.matchAll(/<source>([^<]*)<\/source>/g)].map((m) => m[1].trim()).filter(Boolean);
  for (const match of text.matchAll(/<class\b[^>]*\bfilename="([^"]+)"[^>]*>([\s\S]*?)<\/class>/g)) {
    const file = coberturaPath(match[1], sources);
    const lines = coverage.get(file) ?? new Map();
    for (const line of match[2].matchAll(/<line\b[^>]*\bnumber="(\d+)"[^>]*\bhits="(\d+)"/g)) {
      lines.set(Number(line[1]), Number(line[2]));
    }
    coverage.set(file, lines);
  }
  return coverage;
}

function goModulePath() {
  const goMod = join(projectDir(), "go.mod");
  if (!existsSync(goMod)) return null;
  return readFileSync(goMod, "utf8").match(/^module\s+(\S+)/m)?.[1] ?? null;
}

function parseGoCover(text) {
  const coverage = new Map();
  const module = goModulePath();
  for (const row of text.split("\n").slice(1)) {
    const match = row.match(/^(.+):(\d+)\.\d+,(\d+)\.\d+ \d+ (\d+)$/);
    if (!match) continue;
    let file = match[1];
    if (module && file.startsWith(module + "/")) file = file.slice(module.length + 1);
    const lines = coverage.get(file) ?? new Map();
    for (let line = Number(match[2]); line <= Number(match[3]); line++) {
      lines.set(line, Math.max(lines.get(line) ?? 0, Number(match[4])));
    }
    coverage.set(file, lines);
  }
  return coverage;
}

function loadCoverage(reportPath) {
  const text = readFileSync(reportPath, "utf8");
  if (text.startsWith("mode:")) return parseGoCover(text);
  if (text.includes("<coverage")) return parseCobertura(text);
  return parseLcov(text);
}

// --- Gate ----------------------------------------------------------------------

function percent(covered, total) {
  return `${Number(((covered / total) * 100).toFixed(1))}%`;
}

// Changed lines in a source file that no test loaded. Coverage tools leave such
// files out of the report, so without this a brand-new untested module would
// pass. Blank lines aren't counted.
function unmeasuredLines(file, lines) {
  const path = join(projectDir(), file);
  if (!existsSync(path)) return [];
  const content = readFileSync(path, "utf8").split("\n");
  return [...lines].filter((line) => (content[line - 1] ?? "").trim() !== "");
}

export function measure(changed, coverage, isSource = () => false) {
  const files = [];
  for (const [file, lines] of changed) {
    const measured = coverage.get(file);
    if (!measured) {
      if (!isSource(file)) continue;
      const missing = unmeasuredLines(file, lines);
      if (missing.length) files.push({ file, covered: 0, total: missing.length, note: "not in the coverage report" });
      continue;
    }
    const relevant = [...lines].filter((line) => measured.has(line));
    if (!relevant.length) continue;
    const covered = relevant.filter((line) => measured.get(line) > 0).length;
    files.push({ file, covered, total: relevant.length });
  }
  const covered = files.reduce((sum, f) => sum + f.covered, 0);
  const total = files.reduce((sum, f) => sum + f.total, 0);
  return { files, covered, total };
}

function report(lines) {
  console.log(lines.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n\n");
}

function main() {
  const config = loadConfig();
  const enforce = config.mode === "production";
  const threshold = config.thresholds.changedLineCoverage;
  const verdict = (failed) => (failed && enforce ? 1 : 0);

  const reportArg = argument("--report") ?? config.coverageReport;
  const reportPath = [reportArg, ...DEFAULT_REPORTS].filter(Boolean).map((p) => join(projectDir(), p)).find(existsSync);
  if (!reportPath) {
    report([
      "### Changed-line coverage: not measured",
      "",
      `No coverage report found (looked for ${[reportArg, ...DEFAULT_REPORTS].filter(Boolean).join(", ")}).`,
      enforce ? "Production mode needs one: run the coverage command so it writes lcov, Cobertura XML or a Go cover profile." : "Prototype mode: reported only.",
    ]);
    return verdict(true);
  }

  const diffFile = argument("--diff");
  const base = argument("--base") || (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "main");
  const diff = diffFile ? readFileSync(diffFile, "utf8") : gitDiff(base);
  const extension = SOURCE_EXTENSIONS[config.language];
  const isSource = (file) => extension.test(file) && isUnderSourceDirs(file, config.sourceDirs) && !isTestFile(file);
  const { files, covered, total } = measure(relativeToProjectDir(changedLines(diff)), loadCoverage(reportPath), isSource);

  if (!total) {
    report(["### Changed-line coverage", "", "No changed lines appear in the coverage report, so there's nothing to measure."]);
    return 0;
  }

  const overall = (covered / total) * 100;
  const failed = overall < threshold;
  report([
    `### Changed-line coverage: ${percent(covered, total)} (${covered}/${total} lines, threshold ${threshold}%)`,
    "",
    "| File | Changed lines covered | |",
    "|------|------|---|",
    ...files.map((f) => `| ${f.file} | ${percent(f.covered, f.total)} (${f.covered}/${f.total}) | ${[f.note, (f.covered / f.total) * 100 < threshold ? "below threshold" : ""].filter(Boolean).join(", ")} |`),
    "",
    failed ? (enforce ? `FAILED: below ${threshold}%.` : `Below ${threshold}%. Prototype mode: reported only.`) : "PASSED",
  ]);
  return verdict(failed);
}

try {
  process.exitCode = main();
} catch (error) {
  if (!(error instanceof StateError)) throw error;
  console.error(`coverage-gate: ${error.message}`);
  process.exitCode = 1;
}

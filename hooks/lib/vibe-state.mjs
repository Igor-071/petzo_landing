// Shared workflow state for the Iggy hooks and scripts/vibe.mjs.
// Zero dependencies, Node 18+.
//
//   .vibe/state.json       What Claude proposes (via scripts/vibe.mjs)
//   .vibe/approvals.json   What the user confirmed (only hooks/record-approval.mjs writes it)
//   .vibe/overrides.jsonl  One-time overrides the user granted (only the hooks write it)
//   .vibe/test-log.jsonl   Test and lint runs (only scripts/vibe.mjs test|lint writes it)

import { createHash, randomUUID } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, sep } from "node:path";

export const TIERS = ["MINIMAL", "LIGHT", "STANDARD", "FULL", "EMERGENCY"];
export const GATED_TIERS = ["STANDARD", "FULL"];
export const STATE_VERSION = 4;
export const HISTORY_LIMIT = 20;

export const MODES = ["prototype", "production"];
export const LANGUAGES = ["node", "python", "go"];
export const COMMAND_NAMES = ["dev", "test", "coverage", "lint", "lintFix", "typecheck", "build", "e2e", "audit"];

// Node commands use the package manager the lockfile implies.
export function detectPackageManager() {
  const has = (file) => existsSync(join(projectDir(), file));
  if (has("pnpm-lock.yaml")) return "pnpm";
  if (has("yarn.lock")) return "yarn";
  if (has("bun.lock") || has("bun.lockb")) return "bun";
  return "npm";
}

// Audits we know how to run per package manager. yarn and bun differ by
// version, so they're left for the project to set in commands.audit.
const NODE_AUDIT = {
  npm: "npm audit --omit=dev --audit-level=high",
  pnpm: "pnpm audit --prod --audit-level high",
  yarn: null,
  bun: null,
};
const NODE_EXEC = { npm: "npx", pnpm: "pnpm exec", yarn: "yarn", bun: "bunx" };

function nodeCommands(pm) {
  const run = (script) => `${pm} run ${script}`;
  return {
    dev: run("dev"),
    test: run("test"),
    coverage: run("test:coverage"),
    lint: run("lint"),
    lintFix: run("lint:fix"),
    typecheck: run("typecheck"),
    build: run("build"),
    e2e: `${NODE_EXEC[pm]} playwright test`,
    audit: NODE_AUDIT[pm],
  };
}

// pip-audit can read a project (pyproject.toml) or a requirements file.
function pythonAudit() {
  const has = (file) => existsSync(join(projectDir(), file));
  if (!has("pyproject.toml") && !has("setup.py") && has("requirements.txt")) return "pip-audit -r requirements.txt";
  return "pip-audit .";
}

// What each language gets when iggy.config.json leaves a field out.
function languageDefaults(language) {
  if (language === "python") {
    return {
      sourceDirs: ["src", "app"],
      commands: {
        dev: null,
        test: "python -m pytest",
        coverage: "python -m pytest --cov --cov-report=xml",
        lint: "ruff check .",
        lintFix: "ruff check --fix .",
        typecheck: null,
        build: null,
        e2e: null,
        audit: pythonAudit(),
      },
    };
  }
  if (language === "go") {
    return {
      sourceDirs: ["cmd", "internal", "pkg"],
      commands: {
        dev: null,
        test: "go test ./...",
        coverage: "go test -coverprofile=cover.out ./...",
        lint: "golangci-lint run",
        lintFix: "golangci-lint run --fix",
        typecheck: "go vet ./...",
        build: "go build ./...",
        e2e: null,
        audit: "govulncheck ./...",
      },
    };
  }
  return { sourceDirs: ["src", "app", "lib", "components", "pages"], commands: nodeCommands(detectPackageManager()) };
}

const DEFAULT_THRESHOLDS = { changedLineCoverage: 80, lighthousePerformance: 90 };

export class StateError extends Error {}

export function projectDir() {
  return process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

function vibePath(name) {
  return join(projectDir(), ".vibe", name);
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new StateError(`${relative(projectDir(), path)} is not valid JSON. Fix or delete it, then try again.`);
  }
}

function writeJson(path, value) {
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
  } catch (error) {
    throw new StateError(`Could not write ${relative(projectDir(), path)}: ${error.message}. Check .vibe/ permissions.`);
  }
}

function readJsonLines(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

function appendJsonLine(path, value) {
  try {
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, JSON.stringify(value) + "\n");
  } catch (error) {
    throw new StateError(`Could not append to ${relative(projectDir(), path)}: ${error.message}. Check .vibe/ permissions.`);
  }
}

// --- Config ------------------------------------------------------------------

export function loadRawConfig() {
  return readJson(join(projectDir(), "iggy.config.json"), {});
}

// The user's iggy.config.json over the defaults for its language. A command
// set to null is turned off; a command left out gets the language default.
export function loadConfig() {
  const user = loadRawConfig();
  const language = LANGUAGES.includes(user.language) ? user.language : "node";
  const defaults = languageDefaults(language);
  return {
    mode: "prototype",
    enforcement: "strict",
    ...user,
    language,
    packageManager: language === "node" ? detectPackageManager() : null,
    sourceDirs: user.sourceDirs ?? defaults.sourceDirs,
    commands: { ...defaults.commands, ...(user.commands || {}) },
    web: user.web ?? null,
    thresholds: { ...DEFAULT_THRESHOLDS, ...(user.thresholds || {}) },
  };
}

// Why a configured command can't run, or null when it can. "npm run lint" with
// no lint script in package.json is a skip, not a pass (and not a failure that
// would count as the RED run).
export function missingCommandReason(command) {
  if (!command) return "not configured";
  const match = command.match(/^(?:npm|pnpm|yarn|bun)(?:\s+run)?\s+([\w:.-]+)(?:\s+--(?:\s.*)?)?\s*$/);
  if (!match) return null;
  const packageJson = join(projectDir(), "package.json");
  if (!existsSync(packageJson)) return "no package.json";
  let scripts;
  try {
    scripts = JSON.parse(readFileSync(packageJson, "utf8")).scripts || {};
  } catch {
    throw new StateError("package.json is not valid JSON, so its scripts can't be checked.");
  }
  return scripts[match[1]] ? null : `no "${match[1]}" script in package.json`;
}

// A small JSON Schema subset: type, enum, required, properties, items,
// maxItems, pattern, minimum, maximum.
export function schemaErrors(value, schema, path = "value") {
  const errors = [];
  const types = [].concat(schema.type || []);
  const actual = value === null ? "null" : Array.isArray(value) ? "array" : Number.isInteger(value) ? "integer" : typeof value;
  if (types.length && !types.includes(actual) && !(actual === "integer" && types.includes("number"))) {
    return [`${path} should be ${types.join(" or ")}`];
  }
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path} should be one of ${schema.enum.join(", ")}`);
  if (schema.pattern && typeof value === "string" && !new RegExp(schema.pattern).test(value)) {
    errors.push(`${path} doesn't match ${schema.pattern}`);
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path} should be at least ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path} should be at most ${schema.maximum}`);
  }
  if (actual === "object") {
    for (const key of schema.required || []) if (!(key in value)) errors.push(`${path}.${key} is required`);
    for (const [key, sub] of Object.entries(schema.properties || {})) {
      if (key in value) errors.push(...schemaErrors(value[key], sub, `${path}.${key}`));
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in (schema.properties || {}))) errors.push(`${path}.${key} is not a known setting`);
      }
    }
  }
  if (actual === "array") {
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path} has more than ${schema.maxItems} items`);
    if (schema.items) value.forEach((item, i) => errors.push(...schemaErrors(item, schema.items, `${path}[${i}]`)));
  }
  return errors;
}

// --- State (Claude's proposals) ------------------------------------------------

export function loadState() {
  const state = readJson(vibePath("state.json"), { version: STATE_VERSION, active: null, history: [] });
  // v3 state files used "version": "3.0" and may lack fields; carry them forward.
  return { active: null, history: [], ...state, version: STATE_VERSION };
}

export function saveState(state) {
  writeJson(vibePath("state.json"), state);
}

// --- Approvals and overrides (the user's decisions) ----------------------------

export function loadApprovals() {
  const approvals = readJson(vibePath("approvals.json"), []);
  return Array.isArray(approvals) ? approvals : [];
}

export function appendApproval(approval) {
  writeJson(vibePath("approvals.json"), [...loadApprovals(), approval]);
}

// Each workflow run gets its own id, so restarting a feature with the same
// name never inherits old approvals, overrides or test runs.
export function newRunId() {
  return randomUUID();
}

export function runIdOf(active) {
  return active.runId ?? `${active.feature}@${active.startedAt}`;
}

export function approvalsFor(active) {
  const runId = runIdOf(active);
  return loadApprovals().filter((approval) => approval.runId === runId);
}

// Only an approval given while the tier was being proposed confirms a tier.
// Approving the spec or the code later says nothing about the tier.
export function confirmedTier(active) {
  return approvalsFor(active).filter((approval) => approval.phase === "tier_proposed").pop()?.tier ?? null;
}

export function loadOverrides() {
  return readJsonLines(vibePath("overrides.jsonl"));
}

export function appendOverride(override) {
  appendJsonLine(vibePath("overrides.jsonl"), override);
}

// Marks the oldest unused override for this feature as used and returns it.
export function consumeOverride(active) {
  const runId = runIdOf(active);
  const overrides = loadOverrides();
  const index = overrides.findIndex((override) => override.runId === runId && !override.used);
  if (index === -1) return null;
  overrides[index] = { ...overrides[index], used: true, usedAt: Date.now() };
  try {
    writeFileSync(vibePath("overrides.jsonl"), overrides.map((o) => JSON.stringify(o)).join("\n") + "\n");
  } catch {
    return null;
  }
  return overrides[index];
}

// --- Test log --------------------------------------------------------------------

export function loadTestLog() {
  return readJsonLines(vibePath("test-log.jsonl"));
}

export function testRunsFor(active) {
  const runId = runIdOf(active);
  return loadTestLog().filter((run) => run.runId === runId);
}

export function appendTestRun(run) {
  appendJsonLine(vibePath("test-log.jsonl"), run);
}

// --- Helpers ---------------------------------------------------------------------

// The spec text the approval covers: everything except the Traceability matrix
// (filled in during /implement) and a section titled exactly "Notes" (free for
// small edits). Each skipped section runs to the next heading of the same or a
// higher level. Goals, non-goals, design, security and the test plan all stay
// covered, so changing any of them needs a new approval.
function isFreeSection(title) {
  return /traceability/i.test(title) || /^notes$/i.test(title.replace(/^[\d.]+\s*/, ""));
}

export function approvedSpecText(text) {
  const lines = text.split("\n");
  const kept = [];
  let skipLevel = 0;
  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.*?)\s*$/);
    if (skipLevel && heading && heading[1].length <= skipLevel) skipLevel = 0;
    if (!skipLevel && heading && isFreeSection(heading[2])) skipLevel = heading[1].length;
    if (!skipLevel) kept.push(line);
  }
  return kept.join("\n");
}

// True when the spec has at least one acceptance criterion (AC-001 as a
// heading, bold or at the start of a line).
export function hasAcceptanceCriteria(text) {
  return /^[ \t>]*(#{1,6}[ \t]*|\*\*|__)?AC-\d+/im.test(text);
}

export function specHash(path) {
  const absolute = isAbsolute(path) ? path : join(projectDir(), path);
  if (!existsSync(absolute)) return null;
  try {
    return createHash("sha256").update(approvedSpecText(readFileSync(absolute, "utf8"))).digest("hex");
  } catch {
    return null;
  }
}

// Resolves symlinks in the deepest existing parent, so a path reached through
// a symlink is checked against where it really lives.
function realPath(absolute) {
  let existing = absolute;
  const rest = [];
  while (!existsSync(existing) && dirname(existing) !== existing) {
    rest.unshift(existing.slice(dirname(existing).length + 1));
    existing = dirname(existing);
  }
  try {
    return join(realpathSync(existing), ...rest);
  } catch {
    return absolute;
  }
}

export function relativeToProject(path) {
  const absolute = isAbsolute(path) ? path : join(projectDir(), path);
  let root = projectDir();
  try {
    root = realpathSync(root);
  } catch {
    // Project dir missing: compare unresolved paths.
  }
  return relative(root, realPath(absolute)).split(sep).join("/");
}

const TEST_FILE_PATTERNS = [
  /(^|\/)(__tests__|tests?|spec)\//,
  /\.(test|spec)\.[cm]?[jt]sx?$/,
  /_test\.(go|py|rb|exs?|dart)$/,
  /(^|\/)test_[^/]+\.py$/,
  /_spec\.rb$/,
  /Tests?\.(java|kt|cs|swift|scala)$/,
];

export function isTestFile(path) {
  return TEST_FILE_PATTERNS.some((pattern) => pattern.test(path));
}

// --- Evidence trail ---------------------------------------------------------------

export function generateEvidence(active) {
  const runId = runIdOf(active);
  const approvals = loadApprovals().filter((a) => a.runId === runId);
  const runs = loadTestLog().filter((r) => r.runId === runId);
  const overrides = loadOverrides().filter((o) => o.runId === runId);
  const ts = (ms) => new Date(ms).toISOString();

  const lines = [];
  lines.push(`# Evidence: ${active.feature}`);
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("|-------|-------|");
  lines.push(`| Feature | ${active.feature} |`);
  lines.push(`| Tier | ${active.tier} |`);
  lines.push(`| Started | ${active.startedAt} |`);
  lines.push(`| Ended | ${new Date().toISOString()} |`);
  lines.push("");

  if (approvals.length) {
    lines.push("## Approvals");
    lines.push("");
    lines.push("| Phase | Timestamp |");
    lines.push("|-------|-----------|");
    for (const a of approvals) lines.push(`| ${a.phase} | ${ts(a.at)} |`);
    lines.push("");
  }

  if (runs.length) {
    const passed = runs.filter((r) => !r.skipped && r.exit === 0).length;
    const failed = runs.filter((r) => !r.skipped && r.exit !== 0).length;
    const skipped = runs.filter((r) => r.skipped).length;
    lines.push("## Test & Lint Runs");
    lines.push("");
    lines.push(`Summary: ${passed} passed, ${failed} failed, ${skipped} skipped`);
    lines.push("");
    lines.push("| Kind | Command | Exit | Timestamp |");
    lines.push("|------|---------|------|-----------|");
    for (const r of runs) {
      const exit = r.skipped ? "skipped" : String(r.exit);
      lines.push(`| ${r.kind} | ${r.command} | ${exit} | ${ts(r.at)} |`);
    }
    lines.push("");
  }

  if (overrides.length) {
    lines.push("## Overrides");
    lines.push("");
    lines.push("| Reason | Consumed |");
    lines.push("|--------|----------|");
    for (const o of overrides) lines.push(`| ${o.reason} | ${o.used ? "yes" : "no"} |`);
    lines.push("");
  }

  return lines.join("\n");
}

export function writeEvidence(active) {
  try {
    const content = generateEvidence(active);
    const dir = join(projectDir(), "docs", "evidence", active.feature);
    mkdirSync(dir, { recursive: true });
    const path = join(dir, "summary.md");
    writeFileSync(path, content + "\n");
    return `docs/evidence/${active.feature}/summary.md`;
  } catch {
    return null;
  }
}

// macOS and Windows file systems are usually case-insensitive.
const CASE_INSENSITIVE = process.platform === "darwin" || process.platform === "win32";

export function isUnderSourceDirs(path, sourceDirs) {
  if (path.startsWith("..")) return false;
  const fold = (value) => (CASE_INSENSITIVE ? value.toLowerCase() : value);
  return sourceDirs.some((dir) => {
    const clean = fold(dir.replace(/\/+$/, ""));
    return fold(path) === clean || fold(path).startsWith(clean + "/");
  });
}

// Lighthouse CI (gate 6, production mode). URLs, the start command and the
// performance budget come from iggy.config.json.
const { readFileSync } = require("node:fs");

const iggy = JSON.parse(readFileSync("iggy.config.json", "utf8"));
if (!iggy.web) throw new Error('iggy.config.json needs a "web" section to run Lighthouse');

const base = iggy.web.url.replace(/\/+$/, "");
// "about" and "/about" mean the same route.
const routes = (iggy.web.routes?.length ? iggy.web.routes : ["/"]).map((route) => "/" + route.replace(/^\/+/, ""));
const minPerformance = (iggy.thresholds?.lighthousePerformance ?? 90) / 100;

module.exports = {
  ci: {
    collect: {
      url: routes.map((route) => base + route),
      startServerCommand: iggy.web.startCommand,
      // Waits for the server's own "ready" line (Next.js, Vite, Express...), not npm's banner.
      startServerReadyPattern: "[Rr]eady|[Ll]istening|[Ll]ocal:|localhost:|127\\.0\\.0\\.1:",
      startServerReadyTimeout: 120000,
      numberOfRuns: 3,
      settings: { chromeFlags: "--no-sandbox --headless=new" },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: minPerformance, aggregationMethod: "median-run" }],
        "categories:accessibility": ["warn", { minScore: 0.9 }],
        "first-contentful-paint": ["warn", { maxNumericValue: 1500 }],
      },
    },
    upload: { target: "filesystem", outputDir: "lighthouse-report" },
  },
};

// Gate 7 (accessibility): axe-core on every route. Serious and critical
// WCAG 2.1 A/AA violations fail; the full results are attached to the report.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { routes } from "./routes";

for (const route of routes) {
  test(`${route} has no serious accessibility violations @a11y`, async ({ page }, testInfo) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    await testInfo.attach("axe-results.json", { body: JSON.stringify(results.violations, null, 2), contentType: "application/json" });

    const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    const summary = blocking.map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} element(s)`);
    expect(summary, `Accessibility violations on ${route}:\n${summary.join("\n")}`).toEqual([]);
  });
}

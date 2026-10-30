// Gate 4 (responsive) and 4b (visual): every route at every breakpoint.
import { expect, test } from "@playwright/test";
import { breakpoints, routes } from "./routes";

for (const route of routes) {
  for (const width of breakpoints.responsive) {
    test(`${route} has no horizontal scroll at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `page is ${overflow}px wider than the ${width}px viewport`).toBeLessThanOrEqual(0);

      if (breakpoints.screenshots.includes(width)) {
        await testInfo.attach(`${route} at ${width}px`, {
          body: await page.screenshot({ fullPage: true }),
          contentType: "image/png",
        });
      }
    });
  }
}

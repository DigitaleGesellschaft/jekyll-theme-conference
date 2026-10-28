/**
 * Shared Playwright helpers
 */
const LOCAL_ORIGIN = "http://127.0.0.1";

// Abort third-party requests (keeps tests offline and privacy-checkable)
// and collect them together with console errors and failed local requests
export async function track(page) {
  const log = { external: [], errors: [], failed: [] };

  await page.route((url) => !url.href.startsWith(LOCAL_ORIGIN), (route) => {
    log.external.push(route.request().url());
    return route.abort();
  });
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("ERR_FAILED")) {
      log.errors.push(msg.text());
    }
  });
  page.on("pageerror", (error) => log.errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().startsWith(LOCAL_ORIGIN) && response.status() >= 400) {
      log.failed.push(`${response.status()} ${response.url()}`);
    }
  });

  return log;
}

export const ready = (page) => page.evaluate(() => window.conference.awaitReady());

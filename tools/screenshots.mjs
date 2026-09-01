import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "store", "screens");
const baseUrl = process.env.MOSAELIA_URL || "http://mosaelia.loc/?shot=1";

const scenes = ["menu", "howto", "play", "win", "gallery"];

const targets = [
    {
        prefix: "mobile",
        size: { width: 1080, height: 1920 },
        css: `
            :root { --phone-w: 100% !important; }
            html, body, #app { width: 100% !important; height: 100% !important; }
            #app { --tile: clamp(48px, 9cqi, 76px); }
            .frame { width: min(92%, 430px) !important; }
            .toast, #ad-overlay { display: none !important; }
        `
    },
    {
        prefix: "desktop",
        size: { width: 1920, height: 1080 },
        css: `
            .toast, #ad-overlay { display: none !important; }
        `
    }
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();

try {
    for (const target of targets) {
        const page = await browser.newPage({
            viewport: target.size,
            deviceScaleFactor: 1
        });
        await page.goto(baseUrl, { waitUntil: "networkidle" });
        await page.waitForFunction(() => window.__mosaeliaShot);
        await page.addStyleTag({ content: target.css });

        for (const scene of scenes) {
            await page.evaluate((name) => window.__mosaeliaShot[name](), scene);
            await page.waitForTimeout(400);
            const file = path.join(outDir, `${target.prefix}-${scene}.png`);
            await page.screenshot({ path: file, type: "png" });
            console.log(file);
        }
        await page.close();
    }
} finally {
    await browser.close();
}

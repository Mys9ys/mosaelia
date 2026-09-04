import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "store", "screens");
const baseUrl = process.env.MOSAELIA_URL || "http://mosaelia.loc/?shot=1";

const scenes = ["menu", "howto", "play", "win", "gallery", "gallery2"];

const fillPhone = `
    :root { --phone-w: 100% !important; }
    html, body, #app { width: 100% !important; height: 100% !important; }
    #app { --tile: clamp(48px, 9cqi, 76px); }
    .frame { width: min(92%, 430px) !important; }
    .toast, #ad-overlay { display: none !important; }
`;

const scale = 1920 / 1080;
const visibleH = 1080 / scale;

/** Top of the 16:9 window, in CSS pixels of the 1080×1920 phone. */
const desktopShiftY = {
    menu: 520,
    howto: 220,
    play: 120,
    win: 640,
    gallery: 80,
    gallery2: 80
};

function desktopCss(shiftY) {
    return `
        .toast, #ad-overlay { display: none !important; }
        html, body {
            width: 1920px !important;
            height: 1080px !important;
            overflow: hidden !important;
            background: #f6efe4 !important;
        }
        body { display: block !important; place-items: unset !important; }
        #app {
            --phone-w: 1080px;
            --tile: clamp(48px, 9cqi, 76px);
            width: 1080px !important;
            height: 1920px !important;
            position: fixed !important;
            left: 50% !important;
            margin: 0 0 0 -540px !important;
            top: 0 !important;
            border-radius: 0 !important;
            border: none !important;
            box-shadow: none !important;
            transform: translateY(${-shiftY * scale}px) scale(${scale}) !important;
            transform-origin: top center !important;
        }
        .frame { width: min(88%, 900px) !important; }
    `;
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();

try {
    const mobile = await browser.newPage({
        viewport: { width: 1080, height: 1920 },
        deviceScaleFactor: 1
    });
    await mobile.goto(baseUrl, { waitUntil: "networkidle" });
    await mobile.waitForFunction(() => window.__mosaeliaShot);
    await mobile.addStyleTag({ content: fillPhone });

    for (const scene of scenes) {
        await mobile.evaluate((name) => window.__mosaeliaShot[name](), scene);
        await mobile.waitForTimeout(400);
        const file = path.join(outDir, `mobile-${scene}.png`);
        await mobile.screenshot({ path: file, type: "png" });
        console.log(file);
    }
    await mobile.close();

    const desktop = await browser.newPage({
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1
    });
    await desktop.goto(baseUrl, { waitUntil: "networkidle" });
    await desktop.waitForFunction(() => window.__mosaeliaShot);

    for (const scene of scenes) {
        const shiftY = Math.min(desktopShiftY[scene] ?? 80, 1920 - visibleH);
        await desktop.evaluate((name) => window.__mosaeliaShot[name](), scene);
        await desktop.addStyleTag({ content: desktopCss(shiftY) });
        await desktop.waitForTimeout(400);
        const file = path.join(outDir, `desktop-${scene}.png`);
        await desktop.screenshot({ path: file, type: "png" });
        console.log(file);
        await desktop.reload({ waitUntil: "networkidle" });
        await desktop.waitForFunction(() => window.__mosaeliaShot);
    }
    await desktop.close();
} finally {
    await browser.close();
}

import path from "node:path";
import { chromium } from "playwright";

const root = "http://mosaelia.loc/docs/store/icon-512.png";
const browser = await chromium.launch();
const sizes = [
    { file: "img/favicon.png", size: 32 },
    { file: "img/apple-touch-icon.png", size: 180 }
];

try {
    for (const { file, size } of sizes) {
        const page = await browser.newPage({
            viewport: { width: size, height: size },
            deviceScaleFactor: 1
        });
        await page.setContent(
            `<html><body style="margin:0;background:#f6efe4">
              <img src="${root}" width="${size}" height="${size}" alt="">
            </body></html>`
        );
        await page.waitForSelector("img");
        await page.screenshot({ path: file, type: "png", omitBackground: false });
        await page.close();
        console.log(file);
    }
} finally {
    await browser.close();
}

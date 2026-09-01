import { createStub } from "./stub.js";
import { createYandex } from "./yandex.js";
import { createVk } from "./vk.js";

export function detectPlatform() {
    const query = new URLSearchParams(location.search);
    const forced = query.get("platform");
    if (forced === "yandex" || forced === "vk" || forced === "stub") return forced;
    if (query.has("vk_user_id") || query.has("vk_app_id") || query.has("sign")) return "vk";
    const host = location.hostname;
    if (
        host.includes("yandex") ||
        host.includes("yagames") ||
        host.includes("playhop")
    ) {
        return "yandex";
    }
    return "stub";
}

export async function createPlatform() {
    const id = detectPlatform();
    const platform = id === "yandex" ? createYandex() : id === "vk" ? createVk() : createStub();
    await platform.init();
    return platform;
}

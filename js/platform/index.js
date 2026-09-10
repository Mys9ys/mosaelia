export function detectPlatform() {
    const query = new URLSearchParams(location.search);
    const forced = query.get("platform");
    if (forced === "yandex" || forced === "vk" || forced === "stub") return forced;
    if (window.YaGames) return "yandex";
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
    if (id === "yandex") {
        const { createYandex } = await import("./yandex.js");
        const platform = createYandex();
        await platform.init();
        return platform;
    }
    if (id === "vk") {
        const { createVk } = await import("./vk.js");
        const platform = createVk();
        await platform.init();
        return platform;
    }
    const { createStub } = await import("./stub.js");
    const platform = createStub();
    await platform.init();
    return platform;
}

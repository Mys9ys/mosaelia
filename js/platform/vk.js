import { bindVisibility, loadScript, placeholderAd, readLocal, withTimeout, writeLocal } from "./local.js";

const STORAGE_KEY = "mosaelia";
const SDK_SRC = "https://unpkg.com/@vkontakte/vk-bridge/dist/browser.min.js";

function insideVk() {
    const query = new URLSearchParams(location.search);
    return query.has("vk_user_id") || query.has("vk_app_id");
}

export function createVk() {
    let bridge = null;
    let saveTimer = 0;
    let pending = null;
    const pauseFns = [];
    const resumeFns = [];

    const firePause = () => pauseFns.forEach((fn) => fn());
    const fireResume = () => resumeFns.forEach((fn) => fn());

    function getBridge() {
        return window.vkBridge || window.bridge || null;
    }

    async function flush() {
        if (!bridge || pending == null) return;
        const value = JSON.stringify(pending);
        pending = null;
        try {
            await bridge.send("VKWebAppStorageSet", { key: STORAGE_KEY, value });
        } catch {
            /* local copy already written */
        }
    }

    return {
        id: "vk",
        async init() {
            bindVisibility(() => {
                firePause();
                flush();
            }, fireResume);
            try {
                if (!insideVk()) {
                    return;
                }
                await loadScript(SDK_SRC);
                bridge = getBridge();
                if (!bridge) throw new Error("vkBridge missing");
                await withTimeout(bridge.send("VKWebAppInit"), 2500, "VKWebAppInit");
                bridge.subscribe((event) => {
                    const type = event?.detail?.type;
                    if (type === "VKWebAppViewHide" || type === "VKWebAppPause") firePause();
                    if (type === "VKWebAppViewRestore" || type === "VKWebAppResume") fireResume();
                });
            } catch (err) {
                console.warn("VK Bridge недоступен, сейв локальный", err);
                bridge = null;
            }
        },
        ready() {},
        async save(data) {
            writeLocal(data);
            if (!bridge) return;
            pending = data;
            clearTimeout(saveTimer);
            saveTimer = setTimeout(flush, 400);
        },
        async load() {
            let remote = null;
            try {
                const res = await bridge?.send("VKWebAppStorageGet", { keys: [STORAGE_KEY] });
                const row = res?.keys?.find((item) => item.key === STORAGE_KEY);
                if (row?.value) remote = JSON.parse(row.value);
            } catch {
                remote = null;
            }
            const local = readLocal();
            if (remote && local) {
                return (remote.completed?.length || 0) >= (local.completed?.length || 0)
                    ? remote
                    : local;
            }
            return remote || local;
        },
        async showInterstitial() {
            if (!bridge) {
                return placeholderAd(
                    "Между картинами",
                    "Вне VK показываем заглушку, чтобы не зависать на SDK."
                );
            }
            try {
                await withTimeout(
                    bridge.send("VKWebAppShowNativeAds", { ad_format: "interstitial" }),
                    2500,
                    "vk interstitial"
                );
                return true;
            } catch {
                return placeholderAd("Между картинами", "Ролик VK не открылся, идём дальше.");
            }
        },
        async showRewarded() {
            if (!bridge) {
                return placeholderAd(
                    "Награда за просмотр",
                    "Вне VK показываем заглушку, чтобы не зависать на SDK."
                );
            }
            try {
                const res = await withTimeout(
                    bridge.send("VKWebAppShowNativeAds", { ad_format: "reward" }),
                    2500,
                    "vk rewarded"
                );
                return Boolean(res?.result);
            } catch {
                return false;
            }
        },
        onPause(fn) {
            pauseFns.push(fn);
        },
        onResume(fn) {
            resumeFns.push(fn);
        },
        locale() {
            const lang = new URLSearchParams(location.search).get("vk_language") || navigator.language || "ru";
            return lang.slice(0, 2);
        }
    };
}

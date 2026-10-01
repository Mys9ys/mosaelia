import { bindVisibility, loadScript, placeholderAd, readLocal, withTimeout, writeLocal } from "./local.js";

const STORAGE_KEY = "mosaelia";
const SDK_SRC = new URL("../vendor/vk-bridge.min.js", import.meta.url).href;

export function createVk() {
    let bridge = null;
    let saveTimer = 0;
    let pending = null;
    let lastScore = 1;
    let displayName = "";
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

    async function nativeAd(format) {
        try {
            const check = await bridge.send("VKWebAppCheckNativeAds", { ad_format: format });
            if (check && check.result === false) return false;
        } catch {
            /* older clients — try show anyway */
        }
        try {
            const res = await bridge.send("VKWebAppShowNativeAds", { ad_format: format });
            return Boolean(res?.result);
        } catch {
            return false;
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
                if (!getBridge()) await loadScript(SDK_SRC, 8000);
                bridge = getBridge();
                if (!bridge) throw new Error("vkBridge missing");
                await withTimeout(bridge.send("VKWebAppInit"), 8000, "VKWebAppInit");
                try {
                    const info = await withTimeout(bridge.send("VKWebAppGetUserInfo"), 4000, "VKWebAppGetUserInfo");
                    displayName = String(info?.first_name || "").slice(0, 24);
                } catch {
                    displayName = "";
                }
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
        gameplayStart() {},
        gameplayStop() {},
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
                    "Вне площадки показываем заглушку, чтобы не зависать на SDK."
                );
            }
            return nativeAd("interstitial");
        },
        async showRewarded() {
            if (!bridge) {
                return placeholderAd(
                    "Награда за просмотр",
                    "Вне площадки показываем заглушку, чтобы не зависать на SDK."
                );
            }
            return nativeAd("reward");
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
        },
        playerName() {
            return displayName;
        },
        async submitScore(value) {
            lastScore = Math.max(1, Math.floor(Number(value) || 1));
        },
        async showLeaderboard(value) {
            const score = Math.max(1, Math.floor(Number(value) || lastScore || 1));
            lastScore = score;
            if (!bridge) return false;
            try {
                await bridge.send("VKWebAppShowLeaderBoardBox", { user_result: score });
                return true;
            } catch {
                return false;
            }
        },
        async share(text) {
            if (!bridge) return false;
            try {
                await bridge.send("VKWebAppShowWallPostBox", { message: text });
                return true;
            } catch {
                try {
                    await bridge.send("VKWebAppShare");
                    return true;
                } catch {
                    return false;
                }
            }
        }
    };
}

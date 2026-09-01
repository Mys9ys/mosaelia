import { bindVisibility, insideYandex, loadScript, placeholderAd, readLocal, withTimeout, writeLocal } from "./local.js";

const SDK_SRC = "https://yandex.ru/games/sdk/v2";

export function createYandex() {
    let ysdk = null;
    let player = null;
    let saveTimer = 0;
    let pending = null;
    const pauseFns = [];
    const resumeFns = [];

    const firePause = () => pauseFns.forEach((fn) => fn());
    const fireResume = () => resumeFns.forEach((fn) => fn());

    async function flush() {
        if (!player || pending == null) return;
        const data = pending;
        pending = null;
        try {
            await player.setData({ mosaelia: data }, true);
        } catch {
            /* local copy already written */
        }
    }

    return {
        id: "yandex",
        async init() {
            bindVisibility(() => {
                firePause();
                flush();
            }, fireResume);
            try {
                await loadScript(SDK_SRC);
                ysdk = await withTimeout(window.YaGames.init(), 2500, "YaGames.init");
                ysdk.on("game_api_pause", firePause);
                ysdk.on("game_api_resume", fireResume);
                try {
                    player = await ysdk.getPlayer();
                } catch {
                    player = null;
                }
            } catch (err) {
                console.warn("Yandex SDK недоступен, сейв локальный", err);
            }
        },
        ready() {
            ysdk?.features?.LoadingAPI?.ready();
        },
        async save(data) {
            writeLocal(data);
            if (!player) return;
            pending = data;
            clearTimeout(saveTimer);
            saveTimer = setTimeout(flush, 400);
        },
        async load() {
            let remote = null;
            try {
                const payload = await player?.getData();
                remote = payload?.mosaelia || null;
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
            if (!insideYandex() || !ysdk?.adv?.showFullscreenAdv) {
                return placeholderAd(
                    "Между картинами",
                    "Вне каталога Яндекс Игр показываем заглушку, чтобы не зависать."
                );
            }
            try {
                return await withTimeout(new Promise((resolve) => {
                    ysdk.adv.showFullscreenAdv({
                        callbacks: {
                            onClose: () => resolve(true),
                            onError: () => resolve(false)
                        }
                    });
                }), 2500, "interstitial");
            } catch {
                return placeholderAd("Между картинами", "Ролик площадки не открылся, идём дальше.");
            }
        },
        async showRewarded() {
            if (!insideYandex() || !ysdk?.adv?.showRewardedVideo) {
                return placeholderAd(
                    "Награда за просмотр",
                    "Вне каталога Яндекс Игр показываем заглушку, чтобы не зависать."
                );
            }
            try {
                return await withTimeout(new Promise((resolve) => {
                    let rewarded = false;
                    ysdk.adv.showRewardedVideo({
                        callbacks: {
                            onRewarded: () => {
                                rewarded = true;
                            },
                            onClose: () => resolve(rewarded),
                            onError: () => resolve(false)
                        }
                    });
                }), 2500, "rewarded");
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
            return ysdk?.environment?.i18n?.lang || "ru";
        }
    };
}

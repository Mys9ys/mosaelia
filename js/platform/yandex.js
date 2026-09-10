import { bindVisibility, loadScript, placeholderAd, readLocal, writeLocal } from "./local.js";

const SDK_SRC = "/sdk.js";

export function createYandex() {
    let ysdk = null;
    let player = null;
    let saveTimer = 0;
    let pending = null;
    let playing = false;
    const pauseFns = [];
    const resumeFns = [];

    const firePause = () => pauseFns.forEach((fn) => fn());
    const fireResume = () => resumeFns.forEach((fn) => fn());

    function gameplayStart() {
        if (playing) return;
        playing = true;
        ysdk?.features?.GameplayAPI?.start();
    }

    function gameplayStop() {
        if (!playing) return;
        playing = false;
        ysdk?.features?.GameplayAPI?.stop();
    }

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

    async function ensureSdk() {
        if (window.YaGames) return;
        await loadScript(SDK_SRC, 8000);
        if (!window.YaGames) {
            throw new Error("YaGames is not defined");
        }
    }

    return {
        id: "yandex",
        async init() {
            bindVisibility(() => {
                firePause();
                gameplayStop();
                flush();
            }, () => {
                fireResume();
            });
            await ensureSdk();
            ysdk = await window.YaGames.init();
            ysdk.on("game_api_pause", () => {
                firePause();
                gameplayStop();
            });
            ysdk.on("game_api_resume", fireResume);
            try {
                player = await ysdk.getPlayer();
            } catch {
                player = null;
            }
        },
        ready() {
            ysdk?.features?.LoadingAPI?.ready();
        },
        gameplayStart,
        gameplayStop,
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
            if (!ysdk?.adv?.showFullscreenAdv) {
                return placeholderAd(
                    "Между картинами",
                    "Вне каталога Яндекс Игр показываем заглушку, чтобы не зависать."
                );
            }
            gameplayStop();
            return new Promise((resolve) => {
                ysdk.adv.showFullscreenAdv({
                    callbacks: {
                        onClose: () => resolve(true),
                        onError: () => resolve(false)
                    }
                });
            });
        },
        async showRewarded() {
            if (!ysdk?.adv?.showRewardedVideo) {
                return placeholderAd(
                    "Награда за просмотр",
                    "Вне каталога Яндекс Игр показываем заглушку, чтобы не зависать."
                );
            }
            gameplayStop();
            return new Promise((resolve) => {
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
            });
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

import { bindVisibility, placeholderAd, readLocal, writeLocal } from "./local.js";

export function createStub() {
    const pauseFns = [];
    const resumeFns = [];

    const firePause = () => pauseFns.forEach((fn) => fn());
    const fireResume = () => resumeFns.forEach((fn) => fn());

    return {
        id: "stub",
        async init() {
            bindVisibility(firePause, fireResume);
        },
        ready() {},
        async save(data) {
            writeLocal(data);
        },
        async load() {
            return readLocal();
        },
        async showInterstitial() {
            return placeholderAd(
                "Между картинами",
                "Заглушка для OSPanel. На Яндексе и VK здесь будет полноэкранный ролик."
            );
        },
        async showRewarded() {
            return placeholderAd(
                "Награда за просмотр",
                "Заглушка. На площадке ролик даст дополнительный бустер."
            );
        },
        onPause(fn) {
            pauseFns.push(fn);
        },
        onResume(fn) {
            resumeFns.push(fn);
        },
        locale() {
            return (navigator.language || "ru").slice(0, 2);
        }
    };
}

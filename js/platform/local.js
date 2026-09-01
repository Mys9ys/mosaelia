export const SAVE_KEY = "mosaelia-save";

export function readLocal() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) return JSON.parse(raw);
    } catch {
        /* ignore */
    }
    const coins = Number(localStorage.getItem("mosaelia-coins") || 0);
    const mute = localStorage.getItem("mosaelia-mute") === "1";
    if (!coins && !mute) return null;
    return {
        coins,
        mute,
        unlocked: 0,
        completed: [],
        seenHowto: false,
        dev: false
    };
}

export function writeLocal(data) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadScript(src, ms = 2500) {
    if ([...document.scripts].some((s) => s.src === src)) {
        return Promise.resolve();
    }
    const loading = new Promise((resolve, reject) => {
        const el = document.createElement("script");
        el.src = src;
        el.async = true;
        el.onload = () => resolve();
        el.onerror = () => reject(new Error(`Не удалось загрузить ${src}`));
        document.head.appendChild(el);
    });
    return withTimeout(loading, ms, `script ${src}`);
}

export function withTimeout(promise, ms, label = "timeout") {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`${label} (${ms}ms)`)), ms);
        })
    ]);
}

export function bindVisibility(onPause, onResume) {
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) onPause();
        else onResume();
    });
}

export const AD_PLACEHOLDER_MS = 1600;

export function placeholderAd(title, copy) {
    const overlay = document.getElementById("ad-overlay");
    const titleEl = document.getElementById("ad-title");
    const copyEl = document.getElementById("ad-copy");
    const bar = document.getElementById("ad-bar");
    if (titleEl) titleEl.textContent = title;
    if (copyEl) copyEl.textContent = copy;
    if (!overlay) {
        return new Promise((resolve) => setTimeout(() => resolve(true), AD_PLACEHOLDER_MS));
    }
    overlay.classList.add("show");
    if (bar) {
        bar.style.animation = "none";
        void bar.offsetWidth;
        bar.style.animation = "";
    }
    return new Promise((resolve) => {
        setTimeout(() => {
            overlay.classList.remove("show");
            resolve(true);
        }, AD_PLACEHOLDER_MS);
    });
}

export function insideYandex() {
    const host = location.hostname;
    return host.includes("yandex") || host.includes("yagames") || host.includes("playhop");
}

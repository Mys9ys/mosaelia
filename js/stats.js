import { STATS_TOKEN, STATS_URL } from "./stats-config.js";

const ID_KEY = "mosaelia-aid";

export function guestId() {
    try {
        let id = localStorage.getItem(ID_KEY);
        if (!id) {
            id = crypto.randomUUID?.() || `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
            localStorage.setItem(ID_KEY, id);
        }
        return id;
    } catch {
        return "anon";
    }
}

function endpoint() {
    const host = location.hostname;
    if (host === "mosaelia.loc" || host === "localhost" || host === "127.0.0.1") {
        return "http://127.0.0.1:8791/collect.php";
    }
    if (host === "mosaelia.ru" || host.endsWith(".mosaelia.ru")) {
        return `${location.origin}/stats/collect.php`;
    }
    return STATS_URL || "";
}

function rankEndpoint() {
    const collect = endpoint();
    if (!collect) return "";
    return collect.replace(/collect\.php.*$/, "rank.php");
}

export function track(ev, extra = {}) {
    if (new URLSearchParams(location.search).has("shot")) return;
    const url = endpoint();
    if (!url) return;
    const payload = JSON.stringify({
        v: 1,
        t: Date.now(),
        id: guestId(),
        ev,
        p: extra.platform || "",
        level: extra.level || "",
        first: extra.first ? 1 : 0,
        total: extra.total ?? null,
        moves: extra.moves ?? null,
        clean: extra.clean ? 1 : 0,
        name: extra.name || "",
        token: STATS_TOKEN
    });
    try {
        if (navigator.sendBeacon) {
            navigator.sendBeacon(url, new Blob([payload], { type: "text/plain" }));
            return;
        }
    } catch {
        /* fall through */
    }
    fetch(url, { method: "POST", body: payload, keepalive: true, mode: "no-cors" }).catch(() => {});
}

export async function fetchRanks(level) {
    const url = rankEndpoint();
    if (!url || !level) return [];
    try {
        const res = await fetch(`${url}?level=${encodeURIComponent(level)}`, { mode: "cors" });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data?.rows) ? data.rows : [];
    } catch {
        return [];
    }
}

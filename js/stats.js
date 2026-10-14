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

function statsBase() {
    const collect = endpoint();
    if (!collect) return "";
    return collect.replace(/collect\.php.*$/, "");
}

function rankEndpoint() {
    const base = statsBase();
    return base ? `${base}rank.php` : "";
}

function leadersEndpoint() {
    const base = statsBase();
    return base ? `${base}leaders.php` : "";
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
        replay: extra.replay ? 1 : 0,
        daily: extra.daily ? 1 : 0,
        total: extra.total ?? null,
        moves: extra.moves ?? null,
        clean: extra.clean ? 1 : 0,
        payout: extra.payout ?? null,
        spent: extra.spent ?? null,
        item: extra.item || "",
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
    if (!url || !level) return { rows: [], total: 0, me: null };
    try {
        const me = guestId();
        const res = await fetch(`${url}?level=${encodeURIComponent(level)}&id=${encodeURIComponent(me)}`, { mode: "cors" });
        if (!res.ok) return { rows: [], total: 0, me: null };
        const data = await res.json();
        return {
            rows: Array.isArray(data?.rows) ? data.rows : [],
            total: Number(data?.total) || 0,
            me: data?.me || null
        };
    } catch {
        return { rows: [], total: 0, me: null };
    }
}

function shopStatsEndpoint() {
    const base = statsBase();
    return base ? `${base}shop-stats.php` : "";
}

export async function fetchShopStats() {
    const url = shopStatsEndpoint();
    if (!url) return {};
    try {
        const res = await fetch(url, { mode: "cors" });
        if (!res.ok) return {};
        const data = await res.json();
        return data?.items && typeof data.items === "object" ? data.items : {};
    } catch {
        return {};
    }
}

export async function fetchLeaders(board, period, page = 1) {
    const url = leadersEndpoint();
    if (!url) return { rows: [], players: 0, page: 1, pages: 1, me: null };
    try {
        const me = guestId();
        const q = new URLSearchParams({ board, period, id: me, page: String(page) });
        const res = await fetch(`${url}?${q}`, { mode: "cors" });
        if (!res.ok) return { rows: [], players: 0, page: 1, pages: 1, me: null };
        const data = await res.json();
        return {
            rows: Array.isArray(data?.rows) ? data.rows : [],
            players: Number(data?.players) || 0,
            page: Math.max(1, Number(data?.page) || 1),
            pages: Math.max(1, Number(data?.pages) || 1),
            me: data?.me || null
        };
    } catch {
        return { rows: [], players: 0, page: 1, pages: 1, me: null };
    }
}

export const MONTHS_RU = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

export const WEEK_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const ERA = Date.UTC(2026, 9, 1);

export function moscowParts(ts = Date.now()) {
    const d = new Date(ts + 3 * 3600 * 1000);
    return {
        y: d.getUTCFullYear(),
        m: d.getUTCMonth() + 1,
        day: d.getUTCDate()
    };
}

export function pad2(n) {
    return String(n).padStart(2, "0");
}

export function isoDay(y, m, d) {
    return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function todayIso() {
    const { y, m, day } = moscowParts();
    return isoDay(y, m, day);
}

export function daysInMonth(y, m) {
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function mondayIndex(y, m, d) {
    const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return (w + 6) % 7;
}

export const OCT_Y = 2026;
export const OCT_M = 10;

export function octIndexForIso(iso, count = 31) {
    const d = Number(String(iso).slice(-2));
    const len = Math.max(1, count);
    return Math.max(0, Math.min(len - 1, d - 1));
}

export function octMonthParts() {
    return { y: OCT_Y, m: OCT_M };
}

export function levelIndexForIso(iso, count) {
    const [y, m, d] = iso.split("-").map(Number);
    const t = Date.UTC(y, m - 1, d);
    const n = Math.round((t - ERA) / 86400000);
    const len = Math.max(1, count);
    return ((n % len) + len) % len;
}

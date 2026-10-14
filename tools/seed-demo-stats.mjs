/** Demo leaderboard data. Run: npm run stats, then node tools/seed-demo-stats.mjs */
const url = "http://127.0.0.1:8791/collect.php";
const token = "mosaelia-local-ingest";

const levels = ["dawn", "boat", "daisies", "flowerbed", "rainbow", "arch", "path", "cat", "tea", "windmill"];

const players = [
    { id: "demo-alisa-01", name: "Алиса", count: 6, skill: 42 },
    { id: "demo-boris-02", name: "Борис", count: 5, skill: 55 },
    { id: "demo-katya-03", name: "Катя", count: 6, skill: 38 },
    { id: "demo-ivan-04", name: "Иван", count: 5, skill: 48 }
];

function moscowWeekStart() {
    const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Moscow",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
    const parts = Object.fromEntries(
        fmt.formatToParts(new Date()).map((p) => [p.type, p.value])
    );
    const today = new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00+03:00`);
    const day = today.getUTCDay();
    const monOffset = day === 0 ? -6 : 1 - day;
    const mon = new Date(today);
    mon.setUTCDate(today.getUTCDate() + monOffset);
    mon.setUTCHours(0, 0, 0, 0);
    return mon.getTime();
}

async function post(body) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(body)
    });
    return res.status;
}

const weekStart = moscowWeekStart();

for (const p of players) {
    await post({ v: 1, t: weekStart + 3600000, id: p.id, ev: "launch", p: "stub", token });
    for (let i = 0; i < p.count; i++) {
        const level = levels[i];
        const dayOff = i % 7;
        const t = weekStart + dayOff * 86400000 + (9 + i) * 3600000 + (i * 117000);
        const moves = Math.max(28, p.skill + (i % 5) * 3 + (i % 3) * 2);
        const payout = 50 + (i % 4) * 8;
        const code = await post({
            v: 1,
            t,
            id: p.id,
            ev: "complete",
            p: "vk",
            level,
            first: 1,
            moves,
            clean: i % 4 === 0 ? 1 : 0,
            payout,
            name: p.name,
            token
        });
        if (code !== 204) console.warn(p.name, level, code);
    }
    console.log("OK", p.name, p.count);
}

console.log("Done — open Rating (week / all time).");

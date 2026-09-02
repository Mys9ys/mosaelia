export const COLORS = {
    skyL: { c: "#cfeaf7", d: "#9ccfe8", name: "Небо светлое" },
    sky: { c: "#8cc5e8", d: "#4f96c9", name: "Небо" },
    sea: { c: "#4f7fb8", d: "#2f5a8f", name: "Море" },
    cloud: { c: "#fdf8ef", d: "#ddd0b8", name: "Парус", shape: "pebble" },
    porcelain: { c: "#eef4f9", d: "#a9c4dc", name: "Фарфор" },
    azure: { c: "#6f9fd8", d: "#3a68a8", name: "Кобальт" },
    sun: { c: "#ffd66b", d: "#e89f2e", name: "Солнце" },
    glow: { c: "#ff9d5c", d: "#e0662a", name: "Закат" },
    rose: { c: "#f7a8b8", d: "#dd6d8c", name: "Заря" },
    stoneL: { c: "#f0e2c2", d: "#cbb98f", name: "Известняк", shape: "pebble" },
    stone: { c: "#e0c9a0", d: "#b3925c", name: "Песчаник" },
    roof: { c: "#d95f4c", d: "#a33a2c", name: "Черепица" },
    wood: { c: "#b57a4c", d: "#7e4f2d", name: "Дерево" },
    woodD: { c: "#7d5133", d: "#523219", name: "Тёмный дуб" },
    leafL: { c: "#b7de99", d: "#84b96c", name: "Мята", shape: "leaf" },
    leaf: { c: "#7cae67", d: "#4e8141", name: "Лист", shape: "leaf" },
    leafD: { c: "#4c7844", d: "#2f5430", name: "Лес" },
    bloomP: { c: "#f7a6bd", d: "#d9628b", shape: "flower", name: "Пион" },
    bloomL: { c: "#c2a6e8", d: "#8e64c4", shape: "flower", name: "Фиалка" },
    bloomY: { c: "#ffd97e", d: "#e2a136", shape: "flower", name: "Лютик" },
    bloomW: { c: "#fcf6ea", d: "#c8b493", shape: "flower", name: "Ромашка" },
    lav: { c: "#b49ae0", d: "#7e62bd", name: "Лаванда" },
    ink: { c: "#4a4574", d: "#2b2848", name: "Ночь" }
};

function g(...rows) {
    return rows.map((row) => row.trim().split(/\s+/));
}

const TINY = new Set(["skyL", "sky", "sea", "ink"]);

const SIZE_ORDER = {
    3: [[3, 3], [2, 2], [3, 2], [2, 3], [3, 1], [2, 1], [1, 2], [1, 1]],
    2: [[2, 2], [2, 1], [1, 2], [1, 1]],
    1: [[2, 1], [1, 1]]
};

function maxSide(color, total, count) {
    if (TINY.has(color) || count >= total * 0.3) return 1;
    return count < total * 0.26 ? 3 : 2;
}

function tessellate(grid) {
    const rows = grid.length;
    const cols = grid[0].length;
    const total = rows * cols;
    const freq = {};
    grid.flat().forEach((color) => {
        freq[color] = (freq[color] || 0) + 1;
    });
    const used = grid.map((row) => row.map(() => false));
    const fits = (r, c, w, h, color) => {
        if (r + h > rows || c + w > cols) return false;
        for (let y = r; y < r + h; y++) {
            for (let x = c; x < c + w; x++) {
                if (used[y][x] || grid[y][x] !== color) return false;
            }
        }
        return true;
    };
    const pieces = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (used[r][c]) continue;
            const color = grid[r][c];
            for (const [w, h] of SIZE_ORDER[maxSide(color, total, freq[color])]) {
                if (!fits(r, c, w, h, color)) continue;
                for (let y = r; y < r + h; y++) {
                    for (let x = c; x < c + w; x++) used[y][x] = true;
                }
                pieces.push({ color, x: c, y: r, w, h });
                break;
            }
        }
    }
    return pieces;
}

function hash32(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function mulberry32(seed) {
    return () => {
        seed |= 0;
        seed = seed + 0x6d2b79f5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
}

function polyArea(poly) {
    let a = 0;
    for (let i = 0; i < poly.length; i++) {
        const b = poly[(i + 1) % poly.length];
        a += poly[i][0] * b[1] - b[0] * poly[i][1];
    }
    return Math.abs(a) / 2;
}

function compactPoly(poly) {
    const out = [];
    for (const p of poly) {
        const prev = out[out.length - 1];
        if (prev && Math.hypot(p[0] - prev[0], p[1] - prev[1]) < 1e-5) continue;
        out.push(p);
    }
    if (out.length > 2) {
        const a = out[0];
        const b = out[out.length - 1];
        if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-5) out.pop();
    }
    return out;
}

function intersectEdge(a, b, px, py, nx, ny) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const den = dx * nx + dy * ny;
    const t = Math.abs(den) < 1e-12 ? 0 : ((px - a[0]) * nx + (py - a[1]) * ny) / den;
    return [a[0] + dx * t, a[1] + dy * t];
}

function clipHalf(poly, px, py, nx, ny) {
    if (poly.length < 3) return [];
    const inside = (x, y) => (x - px) * nx + (y - py) * ny <= 1e-9;
    const out = [];
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        const aIn = inside(a[0], a[1]);
        const bIn = inside(b[0], b[1]);
        if (aIn && bIn) {
            out.push(b);
        } else if (aIn && !bIn) {
            out.push(intersectEdge(a, b, px, py, nx, ny));
        } else if (!aIn && bIn) {
            out.push(intersectEdge(a, b, px, py, nx, ny));
            out.push(b);
        }
    }
    return compactPoly(out);
}

function voronoiCells(sites, cols, rows) {
    const box = [[0, 0], [cols, 0], [cols, rows], [0, rows]];
    return sites.map((site, i) => {
        let poly = box;
        for (let j = 0; j < sites.length; j++) {
            if (i === j) continue;
            const ox = sites[j][0] - site[0];
            const oy = sites[j][1] - site[1];
            const mx = (site[0] + sites[j][0]) / 2;
            const my = (site[1] + sites[j][1]) / 2;
            poly = clipHalf(poly, mx, my, ox, oy);
            if (poly.length < 3) break;
        }
        return compactPoly(poly);
    });
}

function fmtPt(p) {
    return `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
}

function edgeKey(a, b) {
    const ka = fmtPt(a);
    const kb = fmtPt(b);
    return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
}

function onFrame(p, cols, rows) {
    return p[0] < 0.03 || p[1] < 0.03 || p[0] > cols - 0.03 || p[1] > rows - 0.03;
}

function jagCracks(polys, cols, rows, rng) {
    const extras = new Map();
    for (const poly of polys) {
        for (let i = 0; i < poly.length; i++) {
            const a = poly[i];
            const b = poly[(i + 1) % poly.length];
            const key = edgeKey(a, b);
            if (extras.has(key)) continue;
            const outer = onFrame(a, cols, rows) && onFrame(b, cols, rows)
                && (Math.abs(a[0] - b[0]) < 0.04 || Math.abs(a[1] - b[1]) < 0.04);
            if (outer) {
                extras.set(key, { from: a, pts: [] });
                continue;
            }
            const dx = b[0] - a[0];
            const dy = b[1] - a[1];
            const len = Math.hypot(dx, dy) || 1;
            const px = -dy / len;
            const py = dx / len;
            const amp = Math.min(0.28, len * 0.22);
            const kinks = len > 1.25 ? 2 : 1;
            const pts = [];
            for (let k = 0; k < kinks; k++) {
                const t = kinks === 1
                    ? 0.38 + rng() * 0.24
                    : 0.28 + k * 0.34 + rng() * 0.12;
                const s = (rng() * 2 - 1) * amp * (k === 0 ? 1 : 0.75);
                pts.push([a[0] + dx * t + px * s, a[1] + dy * t + py * s]);
            }
            extras.set(key, { from: a, pts });
        }
    }
    return polys.map((poly) => {
        const out = [];
        for (let i = 0; i < poly.length; i++) {
            const a = poly[i];
            const b = poly[(i + 1) % poly.length];
            out.push(a);
            const extra = extras.get(edgeKey(a, b));
            if (!extra || !extra.pts.length) continue;
            const same = Math.hypot(a[0] - extra.from[0], a[1] - extra.from[1]) < 0.02;
            const pts = same ? extra.pts : extra.pts.slice().reverse();
            out.push(...pts);
        }
        return compactPoly(out);
    });
}

function rectPoly(p) {
    return [
        [p.x, p.y],
        [p.x + p.w, p.y],
        [p.x + p.w, p.y + p.h],
        [p.x, p.y + p.h]
    ];
}

function shatter(id, cols, rows, rects) {
    const rng = mulberry32(hash32(id));
    const sites = rects.map((p) => {
        const mx = Math.min(0.22, p.w * 0.22);
        const my = Math.min(0.22, p.h * 0.22);
        return [
            clamp(p.x + p.w * (0.32 + rng() * 0.36), p.x + mx, p.x + p.w - mx),
            clamp(p.y + p.h * (0.32 + rng() * 0.36), p.y + my, p.y + p.h - my)
        ];
    });
    for (let i = 0; i < sites.length; i++) {
        for (let j = 0; j < i; j++) {
            const dx = sites[i][0] - sites[j][0];
            const dy = sites[i][1] - sites[j][1];
            if (dx * dx + dy * dy < 0.05) {
                sites[i][0] = clamp(sites[i][0] + 0.18, 0.08, cols - 0.08);
                sites[i][1] = clamp(sites[i][1] + 0.11, 0.08, rows - 0.08);
            }
        }
    }
    let polys = voronoiCells(sites, cols, rows);
    const covered = polys.reduce((n, poly) => n + (poly.length >= 3 ? polyArea(poly) : 0), 0);
    if (Math.abs(covered - cols * rows) > 0.35) {
        polys = rects.map(rectPoly);
    }
    polys = jagCracks(polys, cols, rows, rng);
    return rects.map((p, i) => ({
        ...p,
        poly: polys[i] && polys[i].length >= 3 ? polys[i] : rectPoly(p)
    }));
}

function level(id, title, grid, deal = 2) {
    const rows = grid.length;
    const cols = grid[0].length;
    if (grid.some((row) => row.length !== cols)) {
        throw new Error(`Uneven grid: ${id}`);
    }
    const rects = tessellate(grid);
    if (rects.reduce((n, p) => n + p.w * p.h, 0) !== rows * cols) {
        throw new Error(`Bad tessellation: ${id}`);
    }
    const pieces = shatter(id, cols, rows, rects);
    return { id, title, rows, cols, pieces, deal };
}

export const LEVELS = [
    level("dawn", "Зорька", g(
        "skyL  skyL  sky   sky   sky",
        "sky   glow  glow  glow  sky",
        "sea   glow  sun   glow  sea",
        "sea   sea   sea   sea   sea"
    ), 1),
    level("boat", "Парусник", g(
        "sky   sun   cloud cloud sky",
        "sky   cloud cloud cloud sky",
        "sky   sky   wood  wood  sky",
        "sea   sea   sea   sea   sea"
    ), 1),
    level("daisies", "Ромашки", g(
        "sky   sky   sky   sky   sky",
        "leafL bloomW leaf  bloomW leafL",
        "leaf  leafL  bloomY leafL leaf",
        "leafD leaf   leaf  leaf  leafD"
    ), 1),
    level("flowerbed", "Клумба", g(
        "leaf  bloomP leaf  bloomL leaf  bloomP",
        "leaf  leaf   leaf  leaf  leaf  leaf",
        "bloomL leaf bloomY leaf  bloomW leaf",
        "leafD leafD  leaf  leaf  leafD leafD"
    ), 1),
    level("rainbow", "Радуга", g(
        "sky   sky   sky   sky   sky   sky",
        "rose  rose  rose  rose  rose  rose",
        "sun   sun   sun   sun   sun   sun",
        "lav   lav   lav   lav   lav   lav",
        "cloud cloud cloud cloud cloud cloud"
    ), 1),
    level("arch", "Садовая арка", g(
        "sky    stone  stone  stone  stone  sky",
        "stone  leaf   leaf   leaf   leaf  stone",
        "stone  leaf   wood   wood   leaf  stone",
        "bloomY leaf   wood   wood   leaf  bloomP",
        "bloomP stoneL stoneL stoneL stoneL bloomL"
    ), 2),
    level("path", "Тропинка", g(
        "leaf  leaf  stoneL stoneL leaf  leaf",
        "leaf  stone stone stone stone leaf",
        "leaf  leaf  stone stone leaf  leaf",
        "leafL bloomW stoneL stoneL bloomW leafL",
        "leaf  leafL leaf  leaf  leafL leaf"
    ), 2),
    level("cat", "Кот в окне", g(
        "stone stone stone  stone  stone stone",
        "stone leaf  glow   glow   leaf  stone",
        "stone leafL glow   glow   leafL stone",
        "stone lav   glow   glow   lav   stone",
        "stone lav   leafL  leafL  lav   stone",
        "wood  wood  wood   wood   wood  wood"
    ), 2),
    level("tea", "Чайный сервиз", g(
        "bloomL bloomL sun      sun    bloomL    bloomL",
        "stoneL porcelain porcelain porcelain porcelain stoneL",
        "stoneL azure    azure    azure    azure    stoneL",
        "stoneL porcelain porcelain cloud   cloud    stoneL",
        "wood   wood   wood   wood   wood   wood"
    ), 2),
    level("windmill", "Мельница", g(
        "sky   wood  woodD woodD wood  sky",
        "wood  stone woodD woodD stone wood",
        "sky   stone stone stone stone sky",
        "sky   stone wood  wood  stone sky",
        "leaf  leafL leaf  leaf  leafL leaf"
    ), 2),
    level("bridge", "Мостик", g(
        "leaf  leaf  sea   sea   leaf  leaf",
        "leaf  wood  wood  wood  wood  leaf",
        "sea   wood  wood  wood  wood  sea",
        "sea   sea   glow  glow  sea   sea",
        "leaf  leafL leaf  leafL leaf  leaf"
    ), 2),
    level("lighthouse", "Маяк", g(
        "sky    sun   sun   sky    sky   sky   sky",
        "sky    sun   sun   roof   roof  rose  sky",
        "rose   glow  glow  roof   roof  rose  sky",
        "sea    glow  glow  stone  stone glow  glow",
        "sea    cloud roof  stone  stone stone  stone",
        "sea    sea   sea   sea    glow  sea   sea"
    ), 2),
    level("pond", "Пруд", g(
        "leafL leaf  leafL leaf  leaf  leafL",
        "leaf  sea   sea   sea   sea   leaf",
        "leaf  sea   leafL sea   sea   leaf",
        "leaf  sea   sea   bloomW sea   leaf",
        "leafD leaf  leaf  leaf  leafD leaf"
    ), 2),
    level("birdhouse", "Скворечник", g(
        "sky   sky   sky   sky   sky   sky",
        "sky   sky   roof   roof  sky   sky",
        "sky   wood  wood   wood   wood  sky",
        "sky   wood  woodD woodD wood  sky",
        "bloomP leaf wood  wood   leaf  bloomY"
    ), 2),
    level("lantern", "Фонарь", g(
        "rose  rose  rose  rose  rose  rose",
        "rose  rose  sun   sun   rose  rose",
        "rose  rose  wood   wood  rose  rose",
        "rose  rose  wood   wood  rose  rose",
        "leafD leaf  woodD woodD leaf  leafD"
    ), 2),
    level("glass", "Витраж", g(
        "wood wood  wood   wood   wood  wood  wood",
        "wood sea   lav    bloomY lav  sea   wood",
        "wood lav   bloomP sun    bloomP lav  wood",
        "wood sea   sun    lav    sun  sea   wood",
        "wood wood  wood   wood   wood  wood  wood"
    ), 2),
    level("cathedral", "Собор", g(
        "sky    sky   sky   sun   sky   sky   sky",
        "sky    sun   sun   sun   sun   sun   sky",
        "sky    sun   sun   sun   sun   sun   sky",
        "stone  stone stone stone stone stone stone",
        "stone  glow  stone stone glow  stone stone",
        "stoneL stoneL stoneL stoneL stoneL stoneL stoneL"
    ), 2),
    level("night", "Ночь", g(
        "ink   sun   sun   ink   sun   ink   ink",
        "ink   sun   sun   ink   ink   sun   ink",
        "sun   ink   ink   ink   ink   ink   sun",
        "leafD leaf  leafD lav   lav   leaf  leafD",
        "leaf  leafD leaf  leafD leaf  leafD leaf"
    ), 2)
];

export function tilesFor(level) {
    const deck = [];
    for (const p of level.pieces) {
        deck.push(p.color, p.color, p.color);
    }
    return deck;
}

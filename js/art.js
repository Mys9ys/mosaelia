import { COLORS } from "./levels.js?v=13";

const C = (k) => COLORS[k].c;
const D = (k) => COLORS[k].d;
const INK = "rgba(58, 42, 34, 0.42)";

function svgWrap(w, h, defs, body) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs>${defs}</defs>${body}</svg>`;
}

function lin(id, stops) {
    return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops
        .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
        .join("")}</linearGradient>`;
}

function rad(id, stops, cx = 0.5, cy = 0.5, r = 0.65) {
    return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops
        .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
        .join("")}</radialGradient>`;
}

function blur(id, std = 6) {
    return `<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${std}"/></filter>`;
}

function lift(id = "lift") {
    return `<filter id="${id}" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="3.5" flood-color="#5a3214" flood-opacity="0.22"/></filter>`;
}

const rect = (x, y, w, h, f, rx = 0, o = 1, extra = "") =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" opacity="${o}" ${extra}/>`;
const circ = (cx, cy, r, f, o = 1, extra = "") =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" opacity="${o}" ${extra}/>`;
const ell = (cx, cy, rx, ry, f, o = 1, extra = "") =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" opacity="${o}" ${extra}/>`;
const poly = (pts, f, o = 1, extra = "") =>
    `<polygon points="${pts}" fill="${f}" opacity="${o}" ${extra}/>`;
const strokeP = (d, c, w, o = 1, extra = "") =>
    `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${o}" ${extra}/>`;
const fillP = (d, f, o = 1, extra = "") =>
    `<path d="${d}" fill="${f}" opacity="${o}" ${extra}/>`;

const SOFT = 'filter="url(#soft)"';
const LIFT = 'filter="url(#lift)"';

function outlined(tag, attrs, fill, sw = 6) {
    return `<${tag} ${attrs} fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
}

function spark(cx, cy, rx, ry = rx * 0.55) {
    return ell(cx, cy, rx, ry, "#fff8e8", 0.55);
}

function cloud(cx, cy, s) {
    const f = C("cloud");
    return `<g ${LIFT}>` +
        outlined("ellipse", `cx="${cx - s * 0.55}" cy="${cy + s * 0.08}" rx="${s * 0.5}" ry="${s * 0.38}"`, f, 5) +
        outlined("ellipse", `cx="${cx}" cy="${cy - s * 0.18}" rx="${s * 0.62}" ry="${s * 0.48}"`, f, 5) +
        outlined("ellipse", `cx="${cx + s * 0.58}" cy="${cy + s * 0.06}" rx="${s * 0.52}" ry="${s * 0.4}"`, f, 5) +
        spark(cx - s * 0.15, cy - s * 0.28, s * 0.22, s * 0.1) +
        `</g>`;
}

function sunFace(cx, cy, r) {
    const rays = [];
    for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 - Math.PI / 8;
        const x = cx + Math.cos(a) * r * 1.38;
        const y = cy + Math.sin(a) * r * 1.38;
        rays.push(outlined(
            "ellipse",
            `cx="${x}" cy="${y}" rx="${r * 0.16}" ry="${r * 0.08}" transform="rotate(${(a * 180) / Math.PI} ${x} ${y})"`,
            C("sun"),
            3
        ));
    }
    return `<g ${LIFT}>` +
        circ(cx, cy, r * 1.55, C("sun"), 0.22, SOFT) +
        rays.join("") +
        outlined("circle", `cx="${cx}" cy="${cy}" r="${r}"`, C("sun"), 5) +
        circ(cx - r * 0.22, cy - r * 0.12, r * 0.09, D("woodD")) +
        circ(cx + r * 0.22, cy - r * 0.12, r * 0.09, D("woodD")) +
        circ(cx - r * 0.24, cy - r * 0.15, r * 0.035, "#fff") +
        circ(cx + r * 0.2, cy - r * 0.15, r * 0.035, "#fff") +
        ell(cx - r * 0.38, cy + r * 0.08, r * 0.12, r * 0.07, C("rose"), 0.55) +
        ell(cx + r * 0.38, cy + r * 0.08, r * 0.12, r * 0.07, C("rose"), 0.55) +
        strokeP(`M ${cx - r * 0.22} ${cy + r * 0.22} Q ${cx} ${cy + r * 0.42} ${cx + r * 0.22} ${cy + r * 0.22}`, D("woodD"), Math.max(3, r * 0.08)) +
        spark(cx - r * 0.28, cy - r * 0.32, r * 0.22, r * 0.12) +
        `</g>`;
}

function flower(cx, cy, r, petal, core) {
    const parts = [];
    for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
        const px = cx + Math.cos(a) * r * 0.58;
        const py = cy + Math.sin(a) * r * 0.58;
        const rot = (a * 180) / Math.PI;
        parts.push(outlined(
            "ellipse",
            `cx="${px}" cy="${py}" rx="${r * 0.5}" ry="${r * 0.34}" transform="rotate(${rot} ${px} ${py})"`,
            petal,
            Math.max(2.5, r * 0.08)
        ));
    }
    parts.push(outlined("circle", `cx="${cx}" cy="${cy}" r="${r * 0.32}"`, core, 3));
    parts.push(circ(cx - r * 0.08, cy - r * 0.1, r * 0.11, "#fff6d8", 0.75));
    return `<g ${LIFT}>${parts.join("")}</g>`;
}

function tuft(cx, cy, s, fill = C("leafL")) {
    return outlined("ellipse", `cx="${cx}" cy="${cy}" rx="${s}" ry="${s * 0.32}"`, fill, 4) +
        outlined("ellipse", `cx="${cx - s * 0.45}" cy="${cy + s * 0.08}" rx="${s * 0.55}" ry="${s * 0.24}"`, fill, 3) +
        outlined("ellipse", `cx="${cx + s * 0.45}" cy="${cy + s * 0.08}" rx="${s * 0.5}" ry="${s * 0.22}"`, fill, 3);
}

function hill(cx, cy, rx, ry, fill) {
    return outlined("ellipse", `cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"`, fill, 7);
}

function wave(y, w, amp = 10, fill = C("skyL"), o = 0.35) {
    return fillP(
        `M 0 ${y} Q ${w * 0.15} ${y - amp} ${w * 0.3} ${y} T ${w * 0.6} ${y} T ${w} ${y} L ${w} ${y + 28} L 0 ${y + 28} Z`,
        fill,
        o
    );
}

function defs(extra = "") {
    return blur("soft", 9) + lift() + extra;
}

const ART = {
    dawn(w, h) {
        const hy = h * 0.72;
        return svgWrap(w, h,
            defs(
                lin("sky", [[0, "#ffd4a8"], [0.45, C("rose")], [0.78, C("glow")], [1, C("sky")]]) +
                    lin("sea", [[0, C("sea")], [1, D("sea")]])
            ),
            rect(0, 0, w, hy, "url(#sky)") +
                cloud(w * 0.18, h * 0.22, 38) +
                cloud(w * 0.82, h * 0.18, 32) +
                sunFace(w * 0.5, hy - 8, 48) +
                rect(0, hy, w, h - hy, "url(#sea)") +
                wave(hy + 8, w, 14, C("sun"), 0.28) +
                wave(hy + 36, w, 10, C("cloud"), 0.18) +
                tuft(w * 0.12, h - 18, 28, C("leaf")) +
                tuft(w * 0.88, h - 16, 24, C("leafD"))
        );
    },
    boat(w, h) {
        const hy = h * 0.7;
        const x = w * 0.5;
        return svgWrap(w, h,
            defs(lin("sky", [[0, C("skyL")], [1, C("sky")]]) + lin("sea", [[0, C("sea")], [1, D("sea")]])),
            rect(0, 0, w, hy, "url(#sky)") +
                sunFace(78, 72, 28) +
                cloud(w * 0.78, 78, 42) +
                cloud(w * 0.22, 118, 28) +
                rect(0, hy, w, h - hy, "url(#sea)") +
                wave(hy + 6, w, 12, C("cloud"), 0.25) +
                `<g ${LIFT}>` +
                poly(`${x - 95},${hy} ${x - 8},${hy - 132} ${x + 8},${hy}`, C("cloud")) +
                poly(`${x + 18},${hy} ${x + 18},${hy - 88} ${x + 78},${hy}`, C("skyL")) +
                outlined("rect", `x="${x - 6}" y="${hy - 138}" width="12" height="138" rx="5"`, D("wood"), 4) +
                fillP(`M ${x - 118} ${hy} Q ${x} ${hy + 18} ${x + 118} ${hy} L ${x + 88} ${hy + 42} Q ${x} ${hy + 58} ${x - 88} ${hy + 42} Z`, C("roof")) +
                `<path d="M ${x - 118} ${hy} Q ${x} ${hy + 18} ${x + 118} ${hy} L ${x + 88} ${hy + 42} Q ${x} ${hy + 58} ${x - 88} ${hy + 42} Z" fill="none" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>` +
                spark(x - 40, hy + 8, 28, 8) +
                `</g>`
        );
    },
    daisies(w, h) {
        return svgWrap(w, h,
            defs(lin("sky", [[0, C("skyL")], [1, C("sky")]]) + lin("meadow", [[0, C("leafL")], [1, D("leaf")]])),
            rect(0, 0, w, h * 0.32, "url(#sky)") +
                cloud(w * 0.76, 48, 30) +
                hill(w * 0.2, h * 0.42, 180, 70, C("leaf")) +
                hill(w * 0.78, h * 0.46, 200, 80, C("leafD")) +
                rect(0, h * 0.4, w, h * 0.6, "url(#meadow)") +
                flower(w * 0.22, h * 0.58, 34, C("cloud"), C("sun")) +
                flower(w * 0.62, h * 0.55, 38, C("cloud"), C("sun")) +
                flower(w * 0.42, h * 0.78, 26, C("bloomY"), D("bloomY")) +
                tuft(w * 0.12, h * 0.72, 26) +
                tuft(w * 0.88, h * 0.8, 30) +
                tuft(w * 0.7, h * 0.9, 22, C("leaf"))
        );
    },
    flowerbed(w, h) {
        return svgWrap(w, h,
            defs(lin("meadow", [[0, C("leafL")], [0.55, C("leaf")], [1, D("leafD")]])),
            rect(0, 0, w, h, "url(#meadow)") +
                hill(w * 0.5, h * 0.2, 280, 90, C("leaf")) +
                flower(w * 0.18, h * 0.18, 36, C("bloomP"), D("bloomP")) +
                flower(w * 0.5, h * 0.14, 40, C("bloomL"), D("bloomL")) +
                flower(w * 0.82, h * 0.2, 34, C("bloomP"), D("bloomP")) +
                flower(w * 0.12, h * 0.62, 32, C("bloomL"), D("bloomL")) +
                flower(w * 0.4, h * 0.58, 36, C("bloomY"), D("bloomY")) +
                flower(w * 0.7, h * 0.64, 34, C("bloomW"), C("sun")) +
                tuft(w * 0.28, h * 0.88, 36, C("leaf")) +
                tuft(w * 0.78, h * 0.9, 32, C("leafD"))
        );
    },
    rainbow(w, h) {
        return svgWrap(w, h,
            defs(lin("sky", [[0, C("skyL")], [1, C("sky")]])),
            rect(0, 0, w, h, "url(#sky)") +
                strokeP(`M ${-w * 0.2} ${h * 0.92} A ${w * 0.72} ${w * 0.72} 0 0 1 ${w * 1.2} ${h * 0.92}`, C("rose"), 46) +
                strokeP(`M ${-w * 0.12} ${h * 0.92} A ${w * 0.62} ${w * 0.62} 0 0 1 ${w * 1.12} ${h * 0.92}`, C("sun"), 46) +
                strokeP(`M ${-w * 0.04} ${h * 0.92} A ${w * 0.52} ${w * 0.52} 0 0 1 ${w * 1.04} ${h * 0.92}`, C("lav"), 46) +
                cloud(w * 0.2, h * 0.86, 48) +
                cloud(w * 0.78, h * 0.84, 52) +
                cloud(w * 0.5, h * 0.92, 36) +
                sunFace(w * 0.86, h * 0.22, 26)
        );
    },
    arch(w, h) {
        return svgWrap(w, h,
            defs(lin("garden", [[0, C("leafL")], [1, D("leaf")]])),
            rect(0, 0, w, h, "url(#garden)") +
                `<g ${LIFT}>` +
                strokeP(`M ${w * 0.14} ${h} L ${w * 0.14} ${h * 0.58} A ${w * 0.36} ${h * 0.4} 0 0 1 ${w * 0.86} ${h * 0.58} L ${w * 0.86} ${h}`, C("stone"), 58) +
                strokeP(`M ${w * 0.14} ${h} L ${w * 0.14} ${h * 0.58} A ${w * 0.36} ${h * 0.4} 0 0 1 ${w * 0.86} ${h * 0.58} L ${w * 0.86} ${h}`, C("stoneL"), 14, 0.85) +
                fillP(`M ${w * 0.42} ${h} L ${w * 0.42} ${h * 0.62} A ${w * 0.08} ${h * 0.1} 0 0 1 ${w * 0.58} ${h * 0.62} L ${w * 0.58} ${h} Z`, C("wood")) +
                outlined("rect", `x="${w * 0.47}" y="${h * 0.64}" width="${w * 0.06}" height="${h * 0.28}" rx="6"`, D("wood"), 4) +
                circ(w * 0.52, h * 0.78, 6, C("sun")) +
                `</g>` +
                flower(w * 0.1, h * 0.86, 26, C("bloomY"), D("bloomY")) +
                flower(w * 0.9, h * 0.86, 26, C("bloomP"), D("bloomP")) +
                flower(w * 0.08, h * 0.96, 20, C("bloomP"), D("bloomP")) +
                flower(w * 0.92, h * 0.96, 20, C("bloomL"), D("bloomL")) +
                tuft(w * 0.28, h * 0.5, 18, C("leaf")) +
                tuft(w * 0.72, h * 0.48, 16, C("leafD"))
        );
    },
    path(w, h) {
        return svgWrap(w, h,
            defs(lin("grass", [[0, C("leafL")], [1, D("leafD")]])),
            rect(0, 0, w, h, "url(#grass)") +
                hill(w * 0.5, h * 0.15, 220, 70, C("leaf")) +
                `<g ${LIFT}>` +
                [0.12, 0.3, 0.48, 0.66, 0.84].map((t, i) =>
                    outlined(
                        "ellipse",
                        `cx="${w * (0.42 + (i % 2) * 0.14)}" cy="${h * t}" rx="${38 - i}" ry="${20}"`,
                        i % 2 ? C("stone") : C("stoneL"),
                        5
                    )
                ).join("") +
                `</g>` +
                flower(w * 0.18, h * 0.48, 28, C("bloomW"), C("sun")) +
                flower(w * 0.84, h * 0.52, 28, C("bloomW"), C("sun")) +
                tuft(w * 0.12, h * 0.22, 24) +
                tuft(w * 0.9, h * 0.78, 26)
        );
    },
    cat(w, h) {
        const x = w * 0.5;
        return svgWrap(w, h,
            defs(lin("wall", [[0, C("stoneL")], [1, D("stone")]])),
            rect(0, 0, w, h, "url(#wall)") +
                fillP(`M ${w * 0.22} ${h} L ${w * 0.22} ${h * 0.42} A ${w * 0.28} ${h * 0.32} 0 0 1 ${w * 0.78} ${h * 0.42} L ${w * 0.78} ${h} Z`, C("skyL")) +
                `<path d="M ${w * 0.22} ${h} L ${w * 0.22} ${h * 0.42} A ${w * 0.28} ${h * 0.32} 0 0 1 ${w * 0.78} ${h * 0.42} L ${w * 0.78} ${h} Z" fill="none" stroke="${INK}" stroke-width="8"/>` +
                fillP(`M ${w * 0.28} ${h} L ${w * 0.28} ${h * 0.46} A ${w * 0.22} ${h * 0.26} 0 0 1 ${w * 0.72} ${h * 0.46} L ${w * 0.72} ${h} Z`, D("ink")) +
                `<g ${LIFT}>` +
                outlined("ellipse", `cx="${x}" cy="${h * 0.72}" rx="${w * 0.16}" ry="${h * 0.13}"`, C("glow"), 6) +
                outlined("circle", `cx="${x}" cy="${h * 0.58}" r="${w * 0.1}"`, C("glow"), 6) +
                poly(`${x - 28},${h * 0.54} ${x - 22},${h * 0.42} ${x - 2},${h * 0.52}`, C("glow")) +
                poly(`${x + 28},${h * 0.54} ${x + 22},${h * 0.42} ${x + 2},${h * 0.52}`, C("glow")) +
                circ(x - 16, h * 0.57, 7, D("ink")) +
                circ(x + 16, h * 0.57, 7, D("ink")) +
                circ(x - 18, h * 0.555, 2.5, "#fff") +
                circ(x + 14, h * 0.555, 2.5, "#fff") +
                circ(x, h * 0.61, 5, C("rose")) +
                strokeP(`M ${x - 10} ${h * 0.64} Q ${x} ${h * 0.67} ${x + 10} ${h * 0.64}`, D("woodD"), 3) +
                strokeP(`M ${x + 38} ${h * 0.76} Q ${x + 78} ${h * 0.7} ${x + 72} ${h * 0.58}`, C("glow"), 14) +
                `</g>` +
                tuft(w * 0.1, h * 0.28, 22, C("leaf")) +
                tuft(w * 0.9, h * 0.32, 24, C("leafD")) +
                flower(w * 0.14, h * 0.9, 20, C("lav"), D("lav")) +
                flower(w * 0.86, h * 0.9, 20, C("lav"), D("lav")) +
                outlined("rect", `x="0" y="${h * 0.92}" width="${w}" height="${h * 0.08}"`, C("wood"), 0)
        );
    },
    tea(w, h) {
        const x = w * 0.42;
        const y = h * 0.55;
        return svgWrap(w, h,
            defs(lin("wall", [[0, C("skyL")], [1, C("stoneL")]])),
            rect(0, 0, w, h * 0.78, "url(#wall)") +
                flower(w * 0.12, h * 0.12, 28, C("bloomL"), D("bloomL")) +
                flower(w * 0.88, h * 0.12, 28, C("bloomP"), D("bloomP")) +
                strokeP(`M ${x - 10} ${y - 150} q 16 -22 0 -40`, C("cloud"), 8, 0.7) +
                strokeP(`M ${x + 18} ${y - 158} q 16 -22 0 -40`, C("cloud"), 8, 0.5) +
                `<g ${LIFT}>` +
                strokeP(`M ${x - 108} ${y - 10} Q ${x - 160} ${y - 40} ${x - 148} ${y - 92}`, C("porcelain"), 18) +
                strokeP(`M ${x + 108} ${y - 20} Q ${x + 168} ${y} ${x + 128} ${y + 48}`, C("porcelain"), 16) +
                outlined("ellipse", `cx="${x}" cy="${y}" rx="118" ry="88"`, C("porcelain"), 7) +
                ell(x, y + 18, 92, 52, C("cloud"), 0.4) +
                outlined("rect", `x="${x - 88}" y="${y - 38}" width="176" height="18" rx="8"`, C("azure"), 4) +
                outlined("ellipse", `cx="${x}" cy="${y - 78}" rx="58" ry="14"`, C("porcelain"), 5) +
                outlined("circle", `cx="${x}" cy="${y - 102}" r="16"`, C("sun"), 4) +
                circ(x - 22, y - 12, 6, D("azure")) +
                circ(x + 18, y - 12, 6, D("azure")) +
                strokeP(`M ${x - 18} ${y + 8} Q ${x} ${y + 18} ${x + 18} ${y + 8}`, D("azure"), 4) +
                spark(x - 48, y - 28, 36, 12) +
                outlined("rect", `x="${w * 0.74}" y="${h * 0.72}" width="88" height="48" rx="14"`, C("cloud"), 5) +
                outlined("ellipse", `cx="${w * 0.82}" cy="${h * 0.9}" rx="30" ry="18"`, C("sun"), 4) +
                `</g>` +
                outlined("rect", `x="0" y="${h * 0.78}" width="${w}" height="${h * 0.22}"`, C("wood"), 0) +
                rect(0, h * 0.78, w, 10, D("wood"))
        );
    },
    windmill(w, h) {
        const x = w * 0.5;
        return svgWrap(w, h,
            defs(lin("sky", [[0, C("skyL")], [1, C("sky")]]) + lin("ground", [[0, C("leafL")], [1, D("leafD")]])),
            rect(0, 0, w, h * 0.78, "url(#sky)") +
                sunFace(w * 0.82, h * 0.16, 30) +
                cloud(w * 0.22, h * 0.2, 40) +
                rect(0, h * 0.78, w, h * 0.22, "url(#ground)") +
                tuft(w * 0.16, h * 0.86, 28) +
                tuft(w * 0.86, h * 0.9, 24, C("leaf")) +
                `<g ${LIFT}>` +
                poly(`${x - 62},${h * 0.78} ${x + 62},${h * 0.78} ${x + 38},${h * 0.32} ${x - 38},${h * 0.32}`, C("stone")) +
                `<polygon points="${x - 62},${h * 0.78} ${x + 62},${h * 0.78} ${x + 38},${h * 0.32} ${x - 38},${h * 0.32}" fill="none" stroke="${INK}" stroke-width="6"/>` +
                poly(`${x - 48},${h * 0.34} ${x + 48},${h * 0.34} ${x},${h * 0.16}`, C("woodD")) +
                outlined("rect", `x="${x - 16}" y="${h * 0.66}" width="32" height="52" rx="8"`, C("wood"), 4) +
                `<g transform="translate(${x},${h * 0.34})">${[40, 130, 220, 310]
                    .map((a) => `<g transform="rotate(${a})">${outlined("rect", `x="-10" y="-168" width="20" height="150" rx="9"`, C("wood"), 4)}</g>`)
                    .join("")}${outlined("circle", `cx="0" cy="0" r="14"`, D("woodD"), 4)}</g>` +
                `</g>`
        );
    },
    bridge(w, h) {
        return svgWrap(w, h,
            defs(lin("grass", [[0, C("leafL")], [1, D("leafD")]])),
            rect(0, 0, w, h, "url(#grass)") +
                strokeP(`M ${w * 0.5} ${-20} C ${w * 0.36} ${h * 0.28} ${w * 0.62} ${h * 0.62} ${w * 0.48} ${h + 20}`, C("sea"), 130) +
                strokeP(`M ${w * 0.5} ${-20} C ${w * 0.36} ${h * 0.28} ${w * 0.62} ${h * 0.62} ${w * 0.48} ${h + 20}`, C("skyL"), 28, 0.4) +
                `<g ${LIFT}>` +
                strokeP(`M ${w * 0.12} ${h * 0.62} Q ${w * 0.5} ${h * 0.4} ${w * 0.88} ${h * 0.62}`, C("wood"), 48) +
                strokeP(`M ${w * 0.14} ${h * 0.57} Q ${w * 0.5} ${h * 0.36} ${w * 0.86} ${h * 0.57}`, D("wood"), 10) +
                outlined("rect", `x="${w * 0.24}" y="${h * 0.56}" width="14" height="62" rx="4"`, D("wood"), 3) +
                outlined("rect", `x="${w * 0.72}" y="${h * 0.56}" width="14" height="62" rx="4"`, D("wood"), 3) +
                outlined("rect", `x="${w * 0.48}" y="${h * 0.48}" width="14" height="70" rx="4"`, D("wood"), 3) +
                `</g>` +
                outlined("ellipse", `cx="${w * 0.52}" cy="${h * 0.78}" rx="16" ry="10"`, C("glow"), 3) +
                poly(`${w * 0.56},${h * 0.78} ${w * 0.64},${h * 0.76} ${w * 0.64},${h * 0.8}`, C("glow")) +
                flower(w * 0.12, h * 0.88, 22, C("bloomY"), D("bloomY")) +
                flower(w * 0.9, h * 0.86, 22, C("bloomP"), D("bloomP"))
        );
    },
    lighthouse(w, h) {
        const x = w * 0.48;
        return svgWrap(w, h,
            defs(
                lin("sky", [[0, C("sky")], [0.4, C("rose")], [0.78, C("glow")]]) +
                    lin("sea", [[0, C("sea")], [1, D("sea")]])
            ),
            rect(0, 0, w, h * 0.68, "url(#sky)") +
                sunFace(w * 0.16, h * 0.54, 40) +
                cloud(w * 0.78, h * 0.18, 36) +
                `<g ${LIFT}>` +
                poly(`${x - 48},${h * 0.68} ${x + 48},${h * 0.68} ${x + 28},${h * 0.22} ${x - 28},${h * 0.22}`, C("cloud")) +
                `<polygon points="${x - 48},${h * 0.68} ${x + 48},${h * 0.68} ${x + 28},${h * 0.22} ${x - 28},${h * 0.22}" fill="none" stroke="${INK}" stroke-width="6"/>` +
                outlined("rect", `x="${x - 30}" y="${h * 0.5}" width="60" height="28" rx="6"`, C("roof"), 4) +
                outlined("rect", `x="${x - 26}" y="${h * 0.36}" width="52" height="24" rx="6"`, C("roof"), 4) +
                poly(`${x - 36},${h * 0.22} ${x + 36},${h * 0.22} ${x},${h * 0.1}`, C("roof")) +
                circ(x, h * 0.26, 10, C("sun")) +
                outlined("rect", `x="${w * 0.66}" y="${h * 0.54}" width="110" height="78" rx="10"`, C("stoneL"), 5) +
                poly(`${w * 0.64},${h * 0.55} ${w * 0.84},${h * 0.55} ${w * 0.74},${h * 0.46}`, C("roof")) +
                outlined("rect", `x="${w * 0.76}" y="${h * 0.6}" width="22" height="28" rx="6"`, C("glow"), 3) +
                `</g>` +
                rect(0, h * 0.68, w, h * 0.32, "url(#sea)") +
                wave(h * 0.7, w, 12, C("sun"), 0.3) +
                wave(h * 0.82, w, 10, C("cloud"), 0.2) +
                flower(w * 0.1, h * 0.9, 22, C("bloomP"), D("bloomP")) +
                flower(w * 0.92, h * 0.88, 20, C("lav"), D("lav"))
        );
    },
    pond(w, h) {
        return svgWrap(w, h,
            defs(lin("grass", [[0, C("leafL")], [1, D("leafD")]]) + rad("pond", [[0, C("sky")], [0.55, C("sea")], [1, D("sea")]])),
            rect(0, 0, w, h, "url(#grass)") +
                outlined("rect", `x="${w * 0.12}" y="${h * 0.42}" width="10" height="130" rx="5"`, C("leafD"), 3) +
                outlined("rect", `x="${w * 0.16}" y="${h * 0.38}" width="10" height="150" rx="5"`, C("leafD"), 3) +
                outlined("rect", `x="${w * 0.84}" y="${h * 0.44}" width="10" height="120" rx="5"`, C("leafD"), 3) +
                outlined("rect", `x="${w * 0.88}" y="${h * 0.4}" width="10" height="140" rx="5"`, C("leafD"), 3) +
                `<g ${LIFT}>` +
                outlined("ellipse", `cx="${w * 0.5}" cy="${h * 0.58}" rx="${w * 0.38}" ry="${h * 0.28}"`, "url(#pond)", 7) +
                strokeP(`M ${w * 0.36} ${h * 0.5} q 28 -14 56 0`, C("cloud"), 6, 0.7) +
                strokeP(`M ${w * 0.52} ${h * 0.64} q 28 -12 52 0`, C("cloud"), 5, 0.5) +
                outlined("ellipse", `cx="${w * 0.36}" cy="${h * 0.5}" rx="32" ry="18"`, C("leafL"), 4) +
                outlined("ellipse", `cx="${w * 0.62}" cy="${h * 0.64}" rx="26" ry="14"`, C("leafL"), 4) +
                `</g>` +
                flower(w * 0.36, h * 0.46, 18, C("bloomW"), C("sun")) +
                flower(w * 0.18, h * 0.86, 22, C("bloomP"), D("bloomP"))
        );
    },
    birdhouse(w, h) {
        const x = w * 0.5;
        return svgWrap(w, h,
            defs(lin("sky", [[0, C("skyL")], [1, C("sky")]]) + lin("ground", [[0, C("leafL")], [1, D("leafD")]])),
            rect(0, 0, w, h * 0.82, "url(#sky)") +
                sunFace(w * 0.16, h * 0.16, 26) +
                cloud(w * 0.78, h * 0.16, 40) +
                `<g ${LIFT}>` +
                outlined("rect", `x="${x - 12}" y="${h * 0.55}" width="24" height="150" rx="8"`, C("wood"), 5) +
                outlined("rect", `x="${x - 78}" y="${h * 0.32}" width="156" height="140" rx="16"`, C("wood"), 6) +
                poly(`${x - 96},${h * 0.34} ${x + 96},${h * 0.34} ${x},${h * 0.16}`, C("roof")) +
                `<polygon points="${x - 96},${h * 0.34} ${x + 96},${h * 0.34} ${x},${h * 0.16}" fill="none" stroke="${INK}" stroke-width="6"/>` +
                outlined("circle", `cx="${x}" cy="${h * 0.48}" r="26"`, D("woodD"), 5) +
                outlined("rect", `x="${x - 8}" y="${h * 0.54}" width="16" height="22" rx="6"`, D("woodD"), 3) +
                circ(x - 8, h * 0.46, 4, C("skyL")) +
                circ(x + 6, h * 0.46, 4, C("skyL")) +
                `</g>` +
                rect(0, h * 0.82, w, h * 0.18, "url(#ground)") +
                flower(w * 0.24, h * 0.88, 24, C("bloomP"), D("bloomP")) +
                flower(w * 0.76, h * 0.88, 24, C("bloomY"), D("bloomY"))
        );
    },
    lantern(w, h) {
        return svgWrap(w, h,
            defs(
                lin("dusk", [[0, C("ink")], [0.45, C("rose")], [1, C("glow")]]) +
                    lin("ground", [[0, C("leafD")], [1, D("leafD")]]) +
                    rad("lamp", [[0, "#fff8d0"], [1, C("sun")]])
            ),
            rect(0, 0, w, h * 0.82, "url(#dusk)") +
                circ(w * 0.18, h * 0.12, 3, C("sun"), 0.9) +
                circ(w * 0.42, h * 0.08, 2.5, C("sun"), 0.7) +
                circ(w * 0.72, h * 0.16, 3, C("sun"), 0.8) +
                circ(w * 0.88, h * 0.1, 2, C("sun"), 0.6) +
                cloud(w * 0.28, h * 0.28, 28) +
                rect(0, h * 0.82, w, h * 0.18, "url(#ground)") +
                `<g ${LIFT}>` +
                outlined("rect", `x="${w * 0.46}" y="${h * 0.42}" width="26" height="220" rx="8"`, C("wood"), 5) +
                outlined("rect", `x="${w * 0.46}" y="${h * 0.44}" width="160" height="16" rx="6"`, C("wood"), 4) +
                circ(w * 0.7, h * 0.6, 78, C("glow"), 0.35, SOFT) +
                outlined("rect", `x="${w * 0.62}" y="${h * 0.52}" width="72" height="78" rx="14"`, "url(#lamp)", 5) +
                outlined("rect", `x="${w * 0.61}" y="${h * 0.5}" width="80" height="14" rx="6"`, D("wood"), 4) +
                spark(w * 0.66, h * 0.56, 18, 8) +
                `</g>`
        );
    },
    glass(w, h) {
        const x = w * 0.5;
        const y = h * 0.5;
        return svgWrap(w, h,
            defs(lin("woodG", [[0, C("wood")], [1, D("wood")]])),
            rect(0, 0, w, h, "url(#woodG)") +
                poly(`0,0 90,0 0,90`, D("wood"), 0.45) +
                poly(`${w},0 ${w - 90},0 ${w},90`, D("wood"), 0.45) +
                poly(`0,${h} 90,${h} 0,${h - 90}`, D("wood"), 0.45) +
                poly(`${w},${h} ${w - 90},${h} ${w},${h - 90}`, D("wood"), 0.45) +
                `<g ${LIFT} transform="translate(${x},${y})">` +
                outlined("circle", `cx="0" cy="0" r="210"`, C("lav"), 8) +
                outlined("circle", `cx="0" cy="0" r="164"`, C("sea"), 7) +
                outlined("circle", `cx="0" cy="0" r="118"`, C("sun"), 6) +
                outlined("circle", `cx="0" cy="0" r="74"`, C("bloomP"), 5) +
                outlined("circle", `cx="0" cy="0" r="34"`, C("sun"), 4) +
                spark(-40, -50, 48, 18) +
                `</g>`
        );
    },
    cathedral(w, h) {
        const x = w * 0.5;
        return svgWrap(w, h,
            defs(
                lin("sky", [[0, C("skyL")], [1, C("sky")]]) +
                    rad("dome", [[0, "#fff6d0"], [0.55, C("sun")], [1, D("sun")]])
            ),
            rect(0, 0, w, h * 0.82, "url(#sky)") +
                cloud(w * 0.16, h * 0.16, 28) +
                cloud(w * 0.84, h * 0.14, 24) +
                sunFace(w * 0.12, h * 0.22, 18) +
                `<g ${LIFT}>` +
                outlined("rect", `x="${w * 0.08}" y="${h * 0.56}" width="${w * 0.84}" height="${h * 0.26}" rx="8"`, C("stone"), 6) +
                outlined("rect", `x="${x - 55}" y="${h * 0.38}" width="110" height="120" rx="10"`, C("stoneL"), 5) +
                outlined("circle", `cx="${x}" cy="${h * 0.38}" r="72"`, "url(#dome)", 6) +
                outlined("circle", `cx="${w * 0.22}" cy="${h * 0.5}" r="42"`, "url(#dome)", 5) +
                outlined("circle", `cx="${w * 0.78}" cy="${h * 0.5}" r="42"`, "url(#dome)", 5) +
                outlined("rect", `x="${w * 0.2}" y="${h * 0.62}" width="32" height="78" rx="16"`, C("glow"), 4) +
                outlined("rect", `x="${w * 0.62}" y="${h * 0.62}" width="32" height="78" rx="16"`, C("glow"), 4) +
                outlined("rect", `x="${x - 28}" y="${h * 0.64}" width="56" height="100" rx="22"`, C("wood"), 5) +
                outlined("rect", `x="${x - 6}" y="${h * 0.18}" width="12" height="48" rx="4"`, C("sun"), 3) +
                `</g>` +
                outlined("rect", `x="0" y="${h * 0.82}" width="${w}" height="${h * 0.18}"`, C("stoneL"), 0)
        );
    },
    night(w, h) {
        return svgWrap(w, h,
            defs(lin("night", [[0, D("ink")], [1, C("ink")]]) + rad("moon", [[0, "#fffdf0"], [0.65, C("sun")], [1, D("sun")]])),
            rect(0, 0, w, h, "url(#night)") +
                circ(w * 0.2, h * 0.18, 70, C("sun"), 0.18, SOFT) +
                `<g ${LIFT}>` +
                outlined("circle", `cx="${w * 0.2}" cy="${h * 0.18}" r="48"`, "url(#moon)", 5) +
                circ(w * 0.16, h * 0.14, 10, D("sun"), 0.28) +
                circ(w * 0.24, h * 0.22, 7, D("sun"), 0.22) +
                circ(w * 0.18, h * 0.23, 5, D("sun"), 0.2) +
                circ(w * 0.16, h * 0.16, 4, D("woodD")) +
                circ(w * 0.24, h * 0.16, 4, D("woodD")) +
                strokeP(`M ${w * 0.16} ${h * 0.22} Q ${w * 0.2} ${h * 0.25} ${w * 0.24} ${h * 0.22}`, D("woodD"), 3) +
                `</g>` +
                circ(w * 0.48, h * 0.1, 3, C("sun"), 0.9) +
                circ(w * 0.62, h * 0.2, 2.5, C("sun"), 0.7) +
                circ(w * 0.8, h * 0.12, 3, C("sun"), 0.85) +
                circ(w * 0.9, h * 0.28, 2, C("sun"), 0.6) +
                circ(w * 0.7, h * 0.34, 2.5, C("sun"), 0.7) +
                hill(w * 0.18, h * 0.82, 140, 70, C("leafD")) +
                hill(w * 0.5, h * 0.86, 180, 80, D("leafD")) +
                hill(w * 0.82, h * 0.84, 150, 72, C("leafD")) +
                flower(w * 0.16, h * 0.9, 16, C("lav"), D("lav")) +
                flower(w * 0.32, h * 0.93, 14, C("lav"), D("lav")) +
                flower(w * 0.58, h * 0.9, 16, C("lav"), D("lav")) +
                flower(w * 0.84, h * 0.92, 15, C("lav"), D("lav"))
        );
    }
};

function autoArt(level, w, h) {
    const body = level.pieces.map((p) =>
        rect(p.x * 100, p.y * 100, p.w * 100, p.h * 100, C(p.color), 12)
    );
    return svgWrap(w, h, "", body.join(""));
}

const cache = new Map();

const PAINTINGS = {
    dawn: "img/paintings/dawn.jpg?v=14"
};

export function artBackground(level) {
    if (PAINTINGS[level.id]) {
        return `url("${PAINTINGS[level.id]}")`;
    }
    if (!cache.has(level.id)) {
        const w = level.cols * 100;
        const h = level.rows * 100;
        const painter = ART[level.id];
        const svg = painter ? painter(w, h) : autoArt(level, w, h);
        cache.set(
            level.id,
            `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, "%27")}")`
        );
    }
    return cache.get(level.id);
}

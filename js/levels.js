export const COLORS = {
    skyL: { c: "#d4eef8", d: "#9ecce4", name: "Небо светлое" },
    sky: { c: "#7eb6d9", d: "#4a8fbd", name: "Небо" },
    skyD: { c: "#3d6fa0", d: "#2a4f78", name: "Глубь" },
    goldL: { c: "#ffe9a8", d: "#e8c36a", name: "Свет" },
    gold: { c: "#e8c36a", d: "#c4922a", name: "Золото" },
    goldD: { c: "#c4922a", d: "#8d6a3a", name: "Бронза" },
    roseL: { c: "#f4b4a4", d: "#e07a5f", name: "Румянец" },
    rose: { c: "#e07a5f", d: "#c45c45", name: "Коралл" },
    roseD: { c: "#c45c45", d: "#8d3a32", name: "Вино" },
    leafL: { c: "#b5de9a", d: "#7cbc6e", name: "Мята" },
    leaf: { c: "#7cbc6e", d: "#4f9a4a", name: "Лист" },
    leafD: { c: "#4f9a4a", d: "#2f6b38", name: "Лес" },
    peach: { c: "#f0b27a", d: "#d4844a", name: "Персик" },
    wood: { c: "#c4a06a", d: "#8d6a3a", name: "Дерево" },
    lilac: { c: "#c49ad4", d: "#9b6fb3", name: "Сирень" },
    ink: { c: "#5a4a62", d: "#3a2a42", name: "Чернила" },
    foam: { c: "#f4efe6", d: "#d8cfc2", name: "Пена" }
};

function g(...rows) {
    return rows.map((row) => row.trim().split(/\s+/));
}

function piece(cell) {
    if (typeof cell === "string") return { color: cell, w: 1, h: 1 };
    return { color: cell.c, w: cell.w || 1, h: cell.h || 1 };
}

function tessellate(grid) {
    return grid.map((row) => {
        const out = [];
        for (let i = 0; i < row.length; ) {
            if (i + 1 < row.length && row[i] === row[i + 1]) {
                out.push({ c: row[i], w: 2 });
                i += 2;
            } else {
                out.push(row[i]);
                i += 1;
            }
        }
        return out;
    });
}

function level(id, title, grid, deal = 2) {
    const cols = grid[0].length;
    if (grid.some((row) => row.length !== cols)) {
        throw new Error(`Uneven grid: ${id}`);
    }
    const tess = tessellate(grid);
    const pieces = tess.flat().map(piece);
    for (const row of tess) {
        const width = row.reduce((n, cell) => n + piece(cell).w, 0);
        if (width !== cols) throw new Error(`Bad tessellation: ${id}`);
    }
    return { id, title, rows: grid.length, cols, grid: tess, pieces, deal };
}

export const LEVELS = [
    level("dawn", "Заря", g(
        "skyL goldL gold  gold  skyL",
        "sky  goldL gold  roseL sky",
        "leafL leaf gold  leaf  leafL",
        "leaf  leaf leaf  leaf  leaf"
    ), 1),
    level("garden", "Сад", g(
        "sky   sky   sky   sky   sky",
        "leafL rose  leafL rose  leafL",
        "leaf  roseD leaf  rose  leaf",
        "leafD leaf  wood  leaf  leafD"
    ), 1),
    level("window", "Окно", g(
        "wood wood wood  wood wood",
        "wood foam sky   foam wood",
        "wood foam goldL foam wood",
        "wood wood wood  wood wood"
    ), 1),
    level("sea", "Море", g(
        "skyL  sky   foam  goldL foam  sky",
        "sky   sky   foam  gold  foam  sky",
        "sky   foam  foam  peach foam  foam",
        "skyD  skyD  foam  peach foam  skyD",
        "leafD leaf  leaf  leaf  leaf  leaf"
    ), 1),
    level("house", "Дом", g(
        "sky   sky   peach peach sky   sky",
        "sky   peach peach peach peach sky",
        "peach foam  peach foam  peach peach",
        "peach peach wood  peach peach peach",
        "leaf  leaf  peach leaf  leaf  leaf"
    ), 1),
    level("lantern", "Фонарь", g(
        "skyD sky  sky   sky   sky  skyD",
        "sky  sky  goldL gold  sky  sky",
        "sky  sky  gold  peach sky  sky",
        "sky  sky  peach peach sky  sky",
        "leaf leaf peach leaf  leaf leaf"
    ), 2),
    level("bird", "Птица", g(
        "sky  sky  sky   rose sky   sky",
        "sky  rose roseD rose goldL sky",
        "sky  sky  rose  rose sky   sky",
        "sky  sky  wood  leaf sky   sky",
        "leaf leaf leaf  leaf leaf  leaf"
    ), 2),
    level("crown", "Корона", g(
        "sky   gold  goldL gold  goldL sky",
        "sky   gold  lilac gold  lilac sky",
        "gold  gold  gold  gold  gold  gold",
        "peach peach peach peach peach peach",
        "leaf  leaf  leaf  leaf  leaf  leaf"
    ), 2),
    level("fountain", "Фонтан", g(
        "sky  sky  sky   foam  sky  sky",
        "sky  sky  foam  gold  foam sky",
        "sky  foam foam  gold  foam foam",
        "leaf foam peach peach foam leaf",
        "leaf leaf peach peach leaf leaf"
    ), 2),
    level("castle", "Замок", g(
        "sky   gold  sky   sky   gold  sky",
        "peach peach peach peach peach peach",
        "peach foam  peach foam  peach peach",
        "peach peach peach peach peach peach",
        "leaf  leaf  peach peach leaf  leaf"
    ), 2),
    level("vine", "Лоза", g(
        "peach leafL peach leafL peach peach",
        "peach rose  leaf  peach rose  leafL",
        "peach leafL peach rose  peach leaf",
        "peach peach leafL peach peach peach",
        "leaf  leaf  leaf  leaf  leaf  leaf"
    ), 2),
    level("bridge", "Мост", g(
        "sky   sky  sky   sky   sky  sky",
        "sky   sky  goldL sky   sky  sky",
        "wood  wood wood  wood  wood wood",
        "skyD  wood skyD  skyD  wood skyD",
        "leaf  leaf skyD  skyD  leaf leaf"
    ), 2),
    level("glass", "Витраж", g(
        "gold gold  gold  gold gold  gold  gold",
        "gold sky   lilac sky  lilac sky   gold",
        "gold lilac rose  gold rose  lilac gold",
        "gold sky   gold  rose gold  sky   gold",
        "gold gold  gold  gold gold  gold  gold"
    ), 2),
    level("festival", "Праздник", g(
        "sky   gold  sky   gold  sky   gold  sky",
        "rose  sky   gold  sky   lilac sky   rose",
        "peach sky   rose  sky   peach sky   gold",
        "sky   sky   sky   sky   sky   sky   sky",
        "leaf  leaf  leaf  leaf  leaf  leaf  leaf"
    ), 2),
    level("roses", "Розарий", g(
        "sky   sky   sky   sky   sky   sky   sky",
        "leafL rose  leaf  rose  leafL rose  leaf",
        "leaf  roseD leafL rose  roseD leaf  rose",
        "leafL rose  leaf  rose  leaf  rose  leafL",
        "leaf  leafD wood  wood  leafD leaf  leaf"
    ), 2),
    level("palace", "Дворец", g(
        "sky   goldL sky   gold  sky   goldL sky",
        "gold  peach peach gold  peach peach gold",
        "peach foam  peach peach peach foam  peach",
        "gold  peach wood  peach wood  peach gold",
        "leaf  leaf  peach peach peach leaf  leaf"
    ), 2),
    level("night", "Ночь", g(
        "ink   ink   goldL ink   goldL ink   ink",
        "ink   goldL ink   ink   ink   goldL ink",
        "ink   ink   ink   gold  ink   ink   ink",
        "leafD ink   lilac ink   lilac ink   leafD",
        "leaf  leaf  leafD leaf  leafD leaf  leaf"
    ), 2),
    level("stars", "Созвездие", g(
        "ink   goldL ink   ink   goldL ink   goldL",
        "ink   ink   gold  ink   ink   gold  ink",
        "goldL ink   ink   goldL ink   ink   ink",
        "ink   gold  ink   ink   ink   goldL ink",
        "leafD leaf  leafD gold  leafD leaf  leaf"
    ), 2)
];

export function tilesFor(level) {
    const deck = [];
    for (const p of level.pieces) {
        deck.push(p.color, p.color, p.color);
    }
    return deck;
}

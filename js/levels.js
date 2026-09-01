export const COLORS = {
    rose: { c: "#e07a5f", d: "#c45c45", name: "Коралл" },
    gold: { c: "#e8c36a", d: "#c4922a", name: "Золото" },
    leaf: { c: "#7cbc6e", d: "#4f9a4a", name: "Лист" },
    sky: { c: "#7eb6d9", d: "#4a8fbd", name: "Небо" },
    lilac: { c: "#c49ad4", d: "#9b6fb3", name: "Сирень" },
    peach: { c: "#f0b27a", d: "#d4844a", name: "Персик" }
};

function level(id, title, grid, deal = 2) {
    return {
        id,
        title,
        rows: grid.length,
        cols: grid[0].length,
        grid,
        deal
    };
}

export const LEVELS = [
    level("dawn", "Заря", [
        ["sky", "sky", "sky", "gold"],
        ["rose", "rose", "gold", "gold"],
        ["leaf", "leaf", "leaf", "rose"]
    ], 1),
    level("garden", "Сад", [
        ["leaf", "rose", "rose", "leaf"],
        ["leaf", "rose", "gold", "leaf"],
        ["leaf", "leaf", "leaf", "leaf"]
    ], 1),
    level("window", "Окно", [
        ["gold", "sky", "sky", "gold"],
        ["sky", "lilac", "lilac", "sky"],
        ["gold", "sky", "sky", "gold"]
    ], 1),
    level("sea", "Море", [
        ["sky", "sky", "sky", "sky"],
        ["sky", "gold", "gold", "sky"],
        ["leaf", "leaf", "leaf", "leaf"]
    ], 1),
    level("house", "Дом", [
        ["peach", "gold", "gold", "peach"],
        ["rose", "peach", "peach", "rose"],
        ["leaf", "leaf", "leaf", "leaf"]
    ], 1),
    level("lantern", "Фонарь", [
        ["sky", "gold", "gold", "sky"],
        ["sky", "gold", "peach", "sky"],
        ["peach", "peach", "peach", "peach"]
    ], 2),
    level("bird", "Птица", [
        ["sky", "sky", "sky", "sky"],
        ["sky", "rose", "rose", "gold"],
        ["leaf", "leaf", "leaf", "leaf"]
    ], 2),
    level("crown", "Корона", [
        ["gold", "lilac", "gold", "lilac"],
        ["gold", "gold", "gold", "gold"],
        ["peach", "peach", "peach", "peach"]
    ], 2),
    level("fountain", "Фонтан", [
        ["sky", "sky", "gold", "sky"],
        ["sky", "gold", "gold", "sky"],
        ["leaf", "leaf", "leaf", "leaf"]
    ], 2),
    level("castle", "Замок", [
        ["peach", "gold", "gold", "peach"],
        ["peach", "sky", "sky", "peach"],
        ["leaf", "leaf", "leaf", "leaf"]
    ], 2),
    level("vine", "Лоза", [
        ["leaf", "gold", "leaf", "gold"],
        ["leaf", "rose", "leaf", "rose"],
        ["leaf", "leaf", "leaf", "leaf"]
    ], 2),
    level("bridge", "Мост", [
        ["sky", "sky", "sky", "sky"],
        ["peach", "gold", "gold", "peach"],
        ["leaf", "leaf", "gold", "leaf"]
    ], 2),
    level("glass", "Витраж", [
        ["gold", "sky", "lilac", "gold"],
        ["sky", "rose", "rose", "sky"],
        ["lilac", "leaf", "leaf", "lilac"],
        ["gold", "sky", "lilac", "gold"]
    ], 2),
    level("festival", "Праздник", [
        ["rose", "gold", "gold", "rose"],
        ["peach", "lilac", "lilac", "peach"],
        ["sky", "gold", "gold", "sky"],
        ["leaf", "leaf", "leaf", "leaf"]
    ], 2),
    level("roses", "Розарий", [
        ["leaf", "rose", "rose", "leaf"],
        ["rose", "gold", "gold", "rose"],
        ["rose", "gold", "gold", "rose"],
        ["leaf", "leaf", "leaf", "leaf"]
    ], 2),
    level("palace", "Дворец", [
        ["gold", "peach", "peach", "gold"],
        ["sky", "lilac", "lilac", "sky"],
        ["sky", "lilac", "lilac", "sky"],
        ["gold", "leaf", "leaf", "gold"]
    ], 2),
    level("night", "Ночь", [
        ["sky", "lilac", "sky", "lilac"],
        ["lilac", "gold", "gold", "sky"],
        ["sky", "gold", "gold", "lilac"],
        ["leaf", "leaf", "leaf", "leaf"]
    ], 2),
    level("stars", "Созвездие", [
        ["sky", "gold", "lilac", "sky"],
        ["peach", "sky", "gold", "lilac"],
        ["lilac", "rose", "sky", "peach"],
        ["leaf", "leaf", "gold", "leaf"]
    ], 2)
];

export function tilesFor(level) {
    const deck = [];
    for (const color of level.grid.flat()) {
        deck.push(color, color, color);
    }
    return deck;
}

import { createLevel as level } from "./levels.js?v=55";

function g(...rows) {
    return rows.map((row) => row.trim().split(/\s+/));
}

export const HW_LEVELS = [
    level("hwjack", "Фонарик", g(
        "ink   ink   ink   ink   ink",
        "ink   glow  sun   glow  ink",
        "leafD glow  glow  glow  leafD",
        "wood  wood  wood  wood  wood"
    ), 2, 4),
    level("hwcat", "Кот", g(
        "ink   sun   ink   sun   ink",
        "ink   lav   ink   lav   ink",
        "leafD leaf  leaf  leaf  leafD",
        "wood  wood  wood  wood  wood"
    ), 2, 4),
    level("hwmoon", "Луна", g(
        "ink   ink   sun   ink   ink   ink",
        "ink   sun   sun   sun   ink   ink",
        "lav   ink   ink   ink   lav   ink",
        "leafD leaf  leaf  leaf  leaf  leafD"
    ), 2, 4),
    level("hwcandy", "Конфеты", g(
        "wood  wood  wood  wood  wood",
        "glow  sun   bloomP lav   glow",
        "porcelain porcelain porcelain porcelain porcelain",
        "leafD leaf  leaf  leaf  leafD"
    ), 2, 4),
    level("hwhat", "Шляпа", g(
        "ink   ink   ink   ink   ink",
        "ink   lav   ink   lav   ink",
        "wood  wood  wood  wood  wood",
        "leaf  bloomY leaf  bloomY leaf"
    ), 2, 4),
    level("hwweb", "Паутина", g(
        "cloud cloud ink   cloud cloud",
        "ink   stoneL ink   stoneL ink",
        "leafD leaf  leafD leaf  leafD",
        "wood  wood  wood  wood  wood"
    ), 2, 4),
    level("hwcauldron", "Котёл", g(
        "ink   lav   ink   lav   ink",
        "stone glow  glow  glow  stone",
        "stone stone stone stone stone",
        "woodD wood  wood  wood  woodD"
    ), 2, 4),
    level("hwtreat", "Мешок", g(
        "sky   sky   sky   sky   sky",
        "glow  bloomY glow  bloomP glow",
        "wood  wood  wood  wood  wood",
        "leaf  leafL leaf  leafL leaf"
    ), 2, 4),
    level("hwhouse", "Домик", g(
        "ink   ink   ink   ink   ink   ink",
        "roof  roof  roof  roof  roof  roof",
        "wood  glow  wood  glow  wood  wood",
        "leafD leaf  leaf  leaf  leaf  leafD"
    ), 2, 4),
    level("hwowl", "Сова", g(
        "ink   sun   ink   sun   ink",
        "woodD lav   ink   lav   woodD",
        "leaf  leaf  leaf  leaf  leaf",
        "wood  wood  wood  wood  wood"
    ), 2, 4),
    level("hwpotion", "Зелье", g(
        "ink   ink   lav   ink   ink",
        "stoneL bloomL bloomL bloomL stoneL",
        "stone porcelain porcelain porcelain stone",
        "wood  wood  wood  wood  wood"
    ), 2, 4),
    level("hwmask", "Маска", g(
        "glow  glow  sun   glow  glow",
        "ink   cloud ink   cloud ink",
        "wood  wood  wood  wood  wood",
        "leafD leaf  leaf  leaf  leafD"
    ), 2, 4),
    level("hwgrave", "Холмик", g(
        "ink   ink   ink   ink   ink",
        "stoneL stone stone stone stoneL",
        "leaf  leafD leaf  leafD leaf",
        "leafD leaf  leaf  leaf  leafD"
    ), 2, 4),
    level("hwcorn", "Зёрнышки", g(
        "leaf  leafL leaf  leafL leaf",
        "sun   glow  sun   glow  sun",
        "wood  wood  wood  wood  wood",
        "stoneL stone stone stone stoneL"
    ), 2, 4),
    level("hwghost", "Печенька", g(
        "ink   ink   ink   ink   ink",
        "cloud cloud cloud cloud cloud",
        "cloud lav   cloud lav   cloud",
        "wood  wood  wood  wood  wood"
    ), 2, 4),
    level("hwbroom", "Метла", g(
        "sky   sky   sky   sky   sky",
        "wood  wood  wood  wood  wood",
        "leaf  leafL leaf  leafL leaf",
        "leafD leaf  leaf  leaf  leafD"
    ), 2, 4),
    level("hwcandle", "Свеча", g(
        "ink   ink   sun   ink   ink",
        "ink   glow  glow  glow  ink",
        "wood  wood  wood  wood  wood",
        "stone stoneL stone stoneL stone"
    ), 2, 4),
    level("hwbat", "Летучие", g(
        "ink   ink   ink   ink   ink   ink",
        "ink   lav   sun   lav   ink   ink",
        "leafD leaf  leaf  leaf  leaf  leafD",
        "wood  wood  wood  wood  wood  wood"
    ), 2, 4)
];

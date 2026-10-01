import { createLevel as level } from "./levels.js?v=48";

function g(...rows) {
    return rows.map((row) => row.trim().split(/\s+/));
}

export const OCT_LEVELS = [
    level("oct01", "Клён", g(
        "sky   sky   sky   sky   sky",
        "glow  leaf  glow  leaf  glow",
        "leaf  leafD leaf  leafD leaf",
        "wood  wood  wood  wood  wood"
    ), 2, 3),
    level("oct02", "Лужи", g(
        "skyL  cloud sky   cloud skyL",
        "leaf  sea   leaf  sea   leaf",
        "sea   sea   stoneL sea  sea",
        "leafD leaf  leaf  leaf  leafD"
    ), 2, 3),
    level("oct03", "Урожай", g(
        "leaf  leafL leaf  leafL leaf  leaf",
        "glow  sun   glow  sun   glow  leaf",
        "wood  wood  wood  wood  wood  wood",
        "stone stoneL stone stoneL stone stone"
    ), 2, 3),
    level("oct04", "Тыква", g(
        "leaf  leaf  leaf  leaf  leaf",
        "leaf  glow  sun   glow  leaf",
        "leaf  glow  glow  glow  leaf",
        "leafD leaf  wood  leaf  leafD"
    ), 2, 3),
    level("oct05", "Каштан", g(
        "sky   sky   sky   sky   sky",
        "leafL leaf  leafD leaf  leafL",
        "leaf  woodD wood  woodD leaf",
        "stoneL stone stone stone stoneL"
    ), 2, 3),
    level("oct06", "Туман", g(
        "cloud cloud skyL  cloud cloud",
        "skyL  stoneL stoneL skyL skyL",
        "leaf  leafL leaf  leafL leaf",
        "leafD leaf  leaf  leaf  leafD"
    ), 2, 3),
    level("oct07", "Грибы", g(
        "leaf  leafL leaf  leafL leaf",
        "wood  stoneL wood  stoneL wood",
        "leafD glow  leafD sun   leafD",
        "leaf  leaf  leaf  leaf  leaf"
    ), 2, 3),
    level("oct08", "Рябина", g(
        "sky   sky   sky   sky   sky   sky",
        "leaf  glow  leaf  glow  leaf  glow",
        "leafL leaf  leafL leaf  leafL leaf",
        "wood  wood  wood  wood  wood  wood"
    ), 2, 3),
    level("oct09", "Ветер", g(
        "skyL  cloud cloud sky   skyL",
        "cloud leaf  leafL leaf  cloud",
        "leaf  leafD leaf  leafD leaf",
        "stone stoneL stone stoneL stone"
    ), 2, 3),
    level("oct10", "Корзина", g(
        "leafL leaf  leafL leaf  leafL",
        "wood  wood  wood  wood  wood",
        "glow  sun   glow  bloomY glow",
        "leaf  leafD leaf  leafD leaf"
    ), 2, 3),
    level("oct11", "Паутина", g(
        "ink   cloud ink   cloud ink",
        "cloud stoneL cloud stoneL cloud",
        "leafD leaf  leafD leaf  leafD",
        "wood  wood  wood  wood  wood"
    ), 2, 3),
    level("oct12", "Свеча", g(
        "ink   ink   sun   ink   ink",
        "ink   glow  glow  glow  ink",
        "wood  wood  wood  wood  wood",
        "stone stoneL stone stoneL stone"
    ), 2, 3),
    level("oct13", "Пирог", g(
        "wood  wood  wood  wood  wood",
        "glow  sun   glow  sun   glow",
        "stoneL porcelain porcelain porcelain stoneL",
        "woodD wood  wood  wood  woodD"
    ), 2, 3),
    level("oct14", "Жёлудь", g(
        "leaf  leafL leaf  leafL leaf",
        "leafD woodD wood  woodD leafD",
        "leaf  wood  wood  wood  leaf",
        "stone stoneL stone stoneL stone"
    ), 2, 3),
    level("oct15", "Парк", g(
        "sky   sky   sky   sky   sky   sky",
        "leaf  wood  wood  wood  wood  leaf",
        "leafL sea   sea   sea   sea  leafL",
        "leaf  leafD leaf  leaf  leafD leaf"
    ), 2, 3),
    level("oct16", "Шарф", g(
        "rose  rose  lav   lav   rose",
        "wood  wood  wood  wood  wood",
        "leaf  leafL leaf  leafL leaf",
        "stoneL stone stone stone stoneL"
    ), 2, 3),
    level("oct17", "Мёд", g(
        "wood  wood  wood  wood  wood",
        "sun   glow  sun   glow  sun",
        "porcelain azure porcelain azure porcelain",
        "leafD leaf  leaf  leaf  leafD"
    ), 2, 3),
    level("oct18", "Ливень", g(
        "ink   sky   ink   sky   ink",
        "sea   sea   sea   sea   sea",
        "stone stoneL stone stoneL stone",
        "leafD leaf  leaf  leaf  leafD"
    ), 2, 3),
    level("oct19", "Фонари", g(
        "ink   glow  ink   glow  ink   ink",
        "wood  wood  wood  wood  wood  wood",
        "leaf  leafL leaf  leafL leaf  leaf",
        "stoneL stone stone stone stone stoneL"
    ), 2, 3),
    level("oct20", "Яблоки", g(
        "leafL leaf  leafL leaf  leafL",
        "roof  leaf  roof  leaf  roof",
        "leaf  leafD leaf  leafD leaf",
        "wood  wood  wood  wood  wood"
    ), 2, 3),
    level("oct21", "Гнездо", g(
        "sky   sky   sky   sky   sky",
        "leaf  woodD wood  woodD leaf",
        "leafL wood  wood  wood  leafL",
        "leaf  leaf  leaf  leaf  leaf"
    ), 2, 3),
    level("oct22", "Крыша", g(
        "sky   sky   sky   sky   sky   sky",
        "roof  roof  roof  roof  roof  roof",
        "stone stone glow  glow  stone stone",
        "leaf  leafL leaf  leaf  leafL leaf"
    ), 2, 3),
    level("oct23", "Лавка", g(
        "leaf  leafL leaf  leafL leaf",
        "wood  wood  wood  wood  wood",
        "stoneL stone stone stone stoneL",
        "leafD leaf  leaf  leaf  leafD"
    ), 2, 3),
    level("oct24", "Окно", g(
        "wood  wood  wood  wood  wood",
        "wood  skyL  sky   skyL  wood",
        "wood  leaf  glow  leaf  wood",
        "woodD wood  wood  wood  woodD"
    ), 2, 3),
    level("oct25", "Костёр", g(
        "ink   ink   ink   ink   ink",
        "ink   glow  sun   glow  ink",
        "wood  woodD wood  woodD wood",
        "stone stoneL stone stoneL stone"
    ), 2, 3),
    level("oct26", "Сова", g(
        "ink   sun   ink   sun   ink",
        "leafD lav   ink   lav   leafD",
        "leaf  leaf  leaf  leaf  leaf",
        "wood  wood  wood  wood  wood"
    ), 2, 3),
    level("oct27", "Кувшин", g(
        "leafL leaf  leafL leaf  leafL",
        "stoneL azure azure azure stoneL",
        "stone porcelain porcelain porcelain stone",
        "wood  wood  wood  wood  wood"
    ), 2, 3),
    level("oct28", "Шторм", g(
        "ink   sky   ink   sky   ink   sky",
        "sea   sea   sea   sea   sea   sea",
        "wood  wood  cloud cloud wood  wood",
        "sea   glow  sea   sea   glow  sea"
    ), 2, 3),
    level("oct29", "Зонт", g(
        "sky   sky   ink   sky   sky",
        "rose  rose  rose  rose  rose",
        "wood  wood  wood  wood  wood",
        "stoneL stone stone stone stoneL"
    ), 2, 3),
    level("oct30", "Закат в парке", g(
        "glow  glow  sun   glow  glow",
        "leaf  leafL leaf  leafL leaf",
        "wood  wood  wood  wood  wood",
        "leafD leaf  leaf  leaf  leafD"
    ), 2, 3),
    level("oct31", "Светильник", g(
        "ink   ink   ink   ink   ink",
        "ink   sun   glow  sun   ink",
        "wood  glow  glow  glow  wood",
        "leafD leaf  woodD leaf  leafD"
    ), 2, 3)
];

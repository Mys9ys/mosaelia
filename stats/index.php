<?php
date_default_timezone_set("Europe/Moscow");

$configFile = __DIR__ . "/config.php";
if (!is_file($configFile)) {
    http_response_code(500);
    echo "Нет stats/config.php — скопируй config.example.php и задай key.";
    exit;
}

$config = require $configFile;
$key = (string) ($config["key"] ?? "");
$given = (string) ($_GET["k"] ?? "");
if ($key === "" || !hash_equals($key, $given)) {
    http_response_code(403);
    header("Content-Type: text/html; charset=utf-8");
    echo "<!DOCTYPE html><meta charset='utf-8'><title>Статистика</title>";
    echo "<body style='font:16px/1.4 Georgia,serif;background:#f6efe4;color:#3a2a22;padding:48px'>";
    echo "<p>Нужен ключ. Открой <code>/stats/?k=…</code></p></body>";
    exit;
}

$lines = [];
$log = __DIR__ . "/data/events.jsonl";
if (is_file($log)) {
    $lines = file($log, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
}

$events = [];
foreach ($lines as $line) {
    $row = json_decode($line, true);
    if (is_array($row) && !empty($row["id"]) && !empty($row["ev"])) {
        $events[] = $row;
    }
}

$titles = [
    "dawn" => "Заря",
    "garden" => "Сад",
    "window" => "Окно",
    "sea" => "Море",
    "house" => "Дом",
    "lantern" => "Фонарь",
    "bird" => "Птица",
    "crown" => "Корона",
    "fountain" => "Фонтан",
    "castle" => "Замок",
    "vine" => "Лоза",
    "bridge" => "Мост",
    "glass" => "Витраж",
    "festival" => "Праздник",
    "roses" => "Розарий",
    "palace" => "Дворец",
    "night" => "Ночь",
    "stars" => "Созвездие",
];

function day_key(int $ms): string
{
    return date("Y-m-d", (int) floor($ms / 1000));
}

$players = [];
$launches = 0;
$completes = 0;
$firstCompletes = 0;
$byLevel = [];
$byDay = [];
$byPlatform = [];

foreach ($events as $row) {
    $id = $row["id"];
    $t = (int) ($row["t"] ?? 0);
    $day = $t > 0 ? day_key($t) : "unknown";
    if (!isset($players[$id])) {
        $players[$id] = [
            "first" => $t,
            "last" => $t,
            "days" => [],
            "launches" => 0,
            "completes" => 0,
            "firstCompletes" => 0,
        ];
    }
    $p = &$players[$id];
    if ($t && (!$p["first"] || $t < $p["first"])) {
        $p["first"] = $t;
    }
    if ($t > $p["last"]) {
        $p["last"] = $t;
    }
    if ($day !== "unknown") {
        $p["days"][$day] = true;
    }
    if (!isset($byDay[$day])) {
        $byDay[$day] = ["launches" => 0, "players" => [], "completes" => 0, "new" => 0, "returning" => 0];
    }

    if ($row["ev"] === "launch") {
        $launches++;
        $p["launches"]++;
        $byDay[$day]["launches"]++;
        $byDay[$day]["players"][$id] = true;
        $plat = $row["p"] ?: "unknown";
        $byPlatform[$plat] = ($byPlatform[$plat] ?? 0) + 1;
    }
    if ($row["ev"] === "complete") {
        $completes++;
        $p["completes"]++;
        $byDay[$day]["completes"]++;
        $level = $row["level"] ?: "unknown";
        $byLevel[$level] = ($byLevel[$level] ?? 0) + 1;
        if (!empty($row["first"])) {
            $firstCompletes++;
            $p["firstCompletes"]++;
        }
    }
    unset($p);
}

foreach ($players as $id => $p) {
    $firstDay = $p["first"] ? day_key($p["first"]) : "";
    foreach (array_keys($p["days"]) as $day) {
        if (!isset($byDay[$day])) {
            continue;
        }
        if ($day === $firstDay) {
            $byDay[$day]["new"]++;
        } else {
            $byDay[$day]["returning"]++;
        }
    }
}

$unique = count($players);
$returning = 0;
$withPicture = 0;
$d1den = 0;
$d1num = 0;
$d7den = 0;
$d7num = 0;
$today = date("Y-m-d");
$todayMs = strtotime($today . " 00:00:00");

foreach ($players as $p) {
    if (count($p["days"]) >= 2) {
        $returning++;
    }
    if ($p["firstCompletes"] > 0 || $p["completes"] > 0) {
        $withPicture++;
    }
    if (!$p["first"]) {
        continue;
    }
    $firstDay = strtotime(day_key($p["first"]) . " 00:00:00");
    $daysAlive = (int) floor(($todayMs - $firstDay) / 86400);
    $daySet = $p["days"];
    if ($daysAlive >= 1) {
        $d1den++;
        $need = date("Y-m-d", $firstDay + 86400);
        if (!empty($daySet[$need])) {
            $d1num++;
        }
    }
    if ($daysAlive >= 7) {
        $d7den++;
        $need = date("Y-m-d", $firstDay + 7 * 86400);
        if (!empty($daySet[$need])) {
            $d7num++;
        }
    }
}

ksort($byDay);
$byDay = array_slice($byDay, -14, 14, true);
$maxBar = 1;
foreach ($byDay as $d) {
    $maxBar = max($maxBar, $d["launches"], count($d["players"]));
}
arsort($byLevel);

function pct(?int $num, ?int $den): string
{
    if (!$den) {
        return "—";
    }
    return round(100 * $num / $den) . "%";
}

$h = static fn(string $s): string => htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8");
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Мозаэлия — статистика</title>
    <style>
        :root { --ink:#3a2a22; --muted:#7a5a3a; --cream:#f6efe4; --gold:#c9a46a; --coral:#e07a5f; }
        * { box-sizing: border-box; }
        body { margin: 0; font: 16px/1.45 system-ui, sans-serif; color: var(--ink); background: var(--cream); }
        main { max-width: 920px; margin: 0 auto; padding: 28px 20px 64px; }
        h1 { font-family: Georgia, serif; font-size: 28px; margin: 0 0 6px; }
        .lead { color: var(--muted); margin: 0 0 24px; }
        .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 28px; }
        .card { background: #fffaf3; border: 1px solid rgba(201,164,106,.45); border-radius: 16px; padding: 14px 16px; }
        .card b { display: block; font-size: 28px; line-height: 1.1; }
        .card span { color: var(--muted); font-size: 12px; }
        h2 { font-size: 18px; margin: 28px 0 10px; }
        table { width: 100%; border-collapse: collapse; background: #fffaf3; border-radius: 16px; overflow: hidden; }
        th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid rgba(201,164,106,.25); font-size: 14px; }
        th { color: var(--muted); font-weight: 600; }
        .bar { height: 8px; background: #ead9c4; border-radius: 99px; overflow: hidden; min-width: 80px; }
        .bar > i { display: block; height: 100%; background: var(--coral); }
        .empty { color: var(--muted); }
    </style>
</head>
<body>
<main>
    <h1>Статистика</h1>
    <p class="lead">Только наши события. Яндекс сюда не пишет. Обновляется при заходе на эту страницу.</p>

    <div class="cards">
        <div class="card"><b><?= (int) $unique ?></b><span>игроков</span></div>
        <div class="card"><b><?= (int) $launches ?></b><span>заходов</span></div>
        <div class="card"><b><?= (int) $returning ?></b><span>вернулись в другой день</span></div>
        <div class="card"><b><?= $h(pct($d1num, $d1den)) ?></b><span>D1 · <?= (int) $d1num ?> / <?= (int) $d1den ?></span></div>
        <div class="card"><b><?= $h(pct($d7num, $d7den)) ?></b><span>D7 · <?= (int) $d7num ?> / <?= (int) $d7den ?></span></div>
        <div class="card"><b><?= (int) $firstCompletes ?></b><span>новых картин закрыто</span></div>
        <div class="card"><b><?= (int) $completes ?></b><span>прохождений всего</span></div>
        <div class="card"><b><?= (int) $withPicture ?></b><span>собрали хотя бы одну</span></div>
    </div>

    <h2>Последние 14 дней</h2>
    <?php if (!$byDay) { ?>
        <p class="empty">Пока пусто — открой игру на mosaelia.loc, затем обнови эту страницу.</p>
    <?php } else { ?>
        <table>
            <thead>
                <tr>
                    <th>День</th>
                    <th>Заходы</th>
                    <th>Игроки</th>
                    <th>Новые</th>
                    <th>Вернулись</th>
                    <th>Картины</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
            <?php foreach ($byDay as $day => $d) {
                $uniq = count($d["players"]);
                $w = (int) round(100 * $d["launches"] / $maxBar);
                ?>
                <tr>
                    <td><?= $h($day) ?></td>
                    <td><?= (int) $d["launches"] ?></td>
                    <td><?= (int) $uniq ?></td>
                    <td><?= (int) $d["new"] ?></td>
                    <td><?= (int) $d["returning"] ?></td>
                    <td><?= (int) $d["completes"] ?></td>
                    <td><div class="bar"><i style="width:<?= $w ?>%"></i></div></td>
                </tr>
            <?php } ?>
            </tbody>
        </table>
    <?php } ?>

    <h2>Картины</h2>
    <?php if (!$byLevel) { ?>
        <p class="empty">Ещё никто не собрал картину.</p>
    <?php } else { ?>
        <table>
            <thead><tr><th>Картина</th><th>Прохождений</th></tr></thead>
            <tbody>
            <?php foreach ($byLevel as $level => $n) {
                $name = $titles[$level] ?? $level;
                ?>
                <tr>
                    <td><?= $h($name) ?> <span style="color:#7a5a3a">(<?= $h($level) ?>)</span></td>
                    <td><?= (int) $n ?></td>
                </tr>
            <?php } ?>
            </tbody>
        </table>
    <?php } ?>

    <h2>Площадки</h2>
    <?php if (!$byPlatform) { ?>
        <p class="empty">Заходов с меткой площадки пока нет.</p>
    <?php } else { ?>
        <table>
            <thead><tr><th>Площадка</th><th>Заходы</th></tr></thead>
            <tbody>
            <?php foreach ($byPlatform as $plat => $n) { ?>
                <tr><td><?= $h($plat) ?></td><td><?= (int) $n ?></td></tr>
            <?php } ?>
            </tbody>
        </table>
    <?php } ?>
</main>
</body>
</html>

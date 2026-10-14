<?php

require_once __DIR__ . "/ranks-lib.php";

function mosaelia_events_path() {
    return __DIR__ . "/data/events.jsonl";
}

function mosaelia_period_cutoff_ms(string $period): int {
    $tz = new DateTimeZone("Europe/Moscow");
    $now = new DateTime("now", $tz);
    if ($period === "day") {
        $start = new DateTime("today", $tz);
        return (int) $start->format("U") * 1000;
    }
    if ($period === "week") {
        $start = clone $now;
        $start->modify("monday this week");
        $start->setTime(0, 0, 0);
        return (int) $start->format("U") * 1000;
    }
    if ($period === "month") {
        $start = new DateTime($now->format("Y-m-01"), $tz);
        return (int) $start->format("U") * 1000;
    }
    return 0;
}

/** @return array<int, array<string, mixed>> */
function mosaelia_load_events(): array {
    $log = mosaelia_events_path();
    if (!is_file($log)) {
        return [];
    }
    $lines = file($log, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    $out = [];
    foreach ($lines as $line) {
        $row = json_decode($line, true);
        if (is_array($row) && !empty($row["id"]) && !empty($row["ev"])) {
            $out[] = $row;
        }
    }
    return $out;
}

function mosaelia_event_is_daily(array $row): bool {
    if (!empty($row["daily"])) {
        return true;
    }
    $level = (string) ($row["level"] ?? "");
    return (bool) preg_match("/^oct\\d/i", $level);
}

function mosaelia_event_is_replay(array $row): bool {
    if (array_key_exists("replay", $row)) {
        return !empty($row["replay"]);
    }
    return empty($row["first"]);
}

/** @return bool whether this complete event counts toward a global board */
function mosaelia_event_counts_for_board(array $row, string $board): bool {
    if (mosaelia_event_is_daily($row)) {
        return false;
    }
    $replay = mosaelia_event_is_replay($row);
    if ($board === "clears") {
        return !empty($row["first"]);
    }
    if ($board === "activity") {
        return !$replay;
    }
    return !$replay;
}

function mosaelia_booster_items(): array {
    return ["shuffles", "undos", "wands", "extraTokens"];
}

function mosaelia_shop_board_items(): array {
    return array_merge(mosaelia_booster_items(), ["chest", "spent", "frames"]);
}

/** @return array{scores: array<string,int>, names: array<string,string>} */
function mosaelia_leader_shop_spent_scores(string $period): array {
    $period = in_array($period, ["day", "week", "month", "all"], true) ? $period : "week";
    $cutoff = mosaelia_period_cutoff_ms($period);
    $scores = [];
    $names = [];

    foreach (mosaelia_load_events() as $row) {
        if (($row["ev"] ?? "") !== "shop_buy") {
            continue;
        }
        $t = (int) ($row["t"] ?? 0);
        if ($cutoff > 0 && $t > 0 && $t < $cutoff) {
            continue;
        }
        $spent = (int) ($row["spent"] ?? 0);
        if ($spent < 1) {
            continue;
        }
        $id = (string) ($row["id"] ?? "");
        if ($id === "") {
            continue;
        }
        if (!isset($scores[$id])) {
            $scores[$id] = 0;
        }
        $scores[$id] += $spent;
        $name = mosaelia_sanitize_name($row["name"] ?? "");
        if ($name !== "") {
            $names[$id] = $name;
        }
    }

    return ["scores" => $scores, "names" => $names];
}

/** @return array{scores: array<string,int>, names: array<string,string>} */
function mosaelia_leader_shop_frames_scores(string $period): array {
    $period = in_array($period, ["day", "week", "month", "all"], true) ? $period : "week";
    $cutoff = mosaelia_period_cutoff_ms($period);
    $scores = [];
    $names = [];

    foreach (mosaelia_load_events() as $row) {
        if (($row["ev"] ?? "") !== "shop_buy") {
            continue;
        }
        $t = (int) ($row["t"] ?? 0);
        if ($cutoff > 0 && $t > 0 && $t < $cutoff) {
            continue;
        }
        $item = (string) ($row["item"] ?? "");
        if (!preg_match("/^frame-[a-z0-9_-]+$/i", $item)) {
            continue;
        }
        $id = (string) ($row["id"] ?? "");
        if ($id === "") {
            continue;
        }
        if (!isset($scores[$id])) {
            $scores[$id] = 0;
        }
        $scores[$id] += 1;
        $name = mosaelia_sanitize_name($row["name"] ?? "");
        if ($name !== "") {
            $names[$id] = $name;
        }
    }

    return ["scores" => $scores, "names" => $names];
}

/** @return array{scores: array<string,int>, names: array<string,string>} */
function mosaelia_leader_booster_use_scores(string $period, string $item): array {
    $period = in_array($period, ["day", "week", "month", "all"], true) ? $period : "week";
    $item = preg_replace("/[^a-zA-Z0-9_-]/", "", $item);
    if ($item === "" || !in_array($item, mosaelia_booster_items(), true)) {
        return ["scores" => [], "names" => []];
    }
    $cutoff = mosaelia_period_cutoff_ms($period);
    $scores = [];
    $names = [];

    foreach (mosaelia_load_events() as $row) {
        if (($row["ev"] ?? "") !== "booster_use") {
            continue;
        }
        $t = (int) ($row["t"] ?? 0);
        if ($cutoff > 0 && $t > 0 && $t < $cutoff) {
            continue;
        }
        $rowItem = preg_replace("/[^a-zA-Z0-9_-]/", "", (string) ($row["item"] ?? ""));
        if ($rowItem === "" || $rowItem !== $item) {
            continue;
        }
        $id = (string) ($row["id"] ?? "");
        if ($id === "") {
            continue;
        }
        if (!isset($scores[$id])) {
            $scores[$id] = 0;
        }
        $scores[$id] += 1;
        $name = mosaelia_sanitize_name($row["name"] ?? "");
        if ($name !== "") {
            $names[$id] = $name;
        }
    }

    return ["scores" => $scores, "names" => $names];
}

/** @return array{scores: array<string,int>, names: array<string,string>} */
function mosaelia_leader_shop_scores(string $period, string $shopItem): array {
    $period = in_array($period, ["day", "week", "month", "all"], true) ? $period : "week";
    $shopItem = preg_replace("/[^a-zA-Z0-9_-]/", "", $shopItem);
    if ($shopItem === "") {
        return ["scores" => [], "names" => []];
    }
    if ($shopItem === "spent") {
        return mosaelia_leader_shop_spent_scores($period);
    }
    if ($shopItem === "frames") {
        return mosaelia_leader_shop_frames_scores($period);
    }
    if (!in_array($shopItem, mosaelia_shop_board_items(), true)) {
        return ["scores" => [], "names" => []];
    }
    $cutoff = mosaelia_period_cutoff_ms($period);
    $scores = [];
    $names = [];

    foreach (mosaelia_load_events() as $row) {
        if (($row["ev"] ?? "") !== "shop_buy") {
            continue;
        }
        $t = (int) ($row["t"] ?? 0);
        if ($cutoff > 0 && $t > 0 && $t < $cutoff) {
            continue;
        }
        $item = preg_replace("/[^a-zA-Z0-9_-]/", "", (string) ($row["item"] ?? ""));
        if ($item === "" || $item !== $shopItem) {
            continue;
        }
        $id = (string) ($row["id"] ?? "");
        if ($id === "") {
            continue;
        }
        if (!isset($scores[$id])) {
            $scores[$id] = 0;
        }
        $scores[$id] += 1;
        $name = mosaelia_sanitize_name($row["name"] ?? "");
        if ($name !== "") {
            $names[$id] = $name;
        }
    }

    return ["scores" => $scores, "names" => $names];
}

/**
 * @return array{scores: array<string,int>, names: array<string,string>}
 */
function mosaelia_leader_scores(string $board, string $period): array {
    $period = in_array($period, ["day", "week", "month", "all"], true) ? $period : "week";
    if (preg_match("/^buy-([a-zA-Z0-9_-]+)$/", $board, $buyMatch)) {
        return mosaelia_leader_shop_scores($period, $buyMatch[1]);
    }
    if (preg_match("/^use-([a-zA-Z0-9_-]+)$/", $board, $useMatch)) {
        return mosaelia_leader_booster_use_scores($period, $useMatch[1]);
    }
    $boards = ["clears", "activity", "coins"];
    $board = in_array($board, $boards, true) ? $board : "clears";

    $cutoff = mosaelia_period_cutoff_ms($period);

    $scores = [];
    $names = [];

    foreach (mosaelia_load_events() as $row) {
        if (($row["ev"] ?? "") !== "complete") {
            continue;
        }
        $t = (int) ($row["t"] ?? 0);
        if ($cutoff > 0 && $t > 0 && $t < $cutoff) {
            continue;
        }
        $id = (string) ($row["id"] ?? "");
        if ($id === "") {
            continue;
        }
        if (!mosaelia_event_counts_for_board($row, $board)) {
            continue;
        }
        if (!isset($scores[$id])) {
            $scores[$id] = 0;
        }
        if ($board === "clears" || $board === "activity") {
            $scores[$id] += 1;
        } else {
            $payout = isset($row["payout"]) ? (int) $row["payout"] : 0;
            if ($payout < 1) {
                $payout = !empty($row["first"]) ? 50 : 5;
            }
            $scores[$id] += max(0, min(500, $payout));
        }
        $name = mosaelia_sanitize_name($row["name"] ?? "");
        if ($name !== "") {
            $names[$id] = $name;
        }
    }

    return ["scores" => $scores, "names" => $names];
}

/**
 * @return array{rows: list<array>, total: int, page: int, pages: int}
 */
function mosaelia_leaderboard(string $board, string $period, int $page = 1, int $perPage = 20): array {
    $perPage = max(5, min(50, $perPage));
    $page = max(1, $page);
    $data = mosaelia_leader_scores($board, $period);
    $scores = $data["scores"];
    $names = $data["names"];

    arsort($scores);
    $all = [];
    $rank = 0;
    foreach ($scores as $id => $score) {
        if ($score < 1) {
            continue;
        }
        $rank++;
        $name = $names[$id] ?? "";
        if ($name === "") {
            $name = "Гость " . substr($id, -4);
        }
        $all[] = [
            "id" => $id,
            "name" => $name,
            "score" => (int) $score,
            "place" => $rank
        ];
    }

    $total = count($all);
    $pages = max(1, (int) ceil($total / $perPage));
    if ($page > $pages) {
        $page = $pages;
    }
    $offset = ($page - 1) * $perPage;
    $rows = array_slice($all, $offset, $perPage);

    return [
        "rows" => $rows,
        "total" => $total,
        "page" => $page,
        "pages" => $pages
    ];
}

/**
 * @return array{place:int,score:int,name:string}|null
 */
function mosaelia_leader_me(string $board, string $period, string $id): ?array {
    $id = preg_replace("/[^a-zA-Z0-9_-]/", "", $id);
    if ($id === "") {
        return null;
    }
    $data = mosaelia_leader_scores($board, $period);
    $scores = $data["scores"];
    $names = $data["names"];

    if (empty($scores[$id])) {
        return null;
    }
    arsort($scores);
    $place = 0;
    foreach ($scores as $pid => $score) {
        if ($score < 1) {
            continue;
        }
        $place++;
        if ($pid === $id) {
            $name = $names[$id] ?? ("Гость " . substr($id, -4));
            return ["place" => $place, "score" => (int) $score, "name" => $name];
        }
    }
    return null;
}

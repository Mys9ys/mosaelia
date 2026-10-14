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

/**
 * @return array{rows: list<array{name:string,id:string,score:int}>, total:int}
 */
function mosaelia_leaderboard(string $board, string $period, int $limit = 30): array {
    $board = in_array($board, ["clears", "activity", "coins"], true) ? $board : "clears";
    $period = in_array($period, ["day", "week", "month", "all"], true) ? $period : "week";
    $limit = max(5, min(50, $limit));
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
        if (!isset($scores[$id])) {
            $scores[$id] = 0;
        }
        if ($board === "clears") {
            if (!empty($row["first"])) {
                $scores[$id] += 1;
            }
        } elseif ($board === "activity") {
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

    arsort($scores);
    $rows = [];
    $rank = 0;
    foreach ($scores as $id => $score) {
        if ($score < 1) {
            continue;
        }
        $rank++;
        if (count($rows) >= $limit) {
            break;
        }
        $name = $names[$id] ?? "";
        if ($name === "") {
            $name = "Гость " . substr($id, -4);
        }
        $rows[] = [
            "id" => $id,
            "name" => $name,
            "score" => (int) $score,
            "place" => $rank
        ];
    }

    return [
        "rows" => $rows,
        "total" => count(array_filter($scores, static fn($s) => $s > 0))
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
    $board = in_array($board, ["clears", "activity", "coins"], true) ? $board : "clears";
    $period = in_array($period, ["day", "week", "month", "all"], true) ? $period : "week";
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
        $pid = (string) ($row["id"] ?? "");
        if ($pid === "") {
            continue;
        }
        if (!isset($scores[$pid])) {
            $scores[$pid] = 0;
        }
        if ($board === "clears") {
            if (!empty($row["first"])) {
                $scores[$pid] += 1;
            }
        } elseif ($board === "activity") {
            $scores[$pid] += 1;
        } else {
            $payout = isset($row["payout"]) ? (int) $row["payout"] : 0;
            if ($payout < 1) {
                $payout = !empty($row["first"]) ? 50 : 5;
            }
            $scores[$pid] += max(0, min(500, $payout));
        }
        $name = mosaelia_sanitize_name($row["name"] ?? "");
        if ($name !== "") {
            $names[$pid] = $name;
        }
    }

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

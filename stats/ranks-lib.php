<?php

function mosaelia_sanitize_name($raw) {
    $s = trim((string) $raw);
    $s = preg_replace("/[^\p{L}\p{N} .\-]/u", "", $s);
    if (!is_string($s)) {
        $s = "";
    }
    if (function_exists("mb_substr")) {
        $s = mb_substr($s, 0, 24);
    } else {
        $s = substr($s, 0, 24);
    }
    return $s;
}

function mosaelia_ranks_path() {
    return __DIR__ . "/data/ranks.json";
}

function mosaelia_load_ranks() {
    $file = mosaelia_ranks_path();
    if (!is_file($file)) {
        return [];
    }
    $raw = file_get_contents($file);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function mosaelia_save_ranks($ranks) {
    $dir = __DIR__ . "/data";
    if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
        return false;
    }
    $tmp = $dir . "/ranks.json.tmp";
    $ok = file_put_contents($tmp, json_encode($ranks, JSON_UNESCAPED_UNICODE), LOCK_EX);
    if ($ok === false) {
        return false;
    }
    return rename($tmp, mosaelia_ranks_path());
}

/**
 * @return array{best: array<string, array>, total: int}
 */
function mosaelia_level_bucket($ranks, $level) {
    $level = substr(preg_replace("/[^a-z0-9_-]/", "", (string) $level), 0, 32);
    $data = $ranks[$level] ?? [];
    if (is_array($data) && isset($data["best"]) && is_array($data["best"])) {
        $best = $data["best"];
        $total = isset($data["total"]) ? (int) $data["total"] : count($best);
        return ["best" => $best, "total" => max($total, count($best))];
    }
    $rows = [];
    if (is_array($data)) {
        if (isset($data["rows"]) && is_array($data["rows"])) {
            $rows = $data["rows"];
        } elseif ($data !== [] && array_keys($data) === range(0, count($data) - 1)) {
            $rows = $data;
        }
    }
    $best = [];
    foreach ($rows as $row) {
        if (!is_array($row) || empty($row["id"])) {
            continue;
        }
        $id = (string) $row["id"];
        $best[$id] = [
            "id" => $id,
            "name" => mosaelia_sanitize_name($row["name"] ?? ""),
            "moves" => (int) ($row["moves"] ?? 0),
            "clean" => !empty($row["clean"]) ? 1 : 0,
            "t" => (int) ($row["t"] ?? 0)
        ];
    }
    return ["best" => $best, "total" => count($best)];
}

function mosaelia_level_sorted_rows(array $best) {
    $rows = array_values($best);
    usort($rows, function ($a, $b) {
        $ma = (int) ($a["moves"] ?? 9999);
        $mb = (int) ($b["moves"] ?? 9999);
        if ($ma === $mb) {
            return ((int) ($a["t"] ?? 0)) <=> ((int) ($b["t"] ?? 0));
        }
        return $ma <=> $mb;
    });
    return $rows;
}

function mosaelia_update_rank($level, $id, $moves, $clean, $name) {
    $level = substr(preg_replace("/[^a-z0-9_-]/", "", (string) $level), 0, 32);
    $id = preg_replace("/[^a-zA-Z0-9_-]/", "", (string) $id);
    $moves = (int) $moves;
    if ($level === "" || $id === "" || $moves < 1 || $moves > 9999) {
        return;
    }
    $ranks = mosaelia_load_ranks();
    $bucket = mosaelia_level_bucket($ranks, $level);
    $best = $bucket["best"];
    $total = $bucket["total"];
    $found = isset($best[$id]);
    if (!$found) {
        $total += 1;
        $best[$id] = [
            "id" => $id,
            "name" => $name,
            "moves" => $moves,
            "clean" => $clean ? 1 : 0,
            "t" => (int) round(microtime(true) * 1000)
        ];
    } else {
        $row = &$best[$id];
        $prev = (int) ($row["moves"] ?? 9999);
        if ($moves < $prev) {
            $row["moves"] = $moves;
            $row["clean"] = $clean ? 1 : 0;
            $row["t"] = (int) round(microtime(true) * 1000);
        } elseif ($moves === $prev && $clean && empty($row["clean"])) {
            $row["clean"] = 1;
        }
        if ($name !== "") {
            $row["name"] = $name;
        }
        unset($row);
    }
    $ranks[$level] = [
        "total" => $total,
        "best" => $best
    ];
    mosaelia_save_ranks($ranks);
}

function mosaelia_event_unique_completers($level) {
    $level = substr(preg_replace("/[^a-z0-9_-]/", "", (string) $level), 0, 32);
    if ($level === "") {
        return 0;
    }
    $log = __DIR__ . "/data/events.jsonl";
    if (!is_file($log)) {
        return 0;
    }
    $lines = file($log, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    $ids = [];
    foreach ($lines as $line) {
        $row = json_decode($line, true);
        if (!is_array($row) || ($row["ev"] ?? "") !== "complete") {
            continue;
        }
        if (($row["level"] ?? "") !== $level) {
            continue;
        }
        $id = (string) ($row["id"] ?? "");
        if ($id !== "") {
            $ids[$id] = true;
        }
    }
    return count($ids);
}

function mosaelia_rank_total($level) {
    $ranks = mosaelia_load_ranks();
    $bucket = mosaelia_level_bucket($ranks, $level);
    $stored = (int) $bucket["total"];
    $fromLog = mosaelia_event_unique_completers($level);
    return max($stored, $fromLog, count($bucket["best"]));
}

/**
 * @return array{place:int,moves:int,clean:int}|null
 */
function mosaelia_rank_me($level, $id) {
    $id = preg_replace("/[^a-zA-Z0-9_-]/", "", (string) $id);
    if ($id === "") {
        return null;
    }
    $ranks = mosaelia_load_ranks();
    $bucket = mosaelia_level_bucket($ranks, $level);
    if (empty($bucket["best"][$id])) {
        return null;
    }
    $mine = $bucket["best"][$id];
    $sorted = mosaelia_level_sorted_rows($bucket["best"]);
    $place = 0;
    foreach ($sorted as $row) {
        $place++;
        if (($row["id"] ?? "") === $id) {
            return [
                "place" => $place,
                "moves" => (int) ($mine["moves"] ?? 0),
                "clean" => !empty($mine["clean"]) ? 1 : 0
            ];
        }
    }
    return null;
}

function mosaelia_rank_rows($level, $limit = 10) {
    $level = substr(preg_replace("/[^a-z0-9_-]/", "", (string) $level), 0, 32);
    $ranks = mosaelia_load_ranks();
    $bucket = mosaelia_level_bucket($ranks, $level);
    $sorted = mosaelia_level_sorted_rows($bucket["best"]);
    $out = [];
    $place = 0;
    foreach (array_slice($sorted, 0, $limit) as $row) {
        $place++;
        $name = mosaelia_sanitize_name($row["name"] ?? "");
        if ($name === "") {
            $tail = substr((string) ($row["id"] ?? "guest"), -4);
            $name = "Гость " . $tail;
        }
        $out[] = [
            "id" => (string) ($row["id"] ?? ""),
            "name" => $name,
            "moves" => (int) ($row["moves"] ?? 0),
            "clean" => !empty($row["clean"]) ? 1 : 0,
            "place" => $place
        ];
    }
    return $out;
}

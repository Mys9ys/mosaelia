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

function mosaelia_update_rank($level, $id, $moves, $clean, $name) {
    $level = substr(preg_replace("/[^a-z0-9_-]/", "", (string) $level), 0, 32);
    $moves = (int) $moves;
    if ($level === "" || $moves < 1 || $moves > 9999) {
        return;
    }
    $ranks = mosaelia_load_ranks();
    if (!isset($ranks[$level]) || !is_array($ranks[$level])) {
        $ranks[$level] = [];
    }
    $rows = $ranks[$level];
    $found = false;
    foreach ($rows as &$row) {
        if (($row["id"] ?? "") === $id) {
            $found = true;
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
            break;
        }
    }
    unset($row);
    if (!$found) {
        $rows[] = [
            "id" => $id,
            "name" => $name,
            "moves" => $moves,
            "clean" => $clean ? 1 : 0,
            "t" => (int) round(microtime(true) * 1000)
        ];
    }
    usort($rows, function ($a, $b) {
        $ma = (int) ($a["moves"] ?? 9999);
        $mb = (int) ($b["moves"] ?? 9999);
        if ($ma === $mb) {
            return ((int) ($a["t"] ?? 0)) <=> ((int) ($b["t"] ?? 0));
        }
        return $ma <=> $mb;
    });
    $ranks[$level] = array_slice($rows, 0, 50);
    mosaelia_save_ranks($ranks);
}

function mosaelia_rank_rows($level, $limit = 10) {
    $level = substr(preg_replace("/[^a-z0-9_-]/", "", (string) $level), 0, 32);
    $ranks = mosaelia_load_ranks();
    $rows = is_array($ranks[$level] ?? null) ? $ranks[$level] : [];
    $out = [];
    foreach (array_slice($rows, 0, $limit) as $row) {
        $name = mosaelia_sanitize_name($row["name"] ?? "");
        if ($name === "") {
            $tail = substr((string) ($row["id"] ?? "guest"), -4);
            $name = "Гость " . $tail;
        }
        $out[] = [
            "id" => (string) ($row["id"] ?? ""),
            "name" => $name,
            "moves" => (int) ($row["moves"] ?? 0),
            "clean" => !empty($row["clean"]) ? 1 : 0
        ];
    }
    return $out;
}

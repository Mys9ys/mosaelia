<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Private-Network: true");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    http_response_code(405);
    exit;
}

$allowed = ["shuffles", "undos", "wands", "extraTokens", "chest"];
$counts = [];
$buyers = [];
foreach ($allowed as $key) {
    $counts[$key] = 0;
    $buyers[$key] = [];
}

$log = __DIR__ . "/data/events.jsonl";
if (is_file($log)) {
    $lines = file($log, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach ($lines as $line) {
        $row = json_decode($line, true);
        if (!is_array($row) || ($row["ev"] ?? "") !== "shop_buy") {
            continue;
        }
        $item = preg_replace("/[^a-zA-Z0-9_-]/", "", (string) ($row["item"] ?? ""));
        if ($item === "" || !isset($counts[$item])) {
            continue;
        }
        $counts[$item]++;
        $id = (string) ($row["id"] ?? "");
        if ($id !== "") {
            $buyers[$item][$id] = true;
        }
    }
}

$out = [];
foreach ($allowed as $key) {
    $out[$key] = [
        "buys" => $counts[$key],
        "buyers" => count($buyers[$key])
    ];
}

echo json_encode(["ok" => 1, "items" => $out], JSON_UNESCAPED_UNICODE);

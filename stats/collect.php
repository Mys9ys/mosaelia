<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Private-Network: true");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    exit;
}

$raw = file_get_contents("php://input");
if ($raw === false || strlen($raw) > 8000) {
    http_response_code(400);
    exit;
}

$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    exit;
}

$ev = $data["ev"] ?? "";
if (!in_array($ev, ["launch", "complete"], true)) {
    http_response_code(400);
    exit;
}

$id = preg_replace("/[^a-zA-Z0-9_-]/", "", (string) ($data["id"] ?? ""));
if ($id === "" || strlen($id) > 80) {
    http_response_code(400);
    exit;
}

$configFile = __DIR__ . "/config.php";
$config = is_file($configFile) ? require $configFile : [];
$token = (string) ($config["ingest_token"] ?? "");
if ($token !== "" && (string) ($data["token"] ?? "") !== $token) {
    http_response_code(403);
    exit;
}

require_once __DIR__ . "/ranks-lib.php";

$level = substr(preg_replace("/[^a-z0-9_-]/", "", (string) ($data["level"] ?? "")), 0, 32);
$moves = isset($data["moves"]) ? (int) $data["moves"] : null;
$clean = !empty($data["clean"]) ? 1 : 0;
$name = mosaelia_sanitize_name($data["name"] ?? "");

$row = [
    "t" => (int) ($data["t"] ?? (int) round(microtime(true) * 1000)),
    "id" => $id,
    "ev" => $ev,
    "p" => substr(preg_replace("/[^a-z0-9_-]/", "", (string) ($data["p"] ?? "")), 0, 16),
    "level" => $level,
    "first" => !empty($data["first"]) ? 1 : 0,
    "total" => isset($data["total"]) ? (int) $data["total"] : null,
    "moves" => $moves,
    "clean" => $clean,
];

if ($ev === "complete" && $level !== "" && $moves) {
    mosaelia_update_rank($level, $id, $moves, $clean, $name);
}

$dir = __DIR__ . "/data";
if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
    http_response_code(500);
    exit;
}

$ok = file_put_contents(
    $dir . "/events.jsonl",
    json_encode($row, JSON_UNESCAPED_UNICODE) . "\n",
    FILE_APPEND | LOCK_EX
);

http_response_code($ok === false ? 500 : 204);

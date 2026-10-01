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

require __DIR__ . "/ranks-lib.php";

$level = (string) ($_GET["level"] ?? "");
$rows = mosaelia_rank_rows($level, 10);
echo json_encode(["ok" => 1, "level" => $level, "rows" => $rows], JSON_UNESCAPED_UNICODE);

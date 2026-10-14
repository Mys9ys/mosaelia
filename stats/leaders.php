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

require __DIR__ . "/leaders-lib.php";

$board = (string) ($_GET["board"] ?? "clears");
$period = (string) ($_GET["period"] ?? "week");
$meId = preg_replace("/[^a-zA-Z0-9_-]/", "", (string) ($_GET["id"] ?? ""));

$data = mosaelia_leaderboard($board, $period, 30);
$me = $meId !== "" ? mosaelia_leader_me($board, $period, $meId) : null;

echo json_encode([
    "ok" => 1,
    "board" => $board,
    "period" => $period,
    "rows" => $data["rows"],
    "players" => $data["total"],
    "me" => $me
], JSON_UNESCAPED_UNICODE);

<?php
$path = parse_url($_SERVER["REQUEST_URI"] ?? "/", PHP_URL_PATH) ?: "/";
if (strpos($path, "/data") === 0 || $path === "/config.php" || $path === "/config.example.php") {
    http_response_code(404);
    exit;
}
$file = __DIR__ . $path;
if ($path !== "/" && is_file($file)) {
    return false;
}
require __DIR__ . "/index.php";

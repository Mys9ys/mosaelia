# Packs Mosaelia for store upload.
#   Yandex: dist/mosaelia-yandex.zip  (index.html at archive root)
#   VK:     dist/vk/                  (HTTPS static host / vk-miniapps-deploy)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$gameFiles = @(
    "index.html",
    "css\game.css",
    "js\game.js",
    "js\levels.js",
    "js\platform\index.js",
    "js\platform\local.js",
    "js\platform\stub.js",
    "js\platform\yandex.js",
    "js\platform\vk.js",
    "js\stats.js",
    "js\stats-config.js"
)

$badName = [regex]"\s|[^\u0000-\u007F]"
$errors = [System.Collections.Generic.List[string]]::new()
$bytes = 0

foreach ($rel in $gameFiles) {
    $full = Join-Path $root $rel
    if (-not (Test-Path $full)) {
        $errors.Add("missing: $rel")
        continue
    }
    $posix = ($rel -replace "\\", "/")
    if ($posix -notmatch "^[A-Za-z0-9._/-]+$") {
        $errors.Add("non-store path (spaces or non-ASCII): $posix")
    }
    if ($badName.IsMatch($posix)) {
        $errors.Add("spaces or non-ASCII: $posix")
    }
    $bytes += (Get-Item $full).Length
}

$html = Get-Content (Join-Path $root "index.html") -Raw -Encoding UTF8
if ($html -notmatch 'href="css/game.css"' -or $html -notmatch 'src="js/game.js"') {
    $errors.Add("index.html must use relative css/js paths")
}
if ($html -match "mosaelia\.com") {
    $errors.Add("store build must not mention mosaelia.com")
}

$limit = 100MB
if ($bytes -gt $limit) {
    $errors.Add("unzipped size $bytes exceeds 100 MB")
}

if ($errors.Count) {
    $errors | ForEach-Object { Write-Error $_ }
    exit 1
}

function Clear-Dir([string]$path) {
    if (Test-Path $path) {
        Remove-Item $path -Recurse -Force
    }
    New-Item -ItemType Directory -Path $path | Out-Null
}

function Copy-Game([string]$dest) {
    foreach ($rel in $gameFiles) {
        $from = Join-Path $root $rel
        $to = Join-Path $dest $rel
        $dir = Split-Path $to -Parent
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir | Out-Null
        }
        Copy-Item $from $to
    }
}

$dist = Join-Path $root "dist"
$yandexDir = Join-Path $dist "yandex"
$vkDir = Join-Path $dist "vk"
$zipPath = Join-Path $dist "mosaelia-yandex.zip"

Clear-Dir $yandexDir
Clear-Dir $vkDir
Copy-Game $yandexDir
Copy-Game $vkDir

Copy-Item (Join-Path $root "hosting\apache\.htaccess") (Join-Path $vkDir ".htaccess")
Copy-Item (Join-Path $root "hosting\netlify\_headers") (Join-Path $vkDir "_headers")

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
    $yandexDir,
    $zipPath,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
)

$archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    $names = $archive.Entries | ForEach-Object { $_.FullName -replace "\\", "/" }
    if ($names -notcontains "index.html") {
        throw "ZIP root has no index.html. Entries: $($names -join ', ')"
    }
    $wrapped = $names | Where-Object { $_ -match "^[^/]+/index.html$" }
    if ($wrapped) {
        throw "index.html is inside a folder, not at ZIP root: $($wrapped -join ', ')"
    }
    $zipBad = $names | Where-Object { $_ -match "\s|[^\u0000-\u007F]" }
    if ($zipBad) {
        throw "ZIP has spaces or non-ASCII paths: $($zipBad -join ', ')"
    }
} finally {
    $archive.Dispose()
}

$zipSize = (Get-Item $zipPath).Length
$kb = [math]::Round($bytes / 1KB, 1)
$zipKb = [math]::Round($zipSize / 1KB, 1)

Write-Host ""
Write-Host "Yandex ZIP  $zipPath"
Write-Host "  index.html at root: yes"
Write-Host "  files: $($gameFiles.Count)  unzipped: $kb KB  zip: $zipKb KB  limit: 100 MB"
Write-Host "  upload in console: Draft / Archive"
Write-Host ""
Write-Host "VK host    $vkDir"
Write-Host "  HTTPS URL of this folder (no X-Frame-Options DENY)"
Write-Host "  or set app_id in vk-hosting-config.json and:"
Write-Host "  npx @vkontakte/vk-miniapps-deploy"
Write-Host ""

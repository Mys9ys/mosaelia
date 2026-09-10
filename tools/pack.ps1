# Packs Mosaelia for store upload.
#   Yandex: dist/mosaelia-yandex.zip  (index.html at archive root)
#   VK:     dist/mosaelia-vk.zip      (index.html at archive root) + dist/vk/
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$yandexFiles = @(
    "index.html",
    "css\game.css",
    "js\game.js",
    "js\levels.js",
    "js\platform\index.js",
    "js\platform\local.js",
    "js\platform\stub.js",
    "js\platform\yandex.js",
    "js\stats.js",
    "img\favicon.png",
    "img\apple-touch-icon.png"
)

$vkFiles = @(
    "index.html",
    "css\game.css",
    "js\game.js",
    "js\levels.js",
    "js\platform\index.js",
    "js\platform\local.js",
    "js\platform\stub.js",
    "js\platform\vk.js",
    "js\vendor\vk-bridge.min.js",
    "js\stats.js",
    "img\favicon.png",
    "img\apple-touch-icon.png"
)

$checkFiles = @($yandexFiles + $vkFiles | Select-Object -Unique)
$badName = [regex]"\s|[^\u0000-\u007F]"
$errors = [System.Collections.Generic.List[string]]::new()
$bytes = 0

foreach ($rel in $checkFiles) {
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
if ($html -notmatch 'href="css/game.css' -or $html -notmatch 'src="js/game.js') {
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

# Yandex static host often 404s css/js?v=24 (looks for a file with that name).
function Strip-StoreQueries([string]$dest) {
    $utf8 = New-Object System.Text.UTF8Encoding $false
    Get-ChildItem $dest -Recurse -File -Include *.html, *.js | ForEach-Object {
        $text = [System.IO.File]::ReadAllText($_.FullName)
        $text = [regex]::Replace($text, '\?v=\d+', '')
        if ($_.Name -eq "index.html") {
            $text = $text.Replace('href="css/game.css"', 'href="./css/game.css"')
            $text = $text.Replace('src="js/game.js"', 'src="./js/game.js"')
            $text = $text.Replace('href="img/', 'href="./img/')
        }
        [System.IO.File]::WriteAllText($_.FullName, $text, $utf8)
    }
}

function Copy-Game([string]$dest, [string[]]$files) {
    foreach ($rel in $files) {
        $from = Join-Path $root $rel
        $to = Join-Path $dest $rel
        $dir = Split-Path $to -Parent
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir | Out-Null
        }
        Copy-Item $from $to
    }
    Strip-StoreQueries $dest
}

function Finish-VkPack([string]$dest) {
    $utf8 = New-Object System.Text.UTF8Encoding $false
    $indexPath = Join-Path $dest "index.html"
    $html = [System.IO.File]::ReadAllText($indexPath)
    $html = $html.Replace("    <!-- Yandex Games SDK -->`r`n", "")
    $html = $html.Replace("    <!-- Yandex Games SDK -->`n", "")
    $html = $html.Replace("    <script src=""/sdk.js""></script>`r`n", "    <script src=""./js/vendor/vk-bridge.min.js""></script>`r`n")
    $html = $html.Replace("    <script src=""/sdk.js""></script>`n", "    <script src=""./js/vendor/vk-bridge.min.js""></script>`n")
    if ($html -match "/sdk.js" -or $html -notmatch "vk-bridge\.min\.js") {
        throw "VK index.html must load local vk-bridge and must not load /sdk.js"
    }
    [System.IO.File]::WriteAllText($indexPath, $html, $utf8)

    [System.IO.File]::WriteAllText(
        (Join-Path $dest "js\platform\index.js"),
        @"
export function detectPlatform() {
    const query = new URLSearchParams(location.search);
    if (query.get("platform") === "stub") return "stub";
    return "vk";
}

export async function createPlatform() {
    if (detectPlatform() === "stub") {
        const { createStub } = await import("./stub.js");
        const platform = createStub();
        await platform.init();
        return platform;
    }
    const { createVk } = await import("./vk.js");
    const platform = createVk();
    await platform.init();
    return platform;
}
"@ + "`n",
        $utf8
    )

    $localPath = Join-Path $dest "js\platform\local.js"
    $local = [System.IO.File]::ReadAllText($localPath)
    $local = [regex]::Replace($local, '(?s)\r?\nexport function insideYandex\(\) \{.*?\r?\n\}\r?\n?', "`n")
    [System.IO.File]::WriteAllText($localPath, $local, $utf8)

    [System.IO.File]::WriteAllText(
        (Join-Path $dest "js\stats.js"),
        "export function track() {}`n",
        $utf8
    )
}

function Write-PosixZip([string]$sourceDir, [string]$zipPath) {
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }
    $zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        $rootPath = (Resolve-Path $sourceDir).Path.TrimEnd("\", "/")
        Get-ChildItem $sourceDir -Recurse -File | ForEach-Object {
            $rel = $_.FullName.Substring($rootPath.Length).TrimStart("\", "/")
            $entryName = $rel -replace "\\", "/"
            [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $zip,
                $_.FullName,
                $entryName,
                [System.IO.Compression.CompressionLevel]::Optimal
            )
        }
    } finally {
        $zip.Dispose()
    }
}

function Assert-StoreZip([string]$zipPath, [string]$kind) {
    $archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
    try {
        $names = $archive.Entries | ForEach-Object { $_.FullName -replace "\\", "/" }
        if ($names -notcontains "index.html") {
            throw "$kind ZIP root has no index.html. Entries: $($names -join ', ')"
        }
        $wrapped = $names | Where-Object { $_ -match "^[^/]+/index.html$" }
        if ($wrapped) {
            throw "$kind index.html is inside a folder, not at ZIP root: $($wrapped -join ', ')"
        }
        $zipBad = $names | Where-Object { $_ -match "\s|[^\u0000-\u007F]" }
        if ($zipBad) {
            throw "$kind ZIP has spaces or non-ASCII paths: $($zipBad -join ', ')"
        }
        if ($names -notcontains "css/game.css" -or $names -notcontains "js/game.js") {
            throw "$kind ZIP missing css/game.css or js/game.js"
        }
        if ($kind -eq "Yandex") {
            if ($names -contains "js/platform/vk.js") {
                throw "Yandex ZIP must not include vk.js"
            }
            $forbid = [regex]"https?://(?!www\.w3\.org)|s3\.yandex|sdk\.games|yandexcloud|storage\.yandex|unpkg\.com"
        } else {
            if ($names -notcontains "js/platform/vk.js" -or $names -notcontains "js/vendor/vk-bridge.min.js") {
                throw "VK ZIP must include vk.js and vk-bridge.min.js"
            }
            if ($names -contains "js/platform/yandex.js") {
                throw "VK ZIP must not include yandex.js"
            }
            $forbid = [regex]"(?i)yandex|/sdk\.js|unpkg\.com|s3\.yandex|sdk\.games"
        }
        foreach ($entry in $archive.Entries) {
            if ($entry.FullName -notmatch "\.(html|js|css|json)$") { continue }
            $reader = New-Object System.IO.StreamReader($entry.Open())
            try {
                $body = $reader.ReadToEnd()
            } finally {
                $reader.Close()
            }
            if ($forbid.IsMatch($body)) {
                throw "$kind ZIP has forbidden URL or store mention in $($entry.FullName)"
            }
        }
    } finally {
        $archive.Dispose()
    }
}

$dist = Join-Path $root "dist"
$yandexDir = Join-Path $dist "yandex"
$vkDir = Join-Path $dist "vk"
$yandexZip = Join-Path $dist "mosaelia-yandex.zip"
$vkZip = Join-Path $dist "mosaelia-vk.zip"
$utf8 = New-Object System.Text.UTF8Encoding $false

Clear-Dir $yandexDir
Clear-Dir $vkDir
Copy-Game $yandexDir $yandexFiles
Copy-Game $vkDir $vkFiles

[System.IO.File]::WriteAllText(
    (Join-Path $yandexDir "js\stats.js"),
    "export function track() {}`n",
    $utf8
)

$packedHtml = Get-Content (Join-Path $yandexDir "index.html") -Raw -Encoding UTF8
if ($packedHtml -notmatch 'src="/sdk.js"') {
    throw "packed Yandex index.html must include /sdk.js"
}

Finish-VkPack $vkDir
Copy-Item (Join-Path $root "hosting\apache\.htaccess") (Join-Path $vkDir ".htaccess")
Copy-Item (Join-Path $root "hosting\netlify\_headers") (Join-Path $vkDir "_headers")

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

Write-PosixZip $yandexDir $yandexZip
Assert-StoreZip $yandexZip "Yandex"

# ZIP for upload: game files only (no Apache/Netlify extras).
$vkZipDir = Join-Path $dist "vk-zip"
Clear-Dir $vkZipDir
Copy-Game $vkZipDir $vkFiles
Finish-VkPack $vkZipDir
Write-PosixZip $vkZipDir $vkZip
Assert-StoreZip $vkZip "VK"
Remove-Item $vkZipDir -Recurse -Force

$yandexKb = [math]::Round((Get-Item $yandexZip).Length / 1KB, 1)
$vkKb = [math]::Round((Get-Item $vkZip).Length / 1KB, 1)

Write-Host ""
Write-Host "Yandex ZIP  $yandexZip"
Write-Host "  index.html at root: yes"
Write-Host "  zip: $yandexKb KB  upload in console: Draft / Archive"
Write-Host ""
Write-Host "VK ZIP      $vkZip"
Write-Host "  index.html at root: yes"
Write-Host "  zip: $vkKb KB  unzip to HTTPS host or vk-miniapps-deploy dist/vk"
Write-Host ""
Write-Host "VK host     $vkDir"
Write-Host "  or set app_id in vk-hosting-config.json and:"
Write-Host "  npx @vkontakte/vk-miniapps-deploy"
Write-Host ""

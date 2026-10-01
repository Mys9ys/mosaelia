# Uploads Mosaelia to Beget over FTP.
# Set in the same PowerShell session (do not commit passwords):
#   $env:BEGET_FTP_HOST = "ftp.beget.com"   # or the host from the panel
#   $env:BEGET_FTP_USER = "login"
#   $env:BEGET_FTP_PASS = "secret"
#   $env:BEGET_FTP_PATH = "/mosaelia.ru/public_html"  # no trailing slash
#
# Then: powershell -File tools/deploy-beget.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$hostName = $env:BEGET_FTP_HOST
$user = $env:BEGET_FTP_USER
$pass = $env:BEGET_FTP_PASS
$basePath = $env:BEGET_FTP_PATH

if (-not $hostName -or -not $user -or -not $pass -or -not $basePath) {
    Write-Host "Need BEGET_FTP_HOST, BEGET_FTP_USER, BEGET_FTP_PASS, BEGET_FTP_PATH"
    Write-Host "Example PATH: /mosaelia.ru/public_html"
    exit 1
}

$relFiles = @(
    "index.html",
    "css/game.css",
    "js/game.js",
    "js/levels.js",
    "js/frames.js",
    "js/calendar.js",
    "js/october.js",
    "js/stats.js",
    "js/stats-config.js",
    "js/platform/index.js",
    "js/platform/local.js",
    "js/platform/stub.js",
    "js/platform/yandex.js",
    "js/platform/vk.js",
    "stats/collect.php",
    "stats/rank.php",
    "stats/ranks-lib.php",
    "stats/index.php",
    "stats/config.example.php",
    "stats/.htaccess",
    "stats/data/.htaccess"
)

function Send-FtpFile([string]$local, [string]$remote) {
    $uri = "ftp://$hostName$remote"
    $request = [System.Net.FtpWebRequest]::Create($uri)
    $request.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
    $request.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
    $request.UseBinary = $true
    $request.UsePassive = $true
    $request.EnableSsl = $false
    $bytes = [System.IO.File]::ReadAllBytes($local)
    $request.ContentLength = $bytes.Length
    $stream = $request.GetRequestStream()
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Close()
    $response = $request.GetResponse()
    $response.Close()
    Write-Host "  $remote"
}

function Ensure-FtpDir([string]$remoteDir) {
    $uri = "ftp://$hostName$remoteDir"
    try {
        $request = [System.Net.FtpWebRequest]::Create($uri)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $request.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
        $request.UsePassive = $true
        $response = $request.GetResponse()
        $response.Close()
    } catch {
        # already exists
    }
}

$dirs = @(
    $basePath,
    "$basePath/css",
    "$basePath/js",
    "$basePath/js/platform",
    "$basePath/stats",
    "$basePath/stats/data"
)
foreach ($dir in $dirs) {
    Ensure-FtpDir $dir
}

Send-FtpFile (Join-Path $root "hosting\beget\.htaccess") "$basePath/.htaccess"

foreach ($rel in $relFiles) {
    $local = Join-Path $root ($rel -replace "/", "\")
    Send-FtpFile $local "$basePath/$rel"
}

Write-Host ""
Write-Host "Uploaded. On the server copy stats/config.example.php to stats/config.php"
Write-Host "and set a new dashboard key. Then open https://mosaelia.ru/stats/?k=KEY"
Write-Host "Enable Let's Encrypt SSL in Beget for mosaelia.ru."

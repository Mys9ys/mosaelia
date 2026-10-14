# Demo players for local stats (127.0.0.1:8791). Run: npm run stats (separate terminal)
$ErrorActionPreference = "Stop"
$url = "http://127.0.0.1:8791/collect.php"
$token = "mosaelia-local-ingest"

$levels = @("dawn", "boat", "daisies", "flowerbed", "rainbow", "arch", "path", "cat", "tea", "windmill")

$players = @(
    @{ id = "demo-alisa-01"; name = "Алиса"; count = 6; skill = 42 },
    @{ id = "demo-boris-02"; name = "Борис"; count = 5; skill = 55 },
    @{ id = "demo-katya-03"; name = "Катя"; count = 6; skill = 38 },
    @{ id = "demo-ivan-04"; name = "Иван"; count = 5; skill = 48 }
)

function Post-Event($body) {
    $json = $body | ConvertTo-Json -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $req = [System.Net.HttpWebRequest]::Create($url)
    $req.Method = "POST"
    $req.ContentType = "text/plain"
    $req.ContentLength = $bytes.Length
    $stream = $req.GetRequestStream()
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Close()
    try {
        $resp = $req.GetResponse()
        $code = [int]$resp.StatusCode
        $resp.Close()
        return $code
    } catch [System.Net.WebException] {
        if ($_.Exception.Response) {
            return [int]$_.Exception.Response.StatusCode
        }
        throw
    }
}

$tz = [TimeZoneInfo]::FindSystemTimeZoneById("Russian Standard Time")
$now = [TimeZoneInfo]::ConvertTimeFromUtc([DateTime]::UtcNow, $tz)
$weekStart = $now.AddDays(-([int]$now.DayOfWeek + 6) % 7).Date

foreach ($p in $players) {
    $tLaunch = [DateTimeOffset]::new($weekStart.AddHours(10 + (Get-Random -Maximum 40))).ToUnixTimeMilliseconds()
    $null = Post-Event @{
        v = 1; t = $tLaunch; id = $p.id; ev = "launch"; p = "stub"; token = $token
    }
    for ($i = 0; $i -lt $p.count; $i++) {
        $level = $levels[$i]
        $dayOff = Get-Random -Minimum 0 -Maximum 7
        $when = $weekStart.AddDays($dayOff).AddHours(9 + $i).AddMinutes((Get-Random -Maximum 50))
        $t = [DateTimeOffset]::new($when).ToUnixTimeMilliseconds()
        $moves = $p.skill + (Get-Random -Minimum -8 -Maximum 14) + $i * 2
        if ($moves -lt 28) { $moves = 28 }
        $payout = 50 + (Get-Random -Minimum 0 -Maximum 30)
        $code = Post-Event @{
            v = 1; t = $t; id = $p.id; ev = "complete"; p = "vk"; level = $level
            first = 1; moves = $moves; clean = $(if ((Get-Random -Maximum 3) -eq 0) { 1 } else { 0 })
            payout = $payout; name = $p.name; token = $token
        }
        if ($code -ne 204) {
            Write-Warning "$($p.name) $level -> HTTP $code (need npm run stats?)"
        }
    }
    Write-Host "OK $($p.name): $($p.count) kartin"
}

Write-Host "Done. Open game -> Rating, period Week or All time."

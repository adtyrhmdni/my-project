#!/usr/bin/env pwsh
# =====================================================
# SIMPLE HTTP SERVER - Asisten Akademik USM
# Jalankan: powershell -ExecutionPolicy Bypass -File server.ps1
# Buka browser: http://localhost:8080
# =====================================================

$Port   = 8080
$Root   = $PSScriptRoot
$Prefix = "http://localhost:${Port}/"

$MimeTypes = @{
    ".html"        = "text/html; charset=utf-8"
    ".css"         = "text/css; charset=utf-8"
    ".js"          = "application/javascript; charset=utf-8"
    ".json"        = "application/json; charset=utf-8"
    ".webmanifest" = "application/manifest+json"
    ".png"         = "image/png"
    ".jpg"         = "image/jpeg"
    ".jpeg"        = "image/jpeg"
    ".svg"         = "image/svg+xml"
    ".ico"         = "image/x-icon"
    ".woff2"       = "font/woff2"
    ".woff"        = "font/woff"
    ".txt"         = "text/plain; charset=utf-8"
    ".sql"         = "text/plain; charset=utf-8"
    ".md"          = "text/plain; charset=utf-8"
}

$Listener = [System.Net.HttpListener]::new()
$Listener.Prefixes.Add($Prefix)
$Listener.Start()

Write-Host ""
Write-Host "  ===== Asisten Akademik USM - Local Server =====" -ForegroundColor Cyan
Write-Host "  URL:  http://localhost:$Port" -ForegroundColor Green
Write-Host "  Root: $Root" -ForegroundColor Gray
Write-Host "  Tekan Ctrl+C untuk menghentikan" -ForegroundColor Yellow
Write-Host "  ================================================" -ForegroundColor Cyan
Write-Host ""

# Auto-open browser
Start-Process "http://localhost:${Port}/index.html"

try {
    while ($Listener.IsListening) {
        $Context  = $Listener.GetContext()
        $Request  = $Context.Request
        $Response = $Context.Response

        $RawPath  = $Request.Url.AbsolutePath
        $FilePath = Join-Path $Root ($RawPath.TrimStart("/").Replace("/", "\"))

        # Default to index.html
        if ((Test-Path $FilePath -PathType Container) -or ($RawPath -eq "/")) {
            $FilePath = Join-Path $FilePath "index.html"
        }

        $ts = Get-Date -Format "HH:mm:ss"
        $method = $Request.HttpMethod
        Write-Host "  $ts  $method  $RawPath" -ForegroundColor Gray

        if (Test-Path $FilePath -PathType Leaf) {
            $Ext      = [System.IO.Path]::GetExtension($FilePath).ToLower()
            $MimeType = if ($MimeTypes.ContainsKey($Ext)) { $MimeTypes[$Ext] } else { "application/octet-stream" }
            $Content  = [System.IO.File]::ReadAllBytes($FilePath)

            $Response.StatusCode      = 200
            $Response.ContentType     = $MimeType
            $Response.ContentLength64 = $Content.Length

            # CORS headers
            $Response.Headers.Add("Access-Control-Allow-Origin", "*")
            $Response.Headers.Add("Cache-Control", "no-cache")

            $Response.OutputStream.Write($Content, 0, $Content.Length)
        } else {
            $NotFound = [System.Text.Encoding]::UTF8.GetBytes("404 - File tidak ditemukan: $RawPath")
            $Response.StatusCode      = 404
            $Response.ContentType     = "text/plain; charset=utf-8"
            $Response.ContentLength64 = $NotFound.Length
            $Response.OutputStream.Write($NotFound, 0, $NotFound.Length)
            Write-Host "  404: $RawPath" -ForegroundColor Yellow
        }

        $Response.OutputStream.Close()
    }
} finally {
    $Listener.Stop()
    Write-Host ""
    Write-Host "  Server dihentikan." -ForegroundColor Red
}

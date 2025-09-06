# Simple HTTP Server for Google OAuth testing
Write-Host "Starting local HTTP server on port 8080..." -ForegroundColor Green
Write-Host "IMPORTANT: Add http://localhost:8080 to Google Cloud Console" -ForegroundColor Yellow
Write-Host "Go to: https://console.cloud.google.com" -ForegroundColor Cyan
Write-Host "APIs & Services > Credentials > OAuth 2.0 Client IDs" -ForegroundColor Cyan
Write-Host "Edit your Client ID > Authorized JavaScript origins" -ForegroundColor Cyan
Write-Host "Add: http://localhost:8080" -ForegroundColor Cyan

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8080/")
$listener.Start()

Write-Host "Server started! Opening browser..." -ForegroundColor Green
Start-Process "http://localhost:8080/index.html"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/") { 
            $localPath = "/index.html" 
        }
        
        $filePath = Join-Path (Get-Location) ($localPath.TrimStart('/'))
        
        Write-Host "Request: $($request.HttpMethod) $localPath" -ForegroundColor Gray
        
        if (Test-Path $filePath -PathType Leaf) {
            $content = Get-Content $filePath -Raw -Encoding UTF8
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
            
            $extension = [System.IO.Path]::GetExtension($filePath)
            $contentType = "text/html; charset=utf-8"
            if ($extension -eq ".css") { $contentType = "text/css; charset=utf-8" }
            if ($extension -eq ".js") { $contentType = "application/javascript; charset=utf-8" }
            if ($extension -eq ".json") { $contentType = "application/json; charset=utf-8" }
            
            $response.ContentType = $contentType
            $response.ContentLength64 = $buffer.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        } else {
            $notFound = "404 - File Not Found: $localPath"
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($notFound)
            $response.ContentType = "text/plain; charset=utf-8"
            $response.StatusCode = 404
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        
        $response.Close()
    }
} finally {
    $listener.Stop()
    Write-Host "Server stopped" -ForegroundColor Red
}

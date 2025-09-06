# Simple HTTP Server for testing Google OAuth
# Run this script to start local server on port 8080

Write-Host "🚀 Starting local HTTP server..." -ForegroundColor Green
Write-Host "📂 Serving files from: $(Get-Location)" -ForegroundColor Yellow
Write-Host "🌐 Open in browser: http://localhost:8080" -ForegroundColor Cyan
Write-Host "🔑 Test login at: http://localhost:8080/index.html" -ForegroundColor Magenta
Write-Host ""
Write-Host "⚠️  IMPORTANT: You need to add 'http://localhost:8080' to Google Cloud Console" -ForegroundColor Red
Write-Host "   → Go to: https://console.cloud.google.com" -ForegroundColor Yellow
Write-Host "   -> APIs and Services -> Credentials -> OAuth 2.0 Client IDs" -ForegroundColor Yellow
Write-Host "   -> Edit your Client ID -> Authorized JavaScript origins" -ForegroundColor Yellow
Write-Host "   -> Add: http://localhost:8080" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop server" -ForegroundColor Gray
Write-Host "================================" -ForegroundColor Green

# Start HTTP listener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8080/")
$listener.Start()

Write-Host "✅ Server started on http://localhost:8080" -ForegroundColor Green

# Open browser automatically
Start-Process "http://localhost:8080/index.html"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        # Get requested file path
        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/") { $localPath = "/index.html" }
        
        $filePath = Join-Path (Get-Location) $localPath.TrimStart('/')
        
        Write-Host "📄 Request: $($request.HttpMethod) $localPath" -ForegroundColor Cyan
        
        if (Test-Path $filePath -PathType Leaf) {
            # Serve file
            $content = Get-Content $filePath -Raw -Encoding UTF8
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
            
            # Set content type
            $extension = [System.IO.Path]::GetExtension($filePath)
            $contentType = switch ($extension) {
                ".html" { "text/html; charset=utf-8" }
                ".css" { "text/css; charset=utf-8" }
                ".js" { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".png" { "image/png" }
                ".jpg" { "image/jpeg" }
                ".svg" { "image/svg+xml" }
                default { "text/plain; charset=utf-8" }
            }
            
            $response.ContentType = $contentType
            $response.ContentLength64 = $buffer.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        } else {
            # File not found
            $notFound = "404 - File Not Found: $localPath"
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($notFound)
            $response.ContentType = "text/plain; charset=utf-8"
            $response.StatusCode = 404
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            Write-Host "❌ File not found: $filePath" -ForegroundColor Red
        }
        
        $response.Close()
    }
} finally {
    $listener.Stop()
    Write-Host "Server stopped" -ForegroundColor Red
}

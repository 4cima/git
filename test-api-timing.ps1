$tests = @(
    @{ Name = "1990s"; Url = "http://localhost:3000/api/movies?year=1990-1999&page=1&limit=72&sort=popularity&order=desc" },
    @{ Name = "2000s"; Url = "http://localhost:3000/api/movies?year=2000-2010&page=1&limit=72&sort=popularity&order=desc" },
    @{ Name = "2020+"; Url = "http://localhost:3000/api/movies?year=2020-2026&page=1&limit=72&sort=popularity&order=desc" }
)

foreach ($test in $tests) {
    Write-Host "`n========================================="
    Write-Host "Testing: $($test.Name)"
    Write-Host "=========================================`n"
    
    $times = @()
    
    1..5 | ForEach-Object {
        $start = Get-Date
        try {
            Invoke-WebRequest -Uri $test.Url -UseBasicParsing | Out-Null
            $duration = ((Get-Date) - $start).TotalMilliseconds
            $times += $duration
            Write-Host "  Attempt $_: $([math]::Round($duration))ms"
        } catch {
            Write-Host "  Attempt $_: ERROR - $($_.Exception.Message)"
        }
    }
    
    if ($times.Count -gt 0) {
        $avg = ($times | Measure-Object -Average).Average
        $min = ($times | Measure-Object -Minimum).Minimum
        $max = ($times | Measure-Object -Maximum).Maximum
        
        Write-Host "`nStatistics:"
        Write-Host "  Average: $([math]::Round($avg))ms"
        Write-Host "  Min: $([math]::Round($min))ms"
        Write-Host "  Max: $([math]::Round($max))ms"
    }
}

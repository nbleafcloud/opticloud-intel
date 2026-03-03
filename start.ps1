Set-Location "D:\Git\usr\repo2\.claude\worktrees\interesting-matsumoto\opticloud-intel"
$env:PATH = "D:\nodejs;" + $env:PATH
& "D:\nodejs\node.exe" ".\node_modules\next\dist\bin\next" "dev"

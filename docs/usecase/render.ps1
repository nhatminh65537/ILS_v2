# Render tất cả file .puml trong thư mục này ra .svg.
# Yêu cầu: Java (đã có) + plantuml.jar (cùng thư mục).
#
# Dùng:  pwsh docs/usecase/render.ps1
#   hoặc:  powershell -File docs/usecase/render.ps1

$ErrorActionPreference = "Stop"
$jar = Join-Path $PSScriptRoot "plantuml.jar"

if (-not (Test-Path $jar)) {
    Write-Host "Khong tim thay plantuml.jar. Dang tai ve..." -ForegroundColor Yellow
    $ProgressPreference = "SilentlyContinue"
    Invoke-WebRequest `
        -Uri "https://github.com/plantuml/plantuml/releases/latest/download/plantuml.jar" `
        -OutFile $jar
}

Write-Host "Render *.puml -> *.svg ..." -ForegroundColor Cyan
java -jar $jar -tsvg "$PSScriptRoot\*.puml"

Write-Host "Xong. Cac file SVG:" -ForegroundColor Green
Get-ChildItem -Path $PSScriptRoot -Filter *.svg | Select-Object Name, Length

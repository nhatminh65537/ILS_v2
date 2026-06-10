# Render tất cả file .puml trong thư mục này ra .svg.
# Dùng chung plantuml.jar với docs/usecase (không cần tải lại).
#
# Dùng:  pwsh docs/diagrams/render.ps1

$ErrorActionPreference = "Stop"
$jar = Join-Path $PSScriptRoot "..\usecase\plantuml.jar"

if (-not (Test-Path $jar)) {
    Write-Host "Khong tim thay plantuml.jar trong docs/usecase. Dang tai ve..." -ForegroundColor Yellow
    $ProgressPreference = "SilentlyContinue"
    Invoke-WebRequest `
        -Uri "https://github.com/plantuml/plantuml/releases/latest/download/plantuml.jar" `
        -OutFile $jar
}

Write-Host "Render *.puml -> *.svg ..." -ForegroundColor Cyan
java -jar $jar -tsvg "$PSScriptRoot\*.puml"

Write-Host "Xong. Cac file SVG:" -ForegroundColor Green
Get-ChildItem -Path $PSScriptRoot -Filter *.svg | Select-Object Name, Length

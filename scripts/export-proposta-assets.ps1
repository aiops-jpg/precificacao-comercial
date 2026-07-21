<#
Gera os assets estáticos usados pelo editor visual da proposta (app/page.js, step "editor"):
  - public/proposta-slides/slide-{N}.png — imagem de cada slide do template, fiel ao design real.
  - lib/slideGeometry.json — posição/tamanho (em % do slide) de cada shape, por nome.

Roda localmente via automação COM do PowerPoint (Windows + Microsoft PowerPoint instalado) — não
tem equivalente server-side, então precisa ser rodado manualmente sempre que
templates/proposta-template.pptx for alterado (shape novo, renomeado, movido, slide adicionado/
removido). Não salva nada no template — só lê e exporta.

Uso: powershell -File scripts\export-proposta-assets.ps1
#>

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$templatePath = Join-Path $root 'templates\proposta-template.pptx'
$outDir = Join-Path $root 'public\proposta-slides'
$geometryPath = Join-Path $root 'lib\slideGeometry.json'

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$msoGroup = 6

function Add-ShapeGeometry {
    param($Shape, [int]$SlideNum, [double]$SlideWidth, [double]$SlideHeight, [System.Collections.Generic.List[object]]$Results)

    if ($Shape.Type -eq $msoGroup) {
        foreach ($child in $Shape.GroupItems) {
            Add-ShapeGeometry -Shape $child -SlideNum $SlideNum -SlideWidth $SlideWidth -SlideHeight $SlideHeight -Results $Results
        }
        return
    }

    $Results.Add([PSCustomObject]@{
        slide     = $SlideNum
        name      = $Shape.Name
        leftPct   = [math]::Round(($Shape.Left / $SlideWidth) * 100, 4)
        topPct    = [math]::Round(($Shape.Top / $SlideHeight) * 100, 4)
        widthPct  = [math]::Round(($Shape.Width / $SlideWidth) * 100, 4)
        heightPct = [math]::Round(($Shape.Height / $SlideHeight) * 100, 4)
    })
}

Write-Host "Abrindo $templatePath..."
$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = [Microsoft.Office.Core.MsoTriState]::msoTrue
$pres = $ppt.Presentations.Open($templatePath, $true, $false, $false)

$slideWidth = $pres.PageSetup.SlideWidth
$slideHeight = $pres.PageSetup.SlideHeight
Write-Host "Slides: $($pres.Slides.Count) | Dimensao: ${slideWidth}x${slideHeight}pt"

$allGeometry = [System.Collections.Generic.List[object]]::new()

for ($i = 1; $i -le $pres.Slides.Count; $i++) {
    $slide = $pres.Slides.Item($i)
    $pngPath = Join-Path $outDir ("slide-{0}.png" -f $i)
    $slide.Export($pngPath, "PNG", 1600, 900)

    foreach ($shp in $slide.Shapes) {
        Add-ShapeGeometry -Shape $shp -SlideNum $i -SlideWidth $slideWidth -SlideHeight $slideHeight -Results $allGeometry
    }
    Write-Host "Slide $i exportado ($($slide.Shapes.Count) shapes de topo)"
}

$allGeometry | ConvertTo-Json -Depth 3 | Set-Content -Path $geometryPath -Encoding utf8
Write-Host "Geometria salva em $geometryPath ($($allGeometry.Count) shapes no total)"

$pres.Close()
$ppt.Quit()
Write-Host "Concluido."

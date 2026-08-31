param(
  [Parameter(Mandatory = $true)]
  [string]$SourceDirectory
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$officialDirectory = Join-Path $SourceDirectory 'logo-oficial'
$fullLogoDirectory = Get-ChildItem -LiteralPath $SourceDirectory -Directory |
  Where-Object { $_.Name -like 'logo-completa-fundo-invis*' } |
  Select-Object -First 1 -ExpandProperty FullName
$brandDirectory = Join-Path $projectRoot 'client/public/brand'
$officialSource = Join-Path $officialDirectory 'favicon-512x512.png'

if (-not $fullLogoDirectory) {
  throw 'Diretório da logo completa transparente não encontrado.'
}

if (-not (Test-Path -LiteralPath $officialSource)) {
  throw "Logo oficial não encontrada em: $officialSource"
}

New-Item -ItemType Directory -Force -Path $brandDirectory | Out-Null

foreach ($size in 16, 32, 48, 64, 128, 180, 192, 256, 512) {
  Copy-Item -LiteralPath (Join-Path $officialDirectory "favicon-${size}x${size}.png") `
    -Destination (Join-Path $brandDirectory "favicon-${size}.png") -Force
}

Copy-Item -LiteralPath (Join-Path $officialDirectory 'favicon.ico') `
  -Destination (Join-Path $brandDirectory 'favicon.ico') -Force
Copy-Item -LiteralPath (Join-Path $fullLogoDirectory 'favicon-512x512.png') `
  -Destination (Join-Path $brandDirectory 'logo.png') -Force

function New-BrandImage {
  param(
    [Parameter(Mandatory = $true)][System.Drawing.Image]$Source,
    [Parameter(Mandatory = $true)][string]$Destination,
    [Parameter(Mandatory = $true)][int]$Width,
    [Parameter(Mandatory = $true)][int]$Height,
    [Parameter(Mandatory = $true)][ValidateSet('square', 'round', 'foreground', 'background', 'splash')][string]$Kind,
    [switch]$Opaque
  )

  $pixelFormat = if ($Opaque) {
    [System.Drawing.Imaging.PixelFormat]::Format24bppRgb
  } else {
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  }
  $bitmap = New-Object System.Drawing.Bitmap($Width, $Height, $pixelFormat)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

  $background = [System.Drawing.ColorTranslator]::FromHtml('#F4FAF7')
  if ($Kind -in @('square', 'background', 'splash')) {
    $graphics.Clear($background)
  } else {
    $graphics.Clear([System.Drawing.Color]::Transparent)
  }

  if ($Kind -eq 'round') {
    $brush = New-Object System.Drawing.SolidBrush($background)
    $graphics.FillEllipse($brush, 0, 0, $Width - 1, $Height - 1)
    $brush.Dispose()
  }

  if ($Kind -notin @('background')) {
    $scale = switch ($Kind) {
      'square' { 0.92 }
      'round' { 0.84 }
      'foreground' { 0.88 }
      'splash' { 0.28 }
    }
    $side = [int]([Math]::Round([Math]::Min($Width, $Height) * $scale))
    $x = [int](($Width - $side) / 2)
    $y = [int](($Height - $side) / 2)
    $graphics.DrawImage($Source, $x, $y, $side, $side)
  }

  $destinationDirectory = Split-Path -Parent $Destination
  New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null
  $bitmap.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

$sourceImage = [System.Drawing.Image]::FromFile($officialSource)
try {
  New-BrandImage $sourceImage (Join-Path $brandDirectory 'icon-maskable-192.png') 192 192 'square'
  New-BrandImage $sourceImage (Join-Path $brandDirectory 'icon-maskable-512.png') 512 512 'square'

  $androidDensities = @{
    'ldpi' = @{ legacy = 36; adaptive = 81 }
    'mdpi' = @{ legacy = 48; adaptive = 108 }
    'hdpi' = @{ legacy = 72; adaptive = 162 }
    'xhdpi' = @{ legacy = 96; adaptive = 216 }
    'xxhdpi' = @{ legacy = 144; adaptive = 324 }
    'xxxhdpi' = @{ legacy = 192; adaptive = 432 }
  }

  foreach ($density in $androidDensities.Keys) {
    $directory = Join-Path $projectRoot "android/app/src/main/res/mipmap-$density"
    $legacySize = $androidDensities[$density].legacy
    $adaptiveSize = $androidDensities[$density].adaptive
    New-BrandImage $sourceImage (Join-Path $directory 'ic_launcher.png') $legacySize $legacySize 'square'
    New-BrandImage $sourceImage (Join-Path $directory 'ic_launcher_round.png') $legacySize $legacySize 'round'
    New-BrandImage $sourceImage (Join-Path $directory 'ic_launcher_foreground.png') $adaptiveSize $adaptiveSize 'foreground'
    New-BrandImage $sourceImage (Join-Path $directory 'ic_launcher_background.png') $adaptiveSize $adaptiveSize 'background'
  }

  New-BrandImage $sourceImage `
    (Join-Path $projectRoot 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png') `
    1024 1024 'square' -Opaque

  Get-ChildItem (Join-Path $projectRoot 'android/app/src/main/res') -Filter 'splash.png' -File -Recurse | ForEach-Object {
    $existing = [System.Drawing.Image]::FromFile($_.FullName)
    try {
      $width = $existing.Width
      $height = $existing.Height
    } finally {
      $existing.Dispose()
    }
    New-BrandImage $sourceImage $_.FullName $width $height 'splash'
  }

  Get-ChildItem (Join-Path $projectRoot 'ios/App/App/Assets.xcassets/Splash.imageset') -Filter '*.png' -File | ForEach-Object {
    $existing = [System.Drawing.Image]::FromFile($_.FullName)
    try {
      $width = $existing.Width
      $height = $existing.Height
    } finally {
      $existing.Dispose()
    }
    New-BrandImage $sourceImage $_.FullName $width $height 'splash'
  }
} finally {
  $sourceImage.Dispose()
}

Write-Output 'Assets de marca web, Android e iOS atualizados.'

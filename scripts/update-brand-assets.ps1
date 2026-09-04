param(
  [Parameter(Mandatory = $true)]
  [string]$SourceDirectory
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$officialDirectory = Join-Path $SourceDirectory 'logo-oficial'
$fullLogoDirectory = Join-Path $SourceDirectory 'logo-completa-transparente'
$brandDirectory = Join-Path $projectRoot 'client/public/brand'
$officialSource = Join-Path $officialDirectory 'favicon-512x512.png'
$appIconSource = Join-Path $SourceDirectory 'app-icon.png'

if (-not (Test-Path -LiteralPath $officialSource)) {
  throw "Logo oficial não encontrada em: $officialSource"
}

if (-not (Test-Path -LiteralPath $appIconSource)) {
  throw "Ícone do aplicativo não encontrado em: $appIconSource"
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
    [Parameter(Mandatory = $true)][ValidateSet('app', 'square', 'round', 'foreground', 'background', 'splash')][string]$Kind,
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
  if ($Kind -in @('app', 'square', 'background', 'splash')) {
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
      'app' { 1.0 }
      'square' { 0.92 }
      'round' { 0.84 }
      'foreground' { 0.62 }
      'splash' { 0.18 }
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
$appIconImage = [System.Drawing.Image]::FromFile($appIconSource)
try {
  New-BrandImage $appIconImage (Join-Path $brandDirectory 'icon-maskable-192.png') 192 192 'app' -Opaque
  New-BrandImage $appIconImage (Join-Path $brandDirectory 'icon-maskable-512.png') 512 512 'app' -Opaque
  Copy-Item -LiteralPath (Join-Path $brandDirectory 'icon-maskable-192.png') `
    -Destination (Join-Path $brandDirectory 'app-icon-192.png') -Force
  Copy-Item -LiteralPath (Join-Path $brandDirectory 'icon-maskable-512.png') `
    -Destination (Join-Path $brandDirectory 'app-icon-512.png') -Force
  Copy-Item -LiteralPath (Join-Path $brandDirectory 'icon-maskable-192.png') `
    -Destination (Join-Path $brandDirectory 'app-icon-maskable-192.png') -Force
  Copy-Item -LiteralPath (Join-Path $brandDirectory 'icon-maskable-512.png') `
    -Destination (Join-Path $brandDirectory 'app-icon-maskable-512.png') -Force

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
    New-BrandImage $appIconImage (Join-Path $directory 'ic_launcher.png') $legacySize $legacySize 'app' -Opaque
    New-BrandImage $appIconImage (Join-Path $directory 'ic_launcher_round.png') $legacySize $legacySize 'app' -Opaque
    New-BrandImage $appIconImage (Join-Path $directory 'ic_launcher_foreground.png') $adaptiveSize $adaptiveSize 'foreground'
    New-BrandImage $appIconImage (Join-Path $directory 'ic_launcher_background.png') $adaptiveSize $adaptiveSize 'background'
  }

  New-BrandImage $appIconImage `
    (Join-Path $projectRoot 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png') `
    1024 1024 'app' -Opaque

  Get-ChildItem (Join-Path $projectRoot 'android/app/src/main/res') -Filter 'splash.png' -File -Recurse | ForEach-Object {
    $existing = [System.Drawing.Image]::FromFile($_.FullName)
    try {
      $width = $existing.Width
      $height = $existing.Height
    } finally {
      $existing.Dispose()
    }
    New-BrandImage $appIconImage $_.FullName $width $height 'splash'
  }

  Get-ChildItem (Join-Path $projectRoot 'ios/App/App/Assets.xcassets/Splash.imageset') -Filter '*.png' -File | ForEach-Object {
    $existing = [System.Drawing.Image]::FromFile($_.FullName)
    try {
      $width = $existing.Width
      $height = $existing.Height
    } finally {
      $existing.Dispose()
    }
    New-BrandImage $appIconImage $_.FullName $width $height 'splash'
  }
} finally {
  $appIconImage.Dispose()
  $sourceImage.Dispose()
}

$brotoSource = Join-Path $SourceDirectory 'broto-assistente.png'
if (Test-Path -LiteralPath $brotoSource) {
  $notificationIcons = Join-Path $projectRoot 'client/public/media/notifications/icons'
  New-Item -ItemType Directory -Force -Path $notificationIcons | Out-Null
  $brotoImage = [System.Drawing.Image]::FromFile($brotoSource)
  try {
    foreach ($size in 96, 192) {
      $bitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.DrawImage($brotoImage, 0, 0, $size, $size)
      $bitmap.Save((Join-Path $notificationIcons "evolyn-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
      $graphics.Dispose()
      $bitmap.Dispose()
    }
  } finally {
    $brotoImage.Dispose()
  }
  Write-Output 'Ícones de notificação (broto-assistente) atualizados.'
} else {
  Write-Output 'Aviso: broto-assistente.png ausente — ícones de notificação não foram regenerados.'
}

Write-Output 'Assets de marca web, Android e iOS atualizados.'

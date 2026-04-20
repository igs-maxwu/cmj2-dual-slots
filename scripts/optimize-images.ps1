Add-Type -AssemblyName System.Drawing

$srcDir  = "C:\Users\maxwu\Documents\ClaudeAI\DualSlot\public\assets\spirits"
$bakDir  = "C:\Users\maxwu\Documents\ClaudeAI\DualSlot\public\assets\spirits_original"
$targetW = 512

# Backup originals first
if (-not (Test-Path $bakDir)) {
    New-Item -ItemType Directory -Path $bakDir | Out-Null
    Write-Host "Backup folder created: $bakDir"
}

$pngs = Get-ChildItem -Path $srcDir -Filter "*.png"

foreach ($file in $pngs) {
    $src = $file.FullName
    $bak = Join-Path $bakDir $file.Name

    # Backup if not already backed up
    if (-not (Test-Path $bak)) {
        Copy-Item $src $bak
    }

    $img    = [System.Drawing.Image]::FromFile($src)
    $origW  = $img.Width
    $origH  = $img.Height
    $ratio  = $origH / $origW
    $newW   = $targetW
    $newH   = [int]($targetW * $ratio)

    $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gfx.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gfx.DrawImage($img, 0, 0, $newW, $newH)

    $img.Dispose()

    # Save as PNG
    $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
               Where-Object { $_.MimeType -eq "image/png" } |
               Select-Object -First 1
    $encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
        [System.Drawing.Imaging.Encoder]::Quality, 90L)

    $bmp.Save($src, $encoder, $encParams)
    $gfx.Dispose()
    $bmp.Dispose()

    $newSize = [int]((Get-Item $src).Length / 1024)
    $origSize = [int]((Get-Item $bak).Length / 1024)
    Write-Host ("{0,-25} {1,5}x{2,-5} -> {3,3}x{4,-5}  {5,6}KB -> {6,4}KB" -f `
        $file.Name, $origW, $origH, $newW, $newH, $origSize, $newSize)
}

Write-Host ""
Write-Host "Done. Originals backed up to: $bakDir"

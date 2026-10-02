# Gera icon-192.png e icon-512.png com a identidade visual da Central Gás
# (chama vermelho/azul + texto), inspirado na logo oficial.
Add-Type -AssemblyName System.Drawing

function Gerar-Icone($tamanho, $arquivo) {
    $bmp = New-Object System.Drawing.Bitmap($tamanho, $tamanho)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    # Fundo branco
    $g.Clear([System.Drawing.Color]::White)

    $cx = $tamanho / 2
    $s = $tamanho / 512.0  # escala baseada em 512

    # Chama azul (maior, atrás) - curva bezier
    $azul = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(11, 61, 145))
    $pathAzul = New-Object System.Drawing.Drawing2D.GraphicsPath
    $pathAzul.AddBezier($cx, (400 * $s), ($cx - 90 * $s), (300 * $s), ($cx - 60 * $s), (180 * $s), ($cx + 10 * $s), (70 * $s))
    $pathAzul.AddBezier(($cx + 10 * $s), (70 * $s), ($cx + 30 * $s), (180 * $s), ($cx + 100 * $s), (240 * $s), $cx, (400 * $s))
    $g.FillPath($azul, $pathAzul)

    # Chama vermelha (menor, na frente, à esquerda)
    $vermelho = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 57, 70))
    $pathVerm = New-Object System.Drawing.Drawing2D.GraphicsPath
    $pathVerm.AddBezier(($cx - 10 * $s), (400 * $s), ($cx - 100 * $s), (320 * $s), ($cx - 80 * $s), (200 * $s), ($cx - 20 * $s), (110 * $s))
    $pathVerm.AddBezier(($cx - 20 * $s), (110 * $s), ($cx - 10 * $s), (210 * $s), ($cx + 50 * $s), (280 * $s), ($cx - 10 * $s), (400 * $s))
    $g.FillPath($vermelho, $pathVerm)

    # Texto "CENTRAL GÁS"
    $fonteCentral = New-Object System.Drawing.Font("Arial", (34 * $s), [System.Drawing.FontStyle]::Bold)
    $fonteGas = New-Object System.Drawing.Font("Arial", (72 * $s), [System.Drawing.FontStyle]::Bold)
    $formato = New-Object System.Drawing.StringFormat
    $formato.Alignment = [System.Drawing.StringAlignment]::Center

    $g.DrawString("CENTRAL", $fonteCentral, $vermelho, $cx, (415 * $s), $formato)
    $g.DrawString("GÁS", $fonteGas, $azul, $cx, (440 * $s), $formato)

    $bmp.Save($arquivo, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Gerado: $arquivo"
}

$pasta = "D:\central-gas\frontend\public"
Gerar-Icone 192 "$pasta\icon-192.png"
Gerar-Icone 512 "$pasta\icon-512.png"

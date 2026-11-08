import os, sys
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

OUT = os.path.join('app', 'icons')
os.makedirs(OUT, exist_ok=True)

def gradient(size, top=(255, 154, 107), bottom=(226, 84, 47)):
    w, h = size, size
    y = np.linspace(0, 1, h).reshape(h, 1)
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    for i in range(3):
        arr[:, :, i] = (top[i] + (bottom[i] - top[i]) * y).astype(np.uint8)
    return Image.fromarray(arr, 'RGB')

def owl(size=512, scale=1.0, bg=True):
    S = size
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    if bg:
        base = gradient(S).convert('RGBA')
        img = base
    d = ImageDraw.Draw(img)
    cx = S // 2
    k = scale

    def P(x, y):
        return (int(cx + (x - 256) * k), int(S / 2 + (y - 256) * k))

    # tufos
    d.polygon([P(150, 150), P(120, 62), P(210, 118)], fill=(194, 78, 46))
    d.polygon([P(362, 150), P(392, 62), P(302, 118)], fill=(194, 78, 46))
    # corpo
    d.ellipse([P(96, 120), P(416, 430)], fill=(252, 246, 238))
    d.ellipse([P(120, 150), P(392, 420)], fill=(255, 154, 107))
    # barriga
    d.ellipse([P(176, 268), P(336, 416)], fill=(255, 235, 214))
    # olhos
    d.ellipse([P(138, 168), P(262, 292)], fill=(255, 255, 255))
    d.ellipse([P(250, 168), P(374, 292)], fill=(255, 255, 255))
    d.ellipse([P(172, 202), P(228, 258)], fill=(46, 42, 38))
    d.ellipse([P(284, 202), P(340, 258)], fill=(46, 42, 38))
    d.ellipse([P(184, 214), P(202, 232)], fill=(255, 255, 255))
    d.ellipse([P(296, 214), P(314, 232)], fill=(255, 255, 255))
    # bico
    d.polygon([P(230, 286), P(282, 286), P(256, 330)], fill=(245, 166, 35))
    # pés
    for fx in (200, 312):
        d.line([P(fx, 418), P(fx, 446)], fill=(245, 166, 35), width=max(4, int(10 * k)))
        d.line([P(fx, 446), P(fx - 22, 462)], fill=(245, 166, 35), width=max(4, int(10 * k)))
        d.line([P(fx, 446), P(fx + 22, 462)], fill=(245, 166, 35), width=max(4, int(10 * k)))
    # chapéu
    d.polygon([P(140, 118), P(372, 118), P(256, 34), P(140, 118)], fill=(46, 42, 38))
    d.rectangle([P(226, 106), P(286, 146)], fill=(58, 52, 46))
    d.line([P(372, 118), P(372, 176)], fill=(245, 166, 35), width=max(4, int(9 * k)))
    d.ellipse([P(358, 168), P(386, 196)], fill=(245, 166, 35))
    return img

# ícones normais
owl(512, 1.0).save(os.path.join(OUT, 'icon-512.png'))
owl(192, 1.0).save(os.path.join(OUT, 'icon-192.png'))
owl(180, 1.0).save(os.path.join(OUT, 'apple-touch-icon.png'))
# maskable: conteúdo dentro da zona segura (~80%)
owl(512, 0.76).save(os.path.join(OUT, 'icon-maskable-512.png'))
print('icons ok', os.listdir(OUT))

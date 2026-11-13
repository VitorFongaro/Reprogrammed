"""Gera o fundo da ANTESSALA (cap3-antessala), a quinta sala do cap. 3.

A última sala antes do núcleo da ADA. Mesma chapa de aço e paleta do capítulo,
mas a porta de saída fica no MEIO da parede, cercada pelo halo vermelho da ADA
(o mesmo anel que ela carrega na cabeça), com colunas dos dois lados e um
caminho no chão até ela. As TRAVAS do selo e o lacre da porta são desenhados
pelo código (objects/SealLocks.js), porque mudam com o puzzle que a IA gerou.

As posições têm de bater com a AntessalaScene (DOOR_X).

Uso:
    python tools/antessala_bg.py
    python tools/antessala_bg.py --out /tmp/antessala_bg.png    # só para olhar
"""
import argparse
import math
import os
import random
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from recepcao_bg import draw_text, blend, clamp  # noqa: E402
import jardim_bg  # noqa: E402
from jardim_bg import wall, stamp_door  # noqa: E402
from montagem_bg import floor  # noqa: E402

jardim_bg.GLASS = (-1, -1)          # parede inteira

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "client", "assets", "images")

W, H = 1280, 704
FLOOR = (32, 128, 1216, 544)
SEED = 707

DOOR_IN_X = 128
DOOR_X = 640                        # a porta do núcleo, no meio
RED = (255, 42, 74)


def halo(px):
    """O halo da ADA em volta da porta: anel tracejado e raios curtos."""
    cx, cy = DOOR_X, 70
    for a in range(0, 360, 2):
        if (a // 6) % 2:
            continue
        for r in (78, 79, 80):
            x = int(cx + r * math.cos(math.radians(a)))
            y = int(cy + r * math.sin(math.radians(a)) * 0.82)
            if 0 <= y < 126:
                px[x, y] = (RED if r == 79 else (120, 20, 34)) + (255,)
    for a in range(200, 341, 20):                              # raios para cima
        for r in range(88, 100):
            x = int(cx + r * math.cos(math.radians(a)))
            y = int(cy + r * math.sin(math.radians(a)) * 0.82)
            if 0 <= y < 126:
                px[x, y] = (200, 30, 54, 255)


def columns(px):
    """Duas colunas escuras com friso vermelho, ladeando a porta."""
    for cx in (DOOR_X - 150, DOOR_X + 150):
        for y in range(6, 126):
            for x in range(cx - 14, cx + 14):
                edge = abs(x - cx) >= 12
                c = (40, 42, 52) if edge else (24, 25, 32)
                if abs(x - cx) <= 1:
                    c = RED if (y // 10) % 2 == 0 else (110, 18, 30)
                px[x, y] = c + (255,)


def path(px):
    """Caminho no chão do pé da porta até o meio da sala."""
    fx, fy, fw, fh = FLOOR
    for y in range(fy, fy + 300):
        half = 46 + (y - fy) // 10
        for x in range(DOOR_X - half, DOOR_X + half):
            r, g, b, _ = px[x, y]
            borda = abs(abs(x - DOOR_X) - half) < 3
            if borda:
                px[x, y] = blend((r, g, b), RED, 0.55) + (255,)
            else:
                px[x, y] = blend((r, g, b), (40, 10, 16), 0.35) + (255,)


def wall_details(px):
    draw_text(px, "NUCLEO", 300, 40, 3, (230, 60, 80), sombra=(30, 6, 10))
    for x in range(300 - 70, 300 + 70):
        for y in range(68, 71):
            px[x, y] = RED + (255,)


def light(px):
    fx, fy, fw, fh = FLOOR

    def mul(x, y, f):
        r, g, b, _ = px[x, y]
        px[x, y] = (clamp(r * f), clamp(g * f), clamp(b * f), 255)

    for y in range(fy, fy + 17):
        for x in range(fx, fx + fw):
            mul(x, y, 0.65 + 0.35 * ((y - fy) / 16))
    for y in range(fy, fy + fh):
        for x in range(fx, fx + fw):
            d = math.hypot(x - DOOR_X, (y - fy) * 1.2) / 820
            mul(x, y, 1 - 0.5 * max(0.0, min(1.0, d - 0.15)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--porta", default=os.path.join(ASSETS, "controle", "controle_bg.png"),
                    help="fundo de onde a porta padrão é copiada")
    ap.add_argument("--out", default=os.path.join(ASSETS, "antessala", "antessala_bg.png"))
    args = ap.parse_args()

    rng = random.Random(SEED)
    im = Image.new("RGBA", (W, H), (5, 5, 5, 255))
    px = im.load()

    wall(px, rng)
    wall_details(px)
    columns(px)
    halo(px)
    floor(px, rng)
    light(px)
    path(px)
    porta = Image.open(args.porta).convert("RGB")
    stamp_door(px, porta, DOOR_IN_X)
    stamp_door(px, porta, DOOR_X)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    im.save(args.out)
    print("salvo:", os.path.abspath(args.out))


if __name__ == "__main__":
    main()

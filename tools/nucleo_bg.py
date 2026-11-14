"""Gera o fundo do NÚCLEO (cap3-nucleo), a sala da ADA, a última do jogo.

A mesma chapa de aço e paleta do capítulo, numa sala aberta como o hall da
WITCH: a ARENA no centro, um anel enorme no chão (o halo da ADA deitado). Na
parede, o painel grande no meio e quatro telas, duas de cada lado: nelas a
ADA expõe o que aprendeu sobre a Artemis (o conteúdo é desenhado pelo código,
porque mostra o perfil de aprendizagem de verdade).

Contador `conectados`, o laço dela escrito na parede e as lembranças dos
andares são desenhados pelo código (scenes/chapter3/NucleoScene.js), porque
mudam com a luta. As posições têm de bater com a cena (ARENA, telas, portas).

Uso:
    python tools/nucleo_bg.py
    python tools/nucleo_bg.py --out /tmp/nucleo_bg.png    # só para olhar
"""
import argparse
import math
import os
import random
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from recepcao_bg import blend, clamp  # noqa: E402
import jardim_bg  # noqa: E402
from jardim_bg import wall, stamp_door  # noqa: E402
from montagem_bg import floor  # noqa: E402

jardim_bg.GLASS = (-1, -1)          # parede inteira

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "client", "assets", "images")

W, H = 1280, 704
FLOOR = (32, 128, 1216, 544)
SEED = 808

DOOR_IN_X = 128
DOOR_OUT_X = 1152
RED = (255, 42, 74)
RED_DIM = (110, 16, 30)

# Coordenadas do MAPA (tela = mapa + 8 no y).
ARENA = (640, 412, 330, 185)        # centro x, centro y, raio x, raio y
SCREENS_X = (206, 304, 892, 990)    # canto esquerdo das quatro telas da parede
SCREEN_W = 84
PANEL = (440, 840)                  # painel grande do meio (x)


def in_ellipse(x, y, rx, ry):
    cx, cy = ARENA[0], ARENA[1]
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1


def arena(px):
    """O halo da ADA deitado no chão: disco escuro, anéis tracejados e marcas."""
    cx, cy, rx, ry = ARENA
    for y in range(cy - ry - 4, cy + ry + 5):
        for x in range(cx - rx - 4, cx + rx + 5):
            if not in_ellipse(x, y, rx, ry):
                continue
            r, g, b, _ = px[x, y]
            d = math.hypot((x - cx) / rx, (y - cy) / ry)
            px[x, y] = blend((r, g, b), (18, 4, 8), 0.45 + 0.25 * (1 - d)) + (255,)
    # anéis
    for k, (fr, dash) in enumerate(((1.0, 4), (0.97, 0), (0.62, 6), (0.30, 0))):
        for a10 in range(0, 3600, 3):
            a = math.radians(a10 / 10)
            if dash and (a10 // (dash * 10)) % 2:
                continue
            x = int(cx + rx * fr * math.cos(a))
            y = int(cy + ry * fr * math.sin(a))
            px[x, y] = (RED if k != 1 else RED_DIM) + (255,)
    # marcas de hora (12), como o relógio da WITCH — só que vermelhas
    for h in range(12):
        a = math.radians(h * 30)
        for t in range(0, 14):
            fr = 0.82 + t / 140
            x = int(cx + rx * fr * math.cos(a))
            y = int(cy + ry * fr * math.sin(a))
            for dx in (0, 1):
                px[x + dx, y] = RED + (255,)


def wall_frames(px):
    """Molduras na parede: as quatro telas do perfil e o painel grande sobre a
    arena (o contador e o laço da ADA são escritos nele pelo código)."""
    def frame(x0, y0, x1, y1, lit):
        for y in range(y0, y1):
            for x in range(x0, x1):
                edge = x in (x0, x1 - 1) or y in (y0, y1 - 1)
                px[x, y] = ((60, 62, 74) if edge else (6, 6, 10)) + (255,)
        for x in range(x0 + 2, x1 - 2):
            px[x, y1 - 3] = lit + (255,)
    for x0 in SCREENS_X:
        frame(x0, 18, x0 + SCREEN_W, 106, RED_DIM)
    frame(PANEL[0], 10, PANEL[1], 116, RED)


def light(px):
    fx, fy, fw, fh = FLOOR
    cx, cy = ARENA[0], ARENA[1]

    def mul(x, y, f):
        r, g, b, _ = px[x, y]
        px[x, y] = (clamp(r * f), clamp(g * f), clamp(b * f), 255)

    for y in range(fy, fy + 17):
        for x in range(fx, fx + fw):
            mul(x, y, 0.65 + 0.35 * ((y - fy) / 16))
    for y in range(fy, fy + fh):
        for x in range(fx, fx + fw):
            d = math.hypot(x - cx, (y - cy) * 1.4) / 900
            mul(x, y, 1 - 0.55 * max(0.0, min(1.0, d - 0.1)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--porta", default=os.path.join(ASSETS, "controle", "controle_bg.png"),
                    help="fundo de onde a porta padrão é copiada")
    ap.add_argument("--out", default=os.path.join(ASSETS, "nucleo", "nucleo_bg.png"))
    args = ap.parse_args()

    rng = random.Random(SEED)
    im = Image.new("RGBA", (W, H), (5, 5, 5, 255))
    px = im.load()

    wall(px, rng)
    wall_frames(px)
    floor(px, rng)
    light(px)
    arena(px)
    porta = Image.open(args.porta).convert("RGB")
    stamp_door(px, porta, DOOR_IN_X)
    stamp_door(px, porta, DOOR_OUT_X)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    im.save(args.out)
    print("salvo:", os.path.abspath(args.out))


if __name__ == "__main__":
    main()

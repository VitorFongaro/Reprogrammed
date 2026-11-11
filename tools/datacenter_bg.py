"""Gera o fundo do DATA CENTER (cap3-datacenter), a terceira sala do cap. 3.

O núcleo da Elysium, mesma chapa de aço e paleta preto e vermelho das outras
salas do capítulo. Na parede do fundo, uma fileira de armários de servidor com
LEDs; no chão, o piso elevado com placas perfuradas de ventilação e as calhas
de cabo. As estações de backup (o puzzle) são desenhadas pelo código
(objects/BackupStations.js), porque mudam com o puzzle que a IA gerou, e a
blindagem da porta de saída também (ela sobe quando o backup termina).

Uso:
    python tools/datacenter_bg.py
    python tools/datacenter_bg.py --out /tmp/datacenter_bg.png    # só para olhar
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
SEED = 505

DOOR_IN_X = 128
DOOR_X = 1152
SIGN_CX = 640
SIGN_TOP = 22
CABINETS = (230, 1050)              # trecho da parede com armários (mapa)
CAB_W = 58
RED = (255, 42, 74)


def cabinets(px, rng):
    """Armários de servidor encostados na parede, com LEDs vermelhos e verdes."""
    x0, x1 = CABINETS
    top, bot = 64, 124
    for cx in range(x0, x1 - CAB_W + 1, CAB_W + 6):
        for y in range(top, bot):
            for x in range(cx, cx + CAB_W):
                edge = x in (cx, cx + CAB_W - 1) or y == top
                c = (52, 56, 68) if edge else (22, 24, 30)
                if not edge and (y - top) % 9 == 0:
                    c = (34, 37, 46)                      # gaveta
                px[x, y] = c + (255,)
        for k in range(5):
            ly = top + 5 + k * 9
            for j in range(3):
                lx = cx + CAB_W - 10 - j * 5
                led = RED if rng.random() < 0.6 else (60, 220, 110)
                if rng.random() < 0.25:
                    led = (40, 14, 18)
                px[lx, ly] = led + (255,)
                px[lx + 1, ly] = led + (255,)


def vents(px):
    """Placas perfuradas do piso elevado (ventilação), em fileiras."""
    fx, fy, fw, fh = FLOOR
    for ty in range(fy + 64, fy + fh - 64, 128):
        for tx in range(fx + 64 * 14, fx + fw - 64, 128):
            for y in range(ty + 6, ty + 58, 6):
                for x in range(tx + 6, tx + 58, 6):
                    px[x, y] = (12, 12, 15, 255)
                    px[x + 1, y] = (12, 12, 15, 255)


def cable_tray(px):
    """Calha de cabos cortando o piso na horizontal, perto do fundo."""
    fx, fy, fw, fh = FLOOR
    y0 = fy + fh - 40
    for y in range(y0, y0 + 14):
        for x in range(fx, fx + fw):
            if y in (y0, y0 + 13):
                c = (80, 84, 96)
            else:
                c = (18, 18, 22)
                k = (x // 3 + (y - y0)) % 7
                if 2 <= y - y0 <= 11 and k in (0, 1):
                    c = blend((150, 30, 46), (40, 44, 54), ((x // 40) % 3) / 2)
            px[x, y] = c + (255,)


def wall_details(px):
    draw_text(px, "DATA CENTER", SIGN_CX, SIGN_TOP, 4, (230, 60, 80), sombra=(30, 6, 10))
    for x in range(SIGN_CX - 160, SIGN_CX + 160):
        for y in range(SIGN_TOP + 34, SIGN_TOP + 37):
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
            d = math.hypot(x - 560, (y - fy - 200) * 1.3) / 760
            mul(x, y, 1 - 0.45 * max(0.0, min(1.0, d - 0.3)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--porta", default=os.path.join(ASSETS, "controle", "controle_bg.png"),
                    help="fundo de onde a porta padrão é copiada")
    ap.add_argument("--out", default=os.path.join(ASSETS, "datacenter", "datacenter_bg.png"))
    args = ap.parse_args()

    rng = random.Random(SEED)
    im = Image.new("RGBA", (W, H), (5, 5, 5, 255))
    px = im.load()

    wall(px, rng)
    wall_details(px)
    cabinets(px, rng)
    floor(px, rng)
    vents(px)
    light(px)
    cable_tray(px)
    porta = Image.open(args.porta).convert("RGB")
    stamp_door(px, porta, DOOR_IN_X)
    stamp_door(px, porta, DOOR_X)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    im.save(args.out)
    print("salvo:", os.path.abspath(args.out))


if __name__ == "__main__":
    main()

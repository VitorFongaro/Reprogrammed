"""Gera o fundo da REFRIGERAÇÃO (cap3-refrigeracao), a segunda sala do cap. 3.

O núcleo da Elysium, mesma chapa de aço e mesma paleta preto e vermelho da
linha de montagem. Na parede do fundo, o cano de refrigerante que alimenta os
RACKS (os racks são desenhados pelo código, objects/CoolingRacks.js, porque
mudam com o puzzle que a IA gerou). Cortando a sala de cima a baixo, a GRADE de
exaustão do piso: o calor dos racks sai por ela em vapor (também no código) e é
o que bloqueia a passagem até o resfriamento ficar certo.

As posições da grade têm de bater com a RefrigeracaoScene (DUCT).

Uso:
    python tools/refrigeracao_bg.py
    python tools/refrigeracao_bg.py --out /tmp/refrigeracao_bg.png    # só para olhar
"""
import argparse
import math
import os
import random
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import recepcao_bg  # noqa: E402
from recepcao_bg import draw_text, blend, clamp  # noqa: E402
import jardim_bg  # noqa: E402
from jardim_bg import wall, stamp_door  # noqa: E402
from montagem_bg import floor  # noqa: E402

jardim_bg.GLASS = (-1, -1)          # parede inteira
# A fonte do letreiro não tinha o F (o draw_text lê o dicionário do recepcao_bg).
recepcao_bg.GLYPHS["F"] = ("#####", "#....", "#....", "####.", "#....", "#....", "#....")

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "client", "assets", "images")

W, H = 1280, 704
FLOOR = (32, 128, 1216, 544)
SEED = 404

DOOR_IN_X = 128
DOOR_X = 1152
# Em coordenadas do MAPA (tela = mapa + 8 no y).
DUCT = (900, 964)                   # grade de exaustão, de cima a baixo do piso
PIPE_Y = 100                        # cano de refrigerante na parede (centro)
PIPE_X = (230, 860)
SIGN_CX = 560
SIGN_TOP = 30
RED = (255, 42, 74)
ICE = (120, 200, 235)


def pipe(px):
    """Cano grosso de refrigerante na base da parede, com braçadeiras e válvulas."""
    x0, x1 = PIPE_X
    for x in range(x0, x1):
        for dy in range(-7, 8):
            y = PIPE_Y + dy
            t = (dy + 7) / 14
            c = blend((92, 150, 178), (26, 44, 60), t)
            if dy == -5:
                c = (150, 210, 235)
            if (x - x0) % 72 < 6:
                c = (60, 64, 76) if abs(dy) < 7 else (30, 32, 38)
            px[x, y] = c + (255,)
    # descidas do cano até o chão (onde os racks encostam)
    for x in range(x0 + 40, x1, 120):
        for y in range(PIPE_Y + 7, FLOOR[1]):
            for dx in range(-3, 4):
                c = blend((80, 130, 156), (24, 40, 54), (dx + 3) / 6)
                px[x + dx, y] = c + (255,)
    # válvula vermelha no começo do cano
    for y in range(PIPE_Y - 12, PIPE_Y + 13):
        for x in range(x0 - 14, x0):
            d = math.hypot(x - (x0 - 7), y - PIPE_Y)
            if d <= 11:
                px[x, y] = (RED if d < 8 else (110, 18, 30)) + (255,)


def duct(px):
    """A grade de exaustão: fenda funda com ripas e o brilho quente lá embaixo."""
    fx, fy, fw, fh = FLOOR
    x0, x1 = DUCT
    for y in range(fy, fy + fh):
        for x in range(x0, x1):
            edge = x < x0 + 3 or x >= x1 - 3
            if edge:
                c = (96, 100, 112) if x in (x0, x1 - 1) else (50, 52, 60)
            elif (y - fy) % 10 < 3:
                c = (58, 60, 70)                                  # ripa
            else:
                depth = min(x - x0, x1 - 1 - x) / ((x1 - x0) / 2)
                c = blend((14, 8, 10), (90, 20, 26), 0.6 * depth)  # calor lá dentro
            px[x, y] = c + (255,)
    # faixa de perigo nas bordas
    for y in range(fy, fy + fh):
        for x in list(range(x0 - 10, x0 - 2)) + list(range(x1 + 2, x1 + 10)):
            px[x, y] = ((200, 36, 60) if ((x + y) // 6) % 2 == 0 else (20, 16, 18)) + (255,)


def wall_details(px):
    draw_text(px, "RESFRIAMENTO", SIGN_CX, SIGN_TOP, 4, (230, 60, 80), sombra=(30, 6, 10))
    for x in range(SIGN_CX - 190, SIGN_CX + 190):
        for y in range(SIGN_TOP + 34, SIGN_TOP + 38):
            px[x, y] = RED + (255,)
    # termômetro grande pintado na parede, à direita do letreiro
    tx, top, bot = 1040, 22, 98
    for y in range(top, bot):
        for x in range(tx - 6, tx + 7):
            borda = abs(x - tx) >= 5
            px[x, y] = ((70, 74, 86) if borda else ((40, 12, 16) if y < top + 30 else RED)) + (255,)
    for y in range(bot, bot + 14):
        for x in range(tx - 9, tx + 10):
            if math.hypot(x - tx, y - (bot + 6)) <= 8:
                px[x, y] = RED + (255,)
    for k in range(6):
        y = top + 6 + k * 12
        for x in range(tx + 8, tx + 14):
            px[x, y] = (150, 156, 170, 255)


def light(px):
    fx, fy, fw, fh = FLOOR

    def mul(x, y, f):
        r, g, b, _ = px[x, y]
        px[x, y] = (clamp(r * f), clamp(g * f), clamp(b * f), 255)

    for y in range(fy, fy + 17):
        for x in range(fx, fx + fw):
            mul(x, y, 0.65 + 0.35 * ((y - fy) / 16))
    # brilho frio perto dos racks, quente perto da grade
    for y in range(fy, fy + fh):
        for x in range(fx, fx + fw):
            d = math.hypot(x - 560, (y - fy) * 1.6) / 700
            mul(x, y, 1 - 0.4 * max(0.0, min(1.0, d - 0.25)))
            h = max(0.0, 1 - abs(x - sum(DUCT) / 2) / 120)
            if h:
                r, g, b, _ = px[x, y]
                px[x, y] = (clamp(r + 26 * h), g, b, 255)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--porta", default=os.path.join(ASSETS, "controle", "controle_bg.png"),
                    help="fundo de onde a porta padrão é copiada")
    ap.add_argument("--out", default=os.path.join(ASSETS, "refrigeracao", "refrigeracao_bg.png"))
    args = ap.parse_args()

    rng = random.Random(SEED)
    im = Image.new("RGBA", (W, H), (5, 5, 5, 255))
    px = im.load()

    wall(px, rng)
    wall_details(px)
    pipe(px)
    floor(px, rng)
    light(px)
    duct(px)
    porta = Image.open(args.porta).convert("RGB")
    stamp_door(px, porta, DOOR_IN_X)
    stamp_door(px, porta, DOOR_X)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    im.save(args.out)
    print("salvo:", os.path.abspath(args.out))


if __name__ == "__main__":
    main()

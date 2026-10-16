"""Gera o fundo da EXPEDIÇÃO (cap2-expedicao), a triagem do correio do térreo.

Sala de serviço depois da estufa: piso de concreto com junta de dilatação,
faixas de segurança amarelas e a ESTEIRA que corta a sala ao meio, de cima a
baixo. Ela sai de uma escotilha na parede (de onde descem os pacotes) e termina
na passarela, lá embaixo — onde a triagem quebrada despejou a pilha que impede
de atravessar.

A esteira é chão (fica sob tudo), por isso está aqui; as rampas, o empurrador,
a pilha e os móveis são props do Aseprite (tools/expedicao_props.lua), no Tiled
(assets/maps/expedicao.json) ou colocados pela cena. As posições da esteira têm
de bater com a ExpedicaoScene (BELT).

Uso:
    python tools/expedicao_bg.py
    python tools/expedicao_bg.py --out /tmp/expedicao_bg.png    # só para olhar
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

# A parede do jardim pula as linhas de painel no trecho de vidro; aqui é parede
# inteira.
jardim_bg.GLASS = (-1, -1)

# Letras acentuadas do letreiro (5x7: o acento/cedilha ocupa a linha de fora).
recepcao_bg.GLYPHS["X"] = ("#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#")
recepcao_bg.GLYPHS["P"] = ("####.", "#...#", "#...#", "####.", "#....", "#....", "#....")
recepcao_bg.GLYPHS["Ç"] = (".###.", "#...#", "#....", "#....", "#...#", ".###.", "..#..")
recepcao_bg.GLYPHS["Ã"] = (".#.#.", "#.#..", ".###.", "#...#", "#####", "#...#", "#...#")

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "client", "assets", "images")

W, H = 1280, 704
WALL_H = 128
FLOOR = (32, 128, 1216, 544)
SEED = 64

DOOR_IN_X = 128
DOOR_X = 1152

# Esteira (x do mapa = x da tela; y do MAPA). Tem de bater com a ExpedicaoScene.
BELT_X0, BELT_X1 = 594, 646
BELT_END_Y = 554                    # fim da esteira (mapa); a passarela vem depois
SIGN_CX = 340                       # letreiro à esquerda da escotilha
SIGN_TOP = 34
ROUTE_CX = 900                      # quadro de rotas à direita


def floor(px, rng):
    """Concreto com junta a cada 128 px, manchas de óleo e marcas de pneu."""
    fx, fy, fw, fh = FLOOR
    for y in range(fy, fy + fh):
        for x in range(fx, fx + fw):
            n = rng.randint(-3, 3)
            c = (58 + n, 60 + n, 64 + n)
            if (x - fx) % 128 == 0 or (y - fy) % 128 == 0:
                c = (40, 42, 46)
            px[x, y] = c + (255,)
    # manchas de óleo
    for _ in range(9):
        cx, cy = rng.randint(fx + 40, fx + fw - 40), rng.randint(fy + 40, fy + fh - 40)
        rx, ry = rng.randint(10, 26), rng.randint(5, 12)
        for y in range(cy - ry, cy + ry):
            for x in range(cx - rx, cx + rx):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 and rng.random() < 0.8:
                    c = px[x, y]
                    px[x, y] = blend(c[:3], (34, 34, 38), 0.45) + (255,)


def belt(px):
    """Esteira de borracha com chassi de aço, da escotilha até a passarela."""
    for y in range(WALL_H - 30, BELT_END_Y):
        for x in range(BELT_X0, BELT_X1):
            edge = x < BELT_X0 + 5 or x >= BELT_X1 - 5
            if edge:
                c = (118, 124, 138) if x in (BELT_X0 + 1, BELT_X1 - 2) else (78, 82, 94)
            else:
                c = (30, 31, 36)
                if (y // 8) % 2 == 0 and x % 4 == 0:
                    c = (38, 39, 45)                     # textura da borracha
                if y % 16 == 0:
                    c = (22, 23, 27)                     # emenda dos rolos
            px[x, y] = c + (255,)
    # escotilha de onde a esteira sai, com as cortinas de borracha
    for y in range(30, WALL_H - 30):
        for x in range(BELT_X0 - 8, BELT_X1 + 8):
            borda = x < BELT_X0 - 3 or x >= BELT_X1 + 3 or y < 35
            if borda:
                px[x, y] = (88, 92, 104, 255)
            else:
                px[x, y] = ((20, 21, 26) if (x - BELT_X0) % 9 else (12, 12, 16)) + (255,)
    # faixas de segurança dos dois lados da esteira
    for y in range(WALL_H, BELT_END_Y):
        for x in list(range(BELT_X0 - 14, BELT_X0 - 8)) + list(range(BELT_X1 + 8, BELT_X1 + 14)):
            px[x, y] = (196, 160, 40, 255)
    # fim da esteira: zebrado de perigo na passarela
    for y in range(BELT_END_Y, BELT_END_Y + 8):
        for x in range(BELT_X0 - 14, BELT_X1 + 14):
            px[x, y] = ((214, 170, 40) if ((x + y) // 6) % 2 == 0 else (26, 24, 22)) + (255,)


def boards(px):
    """Letreiro e quadro de rotas na parede."""
    draw_text(px, "EXPEDIÇÃO", SIGN_CX, SIGN_TOP, 4, (220, 170, 50), sombra=(20, 16, 8))
    for x in range(SIGN_CX - 110, SIGN_CX + 110):
        for y in range(SIGN_TOP + 34, SIGN_TOP + 40):
            px[x, y] = ((200, 150, 40) if ((x + y) // 6) % 2 == 0 else (24, 22, 20)) + (255,)
    # quadro de rotas: três linhas coloridas com os destinos
    x0, y0, w, h = ROUTE_CX - 90, 22, 180, 80
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            borda = x in (x0, x0 + w - 1) or y in (y0, y0 + h - 1)
            px[x, y] = ((96, 100, 112) if borda else (18, 20, 26)) + (255,)
    for k, (cor, texto) in enumerate((((255, 150, 46), "CARGA"), ((255, 69, 69), "EXPRESSO"), ((74, 140, 230), "NORMAL"))):
        y = y0 + 14 + k * 22
        for yy in range(y, y + 8):
            for xx in range(x0 + 10, x0 + 24):
                px[xx, yy] = cor + (255,)
        draw_text(px, texto, x0 + 30 + len(texto) * 6, y - 3, 2, (200, 206, 220))


def light(px):
    fx, fy, fw, fh = FLOOR

    def mul(x, y, f):
        r, g, b, _ = px[x, y]
        px[x, y] = (clamp(r * f), clamp(g * f), clamp(b * f), 255)

    for y in range(fy, fy + 17):
        for x in range(fx, fx + fw):
            mul(x, y, 0.68 + 0.32 * ((y - fy) / 16))
    # luminárias industriais: duas poças por metade
    for cx, cy in ((300, 300), (300, 540), (960, 300), (960, 540)):
        for y in range(cy - 70, cy + 70):
            for x in range(cx - 150, cx + 150):
                d = ((x - cx) / 150) ** 2 + ((y - cy) / 70) ** 2
                if d <= 1 and fy <= y < fy + fh and fx <= x < fx + fw:
                    mul(x, y, 1 + 0.32 * (1 - d))
    vcx, vcy = W / 2, H * 0.45
    maxd = math.hypot(vcx, vcy)
    for y in range(fy, fy + fh):
        for x in range(fx, fx + fw):
            d = math.hypot(x - vcx, y - vcy) / maxd
            mul(x, y, 1 - 0.38 * max(0.0, min(1.0, (d - 0.55) / 0.45)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--porta", default=os.path.join(ASSETS, "controle", "controle_bg.png"),
                    help="fundo de onde a porta padrão é copiada")
    ap.add_argument("--out", default=os.path.join(ASSETS, "expedicao", "expedicao_bg.png"))
    args = ap.parse_args()

    rng = random.Random(SEED)
    im = Image.new("RGBA", (W, H), (5, 5, 5, 255))
    px = im.load()

    wall(px, rng)
    boards(px)
    floor(px, rng)
    light(px)
    belt(px)
    porta = Image.open(args.porta).convert("RGB")
    stamp_door(px, porta, DOOR_IN_X)
    stamp_door(px, porta, DOOR_X)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    im.save(args.out)
    print("salvo:", os.path.abspath(args.out))


if __name__ == "__main__":
    main()

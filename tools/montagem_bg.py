"""Gera o fundo da LINHA DE MONTAGEM (cap3-montagem), a primeira sala do cap. 3.

O último andar da Elysium, o território da ADA: a paleta muda para o preto com
vermelho dela. Piso de chapa de aço com rebites, a ESTEIRA horizontal onde os
moldes passam pela prensa e, cortando a sala de cima a baixo, o FOSSO que só a
ponte montada pelos moldes atravessa.

A prensa, os moldes e a ponte são desenhados pelo código (objects/AssemblyLine.js),
porque mudam com o puzzle que a IA gerou. As posições da esteira e do fosso têm
de bater com a LinhaMontagemScene (BELT e CHASM).

Uso:
    python tools/montagem_bg.py
    python tools/montagem_bg.py --out /tmp/montagem_bg.png    # só para olhar
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

jardim_bg.GLASS = (-1, -1)          # parede inteira

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "client", "assets", "images")

W, H = 1280, 704
WALL_H = 128
FLOOR = (32, 128, 1216, 544)
SEED = 303

DOOR_IN_X = 128
DOOR_X = 1152
# Esteira e fosso em coordenadas do MAPA (tela = mapa + 8 no y).
BELT = (240, 820, 272, 312)         # x0, x1, y0, y1
CHASM = (860, 980)                  # x0, x1 (de cima a baixo do piso)
SIGN_CX = 520
SIGN_TOP = 30
RED = (255, 42, 74)


def floor(px, rng):
    """Chapa de aço em placas de 64 px, com rebites nos cantos e riscos de uso."""
    fx, fy, fw, fh = FLOOR
    tons = {}
    for y in range(fy, fy + fh):
        for x in range(fx, fx + fw):
            tx, ty = (x - fx) // 64, (y - fy) // 64
            tons.setdefault((tx, ty), rng.randint(-3, 3))
            lx, ly = (x - fx) % 64, (y - fy) % 64
            if lx == 0 or ly == 0:
                c = (16, 16, 20)
            else:
                d = tons[(tx, ty)]
                c = (34 + d, 34 + d, 40 + d)
                if (x + 2 * y) % 23 == 0 and rng.random() < 0.3:
                    c = (42 + d, 42 + d, 48 + d)          # risco de uso
                if lx in (4, 60) and ly in (4, 60):
                    c = (70, 70, 80)                      # rebite
                elif lx in (5, 61) and ly in (5, 61):
                    c = (18, 18, 22)
            px[x, y] = c + (255,)


def belt(px):
    """Esteira horizontal: borracha com emendas e chassi de aço."""
    x0, x1, y0, y1 = BELT
    for y in range(y0, y1):
        for x in range(x0, x1):
            edge = y < y0 + 5 or y >= y1 - 5
            if edge:
                c = (110, 116, 130) if y in (y0 + 1, y1 - 2) else (70, 74, 86)
            else:
                c = (24, 24, 28)
                if (x // 8) % 2 == 0 and y % 4 == 0:
                    c = (32, 32, 37)
                if x % 16 == 0:
                    c = (16, 16, 19)
            px[x, y] = c + (255,)
    # faixa de perigo em volta da esteira
    for x in range(x0 - 6, x1 + 6):
        for y in list(range(y0 - 8, y0 - 2)) + list(range(y1 + 2, y1 + 8)):
            px[x, y] = ((200, 36, 60) if ((x + y) // 6) % 2 == 0 else (20, 16, 18)) + (255,)


def chasm(px):
    """O fosso: preto, com a borda de aço cortada e um brilho vermelho no fundo."""
    fx, fy, fw, fh = FLOOR
    x0, x1 = CHASM
    for y in range(fy, fy + fh):
        for x in range(x0, x1):
            depth = min(x - x0, x1 - 1 - x)
            c = (6, 5, 8)
            glow = max(0.0, 1 - depth / 26)
            c = blend(c, (40, 8, 14), 0.5 * glow)
            if (y // 3) % 9 == 0 and depth > 18:
                c = blend(c, RED, 0.12)                   # luz lá embaixo
            px[x, y] = c + (255,)
        for x in (x0 - 3, x0 - 2, x0 - 1, x1, x1 + 1, x1 + 2):
            px[x, y] = ((96, 100, 112) if x in (x0 - 3, x1 + 2) else (50, 52, 60)) + (255,)
    for y in range(fy, fy + fh):
        for x in list(range(x0 - 12, x0 - 4)) + list(range(x1 + 3, x1 + 11)):
            px[x, y] = ((200, 36, 60) if ((x + y) // 6) % 2 == 0 else (20, 16, 18)) + (255,)


def wall_details(px):
    """Letreiro em vermelho e as luzes de aviso da linha."""
    draw_text(px, "MONTAGEM", SIGN_CX, SIGN_TOP, 4, (230, 60, 80), sombra=(30, 6, 10))
    for x in range(SIGN_CX - 130, SIGN_CX + 130):
        for y in range(SIGN_TOP + 34, SIGN_TOP + 38):
            px[x, y] = RED + (255,)
    for cx in (300, 760, 1040):
        for y in range(18, 30):
            for x in range(cx - 6, cx + 6):
                d = math.hypot(x - cx, y - 24)
                if d <= 6:
                    px[x, y] = (RED if d < 4 else (120, 20, 34)) + (255,)


def light(px):
    fx, fy, fw, fh = FLOOR

    def mul(x, y, f):
        r, g, b, _ = px[x, y]
        px[x, y] = (clamp(r * f), clamp(g * f), clamp(b * f), 255)

    for y in range(fy, fy + 17):
        for x in range(fx, fx + fw):
            mul(x, y, 0.65 + 0.35 * ((y - fy) / 16))
    vcx, vcy = W * 0.4, H * 0.5
    maxd = math.hypot(vcx, vcy)
    for y in range(fy, fy + fh):
        for x in range(fx, fx + fw):
            d = math.hypot(x - vcx, y - vcy) / maxd
            mul(x, y, 1 - 0.45 * max(0.0, min(1.0, (d - 0.45) / 0.55)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--porta", default=os.path.join(ASSETS, "controle", "controle_bg.png"),
                    help="fundo de onde a porta padrão é copiada")
    ap.add_argument("--out", default=os.path.join(ASSETS, "montagem", "montagem_bg.png"))
    args = ap.parse_args()

    rng = random.Random(SEED)
    im = Image.new("RGBA", (W, H), (5, 5, 5, 255))
    px = im.load()

    wall(px, rng)
    wall_details(px)
    floor(px, rng)
    light(px)
    belt(px)
    chasm(px)
    porta = Image.open(args.porta).convert("RGB")
    stamp_door(px, porta, DOOR_IN_X)
    stamp_door(px, porta, DOOR_X)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    im.save(args.out)
    print("salvo:", os.path.abspath(args.out))


if __name__ == "__main__":
    main()

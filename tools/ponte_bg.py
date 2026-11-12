"""Gera o fundo da PONTE DE LUZ (cap3-ponte), a quarta sala do cap. 3.

O núcleo da Elysium, mesma chapa de aço e paleta preto e vermelho das outras
salas do capítulo. Um ABISMO largo corta a sala de cima a baixo; a única
travessia é a ponte de luz, feita de faixas de placas que o código desenha
(objects/LightBridge.js), porque mudam com o puzzle que a IA gerou. Nas duas
bordas do abismo, os emissores (à esquerda) e os receptores (à direita) da ponte.

As posições do abismo têm de bater com a PonteLuzScene (CHASM).

Uso:
    python tools/ponte_bg.py
    python tools/ponte_bg.py --out /tmp/ponte_bg.png    # só para olhar
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
import montagem_bg  # noqa: E402
from montagem_bg import floor  # noqa: E402

jardim_bg.GLASS = (-1, -1)          # parede inteira

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "client", "assets", "images")

W, H = 1280, 704
FLOOR = (32, 128, 1216, 544)
SEED = 606

DOOR_IN_X = 128
DOOR_X = 1152
CHASM = (560, 880)                  # x0, x1 (mapa = tela)
SIGN_CX = 720
SIGN_TOP = 30
RED = (255, 42, 74)
CYAN = (74, 214, 255)


def abyss(px, rng):
    """O abismo: escuro, mais fundo no meio, com a luz vermelha lá embaixo e
    poeira de luz parada no ar; borda de aço e faixa de perigo dos dois lados."""
    fx, fy, fw, fh = FLOOR
    x0, x1 = CHASM
    mid = (x0 + x1) / 2
    half = (x1 - x0) / 2
    for y in range(fy, fy + fh):
        for x in range(x0, x1):
            depth = 1 - abs(x - mid) / half
            c = blend((14, 10, 14), (3, 2, 4), depth)
            if (y // 3) % 11 == 0 and depth > 0.45:
                c = blend(c, RED, 0.08 * depth)              # brilho lá do fundo
            px[x, y] = c + (255,)
    for _ in range(140):                                      # poeira de luz
        x = rng.randint(x0 + 10, x1 - 10)
        y = rng.randint(fy + 4, fy + fh - 4)
        px[x, y] = (blend((40, 60, 80), CYAN, rng.random() * 0.5)) + (255,)
    for y in range(fy, fy + fh):
        for x in (x0 - 3, x0 - 2, x0 - 1, x1, x1 + 1, x1 + 2):
            px[x, y] = ((96, 100, 112) if x in (x0 - 3, x1 + 2) else (50, 52, 60)) + (255,)
        for x in list(range(x0 - 12, x0 - 4)) + list(range(x1 + 3, x1 + 11)):
            px[x, y] = ((200, 36, 60) if ((x + y) // 6) % 2 == 0 else (20, 16, 18)) + (255,)


def wall_details(px):
    draw_text(px, "ABISMO", SIGN_CX, SIGN_TOP, 4, (230, 60, 80), sombra=(30, 6, 10))
    for x in range(SIGN_CX - 110, SIGN_CX + 110):
        for y in range(SIGN_TOP + 34, SIGN_TOP + 37):
            px[x, y] = RED + (255,)
    # lâmpadas de aviso nos dois lados do abismo
    for cx in (CHASM[0] - 30, CHASM[1] + 30):
        for y in range(80, 96):
            for x in range(cx - 8, cx + 8):
                d = math.hypot(x - cx, y - 88)
                if d <= 7:
                    px[x, y] = (RED if d < 5 else (120, 20, 34)) + (255,)


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
            d = math.hypot(x - 640, (y - fy - 220) * 1.3) / 760
            mul(x, y, 1 - 0.45 * max(0.0, min(1.0, d - 0.3)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--porta", default=os.path.join(ASSETS, "controle", "controle_bg.png"),
                    help="fundo de onde a porta padrão é copiada")
    ap.add_argument("--out", default=os.path.join(ASSETS, "ponte", "ponte_bg.png"))
    args = ap.parse_args()

    rng = random.Random(SEED)
    im = Image.new("RGBA", (W, H), (5, 5, 5, 255))
    px = im.load()

    wall(px, rng)
    wall_details(px)
    floor(px, rng)
    light(px)
    abyss(px, rng)
    porta = Image.open(args.porta).convert("RGB")
    stamp_door(px, porta, DOOR_IN_X)
    stamp_door(px, porta, DOOR_X)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    im.save(args.out)
    print("salvo:", os.path.abspath(args.out))


if __name__ == "__main__":
    main()

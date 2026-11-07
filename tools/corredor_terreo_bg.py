"""Gera o fundo do CORREDOR DO TÉRREO (cap2-corredor), depois da WITCH.

O fim do capítulo 2, no mesmo papel do corredor do subsolo (cap1-corredor): um
corredor estreito sem puzzle, onde a Lua manda a próxima transmissão, e o
ELEVADOR no fim, que sobe para o núcleo (capítulo 3).

Mesma pedra polida e mesmas janelas da recepção e do hall (o térreo inteiro tem
a mesma cara), mas só a faixa do corredor: o resto da tela fica escuro, como no
corredor do subsolo. O elevador fica na parede do fundo, à direita, com o visor
marcando T e a seta para cima. As posições têm de bater com a CorredorTerreoScene.

Uso:
    python tools/corredor_terreo_bg.py
    python tools/corredor_terreo_bg.py --out /tmp/corredor_terreo_bg.png    # só para olhar
"""
import argparse
import math
import os
import random
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from recepcao_bg import blend, clamp  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "client", "assets", "images")

W, H = 1280, 704
SEED = 202
# Em coordenadas do MAPA (tela = mapa + 8). Piso = os bounds da cena.
WALL = (32, 192, 1216, 120)         # x, y, w, h da parede do fundo
FLOOR = (32, 312, 1216, 300)
FLOOR_TILE = 64
WINDOWS = [(150, 270), (420, 540), (690, 810)]
ELEVATOR = (1112, 1240)             # batente do elevador (x0, x1), = door.x da cena no meio
SAVE_SPOT = 960                     # nicho claro na parede atrás do ponto de salvamento


def wall(px, rng):
    x0, y0, w, h = WALL
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            n = rng.randint(-2, 2)
            c = (31 + n, 33 + n, 41 + n)
            if (x - x0) % 96 == 0 and y > y0 + 4:
                c = (22, 24, 30)
            if y >= y0 + h - 8:
                c = (15, 16, 20) if y < y0 + h - 1 else (9, 10, 13)
            px[x, y] = c + (255,)
    # janelas com o céu do térreo
    top, bot = y0 + 10, y0 + h - 14
    for wx0, wx1 in WINDOWS:
        for y in range(top, bot):
            for x in range(wx0, wx1):
                if x < wx0 + 3 or x >= wx1 - 3 or y < top + 3 or y >= bot - 3:
                    px[x, y] = (18, 20, 26, 255)
                    continue
                c = blend((60, 84, 122), (104, 136, 176), (y - top) / (bot - top))
                if (x - wx0 + (y - top)) % 46 < 5:
                    c = blend(c, (170, 196, 224), 0.35)
                px[x, y] = c + (255,)
        for mx in (wx0 + (wx1 - wx0) // 3, wx0 + 2 * (wx1 - wx0) // 3):
            for y in range(top, bot):
                px[mx, y] = (18, 20, 26, 255)
        for x in range(wx0 - 4, wx1 + 4):
            px[x, bot] = (120, 126, 140, 255)


def elevator(px):
    """Elevador da recepção, no fim do corredor: batente, folhas e o visor (T, subindo)."""
    ex0, ex1 = ELEVATOR
    y0 = WALL[1] + 22
    y1 = WALL[1] + WALL[3] - 8
    for y in range(y0, y1):
        for x in range(ex0, ex1):
            if x < ex0 + 6 or x >= ex1 - 6 or y < y0 + 6:
                c = (58, 62, 74)
            else:
                t = ((x - ex0 - 6) % ((ex1 - ex0 - 12) // 2)) / ((ex1 - ex0 - 12) / 2)
                c = blend((84, 90, 104), (60, 64, 76), t)
                if (y - y0) % 22 == 0:
                    c = blend(c, (44, 47, 56), 0.6)
            px[x, y] = c + (255,)
    mid = (ex0 + ex1) // 2
    for y in range(y0 + 6, y1):
        px[mid, y] = (40, 43, 52, 255)
    # visor acima das portas: "T" em âmbar e a seta para cima
    vy = y0 - 2
    for y in range(vy - 12, vy):
        for x in range(mid - 16, mid + 16):
            px[x, y] = (12, 14, 18, 255)
    amber = (255, 200, 36, 255)
    for y in range(vy - 10, vy - 3):
        px[mid - 6, y] = amber
    for x in range(mid - 9, mid - 2):
        px[x, vy - 10] = amber
    for k in range(4):
        for x in range(mid + 6 - k, mid + 7 + k):
            px[x, vy - 10 + k] = amber
    for y in range(vy - 7, vy - 3):
        px[mid + 6, y] = amber


def floor(px, rng):
    """A pedra polida da recepção."""
    fx, fy, fw, fh = FLOOR
    tons = {}
    for y in range(fy, fy + fh):
        for x in range(fx, fx + fw):
            tx, ty = (x - fx) // FLOOR_TILE, (y - fy) // FLOOR_TILE
            if (tx, ty) not in tons:
                tons[(tx, ty)] = (rng.randint(-3, 3), rng.random() * 6.28, rng.randint(0, FLOOR_TILE),
                                  rng.uniform(3, 14), rng.uniform(7, 19), rng.random() < 0.55)
            dt, fase, off, amp, freq, tem_veio = tons[(tx, ty)]
            lx, ly = (x - fx) % FLOOR_TILE, (y - fy) % FLOOR_TILE
            if lx == 0 or ly == 0:
                px[x, y] = (30, 33, 42, 255)
                continue
            c = (48 + dt, 52 + dt, 64 + dt)
            v = ly - (off + amp * math.sin(lx / freq + fase)) % FLOOR_TILE
            if tem_veio and abs(v) < 0.7:
                c = blend(c, (78, 84, 100), 0.35)
            if lx == 1 or ly == 1:
                c = blend(c, (70, 76, 92), 0.5)
            px[x, y] = c + (255,)
    # tapete do elevador
    ex0, ex1 = ELEVATOR
    for y in range(fy + 4, fy + 40):
        for x in range(ex0 + 4, ex1 - 4):
            borda = y < fy + 8 or y >= fy + 36 or x < ex0 + 8 or x >= ex1 - 8
            px[x, y] = ((64, 110, 126) if borda else (30, 38, 50)) + (255,)


def light(px):
    fx, fy, fw, fh = FLOOR

    def mul(x, y, f):
        r, g, b, _ = px[x, y]
        px[x, y] = (clamp(r * f), clamp(g * f), clamp(b * f), 255)

    for y in range(fy, fy + 17):
        for x in range(fx, fx + fw):
            mul(x, y, 0.68 + 0.32 * ((y - fy) / 16))
    for wx0, wx1 in WINDOWS:
        for d in range(160):
            y = fy + 18 + d
            if y >= fy + fh:
                break
            dx = int(d * 0.45)
            for x in range(wx0 + 4 + dx, wx1 - 4 + dx):
                if fx <= x < fx + fw:
                    mul(x, y, 1 + 0.36 * (1 - d / 160))
    # o fim do corredor fica mais escuro, menos o elevador iluminado
    for y in range(fy, fy + fh):
        for x in range(fx, fx + fw):
            f = 1 - 0.3 * max(0.0, (x - 900) / 340)
            e = max(0.0, 1 - math.hypot(x - sum(ELEVATOR) / 2, y - fy - 20) / 140)
            mul(x, y, f + 0.35 * e)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ASSETS, "corredor_terreo", "corredor_terreo_bg.png"))
    args = ap.parse_args()

    rng = random.Random(SEED)
    im = Image.new("RGBA", (W, H), (5, 5, 5, 255))
    px = im.load()
    wall(px, rng)
    elevator(px)
    floor(px, rng)
    light(px)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    im.save(args.out)
    print("salvo:", os.path.abspath(args.out))


if __name__ == "__main__":
    main()

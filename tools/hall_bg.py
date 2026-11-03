"""Gera o fundo do HALL DO RELÓGIO (cap2-hall), a arena da WITCH.

O saguão central do térreo: a mesma pedra polida e as mesmas janelas altas da
recepção, só que vazio e aberto, porque é onde a luta acontece. Na parede, o
relógio grande da Elysium (a WITCH é um computador de 1951 e todos os golpes
dela brincam com o tempo); no chão, um mostrador de mosaico do tamanho da
arena, para o jogador ler o espaço da luta.

A parede é a de sempre (tools/jardim_bg.py, sem vidro) e as portas são
carimbadas de controle_bg.png, como nas outras salas. Os poucos móveis (vasos,
sofás encostados) são os props da recepção, no Tiled (assets/maps/hall.json).

Uso:
    python tools/hall_bg.py
    python tools/hall_bg.py --out /tmp/hall_bg.png    # só para olhar
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

jardim_bg.GLASS = (-1, -1)          # parede inteira, sem o trecho de vidro

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "client", "assets", "images")

W, H = 1280, 704
WALL_H = 128
BASEBOARD_H = 8
FLOOR = (32, 128, 1216, 544)
SEED = 73

DOOR_IN_X = 128                     # vem da expedição
DOOR_X = 1152                       # saída, = `door.x` da cena
WINDOWS = [(250, 370), (430, 500), (780, 850), (910, 1030)]
CLOCK = (640, 62, 54)               # centro x, y e raio do relógio da parede
FLOOR_TILE = 64
DIAL = (640, 410, 330, 190)         # mostrador no chão (cx, cy, rx, ry), em tela-mapa


def windows(px):
    """As janelas da recepção: vidro com o céu, caixilho, reflexo e peitoril."""
    top, bot = 10, WALL_H - BASEBOARD_H - 6
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
        for mx in ((wx0 + wx1) // 2,) if wx1 - wx0 < 100 else (wx0 + (wx1 - wx0) // 3, wx0 + 2 * (wx1 - wx0) // 3):
            for y in range(top, bot):
                px[mx, y] = (18, 20, 26, 255)
                px[mx + 1, y] = (30, 34, 44, 255)
        for x in range(wx0, wx1):
            px[x, top + 40] = (18, 20, 26, 255)
        for x in range(wx0 - 4, wx1 + 4):
            px[x, bot] = (120, 126, 140, 255)
            px[x, bot + 1] = (70, 74, 86, 255)


def clock(px):
    """Relógio grande: aro de aço, mostrador escuro, 12 marcas e os ponteiros
    parados perto da meia-noite. Um halo ciano por trás, como o letreiro da
    recepção."""
    cx, cy, r = CLOCK
    for y in range(cy - r - 18, cy + r + 18):
        for x in range(cx - r - 18, cx + r + 18):
            d = math.hypot(x - cx, y - cy)
            if r < d < r + 18 and 0 <= y < WALL_H - BASEBOARD_H:
                c = px[x, y]
                px[x, y] = blend(c, (74, 214, 255), 0.28 * (1 - (d - r) / 18) ** 2) + (255,)
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            d = math.hypot(x - cx, y - cy)
            if d > r:
                continue
            if d > r - 5:
                c = (150, 158, 176) if d > r - 2 else (88, 94, 110)          # aro
            else:
                c = blend((22, 26, 36), (14, 16, 22), d / r)               # mostrador
                if r - 9 < d <= r - 7:
                    c = (40, 46, 60)                                       # trilho dos minutos
            px[x, y] = c + (255,)
    for k in range(60):
        a = k / 60 * 2 * math.pi
        big = k % 5 == 0
        for t in range(r - 16 if big else r - 10, r - 6):
            x, y = round(cx + math.sin(a) * t), round(cy - math.cos(a) * t)
            px[x, y] = ((214, 220, 232) if big else (96, 104, 122)) + (255,)
            if big and k % 15 == 0:
                px[x + 1, y] = px[x, y + 1] = (214, 220, 232, 255)

    def hand(angle, length, width, cor):
        a = math.radians(angle)
        for t in range(-6, length):
            for w in range(-width, width + 1):
                x = cx + math.sin(a) * t + math.cos(a) * w * 0.5
                y = cy - math.cos(a) * t + math.sin(a) * w * 0.5
                px[round(x), round(y)] = cor + (255,)

    hand(-28, r - 22, 3, (196, 204, 220))      # horas, perto do 11
    hand(-6, r - 12, 2, (196, 204, 220))       # minutos, quase meia-noite
    hand(150, r - 10, 0, (255, 69, 69))        # segundos, em vermelho
    for y in range(cy - 3, cy + 4):
        for x in range(cx - 3, cx + 4):
            if math.hypot(x - cx, y - cy) <= 3:
                px[x, y] = (74, 214, 255, 255)


def floor(px, rng):
    """Pedra polida da recepção, com o mostrador de mosaico no meio."""
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

    # Mostrador: anel de pedra escura com filete de latão, 12 marcas e o miolo
    # numa pedra mais clara. Elipse, porque o chão é visto de cima e de frente.
    cx, cy, rx, ry = DIAL
    for y in range(cy - ry - 2, cy + ry + 3):
        for x in range(cx - rx - 2, cx + rx + 3):
            d = math.hypot((x - cx) / rx, (y - cy) / ry)
            if d > 1.0 or not (fx <= x < fx + fw and fy <= y < fy + fh):
                continue
            c = px[x, y][:3]
            if d > 0.97 or 0.86 < d <= 0.875:
                c = (150, 120, 64)                                   # filetes de latão
            elif d > 0.875:
                c = blend(c, (24, 26, 34), 0.55)                     # anel escuro
            elif d < 0.035:
                c = (60, 120, 140)                                   # eixo
            else:
                c = blend(c, (78, 84, 100), 0.18)
            px[x, y] = c + (255,)
    for k in range(12):
        a = k / 12 * 2 * math.pi
        for t in [i / 100 for i in range(88, 97)]:
            for w in range(-3 if k % 3 == 0 else -1, 4 if k % 3 == 0 else 2):
                x = round(cx + math.sin(a) * rx * t + math.cos(a) * w)
                y = round(cy - math.cos(a) * ry * t + math.sin(a) * w * ry / rx)
                px[x, y] = ((214, 182, 100) if k % 3 == 0 else (170, 146, 86)) + (255,)


def light(px):
    fx, fy, fw, fh = FLOOR

    def mul(x, y, f):
        if fx <= x < fx + fw and fy <= y < fy + fh:
            r, g, b, _ = px[x, y]
            px[x, y] = (clamp(r * f), clamp(g * f), clamp(b * f * (1.04 if f > 1 else 1)), 255)

    for y in range(fy, fy + 17):
        for x in range(fx, fx + fw):
            mul(x, y, 0.68 + 0.32 * ((y - fy) / 16))
    # Sol das janelas, inclinado como na recepção.
    for wx0, wx1 in WINDOWS:
        comprimento = 230
        for d in range(comprimento):
            y = fy + 18 + d
            desvio = int(d * 0.45)
            for x in range(wx0 + 4 + desvio, wx1 - 4 + desvio):
                mul(x, y, 1 + 0.36 * (1 - d / comprimento))
    vcx, vcy = W / 2, H * 0.48
    maxd = math.hypot(vcx, vcy)
    for y in range(fy, fy + fh):
        for x in range(fx, fx + fw):
            d = math.hypot(x - vcx, y - vcy) / maxd
            mul(x, y, 1 - 0.4 * max(0.0, min(1.0, (d - 0.5) / 0.5)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--porta", default=os.path.join(ASSETS, "controle", "controle_bg.png"),
                    help="fundo de onde a porta padrão é copiada")
    ap.add_argument("--out", default=os.path.join(ASSETS, "hall", "hall_bg.png"))
    args = ap.parse_args()

    rng = random.Random(SEED)
    im = Image.new("RGBA", (W, H), (5, 5, 5, 255))
    px = im.load()

    wall(px, rng)
    windows(px)
    clock(px)
    floor(px, rng)
    light(px)
    porta = Image.open(args.porta).convert("RGB")
    stamp_door(px, porta, DOOR_IN_X)
    stamp_door(px, porta, DOOR_X)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    im.save(args.out)
    print("salvo:", os.path.abspath(args.out))


if __name__ == "__main__":
    main()

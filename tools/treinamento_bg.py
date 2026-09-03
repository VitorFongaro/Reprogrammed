"""Gera o fundo da SALA DE TREINAMENTO (cap1-treinamento).

Ela era a única sala ainda procedural em tempo de execução (grade desenhada
pela cena). Aqui o cenário vira PNG, como o das outras: parede do fundo no topo,
piso de tile do pack e as marcações de campo de tiro.

A parede usa a mesma fórmula das outras salas (ver tools/porao_parede.lua) e o
piso o mesmo tile e tom (ver tools/piso_tile.py), para a sala não destoar.

Uso (o caminho do pack é local de cada dev):
    python tools/treinamento_bg.py --tiles "<pack>/tileset x2.png"
"""
import argparse
import math
import os
import random

from PIL import Image

W, H = 1280, 704
WALL_H = 128
BASEBOARD_H = 8
PANEL_STEP = 96
FLOOR = (32, 128, 1216, 544)      # x, y, w, h
TILE = 32
TILE_CELLS = [(2112, 64), (2144, 64), (2112, 96), (2144, 96)]
DARKEN = 0.6
WALL_SHADOW_H = 16
WALL_SHADOW_MIN = 0.68
SEED = 21

# Luminárias do teto (mesma linguagem das outras salas).
POOLS = [(300, 210, 118, 52), (640, 172, 94, 38), (980, 210, 118, 52)]

# Porta no fundo, à direita — combina com o fluxo da sala (o jogador entra pela
# esquerda, atravessa a barreira e sai lá).
DOOR = (1104, 40, 96, 88)

# Faixas de perigo pintadas no chão, marcando a linha da barreira de laser
# (LASER_X = 600 na cena) e a zona de tiro.
LASER_X = 600


def clamp(v, lo=0, hi=255):
    return int(max(lo, min(hi, v)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tiles", required=True)
    ap.add_argument("--out", default=os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..", "client", "assets", "images", "treinamento", "treinamento_bg.png"))
    args = ap.parse_args()

    rng = random.Random(SEED)
    tiles = Image.open(args.tiles).convert("RGB").load()
    im = Image.new("RGBA", (W, H), (5, 5, 5, 255))
    px = im.load()

    # 1) Parede do fundo: base com ruído + linha de painel + rodapé.
    for y in range(WALL_H - BASEBOARD_H):
        for x in range(W):
            n = rng.randint(-2, 2)
            px[x, y] = (31 + n, 33 + n, 41 + n, 255)
    for x in range(0, W, PANEL_STEP):
        for y in range(4, WALL_H - BASEBOARD_H):
            px[x, y] = (22, 24, 30, 255)
    for y in range(WALL_H - BASEBOARD_H, WALL_H):
        for x in range(W):
            px[x, y] = (15, 16, 20, 255)
    for x in range(W):
        px[x, WALL_H - 1] = (9, 10, 13, 255)

    # 2) Piso de tile.
    fx, fy, fw, fh = FLOOR
    for ty in range(fy, fy + fh, TILE):
        for tx in range(fx, fx + fw, TILE):
            cell = TILE_CELLS[rng.randrange(len(TILE_CELLS))]
            for j in range(TILE):
                for i in range(TILE):
                    x, y = tx + i, ty + j
                    if fx <= x < fx + fw and fy <= y < fy + fh:
                        c = tiles[cell[0] + i, cell[1] + j]
                        px[x, y] = (clamp(c[0] * DARKEN), clamp(c[1] * DARKEN),
                                    clamp(c[2] * DARKEN), 255)

    # 3) Faixa de perigo sob a linha da barreira: avisa onde o laser corta.
    for y in range(fy, fy + fh):
        for dx in (-1, 0, 1):
            px[LASER_X + dx, y] = (46, 36, 20, 255)
    for y in range(fy, fy + fh, 16):
        for j in range(8):
            for dx in range(-5, 6):
                if 0 <= y + j < fy + fh:
                    px[LASER_X + dx, y + j] = (120, 96, 30, 255)

    # 4) Porta desenhada na parede.
    dx0, dy0, dw, dh = DOOR
    for y in range(dy0, dy0 + dh):
        for x in range(dx0, dx0 + dw):
            px[x, y] = (18, 20, 26, 255)
    for x in range(dx0, dx0 + dw):
        px[x, dy0] = (58, 62, 76, 255)
        px[x, dy0 + dh - 1] = (10, 11, 14, 255)
    for y in range(dy0, dy0 + dh):
        px[dx0, y] = (58, 62, 76, 255)
        px[dx0 + dw - 1, y] = (10, 11, 14, 255)
    for y in range(dy0 + 8, dy0 + dh - 8, 12):      # ripas da porta
        for x in range(dx0 + 6, dx0 + dw - 6):
            px[x, y] = (26, 28, 36, 255)

    # 5) Luz: sombra da parede, poças das luminárias e vinheta.
    def light(x, y, f):
        if not (fx <= x < fx + fw and fy <= y < fy + fh):
            return
        c = px[x, y]
        px[x, y] = (clamp(c[0] * f), clamp(c[1] * f), clamp(c[2] * f), 255)

    for y in range(fy, fy + WALL_SHADOW_H + 1):
        f = WALL_SHADOW_MIN + (1 - WALL_SHADOW_MIN) * ((y - fy) / WALL_SHADOW_H)
        for x in range(fx, fx + fw):
            light(x, y, f)

    for cx, cy, rx, ry in POOLS:
        for y in range(-ry, ry + 1):
            for x in range(-rx, rx + 1):
                d = (x * x) / (rx * rx) + (y * y) / (ry * ry)
                if d <= 1:
                    light(cx + x, cy + y, 1 + 0.8 * (1 - d))

    vcx, vcy = W / 2, H * 0.42
    maxd = math.hypot(vcx, vcy)
    for y in range(fy, fy + fh):
        for x in range(fx, fx + fw):
            d = math.hypot(x - vcx, y - vcy) / maxd
            light(x, y, 1 - 0.35 * max(0.0, min(1.0, (d - 0.55) / 0.45)))

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    im.save(args.out)
    print("salvo:", os.path.abspath(args.out))


if __name__ == "__main__":
    main()

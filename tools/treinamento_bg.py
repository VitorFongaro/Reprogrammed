"""Gera o fundo da SALA DE TREINAMENTO (cap1-treinamento).

Ela era a única sala ainda procedural em tempo de execução (grade desenhada
pela cena). Aqui o cenário vira PNG, como o das outras: parede do fundo no topo,
piso de tile do pack e as marcações de campo de tiro.

A parede usa a mesma fórmula das outras salas (ver tools/porao_parede.lua) e o
piso o mesmo tile e tom (ver tools/piso_tile.py), para a sala não destoar.

A PORTA não é desenhada aqui: ela é CARIMBADA a partir de controle_bg.png. A
porta padrão do capítulo (batente recuado, duas folhas, placa acesa e o tapete
listrado no piso) foi desenhada no Aseprite e não tem gerador versionado, então
copiar a arte existente é o único jeito de a sala não ficar com uma porta
diferente das outras — foi exatamente o que aconteceu na primeira versão, que
desenhava um portão de ripas por conta própria.

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
# esquerda, atravessa a barreira e sai lá). DOOR_X é o centro, e tem que bater
# com o `door.x` da TreinamentoScene.
DOOR_X = 1152

# Recorte da porta padrão em controle_bg.png. A parede (0..WALL_H) é copiada
# inteira: os dois fundos têm a mesma fórmula e o mesmo tom, então não há
# emenda visível. O tapete listrado vem à parte porque cai no PISO, que é
# diferente em cada sala.
DOOR_SRC_X = 640                       # centro da porta no fundo de origem
DOOR_PLATE = (612, 0, 668, 10)         # placa acesa e o letreiro, acima do batente
DOOR_BAND = (580, 10, 700, WALL_H)     # batente, folhas e a parede em volta
DOOR_MAT = (593, 128, 687, 137)        # tapete listrado, já no piso

# A faixa de cima é estreita de propósito: na sala de origem passa uma linha de
# painel em x=672, e ela cairia FORA da grade de 96px daqui — um risco vertical
# solto ao lado da porta. Recortando só a placa, a grade da sala continua a dela.

# Faixas de perigo pintadas no chão, marcando a linha da barreira de laser
# (LASER_X = 600 na cena) e a zona de tiro.
LASER_X = 600


def clamp(v, lo=0, hi=255):
    return int(max(lo, min(hi, v)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tiles", required=True)
    ap.add_argument("--porta", default=os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..", "client", "assets", "images", "controle", "controle_bg.png"),
        help="fundo de onde a porta padrão é copiada")
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

    # 4) Luz: sombra da parede, poças das luminárias e vinheta.
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

    # 5) Porta padrão, carimbada de controle_bg.png. Vai por ÚLTIMO porque o
    # recorte já traz a própria iluminação: passar a vinheta por cima
    # escureceria o tapete e denunciaria o remendo.
    porta = Image.open(args.porta).convert("RGB")
    pp = porta.load()

    def stamp(rect):
        x0, y0, x1, y1 = rect
        for y in range(y0, y1):
            for x in range(x0, x1):
                px[x - DOOR_SRC_X + DOOR_X, y] = pp[x, y] + (255,)

    stamp(DOOR_PLATE)
    stamp(DOOR_BAND)
    stamp(DOOR_MAT)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    im.save(args.out)
    print("salvo:", os.path.abspath(args.out))


if __name__ == "__main__":
    main()

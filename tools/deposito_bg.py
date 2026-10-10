"""Gera o fundo do DEPÓSITO (cap2-deposito), o almoxarifado do térreo.

Depois da estufa, o lado de serviço da Elysium: parede de chapa ondulada,
letreiro pintado a estêncil, uma porta de enrolar da doca e chão de concreto
com marcação amarela. Mesma moldura das outras salas do térreo (recepção,
jardim): parede de 128 px, piso de 1216x544, portas padrão carimbadas.

O que muda de tamanho NÃO está aqui. Os dois puzzles da sala são gerados pela
IA, que decide quantas caixas há, então o bloco de estantes do corredor e o
fosso da ponte são montados no código a partir dos casos de teste (ver
objects/CrateCorridor.js e objects/CrateBridge.js). Este fundo só deixa as
áreas deles com chão liso, sem marcação que ficasse cortada no meio. A
mobília fixa vem do Aseprite (tools/deposito_props.lua) e vai no Tiled
(assets/maps/deposito.json).

Uso:
    python tools/deposito_bg.py
    python tools/deposito_bg.py --out /tmp/deposito_bg.png    # só para olhar
"""
import argparse
import math
import os
import random
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from treinamento_bg import DOOR_SRC_X, DOOR_PLATE, DOOR_BAND, DOOR_MAT, GLYPH_W, GLYPH_GAP  # noqa: E402
import recepcao_bg  # noqa: E402
from recepcao_bg import draw_text, blend, clamp  # noqa: E402

# Letras que nenhum letreiro tinha usado ainda (o draw_text lê o dicionário de lá).
recepcao_bg.GLYPHS["P"] = ("####.", "#...#", "#...#", "####.", "#....", "#....", "#....")

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "client", "assets", "images")

W, H = 1280, 704
WALL_H = 128
BASEBOARD_H = 8
FLOOR = (32, 128, 1216, 544)        # x, y, w, h (mesma área das outras salas)
SEED = 77

# --- Parede (x do mapa). Tem que bater com a DepositoScene e o deposito.json. ---
DOOR_IN_X = 128                     # porta por onde ela entra (vem do jardim)
DOOR_X = 1152                       # porta de saída, = `door.x` da cena
SIGN_CX = 420                       # letreiro sobre o bloco de estantes
SIGN_TOP = 34
SIGN_SCALE = 5
SHUTTER = (892, 1086)               # porta de enrolar da doca, sobre o fosso
RIB_STEP = 8                        # nervuras da chapa ondulada

# --- Chão (x do mapa) ---
SLAB = 64                           # placa de concreto
RACKS = (226, 614)                  # faixa do bloco de estantes (o maior que a IA gera)
PIT = (896, 1084)                   # faixa do fosso da ponte
PARKING = (60, 470, 150, 120)       # vaga da empilhadeira (x, y, w, h)


def wall(px, rng):
    """Chapa ondulada: nervuras verticais com luz de um lado e sombra do outro."""
    for y in range(WALL_H - BASEBOARD_H):
        for x in range(W):
            n = rng.randint(-2, 2)
            k = x % RIB_STEP
            base = (34, 37, 44)
            if k == 0:
                base = (48, 52, 60)                 # crista da nervura
            elif k == 1:
                base = (42, 45, 53)
            elif k == RIB_STEP - 1:
                base = (24, 26, 32)                 # vale
            px[x, y] = (base[0] + n, base[1] + n, base[2] + n, 255)
    # emendas horizontais das chapas, com rebites
    for y in (40, 84):
        for x in range(W):
            px[x, y] = (20, 22, 27, 255)
            if x % 24 == 4:
                px[x, y - 1] = (70, 74, 84, 255)
    # rodapé: faixa zebrada de proteção contra empilhadeira
    for y in range(WALL_H - BASEBOARD_H, WALL_H):
        for x in range(W):
            zebra = ((x + y) // 6) % 2 == 0
            px[x, y] = ((176, 136, 24) if zebra else (20, 20, 22)) + (255,)
    for x in range(W):
        px[x, WALL_H - BASEBOARD_H] = (9, 10, 13, 255)
        px[x, WALL_H - 1] = (9, 10, 13, 255)
    # escorrido de ferrugem descendo das emendas
    for _ in range(26):
        x = rng.randint(0, W - 1)
        y0 = rng.choice((41, 85))
        for y in range(y0, min(WALL_H - BASEBOARD_H, y0 + rng.randint(6, 24))):
            px[x, y] = blend(px[x, y][:3], (96, 58, 34), 0.45) + (255,)


def sign(px, rng):
    """DEPÓSITO a estêncil, em amarelo de segurança, com a tinta falhando."""
    x0, largura = draw_text(px, "DEPOSITO", SIGN_CX, SIGN_TOP, SIGN_SCALE, (226, 176, 30), sombra=(14, 14, 16))
    # O acento do Ó vai por cima do O cheio: um glifo de 7 linhas com o acento
    # dentro dele sai com cara de minúscula.
    passo = (GLYPH_W + GLYPH_GAP) * SIGN_SCALE
    ox = x0 + 3 * passo
    for k, (gx, gy) in enumerate(((3, -2), (2, -1))):
        for dy in range(SIGN_SCALE - 1):
            for dx in range(SIGN_SCALE):
                px[ox + gx * SIGN_SCALE + dx + k, SIGN_TOP + gy * SIGN_SCALE + dy] = (226, 176, 30, 255)
    for y in range(SIGN_TOP, SIGN_TOP + 7 * SIGN_SCALE):
        for x in range(x0, x0 + largura):
            r, g, b, _ = px[x, y]
            if r > 150 and rng.random() < 0.12:
                px[x, y] = blend((r, g, b), (40, 42, 48), 0.7) + (255,)
            # ponte do estêncil: a letra é cortada por um fio no meio
            if r > 150 and y == SIGN_TOP + 3 * SIGN_SCALE + 2:
                px[x, y] = (34, 37, 44, 255)
    # faixa zebrada embaixo do letreiro
    for y in range(SIGN_TOP + 7 * SIGN_SCALE + 8, SIGN_TOP + 7 * SIGN_SCALE + 14):
        for x in range(x0, x0 + largura):
            px[x, y] = ((214, 166, 26) if ((x + y) // 5) % 2 == 0 else (18, 18, 20)) + (255,)


def shutter(px):
    """Porta de enrolar da doca: lâminas horizontais, guias e a soleira zebrada."""
    sx0, sx1 = SHUTTER
    top, bot = 10, WALL_H - BASEBOARD_H
    # caixa do rolo, em cima
    for y in range(top, top + 10):
        for x in range(sx0 - 6, sx1 + 6):
            px[x, y] = ((70, 74, 86) if y == top else (52, 56, 66) if y < top + 8 else (26, 28, 34)) + (255,)
    for y in range(top + 10, bot):
        for x in range(sx0, sx1):
            k = (y - top) % 6
            c = (92, 98, 110) if k == 0 else (70, 75, 86) if k < 3 else (56, 60, 70) if k < 5 else (34, 37, 44)
            px[x, y] = c + (255,)
    # lâmina de baixo, zebrada, e o puxador
    for y in range(bot - 7, bot):
        for x in range(sx0, sx1):
            px[x, y] = ((214, 166, 26) if ((x + y) // 5) % 2 == 0 else (18, 18, 20)) + (255,)
    for x in range((sx0 + sx1) // 2 - 10, (sx0 + sx1) // 2 + 10):
        px[x, bot - 10] = (140, 146, 160, 255)
        px[x, bot - 9] = (40, 42, 50, 255)
    # guias laterais
    for gx in (sx0 - 6, sx1):
        for y in range(top + 10, bot):
            for x in range(gx, gx + 6):
                px[x, y] = ((104, 110, 124) if x == gx else (60, 64, 74) if x < gx + 5 else (22, 24, 30)) + (255,)
    # sinaleiro da doca: âmbar aceso
    cx = (sx0 + sx1) // 2
    for y in range(2, 8):
        for x in range(cx - 4, cx + 4):
            d = math.hypot(x - cx + 0.5, y - 4.5)
            if d < 3.4:
                px[x, y] = ((255, 220, 120) if d < 1.6 else (255, 176, 40)) + (255,)


def floor(px, rng):
    """Concreto em placas, com juntas, manchas de óleo e marcas de pneu."""
    fx, fy, fw, fh = FLOOR
    tons = {}
    for y in range(fy, fy + fh):
        for x in range(fx, fx + fw):
            tx, ty = (x - fx) // SLAB, (y - fy) // SLAB
            if (tx, ty) not in tons:
                tons[(tx, ty)] = rng.randint(-5, 5)
            dt = tons[(tx, ty)]
            lx, ly = (x - fx) % SLAB, (y - fy) % SLAB
            if lx == 0 or ly == 0:
                px[x, y] = (40, 42, 46, 255)
                continue
            n = rng.randint(-3, 3)
            c = (74 + dt + n, 76 + dt + n, 80 + dt + n)
            if lx == 1 or ly == 1:
                c = blend(c, (92, 94, 98), 0.5)
            px[x, y] = c + (255,)

    # manchas de óleo (fora das áreas que o código cobre)
    for _ in range(9):
        cx, cy = rng.randint(fx + 30, fx + fw - 30), rng.randint(fy + 40, fy + fh - 30)
        if RACKS[0] - 20 < cx < RACKS[1] + 20 or PIT[0] - 30 < cx < PIT[1] + 30:
            continue
        rx, ry = rng.randint(10, 22), rng.randint(5, 11)
        for y in range(cy - ry, cy + ry + 1):
            for x in range(cx - rx, cx + rx + 1):
                d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
                if d < 1 and rng.random() < 0.9 - d * 0.5:
                    px[x, y] = blend(px[x, y][:3], (34, 32, 36), 0.55 * (1 - d)) + (255,)

    # marcas de pneu da empilhadeira, saindo da vaga
    for k, off in enumerate((0, 22)):
        for x in range(PARKING[0] + PARKING[2], RACKS[0] - 10):
            y = PARKING[1] + 40 + off + int(6 * math.sin(x / 40 + k))
            if rng.random() < 0.7:
                px[x, y] = blend(px[x, y][:3], (36, 36, 40), 0.5) + (255,)
                px[x, y + 1] = blend(px[x, y + 1][:3], (36, 36, 40), 0.35) + (255,)

    # vaga da empilhadeira: contorno amarelo e zebrado no fundo
    vx, vy, vw, vh = PARKING
    for y in range(vy, vy + vh):
        for x in range(vx, vx + vw):
            borda = x < vx + 3 or x >= vx + vw - 3 or y < vy + 3 or y >= vy + vh - 3
            if borda:
                px[x, y] = blend(px[x, y][:3], (220, 172, 30), 0.85) + (255,)
            elif x < vx + 14 and ((x + y) // 6) % 2 == 0:
                px[x, y] = blend(px[x, y][:3], (210, 160, 26), 0.6) + (255,)

    # faixa de pedestre amarela nas duas pontas (caminho da porta)
    for (x0, x1) in ((40, RACKS[0] - 16), (PIT[1] + 16, fx + fw - 8)):
        for y in (fy + 150, fy + 151, fy + 152):
            for x in range(x0, x1):
                if (x // 14) % 2 == 0:
                    px[x, y] = blend(px[x, y][:3], (220, 172, 30), 0.75) + (255,)

    # sombra da parede no pé do piso
    for y in range(fy, fy + 16):
        f = 0.6 + 0.4 * (y - fy) / 16
        for x in range(fx, fx + fw):
            r, g, b, _ = px[x, y]
            px[x, y] = (clamp(r * f), clamp(g * f), clamp(b * f), 255)


def light(px):
    """Luminárias industriais (poças de luz fria) e vinheta."""
    fx, fy, fw, fh = FLOOR

    def mul(x, y, f, cool=0.0):
        r, g, b, _ = px[x, y]
        r, g, b = r * f, g * f, b * f
        r, g, b = blend((r, g, b), (r * 0.92, g * 1.0, b * 1.12), cool)
        px[x, y] = (clamp(r), clamp(g), clamp(b), 255)

    pools = [(150, 300, 150, 70), (760, 300, 150, 70), (1170, 330, 120, 70), (760, 560, 160, 70)]
    vcx, vcy = W / 2, H * 0.45
    maxd = math.hypot(vcx, vcy)
    for y in range(fy, fy + fh):
        for x in range(fx, fx + fw):
            k = 0.0
            for (cx, cy, rx, ry) in pools:
                d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
                k = max(k, max(0.0, 1 - d))
            d = math.hypot(x - vcx, y - vcy) / maxd
            vin = 1 - 0.42 * max(0.0, min(1.0, (d - 0.5) / 0.5))
            mul(x, y, (0.86 + 0.3 * k) * vin, cool=0.5 * k)


def stamp_door(px, porta, door_x):
    pp = porta.load()
    for rect in (DOOR_PLATE, DOOR_BAND, DOOR_MAT):
        x0, y0, x1, y1 = rect
        for y in range(y0, y1):
            for x in range(x0, x1):
                px[x - DOOR_SRC_X + door_x, y] = pp[x, y] + (255,)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--porta", default=os.path.join(ASSETS, "controle", "controle_bg.png"),
                    help="fundo de onde a porta padrão é copiada")
    ap.add_argument("--out", default=os.path.join(ASSETS, "deposito", "deposito_bg.png"))
    args = ap.parse_args()

    rng = random.Random(SEED)
    im = Image.new("RGBA", (W, H), (5, 5, 5, 255))
    px = im.load()

    wall(px, rng)
    sign(px, rng)
    shutter(px)
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

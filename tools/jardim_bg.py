"""Gera o fundo do JARDIM DE INVERNO (cap2-jardim), a estufa do térreo.

A sala que tem que respirar depois da recepção: a parede do fundo é uma
fachada de VIDRO com a neve caindo lá fora (é inverno; aqui dentro, não), o
chão é de lajota de barro em vez de pedra polida, e a luz fria de fora entra
pelo alto e clareia a metade de cima do piso.

Pelo vidro passa o cano da irrigação, de ponta a ponta: é dele que descem os
bicos dos canteiros. Os canteiros NÃO estão aqui, porque a quantidade muda: a
IA gera de 3 a 5 casos de teste e cada caso é um canteiro (ver
objects/GardenBeds.js). Os móveis fixos vêm do Aseprite
(tools/jardim_props.lua) e vão no mapa do Tiled (assets/maps/jardim.json).

A porta de saída é a porta padrão do jogo, carimbada de controle_bg.png como
em todas as salas (ver treinamento_bg.py); a de entrada, à esquerda, também.

Uso:
    python tools/jardim_bg.py
    python tools/jardim_bg.py --out /tmp/jardim_bg.png    # só para olhar
"""
import argparse
import math
import os
import random
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from treinamento_bg import DOOR_SRC_X, DOOR_PLATE, DOOR_BAND, DOOR_MAT  # noqa: E402
import recepcao_bg  # noqa: E402
from recepcao_bg import draw_text, blend, clamp  # noqa: E402

# Letras que nenhum letreiro tinha usado ainda (o draw_text lê o dicionário de lá).
recepcao_bg.GLYPHS["J"] = ("..###", "...#.", "...#.", "...#.", "#..#.", "#..#.", ".##..")
recepcao_bg.GLYPHS["V"] = ("#...#", "#...#", "#...#", "#...#", ".#.#.", ".#.#.", "..#..")

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "client", "assets", "images")

W, H = 1280, 704
WALL_H = 128
BASEBOARD_H = 8
FLOOR = (32, 128, 1216, 544)        # x, y, w, h (mesma área das outras salas)
SEED = 51

# --- Parede (x do mapa). Tem que bater com a JardimScene e o jardim.json. ---
DOOR_IN_X = 128                     # porta por onde ela entra (vem da recepção)
DOOR_X = 1152                       # porta de saída, = `door.x` da cena
GLASS = (210, 1070)                 # trecho de vidro entre as duas portas
MULLION_STEP = 66                   # caixilhos verticais
SIGN_CX = 640
SIGN_TOP = 12
SIGN_SCALE = 3
PIPE_Y = 112                        # cano da irrigação (centro), no pé do vidro

# --- Chão ---
TILE = 32                           # lajota de barro
FOUNTAIN = (640, 540, 150, 92)      # anel de pedra em volta do chafariz (cx, cy, rx, ry)


def wall(px, rng):
    """Parede de sempre nos cantos (onde ficam as portas) e vidro no meio."""
    for y in range(WALL_H - BASEBOARD_H):
        for x in range(W):
            n = rng.randint(-2, 2)
            px[x, y] = (31 + n, 33 + n, 41 + n, 255)
    for x in range(0, W, 96):
        if GLASS[0] <= x < GLASS[1]:
            continue
        for y in range(4, WALL_H - BASEBOARD_H):
            px[x, y] = (22, 24, 30, 255)
    for y in range(WALL_H - BASEBOARD_H, WALL_H):
        for x in range(W):
            px[x, y] = (15, 16, 20, 255)
    for x in range(W):
        px[x, WALL_H - 1] = (9, 10, 13, 255)


def glass(px, rng):
    """Vidro do chão ao teto com o inverno lá fora: céu cinza, pinheiros e neve."""
    gx0, gx1 = GLASS
    top, bot = 4, WALL_H - BASEBOARD_H
    # pinheiros: silhuetas em duas camadas, a de trás mais clara (névoa)
    trees = []
    for layer, (n, hmin, hmax, tone) in enumerate([(16, 26, 44, (74, 86, 104)), (11, 34, 62, (46, 56, 70))]):
        for _ in range(n):
            trees.append((rng.randint(gx0, gx1), rng.randint(hmin, hmax), rng.randint(9, 15), tone, layer))
    ground = bot - 22                                  # linha da neve no chão lá fora
    for y in range(top, bot):
        for x in range(gx0, gx1):
            t = (y - top) / (bot - top)
            c = blend((112, 124, 146), (168, 178, 196), t)        # céu de inverno
            for tx, th, tw, tone, _ in trees:
                base = ground + 2
                if base - th <= y <= base:
                    half = tw * (y - (base - th)) / th
                    if abs(x - tx) <= half:
                        c = tone
                        # neve nos galhos: faixas claras em degraus
                        if (y - (base - th)) % 9 in (0, 1) and abs(x - tx) < half - 1:
                            c = blend(c, (220, 228, 238), 0.7)
            if y >= ground:
                c = blend((214, 222, 234), (188, 198, 214), (y - ground) / 22)
            px[x, y] = c + (255,)
    # neve caindo (fixa: é uma foto do instante)
    for _ in range(420):
        x, y = rng.randint(gx0, gx1 - 1), rng.randint(top, ground)
        px[x, y] = blend(px[x, y][:3], (245, 248, 252), 0.85) + (255,)
        if rng.random() < 0.25 and x + 1 < gx1:
            px[x + 1, y] = blend(px[x + 1, y][:3], (245, 248, 252), 0.5) + (255,)
    # reflexo frio em diagonal sobre o vidro todo
    for y in range(top, bot):
        for x in range(gx0, gx1):
            if (x + y * 2) % 140 < 10:
                px[x, y] = blend(px[x, y][:3], (220, 236, 250), 0.18) + (255,)
    # caixilhos verde-escuros (estufa clássica) e travessa
    frame, frame_hi = (34, 52, 46), (60, 86, 74)
    for mx in range(gx0, gx1 + 1, MULLION_STEP):
        for y in range(top, bot):
            for d in range(-2, 2):
                if gx0 <= mx + d < W:
                    px[mx + d, y] = (frame_hi if d == -2 else frame) + (255,)
    for x in range(gx0 - 2, gx1 + 2):
        for y in (top, top + 1, 40, 41):
            px[x, y] = frame + (255,)
    # condensação embaçando o pé do vidro (é quente aqui dentro)
    for y in range(bot - 30, bot):
        f = (y - (bot - 30)) / 30
        for x in range(gx0, gx1):
            if rng.random() < 0.5 * f:
                px[x, y] = blend(px[x, y][:3], (200, 210, 220), 0.35 * f) + (255,)


def sign(px):
    """Placa de bronze sobre o vidro."""
    texto = "JARDIM DE INVERNO"
    largura = len(texto) * 6 * SIGN_SCALE
    x0, x1 = SIGN_CX - largura // 2 - 12, SIGN_CX + largura // 2 + 10
    for y in range(SIGN_TOP - 6, SIGN_TOP + 7 * SIGN_SCALE + 6):
        for x in range(x0, x1):
            borda = y in (SIGN_TOP - 6, SIGN_TOP + 7 * SIGN_SCALE + 5) or x in (x0, x1 - 1)
            px[x, y] = ((96, 74, 40) if borda else (40, 32, 22)) + (255,)
    draw_text(px, texto, SIGN_CX, SIGN_TOP, SIGN_SCALE, (220, 178, 96), sombra=(20, 14, 8))


def pipe(px):
    """Cano de cobre da irrigação, com braçadeiras a cada caixilho."""
    gx0, gx1 = GLASS
    for x in range(gx0 - 6, gx1 + 6):
        for dy, c in ((-3, (60, 38, 26)), (-2, (196, 124, 74)), (-1, (232, 160, 104)), (0, (176, 104, 60)),
                      (1, (140, 82, 48)), (2, (96, 56, 34)), (3, (40, 26, 18))):
            px[x, PIPE_Y + dy] = c + (255,)
    for mx in range(gx0, gx1 + 1, MULLION_STEP):
        for y in range(PIPE_Y - 5, PIPE_Y + 6):
            for x in range(mx - 3, mx + 3):
                px[x, y] = ((70, 74, 86) if y in (PIPE_Y - 5, PIPE_Y + 5) else (110, 116, 130)) + (255,)


def floor(px, rng):
    """Lajota de barro em fiada, com musgo nas juntas perto do vidro."""
    fx, fy, fw, fh = FLOOR
    tons = {}
    for y in range(fy, fy + fh):
        for x in range(fx, fx + fw):
            row = (y - fy) // TILE
            shift = (TILE // 2) * (row % 2)                 # fiada desencontrada
            tx = (x - fx + shift) // TILE
            if (tx, row) not in tons:
                tons[(tx, row)] = (rng.randint(-7, 7), rng.random())
            dt, wear = tons[(tx, row)]
            lx, ly = (x - fx + shift) % TILE, (y - fy) % TILE
            if lx == 0 or ly == 0:
                c = (34, 26, 24)
                # musgo nas juntas: mais perto do vidro (umidade da estufa)
                if rng.random() < 0.55 * max(0.0, 1 - (y - fy) / 220):
                    c = (34, 54, 36)
                px[x, y] = c + (255,)
                continue
            c = (78 + dt, 54 + dt // 2, 46 + dt // 3)
            if lx == 1 or ly == 1:
                c = blend(c, (98, 70, 58), 0.5)
            if wear > 0.8 and (lx * 7 + ly * 3) % 11 == 0:
                c = blend(c, (60, 42, 36), 0.6)              # lajota gasta, com poros
            px[x, y] = c + (255,)

    # anel de pedra em volta do chafariz (o chafariz é prop)
    cx, cy, rx, ry = FOUNTAIN
    for y in range(cy - ry - 2, cy + ry + 3):
        for x in range(cx - rx - 2, cx + rx + 3):
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if 0.62 <= d <= 1.0:
                ang = math.atan2((y - cy) / ry, (x - cx) / rx)
                pedra = int((ang + math.pi) / (2 * math.pi) * 26)
                k = (pedra * 37) % 9 - 4
                c = (76 + k, 76 + k, 84 + k)
                if abs(d - 0.62) < 0.03 or abs(d - 1.0) < 0.03 or (ang * 26 / (2 * math.pi)) % 1 < 0.06:
                    c = (44, 44, 52)
                px[x, y] = c + (255,)

    # canteiros de grama nos cantos de baixo
    for (gx, gy, gw, gh) in ((48, 560, 200, 100), (1032, 560, 200, 100)):
        for y in range(gy, gy + gh):
            for x in range(gx, gx + gw):
                borda = x < gx + 4 or x >= gx + gw - 4 or y < gy + 4 or y >= gy + gh - 4
                if borda:
                    c = (60, 54, 50) if (x + y) % 6 else (46, 42, 40)
                else:
                    c = (30, 62, 40) if rng.random() < 0.7 else (40, 78, 48)
                    if rng.random() < 0.06:
                        c = (62, 108, 62)
                px[x, y] = c + (255,)


def light(px):
    """Luz fria de cima (o vidro) e vinheta. A sombra da parede só nos cantos."""
    fx, fy, fw, fh = FLOOR

    def mul(x, y, f, cool=0.0):
        if not (fx <= x < fx + fw and fy <= y < fy + fh):
            return
        r, g, b, _ = px[x, y]
        r, g, b = r * f, g * f, b * f
        r, g, b = blend((r, g, b), (r * 0.9, g * 1.0, b * 1.18), cool)
        px[x, y] = (clamp(r), clamp(g), clamp(b), 255)

    gx0, gx1 = GLASS
    for y in range(fy, fy + fh):
        d = (y - fy) / fh
        for x in range(fx, fx + fw):
            # quanto deste ponto fica "embaixo" do vidro: 1 no meio, caindo
            # suave até 0 a 120 px das pontas (sem degrau nas quinas)
            fora = max(gx0 - x, x - gx1, 0)
            k = max(0.0, 1 - fora / 120) * max(0.0, 1 - d * 1.6)
            mul(x, y, 1 + 0.28 * k, cool=0.55 * k)
            if y < fy + 17:
                mul(x, y, 0.68 + 0.32 * ((y - fy) / 16) + 0.32 * k * (1 - (y - fy) / 16))
    vcx, vcy = W / 2, H * 0.45
    maxd = math.hypot(vcx, vcy)
    for y in range(fy, fy + fh):
        for x in range(fx, fx + fw):
            d = math.hypot(x - vcx, y - vcy) / maxd
            mul(x, y, 1 - 0.38 * max(0.0, min(1.0, (d - 0.55) / 0.45)))


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
    ap.add_argument("--out", default=os.path.join(ASSETS, "jardim", "jardim_bg.png"))
    args = ap.parse_args()

    rng = random.Random(SEED)
    im = Image.new("RGBA", (W, H), (5, 5, 5, 255))
    px = im.load()

    wall(px, rng)
    glass(px, rng)
    sign(px)
    pipe(px)
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

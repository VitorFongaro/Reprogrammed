"""Gera o fundo da RECEPÇÃO (cap2-recepcao), a primeira sala do térreo.

É a sala que tem que dizer "saímos do porão": piso de pedra polida em placas
grandes, janelas altas com a luz de fora entrando no chão, o letreiro da
Elysium em letra de aço (não tinta de estêncil, como no treinamento) e o
elevador por onde a Artemis chega, à esquerda.

A parede segue a MESMA fórmula das outras salas (ruído + linha de painel a cada
96 px + rodapé; ver tools/treinamento_bg.py), no mesmo tom, e a
porta de saída é carimbada de controle_bg.png pelo mesmo motivo de lá: é a
porta padrão do jogo e não tem gerador próprio.

Os móveis NÃO estão aqui: saem do Aseprite (tools/recepcao_props.lua) e vão no
mapa do Tiled (assets/maps/recepcao.json). Este fundo só tem o que é parede e
chão.

Uso:
    python tools/recepcao_bg.py
    python tools/recepcao_bg.py --out /tmp/recepcao_bg.png    # só para olhar
"""
import argparse
import math
import os
import random
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from treinamento_bg import (  # noqa: E402
    GLYPHS, GLYPH_W, GLYPH_H, GLYPH_GAP,
    DOOR_SRC_X, DOOR_PLATE, DOOR_BAND, DOOR_MAT
)

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "client", "assets", "images")

W, H = 1280, 704
WALL_H = 128
BASEBOARD_H = 8
PANEL_STEP = 96
FLOOR = (32, 128, 1216, 544)        # x, y, w, h (mesma área das outras salas)
SEED = 42

# Letras que o estêncil do treinamento não tinha.
GLYPHS = dict(GLYPHS)
GLYPHS["Y"] = ("#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#..")

# --- Parede (x do mapa). Tem que bater com a RecepcaoScene e o recepcao.json. ---
ELEVATOR = (72, 200)                # batente do elevador de onde ela chega
WINDOWS = [(224, 344), (616, 736)]  # janelas altas, dos dois lados do letreiro
SIGN_CX = 480                       # centro do letreiro = centro do balcão
SIGN_TOP = 24
SIGN_SCALE = 5
RESTRICT_CX = 990                   # "ACESSO RESTRITO", já do lado de dentro
RESTRICT_TOP = 50
RESTRICT_SCALE = 3
DOOR_X = 1152                       # porta de saída (centro), = `door.x` da cena

# --- Chão ---
FLOOR_TILE = 64                     # placa de pedra
RUG = (84, 430, 250, 168)           # tapete da área de espera (x, y, w, h)
CEILING_POOLS = [(480, 300, 150, 56), (1040, 300, 140, 52)]


def clamp(v, lo=0, hi=255):
    return int(max(lo, min(hi, v)))


def blend(c, d, t):
    return tuple(clamp(c[i] + (d[i] - c[i]) * t) for i in range(3))


def draw_text(px, texto, cx, top, escala, cor, sombra=None):
    """Letra cheia (sem desgaste): placa corporativa, não tinta velha."""
    passo = (GLYPH_W + GLYPH_GAP) * escala
    largura = len(texto) * passo - GLYPH_GAP * escala
    x0 = cx - largura // 2
    for k, ch in enumerate(texto):
        for j, linha in enumerate(GLYPHS.get(ch.upper(), GLYPHS[" "])):
            for i, marca in enumerate(linha):
                if marca != "#":
                    continue
                bx, by = x0 + k * passo + i * escala, top + j * escala
                for dy in range(escala):
                    for dx in range(escala):
                        if sombra:
                            px[bx + dx + 1, by + dy + 2] = sombra + (255,)
                for dy in range(escala):
                    for dx in range(escala):
                        # aço escovado: mais claro no alto da letra
                        t = (j * escala + dy) / (GLYPH_H * escala)
                        px[bx + dx, by + dy] = blend(cor, (cor[0] * 0.7, cor[1] * 0.7, cor[2] * 0.7), t) + (255,)
    return x0, largura


def glow(px, x0, y0, x1, y1, cor, raio, forca):
    """Halo suave (luz de fundo do letreiro), somado ao que já está na parede."""
    for y in range(max(0, y0 - raio), min(WALL_H - BASEBOARD_H, y1 + raio)):
        for x in range(max(0, x0 - raio), min(W, x1 + raio)):
            dx = max(x0 - x, 0, x - x1)
            dy = max(y0 - y, 0, y - y1)
            d = math.hypot(dx, dy) / raio
            if d >= 1:
                continue
            c = px[x, y]
            px[x, y] = blend(c, cor, forca * (1 - d) ** 2) + (255,)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--porta", default=os.path.join(ASSETS, "controle", "controle_bg.png"),
                    help="fundo de onde a porta padrão é copiada")
    ap.add_argument("--out", default=os.path.join(ASSETS, "recepcao", "recepcao_bg.png"))
    args = ap.parse_args()

    rng = random.Random(SEED)
    im = Image.new("RGBA", (W, H), (5, 5, 5, 255))
    px = im.load()

    # 1) Parede: a fórmula de sempre (mesmo tom: a porta carimbada traz a parede junto).
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

    # 2) Janelas: vidro com o céu em gradiente, caixilho e reflexo em diagonal.
    for wx0, wx1 in WINDOWS:
        top, bot = 10, WALL_H - BASEBOARD_H - 6
        for y in range(top, bot):
            for x in range(wx0, wx1):
                borda = x < wx0 + 3 or x >= wx1 - 3 or y < top + 3 or y >= bot - 3
                if borda:
                    px[x, y] = (18, 20, 26, 255)
                    continue
                t = (y - top) / (bot - top)
                c = blend((60, 84, 122), (104, 136, 176), t)
                # reflexos: faixas diagonais claras
                k = (x - wx0 + (y - top)) % 46
                if k < 5:
                    c = blend(c, (170, 196, 224), 0.35)
                px[x, y] = c + (255,)
        # caixilhos (duas colunas e uma travessa)
        for mx in (wx0 + (wx1 - wx0) // 3, wx0 + 2 * (wx1 - wx0) // 3):
            for y in range(top, bot):
                px[mx, y] = (18, 20, 26, 255)
                px[mx + 1, y] = (30, 34, 44, 255)
        for x in range(wx0, wx1):
            px[x, top + 40] = (18, 20, 26, 255)
        # peitoril
        for x in range(wx0 - 4, wx1 + 4):
            px[x, bot] = (120, 126, 140, 255)
            px[x, bot + 1] = (70, 74, 86, 255)

    # 3) Elevador de onde a Artemis chega: batente de aço, duas folhas e o
    # visor com o andar ("T" de térreo).
    ex0, ex1 = ELEVATOR
    for y in range(18, WALL_H - BASEBOARD_H):
        for x in range(ex0, ex1):
            if x < ex0 + 6 or x >= ex1 - 6 or y < 24:
                c = (58, 62, 74)
            else:
                # aço escovado: cada folha escurece para a emenda do meio
                t = ((x - ex0 - 6) % ((ex1 - ex0 - 12) // 2)) / ((ex1 - ex0 - 12) / 2)
                c = blend((84, 90, 104), (60, 64, 76), t)
                if (y - 24) % 22 == 0:
                    c = blend(c, (44, 47, 56), 0.6)
            px[x, y] = c + (255,)
    mid = (ex0 + ex1) // 2
    for y in range(24, WALL_H - BASEBOARD_H):
        px[mid, y] = (40, 43, 52, 255)
    for x in range(ex0, ex1):
        px[x, 18] = (140, 148, 164, 255)
    for y in range(4, 15):                          # visor
        for x in range(mid - 12, mid + 12):
            px[x, y] = (12, 14, 18, 255)
    for y in range(6, 13):                          # "T" em âmbar
        px[mid, y] = (255, 200, 36, 255)
    for x in range(mid - 3, mid + 4):
        px[x, 6] = (255, 200, 36, 255)
    px[mid + 8, 9] = (255, 200, 36, 255)            # setinha de chegada
    px[mid + 7, 10] = px[mid + 8, 10] = px[mid + 9, 10] = (255, 200, 36, 255)

    # 4) Letreiro da Elysium com luz ciano por trás, e o aviso de área restrita.
    lx0, lw = draw_text(px, "ELYSIUM", SIGN_CX, SIGN_TOP, SIGN_SCALE, (196, 204, 220), sombra=(16, 18, 24))
    glow(px, lx0, SIGN_TOP, lx0 + lw, SIGN_TOP + GLYPH_H * SIGN_SCALE, (74, 214, 255), 26, 0.35)
    draw_text(px, "ELYSIUM", SIGN_CX, SIGN_TOP, SIGN_SCALE, (196, 204, 220), sombra=(16, 18, 24))
    # losango do emblema abaixo do nome
    ecx, ecy = SIGN_CX, SIGN_TOP + GLYPH_H * SIGN_SCALE + 18
    for j in range(-8, 9):
        for i in range(-5, 6):
            if abs(i) / 5 + abs(j) / 8 <= 1:
                px[ecx + i, ecy + j] = (74, 214, 255, 255) if abs(i) / 5 + abs(j) / 8 <= 0.45 else (40, 120, 150, 255)
    for i in range(10, 44):
        for s in (-1, 1):
            px[ecx + s * i, ecy - (i - 10) // 12] = (110, 118, 136, 255)

    draw_text(px, "ACESSO", RESTRICT_CX, RESTRICT_TOP - 26, RESTRICT_SCALE, (220, 170, 50), sombra=(20, 16, 8))
    draw_text(px, "RESTRITO", RESTRICT_CX, RESTRICT_TOP, RESTRICT_SCALE, (220, 170, 50), sombra=(20, 16, 8))
    # faixa zebrada sob o aviso
    for x in range(RESTRICT_CX - 70, RESTRICT_CX + 70):
        for y in range(RESTRICT_TOP + 26, RESTRICT_TOP + 32):
            px[x, y] = (200, 150, 40, 255) if ((x + y) // 6) % 2 == 0 else (24, 22, 20, 255)

    # 5) Piso: placas de pedra polida com veio, rejunte fino.
    fx, fy, fw, fh = FLOOR
    tons = {}
    for y in range(fy, fy + fh):
        for x in range(fx, fx + fw):
            tx, ty = (x - fx) // FLOOR_TILE, (y - fy) // FLOOR_TILE
            if (tx, ty) not in tons:
                # cada placa: tom, e um veio com amplitude/frequência próprias
                # (ou nenhum) — veio igual em toda placa vira estampa.
                tons[(tx, ty)] = (rng.randint(-3, 3), rng.random() * 6.28, rng.randint(0, FLOOR_TILE),
                                  rng.uniform(3, 14), rng.uniform(7, 19), rng.random() < 0.55)
            dt, fase, off, amp, freq, tem_veio = tons[(tx, ty)]
            lx, ly = (x - fx) % FLOOR_TILE, (y - fy) % FLOOR_TILE
            if lx == 0 or ly == 0:
                px[x, y] = (30, 33, 42, 255)
                continue
            c = (48 + dt, 52 + dt, 64 + dt)
            # veio: uma curva clara e fina atravessando a placa
            v = ly - (off + amp * math.sin(lx / freq + fase)) % FLOOR_TILE
            if tem_veio and abs(v) < 0.7:
                c = blend(c, (78, 84, 100), 0.35)
            if lx == 1 or ly == 1:
                c = blend(c, (70, 76, 92), 0.5)          # quina polida
            px[x, y] = c + (255,)

    # 6) Tapete da área de espera (borda + miolo com trama).
    rx, ry, rw, rh = RUG
    for y in range(ry, ry + rh):
        for x in range(rx, rx + rw):
            borda = x < rx + 6 or x >= rx + rw - 6 or y < ry + 6 or y >= ry + rh - 6
            if borda:
                c = (40, 58, 70)
                if x in (rx + 3, rx + rw - 4) or y in (ry + 3, ry + rh - 4):
                    c = (64, 110, 126)
            else:
                c = (30, 38, 50) if (x + y) % 4 else (34, 43, 56)
            px[x, y] = c + (255,)

    # 7) Luz: sombra da parede, sol das janelas no chão, poças do teto, vinheta.
    def light(x, y, f):
        if not (fx <= x < fx + fw and fy <= y < fy + fh):
            return
        c = px[x, y]
        px[x, y] = (clamp(c[0] * f), clamp(c[1] * f), clamp(c[2] * f * (1.04 if f > 1 else 1)), 255)

    for y in range(fy, fy + 17):
        f = 0.68 + 0.32 * ((y - fy) / 16)
        for x in range(fx, fx + fw):
            light(x, y, f)

    # Sol das janelas: um trapézio que sai da base de cada janela e se inclina
    # para a direita (sol da tarde), esmaecendo com a distância.
    for wx0, wx1 in WINDOWS:
        comprimento = 230
        for d in range(comprimento):
            y = fy + 18 + d
            desvio = int(d * 0.45)
            for x in range(wx0 + 4 + desvio, wx1 - 4 + desvio):
                caixilho = any(abs((x - desvio) - m) <= 1 for m in
                               (wx0 + (wx1 - wx0) // 3, wx0 + 2 * (wx1 - wx0) // 3))
                if caixilho:
                    continue
                light(x, y, 1 + 0.42 * (1 - d / comprimento))

    for cx, cy, rx_, ry_ in CEILING_POOLS:
        for y in range(-ry_, ry_ + 1):
            for x in range(-rx_, rx_ + 1):
                d = (x * x) / (rx_ * rx_) + (y * y) / (ry_ * ry_)
                if d <= 1:
                    light(cx + x, cy + y, 1 + 0.5 * (1 - d))

    vcx, vcy = W / 2, H * 0.42
    maxd = math.hypot(vcx, vcy)
    for y in range(fy, fy + fh):
        for x in range(fx, fx + fw):
            d = math.hypot(x - vcx, y - vcy) / maxd
            light(x, y, 1 - 0.35 * max(0.0, min(1.0, (d - 0.55) / 0.45)))

    # 8) Porta padrão, carimbada por último (ver treinamento_bg.py).
    porta = Image.open(args.porta).convert("RGB")
    pp = porta.load()
    for rect in (DOOR_PLATE, DOOR_BAND, DOOR_MAT):
        x0, y0, x1, y1 = rect
        for y in range(y0, y1):
            for x in range(x0, x1):
                px[x - DOOR_SRC_X + DOOR_X, y] = pp[x, y] + (255,)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    im.save(args.out)
    print("salvo:", os.path.abspath(args.out))


if __name__ == "__main__":
    main()

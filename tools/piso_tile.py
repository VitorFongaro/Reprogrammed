"""Repinta o piso das salas do capítulo 1 com o tile do pack de parede/piso.

Mesmo tile, mesmo tom e a mesma fórmula de iluminação do porão (que foi feito antes
deste script existir, por tools/porao_piso.lua): carimba o tile, escurece a faixa
colada na parede, reacende as poças das luminárias e fecha com a vinheta.

Cada sala declara o retângulo de piso, as poças de luz, o que deve ser preservado
inteiro (estruturas desenhadas sobre o chão) e onde há marcação pintada no piso —
nesse último caso só os pixels da marcação são preservados, para não sobrar uma
mancha de piso velho em volta dela.

Uso (o caminho do pack é local de cada dev):

    python tools/piso_tile.py --tiles "<pack>/tileset x2.png"          # todas
    python tools/piso_tile.py --tiles "..." --rooms corredor           # uma só
    python tools/piso_tile.py --tiles "..." --out-dir /tmp/preview     # sem escrever no projeto

Depois de rodar, ressincronize o .aseprite de cada fundo alterado:

    <aseprite> -b <sala>_bg.png --save-as <sala>_bg.aseprite

O saguão não está aqui de propósito: é cutscene, com o chão em perspectiva frontal,
onde um tile top-down ficaria torto.
"""
import argparse
import math
import os
import random

from PIL import Image

IMAGES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "client", "assets", "images")

TILE = 32
# Células de piso liso na folha do pack (as mesmas quatro usadas no porão).
TILE_CELLS = [(2112, 64), (2144, 64), (2112, 96), (2144, 96)]
DARKEN = 0.6            # tom do piso do porão; 1.0 = cor original do pack.
WALL_SHADOW_H = 16      # sombra projetada pela parede sobre o piso.
WALL_SHADOW_MIN = 0.68
POOL_GAIN = 0.8         # brilho no centro da poça de luz.
MARK_DELTA = 10         # quanto um pixel precisa estar acima do piso para ser marcação.
SEED = 7

# floors: retângulos (x, y, w, h) de piso, em coordenadas da imagem de fundo.
# pools:  (cx, cy, rx, ry) das poças das luminárias, medidas no fundo original.
# keep:   retângulos preservados inteiros (estruturas desenhadas sobre o piso).
# marks:  retângulos onde a marcação pintada no chão é preservada pixel a pixel.
ROOMS = {
    "arquivos": {
        "bg": "arquivos/arquivos_bg.png",
        "floors": [(32, 128, 1216, 544)],
        "pools": [(287, 210, 118, 52), (655, 172, 94, 38), (993, 211, 118, 52)],
        "keep": [(611, 126, 92, 12)],                      # faixa de perigo sob a porta
        "marks": [],
    },
    "controle": {
        "bg": "controle/controle_bg.png",
        "floors": [(32, 128, 1216, 544)],
        "pools": [(251, 211, 98, 44), (640, 178, 101, 39), (1029, 211, 98, 42)],
        "keep": [(373, 126, 96, 12), (594, 126, 96, 12), (813, 126, 96, 12)],
        "marks": [],
    },
    "seguranca": {
        "bg": "seguranca/seguranca_bg.png",
        "floors": [(32, 128, 1216, 544)],
        # As duas luzes grandes desta sala caem sobre o bloco do ENIAC, que é
        # preservado inteiro — no piso sobra só a da porta.
        "pools": [(1138, 178, 66, 27)],
        "keep": [
            (218, 118, 848, 164),                          # bloco do ENIAC
            (590, 266, 100, 126),                          # console vermelho
            (1105, 126, 92, 12),                           # faixa sob a porta
            (559, 398, 166, 12),                           # faixa sob o console
        ],
        "marks": [],
    },
    "corredor": {
        "bg": "corredor/corredor_bg.png",
        "floors": [(32, 296, 1118, 376), (1151, 568, 129, 104)],
        "pools": [(266, 379, 74, 32), (621, 380, 89, 35), (985, 378, 74, 35)],
        "keep": [(1160, 556, 104, 18)],                    # faixa de perigo do elevador
        "marks": [(40, 444, 1110, 56)],                    # setas ">" pintadas no chão
    },
}


def luminance(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def clamp(v, lo, hi):
    return lo if v < lo else hi if v > hi else v


def repaint(room, cfg, tiles, out_path):
    src = Image.open(os.path.join(IMAGES, cfg["bg"])).convert("RGBA")
    out = src.copy()
    op, sp = out.load(), src.load()
    w, h = out.size
    floors, keep, marks, pools = cfg["floors"], cfg["keep"], cfg["marks"], cfg["pools"]

    protected = set()
    for kx, ky, kw, kh in keep:
        for y in range(ky, ky + kh):
            for x in range(kx, kx + kw):
                protected.add((x, y))
    # Marcação no chão: preserva só o que está mais claro que o piso em volta.
    for mx, my, mw, mh in marks:
        floor_level = sorted(
            luminance(sp[x, y]) for y in range(my, my + mh, 2) for x in range(mx, mx + mw, 2)
        )
        level = floor_level[len(floor_level) // 2]
        for y in range(my, my + mh):
            for x in range(mx, mx + mw):
                if luminance(sp[x, y]) > level + MARK_DELTA:
                    protected.add((x, y))

    # Fator de luz de um pixel do piso: sombra da parede x poças x vinheta.
    vcx, vcy = w / 2, h * 0.42
    maxd = math.hypot(vcx, vcy)

    def light(x, y, floor_top):
        f = 1.0
        if y - floor_top < WALL_SHADOW_H:
            f *= WALL_SHADOW_MIN + (1 - WALL_SHADOW_MIN) * ((y - floor_top) / WALL_SHADOW_H)
        for cx, cy, rx, ry in pools:
            d = ((x - cx) ** 2) / (rx * rx) + ((y - cy) ** 2) / (ry * ry)
            if d <= 1:
                f *= 1 + POOL_GAIN * (1 - d)
        d = math.hypot(x - vcx, y - vcy) / maxd
        return f * (1 - 0.35 * clamp((d - 0.55) / 0.45, 0, 1))

    # Grade única para a sala inteira: retângulos de piso separados (corredor e
    # alcova do elevador) continuam a mesma grade em vez de cada um começar a sua.
    ox, oy = floors[0][0], floors[0][1]
    painted = 0
    for fx, fy, fw, fh in floors:
        for ty in range(fy - (fy - oy) % TILE, fy + fh, TILE):
            for tx in range(fx - (fx - ox) % TILE, fx + fw, TILE):
                # Célula sorteada pelo índice do tile na grade, para o resultado
                # não depender da ordem em que os retângulos são percorridos.
                cell = TILE_CELLS[
                    random.Random(f"{SEED}:{(tx - ox) // TILE}:{(ty - oy) // TILE}").randrange(len(TILE_CELLS))
                ]
                for py in range(TILE):
                    y = ty + py
                    if not fy <= y < fy + fh:
                        continue
                    for pxi in range(TILE):
                        x = tx + pxi
                        if not fx <= x < fx + fw or (x, y) in protected:
                            continue
                        c = tiles[cell[0] + pxi, cell[1] + py]
                        f = DARKEN * light(x, y, fy)
                        op[x, y] = (
                            min(255, int(c[0] * f)),
                            min(255, int(c[1] * f)),
                            min(255, int(c[2] * f)),
                            255,
                        )
                        painted += 1

    out.save(out_path)
    print(f"{room}: {painted} pixels repintados -> {out_path}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tiles", required=True, help='folha do pack, ex: "<pack>/tileset x2.png"')
    ap.add_argument("--rooms", nargs="*", default=sorted(ROOMS), help="salas a repintar")
    ap.add_argument("--out-dir", default=None, help="escreve aqui em vez de sobrescrever o fundo")
    args = ap.parse_args()

    sheet = Image.open(args.tiles).convert("RGB")
    print(f"tiles: {sheet.size[0]}x{sheet.size[1]}")
    for room in args.rooms:
        cfg = ROOMS[room]
        if args.out_dir:
            os.makedirs(args.out_dir, exist_ok=True)
            out_path = os.path.join(args.out_dir, os.path.basename(cfg["bg"]))
        else:
            out_path = os.path.join(IMAGES, cfg["bg"])
        repaint(room, cfg, sheet.load(), out_path)


if __name__ == "__main__":
    main()

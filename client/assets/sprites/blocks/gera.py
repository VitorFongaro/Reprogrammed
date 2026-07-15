# gera.py - gera o sheet dos blocos do puzzle A PARTIR do sprite feito no Aseprite
# pelo dev (chassi.aseprite / chassi-fonte.png). Mantem a forma, o contorno e a
# sombra do bloco original; so (1) remove o texto pintado ("VALOR"), (2) recolore
# em 3 tons por categoria preservando o sombreamento (troca so a matiz H, mantem
# S/V), e (3) usa 9-slice para esticar o chassi 32x32 ate 152x48 sem distorcer os
# cantos arredondados. O ROTULO de cada bloco NAO e desenhado aqui: e sobreposto em
# runtime pelo BlockProgrammingConsole com a fonte VCR, entao um chassi serve a
# qualquer texto.
#
# Fluxo (o caminho do Aseprite e local de cada maquina - veja AGENTS.md):
#   <aseprite> -b chassi.aseprite --save-as chassi-fonte.png
#   python gera.py                # gera blocks.png (3 quadros de 152x48)
#
# Frames do sheet: 0 = nome (ciano), 1 = operador (ambar), 2 = valor (azul original).

import colorsys
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "chassi-fonte.png")
OUT = os.path.join(HERE, "blocks.png")

BLOCK_W, BLOCK_H = 152, 48          # tamanho de cada quadro no jogo.
CAPS = (10, 10, 9, 9)               # 9-slice: esquerda, direita, topo, base.

# Cores do texto pintado no sprite original (branco + cinza-claro do anti-alias).
TEXT_COLORS = {(255, 255, 255, 255), (173, 189, 219, 255)}
BASE_FILL = (99, 155, 255, 255)     # azul de preenchimento do bloco.

# Matiz-alvo por categoria (0..1). None = mantem as cores originais (azul).
CATEGORY_HUES = {
    "nome": 0.52,      # ciano
    "op": 0.09,        # ambar
    "valor": None      # azul original
}
FRAME_ORDER = ["nome", "op", "valor"]


def remove_text(img):
    out = img.copy()
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            if px[x, y] in TEXT_COLORS:
                px[x, y] = BASE_FILL
    return out


def recolor(img, hue):
    if hue is None:
        return img.copy()
    out = img.copy()
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0 or (r, g, b) == (0, 0, 0):
                continue                      # transparente e contorno preto ficam.
            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            nr, ng, nb = colorsys.hsv_to_rgb(hue, s, v)
            px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
    return out


def nineslice(img, tw, th, caps):
    L, R, T, B = caps
    w, h = img.size
    midw, midh = w - L - R, h - T - B
    xs_src = [(0, L), (L, L + midw), (w - R, w)]
    ys_src = [(0, T), (T, T + midh), (h - B, h)]
    xs_dst = [(0, L), (L, tw - R), (tw - R, tw)]
    ys_dst = [(0, T), (T, th - B), (th - B, th)]
    out = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    for i in range(3):
        for j in range(3):
            piece = img.crop((xs_src[i][0], ys_src[j][0], xs_src[i][1], ys_src[j][1]))
            dw = xs_dst[i][1] - xs_dst[i][0]
            dh = ys_dst[j][1] - ys_dst[j][0]
            if piece.size != (dw, dh):
                piece = piece.resize((dw, dh), Image.NEAREST)
            out.paste(piece, (xs_dst[i][0], ys_dst[j][0]))
    return out


def main():
    base = remove_text(Image.open(SRC).convert("RGBA"))
    sheet = Image.new("RGBA", (BLOCK_W * len(FRAME_ORDER), BLOCK_H), (0, 0, 0, 0))
    for index, category in enumerate(FRAME_ORDER):
        chassi = nineslice(recolor(base, CATEGORY_HUES[category]), BLOCK_W, BLOCK_H, CAPS)
        sheet.paste(chassi, (index * BLOCK_W, 0))
    sheet.save(OUT)
    print("gerado:", OUT)


if __name__ == "__main__":
    main()

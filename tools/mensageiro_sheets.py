# Converte o pack "Bot Wheel" (o robô de uma roda só) para o formato de folha
# que o Enemy.js espera: TIRA HORIZONTAL de quadros de 36x32.
#
# O pack vem ao contrário do nosso: cada animação é uma TIRA VERTICAL de quadros
# de 117x26, e o desenho ocupa só a faixa x 5..37 (o resto do quadro é sobra para
# os efeitos de rastro, que chegam a x=117). Este script recorta essa faixa,
# centraliza e empilha na horizontal.
#
# O "GAS dash" é caso à parte. Ele vem em DUAS camadas no pack ("with FX" e o
# rastro sozinho), e o robô desenhado ali NÃO fica no mesmo lugar das outras
# animações: ele está lá na direita, em x 87..113 (centro ~100), com o rastro
# saindo para a esquerda. Em vez de recortar, exportamos o RASTRO SOZINHO em
# largura cheia (117) e o jogo o desenha como um sprite separado, colado atrás
# do robô — assim a investida funciona em qualquer velocidade e dá para espelhar
# quando ele foge para o outro lado. A âncora está em DASH_ANCHOR_X, que é onde
# o artista pôs o robô: casar esse ponto com o sprite do robô recompõe o desenho
# original. O último quadro do rastro é vazio (é só o robô) e fica de fora.
#
# Uso (a partir da raiz do repo):  python tools/mensageiro_sheets.py
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(os.path.dirname(ROOT), "Bot Wheel", "Bot Wheel")
DST = os.path.join(ROOT, "client", "assets", "sprites", "enemies", "mensageiro")

SRC_FRAME_H = 26
# Recorte em x centrado no desenho: o conteúdo de TODAS as animações cabe em
# 5..37, então a janela [3, 39) deixa o robô no meio do quadro (importante: o
# flipX espelha em torno do centro do quadro, não do desenho).
CROP_X0 = 3
FRAME_W = 36
FRAME_H = 32
PAD_TOP = 3           # 26 linhas + 3 em cima + 3 embaixo = 32; a roda fica na base.

# arquivo do pack -> folha nossa (o nome vira a chave `enemy-mensageiro-<nome>`).
# `walk`/`disabled` seguem o nome das outras pastas de inimigo de propósito: a
# ReprogramScene monta a chave do retrato como `enemy-<tipo>-walk`.
SHEETS = {
    "static idle.png": "idle.png",      # dormente (1 quadro)
    "wake.png": "wake.png",             # acorda quando alguém passa perto
    "move with FX.png": "walk.png",     # rolando (com a poeirinha do pack)
    "charge.png": "charge.png",         # carregando o tiro (telegrafo)
    "shoot without FX.png": "shoot.png",
    "death.png": "disabled.png"         # desligado: toca uma vez e fica de sucata
}

# Rastro da investida: largura cheia, sem recorte em x, e sem o último quadro
# (vazio). DASH_ANCHOR_X é o centro do robô DENTRO deste desenho — o jogo usa
# `setOrigin(DASH_ANCHOR_X / DASH_W, 0.5)` para colar o rastro no robô.
DASH_SRC = "GAS dash FX.png"
DASH_DST = "dash.png"
DASH_W = 117
DASH_FRAMES = 6
DASH_ANCHOR_X = 100


def convert(src_path, dst_path):
    src = Image.open(src_path).convert("RGBA")
    frames = src.size[1] // SRC_FRAME_H
    out = Image.new("RGBA", (FRAME_W * frames, FRAME_H), (0, 0, 0, 0))
    for i in range(frames):
        box = (CROP_X0, i * SRC_FRAME_H, CROP_X0 + FRAME_W, (i + 1) * SRC_FRAME_H)
        out.paste(src.crop(box), (i * FRAME_W, PAD_TOP))
    out.save(dst_path)
    return frames


def convert_dash(src_path, dst_path):
    src = Image.open(src_path).convert("RGBA")
    out = Image.new("RGBA", (DASH_W * DASH_FRAMES, FRAME_H), (0, 0, 0, 0))
    for i in range(DASH_FRAMES):
        box = (0, i * SRC_FRAME_H, DASH_W, (i + 1) * SRC_FRAME_H)
        out.paste(src.crop(box), (i * DASH_W, PAD_TOP))
    out.save(dst_path)


def main():
    os.makedirs(DST, exist_ok=True)
    for src_name, dst_name in SHEETS.items():
        frames = convert(os.path.join(SRC, src_name), os.path.join(DST, dst_name))
        print(f"{dst_name:12} {frames} quadros de {FRAME_W}x{FRAME_H}")
    convert_dash(os.path.join(SRC, DASH_SRC), os.path.join(DST, DASH_DST))
    print(f"{DASH_DST:12} {DASH_FRAMES} quadros de {DASH_W}x{FRAME_H}"
          f" (âncora do robô em x={DASH_ANCHOR_X})")


if __name__ == "__main__":
    main()

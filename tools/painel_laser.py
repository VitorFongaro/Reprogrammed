"""Gera o PAINEL DA BARREIRA da sala de treinamento (cap1-treinamento).

Era o único `PuzzleDevice` do capítulo ainda usando o corpo procedural que a
classe desenha por padrão: um retângulo preto com ranhuras e uma bolinha
vermelha. Todas as outras máquinas do jogo já têm arte (o gerador do porão e os
dois painéis da sala de controle vêm desenhados no fundo), então essa destoava.

Mesmo estilo e mesma paleta dos props de servidor: 3/4 top-down com faces
ALINHADAS AOS EIXOS, contorno preto de 1px, desenhado em tamanho nativo e
exportado em 2x. Reaproveita o `Sprite` de tools/servidores.py em vez de repetir
os cem helpers de desenho.

O tamanho nativo (42x66 -> 84x132) NÃO é livre: bate com o `w`/`h` padrão do
`PuzzleDevice`, que é o que define a caixa do alvo de reprogramação remota ([R])
e onde a luz indicadora é desenhada. A luz cai em (x, topo + 14) na tela, ou
seja, no pixel nativo (21, 7) — por isso a carcaça do sinalizador está centrada
exatamente ali: a luz do código acende DENTRO dela, em vez de flutuar por cima
do sprite.

Uso:
    python tools/painel_laser.py
    python tools/painel_laser.py --out-dir /tmp    # só para olhar
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from servidores import SCALE, Sprite, OUT, D3, D2, D1, M, L1, L2, L3, CYAN, AMBER  # noqa: E402

# Onde a luz do PuzzleDevice cai, em pixel nativo (ver docstring).
LAMP = (21, 7)


def painel_laser():
    """Painel de controle da barreira - 42x66 nativo (84x132 em 2x)."""
    s = Sprite(42, 66)
    lx, ly = LAMP

    # --- Sinalizador no topo: carcaça + vão escuro onde a luz do código acende.
    s.ellipse(lx, ly, 9, 7, D2)
    s.ellipse(lx, ly, 7, 6, D3)
    s.line_h(lx - 5, ly - 6, 11, D1)          # aro iluminado por cima
    s.rect(lx - 3, ly + 6, 6, 4, D1)          # haste

    # --- Face de cima do console.
    s.rect(3, 15, 36, 5, L2)
    s.line_h(3, 15, 36, L3)

    # --- Corpo.
    s.rect(3, 20, 36, 38, M)
    s.line_v(3, 20, 38, L1)                   # montante iluminado (luz vem de cima-esquerda)
    s.line_v(38, 20, 38, D2)                  # lateral na sombra

    # --- Tela: moldura clara, vão escuro e linhas de código em ciano.
    s.rect(6, 23, 30, 18, D1)
    s.rect(7, 24, 28, 16, D3)
    for k, largura in enumerate((18, 11, 22, 8, 15)):
        s.line_h(9, 26 + k * 3, largura, CYAN)
    s.dot(9, 38, AMBER)                       # cursor piscando no fim

    # --- Deck de botões.
    s.rect(6, 43, 30, 11, D2)
    s.line_h(6, 43, 30, D1)
    for linha in range(2):
        for coluna in range(8):
            s.rect(8 + coluna * 3, 45 + linha * 3, 2, 2, L1)
    s.rect(8, 51, 20, 2, D1)                  # barra de espaço
    s.dot(31, 51, CYAN)
    s.dot(34, 51, AMBER)

    # --- Base e pés.
    s.rect(4, 58, 34, 5, D2)
    s.line_h(4, 58, 34, D1)
    s.rect(5, 63, 5, 2, D3)
    s.rect(32, 63, 5, 2, D3)

    s.outline()
    return s


SPRITES = {"painel_laser": painel_laser}

DEST = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                    "..", "client", "assets", "images", "treinamento", "props")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out-dir", default=DEST)
    args = ap.parse_args()
    os.makedirs(args.out_dir, exist_ok=True)

    for nome, fn in SPRITES.items():
        s = fn()
        caminho = os.path.join(args.out_dir, nome + ".png")
        s.save(caminho)
        print(f"{nome:16s} {s.w:3d}x{s.h:<3d} nativo -> {s.w*SCALE}x{s.h*SCALE}  {caminho}")


if __name__ == "__main__":
    main()

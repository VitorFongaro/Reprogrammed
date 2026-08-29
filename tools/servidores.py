"""Gera os props de sala de servidor, no estilo dos props do pack.

Usados na SALA DE ARQUIVOS (cap1-arquivos), que virou sala de servidores.

Por que por script e não por IA de imagem: a perspectiva do jogo é 3/4 top-down
com faces ALINHADAS AOS EIXOS (a face de cima é um retângulo logo acima da
frente, sem nenhuma diagonal), contorno preto de 1px e paleta fechada. Modelo de
imagem erra as três coisas; aqui elas saem certas por construção.

A arte é desenhada em tamanho NATIVO e exportada em 2x com nearest-neighbour,
que é como os props existentes estão (o caixote é 24x30 nativo em 48x60).

Uso:
    python tools/porao_servidores.py                 # escreve nos props do porão
    python tools/porao_servidores.py --out-dir /tmp  # só para olhar
"""
import argparse
import os

from PIL import Image

SCALE = 2  # os props do porão são 2x (ver AGENTS.md, seção Assets).

# Paleta medida nos props já usados na sala.
OUT = (0, 0, 0, 255)          # contorno
D3 = (30, 30, 30, 255)        # vão escuro
D2 = (66, 66, 66, 255)        # sombra
D1 = (102, 102, 102, 255)     # meio-tom
M = (130, 130, 130, 255)      # corpo
L1 = (162, 162, 162, 255)     # corpo claro
L2 = (188, 188, 188, 255)     # face de cima
L3 = (242, 234, 228, 255)     # brilho
CYAN = (74, 214, 255, 255)
RED = (255, 69, 69, 255)
AMBER = (255, 200, 36, 255)


class Sprite:
    """Tela nativa com desenho por retângulos e contorno automático."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        self.px = self.im.load()

    def rect(self, x, y, w, h, color):
        for j in range(y, y + h):
            for i in range(x, x + w):
                if 0 <= i < self.w and 0 <= j < self.h:
                    self.px[i, j] = color

    def line_h(self, x, y, w, color):
        self.rect(x, y, w, 1, color)

    def line_v(self, x, y, h, color):
        self.rect(x, y, 1, h, color)

    def dot(self, x, y, color):
        self.rect(x, y, 1, 1, color)


    def mesh(self, x, y, w, h, base, dot):
        """Tela perfurada: base escura com pontos claros alternados."""
        self.rect(x, y, w, h, base)
        for j in range(y, y + h):
            for i in range(x + (j - y) % 2, x + w, 2):
                self.dot(i, j, dot)

    def vents(self, x, y, w, n, color, step=2):
        """Fileira de venezianas horizontais."""
        for k in range(n):
            self.line_h(x, y + k * step, w, color)

    def ellipse(self, cx, cy, rx, ry, color):
        for j in range(-ry, ry + 1):
            for i in range(-rx, rx + 1):
                if (i * i) / (rx * rx or 1) + (j * j) / (ry * ry or 1) <= 1.0:
                    self.dot(cx + i, cy + j, color)

    def ring(self, cx, cy, rx, ry, color):
        for ang in range(0, 360, 3):
            import math
            i = round(rx * math.cos(math.radians(ang)))
            j = round(ry * math.sin(math.radians(ang)))
            self.dot(cx + i, cy + j, color)

    def outline(self):
        """Contorno preto de 1px em volta de toda a silhueta."""
        opaco = {(x, y) for y in range(self.h) for x in range(self.w)
                 if self.px[x, y][3] == 255}
        borda = set()
        for (x, y) in opaco:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (x + dx, y + dy)
                if 0 <= n[0] < self.w and 0 <= n[1] < self.h and n not in opaco:
                    borda.add(n)
        for (x, y) in borda:
            self.px[x, y] = OUT

    def save(self, path):
        big = self.im.resize((self.w * SCALE, self.h * SCALE), Image.NEAREST)
        big.save(path)
        return big


def server_rack_closed():
    """Armario de servidor fechado - 24x56 nativo."""
    s = Sprite(24, 56)
    s.rect(2, 1, 20, 5, L2)                 # face de cima
    s.line_h(2, 1, 20, L3)
    s.vents(6, 2, 12, 2, D1, step=2)        # venezianas do topo
    s.rect(2, 6, 20, 46, M)                 # corpo
    s.line_v(2, 6, 46, L1)                  # montante iluminado
    s.line_v(21, 6, 46, D2)                 # lateral na sombra
    s.mesh(5, 9, 14, 36, D3, D2)            # porta perfurada
    s.line_h(5, 9, 14, D1)                  # moldura da porta
    s.line_h(5, 44, 14, D1)
    s.line_v(4, 9, 36, D1)
    s.line_v(19, 9, 36, D1)
    s.vents(20, 12, 1, 8, D3, step=3)       # respiro lateral
    s.dot(17, 12, CYAN)
    s.dot(17, 15, RED)
    s.dot(18, 26, L2)                       # trinco
    s.rect(3, 46, 18, 5, D2)                # base
    s.rect(4, 51, 3, 2, D3)                 # pes
    s.rect(17, 51, 3, 2, D3)
    s.outline()
    return s


def server_rack_open():
    """Mesmo armario com a porta aberta a esquerda - 30x56 nativo."""
    s = Sprite(30, 56)
    s.rect(8, 1, 20, 5, L2)
    s.line_h(8, 1, 20, L3)
    s.vents(12, 2, 12, 2, D1, step=2)
    s.rect(8, 6, 20, 46, M)
    s.line_v(27, 6, 46, D2)
    s.rect(10, 9, 16, 36, D3)               # interior
    for k, y in enumerate(range(10, 44, 6)):
        s.rect(11, y, 14, 4, D2)            # bandejas
        s.line_h(11, y, 14, D1)
        s.dot(23, y + 1, CYAN if k % 2 else RED)
    s.line_v(12, 30, 12, RED)               # cabos descendo
    s.line_v(14, 32, 10, CYAN)
    s.line_v(16, 31, 11, D1)
    s.rect(3, 8, 5, 40, D1)                 # porta aberta, de perfil
    s.mesh(4, 10, 3, 36, D3, D2)
    s.line_v(3, 8, 40, L1)
    s.rect(8, 46, 20, 5, D2)
    s.rect(9, 51, 3, 2, D3)
    s.rect(23, 51, 3, 2, D3)
    s.outline()
    return s


def server_rack_toppled():
    """Armario tombado de lado - 44x26 nativo."""
    s = Sprite(44, 26)
    s.rect(2, 3, 40, 4, L2)                 # face de cima (agora a lateral)
    s.line_h(2, 3, 40, L3)
    s.rect(2, 7, 40, 15, M)
    s.line_h(2, 7, 40, L1)
    s.line_h(2, 21, 40, D2)
    s.mesh(5, 10, 30, 9, D3, D2)            # grade, deitada
    s.line_h(5, 10, 30, D1)
    s.line_h(5, 18, 30, D1)
    s.vents(36, 10, 4, 4, D3, step=2)
    s.dot(3, 11, CYAN)
    s.dot(3, 14, RED)
    s.line_h(36, 21, 6, D1)                 # cabos saindo
    s.line_h(38, 23, 5, RED)
    s.outline()
    return s


def server_tower_small():
    """Torre avulsa - 16x36 nativo."""
    s = Sprite(16, 36)
    s.rect(2, 1, 12, 4, L2)
    s.line_h(2, 1, 12, L3)
    s.vents(5, 2, 6, 1, D1)
    s.rect(2, 5, 12, 28, M)
    s.line_v(2, 5, 28, L1)
    s.line_v(13, 5, 28, D2)
    s.rect(4, 8, 8, 18, D3)                 # frente
    s.vents(5, 10, 6, 5, D1, step=3)
    s.dot(10, 28, CYAN)
    s.dot(10, 30, RED)
    s.rect(3, 33, 10, 2, D2)
    s.outline()
    return s


def network_panel():
    """Painel de rede com cabos pendurados - 26x22 nativo."""
    s = Sprite(26, 22)
    s.rect(2, 1, 22, 3, L2)
    s.line_h(2, 1, 22, L3)
    s.rect(2, 4, 22, 8, M)
    s.line_v(2, 4, 8, L1)
    s.line_v(23, 4, 8, D2)
    s.rect(4, 6, 18, 4, D3)                 # regua de portas
    for x in range(5, 21, 3):
        s.dot(x, 7, D1)
        s.dot(x, 8, D1)
    s.dot(20, 5, AMBER)
    for x, cor in ((6, RED), (11, CYAN), (16, D1)):   # cabos
        s.line_v(x, 10, 8, cor)
        s.dot(x + 1, 17, cor)
    s.outline()
    return s


def cable_spool():
    """Bobina de cabo com uma ponta solta - 22x20 nativo."""
    s = Sprite(22, 20)
    # Carretel visto de cima-frente: flange clara em cima, rolo de cabo no meio,
    # flange embaixo. O contraste entre flange e rolo e o que faz ler "bobina".
    s.ellipse(10, 4, 9, 3, L2)
    s.ellipse(10, 4, 3, 1, D3)              # furo do eixo
    s.rect(2, 5, 17, 9, D2)                 # rolo
    for y in range(5, 14, 2):               # voltas do cabo, bem marcadas
        s.line_h(2, y, 17, D3)
        s.line_h(2, y + 1, 17, D1)
    s.line_v(2, 5, 9, D1)                   # quina iluminada
    s.line_v(18, 5, 9, D3)
    s.ellipse(10, 15, 9, 3, L1)             # flange de baixo
    s.line_h(13, 18, 6, D3)                 # ponta solta saindo
    s.dot(19, 17, D3)
    s.outline()
    return s


def crt_monitor_off():
    """Monitor CRT desligado - 20x20 nativo."""
    s = Sprite(20, 20)
    s.rect(2, 1, 16, 3, L2)
    s.line_h(2, 1, 16, L3)
    s.rect(2, 4, 16, 12, M)
    s.line_v(2, 4, 12, L1)
    s.line_v(17, 4, 12, D2)
    s.rect(4, 6, 12, 7, D3)                 # tela
    s.line_h(4, 6, 12, D2)
    s.dot(15, 14, RED)
    s.rect(5, 16, 10, 2, D2)                # pe
    s.outline()
    return s


def ups_battery():
    """No-break - 18x24 nativo."""
    s = Sprite(18, 24)
    s.rect(2, 1, 14, 4, L2)
    s.line_h(2, 1, 14, L3)
    s.rect(6, 2, 6, 2, D1)                  # alca embutida
    s.rect(2, 5, 14, 16, M)
    s.line_v(2, 5, 16, L1)
    s.line_v(15, 5, 16, D2)
    s.rect(4, 8, 10, 5, D3)                 # visor
    s.dot(5, 10, AMBER)
    s.dot(12, 10, RED)
    s.vents(4, 15, 10, 3, D2, step=2)
    s.outline()
    return s


def toolbox():
    """Caixa de ferramentas - 20x15 nativo."""
    s = Sprite(20, 15)
    s.rect(7, 1, 6, 2, D1)                  # alca
    s.dot(7, 2, D3)
    s.dot(12, 2, D3)
    s.rect(2, 3, 16, 3, L2)                 # tampa
    s.line_h(2, 3, 16, L3)
    s.rect(2, 6, 16, 7, M)
    s.line_v(2, 6, 7, L1)
    s.line_v(17, 6, 7, D2)
    s.line_h(2, 6, 16, D2)
    s.rect(5, 5, 2, 3, L2)                  # trincos
    s.rect(13, 5, 2, 3, L2)
    s.outline()
    return s


def industrial_fan():
    """Ventilador de chao com gaiola - 26x30 nativo."""
    import math
    s = Sprite(26, 30)
    s.ellipse(13, 12, 11, 11, D3)           # fundo da gaiola
    s.ring(13, 12, 11, 11, L1)              # aro externo
    for ang in range(0, 360, 30):           # grades radiais
        for r in range(4, 11):
            i = round(r * math.cos(math.radians(ang)))
            j = round(r * math.sin(math.radians(ang)))
            s.dot(13 + i, 12 + j, D1)
    s.ring(13, 12, 7, 7, D2)                # aro interno
    s.ellipse(13, 12, 3, 3, L2)             # cubo do motor
    s.dot(13, 12, D3)
    s.rect(12, 22, 3, 4, D1)                # coluna
    s.rect(5, 25, 17, 2, D2)                # base
    s.line_h(5, 25, 17, L1)
    s.dot(4, 27, D2)
    s.dot(22, 27, D2)
    s.outline()
    return s


SPRITES = {
    "server_rack_closed": server_rack_closed,
    "server_rack_open": server_rack_open,
    "server_rack_toppled": server_rack_toppled,
    "server_tower_small": server_tower_small,
    "network_panel": network_panel,
    "cable_spool": cable_spool,
    "crt_monitor_off": crt_monitor_off,
    "ups_battery": ups_battery,
    "toolbox": toolbox,
    "industrial_fan": industrial_fan,
}

DEST = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                    "..", "client", "assets", "images", "arquivos", "props")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out-dir", default=DEST)
    args = ap.parse_args()
    os.makedirs(args.out_dir, exist_ok=True)

    for nome, fn in SPRITES.items():
        s = fn()
        caminho = os.path.join(args.out_dir, nome + ".png")
        s.save(caminho)
        print(f"{nome:22s} {s.w:3d}x{s.h:<3d} nativo -> {s.w*SCALE}x{s.h*SCALE}  {caminho}")


if __name__ == "__main__":
    main()

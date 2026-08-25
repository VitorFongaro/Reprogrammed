# Fatia o "RC Car Sprite Sheet.png" (192x256, grade 32x32, 6 col x 8 linhas) em
# um PNG por animação, com nome limpo (sem espacos) pro Vite importar. Cada linha
# tem um numero diferente de quadros preenchidos (o resto da linha e vazio).
# Tambem copia o projetil pra um nome minusculo. Roda da raiz do repo:
#   python tools/car_slice.py
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAR = os.path.join(ROOT, "client", "assets", "sprites", "enemies", "car")
SHEET = os.path.join(CAR, "RC Car Sprite Sheet.png")
CELL = 32

# (nome, linha, quantos quadros preenchidos)
ROWS = [
    ("idle", 0, 2),
    ("move", 1, 4),
    ("jump", 2, 6),
    ("activate", 3, 6),
    ("deactivate", 4, 6),
    ("shoot", 5, 5),
    ("damage", 6, 4),
    ("broken", 7, 4),
]


def main():
    sheet = Image.open(SHEET).convert("RGBA")
    for name, row, frames in ROWS:
        strip = sheet.crop((0, row * CELL, frames * CELL, row * CELL + CELL))
        out = os.path.join(CAR, f"{name}.png")
        strip.save(out)
        print("gerado:", os.path.relpath(out, ROOT), f"({frames} quadros)")

    # Normaliza o projetil pra minusculo. No Windows (case-insensitive) nao da pra
    # copiar Projectile.png -> projectile.png (e o mesmo arquivo), entao renomeia
    # via um nome temporario pra forcar a troca de caixa no disco.
    cap = os.path.join(CAR, "Projectile.png")
    lower = os.path.join(CAR, "projectile.png")
    tmp = os.path.join(CAR, "_proj_tmp.png")
    if os.path.exists(cap):
        os.replace(cap, tmp)
        os.replace(tmp, lower)
        print("renomeado: Projectile.png -> projectile.png")
    elif os.path.exists(lower):
        print("projectile.png ja existe")
    print("ok")


if __name__ == "__main__":
    main()

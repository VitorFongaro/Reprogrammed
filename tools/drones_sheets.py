"""Folhas dos DRONES do capítulo 3 (pack "Free Drones Pack" da CraftPix).

Copia do pack só as folhas que o jogo usa e gera a do drone semeador
desligado, que o pack não tem (o drone 6 não vem com animação de morte).

Uso:
    python tools/drones_sheets.py "<pasta do pack>"

Saída em client/assets/sprites/enemies/:
    varredor/  (drone 1)  idle, scan, walk_scan, death   - quadros 48x48
    semeador/  (drone 6)  walk, drop, capsule, disabled  - quadros 48x48
"""
import os
import shutil
import sys

from PIL import Image, ImageEnhance

FRAME = 48
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "client", "assets", "sprites", "enemies")

COPIES = {
    "varredor": {
        "idle.png": "1 Drones/1/Idle.png",
        "scan.png": "1 Drones/1/Scan.png",
        "walk_scan.png": "1 Drones/1/Walk_scan.png",
        "death.png": "1 Drones/1/Death.png",
    },
    "semeador": {
        "walk.png": "1 Drones/6/Walk.png",
        "drop.png": "1 Drones/6/Drop.png",
        "capsule.png": "1 Drones/6/Capsule.png",
    },
}


def semeador_disabled(pack):
    """Drone 6 apagado: o 1º quadro do Walk2 escurecido, inclinado e mais
    baixo (pousado), num quadro de 48x48."""
    sheet = Image.open(os.path.join(pack, "1 Drones/6/Walk2.png")).convert("RGBA")
    frame = sheet.crop((0, 0, FRAME, FRAME))
    frame = ImageEnhance.Brightness(frame).enhance(0.45)
    frame = frame.rotate(-14, resample=Image.NEAREST, expand=False)
    out = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    out.alpha_composite(frame, (0, 8))
    return out


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    pack = sys.argv[1]
    for folder, files in COPIES.items():
        dest = os.path.join(OUT, folder)
        os.makedirs(dest, exist_ok=True)
        for name, rel in files.items():
            shutil.copyfile(os.path.join(pack, rel), os.path.join(dest, name))
            print("ok", folder, name)
    semeador_disabled(pack).save(os.path.join(OUT, "semeador", "disabled.png"))
    print("ok semeador disabled.png")


if __name__ == "__main__":
    main()

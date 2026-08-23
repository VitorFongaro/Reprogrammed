# Recolore o sprite do biped (MECH VERMELHO — pack biped_robot, CC BY-SA 4.0,
# Silver Ink) por ROTAÇÃO DE MATIZ (HSV), gerando variantes NÃO-VERMELHAS para os
# dois sentinelas da arena pré-boss (SentinelaScene / BattleScene em modo dupla).
#
# Só recolore pixels com saturação relevante: o metal/sombra (baixa saturação)
# fica intacto, então só a "cor" do mech muda. É transformação determinística
# (não é IA generativa — a licença exige preservar atribuição + share-alike; ver
# docs/ASSETS.md).
#
# Uso (a partir da raiz do repo):  python tools/biped_recolor.py
import colorsys
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "client", "assets", "sprites", "enemies", "biped")
DST = os.path.join(ROOT, "client", "assets", "sprites", "enemies")

# nome da variante -> deslocamento de matiz em graus (ver tools: prévia +200/+300).
VARIANTS = {"biped_teal": 200, "biped_violet": 300}
SHEETS = ["walk.png", "disabled.png"]
SAT_MIN = 0.12  # abaixo disso é cinza/metal: não recolore.


def hue_rotate(img, deg):
    off = (deg % 360) / 360.0
    out = Image.new("RGBA", img.size)
    src = img.load()
    dst = out.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = src[x, y]
            if a <= 20:
                dst[x, y] = (0, 0, 0, 0)
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s > SAT_MIN:
                h = (h + off) % 1.0
            nr, ng, nb = colorsys.hsv_to_rgb(h, s, v)
            dst[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
    return out


def main():
    for name, deg in VARIANTS.items():
        outdir = os.path.join(DST, name)
        os.makedirs(outdir, exist_ok=True)
        for sheet in SHEETS:
            img = Image.open(os.path.join(SRC, sheet)).convert("RGBA")
            out = hue_rotate(img, deg)
            outpath = os.path.join(outdir, sheet)
            out.save(outpath)
            print("gerado:", os.path.relpath(outpath, ROOT))
    print("ok")


if __name__ == "__main__":
    main()

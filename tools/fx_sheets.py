# Empilha efeitos dos packs da unTied Games (Will Tice; ver docs/ASSETS.md) em
# tiras horizontais, o formato que o ui/Effects.js carrega. Os packs entregam
# um PNG por quadro (frame0000.png, ...) e cada efeito vem em "large"/"small";
# usamos sempre o large (cada tamanho é desenhado à mão, escalar borra).
#
# Os efeitos antigos do ENIAC (fx_lightning, fx_warp, fx_explosion, fx_charge,
# fx_spark, fx_heal) foram recortados antes deste script existir e não estão
# aqui: esta lista é a da WITCH, boss do cap. 2, e o que vier depois.
#
# Uso (a partir da raiz do repo):  python tools/fx_sheets.py
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESKTOP = os.path.dirname(ROOT)
GIGA = os.path.join(DESKTOP, "Super Pixel Effects Gigapack (Free Version) v2.9.0",
                    "Super Pixel Effects Gigapack (Free Version)", "PNG")
FX3 = os.path.join(DESKTOP, "Super Pixel Fantasy FX Pack 3 Free Version",
                   "Super Pixel Fantasy FX Pack 3 Free Version", "PNG")
DST = os.path.join(ROOT, "client", "assets", "sprites", "effects")

# arquivo de saída -> pasta de quadros no pack.
SHEETS = {
    # Relógio da batalha por turnos (só lá: rebobina/acelera as lâminas).
    "fx_haste.png": os.path.join(FX3, "fanfx3_haste_large_green"),
    # Sentença: o 死 pincelado (aviso) vira uma caveira em chamas (dano).
    "fx_death.png": os.path.join(FX3, "fanfx3_death_large_red"),
    # Fúria na metade do fôlego.
    "fx_rage.png": os.path.join(FX3, "fanfx3_attack_up_large_red"),
    # Passo no tempo: some em fumaça, portal no destino, feixe na chegada.
    "fx_skull.png": os.path.join(GIGA, "Smoke Bursts", "stylized_skull_smoke_burst_001",
                                 "stylized_skull_smoke_burst_001_large_white"),
    "fx_portal.png": os.path.join(GIGA, "Sci-fi", "scifi_warp_002", "scifi_warp_002_large_red"),
    "fx_arrive.png": os.path.join(GIGA, "Sci-fi", "scifi_warp_003", "scifi_warp_003_large_blue"),
    # Golpes: impacto da foice, anel da badalada, estouro do eco.
    "fx_impact.png": os.path.join(GIGA, "Impacts", "directional_impact_003",
                                  "directional_impact_003_large_violet"),
    "fx_ring.png": os.path.join(GIGA, "Impacts", "symmetrical_impact_002",
                                "symmetrical_impact_002_large_blue"),
    "fx_burst.png": os.path.join(GIGA, "Explosions", "stylized_explosion_002",
                                 "stylized_explosion_002_large_violet"),
    # Avisos e estado: "!" antes do golpe grande, estrelinhas quando cansa.
    "fx_alert.png": os.path.join(GIGA, "Symbols", "symbol_alert_001", "symbol_alert_001_large_red"),
    "fx_dizzy.png": os.path.join(GIGA, "Fantasy Spells", "status_sparkling_001",
                                 "status_sparkling_001_large_yellow"),
}


def main():
    for dst_name, folder in SHEETS.items():
        names = sorted(n for n in os.listdir(folder) if n.startswith("frame") and n.endswith(".png"))
        frames = [Image.open(os.path.join(folder, n)).convert("RGBA") for n in names]
        w, h = frames[0].size
        sheet = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
        for i, frame in enumerate(frames):
            sheet.paste(frame, (i * w, 0))
        sheet.save(os.path.join(DST, dst_name))
        print(f"{dst_name:16} {len(frames):3} quadros de {w}x{h}")


if __name__ == "__main__":
    main()

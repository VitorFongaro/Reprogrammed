"""Gera as imagens dos cards do SITE (abas SOBRE, PERSONAGENS e GAMEPLAY).

Antes os cards eram padrões de CSS (listras, grade, bolinhas) sem relação com
o jogo. Agora cada um mostra o jogo de verdade, MONTADO a partir da arte que já
está no repositório: fundos das salas, sprites, blocos do console, a fonte VCR.
Nada aqui é desenhado à mão nem gerado por IA — é composição. Os retratos do
Cosmo e da ADA saem do Aseprite (tools/site_retratos.lua); o da Artemis é um
recorte da referência que já existia (ver docs/ASSETS.md).

Formato: 240x520 (a proporção do card no desktop). O site mostra tudo em tons de
cinza e acende as cores no card ativo — ver `.media-preview img` no index.css.

Uso:
    python tools/site_cards.py
"""
import json
import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "client", "assets")
OUT = os.path.join(ASSETS, "images", "site")
W, H = 240, 520

CYAN = (74, 214, 255)
DIM = (106, 113, 134)
WHITE = (247, 247, 247)
BG = (8, 9, 12)


def asset(*parts):
    return os.path.join(ASSETS, *parts)


def font(size):
    return ImageFont.truetype(asset("fonts", "VCR_OSD_MONO_1.001.ttf"), size)


def frame(path, index, size, fw=None, fh=None):
    """Quadro `index` de uma folha horizontal, ampliado por vizinho."""
    sheet = Image.open(path).convert("RGBA")
    fw = fw or sheet.height
    fh = fh or sheet.height
    q = sheet.crop((index * fw, 0, index * fw + fw, fh))
    return q.resize((fw * size, fh * size), Image.NEAREST)


def blank(color=BG):
    return Image.new("RGBA", (W, H), color + (255,))


def text(im, xy, s, size, color=WHITE, anchor="la"):
    """Texto SEM suavização: a VCR é fonte de pixel, e suavizada em tamanho
    pequeno ela vira borrão. Aliasada, cada letra fica nítida."""
    d = ImageDraw.Draw(im)
    d.fontmode = "1"
    d.text(xy, s, font=font(size), fill=color, anchor=anchor)


def room_composite(bg_path, map_path, extra=()):
    """Fundo da sala + objetos do Tiled (com y-sort), como o jogo monta."""
    bg = Image.open(bg_path).convert("RGBA")
    mapa = json.load(open(map_path, encoding="utf-8"))
    gids = {}
    for ts in mapa["tilesets"]:
        for t in ts["tiles"]:
            gids[ts["firstgid"] + t["id"]] = os.path.normpath(os.path.join(os.path.dirname(map_path), t["image"]))
    objs = next(l for l in mapa["layers"] if l["name"] == "objetos")["objects"]
    items = [(o["y"], gids[o["gid"]], o["x"]) for o in objs] + list(extra)
    for y, path, x in sorted(items, key=lambda t: t[0]):
        img = path if isinstance(path, Image.Image) else Image.open(path).convert("RGBA")
        bg.alpha_composite(img, (int(x), int(y - img.height)))
    return bg


def dialogue(im, speaker, line, y=H - 92):
    d = ImageDraw.Draw(im)
    d.rectangle([8, y, W - 9, y + 82], fill=(5, 5, 5, 235), outline=CYAN + (255,), width=2)
    text(im, (18, y + 8), speaker, 17, CYAN)
    words, rows, cur = line.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 > 20:
            rows.append(cur)
            cur = w
        else:
            cur = (cur + " " + w).strip()
    rows.append(cur)
    for k, r in enumerate(rows[:3]):
        text(im, (18, y + 27 + k * 17), r, 17)


def block(label, category, width=152):
    """Um bloco do console: chassi do blocks.png + rótulo em VCR, como no jogo."""
    frames = {"nome": 0, "op": 1, "valor": 2}
    b = Image.open(asset("sprites", "blocks", "blocks.png")).convert("RGBA")
    b = b.crop((frames[category] * 152, 0, frames[category] * 152 + 152, 48))
    if width != 152:
        # altura mínima: bloco curto (operador) não pode virar um risco
        b = b.resize((width, max(26, round(48 * width / 152))), Image.NEAREST)
    text(b, (b.width // 2, b.height // 2 - 1), label, max(15, round(20 * width / 152)), (12, 14, 20), "mm")
    return b


def save(name, im, pixel=True):
    """Salva em 2x por vizinho-mais-próximo. O card no site mostra a imagem
    MENOR que 240px; reduzir a partir de 480 com filtro suave mantém o texto
    legível, enquanto reduzir 240 com `pixelated` descartava colunas inteiras
    de pixel (VARIÁVEIS virava UARIAUEIS)."""
    os.makedirs(OUT, exist_ok=True)
    im = im.convert("RGB")
    if pixel:                                   # arte de pixel: 2x por vizinho
        im = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
    im.save(os.path.join(OUT, name + ".png"))
    print("salvo:", name)


# --- SOBRE ---------------------------------------------------------------------

def card_jogo():
    """Logo e a frase, centralizados na altura do card."""
    fonte = Image.open(asset("images", "logo.png")).convert("RGBA")
    im = blank(fonte.getpixel((4, 4))[:3])          # mesmo preto do logo, sem caixa visível
    logo = fonte.crop((330, 230, 925, 650))
    logo = logo.resize((W, round(logo.height * W / logo.width)), Image.LANCZOS)
    mark = Image.open(asset("images", "reprogrammed-wordmark.png")).convert("RGBA")
    mark = mark.resize((212, round(mark.height * 212 / mark.width)), Image.LANCZOS)
    altura = logo.height + 22 + mark.height + 34 + 3 * 22
    y = (H - altura) // 2
    im.alpha_composite(logo, (0, y))
    y += logo.height + 22
    im.alpha_composite(mark, ((W - mark.width) // 2, y))
    y += mark.height + 34
    for k, linha in enumerate(["LÓGICA DE", "PROGRAMAÇÃO", "JOGANDO"]):
        text(im, (W // 2, y + k * 24), linha, 19, (170, 176, 192), "mm")
    return im


def card_historia():
    """Imagem gerada pelo GPT (ver docs/ASSETS.md), só recortada no formato do
    card, centrada na torre. A fonte fica em site/fonte/, fora do glob do site."""
    ref = Image.open(asset("images", "site", "fonte", "historia_gpt.png")).convert("RGBA")
    largura = round(ref.height * W / H)
    x0 = min(max(533 - largura // 2, 0), ref.width - largura)      # 533 = centro da torre
    # já no tamanho final (2x): é imagem de alta resolução, não pixel nativo
    return ref.crop((x0, 0, x0 + largura, ref.height)).resize((W * 2, H * 2), Image.LANCZOS)


def card_elysium():
    im = blank()
    andares = [
        ("ANDAR 2", "FUNÇÕES", None),
        ("ANDAR 1", "REPETIÇÃO", None),
        ("TÉRREO", "CONDICIONAIS", room_composite(asset("images", "recepcao", "recepcao_bg.png"),
                                                  asset("maps", "recepcao.json")).crop((240, 0, 720, 240))),
        ("SUBSOLO", "VARIÁVEIS", room_composite(asset("images", "porao", "porao_bg.png"),
                                               asset("maps", "porao.json")).crop((600, 0, 1080, 240))),
    ]
    band = H // 4
    d = ImageDraw.Draw(im)
    for k, (andar, tema, foto) in enumerate(andares):
        y = k * band
        if foto is not None:
            im.alpha_composite(foto.resize((W, band - 8), Image.LANCZOS), (0, y + 4))
        else:
            for yy in range(y + 4, y + band - 4, 4):         # andar trancado: estática
                d.line([(0, yy), (W, yy)], fill=(22, 24, 30))
            text(im, (W // 2, y + band // 2 - 18), "? ? ?", 24, (70, 74, 88), "mm")
        d.rectangle([0, y, W, y + 3], fill=(58, 62, 74))    # laje
        # etiquetas no PISO (embaixo), para não cobrir a parede da sala
        d.rectangle([0, y + band - 50, W, y + band - 4], fill=(5, 5, 5))
        text(im, (10, y + band - 46), andar, 19, CYAN if foto is not None else DIM)
        text(im, (10, y + band - 25), tema, 19, WHITE if foto is not None else (150, 156, 172))
    return im


def card_aprendizado():
    im = blank()
    text(im, (W // 2, 46), "PERFIL DE", 22, (170, 176, 192), "mm")
    text(im, (W // 2, 72), "APRENDIZADO", 22, WHITE, "mm")
    d = ImageDraw.Draw(im)
    barras = [("VAR", 0.86), ("SE", 0.58), ("LOOP", 0.0), ("FUNC", 0.0)]
    base, topo = 380, 130
    for k, (rot, v) in enumerate(barras):
        x = 30 + k * 50
        d.rectangle([x, topo, x + 30, base], outline=(40, 44, 56), width=2)
        if v:
            y = base - int((base - topo) * v)
            for yy in range(y, base - 5, 6):                   # barra em blocos
                d.rectangle([x + 4, yy, x + 26, yy + 3], fill=CYAN if v > 0.7 else (255, 179, 71))
            text(im, (x + 15, y - 14), f"{int(v * 100)}%", 16, WHITE, "mm")
        text(im, (x + 15, base + 18), rot, 16, (170, 176, 192), "mm")
    for k, linha in enumerate(["O JOGO MEDE CADA", "TENTATIVA E AJUSTA", "OS DESAFIOS"]):
        text(im, (W // 2, 428 + k * 24), linha, 17, (170, 176, 192), "mm")
    return im


# --- PERSONAGENS -----------------------------------------------------------------

def card_artemis():
    ref = Image.open(asset("sprites", "ChatGPT Image 22 de mai. de 2026, 19_59_11.png")).convert("RGBA")
    # Rosto e tronco, na proporção do card.
    crop = ref.crop((252, 40, 772, 40 + round(520 * H / W)))
    return crop.resize((W, H), Image.LANCZOS)


# --- GAMEPLAY ----------------------------------------------------------------------

def card_reprogramar():
    im = Image.open(asset("images", "treinamento", "treinamento_bg.png")).convert("RGBA").crop((760, 120, 1000, 640))
    tint = Image.new("RGBA", im.size, (10, 30, 50, 110))                # o [R] tinge a sala
    im.alpha_composite(tint)
    robo = frame(asset("sprites", "enemies", "pistol", "walk.png"), 0, 4)
    rx, ry = (W - robo.width) // 2, 150
    im.alpha_composite(robo, (rx, ry))
    d = ImageDraw.Draw(im)
    x0, y0, x1, y1 = rx + 6, ry + 6, rx + robo.width - 6, ry + robo.height - 2
    for (ax, ay, dx, dy) in ((x0, y0, 1, 1), (x1, y0, -1, 1), (x0, y1, 1, -1), (x1, y1, -1, -1)):
        d.line([(ax, ay), (ax + 16 * dx, ay)], fill=CYAN, width=3)
        d.line([(ax, ay), (ax, ay + 16 * dy)], fill=CYAN, width=3)
    text(im, (W // 2, y1 + 24), "[R] REPROGRAMAR", 19, CYAN, "mm")
    art = frame(asset("sprites", "artemis", "walk-north.png"), 1, 4)
    for k, a in enumerate((50, 90, 255)):                                # rastro da câmera lenta
        ghost = art.copy()
        ghost.putalpha(ghost.getchannel("A").point(lambda p, a=a: p * a // 255))
        im.alpha_composite(ghost, (40 + k * 22, 360 - k * 10))
    return im


def card_puzzles():
    im = blank()
    text(im, (W // 2, 40), "VARIÁVEL", 20, (170, 176, 192), "mm")
    for k, (lab, cat) in enumerate([("temperatura", "nome"), ("=", "op"), ("21.5", "valor")]):
        b = block(lab, cat, 150)
        im.alpha_composite(b, ((W - b.width) // 2, 60 + k * 52))
    text(im, (W // 2, 262), "CONDIÇÃO", 20, (170, 176, 192), "mm")
    linhas = [("se", "cracha", ">=", "3", ":"), ("", "catraca", "=", "true", "")]
    for k, (a, n, op, v, fim) in enumerate(linhas):
        y = 284 + k * 40
        x = 14 if a else 34
        if a:
            text(im, (x, y + 10), a, 16, WHITE)
            x += 26
        for lab, cat, w in ((n, "nome", 80), (op, "op", 36), (v, "valor", 50)):
            b = block(lab, cat, w)
            im.alpha_composite(b, (x, y))
            x += w + 4
        if fim:
            text(im, (x, y + 10), fim, 16, WHITE)
    d = ImageDraw.Draw(im)
    for k, (caso, ok) in enumerate([("cracha 2", False), ("cracha 3", True), ("cracha 5", True)]):
        y = 386 + k * 26
        d.rectangle([14, y, W - 14, y + 22], outline=(40, 44, 56), width=1)
        text(im, (22, y + 3), caso, 17, WHITE)
        text(im, (W - 22, y + 3), "TRAVA" if not ok else "PASSA", 17, (255, 110, 110) if not ok else (81, 227, 107), "ra")
    return im


def card_combate():
    im = blank()
    boss = frame(asset("sprites", "boss", "boss.png"), 0, 3, 60, 60)
    im.alpha_composite(boss, ((W - boss.width) // 2, 20))
    text(im, (W // 2, 214), "ENIAC", 22, WHITE, "mm")
    d = ImageDraw.Draw(im)
    bx0, by0, bx1, by1 = 30, 236, W - 30, 380
    d.rectangle([bx0, by0, bx1, by1], outline=WHITE, width=3)
    bala = Image.open(asset("sprites", "projetil", "projetil.png")).convert("RGBA")
    bala = bala.crop((0, 0, bala.height, bala.height)).resize((bala.height * 2, bala.height * 2), Image.NEAREST)
    for (x, y) in ((60, 256), (98, 270), (140, 250), (176, 280), (70, 312), (150, 330), (120, 296)):
        im.alpha_composite(bala, (x, y))
    sx, sy = W // 2 - 4, 346                                                # a alma
    d.polygon([(sx, sy), (sx + 5, sy - 5), (sx + 10, sy), (sx + 5, sy + 7)], fill=CYAN)
    for k, op in enumerate(["ATACAR", "REPROGRAMAR", "ANALISAR"]):
        y = 400 + k * 30
        d.rectangle([40, y, W - 40, y + 24], outline=CYAN if k == 1 else (70, 74, 86), width=2)
        text(im, (W // 2, y + 12), op, 18, CYAN if k == 1 else WHITE, "mm")
    return im


def card_exploracao():
    """Centro da recepção: o letreiro da Elysium, o balcão, e a Artemis de
    costas chegando nele, com o Cosmo comentando o balcão vazio."""
    art = frame(asset("sprites", "artemis", "walk-north.png"), 0, 3)
    cosmo = frame(asset("sprites", "cosmo", "cosmo.png"), 1, 1)       # costas
    room = room_composite(asset("images", "recepcao", "recepcao_bg.png"), asset("maps", "recepcao.json"),
                          extra=[(356, art, 432), (316, cosmo, 500)])
    im = room.crop((360, 0, 360 + W, H))
    dialogue(im, "COSMO", "Balcão vazio. Aqui quem te atende é a ADA.")
    return im


if __name__ == "__main__":
    save("sobre_jogo", card_jogo())
    save("sobre_historia", card_historia(), pixel=False)
    save("sobre_elysium", card_elysium())
    save("sobre_aprendizado", card_aprendizado())
    save("retrato_artemis", card_artemis())
    save("gameplay_reprogramar", card_reprogramar())
    save("gameplay_puzzles", card_puzzles())
    save("gameplay_combate", card_combate())
    save("gameplay_exploracao", card_exploracao())

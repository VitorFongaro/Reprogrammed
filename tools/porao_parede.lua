-- Apaga o GERADOR que estava desenhado na parede do fundo do porão (ele virou
-- um objeto do Tiled) e reconstrói a parede naquele trecho.
--
-- A parede é regenerada pela mesma fórmula do fundo original (base + ruído,
-- linha de painel a cada 96px, rodapé e sombra no piso), então a emenda fica
-- invisível — copiar de outro trecho não daria certo porque a faixa toda tem
-- luminárias, canos e o emblema em posições fixas.
--
-- Uso (caminhos locais de cada dev):
--   <aseprite> -b \
--     -script-param base=client/assets/images/porao/porao_bg.png \
--     -script-param tiles="<pack>/tileset x2.png" \
--     -script-param out=client/assets/images/porao/porao_bg.png \
--     -script tools/porao_parede.lua

local pc = app.pixelColor

math.randomseed(11)

-- Onde o gerador estava pintado, incluindo o cabo que subia até o teto e as
-- faixas de sinalização logo abaixo dele.
local ERASE = { x = 994, y = 0, w = 104, h = 140 }

local WALL_H = 128          -- altura da parede do fundo.
local BASEBOARD_H = 8
local PANEL_STEP = 96       -- espaçamento das linhas de painel.
local FLOOR_TILE = { 2112, 64 }
local FLOOR_TINT = 0.6      -- mesmo tom aplicado no piso (ver porao_piso.lua).

local function clamp(v, lo, hi)
    if v < lo then return lo elseif v > hi then return hi else return v end
end

local function flatten(spr)
    local img = Image(spr.width, spr.height, ColorMode.RGB)
    img:clear(pc.rgba(0, 0, 0, 0))
    for _, cel in ipairs(spr.cels) do
        img:drawImage(cel.image, cel.position)
    end
    return img
end

local base = flatten(app.open(app.params["base"]))
local tiles = flatten(app.open(app.params["tiles"]))

-- 1) Parede: base com ruído + linha de painel.
for y = 0, WALL_H - BASEBOARD_H - 1 do
    for x = ERASE.x, ERASE.x + ERASE.w - 1 do
        local n = math.random(-2, 2)
        base:drawPixel(x, y, pc.rgba(31 + n, 33 + n, 41 + n, 255))
    end
end
for x = ERASE.x, ERASE.x + ERASE.w - 1 do
    if x % PANEL_STEP == 0 then
        for y = 4, WALL_H - BASEBOARD_H - 1 do
            base:drawPixel(x, y, pc.rgba(22, 24, 30, 255))
        end
    end
end

-- 2) Rodapé da parede.
for y = WALL_H - BASEBOARD_H, WALL_H - 1 do
    for x = ERASE.x, ERASE.x + ERASE.w - 1 do
        base:drawPixel(x, y, pc.rgba(15, 16, 20, 255))
    end
end
for x = ERASE.x, ERASE.x + ERASE.w - 1 do
    base:drawPixel(x, WALL_H - 1, pc.rgba(9, 10, 13, 255))
end

-- 3) Piso no trecho abaixo (onde havia as faixas de sinalização).
for y = WALL_H, ERASE.y + ERASE.h - 1 do
    for x = ERASE.x, ERASE.x + ERASE.w - 1 do
        local c = tiles:getPixel(FLOOR_TILE[1] + (x % 32), FLOOR_TILE[2] + (y % 32))
        base:drawPixel(x, y, pc.rgba(
            clamp(pc.rgbaR(c) * FLOOR_TINT, 0, 255),
            clamp(pc.rgbaG(c) * FLOOR_TINT, 0, 255),
            clamp(pc.rgbaB(c) * FLOOR_TINT, 0, 255),
            255
        ))
    end
end

-- 4) Sombra projetada pela parede sobre o piso.
for y = WALL_H, WALL_H + 16 do
    local f = 0.68 + 0.32 * ((y - WALL_H) / 16)
    for x = ERASE.x, ERASE.x + ERASE.w - 1 do
        local c = base:getPixel(x, y)
        base:drawPixel(x, y, pc.rgba(
            clamp(pc.rgbaR(c) * f, 0, 255),
            clamp(pc.rgbaG(c) * f, 0, 255),
            clamp(pc.rgbaB(c) * f, 0, 255),
            255
        ))
    end
end

-- 5) Vinheta, para o trecho repintado não ficar mais claro que a vizinhança.
local vcx, vcy = base.width / 2, base.height * 0.42
local maxd = math.sqrt(vcx * vcx + vcy * vcy)
for y = ERASE.y, ERASE.y + ERASE.h - 1 do
    for x = ERASE.x, ERASE.x + ERASE.w - 1 do
        local dx, dy = x - vcx, y - vcy
        local d = math.sqrt(dx * dx + dy * dy) / maxd
        local f = 1 - 0.35 * clamp((d - 0.55) / 0.45, 0, 1)
        local c = base:getPixel(x, y)
        base:drawPixel(x, y, pc.rgba(
            clamp(pc.rgbaR(c) * f, 0, 255),
            clamp(pc.rgbaG(c) * f, 0, 255),
            clamp(pc.rgbaB(c) * f, 0, 255),
            255
        ))
    end
end

local out = Sprite(base.width, base.height, ColorMode.RGB)
out.cels[1].image = base
out:saveAs(app.params["out"])
print("gerador apagado da parede: " .. app.params["out"])

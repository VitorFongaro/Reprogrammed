-- Repinta a ÁREA DE PISO do porão com os tiles de um tileset, preservando tudo
-- o que já está no fundo atual (parede do fundo, porta, gerador, canos, luzes).
--
-- Por que compor em cima em vez de regerar o fundo inteiro: a parede e as
-- estruturas fixas do porão foram desenhadas proceduralmente por um script que
-- não foi versionado e se perdeu. Este aqui é cirúrgico — só o retângulo do
-- chão muda.
--
-- Uso (o caminho do Aseprite e do pack são locais de cada dev):
--   <aseprite> -b \
--     -script-param base=client/assets/images/porao/porao_bg.png \
--     -script-param tiles="<pack>/tileset x2.png" \
--     -script-param out=client/assets/images/porao/porao_bg.png \
--     -script-param darken=0.85 \
--     -script tools/porao_piso.lua
--
-- `tiles` = folha de 32x32 do pack de parede/piso (a "x2"); as células usadas
-- estão em TILE_CELLS. `darken` < 1 escurece o piso para casar com a paleta
-- quase preta do jogo (1.0 = cor original do pack).

local pc = app.pixelColor

-- Retângulo do piso no fundo de 1280x704: começa depois da parede do fundo
-- (128px) e das faixas laterais/inferior (32px). Alinhado à grade de 32 dos
-- mapas do Tiled: 38 x 17 tiles.
local FLOOR = { x = 32, y = 128, w = 1216, h = 544 }
local TILE = 32

-- Células de piso liso do tileset (4 variações praticamente iguais; a variação
-- evita repetição óbvia sem sujar o padrão).
local TILE_CELLS = {
    { 2112, 64 }, { 2144, 64 }, { 2112, 96 }, { 2144, 96 }
}

-- Luminárias do teto: poças de luz elípticas no chão (mesmas posições do fundo
-- original, para a luz continuar batendo embaixo de cada lâmpada).
local LIGHT_POOLS = {
    { x = 320, y = 210, rx = 130, ry = 52, gain = 0.8 },
    { x = 880, y = 210, rx = 130, ry = 52, gain = 0.8 },
    { x = 656, y = 170, rx = 100, ry = 44, gain = 0.8 }
}

local WALL_SHADOW_H = 16   -- sombra projetada pela parede do fundo.

math.randomseed(7)

local function clamp(v, lo, hi)
    if v < lo then return lo elseif v > hi then return hi else return v end
end

-- Achata todos os cels de um sprite numa imagem do tamanho do canvas.
local function flatten(spr)
    local img = Image(spr.width, spr.height, ColorMode.RGB)
    img:clear(pc.rgba(0, 0, 0, 0))
    for _, cel in ipairs(spr.cels) do
        img:drawImage(cel.image, cel.position)
    end
    return img
end

local baseSpr = app.open(app.params["base"])
local base = flatten(baseSpr)
local tilesSpr = app.open(app.params["tiles"])
local tiles = flatten(tilesSpr)
local darken = tonumber(app.params["darken"] or "1")

print("base: " .. base.width .. "x" .. base.height)
print("tiles: " .. tiles.width .. "x" .. tiles.height)

local function inFloor(x, y)
    return x >= FLOOR.x and x < FLOOR.x + FLOOR.w
        and y >= FLOOR.y and y < FLOOR.y + FLOOR.h
end

-- Multiplica o brilho de um pixel do piso (f > 1 clareia, f < 1 escurece).
local function light(x, y, f)
    if not inFloor(x, y) then return end
    local c = base:getPixel(x, y)
    base:drawPixel(x, y, pc.rgba(
        clamp(pc.rgbaR(c) * f, 0, 255),
        clamp(pc.rgbaG(c) * f, 0, 255),
        clamp(pc.rgbaB(c) * f, 0, 255),
        pc.rgbaA(c)
    ))
end

-- 1) Carimba os tiles no retângulo do piso.
local cols = FLOOR.w // TILE
local rows = FLOOR.h // TILE
for ty = 0, rows - 1 do
    for tx = 0, cols - 1 do
        local cell = TILE_CELLS[math.random(#TILE_CELLS)]
        local dx = FLOOR.x + tx * TILE
        local dy = FLOOR.y + ty * TILE
        for py = 0, TILE - 1 do
            for px = 0, TILE - 1 do
                local c = tiles:getPixel(cell[1] + px, cell[2] + py)
                base:drawPixel(dx + px, dy + py, pc.rgba(
                    clamp(pc.rgbaR(c) * darken, 0, 255),
                    clamp(pc.rgbaG(c) * darken, 0, 255),
                    clamp(pc.rgbaB(c) * darken, 0, 255),
                    255
                ))
            end
        end
    end
end

-- 2) Sombra da parede do fundo caindo no piso.
for y = FLOOR.y, FLOOR.y + WALL_SHADOW_H do
    local f = 0.68 + 0.32 * ((y - FLOOR.y) / WALL_SHADOW_H)
    for x = FLOOR.x, FLOOR.x + FLOOR.w - 1 do
        light(x, y, f)
    end
end

-- 3) Manchas de umidade/óleo (quebram a uniformidade do piso novo).
for _ = 1, 9 do
    local cx = math.random(FLOOR.x + 60, FLOOR.x + FLOOR.w - 60)
    local cy = math.random(FLOOR.y + 60, FLOOR.y + FLOOR.h - 60)
    local r = math.random(16, 44)
    local depth = 0.8 + math.random() * 0.1
    for y = -r, r do
        for x = -r, r do
            local d = math.sqrt(x * x + y * y) / r
            if d <= 1 and (d < 0.75 or math.random() > (d - 0.75) * 4) then
                light(cx + x, cy + y, depth + (1 - depth) * d)
            end
        end
    end
end

-- 4) Poças de luz das luminárias.
for _, pool in ipairs(LIGHT_POOLS) do
    for y = -pool.ry, pool.ry do
        for x = -pool.rx, pool.rx do
            local d = (x * x) / (pool.rx * pool.rx) + (y * y) / (pool.ry * pool.ry)
            if d <= 1 then
                light(pool.x + x, pool.y + y, 1 + pool.gain * (1 - d))
            end
        end
    end
end

-- 5) Vinheta (mesma curva do fundo original, só sobre o piso repintado).
local vcx, vcy = base.width / 2, base.height * 0.42
local maxd = math.sqrt(vcx * vcx + vcy * vcy)
for y = FLOOR.y, FLOOR.y + FLOOR.h - 1 do
    for x = FLOOR.x, FLOOR.x + FLOOR.w - 1 do
        local dx, dy = x - vcx, y - vcy
        local d = math.sqrt(dx * dx + dy * dy) / maxd
        light(x, y, 1 - 0.35 * clamp((d - 0.55) / 0.45, 0, 1))
    end
end

local out = Sprite(base.width, base.height, ColorMode.RGB)
out.cels[1].image = base
out:saveAs(app.params["out"])
print("salvo: " .. app.params["out"])

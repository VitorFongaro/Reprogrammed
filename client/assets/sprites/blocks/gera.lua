-- gera.lua — chassi dos blocos de programação (puzzle em blocos).
-- Gera um sheet horizontal com 3 quadros (uma categoria por quadro), no estilo
-- "pílula" do bloco de referência (VALOR): contorno preto, brilho no topo, faixa
-- escura embaixo e uma sombra diagonal. Cada bloco tem um ENCAIXE: soquete côncavo
-- à esquerda e pino convexo à direita, para que blocos vizinhos pareçam se conectar
-- numa sequência. O TEXTO de cada bloco (energia, =, 100, ...) NÃO é desenhado aqui;
-- ele é sobreposto em runtime com a fonte VCR pelo BlockProgrammingConsole, para que
-- o mesmo chassi sirva a qualquer rótulo.
--
-- Uso (o caminho do Aseprite é local de cada máquina — veja AGENTS.md):
--   <aseprite> -b -script-param out=<dir> -script gera.lua
-- Gera <dir>/blocks.png + <dir>/blocks.aseprite.

local PX = 2            -- cada "pixel lógico" vira um bloco PX×PX (visual chunky).
local CW = 76          -- largura lógica de cada célula/quadro.
local CH = 24          -- altura lógica.
local N = 3            -- número de blocos (nome, operador, valor).

-- Geometria da pílula (em coords lógicas dentro da célula).
local X0, X1 = 5, 68
local Y0, Y1 = 2, 21
local YC = 11

-- Cores por categoria: { brilho, base, sombra }.
-- 0 = nome (ciano), 1 = operador (âmbar), 2 = valor (azul, como o exemplo).
local PALETTE = {
    [0] = { hi = { 160, 238, 255 }, base = { 74, 214, 255 }, dark = { 30, 130, 165 } },
    [1] = { hi = { 252, 222, 150 }, base = { 240, 180, 70 }, dark = { 150, 95, 25 } },
    [2] = { hi = { 172, 196, 247 }, base = { 122, 162, 240 }, dark = { 60, 96, 170 } }
}
local OUTLINE = { 0, 0, 0, 255 }
local SHADOW = { 0, 0, 0, 110 }

local function inBody(x, y)
    if x < X0 or x > X1 or y < Y0 or y > Y1 then return false end
    -- corta os cantos (raio ~2) para arredondar.
    if x <= X0 + 1 and y <= Y0 + 1 then return false end
    if x >= X1 - 1 and y <= Y0 + 1 then return false end
    if x <= X0 + 1 and y >= Y1 - 1 then return false end
    if x >= X1 - 1 and y >= Y1 - 1 then return false end
    return true
end

-- Forma final: corpo + pino (direita) - soquete (esquerda).
local function inShape(x, y)
    local b = inBody(x, y)
    if x >= X1 + 1 and x <= X1 + 3 and y >= YC - 2 and y <= YC + 2 then b = true end   -- pino
    if x >= X0 and x <= X0 + 2 and y >= YC - 2 and y <= YC + 2 then b = false end       -- soquete
    return b
end

local function isOutline(x, y)
    if not inShape(x, y) then return false end
    return not (inShape(x - 1, y) and inShape(x + 1, y) and inShape(x, y - 1) and inShape(x, y + 1))
end

local sheetW = CW * N * PX
local sheetH = CH * PX
local spr = Sprite(sheetW, sheetH, ColorMode.RGB)
spr.filename = "blocks"
local img = Image(sheetW, sheetH, ColorMode.RGB)

local function putLogical(x, y, ox, rgba)
    local color = app.pixelColor.rgba(rgba[1], rgba[2], rgba[3], rgba[4] or 255)
    for dy = 0, PX - 1 do
        for dx = 0, PX - 1 do
            img:drawPixel((ox + x) * PX + dx, y * PX + dy, color)
        end
    end
end

for idx = 0, N - 1 do
    local ox = idx * CW
    local pal = PALETTE[idx]
    for y = 0, CH - 1 do
        for x = 0, CW - 1 do
            if inShape(x, y) then
                if isOutline(x, y) then
                    putLogical(x, y, ox, OUTLINE)
                elseif y <= Y0 + 2 then
                    putLogical(x, y, ox, pal.hi)
                elseif y >= Y1 - 3 then
                    putLogical(x, y, ox, pal.dark)
                else
                    putLogical(x, y, ox, pal.base)
                end
            elseif inShape(x - 1, y - 1) then
                putLogical(x, y, ox, SHADOW)   -- sombra diagonal 1px.
            end
        end
    end
end

spr.cels[1].image = img

local out = app.params["out"] or "blocks"
spr:saveAs(out .. ".aseprite")
spr:saveCopyAs(out .. ".png")

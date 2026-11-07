-- Gera os objetos da LINHA DE MONTAGEM (cap3-montagem), a primeira sala do cap. 3.
--
-- Mesmas regras dos outros props: 3/4 top-down, contorno de 1px, nativo salvo
-- em 2x (com o .aseprite ao lado). Paleta do andar da ADA: aço escuro e vermelho.
--
-- Por ora só o terminal que programa a prensa (painel_prensa); a prensa em si é
-- desenhada no código (objects/AssemblyLine.js).
--
-- Uso (caminho do Aseprite é local de cada dev):
--   <aseprite> -b -script tools/montagem_props.lua
--   <aseprite> -b -script-param out=<pasta> -script tools/montagem_props.lua

local pc = app.pixelColor
local SCALE = 2

local OUT_DIR = app.params["out"]
if not OUT_DIR or OUT_DIR == "" then
    OUT_DIR = app.fs.joinPath(app.fs.filePath(app.fs.normalizePath(debug.getinfo(1, "S").source:sub(2))),
        "..", "client", "assets", "images", "montagem", "props")
end
app.fs.makeAllDirectories(OUT_DIR)

local function C(r, g, b, a) return pc.rgba(r, g, b, a or 255) end

-- --- Paleta ------------------------------------------------------------------
local OUT = C(0, 0, 0)
local S0, S1, S2, S3, S4 = C(30, 32, 38), C(52, 55, 64), C(80, 84, 96), C(118, 124, 138), C(170, 176, 190)
local R0, R1, R2 = C(110, 16, 30), C(200, 36, 60), C(255, 90, 110)

-- --- Tela nativa ---------------------------------------------------------------
local Canvas = {}
Canvas.__index = Canvas

local function canvas(w, h)
    local img = Image(w, h, ColorMode.RGB)
    img:clear(pc.rgba(0, 0, 0, 0))
    return setmetatable({ w = w, h = h, img = img }, Canvas)
end

function Canvas:dot(x, y, col)
    if x >= 0 and y >= 0 and x < self.w and y < self.h then self.img:drawPixel(x, y, col) end
end

function Canvas:rect(x, y, w, h, col)
    for j = y, y + h - 1 do for i = x, x + w - 1 do self:dot(i, j, col) end end
end

function Canvas:hline(x, y, w, col) self:rect(x, y, w, 1, col) end
function Canvas:vline(x, y, h, col) self:rect(x, y, 1, h, col) end

function Canvas:ellipse(cx, cy, rx, ry, col)
    for j = -ry, ry do
        for i = -rx, rx do
            local a = rx == 0 and 0 or (i * i) / (rx * rx)
            local b = ry == 0 and 0 or (j * j) / (ry * ry)
            if a + b <= 1.0 then self:dot(cx + i, cy + j, col) end
        end
    end
end

function Canvas:line(x0, y0, x1, y1, col)
    local n = math.max(math.abs(x1 - x0), math.abs(y1 - y0))
    for k = 0, n do
        local t = n == 0 and 0 or k / n
        self:dot(math.floor(x0 + (x1 - x0) * t + 0.5), math.floor(y0 + (y1 - y0) * t + 0.5), col)
    end
end

function Canvas:opaque(x, y)
    if x < 0 or y < 0 or x >= self.w or y >= self.h then return false end
    return pc.rgbaA(self.img:getPixel(x, y)) > 0
end

function Canvas:outline()
    local marks = {}
    for y = 0, self.h - 1 do
        for x = 0, self.w - 1 do
            if not self:opaque(x, y) and (self:opaque(x - 1, y) or self:opaque(x + 1, y)
                or self:opaque(x, y - 1) or self:opaque(x, y + 1)) then
                marks[#marks + 1] = { x, y }
            end
        end
    end
    for _, m in ipairs(marks) do self:dot(m[1], m[2], OUT) end
end

-- Moita: tufos sobrepostos do escuro para o claro, brilho para cima-esquerda.
function Canvas:foliage(x, y, w, h, n, pal)
    local tufts = {}
    for _ = 1, n do
        tufts[#tufts + 1] = { x + math.random(0, w - 1), y + math.random(0, h - 1), math.random(2, 4), math.random(2, 3) }
    end
    for _, t in ipairs(tufts) do self:ellipse(t[1], t[2], t[3] + 1, t[4] + 1, pal[1]) end
    for _, t in ipairs(tufts) do self:ellipse(t[1], t[2], t[3], t[4], pal[2]) end
    for _, t in ipairs(tufts) do self:ellipse(t[1] - 1, t[2] - 1, t[3] - 1, t[4] - 1, pal[3]) end
    for _, t in ipairs(tufts) do self:dot(t[1] - 2, t[2] - 2, pal[4] or pal[3]) end
end

local function save(name, cv)
    local spr = Sprite(cv.w * SCALE, cv.h * SCALE, ColorMode.RGB)
    local big = Image(cv.w * SCALE, cv.h * SCALE, ColorMode.RGB)
    big:clear(pc.rgba(0, 0, 0, 0))
    for y = 0, cv.h - 1 do
        for x = 0, cv.w - 1 do
            local c = cv.img:getPixel(x, y)
            for dy = 0, SCALE - 1 do
                for dx = 0, SCALE - 1 do big:drawPixel(x * SCALE + dx, y * SCALE + dy, c) end
            end
        end
    end
    spr.cels[1].image = big
    spr:saveAs(app.fs.joinPath(OUT_DIR, name .. ".aseprite"))
    spr:saveCopyAs(app.fs.joinPath(OUT_DIR, name .. ".png"))
    spr:close()
    print(string.format("%-26s %3dx%-3d nativo -> %dx%d", name, cv.w, cv.h, cv.w * SCALE, cv.h * SCALE))
end


-- Faixa zebrada de perigo (vermelho e preto) num retângulo.
local function hazard(c, x, y, w, h)
    for yy = y, y + h - 1 do
        for xx = x, x + w - 1 do
            c:dot(xx, yy, (((xx + yy) // 3) % 2 == 0) and R1 or S0)
        end
    end
end

-- painel_prensa: 32 x 44, o terminal que programa a prensa.
local function painel()
    local c = canvas(32, 44)
    c:rect(2, 4, 28, 38, S1)
    c:hline(2, 4, 28, S3)
    c:vline(2, 4, 38, S2)
    c:rect(5, 8, 22, 14, C(12, 8, 12))          -- tela
    c:hline(7, 11, 10, R1)
    c:hline(7, 14, 14, R0)
    c:hline(9, 17, 8, R2)
    c:rect(5, 25, 22, 6, S2)                    -- teclado
    for x = 6, 25, 3 do c:dot(x, 27, S4); c:dot(x + 1, 29, S3) end
    c:rect(13, 34, 6, 4, R1)                    -- botão
    c:rect(0, 40, 32, 4, S0)                    -- base
    hazard(c, 3, 41, 26, 2)
    c:outline()
    return c
end

save("painel_prensa", painel())

-- Retratos do SITE (aba PERSONAGENS) que não existiam: COSMO e ADA.
--
-- A Artemis já tinha retrato (as imagens de referência em assets/sprites/,
-- recortadas por tools/site_cards.py). Estes dois são desenhados aqui, no
-- formato do card do site: vertical, 48x104 nativo, salvo em 5x (240x520) com
-- vizinho-mais-próximo, para o pixel continuar pixel no navegador.
--
--   COSMO: a esfera do sprite do jogo (casco cinza, lente em losango ciano) em
--          close, flutuando, com a Lua atrás e o sinal que ele recebe dela.
--   ADA:   ela nunca aparece no jogo, então o retrato é o que ela É: um olho
--          frio num monólito, ligado por fios a uma rede de chips neurais.
--
-- Uso:
--   <aseprite> -b -script tools/site_retratos.lua
--   <aseprite> -b -script-param out=<pasta> -script tools/site_retratos.lua

local pc = app.pixelColor
local SCALE = 5
local W, H = 48, 104

local OUT_DIR = app.params["out"]
if not OUT_DIR or OUT_DIR == "" then
    OUT_DIR = app.fs.joinPath(app.fs.filePath(app.fs.normalizePath(debug.getinfo(1, "S").source:sub(2))),
        "..", "client", "assets", "images", "site")
end
app.fs.makeAllDirectories(OUT_DIR)

math.randomseed(3)

local function C(r, g, b, a) return pc.rgba(r, g, b, a or 255) end

local Canvas = {}
Canvas.__index = Canvas

local function canvas(w, h)
    local img = Image(w, h, ColorMode.RGB)
    img:clear(C(0, 0, 0))
    return setmetatable({ w = w, h = h, img = img }, Canvas)
end

function Canvas:dot(x, y, col)
    if x >= 0 and y >= 0 and x < self.w and y < self.h then self.img:drawPixel(x, y, col) end
end

function Canvas:rect(x, y, w, h, col)
    for j = y, y + h - 1 do for i = x, x + w - 1 do self:dot(i, j, col) end end
end

function Canvas:disc(cx, cy, r, col)
    for j = -r, r do for i = -r, r do
        if i * i + j * j <= r * r + r * 0.6 then self:dot(cx + i, cy + j, col) end
    end end
end

function Canvas:ring(cx, cy, r, col, step)
    local n = math.floor(2 * math.pi * r * 1.6)
    for k = 0, n - 1 do
        if not step or (k % step) < step / 2 then
            local a = k / n * 2 * math.pi
            self:dot(math.floor(cx + math.cos(a) * r + 0.5), math.floor(cy + math.sin(a) * r + 0.5), col)
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

-- Fundo em degradê vertical.
function Canvas:gradient(top, bottom)
    for y = 0, self.h - 1 do
        local t = y / (self.h - 1)
        local c = C(
            math.floor(pc.rgbaR(top) + (pc.rgbaR(bottom) - pc.rgbaR(top)) * t),
            math.floor(pc.rgbaG(top) + (pc.rgbaG(bottom) - pc.rgbaG(top)) * t),
            math.floor(pc.rgbaB(top) + (pc.rgbaB(bottom) - pc.rgbaB(top)) * t))
        self:rect(0, y, self.w, 1, c)
    end
end

local function save(name, cv)
    local spr = Sprite(cv.w * SCALE, cv.h * SCALE, ColorMode.RGB)
    local big = Image(cv.w * SCALE, cv.h * SCALE, ColorMode.RGB)
    for y = 0, cv.h - 1 do for x = 0, cv.w - 1 do
        local c = cv.img:getPixel(x, y)
        for dy = 0, SCALE - 1 do for dx = 0, SCALE - 1 do big:drawPixel(x * SCALE + dx, y * SCALE + dy, c) end end
    end end
    spr.cels[1].image = big
    spr:saveAs(app.fs.joinPath(OUT_DIR, name .. ".aseprite"))
    spr:saveCopyAs(app.fs.joinPath(OUT_DIR, name .. ".png"))
    spr:close()
    print(name, cv.w * SCALE .. "x" .. cv.h * SCALE)
end

local CYAN, CYAN_DIM, CYAN_DEEP = C(74, 214, 255), C(40, 120, 150), C(20, 58, 76)

-- =============================================================================
local function cosmo()
    local c = canvas(W, H)
    c:gradient(C(8, 11, 20), C(18, 24, 36))
    for _ = 1, 40 do                                    -- estrelas
        c:dot(math.random(0, W - 1), math.random(0, 70), math.random() < 0.3 and C(200, 210, 230) or C(90, 98, 120))
    end
    -- a Lua no alto, de onde vem o sinal
    c:disc(37, 12, 7, C(150, 156, 170))
    c:disc(35, 11, 6, C(196, 200, 212))
    c:dot(38, 9, C(150, 156, 170)); c:dot(34, 14, C(150, 156, 170)); c:dot(39, 15, C(150, 156, 170))
    c:disc(33, 11, 5, C(8, 11, 20))                     -- recorte do crescente
    -- ondas do sinal descendo até ele
    for k, r in ipairs({ 6, 10, 14 }) do
        c:ring(24, 34, r, k == 1 and CYAN or CYAN_DIM, 6)
    end

    local cx, cy, r = 24, 56, 17
    -- brilho da flutuação no "chão"
    for j = -2, 2 do for i = -14, 14 do
        if (i * i) / 196 + (j * j) / 4 <= 1 then c:dot(cx + i, 88 + j, CYAN_DEEP) end
    end end
    for i = -8, 8 do c:dot(cx + i, 88, CYAN_DIM) end
    -- casco: contorno, rampa de cinza com a luz vindo de cima-esquerda
    c:disc(cx, cy, r + 1, C(14, 16, 22))
    c:disc(cx, cy, r, C(78, 82, 94))
    c:disc(cx - 1, cy - 1, r - 2, C(112, 118, 132))
    c:disc(cx - 3, cy - 3, r - 6, C(150, 156, 170))
    c:disc(cx - 5, cy - 5, r - 11, C(196, 202, 214))
    c:disc(cx - 7, cy - 7, 2, C(236, 240, 246))
    -- emenda do casco
    for i = -r + 2, r - 2 do c:dot(cx + i, cy + 7, C(60, 64, 76)) end
    -- lente em losango (a "cara" do sprite)
    for j = -7, 7 do
        local half = 5 - math.floor(math.abs(j) * 5 / 7 + 0.5)
        for i = -half, half do c:dot(cx + i, cy + j, C(16, 20, 28)) end
    end
    for j = -5, 5 do
        local half = 3 - math.floor(math.abs(j) * 3 / 5 + 0.5)
        for i = -half, half do c:dot(cx + i, cy + j, CYAN) end
    end
    c:dot(cx - 1, cy - 3, C(220, 248, 255)); c:dot(cx, cy - 4, C(220, 248, 255))
    -- LEDs do casco
    c:dot(cx - 11, cy - 6, CYAN); c:dot(cx + 12, cy - 3, CYAN); c:dot(cx + 9, cy + 11, CYAN_DIM)
    return c
end

-- =============================================================================
local function ada()
    local c = canvas(W, H)
    c:gradient(C(4, 4, 8), C(12, 10, 16))
    -- chuva de dados atrás de tudo
    for x = 1, W - 2, 3 do
        local head = math.random(0, H - 1)
        local len = math.random(6, 20)
        for k = 0, len do
            local y = head - k
            if y >= 0 then c:dot(x, y, k == 0 and C(150, 220, 240) or (k < 4 and CYAN_DIM or CYAN_DEEP)) end
        end
    end
    -- monólito
    c:rect(12, 14, 24, 66, C(10, 11, 16))
    c:rect(12, 14, 1, 66, C(46, 50, 62))
    c:rect(35, 14, 1, 66, C(26, 28, 36))
    c:rect(12, 14, 24, 1, C(70, 76, 92))
    -- halo em anéis
    c:ring(24, 40, 17, C(46, 50, 62), 4)
    c:ring(24, 40, 14, C(80, 86, 102))
    -- o olho
    local cx, cy = 24, 40
    for j = -6, 6 do for i = -11, 11 do
        if (i * i) / 121 + (j * j) / 36 <= 1 then c:dot(cx + i, cy + j, C(214, 220, 232)) end
    end end
    c:disc(cx, cy, 5, CYAN_DIM)
    c:disc(cx, cy, 4, CYAN)
    c:disc(cx, cy, 2, C(8, 8, 12))
    c:dot(cx, cy, C(255, 69, 69))                       -- o ponto vermelho no fundo da pupila
    c:dot(cx - 2, cy - 2, C(240, 252, 255))
    -- pálpebra: corta o alto e o baixo do branco (olho semicerrado, frio)
    for i = -11, 11 do
        c:dot(cx + i, cy - 6, C(10, 11, 16)); c:dot(cx + i, cy - 5 + (math.abs(i) > 8 and 1 or 0), C(10, 11, 16))
        c:dot(cx + i, cy + 6, C(10, 11, 16))
    end
    -- fios descendo do monólito até os chips neurais (a população)
    local chips = {}
    for row = 0, 2 do
        for col = 0, 4 do
            chips[#chips + 1] = { 4 + col * 10 + (row % 2) * 5, 86 + row * 6 }
        end
    end
    for _, p in ipairs(chips) do
        if p[1] < W - 2 then
            c:line(24, 80, p[1], p[2], C(30, 70, 90))
        end
    end
    for _, p in ipairs(chips) do
        if p[1] < W - 2 then
            c:rect(p[1] - 1, p[2] - 1, 3, 3, C(46, 50, 62))
            c:dot(p[1], p[2], math.random() < 0.8 and CYAN or C(255, 69, 69))
        end
    end
    return c
end

save("retrato_cosmo", cosmo())
save("retrato_ada", ada())

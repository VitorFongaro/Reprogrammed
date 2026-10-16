-- Gera os objetos da EXPEDIÇÃO (cap2-expedicao), a triagem do correio no térreo.
--
-- Mesmas regras dos props da recepção e do jardim: 3/4 top-down, faces nos
-- eixos, contorno de 1px, nativo salvo em 2x (com o .aseprite ao lado).
--
-- Os PACOTES são o puzzle: cada um é um caso de teste da triagem (gerada pela
-- IA), e o TAMANHO da caixa acompanha o peso (pequena, média, grande), para o
-- peso se ler de longe antes de se ler a etiqueta. A etiqueta com o peso e os
-- carimbos de URGENTE/FRÁGIL são escritos no código, em cima da caixa.
--
-- Uso (caminho do Aseprite é local de cada dev):
--   <aseprite> -b -script tools/expedicao_props.lua
--   <aseprite> -b -script-param out=<pasta> -script tools/expedicao_props.lua

local pc = app.pixelColor
local SCALE = 2

local OUT_DIR = app.params["out"]
if not OUT_DIR or OUT_DIR == "" then
    OUT_DIR = app.fs.joinPath(app.fs.filePath(app.fs.normalizePath(debug.getinfo(1, "S").source:sub(2))),
        "..", "client", "assets", "images", "expedicao", "props")
end
app.fs.makeAllDirectories(OUT_DIR)

math.randomseed(23)

local function C(r, g, b, a) return pc.rgba(r, g, b, a or 255) end

-- --- Paleta ------------------------------------------------------------------
local OUT = C(0, 0, 0)
local S0, S1, S2, S3, S4 = C(38, 40, 48), C(66, 70, 82), C(102, 108, 122), C(140, 148, 164), C(188, 194, 206)
local N0 = C(22, 26, 38)
local CYAN, CYAN_DIM = C(74, 214, 255), C(40, 120, 150)
local AMBER, RED, GREEN = C(255, 200, 36), C(255, 69, 69), C(81, 227, 107)
-- madeira do canteiro e do banco
local M0, M1, M2, M3 = C(52, 34, 24), C(86, 58, 38), C(118, 82, 52), C(150, 108, 70)
-- terra
local T0, T1, T2 = C(34, 24, 18), C(54, 38, 28), C(72, 52, 38)
-- folhagem saudável
local G0, G1, G2, G3 = C(22, 54, 34), C(36, 88, 52), C(58, 128, 70), C(100, 172, 96)
-- murcha (seca)
local Y0, Y1, Y2 = C(92, 70, 30), C(140, 112, 48), C(184, 156, 78)
-- encharcada (escura, apodrecendo)
local D0, D1, D2 = C(22, 36, 30), C(34, 54, 40), C(52, 74, 52)
-- água
local W0, W1, W2 = C(30, 70, 120), C(56, 118, 182), C(130, 190, 236)
-- flores
local PINK, PINK_D = C(236, 110, 160), C(170, 60, 110)
local LILAC, LILAC_D, LILAC_L = C(176, 120, 220), C(116, 70, 160), C(220, 184, 246)
-- pedra clara do chafariz
local P0, P1, P2, P3 = C(58, 60, 70), C(92, 96, 108), C(128, 132, 146), C(170, 174, 188)

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


-- papelão
local K0, K1, K2, K3 = C(74, 52, 32), C(132, 96, 60), C(168, 126, 82), C(198, 158, 108)
local TAPE = C(214, 196, 150)
local ORANGE, ORANGE_D = C(255, 150, 46), C(170, 90, 24)
local BLUE, BLUE_D = C(74, 140, 230), C(40, 80, 150)

-- =============================================================================
-- PACOTE — três tamanhos, mesma caixa: tampa de cima com a fita, frente com a
-- etiqueta branca (o peso é escrito nela pelo código).
-- =============================================================================
local function pacote(w, h, top)
    local c = canvas(w, h)
    c:rect(1, 1, w - 2, top, K2)                 -- tampa
    c:hline(1, 1, w - 2, K3)
    c:vline(w // 2, 1, top, TAPE)                -- fita
    c:rect(1, top + 1, w - 2, h - top - 2, K1)   -- frente
    c:hline(1, top + 1, w - 2, K2)
    c:vline(w // 2, top + 1, 2, TAPE)
    c:hline(1, h - 2, w - 2, K0)
    c:outline()
    return c
end

-- =============================================================================
-- RAMPA — 40x34: a boca da calha onde o braço empurra o pacote, com a faixa
-- da cor do destino e o ícone (caminhão, moto, caixa).
-- =============================================================================
local function icon(c, kind, x, y, col)
    if kind == "carga" then                      -- caminhão
        c:rect(x, y + 1, 9, 5, col); c:rect(x + 9, y + 3, 4, 3, col)
        c:dot(x + 2, y + 6, OUT); c:dot(x + 10, y + 6, OUT)
    elseif kind == "expresso" then               -- moto
        c:ellipse(x + 2, y + 5, 2, 1, col); c:ellipse(x + 10, y + 5, 2, 1, col)
        c:line(x + 2, y + 4, x + 6, y + 1, col); c:line(x + 6, y + 1, x + 10, y + 4, col)
        c:hline(x + 4, y + 3, 5, col)
    else                                         -- caixa
        c:rect(x + 3, y, 7, 6, col); c:vline(x + 6, y, 6, OUT)
    end
end

local function rampa(kind, band, bandD)
    local c = canvas(40, 34)
    c:rect(1, 1, 38, 10, S3)                     -- borda de cima (aço)
    c:hline(1, 1, 38, S4)
    c:rect(4, 3, 32, 7, C(14, 16, 20))           -- boca (escura)
    c:hline(4, 3, 32, C(30, 32, 40))
    c:rect(1, 11, 38, 21, S1)                    -- corpo
    c:hline(1, 11, 38, S2)
    c:rect(1, 13, 38, 4, band)                   -- faixa da cor do destino
    c:hline(1, 16, 38, bandD)
    for x = 2, 37, 6 do c:rect(x, 27, 3, 3, AMBER) end   -- zebrado de baixo
    c:hline(1, 30, 38, S0)
    icon(c, kind, 13, 19, S4)
    c:outline()
    return c
end

-- =============================================================================
-- PILHA — 70x50: os pacotes que a triagem quebrada despejou no fim da
-- esteira, entupindo a passarela.
-- =============================================================================
local function pilha()
    local c = canvas(70, 50)
    local boxes = {
        { 4, 30, 18, 16, 6 }, { 20, 32, 22, 15, 7 }, { 42, 30, 20, 17, 7 }, { 56, 36, 13, 12, 5 },
        { 12, 16, 20, 16, 7 }, { 32, 14, 18, 18, 6 }, { 48, 20, 16, 14, 6 },
        { 22, 3, 16, 14, 5 }, { 38, 6, 12, 10, 4 }
    }
    for _, b in ipairs(boxes) do
        local x, y, w, h, top = b[1], b[2], b[3], b[4], b[5]
        c:rect(x, y, w, top, K2); c:hline(x, y, w, K3)
        c:vline(x + w // 2, y, top, TAPE)
        c:rect(x, y + top, w, h - top, K1); c:hline(x, y + top, w, K2)
        c:hline(x, y + h - 1, w, K0)
        if math.random() < 0.5 then c:rect(x + 2, y + top + 2, 5, 3, C(232, 232, 226)) end
    end
    c:outline()
    return c
end

-- =============================================================================
-- EMPURRADOR — 14x16: o pistão que joga o pacote na rampa.
-- =============================================================================
local function empurrador()
    local c = canvas(14, 16)
    c:rect(1, 2, 8, 12, S1); c:hline(1, 2, 8, S2)
    c:rect(9, 6, 4, 4, S3); c:hline(9, 6, 4, S4)   -- cabeça do pistão
    c:dot(3, 4, AMBER)
    c:hline(1, 13, 8, S0)
    c:outline()
    return c
end

-- =============================================================================
-- PAINEL DA TRIAGEM — 32x44: tela com a esteira e as três rampas.
-- =============================================================================
local function painel()
    local c = canvas(32, 44)
    c:rect(2, 1, 28, 5, S3); c:hline(2, 1, 28, S4)
    c:rect(2, 6, 28, 36, S1); c:hline(2, 6, 28, S2)
    c:rect(5, 9, 22, 15, N0)
    c:vline(10, 10, 13, CYAN_DIM); c:vline(11, 10, 13, CYAN_DIM)   -- esteira na tela
    c:rect(14, 12, 6, 2, ORANGE); c:rect(14, 16, 6, 2, RED); c:rect(14, 20, 6, 2, BLUE)
    c:rect(9, 11, 4, 3, K2)                                        -- pacote descendo
    c:dot(24, 11, RED)                                             -- alerta
    for k = 0, 2 do c:rect(7 + k * 7, 29, 5, 4, S2); c:hline(7 + k * 7, 29, 5, S3) end
    c:rect(6, 37, 3, 2, GREEN); c:rect(23, 37, 3, 2, RED)
    c:rect(13, 42, 6, 2, S0)
    c:hline(2, 41, 28, S0)
    c:outline()
    return c
end

-- =============================================================================
-- Decoração.
-- =============================================================================
local function prateleira()
    local c = canvas(56, 52)
    for _, x in ipairs({ 1, 53 }) do c:rect(x, 0, 2, 51, S1) end
    for _, y in ipairs({ 16, 33, 49 }) do
        c:rect(1, y, 54, 3, S2); c:hline(1, y, 54, S3)
        local x = 4
        while x < 48 do
            local w = math.random(8, 14)
            local h = math.random(7, 12)
            if x + w > 52 then break end
            c:rect(x, y - h, w, 3, K2); c:hline(x, y - h, w, K3)
            c:rect(x, y - h + 3, w, h - 3, K1)
            c:vline(x + w // 2, y - h, 3, TAPE)
            x = x + w + 2
        end
    end
    c:outline()
    return c
end

local function carrinho()
    local c = canvas(24, 36)
    c:vline(3, 2, 30, S2); c:vline(4, 2, 30, S3)   -- haste
    c:hline(2, 2, 6, S3)
    c:rect(3, 30, 18, 2, S2)                       -- pá
    c:ellipse(6, 33, 2, 2, S0); c:ellipse(17, 33, 2, 2, S0)
    c:rect(7, 14, 13, 16, K1); c:rect(7, 14, 13, 4, K2); c:vline(13, 14, 4, TAPE)   -- caixa
    c:outline()
    return c
end

local function balanca()
    local c = canvas(32, 22)
    c:rect(1, 6, 30, 9, S2); c:hline(1, 6, 30, S3)
    c:rect(1, 15, 30, 5, S1)
    c:rect(10, 0, 12, 7, N0)                       -- visor
    c:hline(12, 3, 3, GREEN); c:hline(16, 3, 4, GREEN)
    c:outline()
    return c
end

local function mesaEmbalagem()
    local c = canvas(58, 34)
    c:rect(1, 4, 56, 9, K2); c:hline(1, 4, 56, K3)   -- tampo de madeira clara
    c:rect(1, 13, 56, 3, K1)
    for _, x in ipairs({ 3, 52 }) do c:rect(x, 16, 3, 16, S1) end
    c:rect(8, 0, 14, 8, K1); c:rect(8, 0, 14, 3, K2)  -- caixa aberta em cima
    c:ellipse(34, 7, 3, 2, TAPE); c:dot(34, 7, K0)   -- rolo de fita
    c:rect(42, 5, 10, 6, C(232, 232, 226))           -- etiquetas
    c:outline()
    return c
end

local function gaiola()
    local c = canvas(42, 48)
    c:rect(1, 1, 40, 44, C(20, 22, 28))
    for _, b in ipairs({ { 4, 30, 14, 13 }, { 20, 34, 16, 9 }, { 8, 12, 12, 10 } }) do
        c:rect(b[1], b[2], b[3], b[4], K1); c:hline(b[1], b[2], b[3], K2)
    end
    for x = 1, 41, 5 do c:vline(x, 1, 44, S2) end
    for _, y in ipairs({ 1, 23, 44 }) do c:hline(1, y, 40, S3) end
    c:ellipse(6, 46, 2, 1, S0); c:ellipse(36, 46, 2, 1, S0)
    c:outline()
    return c
end

local function cone()
    local c = canvas(12, 16)
    for y = 0, 11 do
        local half = math.floor(y / 3) + 1
        c:hline(6 - half, y + 1, half * 2, (y >= 4 and y <= 6) and C(240, 240, 236) or ORANGE)
    end
    c:rect(1, 13, 10, 2, ORANGE_D)
    c:outline()
    return c
end

save("pacote_p", pacote(16, 14, 5))
save("pacote_m", pacote(20, 18, 6))
save("pacote_g", pacote(26, 22, 7))
save("rampa_carga", rampa("carga", ORANGE, ORANGE_D))
save("rampa_expresso", rampa("expresso", RED, C(150, 30, 30)))
save("rampa_normal", rampa("normal", BLUE, BLUE_D))
save("pilha_pacotes", pilha())
save("empurrador", empurrador())
save("painel_triagem", painel())
save("prateleira_pacotes", prateleira())
save("carrinho_carga", carrinho())
save("balanca", balanca())
save("mesa_embalagem", mesaEmbalagem())
save("gaiola_correio", gaiola())
save("cone_triagem", cone())  -- "cone" já é do depósito (prop-<nome> é global)

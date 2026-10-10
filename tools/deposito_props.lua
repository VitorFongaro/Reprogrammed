-- Gera os objetos do DEPÓSITO (cap2-deposito), o almoxarifado do térreo.
--
-- Mesmo estilo dos props da recepção e do jardim (tools/recepcao_props.lua,
-- tools/jardim_props.lua): 3/4 top-down com faces alinhadas aos eixos, contorno
-- preto de 1px, paleta fechada, nativo salvo em 2x com vizinho-mais-próximo (o
-- .aseprite sai junto, em 2x).
--
-- A sala tem dois puzzles de MUNDO gerados pela IA (ver objects/CrateCorridor.js
-- e objects/CrateBridge.js). Como a IA decide quantas caixas há, as peças que
-- formam os puzzles são MÓDULOS que o código repete quantas vezes precisar:
--   estante_*     um vão de estante porta-pallet (76x58 em 2x). O corredor de
--                 caixas é um bloco de estantes com uma passagem no meio; o vão
--                 VAZIO é o nicho para onde a caixa é empurrada;
--   esteira       um trecho da esteira (64x58), empilhado um por caixa;
--   descarte      a boca do compactador, para onde vai a caixa que não serve.
-- O resto é mobília fixa, posta no Tiled (assets/maps/deposito.json).
--
-- Uso (caminho do Aseprite é local de cada dev):
--   <aseprite> -b -script tools/deposito_props.lua
--   <aseprite> -b -script-param out=<pasta> -script tools/deposito_props.lua

local pc = app.pixelColor
local SCALE = 2

local OUT_DIR = app.params["out"]
if not OUT_DIR or OUT_DIR == "" then
    OUT_DIR = app.fs.joinPath(app.fs.filePath(app.fs.normalizePath(debug.getinfo(1, "S").source:sub(2))),
        "..", "client", "assets", "images", "deposito", "props")
end
app.fs.makeAllDirectories(OUT_DIR)

math.randomseed(23)

local function C(r, g, b, a) return pc.rgba(r, g, b, a or 255) end

-- --- Paleta ------------------------------------------------------------------
local OUT = C(0, 0, 0)
local S0, S1, S2, S3, S4 = C(38, 40, 48), C(66, 70, 82), C(102, 108, 122), C(140, 148, 164), C(188, 194, 206)
local N0, N1 = C(16, 18, 24), C(26, 29, 38)
local CYAN, CYAN_DIM = C(74, 214, 255), C(40, 120, 150)
local AMBER, RED, GREEN = C(255, 200, 36), C(255, 69, 69), C(81, 227, 107)
-- montantes azuis e longarinas laranja (estante porta-pallet de verdade)
local B0, B1, B2 = C(28, 50, 92), C(46, 82, 146), C(84, 130, 200)
local O0, O1, O2 = C(140, 62, 20), C(214, 106, 32), C(248, 158, 70)
-- papelão
local K0, K1, K2, K3 = C(92, 64, 36), C(138, 100, 58), C(172, 132, 80), C(206, 170, 112)
-- madeira de pallet
local M0, M1, M2, M3 = C(70, 48, 28), C(110, 78, 46), C(148, 110, 66), C(184, 144, 92)
-- amarelo de segurança
local Y0, Y1, Y2 = C(150, 110, 10), C(232, 180, 28), C(255, 222, 92)
-- tambores
local DB0, DB1, DB2 = C(24, 52, 96), C(40, 86, 150), C(78, 132, 200)
local DR0, DR1, DR2 = C(100, 28, 28), C(160, 48, 44), C(206, 86, 76)
-- lona/sacaria
local L0, L1, L2 = C(96, 98, 80), C(138, 140, 112), C(176, 178, 148)

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

-- Faixa zebrada amarelo/preto em diagonal, dentro do retângulo.
function Canvas:hazard(x, y, w, h)
    for j = y, y + h - 1 do
        for i = x, x + w - 1 do
            self:dot(i, j, ((i + j) // 3) % 2 == 0 and Y1 or N0)
        end
    end
end

-- Caixa de papelão em 3/4: tampa clara, frente com fita.
function Canvas:box(x, y, w, h, top)
    top = top or 3
    self:rect(x, y, w, top, K2)
    self:hline(x, y, w, K3)
    self:rect(x, y + top, w, h - top, K1)
    self:vline(x + w // 2, y, h, K3)                -- fita
    self:hline(x, y + h - 1, w, K0)
    self:vline(x + w - 1, y + top, h - top, K0)
end

-- Tambor em 3/4: tampo elíptico e aros.
function Canvas:drum(cx, by, r, h, pal)
    self:rect(cx - r, by - h, r * 2 + 1, h, pal[2])
    self:vline(cx - r + 1, by - h, h, pal[3])
    self:vline(cx + r, by - h, h, pal[1])
    for _, k in ipairs({ 2, h - 3 }) do self:hline(cx - r, by - h + k, r * 2 + 1, pal[1]) end
    self:ellipse(cx, by - h, r, 2, pal[3])
    self:ellipse(cx, by - h, r - 2, 1, pal[2])
    self:dot(cx + r - 3, by - h, S0)                 -- bujão
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
    print(string.format("%-22s %3dx%-3d nativo -> %dx%d", name, cv.w, cv.h, cv.w * SCALE, cv.h * SCALE))
end

-- =============================================================================
-- ESTANTE — 38x29, um vão. Montantes azuis nas laterais, duas longarinas
-- laranja (o nível de cima e o do chão) e o fundo escuro entre elas. O código
-- empilha os vãos lado a lado e em fileiras para formar o bloco de estantes.
-- =============================================================================
local BAY_W, BAY_H = 38, 29
local LEVELS = { { top = 4, bottom = 14 }, { top = 18, bottom = 26 } }   -- espaço útil de cada nível

local function bayFrame(c)
    c:rect(3, 3, BAY_W - 6, BAY_H - 4, N1)          -- fundo do vão
    for y = 4, BAY_H - 2, 4 do c:hline(4, y, BAY_W - 8, N0) end   -- tela do fundo
    -- longarinas: topo, meio e chão
    for _, y in ipairs({ 1, 15, 26 }) do
        c:rect(2, y, BAY_W - 4, 2, O1)
        c:hline(2, y, BAY_W - 4, O2)
        c:hline(2, y + 2, BAY_W - 4, O0)
    end
    -- montantes com a furação
    for _, x in ipairs({ 0, BAY_W - 3 }) do
        c:rect(x, 0, 3, BAY_H, B1)
        c:vline(x, 0, BAY_H, B2)
        c:vline(x + 2, 0, BAY_H, B0)
        for y = 3, BAY_H - 2, 3 do c:dot(x + 1, y, B0) end
    end
end

-- Conteúdo de um nível: o que estiver na mão, de pé em cima da longarina.
local function fillLevel(c, level, kind)
    local by = level.bottom                          -- base dos volumes (em cima da longarina)
    local room = by - level.top
    if kind == "caixas" then
        local x = 5
        while x < BAY_W - 9 do
            local w = math.random(7, 10)
            local h = math.random(room - 4, room)
            if x + w > BAY_W - 4 then w = BAY_W - 4 - x end
            c:box(x, by - h, w, h)
            x = x + w + 1
        end
    elseif kind == "barris" then
        for _, cx in ipairs({ 9, 19, 29 }) do
            local pal = math.random() < 0.5 and { DB0, DB1, DB2 } or { DR0, DR1, DR2 }
            c:drum(cx, by, 4, room - 1, pal)
        end
    elseif kind == "sacos" then
        for k = 0, 2 do
            local x = 5 + k * 10
            c:ellipse(x + 4, by - 3, 5, 3, L1)
            c:ellipse(x + 4, by - 4, 4, 2, L2)
            c:hline(x + 1, by - 1, 8, L0)
        end
        c:ellipse(15, by - 7, 5, 3, L1); c:ellipse(15, by - 8, 4, 2, L2)
    end
end

local function estante(kinds)
    local c = canvas(BAY_W, BAY_H)
    bayFrame(c)
    for i, level in ipairs(LEVELS) do
        if kinds[i] then fillLevel(c, level, kinds[i]) end
    end
    -- as longarinas da frente passam POR CIMA do que está no nível de baixo
    for _, y in ipairs({ 15, 26 }) do
        c:rect(2, y, BAY_W - 4, 2, O1)
        c:hline(2, y, BAY_W - 4, O2)
    end
    c:outline()
    return c
end

-- Vão vazio: é o NICHO. Fica sem as prateleiras do meio (cabe uma caixa
-- inteira) e com o chão marcado em amarelo, que é onde ela vai parar.
local function estanteVazia()
    local c = canvas(BAY_W, BAY_H)
    c:rect(3, 3, BAY_W - 6, BAY_H - 4, N0)
    -- marcação de piso: cantoneiras amarelas
    for _, p in ipairs({ { 5, 5, 1, 1 }, { BAY_W - 6, 5, -1, 1 }, { 5, BAY_H - 4, 1, -1 }, { BAY_W - 6, BAY_H - 4, -1, -1 } }) do
        c:hline(math.min(p[1], p[1] + p[3] * 4), p[2], 5, Y0)
        c:vline(p[1], math.min(p[2], p[2] + p[4] * 4), 5, Y0)
    end
    c:rect(2, 1, BAY_W - 4, 2, O1)                   -- só a longarina do topo
    c:hline(2, 1, BAY_W - 4, O2)
    for _, x in ipairs({ 0, BAY_W - 3 }) do
        c:rect(x, 0, 3, BAY_H, B1)
        c:vline(x, 0, BAY_H, B2)
        c:vline(x + 2, 0, BAY_H, B0)
        for y = 3, BAY_H - 2, 3 do c:dot(x + 1, y, B0) end
    end
    c:outline()
    return c
end

-- =============================================================================
-- ESTEIRA — 32x29, um trecho. Trilhos nas laterais, roletes atravessados.
-- =============================================================================
local function esteira()
    local c = canvas(32, 29)
    c:rect(3, 0, 26, 29, N1)
    for y = 1, 28, 3 do
        c:hline(4, y, 24, S2)
        c:hline(4, y + 1, 24, S1)
    end
    for _, x in ipairs({ 0, 29 }) do
        c:rect(x, 0, 3, 29, S1)
        c:vline(x, 0, 29, S3)
        c:vline(x + 2, 0, 29, S0)
        c:rect(x, 13, 3, 3, Y1)                       -- suporte pintado
    end
    return c                                          -- sem contorno: os trechos emendam
end

-- =============================================================================
-- DESCARTE — 36x36: a boca do compactador, com a moldura zebrada.
-- =============================================================================
local function descarte()
    local c = canvas(36, 36)
    c:hazard(1, 1, 34, 34)
    c:rect(6, 6, 24, 24, N0)
    for k = 0, 5 do                                   -- profundidade: escurece para dentro
        local col = C(34 - k * 5, 36 - k * 5, 44 - k * 5)
        c:rect(6 + k, 6 + k, 24 - k * 2, 1, col)
        c:rect(6 + k, 6 + k, 1, 24 - k * 2, col)
    end
    for x = 10, 26, 4 do c:rect(x, 22, 2, 4, S1) end  -- dentes do triturador, lá no fundo
    c:rect(1, 1, 34, 1, Y2)
    c:rect(28, 2, 4, 3, RED)                          -- luz de operação
    c:dot(28, 2, C(255, 160, 160))
    c:outline()
    return c
end

-- =============================================================================
-- PAINEL DOS PISTÕES — 32x44 (terminal do corredor). Armário com a tela
-- mostrando as caixas e as setas de cima/baixo.
-- =============================================================================
local function painelPistao()
    local c = canvas(32, 44)
    c:rect(2, 1, 28, 5, S3)
    c:hline(2, 1, 28, S4)
    c:rect(2, 6, 28, 36, S1)
    c:hline(2, 6, 28, S2)
    c:rect(5, 9, 22, 14, N0)                          -- tela
    for k = 0, 2 do
        local x = 8 + k * 6
        c:rect(x, 14, 4, 4, CYAN_DIM)
        c:dot(x + 1, k == 1 and 11 or 20, CYAN); c:dot(x + 2, k == 1 and 11 or 20, CYAN)
    end
    c:hline(6, 22, 20, CYAN_DIM)
    c:hazard(5, 26, 22, 3)
    for k = 0, 2 do c:rect(7 + k * 7, 31, 4, 3, k == 1 and AMBER or S3) end   -- botões
    c:rect(23, 35, 3, 4, RED)                         -- emergência
    c:rect(6, 37, 3, 2, GREEN)
    c:hline(2, 41, 28, S0)
    c:outline()
    return c
end

-- =============================================================================
-- CONTROLE DO GUINDASTE — 38x36 (terminal da ponte). Mesa inclinada com a
-- tela do gancho e o joystick.
-- =============================================================================
local function consoleGuindaste()
    local c = canvas(38, 36)
    c:rect(2, 8, 34, 6, S2)                           -- tampo inclinado
    c:hline(2, 8, 34, S4)
    c:rect(5, 1, 20, 9, S1)                           -- monitor
    c:rect(6, 2, 18, 7, N0)
    c:vline(15, 2, 4, CYAN_DIM)                       -- cabo e gancho
    c:rect(13, 6, 5, 2, CYAN)
    c:hline(7, 3, 16, CYAN_DIM)
    c:rect(29, 3, 2, 6, S3)                           -- joystick
    c:ellipse(30, 3, 2, 1, RED)
    c:rect(5, 11, 3, 2, AMBER); c:rect(10, 11, 3, 2, GREEN); c:rect(20, 11, 6, 2, S0)
    c:rect(2, 14, 34, 20, S1)                         -- corpo
    c:hline(2, 14, 34, S3)
    c:rect(6, 18, 12, 12, S0); c:rect(20, 18, 12, 12, S0)   -- portinholas
    c:dot(16, 24, S3); c:dot(22, 24, S3)
    c:hazard(2, 31, 34, 2)
    c:outline()
    return c
end

-- =============================================================================
-- Mobília do depósito.
-- =============================================================================

-- Empilhadeira de lado, de frente para a direita, garfos baixados.
local function empilhadeira()
    local c = canvas(54, 42)
    -- torre e garfos
    c:rect(40, 2, 3, 32, S1); c:vline(40, 2, 32, S3)
    c:rect(44, 2, 2, 32, S1)
    c:rect(43, 31, 10, 2, S2); c:hline(43, 31, 10, S3)  -- garfo
    -- contrapeso + carroceria amarela
    c:rect(4, 20, 36, 12, Y1)
    c:hline(4, 20, 36, Y2)
    c:rect(4, 28, 36, 4, Y0)
    c:rect(2, 18, 10, 14, S1)                         -- contrapeso
    c:hline(2, 18, 10, S2)
    c:hazard(4, 24, 6, 3)
    -- cabine (grade de proteção)
    for _, x in ipairs({ 14, 34 }) do c:rect(x, 4, 2, 17, S0) end
    c:rect(14, 3, 22, 2, S0)
    c:rect(19, 13, 9, 7, N1)                          -- banco
    c:rect(19, 13, 9, 2, S1)
    c:line(31, 10, 34, 14, S2)                        -- volante
    c:rect(23, 1, 4, 2, AMBER)                        -- giroflex
    c:dot(24, 1, C(255, 240, 160))
    -- rodas
    for _, w in ipairs({ { 12, 34, 6 }, { 34, 35, 5 } }) do
        c:ellipse(w[1], w[2], w[3], w[3], N0)
        c:ellipse(w[1], w[2], w[3] - 3, w[3] - 3, S2)
        c:dot(w[1], w[2], S0)
    end
    c:outline()
    return c
end

-- Pallet com caixas empilhadas e filme plástico.
local function palletCaixas()
    local c = canvas(36, 36)
    c:box(4, 14, 13, 16); c:box(18, 14, 14, 16)
    c:box(6, 3, 12, 12); c:box(19, 5, 11, 10)
    for y = 6, 28, 5 do c:hline(4, y, 28, C(200, 210, 220, 120)) end   -- filme
    c:rect(2, 30, 32, 3, M2); c:hline(2, 30, 32, M3)
    for _, x in ipairs({ 2, 16, 31 }) do c:rect(x, 33, 3, 2, M1) end
    c:outline()
    return c
end

-- Pilha de pallets vazios.
local function palletsVazios()
    local c = canvas(36, 22)
    for k = 0, 3 do
        local y = 2 + k * 5
        c:rect(2, y, 32, 2, M2); c:hline(2, y, 32, M3)
        for _, x in ipairs({ 2, 16, 31 }) do c:rect(x, y + 2, 3, 2, M1) end
        for x = 6, 30, 6 do c:dot(x, y, M1) end
    end
    c:outline()
    return c
end

local function tambores()
    local c = canvas(32, 28)
    c:drum(8, 26, 6, 15, { DB0, DB1, DB2 })
    c:drum(23, 26, 6, 15, { DR0, DR1, DR2 })
    c:drum(15, 18, 6, 14, { S0, S1, S3 })
    c:outline()
    return c
end

local function cone()
    local c = canvas(14, 16)
    c:rect(1, 13, 12, 2, C(220, 90, 30))
    for y = 1, 12 do
        local half = y // 2 + 1
        c:hline(7 - half, y, half * 2, C(240, 110, 40))
    end
    c:hline(4, 7, 6, C(240, 240, 240)); c:hline(3, 10, 8, C(240, 240, 240))
    c:outline()
    return c
end

-- Paleteira manual (carrinho hidráulico), de lado.
local function paleteira()
    local c = canvas(36, 22)
    c:line(4, 2, 9, 13, S2)                           -- cabo
    c:rect(2, 1, 5, 2, RED)
    c:rect(7, 11, 6, 6, RED)                          -- bomba
    c:hline(7, 11, 6, C(240, 110, 100))
    c:rect(12, 15, 22, 3, S2); c:hline(12, 15, 22, S3)   -- garfos
    c:ellipse(10, 18, 3, 3, N0); c:dot(10, 18, S2)
    c:rect(31, 18, 3, 2, S0)
    c:outline()
    return c
end

-- Caixote de madeira avulso (o das caixas do puzzle é desenhado no código,
-- porque leva escrito o peso).
local function caixote()
    local c = canvas(26, 26)
    c:rect(1, 1, 24, 5, M3); c:hline(1, 1, 24, C(206, 168, 112))
    c:rect(1, 6, 24, 19, M2)
    c:hline(1, 12, 24, M1); c:hline(1, 18, 24, M1)
    c:line(2, 7, 24, 24, M1)
    c:vline(1, 6, 19, M1); c:vline(24, 6, 19, M0)
    c:outline()
    return c
end

save("estante_caixas", estante({ "caixas", "caixas" }))
save("estante_barris", estante({ "caixas", "barris" }))
save("estante_sacos", estante({ "sacos", "caixas" }))
save("estante_vazia", estanteVazia())
save("esteira", esteira())
save("descarte", descarte())
save("painel_pistao", painelPistao())
save("console_guindaste", consoleGuindaste())
save("empilhadeira", empilhadeira())
save("pallet_caixas", palletCaixas())
save("pallets_vazios", palletsVazios())
save("tambores", tambores())
save("cone", cone())
save("paleteira", paleteira())
save("caixote", caixote())

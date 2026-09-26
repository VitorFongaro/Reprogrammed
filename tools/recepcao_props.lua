-- Gera os objetos da RECEPÇÃO (cap2-recepcao), o térreo da Elysium.
--
-- Mesmo estilo dos props de servidor (tools/servidores.py): 3/4 top-down com
-- faces ALINHADAS AOS EIXOS (face de cima logo acima da frente, sem diagonal),
-- contorno preto de 1px e paleta fechada, desenhado em tamanho NATIVO e salvo
-- em 2x com vizinho-mais-próximo. O .aseprite sai junto, também em 2x, para dar
-- para retocar na mão.
--
-- A paleta muda de propósito: o térreo é o primeiro lugar "limpo" do jogo —
-- tampo claro, azul-marinho corporativo, verde de planta — contra o cinza de
-- porão do capítulo 1. O ciano do jogo continua sendo o acento.
--
-- Uso (caminho do Aseprite é local de cada dev):
--   <aseprite> -b -script tools/recepcao_props.lua
--   <aseprite> -b -script-param out=<pasta> -script tools/recepcao_props.lua

local pc = app.pixelColor
local SCALE = 2

local OUT_DIR = app.params["out"]
if not OUT_DIR or OUT_DIR == "" then
    OUT_DIR = app.fs.joinPath(app.fs.filePath(app.fs.normalizePath(debug.getinfo(1, "S").source:sub(2))),
        "..", "client", "assets", "images", "recepcao", "props")
end
app.fs.makeAllDirectories(OUT_DIR)

-- Sorteio determinístico (folhas das plantas): rodar de novo dá o mesmo PNG.
math.randomseed(7)

local function C(r, g, b, a) return pc.rgba(r, g, b, a or 255) end

-- --- Paleta ------------------------------------------------------------------
local OUT = C(0, 0, 0)
-- aço / metal escovado
local S0, S1, S2, S3, S4, S5 = C(38, 40, 48), C(66, 70, 82), C(102, 108, 122), C(140, 148, 164), C(188, 194, 206), C(228, 232, 238)
-- azul-marinho corporativo
local N0, N1, N2 = C(22, 26, 38), C(34, 40, 58), C(50, 58, 82)
-- tampo claro (pedra polida)
local W1, W2, W3 = C(170, 174, 184), C(206, 210, 218), C(236, 238, 242)
local CYAN, CYAN_DIM = C(74, 214, 255), C(40, 120, 150)
local AMBER, RED, GREEN = C(255, 200, 36), C(255, 69, 69), C(81, 227, 107)
-- estofado
local F0, F1, F2, F3 = C(34, 56, 64), C(52, 84, 96), C(72, 112, 126), C(98, 142, 156)
-- folhagem
local G0, G1, G2, G3 = C(26, 60, 40), C(40, 92, 58), C(62, 130, 76), C(98, 172, 98)
local SOIL = C(48, 36, 28)
-- vaso
local P0, P1, P2 = C(40, 42, 52), C(64, 68, 82), C(92, 98, 116)
-- vidro (translúcido)
local GLASS, GLASS_EDGE = C(120, 200, 235, 110), C(170, 232, 255, 210)

-- --- Tela nativa ---------------------------------------------------------------
local Canvas = {}
Canvas.__index = Canvas

local function canvas(w, h)
    local img = Image(w, h, ColorMode.RGB)
    img:clear(pc.rgba(0, 0, 0, 0))
    return setmetatable({ w = w, h = h, img = img }, Canvas)
end

function Canvas:dot(x, y, col)
    if x >= 0 and y >= 0 and x < self.w and y < self.h then
        self.img:drawPixel(x, y, col)
    end
end

function Canvas:rect(x, y, w, h, col)
    for j = y, y + h - 1 do
        for i = x, x + w - 1 do self:dot(i, j, col) end
    end
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

function Canvas:opaque(x, y)
    if x < 0 or y < 0 or x >= self.w or y >= self.h then return false end
    return pc.rgbaA(self.img:getPixel(x, y)) > 0
end

-- Contorno de 1px por fora de tudo que já foi desenhado. Chame ANTES de pintar
-- vidro: vidro não leva contorno preto, leva a própria borda clara.
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

-- Moita de folhas: vários tufos sobrepostos, do escuro para o claro, com o
-- brilho puxado para cima-esquerda (a luz do jogo vem de lá).
function Canvas:foliage(x, y, w, h, n)
    local tufts = {}
    for _ = 1, n do
        tufts[#tufts + 1] = { x + math.random(0, w - 1), y + math.random(0, h - 1), math.random(2, 4), math.random(2, 3) }
    end
    for _, t in ipairs(tufts) do self:ellipse(t[1], t[2], t[3] + 1, t[4] + 1, G0) end
    for _, t in ipairs(tufts) do self:ellipse(t[1], t[2], t[3], t[4], G1) end
    for _, t in ipairs(tufts) do self:ellipse(t[1] - 1, t[2] - 1, t[3] - 1, t[4] - 1, G2) end
    for _, t in ipairs(tufts) do self:dot(t[1] - 2, t[2] - 2, G3) end
end

-- Salva em 2x: .png para o jogo e .aseprite para retoque.
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
    print(string.format("%-18s %3dx%-3d nativo -> %dx%d", name, cv.w, cv.h, cv.w * SCALE, cv.h * SCALE))
end

-- =============================================================================
-- BALCÃO DA RECEPÇÃO — 100x48. A recepcionista ficaria do lado de trás (norte),
-- então dos monitores só se vê o verso; a frente é o lado do visitante.
-- =============================================================================
local function balcao()
    local c = canvas(100, 48)
    -- versos dos monitores
    for _, mx in ipairs({ 16, 66 }) do
        c:rect(mx, 1, 18, 10, S1)
        c:hline(mx, 1, 18, S2)
        c:rect(mx + 7, 11, 4, 2, S0)
        c:dot(mx + 15, 3, CYAN)                  -- LED de ligado
    end
    -- tampo
    c:rect(1, 12, 98, 9, W2)
    c:hline(1, 12, 98, W3)
    c:hline(1, 20, 98, W1)
    -- pilha de papel e a campainha
    c:rect(40, 13, 8, 5, W3)
    c:hline(40, 17, 8, W1)
    c:ellipse(56, 15, 2, 1, AMBER)
    c:dot(55, 14, W3)
    -- frente azul-marinho, faixa de LED e painéis
    c:rect(1, 21, 98, 26, N1)
    c:hline(1, 21, 98, N2)
    c:hline(3, 23, 94, CYAN)
    for x = 17, 83, 16 do c:vline(x, 25, 19, N0) end
    c:rect(1, 44, 98, 3, N0)
    -- emblema da Elysium (losango com asas) no painel do meio
    c:ellipse(50, 33, 2, 4, CYAN_DIM)
    c:dot(50, 33, CYAN)
    c:hline(40, 33, 7, CYAN_DIM)
    c:hline(54, 33, 7, CYAN_DIM)
    c:hline(42, 32, 4, CYAN_DIM)
    c:hline(55, 32, 4, CYAN_DIM)
    c:outline()
    return c
end

-- =============================================================================
-- CATRACA — 30x50. Pedestal comprido no sentido da passagem (leste-oeste) e, na
-- FECHADA, a aba de vidro atravessando a pista logo ao sul dele até o próximo
-- pedestal. Empilhadas de 48 em 48 (nativo), as pistas ficam entre elas.
-- As três versões têm o MESMO tamanho: a sala só troca a textura ao liberar.
-- =============================================================================
local function catraca(fechada, aba)
    local c = canvas(30, 50)
    -- face de cima do pedestal
    c:rect(1, 1, 28, 8, S4)
    c:hline(1, 1, 28, S5)
    -- leitor de crachá: moldura escura com a faixa acesa
    c:rect(3, 3, 7, 4, N0)
    c:hline(4, 5, 5, fechada and CYAN or GREEN)
    -- frente do pedestal
    c:rect(1, 9, 28, 14, S2)
    c:hline(1, 9, 28, S3)
    c:rect(1, 20, 28, 3, S1)
    -- visor de status: X vermelho travado, seta verde liberado
    c:rect(19, 11, 8, 7, N0)
    if fechada then
        for k = 0, 4 do
            c:dot(21 + k, 12 + k, RED)
            c:dot(25 - k, 12 + k, RED)
        end
    else
        c:hline(20, 14, 6, GREEN)
        c:dot(24, 13, GREEN); c:dot(24, 15, GREEN)
        c:dot(23, 12, GREEN); c:dot(23, 16, GREEN)
    end
    c:outline()
    if fechada and aba then
        -- aba de vidro: sai do pedestal e fecha a pista até o próximo
        c:rect(13, 23, 4, 26, GLASS)
        c:vline(13, 23, 26, GLASS_EDGE)
        c:hline(13, 23, 4, GLASS_EDGE)
        c:vline(16, 23, 26, C(120, 200, 235, 160))
    end
    return c
end

-- =============================================================================
-- FLOREIRA — 22x74. Canteiro comprido no sentido norte-sul: é a divisória entre
-- o saguão público e a área interna, dos dois lados das catracas.
-- =============================================================================
local function floreira()
    local c = canvas(22, 74)
    c:rect(1, 1, 20, 63, S3)                     -- borda do canteiro
    c:rect(3, 3, 16, 59, SOIL)
    c:foliage(4, 4, 14, 56, 26)
    c:rect(1, 64, 20, 9, S2)                     -- frente de concreto
    c:hline(1, 64, 20, S4)
    c:hline(1, 72, 20, S1)
    c:outline()
    return c
end

-- =============================================================================
-- SOFÁ de espera (3 lugares, virado para o sul) — 64x30.
-- =============================================================================
local function sofa()
    local c = canvas(64, 30)
    c:rect(1, 1, 62, 10, F1)                     -- encosto
    c:hline(1, 1, 62, F3)
    c:hline(1, 2, 62, F2)
    for _, x in ipairs({ 22, 42 }) do c:vline(x, 3, 8, F0) end
    for _, x in ipairs({ 1, 56 }) do             -- braços
        c:rect(x, 3, 7, 24, F2)
        c:hline(x, 3, 7, F3)
        c:rect(x, 20, 7, 7, F1)
    end
    c:rect(8, 11, 48, 9, F2)                     -- assento
    c:hline(8, 11, 48, F3)
    for _, x in ipairs({ 24, 40 }) do c:vline(x, 11, 9, F1) end
    c:rect(8, 20, 48, 7, F1)                     -- frente do assento
    c:hline(1, 26, 62, F0)
    c:rect(3, 27, 2, 2, S0); c:rect(59, 27, 2, 2, S0)
    c:outline()
    return c
end

-- POLTRONA — 28x30, o mesmo sofá com um lugar só.
local function poltrona()
    local c = canvas(28, 30)
    c:rect(1, 1, 26, 10, F1)
    c:hline(1, 1, 26, F3)
    c:hline(1, 2, 26, F2)
    for _, x in ipairs({ 1, 20 }) do
        c:rect(x, 3, 7, 24, F2)
        c:hline(x, 3, 7, F3)
        c:rect(x, 20, 7, 7, F1)
    end
    c:rect(8, 11, 12, 9, F2)
    c:hline(8, 11, 12, F3)
    c:rect(8, 20, 12, 7, F1)
    c:hline(1, 26, 26, F0)
    c:rect(3, 27, 2, 2, S0); c:rect(23, 27, 2, 2, S0)
    c:outline()
    return c
end

-- MESA DE CENTRO de vidro com revistas — 36x20.
local function mesaCentro()
    local c = canvas(36, 20)
    c:rect(1, 1, 34, 9, C(150, 186, 204))       -- tampo de vidro (opaco: é chão por baixo)
    c:hline(1, 1, 34, C(206, 232, 244))
    for k = 0, 5 do c:dot(24 + k, 2 + k, C(206, 232, 244)) end   -- reflexo
    c:rect(5, 3, 8, 5, C(170, 72, 72))           -- revistas
    c:hline(5, 3, 8, C(214, 110, 100))
    c:rect(14, 4, 7, 4, C(70, 110, 170))
    c:hline(14, 4, 7, C(110, 150, 210))
    c:rect(1, 10, 34, 2, S1)                     -- espessura
    c:rect(3, 12, 2, 7, S2); c:rect(31, 12, 2, 7, S2)
    c:rect(5, 15, 26, 2, S1)                     -- prateleira de baixo
    c:outline()
    return c
end

-- VASO com ficus — 22x42.
local function vasoPlanta()
    local c = canvas(22, 42)
    c:foliage(4, 3, 14, 24, 16)
    c:vline(11, 24, 6, C(78, 58, 40))            -- tronco
    c:ellipse(11, 30, 8, 2, P2)                  -- boca do vaso
    c:ellipse(11, 30, 6, 1, SOIL)
    c:rect(4, 31, 15, 9, P1)
    c:vline(5, 31, 9, P2)
    c:hline(4, 39, 15, P0)
    c:outline()
    return c
end

-- BEBEDOURO de galão — 16x36.
local function bebedouro()
    local c = canvas(16, 36)
    c:rect(4, 1, 8, 11, C(90, 160, 220))         -- galão
    c:vline(5, 2, 8, C(160, 214, 250))
    c:hline(4, 1, 8, C(130, 190, 240))
    c:rect(6, 11, 4, 2, S2)                      -- gargalo
    c:rect(2, 13, 12, 3, S4)                     -- tampo
    c:hline(2, 13, 12, S5)
    c:rect(2, 16, 12, 18, S3)                    -- corpo
    c:vline(2, 16, 18, S4)
    c:dot(5, 18, RED); c:dot(10, 18, CYAN)       -- torneiras
    c:rect(4, 22, 8, 2, S1)                      -- aparador de gotas
    c:hline(2, 33, 12, S1)
    c:outline()
    return c
end

-- TOTEM de informação (tela virada para o visitante) — 22x44.
local function totem()
    local c = canvas(22, 44)
    c:rect(1, 1, 20, 30, N1)                     -- moldura
    c:hline(1, 1, 20, N2)
    c:rect(3, 4, 16, 24, C(14, 28, 40))          -- tela
    c:rect(3, 4, 16, 3, CYAN_DIM)                -- barra de título
    c:dot(10, 5, CYAN); c:dot(11, 5, CYAN)
    for k, w in ipairs({ 12, 9, 13, 7, 10 }) do c:hline(5, 8 + k * 3, w, CYAN_DIM) end
    c:rect(5, 24, 5, 2, CYAN)                    -- botão "toque aqui"
    c:rect(8, 31, 6, 8, S2)                      -- haste
    c:vline(8, 31, 8, S3)
    c:rect(3, 39, 16, 4, S1)                     -- pé
    c:hline(3, 39, 16, S3)
    c:outline()
    return c
end

-- LIXEIRA de aço — 12x16.
local function lixeira()
    local c = canvas(12, 16)
    c:rect(2, 4, 8, 10, S2)
    c:vline(3, 4, 10, S3)
    c:hline(2, 13, 8, S1)
    c:ellipse(6, 3, 4, 2, S3)
    c:ellipse(6, 3, 3, 1, S0)
    c:outline()
    return c
end

-- POSTO DA SEGURANÇA: mesa com dois monitores de câmera virados para o salão
-- (o vigia fica de pé ao lado) — 48x34.
local function mesaSeguranca()
    local c = canvas(48, 34)
    for _, mx in ipairs({ 5, 26 }) do
        c:rect(mx, 1, 17, 12, S0)
        c:rect(mx + 1, 2, 15, 9, C(26, 52, 44))
        c:hline(mx + 2, 4, 9, C(60, 120, 90))
        c:hline(mx + 2, 7, 12, C(60, 120, 90))
        c:dot(mx + 13, 3, RED)                   -- "REC"
        c:rect(mx + 7, 13, 3, 1, S1)
    end
    c:rect(1, 14, 46, 7, S3)                     -- tampo
    c:hline(1, 14, 46, S4)
    c:rect(1, 21, 46, 11, S1)                    -- frente
    c:hline(1, 21, 46, S2)
    c:rect(6, 24, 3, 3, RED)                     -- botão de alarme
    c:dot(40, 25, AMBER); c:dot(42, 25, GREEN)
    c:hline(1, 31, 46, S0)
    c:outline()
    return c
end

save("balcao_recepcao", balcao())
save("catraca_fechada", catraca(true, true))
-- a ÚLTIMA da fileira não tem pista embaixo: travada, mas sem aba
save("catraca_travada", catraca(true, false))
save("catraca_aberta", catraca(false, false))
save("floreira", floreira())
save("sofa_espera", sofa())
save("poltrona_espera", poltrona())
save("mesa_centro", mesaCentro())
save("vaso_ficus", vasoPlanta())
save("bebedouro", bebedouro())
save("totem_info", totem())
save("lixeira", lixeira())
save("mesa_seguranca", mesaSeguranca())

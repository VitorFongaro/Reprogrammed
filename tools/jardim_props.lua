-- Gera os objetos do JARDIM DE INVERNO (cap2-jardim), a estufa do térreo.
--
-- Mesmo estilo dos props da recepção (tools/recepcao_props.lua): 3/4 top-down
-- com faces alinhadas aos eixos, contorno preto de 1px, paleta fechada, nativo
-- salvo em 2x com vizinho-mais-próximo (o .aseprite sai junto, em 2x).
--
-- As PLANTAS são o centro da sala: cada canteiro é um caso de teste do puzzle
-- de irrigação (gerado pela IA) e a planta mostra o resultado. Três espécies,
-- cada uma em três estados com o MESMO tamanho, para a sala só trocar a textura:
--   _ok          regada na medida (ou deixada seca quando já tinha água);
--   _seca        precisava de água e não recebeu: amarela, murcha;
--   _encharcada  recebeu sem precisar: escura, caída, com poça na terra.
--
-- Uso (caminho do Aseprite é local de cada dev):
--   <aseprite> -b -script tools/jardim_props.lua
--   <aseprite> -b -script-param out=<pasta> -script tools/jardim_props.lua

local pc = app.pixelColor
local SCALE = 2

local OUT_DIR = app.params["out"]
if not OUT_DIR or OUT_DIR == "" then
    OUT_DIR = app.fs.joinPath(app.fs.filePath(app.fs.normalizePath(debug.getinfo(1, "S").source:sub(2))),
        "..", "client", "assets", "images", "jardim", "props")
end
app.fs.makeAllDirectories(OUT_DIR)

math.randomseed(11)

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

-- =============================================================================
-- CANTEIRO — 52x24. Caixa de madeira com a terra por cima; a planta é um
-- sprite à parte, plantado no meio da terra (a sala troca só ela).
-- =============================================================================
local function canteiro()
    local c = canvas(52, 24)
    c:rect(1, 1, 50, 9, M2)                      -- borda de cima da caixa
    c:hline(1, 1, 50, M3)
    c:rect(4, 3, 44, 6, T1)                      -- terra
    for _ = 1, 40 do c:dot(math.random(5, 46), math.random(3, 8), math.random() < 0.5 and T0 or T2) end
    c:hline(4, 3, 44, T0)
    c:rect(1, 10, 50, 13, M1)                    -- frente: tábuas
    c:hline(1, 10, 50, M2)
    c:hline(1, 15, 50, M0)
    c:hline(1, 16, 50, M2)
    for _, x in ipairs({ 1, 50 }) do c:vline(x, 10, 13, M0) end
    c:rect(10, 18, 2, 2, S2); c:rect(40, 18, 2, 2, S2)   -- pregos
    c:hline(1, 22, 50, M0)
    c:outline()
    return c
end

-- Poça na terra (só nas encharcadas), na base do sprite da planta.
local function puddle(c, cx, by)
    c:ellipse(cx, by - 1, 9, 2, W0)
    c:ellipse(cx - 1, by - 1, 7, 1, W1)
    c:dot(cx - 4, by - 2, W2); c:dot(cx + 3, by - 1, W2)
end

-- Gotas que escorrem das folhas (encharcadas).
local function drips(c, list)
    for _, d in ipairs(list) do
        c:dot(d[1], d[2], W2); c:dot(d[1], d[2] + 1, W1)
    end
end

-- =============================================================================
-- SAMAMBAIA — 28x30. Frondes em arco saindo do centro.
-- =============================================================================
local function samambaia(estado)
    local c = canvas(28, 30)
    local pal, bend, n, len = { G0, G1, G2, G3 }, 1.5, 9, 15
    if estado == "seca" then pal, bend, n, len = { Y0, Y1, Y2, Y2 }, 2.6, 7, 11 end
    if estado == "encharcada" then pal, bend, n, len = { D0, D1, D2, D2 }, 3.0, 8, 14 end
    local cx, by = 14, 27
    for k = 1, n do
        -- ângulo a partir da vertical: as do meio sobem, as das pontas abrem;
        -- cada fronde vai curvando para fora (e para baixo, quanto mais murcha)
        local a = -1.15 + 2.3 * (k - 1) / (n - 1)
        local side = a < 0 and -1 or 1
        local x, y = cx, by - 2
        local steps = len - math.floor(math.abs(a) * 3)
        for st = 1, steps do
            local t = st / steps
            local th = a + side * bend * t * t
            x = x + math.sin(th)
            y = y - math.cos(th)
            local px, py = math.floor(x + 0.5), math.floor(y + 0.5)
            c:dot(px, py, pal[2])
            if st % 2 == 0 and st < steps - 1 and st > 2 then
                -- folíolos dos dois lados da haste
                c:dot(px - 1, py, pal[3]); c:dot(px + 1, py, pal[1])
                c:dot(px, py - 1, pal[3])
            end
            if st == steps then c:dot(px, py, pal[4]) end
        end
    end
    c:ellipse(cx, by - 1, 4, 1, pal[1])
    if estado == "encharcada" then
        puddle(c, cx, by + 1)
        drips(c, { { 5, 21 }, { 22, 22 }, { 9, 25 } })
    end
    if estado == "seca" then
        c:dot(4, by, Y1); c:dot(23, by + 1, Y0); c:dot(19, by, Y1)     -- folhas caídas
    end
    c:outline()
    return c
end

-- =============================================================================
-- CACTO — 22x30. Coluna com dois braços, espinhos e uma flor rosa.
-- =============================================================================
local function cacto(estado)
    local c = canvas(22, 30)
    local body, light, dark = G2, G3, G1
    if estado == "seca" then body, light, dark = Y1, Y2, Y0 end
    if estado == "encharcada" then body, light, dark = D2, D2, D0 end
    local cx, by = 11, 28
    local top = estado == "seca" and 8 or 4
    local half = estado == "encharcada" and 4 or 3
    -- tronco
    c:rect(cx - half, top, half * 2 + 1, by - top - 1, body)
    c:vline(cx - half + 1, top + 1, by - top - 3, light)
    c:vline(cx + half, top + 1, by - top - 2, dark)
    c:ellipse(cx, top, half, 2, body)
    -- braços
    if estado ~= "seca" then
        c:rect(cx - half - 4, 13, 3, 6, body); c:rect(cx - half - 4, 18, 5, 2, body); c:dot(cx - half - 3, 13, light)
        c:rect(cx + half + 2, 10, 3, 7, body); c:rect(cx + half - 1, 16, 5, 2, body); c:dot(cx + half + 3, 10, light)
    else
        c:rect(cx - half - 3, 17, 3, 3, body)    -- braço murcho, caído
        c:dot(cx - half - 4, 20, dark)
    end
    -- sulcos e espinhos
    for y = top + 2, by - 3, 3 do
        c:dot(cx, y, dark)
        c:dot(cx - half - 1, y, S4); c:dot(cx + half + 1, y + 1, S4)
    end
    if estado == "ok" then
        c:ellipse(cx, top - 1, 2, 1, PINK)         -- flor
        c:dot(cx, top - 2, PINK_D); c:dot(cx - 1, top - 1, C(255, 190, 220))
    end
    if estado == "encharcada" then
        -- podridão: manchas marrons subindo da base
        for _, m in ipairs({ { cx - 2, by - 4 }, { cx + 2, by - 6 }, { cx, by - 9 }, { cx - 3, by - 11 } }) do
            c:dot(m[1], m[2], M1); c:dot(m[1] + 1, m[2], M0)
        end
        puddle(c, cx, by)
    end
    c:outline()
    return c
end

-- =============================================================================
-- ORQUÍDEA — 24x30. Folhas largas em roseta e uma haste curva com flores.
-- =============================================================================
local function orquidea(estado)
    local c = canvas(24, 30)
    local leaf, leafL, leafD = G2, G3, G1
    if estado == "seca" then leaf, leafL, leafD = Y1, Y2, Y0 end
    if estado == "encharcada" then leaf, leafL, leafD = D1, D2, D0 end
    local cx, by = 12, 28
    -- folhas
    for _, f in ipairs({ { -7, -2 }, { 7, -2 }, { -5, -4 }, { 5, -5 } }) do
        local dy = estado == "ok" and 0 or 2
        c:ellipse(cx + f[1] // 1, by + f[2] + dy, 5, 2, leaf)
        c:hline(cx + f[1] - 3, by + f[2] + dy - 1, 5, leafL)
    end
    c:ellipse(cx, by - 3, 3, 2, leafD)
    -- haste
    local tip = estado == "ok" and { 17, 5 } or { 19, 12 }
    c:line(cx, by - 5, cx + 1, 12, S1)
    c:line(cx + 1, 12, tip[1], tip[2], S1)
    if estado == "ok" then
        for _, fl in ipairs({ { 14, 6 }, { 17, 9 }, { 11, 9 }, { 15, 13 } }) do
            c:ellipse(fl[1], fl[2], 2, 2, LILAC)
            c:dot(fl[1] - 1, fl[2] - 1, LILAC_L)
            c:dot(fl[1], fl[2], LILAC_D)
            c:dot(fl[1], fl[2] + 1, AMBER)
        end
    else
        -- flores caídas na terra
        c:dot(5, by - 1, estado == "seca" and Y0 or LILAC_D)
        c:dot(19, by, estado == "seca" and M1 or LILAC_D)
        c:dot(20, 13, estado == "seca" and Y0 or LILAC_D)
    end
    if estado == "encharcada" then
        puddle(c, cx, by)
        drips(c, { { 4, 26 }, { 20, 25 } })
    end
    c:outline()
    return c
end

-- =============================================================================
-- PAINEL DA IRRIGAÇÃO — 32x44. Armário com a tela da gota e o registro.
-- =============================================================================
local function painel()
    local c = canvas(32, 44)
    c:rect(2, 1, 28, 5, S3)                      -- tampo
    c:hline(2, 1, 28, S4)
    c:rect(2, 6, 28, 36, S1)                     -- corpo
    c:hline(2, 6, 28, S2)
    c:rect(5, 9, 22, 14, N0)                     -- tela
    c:ellipse(12, 16, 3, 4, CYAN_DIM)            -- gota
    c:ellipse(12, 17, 2, 3, CYAN)
    c:dot(12, 11, CYAN)
    c:hline(18, 13, 6, CYAN_DIM); c:hline(18, 16, 4, CYAN_DIM); c:hline(18, 19, 6, CYAN)
    c:ellipse(16, 30, 4, 4, S2)                  -- registro (volante)
    c:ellipse(16, 30, 2, 2, S0)
    c:hline(11, 30, 11, S3); c:vline(16, 25, 11, S3)
    c:rect(6, 37, 3, 2, GREEN); c:rect(23, 37, 3, 2, AMBER)
    c:rect(13, 42, 6, 2, S0)                     -- cano saindo por baixo
    c:hline(2, 41, 28, S0)
    c:outline()
    return c
end

-- =============================================================================
-- BICO DE IRRIGAÇÃO — 10x8: a cabeça do aspersor na ponta do cano.
-- =============================================================================
local function bico()
    local c = canvas(10, 8)
    c:rect(4, 0, 2, 3, C(196, 124, 74))
    c:rect(1, 3, 8, 3, S3)
    c:hline(1, 3, 8, S4)
    for x = 2, 7, 2 do c:dot(x, 5, S0) end
    c:outline()
    return c
end

-- =============================================================================
-- Decoração.
-- =============================================================================
local function banco()
    local c = canvas(46, 24)
    c:rect(2, 2, 42, 6, M2)                      -- encosto
    c:hline(2, 2, 42, M3); c:hline(2, 5, 42, M1)
    c:rect(1, 9, 44, 6, M3)                      -- assento
    c:hline(1, 9, 44, C(176, 132, 90)); c:hline(1, 12, 44, M2)
    c:rect(1, 15, 44, 2, M1)
    for _, x in ipairs({ 3, 40 }) do c:rect(x, 17, 3, 6, S1); c:rect(x, 0, 3, 9, S1) end
    c:outline()
    return c
end

local function chafariz()
    local c = canvas(72, 52)
    c:ellipse(36, 30, 34, 14, P1)                -- borda da bacia
    c:ellipse(36, 29, 34, 13, P2)
    c:ellipse(36, 28, 30, 11, W0)                -- água
    c:ellipse(36, 27, 28, 9, W1)
    for k = 0, 2 do c:ellipse(36, 27, 10 + k * 7, 3 + k * 2, W2) end
    c:ellipse(36, 27, 9 + 0 * 7, 2, W1)
    c:ellipse(36, 27, 16, 4, W1)
    c:ellipse(36, 27, 23, 6, W1)
    c:rect(2, 30, 69, 14, P1)                    -- frente da bacia
    c:ellipse(36, 43, 34, 6, P0)
    c:ellipse(36, 42, 34, 6, P1)
    c:rect(2, 30, 69, 3, P2)
    c:ellipse(36, 30, 34, 3, P2)
    c:ellipse(36, 28, 30, 11, W0)
    c:ellipse(36, 27, 28, 9, W1)
    c:ellipse(36, 27, 18, 5, W2)
    c:ellipse(36, 27, 14, 4, W1)
    c:rect(33, 6, 6, 20, P2)                     -- pilar e o jato
    c:vline(34, 7, 18, P3)
    c:ellipse(36, 6, 6, 2, P3)
    c:vline(36, 0, 6, W2); c:vline(35, 1, 4, W1)
    c:dot(31, 2, W2); c:dot(41, 3, W2); c:dot(29, 6, W1); c:dot(43, 7, W1)
    c:outline()
    return c
end

local function arvoreVaso()
    local c = canvas(40, 62)
    c:rect(17, 30, 5, 18, M1)                    -- tronco
    c:vline(18, 31, 16, M2)
    c:foliage(2, 2, 36, 32, 34, { G0, G1, G2, G3 })
    -- vaso de barro
    c:rect(8, 46, 24, 4, C(150, 84, 58))
    c:hline(8, 46, 24, C(184, 110, 78))
    c:rect(10, 50, 20, 11, C(122, 66, 46))
    c:vline(11, 51, 9, C(150, 84, 58))
    c:hline(10, 60, 20, C(80, 42, 30))
    c:outline()
    return c
end

local function regador()
    local c = canvas(20, 14)
    c:rect(4, 4, 10, 9, C(56, 118, 92))
    c:hline(4, 4, 10, C(86, 160, 124))
    c:line(14, 6, 19, 2, C(56, 118, 92))         -- bico
    c:rect(18, 1, 2, 2, C(86, 160, 124))
    c:line(5, 4, 8, 0, S2); c:line(8, 0, 12, 4, S2)   -- alça
    c:hline(4, 12, 10, C(36, 80, 62))
    c:outline()
    return c
end

local function sacosTerra()
    local c = canvas(30, 22)
    for k, x in ipairs({ 2, 14 }) do
        local y = k == 1 and 6 or 4
        c:rect(x, y, 13, 15, C(150, 130, 96))
        c:hline(x, y, 13, C(184, 164, 122))
        c:rect(x + 3, y + 5, 7, 4, G1)
        c:dot(x + 5, y + 6, G3)
        c:hline(x, y + 14, 13, C(110, 94, 68))
    end
    c:outline()
    return c
end

local function prateleiraMudas()
    local c = canvas(44, 38)
    for _, x in ipairs({ 2, 40 }) do c:rect(x, 0, 2, 37, S1) end
    for _, y in ipairs({ 14, 30 }) do
        c:rect(1, y, 42, 3, S2); c:hline(1, y, 42, S3)
        for x = 5, 36, 8 do
            c:rect(x, y - 5, 6, 5, C(122, 66, 46))
            c:hline(x, y - 5, 6, C(150, 84, 58))
            c:dot(x + 2, y - 7, G2); c:dot(x + 3, y - 8, G3); c:dot(x + 4, y - 7, G1); c:dot(x + 3, y - 6, G1)
        end
    end
    c:outline()
    return c
end

local function vasoFlores()
    local c = canvas(20, 22)
    c:foliage(3, 2, 14, 9, 8, { G0, G1, G2, G3 })
    for _, f in ipairs({ { 6, 4, PINK }, { 12, 3, AMBER }, { 15, 7, LILAC }, { 8, 8, PINK } }) do
        c:ellipse(f[1], f[2], 1, 1, f[3]); c:dot(f[1], f[2], C(255, 240, 200))
    end
    c:rect(5, 12, 10, 9, C(122, 66, 46))
    c:hline(4, 12, 12, C(150, 84, 58))
    c:hline(5, 20, 10, C(80, 42, 30))
    c:outline()
    return c
end

save("canteiro", canteiro())
for _, estado in ipairs({ "ok", "seca", "encharcada" }) do
    save("planta_samambaia_" .. estado, samambaia(estado))
    save("planta_cacto_" .. estado, cacto(estado))
    save("planta_orquidea_" .. estado, orquidea(estado))
end
save("painel_irrigacao", painel())
save("bico_irrigacao", bico())
save("banco_jardim", banco())
save("chafariz", chafariz())
save("arvore_vaso", arvoreVaso())
save("regador", regador())
save("sacos_terra", sacosTerra())
save("prateleira_mudas", prateleiraMudas())
save("vaso_flores", vasoFlores())

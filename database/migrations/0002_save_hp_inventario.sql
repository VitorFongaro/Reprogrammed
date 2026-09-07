-- Save: HP e inventário entram no estado reversível.
--
-- Os dois viviam só no localStorage do cliente, desacoplados do save. O efeito
-- era o jogador salvar com a vida cheia, apanhar até 4 de HP, carregar o save e
-- continuar com 4 — o save "voltava" a sala e os puzzles, mas não a vida. O
-- mesmo valia para os itens: gastava a cura, carregava, e ela não voltava.
--
-- HP e itens são estado de JOGO, então pertencem ao save (reversível), e não ao
-- perfil de aprendizado (monotônico). Ver a seção "Save" do AGENTS.md.
--
-- Efeito colateral bem-vindo: com o inventário no save, carregar um save
-- anterior ao boss também devolve o inventário de antes dele — refazer a luta
-- deixa de ser uma forma de acumular chips de cache.

alter table public.user_game_state
  add column if not exists hp int,
  add column if not exists inventory jsonb not null default '{}'::jsonb;

-- `hp` é nulo para saves antigos (gravados antes desta coluna): o cliente trata
-- nulo como "vida cheia", que é o comportamento antigo e não pune ninguém.
alter table public.user_game_state
  drop constraint if exists check_inventory;

alter table public.user_game_state
  add constraint check_inventory check (jsonb_typeof(inventory) = 'object');

-- ASSUMIDO: dialeto Postgres (ver README.md secao 2). Adaptar se a Performa
-- usar outro banco.
--
-- Esta tabela e a UNICA peca de estado nova que este piloto precisa. Ela
-- serve dois propositos ao mesmo tempo:
--   1. Idempotencia: a constraint UNIQUE(lead_id, category) garante que o
--      mesmo lead nunca dispara duas vezes o mesmo evento de categoria,
--      mesmo que o poll rode mais de uma vez sobre o mesmo estado.
--   2. Auditoria: cada linha e um registro do que foi (ou tentou ser)
--      enviado a Meta, com o resultado - necessario pro Passo 9 do runbook
--      ("documentar qualquer divergencia antes de replicar").

CREATE TABLE IF NOT EXISTS meta_conversion_events (
  id SERIAL PRIMARY KEY,

  -- ID do cliente dentro da Performa (ex: Diagonal). Ver config.ts.
  client_id TEXT NOT NULL,

  -- ID do lead dentro do CRM/Performa (o mesmo ID usado pela normalizacao
  -- de funil existente).
  lead_id TEXT NOT NULL,

  category TEXT NOT NULL CHECK (category IN ('qualificada', 'visita', 'reserva_venda')),

  -- Nome do evento efetivamente enviado a Meta (Lead, Visit, Purchase,
  -- Reservation, Qualified...). Guardado aqui porque o mapeamento categoria
  -- -> evento pode mudar ao longo do tempo (ver categoryMapping.ts) e
  -- precisamos saber o que foi enviado historicamente, nao o mapeamento atual.
  event_name TEXT NOT NULL,

  -- UUID gerado no momento em que o evento e enfileirado, ANTES de chamar a
  -- Meta. Reenvios (por causa de erro de rede, por exemplo) devem reusar o
  -- mesmo event_id em vez de gerar um novo - ver eventStore.ts.
  event_id UUID NOT NULL UNIQUE,

  -- Horario REAL da mudanca de etapa no CRM, nao o horario em que o poll
  -- rodou (o briefing e explicito sobre essa distincao no Passo 2).
  event_time TIMESTAMPTZ NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),

  -- Resposta crua da Meta, para debug quando status = 'failed'.
  http_status INTEGER,
  response_body JSONB,

  -- Preenchido MANUALMENTE apos conferir no Events Manager (Passo 3 do
  -- runbook). A Meta nao expõe isso via API simples - ver README secao 6.
  emq_score NUMERIC,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,

  -- Garante a idempotencia descrita acima: um lead so pode ter UM evento
  -- registrado por categoria, para sempre.
  UNIQUE (lead_id, category)
);

CREATE INDEX IF NOT EXISTS idx_meta_conversion_events_client
  ON meta_conversion_events (client_id);

CREATE INDEX IF NOT EXISTS idx_meta_conversion_events_status
  ON meta_conversion_events (status);

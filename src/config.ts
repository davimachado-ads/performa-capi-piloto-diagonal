// Toda credencial aqui e um PLACEHOLDER TEORICO. Nada disto e um segredo
// real - substitua por variaveis de ambiente de verdade (process.env) na
// hora de portar para o repositorio real da Performa.
//
// Estrutura pensada para o piloto (1 cliente hardcoded) mas ja no formato
// que escala para "credenciais por cliente" quando isso for liberado para
// mais contas - ver README secao 1 (escopo).

export type ClientMetaCredentials = {
  systemUserToken: string;
  datasetId: string;
  // So preenchido durante a fase de validacao (Passo 2/3 do runbook).
  // Remover/deixar undefined antes de considerar o piloto "em producao",
  // porque test_event_code segrega os eventos pra aba de teste do Events
  // Manager em vez de contar como evento real.
  testEventCode?: string;
};

export const DIAGONAL_CLIENT_ID = "[ID_CLIENTE_DIAGONAL_TEORICO]";

// Escopo do piloto: SOMENTE os client_id nesta lista disparam o fluxo de
// pollAndSync.ts. Qualquer outro cliente da Performa e ignorado, mesmo que
// tenha a normalizacao de CRM configurada - e um piloto controlado, nao
// um rollout geral (ver briefing, "Escopo do piloto").
export const PILOT_CLIENT_IDS: readonly string[] = [DIAGONAL_CLIENT_ID];

// ASSUMIDO: em producao (pos-piloto, multi-cliente) isso deveria vir de uma
// tabela `client_meta_credentials` no banco, nao hardcoded no codigo. Para o
// piloto de conta unica, um mapa em memoria e suficiente e mais simples de
// auditar.
export const CLIENT_META_CREDENTIALS: Record<string, ClientMetaCredentials> = {
  [DIAGONAL_CLIENT_ID]: {
    systemUserToken: "[META_SYSTEM_USER_TOKEN_TEORICO]",
    datasetId: "[META_DATASET_ID_TEORICO]",
    testEventCode: "[META_TEST_EVENT_CODE_TEORICO]",
  },
};

export function getCredentials(clientId: string): ClientMetaCredentials {
  const creds = CLIENT_META_CREDENTIALS[clientId];
  if (!creds) {
    throw new Error(
      `Nenhuma credencial Meta configurada para o cliente ${clientId}. ` +
        `Isso e esperado se o cliente nao faz parte do piloto (ver PILOT_CLIENT_IDS).`
    );
  }
  return creds;
}

export const META_API_VERSION = "v24.0";
export const META_GRAPH_BASE_URL = "https://graph.facebook.com";

// ASSUMIDO: connection string do Postgres da Performa. Ver db/schema.sql.
export const DATABASE_URL = "[DATABASE_URL_TEORICO]";

// Passo 4 do runbook, versao automatizada - OPCIONAL.
//
// O briefing descreve este passo como manual (Ads Manager > Todas as
// Ferramentas > Conversoes Personalizadas > Criar). Este script e um
// atalho, nao uma substituicao obrigatoria - rode o manual primeiro se
// quiser validar visualmente antes de automatizar.
//
// ATENCAO (nivel de confianca menor que o resto do pacote): o endpoint
// /customconversions e usado com bem menos frequencia que /events, e o
// formato exato do campo `rule` ja mudou entre versoes da Marketing API no
// passado. CONFIRME os campos obrigatorios na documentacao oficial da
// versao em uso antes de rodar isto de verdade:
// https://developers.facebook.com/docs/marketing-api/reference/custom-conversion/

import { DIAGONAL_CLIENT_ID, META_API_VERSION, META_GRAPH_BASE_URL, getCredentials } from "../src/config";
import { MetaCapiEventName } from "../src/types";

// ASSUMIDO: ID da conta de anuncios da Diagonal (act_XXXXXXXXX), diferente
// do Dataset ID usado em metaCapiClient.ts.
const DIAGONAL_AD_ACCOUNT_ID = "[META_AD_ACCOUNT_ID_TEORICO]";

type CustomConversionSpec = {
  name: string;
  eventName: MetaCapiEventName;
};

// Uma Conversao Personalizada por categoria, conforme o briefing sugere
// ("repetir para as tres categorias, se fizer sentido reportar cada uma
// separadamente").
const CONVERSIONS_TO_CREATE: CustomConversionSpec[] = [
  { name: "Diagonal - Qualificada", eventName: "Lead" },
  { name: "Diagonal - Visita", eventName: "Visit" },
  { name: "Diagonal - Reserva/Venda", eventName: "Purchase" },
];

async function createCustomConversion(
  accessToken: string,
  spec: CustomConversionSpec
): Promise<unknown> {
  const url = `${META_GRAPH_BASE_URL}/${META_API_VERSION}/act_${DIAGONAL_AD_ACCOUNT_ID}/customconversions`;

  const body = {
    name: spec.name,
    custom_event_type: "OTHER",
    rule: JSON.stringify({ and: [{ event: { eq: spec.eventName } }] }),
    access_token: accessToken,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Falha ao criar '${spec.name}': HTTP ${res.status} - ${JSON.stringify(json)}`);
  }
  return json;
}

async function main() {
  const credentials = getCredentials(DIAGONAL_CLIENT_ID);

  for (const spec of CONVERSIONS_TO_CREATE) {
    try {
      const result = await createCustomConversion(credentials.systemUserToken, spec);
      console.log(`[create-custom-conversions] criada: ${spec.name}`, result);
    } catch (err) {
      console.error(`[create-custom-conversions] erro em ${spec.name}:`, err);
    }
  }

  console.log(
    "\nConfira no Ads Manager > Todas as Ferramentas > Conversoes Personalizadas " +
      "se as 3 aparecem e se estao disponiveis para selecao nas colunas de relatorio."
  );
}

main();

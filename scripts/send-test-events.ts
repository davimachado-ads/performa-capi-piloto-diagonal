// Passo 2 do runbook: manda 1 evento de teste por categoria
// (Qualificada / Visita / Reserva-Venda) usando test_event_code, pra
// confirmar no Events Manager (Passo 3) que o formato do payload esta
// correto ANTES de deixar o poll de producao (run-daily-poll.ts) rodar
// sobre leads reais.
//
// Estes eventos usam dados FICTICIOS (nao sao leads reais) e
// propositalmente NAO passam pelo eventStore - test_event_code ja separa
// eles na aba "Testar Eventos" do Events Manager, entao nao precisam de
// idempotencia nem poluem a tabela de auditoria de producao.
//
// Rodar manualmente uma vez, nao faz parte do scheduler de 24h.

import { randomUUID } from "crypto";
import { DIAGONAL_CLIENT_ID, getCredentials } from "../src/config";
import { hashEmail, hashPhone } from "../src/hashing";
import { sendConversionEvent } from "../src/metaCapiClient";
import { ConversionEvent, NormalizedCategory } from "../src/types";
import { mapCategoryToEvent } from "../src/categoryMapping";

const TEST_LEAD_EMAIL = "teste.piloto.diagonal@exemplo.com";
const TEST_LEAD_PHONE = "11999999999"; // formato bruto, normalizado por hashPhone

// Tipado explicitamente sem "desqualificada" - essa categoria nunca gera
// evento (ver categoryMapping.ts) e o TypeScript precisa saber disso aqui
// para o objeto ConversionEvent mais abaixo tipar certo.
const TEST_CATEGORIES: Exclude<NormalizedCategory, "desqualificada">[] = [
  "qualificada",
  "visita",
  "reserva_venda",
];

async function main() {
  const credentials = getCredentials(DIAGONAL_CLIENT_ID);

  if (!credentials.testEventCode) {
    throw new Error(
      "META_TEST_EVENT_CODE_TEORICO nao configurado - pegue o codigo em " +
        "Events Manager da Diagonal > aba 'Testar Eventos' e preencha em config.ts."
    );
  }

  for (const category of TEST_CATEGORIES) {
    const mapping = mapCategoryToEvent({
      leadId: `teste-piloto-${category}`,
      clientId: DIAGONAL_CLIENT_ID,
      category,
      categoryChangedAt: new Date(),
      email: TEST_LEAD_EMAIL,
      phone: TEST_LEAD_PHONE,
      // Para o teste de "reserva_venda" simular COM valor, pra validar o
      // branch de custom_data tambem (ver categoryMapping.ts).
      dealValue: category === "reserva_venda" ? 350000 : undefined,
      dealCurrency: category === "reserva_venda" ? "BRL" : undefined,
    });

    const event: ConversionEvent = {
      eventId: randomUUID(),
      clientId: DIAGONAL_CLIENT_ID,
      leadId: `teste-piloto-${category}`,
      category,
      eventName: mapping.eventName,
      eventTimeUnixSeconds: Math.floor(Date.now() / 1000),
      userData: {
        emailHash: hashEmail(TEST_LEAD_EMAIL),
        phoneHash: hashPhone(TEST_LEAD_PHONE),
      },
      customData: mapping.customData,
    };

    const result = await sendConversionEvent(
      credentials.datasetId,
      credentials.systemUserToken,
      event,
      credentials.testEventCode
    );

    console.log(
      `[send-test-events] categoria=${category} evento=${mapping.eventName} ` +
        `sucesso=${result.success} http=${result.httpStatus}`
    );
    if (!result.success) {
      console.error(`[send-test-events] resposta da Meta:`, result.body);
    }
  }

  console.log(
    "\nAgora confira no Events Manager da Diagonal (aba 'Testar Eventos') " +
      "se os 3 eventos apareceram com o event_name correto, e anote o EMQ " +
      "de cada um na tabela meta_conversion_events (Passo 6 do runbook)."
  );
}

main();

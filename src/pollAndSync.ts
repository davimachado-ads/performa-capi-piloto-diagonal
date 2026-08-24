// O coracao do piloto: le o estado normalizado atual dos leads de um
// cliente, filtra o que interessa, e envia para a Meta o que ainda nao foi
// enviado. Pensado para ser chamado uma vez por execucao do scheduler de
// 24h (ver scripts/run-daily-poll.ts) - nao mantem estado em memoria entre
// chamadas, tudo que precisa persistir vive em meta_conversion_events.

import { getCredentials, PILOT_CLIENT_IDS } from "./config";
import { EventStore } from "./eventStore";
import { hashEmail, hashPhone } from "./hashing";
import { sendConversionEvent } from "./metaCapiClient";
import { mapCategoryToEvent } from "./categoryMapping";
import { ConversionEvent, NormalizedLeadStatus, TARGET_CATEGORIES } from "./types";

// ============================================================================
// ASSUMIDO (ver README.md secao 2): isto ja existe na Performa como parte da
// normalizacao de CRM descrita no briefing. O contrato abaixo e uma
// suposicao de como essa funcao provavelmente se parece - trocar pela
// chamada real ao modulo existente (provavelmente algo em torno da tela
// "Etapas do funil no CRM" mencionada no briefing).
//
// Import real seria algo como:
//   import { getNormalizedLeadStatuses } from "../funil/normalizacao";
// ============================================================================
declare function getNormalizedLeadStatuses(clientId: string): Promise<NormalizedLeadStatus[]>;

function toConversionEventInput(lead: NormalizedLeadStatus): Omit<ConversionEvent, "eventId"> {
  const mapping = mapCategoryToEvent(lead);

  return {
    clientId: lead.clientId,
    leadId: lead.leadId,
    category: lead.category as Exclude<NormalizedLeadStatus["category"], "desqualificada">,
    eventName: mapping.eventName,
    eventTimeUnixSeconds: Math.floor(lead.categoryChangedAt.getTime() / 1000),
    userData: {
      emailHash: lead.email ? hashEmail(lead.email) : undefined,
      phoneHash: lead.phone ? hashPhone(lead.phone) : undefined,
      fbc: lead.fbc,
      fbp: lead.fbp,
    },
    customData: mapping.customData,
  };
}

export type PollResult = {
  clientId: string;
  leadsEvaluated: number;
  eventsSent: number;
  eventsFailed: number;
  eventsSkipped: number; // ja tinham sido enviados antes
};

export async function pollAndSyncClient(
  clientId: string,
  eventStore: EventStore
): Promise<PollResult> {
  if (!PILOT_CLIENT_IDS.includes(clientId)) {
    throw new Error(
      `Cliente ${clientId} nao esta na lista PILOT_CLIENT_IDS - este piloto ` +
        `so deve rodar para contas explicitamente liberadas (ver config.ts).`
    );
  }

  const credentials = getCredentials(clientId);
  const allLeads = await getNormalizedLeadStatuses(clientId);
  const relevantLeads = allLeads.filter((lead) => TARGET_CATEGORIES.includes(lead.category));

  const result: PollResult = {
    clientId,
    leadsEvaluated: allLeads.length,
    eventsSent: 0,
    eventsFailed: 0,
    eventsSkipped: 0,
  };

  for (const lead of relevantLeads) {
    const alreadySent = await eventStore.hasSentEvent(lead.leadId, lead.category);
    if (alreadySent) {
      result.eventsSkipped++;
      continue;
    }

    const eventInput = toConversionEventInput(lead);
    const eventId = await eventStore.getOrCreatePendingEvent(eventInput);
    const event: ConversionEvent = { ...eventInput, eventId };

    const sendResult = await sendConversionEvent(
      credentials.datasetId,
      credentials.systemUserToken,
      event,
      credentials.testEventCode
    );

    await eventStore.markResult(eventId, sendResult);

    if (sendResult.success) {
      result.eventsSent++;
    } else {
      result.eventsFailed++;
    }
  }

  return result;
}

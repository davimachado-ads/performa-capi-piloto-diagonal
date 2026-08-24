// Cliente HTTP puro para a Meta Conversions API. Nao sabe nada sobre CRM,
// polling ou banco - so recebe um ConversionEvent ja pronto e manda.
//
// Referencia do endpoint: POST /{DATASET_ID}/events
// https://developers.facebook.com/docs/marketing-api/conversions-api/using-the-api

import { META_API_VERSION, META_GRAPH_BASE_URL } from "./config";
import { ConversionEvent, SendResult } from "./types";

type CapiPayload = {
  data: {
    event_name: string;
    event_time: number;
    event_id: string;
    action_source: "system_generated";
    user_data: {
      em?: string[];
      ph?: string[];
      fbc?: string;
      fbp?: string;
    };
    custom_data?: {
      value?: number;
      currency?: string;
    };
  }[];
  test_event_code?: string;
  access_token: string;
};

function buildPayload(event: ConversionEvent, accessToken: string, testEventCode?: string): CapiPayload {
  return {
    data: [
      {
        event_name: event.eventName,
        event_time: event.eventTimeUnixSeconds,
        event_id: event.eventId,
        // Evento originado por integracao server-to-server, nao por
        // interacao direta do usuario no site/app - exatamente o caso do
        // briefing (dado vindo do CRM, nao de um Pixel client-side).
        action_source: "system_generated",
        user_data: {
          // Meta aceita (e recomenda) arrays, mesmo com um unico hash.
          em: event.userData.emailHash ? [event.userData.emailHash] : undefined,
          ph: event.userData.phoneHash ? [event.userData.phoneHash] : undefined,
          fbc: event.userData.fbc,
          fbp: event.userData.fbp,
        },
        custom_data: event.customData,
      },
    ],
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
    access_token: accessToken,
  };
}

export async function sendConversionEvent(
  datasetId: string,
  accessToken: string,
  event: ConversionEvent,
  testEventCode?: string
): Promise<SendResult> {
  const url = `${META_GRAPH_BASE_URL}/${META_API_VERSION}/${datasetId}/events`;
  const payload = buildPayload(event, accessToken, testEventCode);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => null);

  return {
    success: res.ok,
    httpStatus: res.status,
    body,
  };
}

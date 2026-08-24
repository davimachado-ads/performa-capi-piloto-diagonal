// Mapeamento categoria normalizada -> evento Meta, especifico da Diagonal
// (o briefing e explicito que isso e por cliente - outras contas podem
// querer nomes de evento diferentes quando o piloto for replicado).

import { MetaCapiEventName, NormalizedLeadStatus } from "./types";

export type MappingResult = {
  eventName: MetaCapiEventName;
  customData?: { value?: number; currency?: string };
};

// Decisao tomada (ver README secao 2, tabela de suposicoes):
//   - qualificada -> "Lead" (evento PADRAO da Meta, nao customizado).
//     Alternativa deixada em aberto pelo briefing: evento customizado
//     "Qualified". Trocar aqui e a unica mudanca necessaria se a decisao
//     de negocio for essa.
//   - visita -> "Visit" (customizado, a Meta nao tem padrao equivalente).
//   - reserva_venda -> "Purchase" SE houver valor de negociacao conhecido,
//     senao "Reservation" (customizado). Ver logica em mapCategoryToEvent.
export function mapCategoryToEvent(lead: NormalizedLeadStatus): MappingResult {
  switch (lead.category) {
    case "qualificada":
      return { eventName: "Lead" };

    case "visita":
      return { eventName: "Visit" };

    case "reserva_venda":
      if (lead.dealValue !== undefined && lead.dealCurrency) {
        return {
          eventName: "Purchase",
          customData: { value: lead.dealValue, currency: lead.dealCurrency },
        };
      }
      // Sem valor conhecido ainda (ex: "Em negociacao" classificado como
      // reserva_venda mas sem ticket fechado) - evento customizado sem
      // custom_data, conforme o briefing sugere.
      return { eventName: "Reservation" };

    case "desqualificada":
      throw new Error(
        "mapCategoryToEvent nunca deveria ser chamado para 'desqualificada' - " +
          "filtrar por TARGET_CATEGORIES antes de chegar aqui (ver pollAndSync.ts)."
      );
  }
}

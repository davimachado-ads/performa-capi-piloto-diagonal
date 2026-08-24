// Contratos de dados do pacote. Nao ha logica aqui, so tipos - centralizado
// para o resto do codigo (e quem for portar isso pra outra stack) ter um
// unico lugar de referencia.

// As 4 categorias universais que a Performa ja normaliza. "desqualificada"
// existe no domínio geral da Performa mas NUNCA gera evento CAPI neste
// piloto (ver categoryMapping.ts) - incluida aqui so para o tipo bater com
// o que a normalizacao real provavelmente retorna.
export type NormalizedCategory = "desqualificada" | "qualificada" | "visita" | "reserva_venda";

// As 3 categorias que de fato importam para este piloto.
export const TARGET_CATEGORIES: readonly NormalizedCategory[] = [
  "qualificada",
  "visita",
  "reserva_venda",
];

// ASSUMIDO: contrato do que a normalizacao de CRM ja existente na Performa
// deveria expor. Ver README.md secao 2 - trocar pela interface real.
export type NormalizedLeadStatus = {
  leadId: string;
  clientId: string;
  category: NormalizedCategory;

  // Horario real da mudanca de etapa dentro do CRM (nao o horario da
  // consulta/poll). O briefing e explicito que event_time deve refletir isso.
  categoryChangedAt: Date;

  // Dados de contato do lead, formato bruto (normalizacao/hash acontece em
  // hashing.ts, nunca antes de chegar aqui).
  email?: string;
  phone?: string;

  // Identificadores de origem do Meta Pixel, SE tiverem sido preservados
  // desde a captura do lead (depende do Passo 1 do documento do Nuno,
  // fora do escopo deste piloto - ver README secao 8).
  fbc?: string;
  fbp?: string;

  // Valor da negociacao, quando disponivel e a categoria for reserva_venda.
  // Se ausente, o mapeamento cai no evento customizado "Reservation" em vez
  // de "Purchase" (ver categoryMapping.ts).
  dealValue?: number;
  dealCurrency?: string; // ex: "BRL"
};

// Nomes de evento que este piloto pode enviar a Meta. "Lead" e "Purchase"
// sao eventos PADRAO da Meta; "Visit", "Reservation" e "Qualified" sao
// customizados (nao tem semantica especial pro algoritmo de leilao, mas
// ainda assim viram Conversao Personalizada no Passo 4).
export type MetaCapiEventName = "Lead" | "Purchase" | "Qualified" | "Visit" | "Reservation";

export type ConversionEvent = {
  eventId: string; // UUID, gerado uma unica vez por lead+categoria
  clientId: string;
  leadId: string;
  category: Exclude<NormalizedCategory, "desqualificada">;
  eventName: MetaCapiEventName;
  eventTimeUnixSeconds: number;
  userData: {
    emailHash?: string; // SHA-256, ja normalizado (ver hashing.ts)
    phoneHash?: string; // SHA-256, ja em E.164 antes do hash
    fbc?: string;
    fbp?: string;
  };
  customData?: {
    value?: number;
    currency?: string;
  };
};

export type SendResult = {
  success: boolean;
  httpStatus: number;
  body: unknown;
};

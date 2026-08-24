// Normalizacao + hash de identificadores do lead, exatamente como a Meta
// exige para user_data.em / user_data.ph na Conversions API. Fazer isso
// errado e a causa mais comum de EMQ baixo (Passo 3 do runbook) mesmo
// quando o dado esta presente.
//
// Referencia: https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters

import { createHash } from "crypto";

export function hashSha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// Meta exige: minusculo, sem espacos nas pontas. Nao remove pontos/apelidos
// do gmail nem nada alem disso - a Meta faz o dela, nao duplique normalizacao
// alem do documentado.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashEmail(email: string): string {
  return hashSha256(normalizeEmail(email));
}

// Meta exige telefone em E.164 SEM o "+" antes do hash (ex: "5511999999999").
//
// ASSUMIDO (ver README secao 2): leads da Diagonal sao todos BR. Se o
// numero ja vier com DDI 55, nao duplicamos; caso contrario prefixamos.
// Isso e uma simplificacao esperada para o piloto de conta unica - uma
// versao multi-pais precisaria saber o pais de origem do lead, nao so
// assumir BR.
export function normalizePhoneBR(rawPhone: string): string {
  const digitsOnly = rawPhone.replace(/\D/g, "");
  if (digitsOnly.startsWith("55") && digitsOnly.length >= 12) {
    return digitsOnly;
  }
  return `55${digitsOnly}`;
}

export function hashPhone(rawPhone: string): string {
  return hashSha256(normalizePhoneBR(rawPhone));
}

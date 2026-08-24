// Camada de idempotencia e auditoria em cima de meta_conversion_events
// (db/schema.sql). E uma interface + uma implementacao de referencia em
// Postgres - se a Performa ja tem um jeito padrao de acessar banco (um ORM,
// um query builder), troque PostgresEventStore por isso, mantendo a
// interface EventStore igual, para o resto do pacote nao precisar mudar.

import { randomUUID } from "crypto";
import { Pool } from "pg"; // ASSUMIDO: driver 'pg' - trocar pelo client real da Performa
import { ConversionEvent, NormalizedCategory, SendResult } from "./types";

export interface EventStore {
  // true se ja existe um evento SENT (nao pending, nao failed) para este
  // lead+categoria - usado para pular leads ja processados no poll.
  hasSentEvent(leadId: string, category: NormalizedCategory): Promise<boolean>;

  // Cria a linha em status 'pending' e retorna o event_id a usar na chamada
  // a Meta. Se ja existir uma linha para este lead+categoria (por exemplo,
  // uma tentativa anterior que falhou), REUSA o event_id existente em vez
  // de criar um novo - e assim que a idempotencia de retry funciona.
  getOrCreatePendingEvent(event: Omit<ConversionEvent, "eventId">): Promise<string>;

  markResult(eventId: string, result: SendResult): Promise<void>;
}

export class PostgresEventStore implements EventStore {
  constructor(private pool: Pool) {}

  async hasSentEvent(leadId: string, category: NormalizedCategory): Promise<boolean> {
    const res = await this.pool.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM meta_conversion_events
         WHERE lead_id = $1 AND category = $2 AND status = 'sent'
       ) AS exists`,
      [leadId, category]
    );
    return res.rows[0].exists;
  }

  async getOrCreatePendingEvent(event: Omit<ConversionEvent, "eventId">): Promise<string> {
    // ON CONFLICT DO UPDATE ... RETURNING e o jeito de fazer
    // "get-or-create" atomico em Postgres: se ja existe uma linha para
    // este lead_id+category (de uma tentativa anterior), so devolvemos o
    // event_id existente sem gerar um novo nem sobrescrever o status.
    const newEventId = randomUUID();

    const res = await this.pool.query<{ event_id: string }>(
      `INSERT INTO meta_conversion_events
         (client_id, lead_id, category, event_name, event_id, event_time, status)
       VALUES ($1, $2, $3, $4, $5, to_timestamp($6), 'pending')
       ON CONFLICT (lead_id, category) DO UPDATE SET
         -- no-op proposital: mantem a linha existente intacta, so
         -- forcamos o RETURNING a trazer o event_id ja gravado.
         lead_id = meta_conversion_events.lead_id
       RETURNING event_id`,
      [
        event.clientId,
        event.leadId,
        event.category,
        event.eventName,
        newEventId,
        event.eventTimeUnixSeconds,
      ]
    );

    return res.rows[0].event_id;
  }

  async markResult(eventId: string, result: SendResult): Promise<void> {
    await this.pool.query(
      `UPDATE meta_conversion_events
       SET status = $2, http_status = $3, response_body = $4,
           sent_at = CASE WHEN $2 = 'sent' THEN now() ELSE sent_at END
       WHERE event_id = $1`,
      [eventId, result.success ? "sent" : "failed", result.httpStatus, JSON.stringify(result.body)]
    );
  }
}

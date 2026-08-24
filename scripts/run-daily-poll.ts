// Ponto de entrada que o scheduler de 24h ja existente na Performa deve
// chamar (ver README secao 2 - assumimos que esse scheduler ja existe e so
// falta apontar pra cá). Roda para todos os clientes em PILOT_CLIENT_IDS -
// hoje so a Diagonal.
//
// Uso esperado (depois de traduzido pra stack real): agendar isso para
// rodar 1x/dia, no mesmo horario em que a consulta periodica ao CRM ja
// roda hoje (Passo 1 do briefing).

import { Pool } from "pg";
import { DATABASE_URL, PILOT_CLIENT_IDS } from "../src/config";
import { PostgresEventStore } from "../src/eventStore";
import { pollAndSyncClient } from "../src/pollAndSync";

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const eventStore = new PostgresEventStore(pool);

  for (const clientId of PILOT_CLIENT_IDS) {
    console.log(`[run-daily-poll] iniciando cliente ${clientId}`);
    try {
      const result = await pollAndSyncClient(clientId, eventStore);
      console.log(`[run-daily-poll] cliente ${clientId}:`, result);
    } catch (err) {
      // Um cliente falhar nao deve derrubar os outros - relevante quando
      // este piloto for replicado para mais de uma conta.
      console.error(`[run-daily-poll] erro no cliente ${clientId}:`, err);
    }
  }

  await pool.end();
}

main();

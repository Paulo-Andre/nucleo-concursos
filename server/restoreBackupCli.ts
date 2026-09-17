import "dotenv/config";
import { restoreBackup } from "./restoreBackup";

restoreBackup().catch(error => {
  const reason = error instanceof Error && /^RESTORE_[A-Z_]+$/.test(error.message) ? error.message : "RESTORE_FAILED";
  console.error(`[Restore] ${reason}. Inicialização interrompida; confira o backup e o banco de destino.`);
  process.exitCode = 1;
});

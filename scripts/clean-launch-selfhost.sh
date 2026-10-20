#!/usr/bin/env bash
set -Eeuo pipefail
# Reinicialização pré-lançamento; somente o projeto /srv/projetos/nucleo-concursos.
# --check consulta sem alterar. --apply exige backup completo. --apply-without-backup é irreversível.
[[ $# -eq 1 && ( "$1" == "--check" || "$1" == "--apply" || "$1" == "--apply-without-backup" ) ]] || { echo "Use --check, --apply ou --apply-without-backup"; exit 2; }
MODE="$1"
cd /srv/projetos/nucleo-concursos
[[ -f .env && -f Dockerfile && -f compose.yaml && -f .dockerignore && -d data ]] || { echo "Configuração local incompleta."; exit 1; }
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || { echo "Há alterações rastreadas locais. Abortado."; exit 1; }
docker compose config --quiet
[[ "$(docker compose config --services | sort)" == "$(printf 'app\ndb\n' | sort)" ]] || { echo "Serviços Docker inesperados. Abortado."; exit 1; }
dbcli() { docker compose exec -T db sh -c 'exec mysql --batch --skip-column-names --silent -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'; }
sql() { printf '%s\n' "$1" | dbcli; }
REQUIRED_TABLES=$(cat <<'TABLES'
users
authSessions
passwordResetTokens
studyProfiles
platformAlerts
platformAlertDismissals
completedModules
studyAnswers
studyReviewItems
simulationRecords
studyNotes
studyContentProgress
studyRoadmapItems
adminAuditLogs
courses
commercePlans
commercePlanCourses
commerceCoupons
commerceOrders
commerceOrderItems
commerceTransactions
courseEnrollments
disciplines
contents
questions
courseDisciplines
disciplineContents
questionContentLinks
simulationQuestions
reviewQueue
questionChangelog
contentChangelog
globalContactSettings
platformGeneralSettings
competitionSettings
competitionMonthlyGoals
competitionRounds
competitionAnswers
TABLES
)
actual_tables=$(sql "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'")
missing_tables=$(comm -23 <(printf '%s\n' "$REQUIRED_TABLES" | sort) <(printf '%s\n' "$actual_tables" | sort))
unknown_tables=$(comm -13 <(printf '%s\n' "$REQUIRED_TABLES" "__drizzle_migrations" | sort) <(printf '%s\n' "$actual_tables" | sort))
if [[ -n "$missing_tables" || -n "$unknown_tables" ]]; then
  echo "Estrutura de tabelas não confere com a versão auditada."
  [[ -z "$missing_tables" ]] || printf 'Ausentes: %s\n' "$missing_tables"
  [[ -z "$unknown_tables" ]] || printf 'Desconhecidas: %s\n' "$unknown_tables"
  exit 1
fi
fk_count=$(sql 'SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL')
[[ "$fk_count" == "0" ]] || { echo "Chaves estrangeiras detectadas; revisão manual necessária."; exit 1; }

check_root() {
  count=$(sql "SELECT COUNT(*) FROM users WHERE BINARY username = BINARY 'paulo' AND role = 'admin' AND loginMethod = 'local' AND isBlocked = 0 AND passwordHash IS NOT NULL AND CHAR_LENGTH(passwordHash) > 20")
  [[ "$count" == "1" ]] || { echo "ROOT paulo não identificado de forma segura; nenhuma limpeza realizada."; exit 1; }
}
check_root
echo "=== REGISTROS ATUAIS (SOMENTE LEITURA) ==="
for table in $REQUIRED_TABLES; do
  count=$(sql "SELECT COUNT(*) FROM $table")
  printf '%-30s %s\n' "$table" "$count"
done
if [[ "$MODE" == "--check" ]]; then
  echo "CHECK OK: nenhuma alteração feita."
  exit 0
fi
[[ -v NUCLEO_CLEAN_CONFIRM && "$NUCLEO_CLEAN_CONFIRM" == "APAGAR_TUDO_MENOS_PAULO" ]] || { echo "Confirmação específica ausente."; exit 1; }
if [[ "$MODE" == "--apply-without-backup" ]]; then
  [[ "${NUCLEO_CLEAN_NO_BACKUP_CONFIRM:-}" == "ACEITO_PERDA_IRREVERSIVEL" ]] || {
    echo "Confirmação específica da exclusão IRREVERSÍVEL sem backup ausente."; exit 1;
  }
fi
[[ -v NUCLEO_CLEAN_RELEASE_SHA && "$NUCLEO_CLEAN_RELEASE_SHA" =~ ^[a-f0-9]{40}$ ]] || { echo "SHA validado ausente."; exit 1; }
[[ "$(git rev-parse HEAD)" == "$NUCLEO_CLEAN_RELEASE_SHA" ]] || { echo "Atualize o código validado antes de apagar dados."; exit 1; }
grep -q hasPrelaunchCatalogReset server/auth/rootBootstrap.ts || { echo "Proteção anti-recriação do catálogo ausente."; exit 1; }
free_kb=$(df -Pk . | awk 'END {print $4}')
[[ "$free_kb" =~ ^[0-9]+$ && "$free_kb" -ge 1048576 ]] || { echo "Espaço livre inferior a 1 GiB."; exit 1; }
umask 077
app_stopped=0
restart_app() {
  if [[ "$app_stopped" == 1 ]]; then
    echo "Restaurando somente o container da aplicação do Núcleo..."
    docker compose up -d --no-deps --no-build app || true
  fi
}
trap restart_app EXIT

echo "Pausando somente app do Núcleo..."
docker compose stop app
app_stopped=1
check_root
if [[ "$MODE" == "--apply" ]]; then
  BACKUP="$HOME/backups-nucleo/limpeza-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$BACKUP"
  echo "Criando backup completo solicitado..."
  docker compose exec -T db sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --quick --routines --triggers --events --databases "$MYSQL_DATABASE"' > "$BACKUP/banco-antes.sql"
  test -s "$BACKUP/banco-antes.sql"
  grep -q 'CREATE TABLE' "$BACKUP/banco-antes.sql" || { echo "Backup inválido; abortado."; exit 1; }
  tar -czf "$BACKUP/arquivos-antes.tar.gz" -C /srv/projetos/nucleo-concursos .env Dockerfile compose.yaml .dockerignore data
  tar -tzf "$BACKUP/arquivos-antes.tar.gz" >/dev/null
  git rev-parse HEAD > "$BACKUP/codigo.sha"
  (cd "$BACKUP" && sha256sum banco-antes.sql arquivos-antes.tar.gz codigo.sha > SHA256SUMS && sha256sum -c SHA256SUMS)
  echo "Backup validado em $BACKUP"
else
  echo "SEM BACKUP: exclusão permanente solicitada e confirmada pelo proprietário."
fi

echo "Excluindo dados da aplicação em uma transação MySQL..."
dbcli <<'SQL'
START TRANSACTION;
SET @paulo_id := (
  SELECT id FROM users WHERE BINARY username = BINARY 'paulo'
  AND role = 'admin' AND loginMethod = 'local' AND isBlocked = 0
  AND passwordHash IS NOT NULL AND CHAR_LENGTH(passwordHash) > 20 LIMIT 1
);
DELETE FROM authSessions;
DELETE FROM passwordResetTokens;
DELETE FROM studyProfiles;
DELETE FROM platformAlerts;
DELETE FROM platformAlertDismissals;
DELETE FROM completedModules;
DELETE FROM studyAnswers;
DELETE FROM studyReviewItems;
DELETE FROM simulationRecords;
DELETE FROM studyNotes;
DELETE FROM studyContentProgress;
DELETE FROM studyRoadmapItems;
DELETE FROM courses;
DELETE FROM commercePlans;
DELETE FROM commercePlanCourses;
DELETE FROM commerceCoupons;
DELETE FROM commerceOrders;
DELETE FROM commerceOrderItems;
DELETE FROM commerceTransactions;
DELETE FROM courseEnrollments;
DELETE FROM disciplines;
DELETE FROM contents;
DELETE FROM questions;
DELETE FROM courseDisciplines;
DELETE FROM disciplineContents;
DELETE FROM questionContentLinks;
DELETE FROM simulationQuestions;
DELETE FROM reviewQueue;
DELETE FROM questionChangelog;
DELETE FROM contentChangelog;
DELETE FROM globalContactSettings;
DELETE FROM platformGeneralSettings;
DELETE FROM competitionSettings;
DELETE FROM competitionMonthlyGoals;
DELETE FROM competitionRounds;
DELETE FROM competitionAnswers;
DELETE FROM adminAuditLogs;
DELETE FROM users WHERE id <> @paulo_id;
INSERT INTO adminAuditLogs (actorUserId, affectedUserId, action, detail)
VALUES (@paulo_id, NULL, 'LIMPEZA_CATALOGO_PRE_LANCAMENTO',
        'Limpeza pré-lançamento: somente ROOT paulo preservado. Dados antigos removidos; catálogo inicial não deve ser semeado.');
COMMIT;
SQL

[[ "$(sql 'SELECT COUNT(*) FROM users')" == "1" ]] || { echo "Falha ao confirmar contas restantes. Os dados podem já ter sido excluídos."; exit 1; }
check_root
[[ "$(sql "SELECT COUNT(*) FROM adminAuditLogs WHERE action = 'LIMPEZA_CATALOGO_PRE_LANCAMENTO'")" == "1" ]] || { echo "Marcador de limpeza ausente."; exit 1; }
for table in $REQUIRED_TABLES; do
  if [[ "$table" == "users" || "$table" == "adminAuditLogs" ]]; then continue; fi
  [[ "$(sql "SELECT COUNT(*) FROM $table")" == "0" ]] || { echo "A tabela $table não está vazia; confira o banco."; exit 1; }
done
echo "Confirmado: 1 usuário ROOT e todas as tabelas de negócio vazias."
docker compose up -d --no-deps --no-build app
app_stopped=0
healthy=0
for attempt in $(seq 1 25); do
  if curl -fsS --max-time 5 http://127.0.0.1:3000/ >/dev/null && curl -fsS --max-time 5 http://127.0.0.1:3000/api/trpc/platform.settings >/dev/null; then
    healthy=1; break
  fi
  sleep 2
done
[[ "$healthy" == 1 ]] || { echo "ATENÇÃO: servidor não respondeu após a limpeza. Exclusão não pode ser desfeita nesta execução."; exit 1; }
echo "LIMPEZA CONCLUÍDA. Modalidade: $MODE."
echo "Mídias antigas no disco foram preservadas para verificação e descarte separado."

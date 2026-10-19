#!/usr/bin/env bash
set -euo pipefail
# NUNCA executar em produção. Só o serviço MySQL sintético no GitHub Actions.
if [[ "${CI:-}" != "true" || "${QA_RESTORE:-}" != "1" ]]; then
  echo "Restauração de QA somente no CI isolado." >&2
  exit 1
fi
DB_CONTAINER="$(docker ps --filter "ancestor=mysql:8.4" --format '{{.ID}}' | head -1)"
if [[ -z "$DB_CONTAINER" ]]; then echo "MySQL de QA não localizado"; exit 1; fi
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
docker exec "$DB_CONTAINER" mysqldump --single-transaction --quick --routines --triggers -uroot -pqa_root_password_only nucleo_qa > "$tmp"
test -s "$tmp"
docker exec "$DB_CONTAINER" mysql -uroot -pqa_root_password_only -e 'CREATE DATABASE IF NOT EXISTS nucleo_qa_restore;'
docker exec -i "$DB_CONTAINER" mysql -uroot -pqa_root_password_only nucleo_qa_restore < "$tmp"
for table in users courses contents questions courseEnrollments studyNotes studyAnswers; do
  original="$(docker exec "$DB_CONTAINER" mysql -uroot -pqa_root_password_only -N -B -e "SELECT COUNT(*) FROM nucleo_qa.${table};" 2>/dev/null)"
  restored="$(docker exec "$DB_CONTAINER" mysql -uroot -pqa_root_password_only -N -B -e "SELECT COUNT(*) FROM nucleo_qa_restore.${table};" 2>/dev/null)"
  if [[ "$original" != "$restored" ]]; then
    echo "Falha de restauração: ${table} ${original} != ${restored}"; exit 1
  fi
  echo "Restauração verificada: ${table} (${restored} registros)"
done
echo "SQL sintético restaurado e confrontado sem qualquer acesso ao banco de produção."

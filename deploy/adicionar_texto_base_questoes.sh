#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "Verificando coluna passage na tabela questions..."
existing="$(docker exec nucleo-db sh -c 'mysql --batch --skip-column-names -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '\''questions'\'' AND COLUMN_NAME = '\''passage'\'';"' 2>/dev/null | tr -d '[:space:]')"
if [[ "$existing" == "1" ]]; then
  echo "Coluna passage ja existe; nenhuma alteracao necessaria."
elif [[ "$existing" == "0" ]]; then
  docker exec nucleo-db sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "ALTER TABLE questions ADD COLUMN passage TEXT NULL AFTER statement;"' 
  echo "Coluna passage criada. Enunciados, gabaritos e historicos preservados."
else
  echo "Nao foi possivel verificar o banco. Nada foi alterado." >&2
  exit 1
fi

#!/usr/bin/env bash
set -Eeuo pipefail

# Implantação única do pacote QA, no mini PC do proprietário.
# Uso: NUCLEO_RELEASE_SHA=<SHA-validado> NUCLEO_DEPLOY_CONFIRM=APLICAR bash deploy-once-selfhost.sh --apply
# Sem --apply, faz somente inspeções (nenhuma alteração do código ou Docker).

TARGET_DIR="/srv/projetos/nucleo-concursos"
RELEASE_REF="origin/fix/qa-seguranca-aprendizagem-20261019"
MODE="${1:---check}"
[[ "$MODE" == "--apply" || "$MODE" == "--check" ]] || { echo "Use --check ou --apply."; exit 2; }
[[ -d "$TARGET_DIR/.git" || -f "$TARGET_DIR/.git" ]] || { echo "Diretório principal Git não encontrado."; exit 1; }
cd "$TARGET_DIR"

echo "Diretório principal: $PWD"
echo "Branch local: $(git branch --show-current)"
echo "Commit atual: $(git rev-parse --short HEAD)"
docker compose ps
# Protege a instalação real: nenhum Dockerfile/compose/.env do servidor será substituído.
for required in .env compose.yaml Dockerfile .dockerignore; do
  [[ -f "$required" ]] || { echo "Configuração obrigatória ausente: $required" >&2; exit 1; }
done
[[ -d data ]] || { echo "Pasta de uploads/data não encontrada. Não vou prosseguir." >&2; exit 1; }
docker compose config --quiet

if [[ -n "$(git diff --porcelain)" || -n "$(git diff --cached --porcelain)" ]]; then
  echo "Há alterações rastreadas não salvas. Não vou sobrepor arquivos." >&2; exit 1
fi

if [[ "$MODE" == "--check" ]]; then
  echo "Prévia segura: sem downloads, sem backups novos e sem reiniciar containers."
  echo "Para aplicar, é necessário um SHA validado no CI e confirmação explícita."
  exit 0
fi

[[ "${NUCLEO_DEPLOY_CONFIRM:-}" == "APLICAR" ]] || { echo "Defina NUCLEO_DEPLOY_CONFIRM=APLICAR para autorizar esta implantação."; exit 1; }
[[ "${NUCLEO_RELEASE_SHA:-}" =~ ^[a-f0-9]{40}$ ]] || { echo "Forneça o SHA completo do commit aprovado na regressão CI."; exit 1; }

git fetch --no-tags origin fix/qa-seguranca-aprendizagem-20261019
[[ "$(git rev-parse "$RELEASE_REF")" == "$NUCLEO_RELEASE_SHA" ]] || { echo "O SHA da branch mudou depois da homologação. Revalidar antes de instalar."; exit 1; }
OLD_HEAD="$(git rev-parse HEAD)"
git merge-base --is-ancestor "$OLD_HEAD" "$NUCLEO_RELEASE_SHA" || { echo "Históricos divergentes. Não é possível avançar automaticamente."; exit 1; }
for checked_path in server/studyCoach.ts server/spreadsheetImport.ts client/src/components/StudyEditalChecklist.tsx; do
  git cat-file -e "${NUCLEO_RELEASE_SHA}:${checked_path}" || { echo "Commit incompleto: ${checked_path}" >&2; exit 1; }
done
available_kb="$(df -Pk "$TARGET_DIR" | awk 'END { print $4 }')"
[[ "$available_kb" =~ ^[0-9]+$ && "$available_kb" -ge 1048576 ]] || {
  echo "Espaço insuficiente (menos de 1 GiB livre) para backup e compilação. Libere espaço antes." >&2
  exit 1
}
if ! git diff --quiet "$OLD_HEAD" "$NUCLEO_RELEASE_SHA" -- drizzle/schema.ts drizzle.config.ts; then
  echo "A estrutura do banco mudou. É obrigatório ensaiar as migrações em cópia isolada antes de publicar." >&2
  exit 1
fi

umask 077
BACKUP="$HOME/backups-nucleo/deploy-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
printf '%s\n' "$OLD_HEAD" > "$BACKUP/codigo-anterior.sha"
printf '%s\n' "$NUCLEO_RELEASE_SHA" > "$BACKUP/codigo-novo.sha"
echo "Criando backup SQL consistente..."
docker compose exec -T db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --quick --routines --triggers --events --databases "$MYSQL_DATABASE"' > "$BACKUP/banco.sql"
test -s "$BACKUP/banco.sql"
# Um arquivo vazio ou sem estrutura não é um backup de banco válido.
grep -q 'CREATE TABLE' "$BACKUP/banco.sql" || { echo "Dump sem tabelas; abortando." >&2; exit 1; }

echo "Protegendo configurações e arquivos locais..."
tar -czf "$BACKUP/arquivos-config.tar.gz" -C "$TARGET_DIR" .env compose.yaml Dockerfile .dockerignore data
tar -tzf "$BACKUP/arquivos-config.tar.gz" >/dev/null
sha256sum "$BACKUP/banco.sql" "$BACKUP/arquivos-config.tar.gz" > "$BACKUP/SHA256SUMS"
(cd "$BACKUP" && sha256sum -c SHA256SUMS) >/dev/null
docker image inspect nucleo-concursos-app:latest >/dev/null
ROLLBACK_IMAGE="nucleo-concursos-app:rollback-$(date +%Y%m%d%H%M%S)"
docker image tag nucleo-concursos-app:latest "$ROLLBACK_IMAGE"
echo "Backup verificado em: $BACKUP"
echo "Imagem anterior: $ROLLBACK_IMAGE"

rollback() {
  echo "Falha na implantação. Restaurando a versão anterior da aplicação..." >&2
  git reset --hard "$OLD_HEAD" || true
  if [[ -n "$ROLLBACK_IMAGE" ]]; then
    docker image tag "$ROLLBACK_IMAGE" nucleo-concursos-app:latest || true
    docker compose up -d --no-deps --no-build --force-recreate app || true
  fi
  docker compose ps || true
  echo "Backup preservado em $BACKUP. Banco não foi apagado ou recriado." >&2
}
trap 'rollback' ERR

echo "Atualizando somente o código versionado (sem substituir arquivos .env, Docker e data)..."
git merge --ff-only "$NUCLEO_RELEASE_SHA"
echo "Compilando aplicação principal..."
docker compose build app
# A imagem foi construída, mas o site antigo continua no ar até a próxima etapa.
echo "Recriando exclusivamente o container da aplicação..."
docker compose up -d --no-deps --no-build --force-recreate app

echo "Verificando HTTP local..."
success=0
for attempt in $(seq 1 25); do
  if curl --silent --fail --max-time 5 http://127.0.0.1:3000/ >/dev/null && curl --silent --fail --max-time 5 http://127.0.0.1:3000/api/trpc/platform.settings >/dev/null; then success=1;break;fi
  sleep 2
done
[[ "$success" == "1" ]]
trap - ERR
docker compose ps
echo "Aplicação atualizada com sucesso: $(git rev-parse --short HEAD)"
echo "Backup seguro: $BACKUP"
echo "Confirme login, área ROOT, compra e estudos no navegador. Definição do banco sem mudanças estruturais nesta release."

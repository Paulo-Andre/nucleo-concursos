# Implantação na Render com MySQL gratuito

A aplicação React + Express é um único **Web Service**, definido em
`render.yaml`. O banco é MySQL externo, por exemplo Aiven MySQL **Free**.
Não selecione PostgreSQL: o código e as migrações usam MySQL.

## 1. Preparar o banco

1. Crie o MySQL no plano Free (não confundir com um trial pago).
2. Guarde host, porta, usuário, senha, nome do banco e certificado CA.
3. Configure `DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE`.
   Codifique caracteres especiais do usuário/senha com URL encoding.
4. Configure `DATABASE_SSL=true` e, quando necessário, `DATABASE_CA_CERT`
   com o PEM do provedor. A conexão de produção sempre exige TLS com
   certificado validado. Não use `rejectUnauthorized=false`.
   Os parâmetros de conexão são definidos em `server/databaseConfig.ts`;
   opções extras na query da URL não substituem essas variáveis.

### Banco novo

O comando `pnpm start:render` aplica as migrações versionadas e só então
inicia o servidor. Depois, o bootstrap cria a conta **paulo** e o conteúdo
inicial. `ROOT_INITIAL_PASSWORD` deve ser uma senha forte com pelo menos
8 caracteres. Uma conta local existente com senha válida mantém a senha atual:
essa variável não redefine a senha a cada deploy.

### Banco já existente / saída do Manus

Faça backup SQL completo e teste a restauração em uma cópia. Preserve também
`__drizzle_migrations`, usuários, hashes, vínculos e histórico. Não execute a
suíte de integração no banco real. Se precisar migrar a identidade antiga do
proprietário, configure `OWNER_OPEN_ID` antes da primeira inicialização.

O migrador recusa um banco com tabelas mas sem histórico de migrações. Nesse
caso, compare o esquema restaurado com as migrações e estabeleça uma baseline
verificada antes de publicar; não apague tabelas nem invente entradas no histórico.
As migrações MySQL não têm rollback integral automático: um erro pode deixar
DDL parcialmente aplicado. Restaure a cópia limpa ou reconcilie o ponto de
falha antes de repetir.

Foi incluído o separador ausente entre DELETE e ALTER na migração 0015.
Foi removida uma criação duplicada de `weeklyCycleKey` na migração 0022.
Bancos com essa migração já registrada não devem reaplicá-la. Se uma execução
anterior parou no meio de uma delas, é necessário conferir as colunas e o índice
antes de continuar. Use o journal do Drizzle; não execute todos os `.sql`
por ordem alfabética, pois há um arquivo legado `0002_persistent_courses.sql`
fora do journal.

## 2. Criar o serviço

No Render: **New > Blueprint**, conecte este repositório e selecione a branch
com estas alterações. O Blueprint usa Node 24, instala também as dependências
de build, verifica tipos, roda testes locais e compila. A inicialização usa
`pnpm start:render`; não usa pre-deploy pago nem precisa de shell do Render.

Preencha no painel Environment:

| Variável | Configuração |
| --- | --- |
| `DATABASE_URL` | Conexão MySQL externa |
| `DATABASE_SSL` | `true` (já definida pelo Blueprint) |
| `DATABASE_CA_CERT` | Adicionar manualmente se o provedor exigir CA própria |
| `ROOT_INITIAL_PASSWORD` | Senha inicial forte da conta paulo |
| `JWT_SECRET` | Gerado pelo Blueprint; mantenha estável |
| `PUBLIC_APP_URL` | Origem HTTPS final, sem barra, caminho ou query |
| `MERCADO_PAGO_ACCESS_TOKEN` | Chave privada de servidor já existente |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Segredo de assinatura do webhook |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Para envio de e-mails |

Nunca coloque segredos em `VITE_*`, arquivos versionados, logs ou no PR.
Se não usar e-mails/pagamentos inicialmente, seus valores podem ficar vazios;
esses recursos não funcionarão até serem configurados. O build não depende deles.
Consulte `.env.example` para configuração local.

Confirme a URL atribuída ao serviço e ajuste `PUBLIC_APP_URL` antes de
iniciar. O servidor valida a configuração, executa o bootstrap e escuta em
`0.0.0.0:$PORT`. O health check `/api/health` consulta o banco e retorna 503
em falha ou timeout, sem divulgar detalhes da conexão.

## 3. Mercado Pago e conta paulo

Cadastre no Mercado Pago o webhook:
`https://SEU-SERVICO.onrender.com/api/payments/mercado-pago/webhook`.
Use o segredo correspondente ao webhook e as credenciais do ambiente escolhido.
Ter a chave não substitui verificar assinatura, checkout e liberação de acesso.

Após o deploy, entre como `paulo` e confira catálogo, cadastro e persistência
após reiniciar. Teste o fluxo de pagamentos com contas/credenciais de teste
adequadas antes de aceitar vendas reais.

## 4. Comandos e testes

- `pnpm test` / `pnpm test:unit`: testes locais com valores fictícios,
  sem URL de banco real e com fetch bloqueado salvo mocks explícitos.
- `pnpm test:services`: verificações existentes das credenciais reais;
  exige `ALLOW_LIVE_SERVICE_TESTS=true`. O teste Mercado Pago consulta
  `/users/me`; não cria cobrança. O teste Resend verifica o formato da chave,
  não comprova entrega de e-mail.
- `pnpm test:integration`: exige `TEST_DATABASE_URL` e
  `ALLOW_TEST_DATABASE_WRITES=true`. A URL deve ser diferente de `DATABASE_URL`.
  Use exclusivamente banco descartável: estes testes criam/excluem registros
  e alteram sessões. Os arquivos executam em série.
- Antes das integrações, prepare esse banco com `pnpm db:migrate` e inicialize
  a aplicação apontando **somente para o banco de testes**, com uma senha ROOT
  de teste, para executar o bootstrap. Pare o servidor e execute as integrações
  com a mesma senha. Nunca reutilize a sessão ROOT de produção.
- `pnpm db:generate`: gera migrações durante desenvolvimento; revise e versione.
- `pnpm db:migrate`: aplica somente migrações já versionadas.
- `pnpm db:push`: alias legado para gerar + migrar; não utilizar no deploy.

## 5. Pendências externas para funcionamento completo

**Uploads:** `server/storage.ts` e `/manus-storage/*` ainda usam Forge/Manus.
Se suas credenciais continuarem válidas fora do Manus, adicione
`BUILT_IN_FORGE_API_URL` e `BUILT_IN_FORGE_API_KEY` no Render e valide o acesso.
Caso contrário, escolha armazenamento externo, adapte esses módulos e migre
os objetos existentes. Migrar somente o SQL não transfere imagens/arquivos.
Não grave uploads no disco efêmero da Render Free.

**Reset semanal:** o callback `/api/scheduled/weeklyReset` mantém autenticação
Manus. A transferência dessa rotina exige agendador e autenticação próprios,
ou manutenção de uma integração Manus válida. Não configure um cron público
sem autenticação. Essa dependência não foi removida nesta preparação.

**Operação:** o plano gratuito da Render suspende serviços após 15 minutos sem
tráfego; a retomada pode demorar cerca de um minuto. Mantenha backups externos
e monitore as cotas do banco. Não desative a hospedagem anterior até conferir
restauração, login, pagamentos e arquivos. Não há garantia de disponibilidade
contínua no plano gratuito.

Referências:
- https://render.com/docs/free
- https://render.com/docs/node-version
- https://aiven.io/docs/platform/concepts/service-pricing#free-tier

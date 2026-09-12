# Publicação gratuita no Render

Este repositório inclui `render.yaml`, um **Blueprint** que cria um Web Service
Node no plano gratuito. O frontend e a API são publicados juntos: não crie um
Static Site, pois o projeto precisa do servidor Express, do banco de dados e do
webhook de pagamentos.

## O que já está pronto

O Blueprint instala as dependências travadas, executa a checagem de tipos,
testes e build, e inicia a aplicação com `pnpm start`. Ele deixa segredos e
endereços específicos vazios de propósito: credenciais nunca devem ser
versionadas.

## Ações que dependem do proprietário

Não é possível criar contas, aceitar termos, fornecer dados de cobrança,
transferir um domínio ou acessar credenciais de terceiros a partir deste
repositório. Para concluir a publicação:

1. Publique esta branch em um repositório GitHub privado seu.
2. Crie um banco MySQL/TiDB compatível e importe o backup existente antes de
   apontar usuários para o novo site.
3. No Render, escolha **New > Blueprint**, conecte o repositório e confirme a
   criação a partir de `render.yaml`.
4. Em **Environment**, preencha os valores marcados como `sync: false` no
   Blueprint. `DATABASE_URL`, `ROOT_INITIAL_PASSWORD` e `PUBLIC_APP_URL` são
   indispensáveis. Para vendas, também preencha as duas variáveis do Mercado
   Pago; para e-mails, as duas variáveis do Resend.
5. Após o primeiro deploy, copie a URL `https://...onrender.com` para
   `PUBLIC_APP_URL` e faça novo deploy. Não use uma URL com barra no final.
6. No Mercado Pago, cadastre o webhook
   `https://SEU-ENDERECO.onrender.com/api/payments/mercado-pago/webhook`.
7. Teste login ROOT, leitura dos cursos, cadastro, pagamento de teste e o
   webhook antes de divulgar a URL.

## Recursos que exigem migração adicional

Uploads, arquivos e imagens usam atualmente o armazenamento Forge/Manus. As
variáveis `BUILT_IN_FORGE_API_URL` e `BUILT_IN_FORGE_API_KEY` não são criadas
por Render. Antes de usar uploads fora do Manus, migre esse recurso para um
armazenamento sob sua conta (por exemplo, S3 compatível, Cloudflare R2 ou
Supabase Storage) e então adapte `server/storage.ts` e
`server/_core/storageProxy.ts`.

## Operação

O plano gratuito pode suspender serviços sem tráfego; por isso, o primeiro
acesso depois de um período parado pode demorar. Mantenha backups externos do
banco e não cancele a hospedagem anterior até validar o deploy e a restauração.
Para o roteiro completo de continuidade, consulte
`DEPLOYMENT_CONTINUITY_RUNBOOK.md`.

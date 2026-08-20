# Avaliação de hospedagem econômica — Núcleo Concursos

## Recomendação

Para a plataforma atual, a rota com **menor custo prático e menor risco de migração é Railway no plano Hobby**. A aplicação já é Node.js/Express com banco compatível com MySQL; portanto, pode ser implantada a partir do GitHub, usando um serviço MySQL no mesmo projeto e as variáveis protegidas já existentes. O plano Hobby tem consumo mínimo de US$ 5 por mês, inclui US$ 5 de uso e permite definir um domínio próprio.[1]

O valor real dependerá de CPU, memória, tráfego e armazenamento. Antes de desligar a publicação atual, a nova infraestrutura precisa permanecer em paralelo até concluir a migração de banco, os testes de Mercado Pago, o recebimento de e-mails e a troca de DNS.

| Opção | Custo inicial | Compatibilidade | Decisão |
| --- | ---: | --- | --- |
| **Railway Hobby** | Mínimo de US$ 5/mês | Alta: Node.js, variáveis protegidas e MySQL disponível | **Recomendada** |
| Render gratuito | US$ 0, mas com limitações | Baixa para produção: banco gratuito expira e o serviço pode dormir | Não usar para vendas reais |
| Render pago + banco | A partir de cerca de US$ 13/mês | Exigiria converter MySQL/TiDB para PostgreSQL | Mais caro e mais trabalhoso |
| Oracle Cloud Always Free | US$ 0 | Alta tecnicamente, porém operação manual | Somente se aceitar administrar servidor |

## Por que não usar um plano gratuito para vendas

O plano gratuito do Render desliga serviços web após inatividade, pode demorar cerca de um minuto para voltar e não é indicado pela própria plataforma para produção. Seu banco PostgreSQL gratuito expira após 30 dias e não possui backups. Além disso, o projeto atual usa MySQL/TiDB, não PostgreSQL.[2]

O Oracle Cloud Always Free pode rodar uma VM Arm sem cobrança dentro dos limites publicados, mas requer que o responsável mantenha atualizações, firewall, TLS, monitoramento e backups. A Oracle também informa que uma VM gratuita ociosa pode ser retomada. Para uma plataforma que recebe pagamentos, essa economia não compensa a complexidade para o cenário atual.[3]

## Migração recomendada para Railway

1. Criar um projeto Railway e implantar o repositório GitHub, sem desligar a versão atual.
2. Criar o banco MySQL no Railway e cadastrar as variáveis protegidas: `DATABASE_URL`, `JWT_SECRET`, `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ROOT_INITIAL_PASSWORD` e `PUBLIC_APP_URL`.
3. Exportar uma cópia do banco atual, importar no MySQL novo, executar as migrações e validar contagens de usuários, cursos, matrículas, pedidos e questões.
4. Configurar a URL pública nova no Mercado Pago e no Resend. Fazer uma compra real controlada e testar o recebimento do e-mail de confirmação e a recuperação de senha.
5. Conectar o domínio próprio somente depois da validação; reduzir o TTL de DNS antes da troca e preservar a publicação atual como retorno rápido durante o período de propagação.
6. Manter backup externo recorrente do banco e do repositório, pois mudar de hospedagem não substitui uma estratégia de recuperação.

## Observação sobre domínio

O registrador continua sendo independente da hospedagem. O domínio pode continuar onde foi comprado; no momento da troca, apenas os registros DNS serão apontados para o destino indicado pelo Railway. O domínio também deverá ser verificado no Resend para que os e-mails comerciais sejam enviados usando a identidade da marca.

## Referências

[1] [Railway — Pricing](https://railway.com/pricing)

[2] [Render — Free instance limitations](https://render.com/docs/free)

[3] [Oracle Cloud — Always Free resources](https://docs.oracle.com/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)

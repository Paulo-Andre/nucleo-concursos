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

## Comparação adicional: VPS Locaweb

Uma **VPS Linux da Locaweb com cobrança fixa em reais pode ser melhor que o Railway** se o plano escolhido tiver, no mínimo, **2 GB de RAM, 1 vCPU e SSD suficiente para o banco**, e se o objetivo principal for previsibilidade de custo. A Locaweb oferece acesso root, IP estático, snapshot, imagens com Node.js/MySQL/Nginx e a possibilidade de instalar e administrar o banco na mesma VPS.[4]

O ponto decisivo é que uma VPS é um servidor sob nossa responsabilidade. Precisaremos configurar Docker ou Node.js, Nginx/Caddy, HTTPS, firewall, atualizações, monitoramento, rotina de backup do banco e restauração. O backup da Locaweb requer configuração de agente/rotina no painel; ele complementa, mas não substitui, um dump externo do banco.[5]

| Cenário | Melhor escolha | Motivo |
| --- | --- | --- |
| Prioriza simplicidade operacional e implantação pelo GitHub | Railway Hobby | Banco e aplicação gerenciados com menos manutenção de servidor |
| Prioriza valor fixo em reais e aceita manter um servidor | VPS Locaweb | Previsibilidade de custo, IP próprio e controle integral |
| VPS anunciada com apenas 512 MB ou 1 GB de RAM | Não recomendar | Aplicação Node, banco MySQL e serviços de segurança competirão por memória |
| VPS com 2 GB ou mais, backup e IP fixo | Recomendável | Capacidade inicial adequada para a fase de lançamento |

Para o perfil da plataforma, a recomendação passa a ser: **VPS Locaweb é a opção economicamente melhor se o plano de cerca de R$ 25 for de pelo menos 2 GB de RAM; caso seja de 512 MB ou 1 GB, mantenha Railway.** Antes da contratação, confirme na tela do plano a memória, CPU, SSD, valor após eventual promoção e se backup é cobrado à parte.

### Confirmação do plano econômico no site oficial

Na consulta de agosto de 2026, a página oficial da Locaweb exibe o **VPS 2 GB Linux** por preço de tabela de **R$ 45,90**, com desconto de 35%, resultando em **R$ 23,90 por mês equivalente em contratação de 24 meses**. A mesma oferta informa **2 vCPUs, 60 GB de SSD e transferência ilimitada**.[4]

Essa configuração tem capacidade inicial adequada para hospedar uma única instância da plataforma, o MySQL, Nginx/Caddy e as rotinas básicas de monitoramento, desde que a VPS seja configurada com limites de memória e backup. Assim, a recomendação está confirmada: **o VPS 2 GB da Locaweb é a melhor opção de custo fixo para o estágio inicial da Núcleo Concursos.**

## Referências

[1] [Railway — Pricing](https://railway.com/pricing)

[2] [Render — Free instance limitations](https://render.com/docs/free)

[3] [Oracle Cloud — Always Free resources](https://docs.oracle.com/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)

[4] [Locaweb — Servidor VPS](https://www.locaweb.com.br/servidor-vps/)

[5] [Locaweb — Backup de Servidor Cloud Server PRO e VPS](https://www.locaweb.com.br/ajuda/wiki/backup-de-servidor-cloud-server-pro-vps/)

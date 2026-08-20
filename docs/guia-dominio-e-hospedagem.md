# Domínio próprio e hospedagem do Núcleo Concursos

## Resposta direta

Você pode usar o seu domínio próprio no site atual e manter o **GitHub como cópia independente do código**. Essa é a forma mais simples de colocar o endereço profissional no ar sem migrar agora a aplicação, que possui login, banco de dados, armazenamento de imagens e pagamentos.

> Não existe hospedagem que seja ao mesmo tempo **gratuita para sempre**, sem limites e com garantia de nunca ficar indisponível. Planos gratuitos podem dormir, expirar, suspender serviços ou mudar regras. Para um site que vende cursos, o objetivo correto é combinar hospedagem gerenciada, domínio sob seu controle e cópias recuperáveis.

## Estratégia recomendada

| Camada | Decisão recomendada | Motivo |
| --- | --- | --- |
| Domínio | Manter registrado em uma conta que seja sua, com e-mail e recuperação atualizados. | Você conserva o endereço mesmo se trocar de hospedagem. |
| DNS | Gerenciar o DNS em um serviço confiável, como Cloudflare, ou no próprio registrador. | Permite apontar o domínio para outra hospedagem sem perder o domínio. |
| Hospedagem atual | Vincular o domínio próprio à publicação gerenciada atual. | Mantém backend, banco, login local, imagens e Mercado Pago sem uma migração de risco. |
| Código | Manter o repositório privado no GitHub atualizado. | Permite reconstruir o serviço em outra plataforma, se necessário. |
| Dados | Manter exportações periódicas e documentadas do banco e dos arquivos importantes. | Evita que o banco seja o único ponto de recuperação. |
| Contingência | Guardar o roteiro de migração e as credenciais fora do repositório. | Reduz o tempo de retorno caso seja preciso trocar de fornecedor. |

## Como vincular seu domínio ao site atual

No painel do projeto, abra **Settings → Domains** e escolha a opção de adicionar ou vincular um domínio existente. Informe o domínio que você já comprou. O painel mostrará os registros DNS exigidos; eles podem ser um CNAME, um registro A ou uma troca de nameservers, dependendo do domínio e da configuração escolhida.

Depois, entre no site onde você comprou o domínio e abra a área de **DNS**. Copie os registros exibidos pelo painel exatamente como aparecem. Não apague os registros de e-mail existentes, caso use e-mail com o domínio. Espere a verificação concluir, teste `https://seu-dominio.com` e também `https://www.seu-dominio.com`, definindo um deles como endereço principal e redirecionando o outro.

Ao terminar, será necessário atualizar no Mercado Pago a **URL do site** e a URL do **webhook** para o novo domínio. O Access Token não muda por causa da troca de domínio, mas o endereço usado para receber notificações de pagamento deve ser revisado antes de ativar pagamentos reais.

## Se quiser usar Cloudflare no DNS

Cloudflare pode ser uma boa camada gratuita de DNS, HTTPS, cache e proteção contra tráfego abusivo. Para usar o domínio raiz, como `nucleoconcursos.com.br`, a documentação orienta adicionar a zona e trocar os nameservers no registrador. Para apenas um subdomínio, como `app.nucleoconcursos.com.br`, normalmente basta criar um CNAME apontando para o destino informado pela hospedagem. [1]

Cloudflare Pages tem plano gratuito com domínio próprio, integração ao Git e hospedagem estática. Porém, ele é adequado apenas para a parte estática: o Núcleo Concursos depende hoje de backend Node, banco de dados, uploads, sessão local e webhook. Por isso, uma migração direta para Pages não preservaria a aplicação atual. [1] [2]

## Por que não recomendo hospedagem gratuita para este site comercial

Serviços gratuitos para aplicações com backend geralmente possuem restrições incompatíveis com venda de cursos. Por exemplo, o Render informa que serviços web gratuitos entram em suspensão após 15 minutos sem tráfego, podem reiniciar e que o banco PostgreSQL gratuito expira após 30 dias, sem backup gerenciado. [3]

Uma VM gratuita, como as opções Always Free da Oracle, pode hospedar a aplicação, mas exige que você cuide de atualizações, firewall, banco, certificados, backup e monitoramento. Além disso, a própria Oracle indica que instâncias gratuitas ociosas podem ser retomadas e que pode faltar capacidade para criá-las. Ela serve como laboratório ou contingência técnica, não como promessa de disponibilidade permanente. [4]

## Proteção contra ficar fora do ar

Mantenha quatro controles simples e independentes:

1. **Renovação automática do domínio** e um e-mail de recuperação que você controla.
2. **Repositório GitHub atualizado**, com ao menos mais uma pessoa confiável como colaboradora, se desejar.
3. **Backup recorrente do banco e dos documentos operacionais**, guardado em local separado do servidor.
4. **Registro das variáveis e integrações** em um cofre de senhas: Mercado Pago, e-mail, Telegram, DNS e dados de acesso administrativo. Segredos não devem ficar no GitHub.

## Próximo passo necessário

Envie apenas o **nome do domínio** e diga em qual empresa ele foi comprado (por exemplo, Registro.br, Hostinger, GoDaddy ou outra). Com isso, posso lhe passar os registros DNS no formato exato e guiar a configuração pelo celular. Não envie senhas, código de recuperação nem token de pagamento.

## Referências

[1]: https://developers.cloudflare.com/pages/configuration/custom-domains/ "Cloudflare Pages — Custom domains"
[2]: https://pages.cloudflare.com/ "Cloudflare Pages"
[3]: https://render.com/docs/free "Render — Free instances"
[4]: https://docs.oracle.com/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm "Oracle Cloud — Always Free Resources"

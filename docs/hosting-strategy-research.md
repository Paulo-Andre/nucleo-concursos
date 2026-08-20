# Pesquisa de hospedagem e domínio próprio

Atualizado em 20 de agosto de 2026. Esta nota fundamenta a decisão de hospedagem do Núcleo Concursos, que possui cliente React, backend Express/tRPC, banco de dados, armazenamento de imagens, autenticação local e integração de pagamento.

| Alternativa | O que a documentação confirma | Adequação ao Núcleo Concursos |
| --- | --- | --- |
| Cloudflare Pages | O plano gratuito aceita domínios próprios, integra-se ao Git e atende conteúdo estático. O domínio raiz requer a zona no Cloudflare e a troca dos nameservers; um subdomínio pode usar CNAME. | Excelente para uma página institucional estática, mas não substitui diretamente o backend Node, banco e webhook atuais. |
| Render gratuito | Aceita domínio próprio e TLS, porém serviços web param após 15 minutos sem tráfego e podem reiniciar. O banco PostgreSQL gratuito expira após 30 dias e não possui backup gerenciado. | Inadequado para o checkout, autenticação e banco de produção. |
| Oracle Always Free | Oferece VMs dentro de uma cota gratuita, mas capacidade pode indisponível na criação e VMs ociosas podem ser retomadas pela plataforma. Exige operação de servidor, backups, atualizações e monitoramento próprios. | Pode ser contingência técnica, mas não é garantia de disponibilidade contínua nem solução sem manutenção. |

## Decisão preliminar

Não existe hospedagem **gratuita, vitalícia e com garantia de disponibilidade** para esta aplicação comercial dinâmica. Para reduzir risco, o domínio deve permanecer em conta própria do titular e o código deve permanecer no GitHub. A hospedagem gerenciada atual é a opção de menor esforço operacional enquanto se mantém um plano documentado de migração e backups independentes.

## Fontes

1. https://developers.cloudflare.com/pages/configuration/custom-domains/
2. https://pages.cloudflare.com/
3. https://docs.oracle.com/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
4. https://render.com/docs/free

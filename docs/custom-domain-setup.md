# Conexão de domínio próprio — Núcleo Concursos

Este projeto está publicado atualmente em `https://estudospf-peiyfhjy.manus.space/`. A conexão de um domínio próprio não exige alteração de código, mudança na integração do Mercado Pago nem troca da chave do Resend. Ela deve ser realizada no painel de gerenciamento do projeto, após o titular informar qual domínio utilizará.

## Antes de começar

Mantenha o domínio ativo no registrador onde ele foi comprado e confirme que você pode editar a zona DNS. Escolha se o endereço principal será, por exemplo, `nucleoconcursos.com.br`, `www.nucleoconcursos.com.br` ou um subdomínio como `app.nucleoconcursos.com.br`.

> **Não altere os nameservers do domínio e não crie registros por conta própria antes de o painel fornecer os valores.** Os valores de destino podem mudar conforme a configuração da hospedagem.

| Item | Decisão recomendada |
|---|---|
| Endereço principal | Usar `www.seudominio.com.br` ou `app.seudominio.com.br` para simplificar o DNS. |
| Domínio sem `www` | Configurar também, quando o painel oferecer “Set up both”, para evitar erro de certificado no endereço alternativo. |
| Registros antigos | Remover apenas A/CNAME conflitantes para o mesmo host, depois de comparar com a instrução exibida pelo painel. Preserve MX, SPF, DKIM e outros registros de e-mail. |
| HTTPS | Aguardar o certificado SSL/TLS automático ficar ativo antes de divulgar o novo endereço. |

## Procedimento no painel do projeto

1. Abra o projeto **Núcleo Concursos** e acesse **Settings → Domains**.
2. Escolha conectar um domínio existente e informe o endereço escolhido.
3. Copie exatamente os registros DNS apresentados pelo painel. A plataforma poderá solicitar um registro **A** ou **CNAME**; o tipo, o host e o destino exibidos são a fonte de verdade.
4. Entre no painel DNS do registrador do domínio e adicione ou atualize somente os registros solicitados.
5. Se desejar atender tanto o domínio raiz quanto `www`, marque a opção equivalente a **Set up both** e adicione o registro complementar indicado.
6. Volte ao painel do projeto, aguarde a verificação e confirme que o certificado HTTPS foi provisionado.
7. Teste `https://seudominio...`, login, recuperação de senha, checkout e o retorno do Mercado Pago em uma janela anônima antes de divulgar o endereço.

## Ajustes depois de o domínio estar ativo

Quando o novo domínio estiver funcionando, cadastre `RESEND_FROM_EMAIL` nas variáveis protegidas com um remetente do domínio verificado, por exemplo `Núcleo Concursos <contato@seudominio.com.br>`. No Resend, adicione e autentique esse domínio com os registros DNS que ele fornecer. Só então os e-mails de compra e recuperação devem sair com a identidade final da marca. Enquanto não houver um domínio de envio verificado, o remetente de teste `onboarding@resend.dev` pode ter restrições de destinatário impostas pelo Resend; portanto, ele não deve ser usado como configuração comercial definitiva.

O sistema gera novos links de recuperação usando automaticamente o domínio da solicitação. Para links enviados pelo checkout ou por outra origem, mantenha `PUBLIC_APP_URL` com o endereço HTTPS canônico escolhido, por exemplo `https://www.seudominio.com.br`.

## Referências oficiais

As orientações oficiais informam que o painel fornece os registros necessários, normalmente A ou CNAME, e provisiona HTTPS automaticamente após a conexão. Consulte a [documentação de domínio personalizado da Manus](https://manus.im/docs/website-builder/custom-domains) e as [orientações de conexão e DNS](https://help.manus.im/en/articles/11711203-how-can-i-connect-the-website-created-by-manus-to-my-custom-domain) antes de alterar a zona DNS.

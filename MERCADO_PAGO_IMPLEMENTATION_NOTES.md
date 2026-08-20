# Integração Mercado Pago — Referências de implementação

## Checkout escolhido

O projeto utilizará **Checkout Pro** como solução inicial. A preferência é criada exclusivamente no servidor, com `external_reference` igual ao ID interno do pedido comercial e com URL de notificação própria. O cliente recebe apenas a URL segura (`init_point` ou `sandbox_init_point`) para abrir o checkout hospedado pelo Mercado Pago.

## Confirmação de pagamento

O Mercado Pago envia notificações por `POST` para a URL configurada. A origem deve ser validada pela assinatura `x-signature`, pelo `x-request-id`, pelo identificador `data.id` e pela assinatura secreta configurada no painel. Depois da validação, o servidor consulta a API do Mercado Pago antes de marcar o pedido como pago e conceder/renovar as matrículas. A notificação deve responder com HTTP 200/201 após o processamento válido.

## Credenciais

O **Access Token** é privado e deve permanecer somente no servidor. A Public Key não é necessária para Checkout Pro hospedado. A assinatura secreta do webhook será configurada como segredo separado, após o cadastro da URL pública de notificação no painel.

## Fontes oficiais

- [Checkout Pro — visão geral](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/overview)
- [Webhooks — Checkout Pro](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/notifications/webhooks)
- [Credenciais](https://www.mercadopago.com.br/developers/en/docs/your-integrations/credentials)

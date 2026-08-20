# QA — Administração comercial e capas de curso

**Data de verificação:** 20/08/2026

| Área verificada | Resultado |
|---|---|
| Vitrine pública em desktop | Cartões de pacotes renderizados sem transbordamento; cursos sem capa usam o indicador visual de fallback. |
| Vitrine pública em 375 px | Títulos, preços, lista de trilhas e CTAs permanecem legíveis e empilhados corretamente. |
| Capas de curso | O catálogo comercial devolve a URL de capa do curso e a vitrine a exibe quando disponível; cursos já existentes sem imagem preservam a apresentação de fallback. |
| Exclusão de cupom | A interface exige redigitar o código do cupom antes de solicitar a remoção; o servidor preserva pedidos e transações consolidados. |
| Exclusão de usuário | A confirmação é comparada sem diferenciação de maiúsculas/minúsculas, usando nome ou usuário atuais, enquanto a remoção ocorre pelo identificador numérico estável. |

As imagens de capa são opcionais. Um curso sem capa não perde acesso, matrícula ou vínculo comercial.

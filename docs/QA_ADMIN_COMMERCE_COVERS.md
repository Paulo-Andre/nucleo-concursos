# QA — Exclusões administrativas e capas de curso

**Data de validação:** 20/08/2026  
**Escopo:** exclusão ROOT de usuários e cupons; persistência e apresentação das capas de curso.

| Verificação | Resultado |
|---|---|
| Confirmação de exclusão de usuário | Normalizada por valor textual e preservada para usuário renomeado ou com diferença de maiúsculas/minúsculas. |
| Proteção ROOT | A conta administrativa continua protegida pelas regras de exclusão existentes. |
| Exclusão de cupom | Ação ROOT remove o cupom pelo identificador estável; pedidos e transações consolidados permanecem preservados. |
| Capa de curso | Campo opcional persistido no catálogo de cursos, com envio para armazenamento remoto e edição no painel ROOT. |
| Vitrine pública | Os cartões de pacote aceitam e exibem a capa do curso vinculado quando ela estiver cadastrada. |
| Área autenticada | O catálogo de compra e a matriz/painel de estudos reutilizam a mesma URL de capa do curso liberado. |
| Desktop | Vitrine pública verificada em 1280 px, sem regressão de layout; cursos sem capa preservam o layout de fallback. |
| Celular | Vitrine pública verificada em 375 px, com cartões legíveis e sem transbordamento horizontal. |

## Validações automatizadas

Foram aprovados **96 testes em 44 arquivos**, incluindo as novas coberturas de confirmação de exclusão, remoção de cupom com preservação do histórico e persistência/retorno da capa para o aluno matriculado. A checagem de tipos e o build de produção também foram concluídos sem erros.

## Operação ROOT

1. Abra **ROOT → Cursos** e crie ou edite o curso.
2. Selecione uma imagem de capa em formato de imagem válido. O sistema valida tamanho e envia o arquivo ao armazenamento remoto.
3. Salve o curso. A capa passa a ser usada na vitrine dos pacotes vinculados, no catálogo autenticado e no cabeçalho da trilha liberada ao aluno.
4. Para excluir um cupom, abra **ROOT → Comércio**, localize o cupom e use a ação **Excluir**. A operação não altera pagamentos ou pedidos anteriores.

# Validação — Sessão única por conta

## Evidências

Em 20 de agosto de 2026, a prévia foi acessada com a conta ROOT local após a implementação da política de sessão única. O login autenticou a conta e abriu o painel principal corretamente. A regra de revogação foi coberta por teste de integração: o segundo token substitui o primeiro e somente o token novo continua autenticado.

## Critério visual

O aviso discreto de segurança deve aparecer no topo do painel autenticado somente quando o retorno do login informar que já existia uma sessão ativa. Ele explica que a sessão anterior foi encerrada e permite fechamento manual.

## Resultado visual

O marcador temporário de retorno foi aplicado apenas à sessão de prévia e a página foi recarregada. O painel exibiu o texto “Acesso atualizado. Havia outra sessão ativa nesta conta; ela foi encerrada para proteger seus dados.”, com botão acessível para fechar o aviso. A chave temporária foi removida da sessão após a leitura pelo painel.

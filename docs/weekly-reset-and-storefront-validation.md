# Validação — ciclo semanal e identidade da vitrine

## Verificação visual em 21/08/2026

| Área | Resultado | Observação |
| --- | --- | --- |
| Vitrine em computador | Aprovada | O cabeçalho, a rotina em três etapas, os cartões de pacotes, a chamada final e o rodapé permanecem legíveis e com hierarquia visual clara. |
| Vitrine em celular (375 px) | Aprovada | Não houve transbordamento de texto; os botões mantêm altura adequada ao toque; cartões e rodapé ficam empilhados com leitura preservada. |
| Ciclo competitivo | Coberto por teste | A apuração muda exatamente no domingo às 23h59 de Brasília e a rotina é idempotente em repetições do cron. |

## Regra de preservação de histórico

O agendamento não exclui `competitionAnswers`, `competitionRounds` nem `simulationRecords`. Ele apenas grava o marco semanal em `competitionSettings`; o ranking filtra respostas posteriores a esse marco e o selo soma somente os acertos de simulados do mesmo período.

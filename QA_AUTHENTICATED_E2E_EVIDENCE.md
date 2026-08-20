# Evidência de QA Autenticada — Núcleo Concursos

**Data de execução:** 20/08/2026  
**Ambiente:** desenvolvimento local, conta de aluno temporária com matrícula ativa no curso `pf-agente` e conta temporária ROOT.  
**Higiene de dados:** as contas, a matrícula, os itens de revisão, os registros de simulado e os perfis temporários foram removidos após a validação. Nenhuma senha, token de sessão ou CPF de QA é armazenado neste documento.

## Resultado técnico

| Verificação | Resultado | Evidência registrada |
|---|---|---|
| Login local do aluno | PASS | O contrato `auth.login` retornou HTTP 200 e a consulta subsequente a `auth.me` retornou HTTP 200 no mesmo navegador. |
| Persistência de sessão local | PASS | O navegador recebeu o cookie httpOnly de sessão com `Secure=false` e `SameSite=Lax` em `http://127.0.0.1`; em HTTPS, o contrato de cookie exige `Secure=true` e `SameSite=None`. |
| Página autenticada do aluno | PASS | Capturas desktop e mobile de 375 px exibiram matriz do curso, cards de progresso e a checagem diária personalizada, sem perda de controles críticos. |
| Página autenticada do ROOT | PASS | Capturas desktop e mobile de 375 px exibiram os atalhos administrativos **ALUNOS** e **QUESTÕES**, inclusive no cabeçalho compacto. |
| E2E de aluno por contrato | PASS | A suíte criou aluno temporário, concedeu matrícula, consultou acesso e estado, dispensou a checagem diária, incluiu/concluiu revisão pessoal e registrou simulado. |
| E2E ROOT por contrato | PASS | A mesma suíte listou o aluno, consultou e renovou sua matrícula, além de confirmar cursos e biblioteca de questões. |
| Limpeza automática | PASS | O teste remove a conta criada, as matrículas, a revisão, os registros de simulado e a auditoria de QA em `finally`; a limpeza visual temporária foi confirmada por consulta ao banco. |

> A validação de contratos cobre a lógica autenticada de ponta a ponta. A evidência visual específica da decisão editorial na fila de revisão permanece como pendência independente, descrita na matriz final de prontidão.

## Regressão associada

A execução completa de `pnpm test` em 20/08/2026 concluiu com **87 testes aprovados em 38 arquivos**, incluindo `auth.cookie.test.ts` e `e2e-authenticated.integration.test.ts`.

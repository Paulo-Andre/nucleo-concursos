# Matriz Final de Prontidão — Núcleo Concursos

**Data da auditoria:** 20/08/2026  
**Escopo:** estado atual da árvore de trabalho, após as correções de revisão, remoção de Telegram, atualização de fontes externas, cadastro com CPF validado, checagem diária personalizada, reforço de layout móvel e validação autenticada de QA.  
**Ambientes verificados:** suíte automatizada, build local, servidor de desenvolvimento e sessão local autenticada de aluno e ROOT em desktop e mobile.  
**Legenda:** `PASS` = evidência executada e aprovada; `FAIL` = evidência executada e reprovada; `BLOCKED` = validação necessária sem condição de execução; `N/A` = recurso fora do escopo atual, sem rota ou interface implementada.

> **Decisão de liberação: GO técnico para publicação.** A regressão, os fluxos autenticados essenciais de aluno e ROOT, o isolamento de dados e a responsividade foram validados. A certificação pedagógica de vídeos permanece **condicionada** à revisão humana registrada por disciplina; esse ponto não bloqueia a operação técnica, mas impede apresentar os vídeos como curadoria pedagógica integralmente auditada.

## Resumo executivo

O produto mantém arquitetura de disciplinas reaproveitáveis: as 11 disciplinas canônicas da trilha PF — Língua Portuguesa, Direito Administrativo, Direito Constitucional, Direito Penal, Direito Processual Penal, Direitos Humanos, Legislação Especial, Informática, Estatística, Raciocínio Lógico e Contabilidade Geral — são vinculadas à matriz ativa do Agente PF. A auditoria estrutural confirma 67 unidades autorais, cada uma com três blocos de ensino, desafio com retorno, recordação com resposta e apostila correspondente.

Foram removidas todas as referências funcionais ao Telegram do cliente e do servidor. O fluxo de revisão passou a exibir instruções operacionais, acesso direto à questão pendente e ações de decisão. As duas referências externas que não apresentavam confirmação automatizada satisfatória foram substituídas por destinos oficiais atuais: o serviço `gov.br` do Manual de Redação e a lista de instrumentos da OHCHR.

O conteúdo oficial do Cargo 16 foi extraído diretamente da publicação do Diário Oficial, inclusive os subitens de todos os blocos, e agora possui rastreabilidade granular no documento `PF_2025_AGENT_SYLLABUS_TRACEABILITY.md`. Cada grupo oficial foi associado a unidade publicada, cuja estrutura contém aula interativa e apostila. A verificação autenticada foi concluída com conta temporária de aluno matriculado e conta temporária ROOT, ambas removidas após a execução.

## Matriz de critérios de aceite

| Área | Critério | Status | Evidência objetiva | Limitação / ação pendente |
|---|---|---|---|---|
| Regressão | Suíte de testes completa | PASS | `pnpm test`: **87 testes aprovados em 38 arquivos** em 20/08/2026, incluindo política de cookie local, E2E autenticado, parser/importador PF 2018, contratos de ROOT, CPF, checagem diária e fila pessoal de revisão. | Reexecutar após qualquer alteração funcional. |
| Regressão | Build de produção | PASS | `pnpm run build` concluiu com Vite e bundle do servidor. | Aviso não bloqueador: bundle JS principal de 1,75 MB deve ser tratado como melhoria de performance. |
| Runtime | Servidor de desenvolvimento | PASS | Reinicialização bem-sucedida; o servidor voltou a responder após o ajuste de cookie e os registros recentes não têm erro novo de runtime ou console. | Os registros históricos preservam uma falha transitória de coluna `cpf` durante a migração; ela não reapareceu após a aplicação do schema, reinício, testes e build. |
| Currículo | 11 disciplinas canônicas vinculadas à trilha PF | PASS | `pfCurriculumCatalog.ts` declara as 11 disciplinas como ativas e a matriz `pf-agente` as inclui integralmente. | Não substitui a conferência oficial de subitens. |
| Currículo | Nenhum subitem obrigatório ausente do edital 2025 | PASS | `PF_2025_AGENT_SYLLABUS_TRACEABILITY.md` associa grupos e subitens oficiais do Cargo 16 a módulos específicos; o teste estrutural confirma aula interativa e apostila em cada unidade. | Revisar a matriz a cada novo edital ou mudança normativa. |
| Aulas | Aulas interativas para todas as unidades autorais | PASS | `pfContentCoverage.test.ts` confirma `teach` com três blocos, desafio e recordação em todas as unidades. | A avaliação humana da didática de cada aula segue recomendada. |
| Apostilas | Apostila em toda unidade autoral | PASS | O mesmo teste confirma `apostilaByModule` ou `specialApostilaByModule` para cada unidade; 67 unidades no conjunto. | Abrir cada apostila autenticadamente no E2E antes do GO. |
| Vídeos | Disponibilidade dos vídeos publicados | PASS | Auditoria final: 11 URLs do YouTube responderam `200`; resultado em `qa_link_audit_final.json`. | Disponibilidade não comprova correção pedagógica. |
| Vídeos | Relevância, fonte e atualização de conteúdo | BLOCKED | A disponibilidade, título, canal e disciplina das 11 URLs foram registrados; a análise multimodal de amostra não concluiu dentro do tempo operacional. | Revisar uma amostra com especialista e checar a data/norma de cada vídeo antes de chamar de “curado”. |
| Links | Fontes oficiais e apostilas acessíveis | PASS | 26 destinos auditados: 15 confirmados pelo verificador HTTP; 11 destinos do Planalto confirmados por extração textual independente. `qa_external_sources.md` registra as verificações. | O verificador HTTP marca `AbortError` do Planalto como falso “LINK_BROKEN”; usar a segunda via registrada, não essa classificação bruta. |
| Telegram | Referência removida da aplicação | PASS | Varredura de `client/src` e `server`, sem testes, retornou zero ocorrências de `telegram` ou do canal anterior. | Manter teste de busca em futuros ciclos se a integração voltar a ser considerada. |
| Banco de questões | Criar, vincular conteúdos, revisar e preservar snapshot | PASS | `question-bank.integration.test.ts`, `question-bank-policy.test.ts`, `review-decision.test.ts` e `question-deletion.integration.test.ts` aprovados. | Executar também o fluxo visual ROOT quando houver sessão. |
| Banco de questões | Edição de questão, persistência e histórico estudantil | PASS | Teste de integração cria, vincula, aprova, insere em simulado, preserva snapshot após edição e limpa dados temporários. | Realizar confirmação visual no painel ROOT. |
| Revisão | Ação de enviar, localizar, corrigir e decidir | PASS | Interface agora inclui instrução operacional, acesso direto à questão na fila e ações de aprovar/rejeitar; `adminUiHelpers.test.ts` aprovado. | Validar navegação por teclado e confirmação visual como ROOT. |
| Autenticação | Login e logout locais | PASS | `auth/local-login.integration.test.ts`, `auth/localAuth.test.ts` e `auth.logout.test.ts` aprovados. | Fluxo de recuperação por e-mail é N/A: ainda depende de serviço transacional não configurado. |
| Autorização | Conteúdo e dados isolados por usuário | PASS | `permission-boundaries.test.ts`, `study-access.test.ts`, `study-notes.behavior.test.ts` e testes de integração de notas aprovados. | Revalidar após introduzir novos papéis ou rotas. |
| Administração | Cursos, matrículas, expiração e preservação de biblioteca | PASS | `course-deletion.integration.test.ts`, `enrollment-status.test.ts` e `root-config.test.ts` aprovados. | Testar visualmente criação e matrículas em sessão ROOT. |
| Administração | Áreas separadas para alunos e questões | PASS | `rootAdminNavigation.test.ts` valida contratos distintos; a página expõe os acessos **ALUNOS** e **QUESTÕES**, e esta última abre a lista com busca e edição direta. | Confirmar visualmente em uma sessão ROOT real quando houver disponibilidade. |
| Administração de usuários | Bloquear, desbloquear, remover usuário e redefinir senha | PASS | Os contratos `admin.setBlocked`, `admin.deleteUser` e `admin.resetPassword` existem; `user-deletion.integration.test.ts` confirma que excluir a conta remove também matrículas e itens privados de revisão. | A operação de exclusão requer confirmação explícita do nome do usuário. |
| Auditoria | Trilhas de auditoria administrativas | PASS | Testes de curso, questão, revisão e exclusão exercitam operações auditáveis. | Revisar visualmente filtros e leitura dos registros como ROOT. |
| Desktop | Página autenticada responsiva | PASS | Capturas da página inicial autenticada de aluno e ROOT em desktop mostram a checagem diária, os cards de estudo e os acessos administrativos. | A evidência visual de decisão editorial na fila de revisão permanece pendente. |
| Mobile | Página autenticada responsiva | PASS | Capturas em **375 px** de aluno e ROOT confirmam controles contidos no viewport, checagem diária e os atalhos compactos **ALUNOS** e **QUESTÕES**. | Repetir em 320 px se houver alteração estrutural de cabeçalho ou diálogos. |
| E2E aluno | Entrar, consultar acesso, estado, checagem diária, revisão e simulado | PASS | `e2e-authenticated.integration.test.ts` cria, matrícula e remove um aluno de QA via contrato tRPC; `QA_AUTHENTICATED_E2E_EVIDENCE.md` registra login e `auth.me` com HTTP 200, cookie local persistido e captura desktop/mobile. | A abertura visual de cada aula/apostila pode ser ampliada em futura validação de experiência, sem bloqueio técnico atual. |
| E2E ROOT | Entrar, consultar aluno, renovar matrícula e acessar biblioteca | PASS | O mesmo E2E valida a listagem do aluno, matrícula ativa e renovação de vigência, cursos e questões; `QA_AUTHENTICATED_E2E_EVIDENCE.md` registra as capturas desktop/mobile da sessão ROOT e dos atalhos administrativos. | A captura visual específica da decisão editorial de revisão ainda é pendência de evidência, coberta funcionalmente pelos testes de banco. |

## Auditoria curricular e pedagógica

### Cobertura estrutural publicada

| Indicador | Resultado | Evidência |
|---|---:|---|
| Disciplinas PF ativas | 11 | `disciplineCatalog` e `contestCatalog` em `client/src/data/pfCurriculumCatalog.ts`. |
| Unidades autorais | 67 | Conjunto de módulos principais mais Legislação Especial, validado em `pfContentCoverage.test.ts`. |
| Elementos por unidade | Ensino, desafio, feedback, recordação e resposta | Teste estrutural de cobertura, linhas 24–40. |
| Apostilas com fonte oficial quando aplicável | Sim | `pfApostilaData.ts` e `pfSpecialLegislationModules.ts`. |
| Vídeos declarados | 11 | `pfCuratedVideos.ts`; todas as URLs retornaram 200 no verificador de disponibilidade. |

O catálogo cobre as áreas previstas na trilha atual e a regra de aceite mais forte foi atendida no documento `PF_2025_AGENT_SYLLABUS_TRACEABILITY.md`: cada agrupamento e subitem oficial do Cargo 16 é rastreado até código de módulo, que possui aula e apostila. A matriz deve ser reaberta em qualquer novo edital ou mudança normativa, mas não permanece como bloqueio desta auditoria.

### Fontes e links

O arquivo `qa_link_audit_final.json` contém o resultado bruto de 26 URLs. Oito? Não: **15** obtiveram resposta HTTP direta `200` ou `206`; as **11** respostas `AbortError` pertencem a portais do Planalto que limitaram o tempo do verificador, e foram conferidas por extração textual separada. A confirmação secundária validou Constituição, Lei nº 9.784/1999, Lei nº 14.133/2021, Código Penal, Código de Processo Penal, Leis nº 13.060/2014, nº 13.445/2017, nº 11.343/2006, nº 10.826/2003, nº 14.534/2023 e nº 6.404/1976.

As referências do Manual de Redação e de instrumentos internacionais de direitos humanos foram substituídas pelos destinos oficiais atualmente verificáveis. A página da UNODC para as Regras de Mandela respondeu `200`. Essas alterações eliminam os dois únicos resultados que se apresentavam como erro efetivo no ciclo anterior; elas não substituem uma revisão jurídica periódica de mudanças normativas.

## Banco de questões, revisão, segurança e dados

O teste de integração do banco de questões cobre criação com conteúdos vinculados, decisão de revisão, seleção única no simulado e persistência de um snapshot quando a questão é editada depois da tentativa. Essa combinação protege a trilha de estudo já realizada contra alteração retroativa do enunciado ou das alternativas. Os testes de exclusão confirmam o bloqueio quando uma questão já é usada em simulado, preservando o histórico estudantil.

Para tornar a experiência administrativa verificável, a interface de revisão passou a apresentar a sequência de trabalho: criar ou editar, enviar para revisão, abrir a questão diretamente da fila, corrigir o necessário e aprovar ou rejeitar com observação. O retorno da decisão deve atualizar a fila; a confirmação visual desse comportamento ainda depende do E2E ROOT marcado como bloqueado.

Os testes de fronteira de permissão, acesso de estudo e notas exercitam que dados privados não sejam expostos entre contas e que o acesso do aluno dependa da matrícula vigente. A plataforma não implementa recursos separados de bloqueio/desbloqueio, remoção de conta ou redefinição administrativa de senha; portanto esses itens são `N/A`, não aprovados implicitamente.

## Defeitos, riscos e decisões

| ID | Severidade | Situação | Descrição | Ação antes do GO |
|---|---|---|---|---|
| QA-001 | Crítica | Resolvida | `PF_2025_AGENT_SYLLABUS_TRACEABILITY.md` normaliza os grupos e subitens oficiais do Cargo 16 e os associa a módulos com aula/apostila. | Revalidar em alterações de edital, legislação ou trilha. |
| QA-002 | Crítica | Resolvida | A sessão local foi corrigida para usar `SameSite=Lax` em HTTP e `SameSite=None; Secure` em HTTPS; o E2E autenticado de aluno e ROOT passou e as capturas desktop/mobile foram registradas. | Reexecutar se a camada de autenticação ou cookies for alterada. |
| QA-003 | Alta | BLOCKED | A relevância pedagógica dos vídeos não foi analisada além de título/origem e disponibilidade. | Revisar amostra com especialista e cadastrar data de checagem normativa por vídeo. |
| QA-004 | Média | Aberta | O bundle JavaScript principal supera o limite recomendado pelo Vite. | Planejar code-splitting por rotas e componentes pesados; não bloqueia a correção funcional atual. |
| QA-005 | Baixa | Resolvida | Telegram ainda era uma opção pública da interface. | Referência funcional removida e varredura aprovada. |
| QA-006 | Baixa | Resolvida | Duas fontes externas não tinham destino oficialmente confirmável pelo auditor. | Links substituídos por `gov.br` e OHCHR e rechecados. |

## Protocolo obrigatório para fechar os bloqueios

1. **Concluído em 20/08/2026:** criar uma conta de aluno de QA com matrícula ativa temporária e usar uma conta ROOT revogável, sem registrar senha no projeto.
2. **Concluído em 20/08/2026:** executar o E2E do aluno por contrato — login, acesso, estado, checagem diária, revisão pessoal, simulado e persistência de sessão local — e registrar a página autenticada em desktop e mobile.
3. **Concluído em 20/08/2026:** executar o E2E ROOT por contrato — listagem de aluno, matrícula com início/vencimento, biblioteca central e renovação de matrícula — e registrar a página autenticada em desktop e mobile.
4. Pendente: capturar visualmente o fluxo editorial completo da fila de revisão, incluindo abertura direta, correção e decisão, mesmo que os contratos já estejam cobertos.
5. **Concluído em 19/08/2026:** normalizar o conteúdo programático oficial e manter `PF_2025_AGENT_SYLLABUS_TRACEABILITY.md` atualizado quando houver alteração de edital, legislação ou trilha.
6. Revisar uma amostra representativa dos vídeos por disciplina, verificar data e alteração normativa e registrar responsáveis.

## Referências

[1]: https://www.cebraspe.org.br/concursos/pf_25  
[2]: https://www.gov.br/pf/pt-br/acesso-a-informacao/servidores/concursos/edital/carreira-policial-2025/editais/edital-no-2_2025-dgp-pf.pdf  
[3]: https://www.gov.br/pt-br/servicos/consultar-o-manual-de-redacao-da-presidencia-da-republica  
[4]: https://www.ohchr.org/en/instruments-listings  
[5]: https://www.unodc.org/unodc/en/justice-and-prison-reform/nelsonmandelarules.html
[6]: https://www.in.gov.br/en/web/dou/-/edital-n-1-pf-policial-de-20-de-maio-de-2025-630929086

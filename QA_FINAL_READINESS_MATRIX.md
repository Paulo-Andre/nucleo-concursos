# Matriz Final de Prontidão — Estudos PF

**Data da auditoria:** 19/08/2026  
**Escopo:** estado atual da árvore de trabalho, após as correções de revisão, remoção de Telegram, atualização de fontes externas e separação administrativa entre alunos e questões.  
**Ambientes verificados:** suíte automatizada, build local, servidor de desenvolvimento, página pública em desktop e mobile; a sessão autenticada não estava disponível no navegador de QA.  
**Legenda:** `PASS` = evidência executada e aprovada; `FAIL` = evidência executada e reprovada; `BLOCKED` = validação necessária sem condição de execução; `N/A` = recurso fora do escopo atual, sem rota ou interface implementada.

> **Decisão de liberação: NO-GO.** A regressão técnica está aprovada, mas não é possível declarar a plataforma pronta para uso público sem a conferência linha a linha do conteúdo programático oficial e sem o fluxo E2E autenticado de aluno e ROOT. Não há falha técnica bloqueadora encontrada no build ou nos testes atuais; há duas lacunas de evidência que impedem a certificação final.

## Resumo executivo

O produto mantém arquitetura de disciplinas reaproveitáveis: as 11 disciplinas canônicas da trilha PF — Língua Portuguesa, Direito Administrativo, Direito Constitucional, Direito Penal, Direito Processual Penal, Direitos Humanos, Legislação Especial, Informática, Estatística, Raciocínio Lógico e Contabilidade Geral — são vinculadas à matriz ativa do Agente PF. A auditoria estrutural confirma 67 unidades autorais, cada uma com três blocos de ensino, desafio com retorno, recordação com resposta e apostila correspondente.

Foram removidas todas as referências funcionais ao Telegram do cliente e do servidor. O fluxo de revisão passou a exibir instruções operacionais, acesso direto à questão pendente e ações de decisão. As duas referências externas que não apresentavam confirmação automatizada satisfatória foram substituídas por destinos oficiais atuais: o serviço `gov.br` do Manual de Redação e a lista de instrumentos da OHCHR.

O requisito de cobertura integral do edital permanece bloqueado. A página oficial do concurso foi identificada, mas o PDF do edital não pôde ser convertido de forma confiável no ambiente; por integridade, não foi declarada equivalência completa tópico a tópico apenas com base nos nomes de disciplinas. A verificação visual autenticada também depende de uma sessão local válida de aluno e de ROOT.

## Matriz de critérios de aceite

| Área | Critério | Status | Evidência objetiva | Limitação / ação pendente |
|---|---|---|---|---|
| Regressão | Suíte de testes completa | PASS | `pnpm test`: **28 arquivos / 59 testes aprovados** em 19/08/2026, incluindo fila pessoal de revisão e navegação ROOT. | Reexecutar após qualquer alteração funcional. |
| Regressão | Build de produção | PASS | `pnpm run build` concluiu com Vite e bundle do servidor. | Aviso não bloqueador: bundle JS principal de 1,75 MB deve ser tratado como melhoria de performance. |
| Runtime | Servidor de desenvolvimento | PASS | Reinicialização bem-sucedida; logs recentes mostram conexão Vite sem erro novo. | Um `SyntaxError` anterior relativo a `ensureDefaultKnowledgeBase` permaneceu apenas no histórico do console; não reapareceu após reinício, build e testes. |
| Currículo | 11 disciplinas canônicas vinculadas à trilha PF | PASS | `pfCurriculumCatalog.ts` declara as 11 disciplinas como ativas e a matriz `pf-agente` as inclui integralmente. | Não substitui a conferência oficial de subitens. |
| Currículo | Nenhum subitem obrigatório ausente do edital 2025 | BLOCKED | A matriz `PF_2025_AGENT_SYLLABUS_COVERAGE.md` associa os 11 blocos temáticos e seus módulos publicados, usando o programa detalhado de apoio como trilha de reconciliação. A fonte normativa oficial permanece registrada em `qa_external_sources.md`. | Falta a reconciliação literal, tópico a tópico, com o anexo oficial. Não afirmar cobertura total antes dessa conferência. |
| Aulas | Aulas interativas para todas as unidades autorais | PASS | `pfContentCoverage.test.ts` confirma `teach` com três blocos, desafio e recordação em todas as unidades. | A avaliação humana da didática de cada aula segue recomendada. |
| Apostilas | Apostila em toda unidade autoral | PASS | O mesmo teste confirma `apostilaByModule` ou `specialApostilaByModule` para cada unidade; 67 unidades no conjunto. | Abrir cada apostila autenticadamente no E2E antes do GO. |
| Vídeos | Disponibilidade dos vídeos publicados | PASS | Auditoria final: 11 URLs do YouTube responderam `200`; resultado em `qa_link_audit_final.json`. | Disponibilidade não comprova correção pedagógica. |
| Vídeos | Relevância, fonte e atualização de conteúdo | BLOCKED | Foi iniciada análise multimodal amostral, interrompida após exceder o tempo operacional. | Revisar uma amostra com especialista e checar a data/norma de cada vídeo antes de chamar de “curado”. |
| Links | Fontes oficiais e apostilas acessíveis | PASS | 26 destinos auditados: 15 confirmados pelo verificador HTTP; 11 destinos do Planalto confirmados por extração textual independente. `qa_external_sources.md` registra as verificações. | O verificador HTTP marca `AbortError` do Planalto como falso “LINK_BROKEN”; usar a segunda via registrada, não essa classificação bruta. |
| Telegram | Referência removida da aplicação | PASS | Varredura de `client/src` e `server`, sem testes, retornou zero ocorrências de `telegram` ou do canal anterior. | Manter teste de busca em futuros ciclos se a integração voltar a ser considerada. |
| Banco de questões | Criar, vincular conteúdos, revisar e preservar snapshot | PASS | `question-bank.integration.test.ts`, `question-bank-policy.test.ts`, `review-decision.test.ts` e `question-deletion.integration.test.ts` aprovados. | Executar também o fluxo visual ROOT quando houver sessão. |
| Banco de questões | Edição de questão, persistência e histórico estudantil | PASS | Teste de integração cria, vincula, aprova, insere em simulado, preserva snapshot após edição e limpa dados temporários. | Realizar confirmação visual no painel ROOT. |
| Revisão | Ação de enviar, localizar, corrigir e decidir | PASS | Interface agora inclui instrução operacional, acesso direto à questão na fila e ações de aprovar/rejeitar; `adminUiHelpers.test.ts` aprovado. | Validar navegação por teclado e confirmação visual como ROOT. |
| Autenticação | Login e logout locais | PASS | `auth/local-login.integration.test.ts`, `auth/localAuth.test.ts` e `auth.logout.test.ts` aprovados. | Fluxo de recuperação por e-mail é N/A: ainda depende de serviço transacional não configurado. |
| Autorização | Conteúdo e dados isolados por usuário | PASS | `permission-boundaries.test.ts`, `study-access.test.ts`, `study-notes.behavior.test.ts` e testes de integração de notas aprovados. | Revalidar após introduzir novos papéis ou rotas. |
| Administração | Cursos, matrículas, expiração e preservação de biblioteca | PASS | `course-deletion.integration.test.ts`, `enrollment-status.test.ts` e `root-config.test.ts` aprovados. | Testar visualmente criação e matrículas em sessão ROOT. |
| Administração | Áreas separadas para alunos e questões | PASS | `rootAdminNavigation.test.ts` valida contratos distintos; a página expõe os acessos **ALUNOS** e **QUESTÕES**, e esta última abre a lista com busca e edição direta. | Confirmar visualmente em uma sessão ROOT real quando houver disponibilidade. |
| Administração de usuários | Bloquear, desbloquear, remover usuário e redefinir senha | N/A | Não existem rotas nem interface administrativas específicas para bloqueio/desbloqueio/remoção de usuário. | Só implementar se este for um requisito do negócio; exigir confirmação de regra de retenção e recuperação de acesso. |
| Auditoria | Trilhas de auditoria administrativas | PASS | Testes de curso, questão, revisão e exclusão exercitam operações auditáveis. | Revisar visualmente filtros e leitura dos registros como ROOT. |
| Desktop | Página pública, login e cadastro responsivos | PASS | Capturas desktop da página pública concluídas no ciclo de QA. | Painel autenticado não foi acessado nesta sessão. |
| Mobile | Página pública, login e cadastro responsivos | PASS | Capturas mobile da mesma página pública concluídas. | Simulado, apostila, perfil e administração exigem sessão para validação final. |
| E2E aluno | Entrar, abrir trilha, iniciar aula, registrar avanço e retomar após novo login | BLOCKED | O navegador não dispunha de sessão nem de credencial de aluno de teste. | Requer aluno de QA com matrícula ativa e confirmação manual das etapas. |
| E2E ROOT | Entrar, criar/editar questão, enviar para revisão e gerir matrícula | BLOCKED | O navegador não dispunha de sessão ROOT para esta execução. | Requer login ROOT feito pelo titular ou credencial de QA temporária e revogável. |

## Auditoria curricular e pedagógica

### Cobertura estrutural publicada

| Indicador | Resultado | Evidência |
|---|---:|---|
| Disciplinas PF ativas | 11 | `disciplineCatalog` e `contestCatalog` em `client/src/data/pfCurriculumCatalog.ts`. |
| Unidades autorais | 67 | Conjunto de módulos principais mais Legislação Especial, validado em `pfContentCoverage.test.ts`. |
| Elementos por unidade | Ensino, desafio, feedback, recordação e resposta | Teste estrutural de cobertura, linhas 24–40. |
| Apostilas com fonte oficial quando aplicável | Sim | `pfApostilaData.ts` e `pfSpecialLegislationModules.ts`. |
| Vídeos declarados | 11 | `pfCuratedVideos.ts`; todas as URLs retornaram 200 no verificador de disponibilidade. |

O catálogo cobre as áreas previstas na trilha atual, mas a regra de aceite solicitada é mais forte: exige que **cada subitem obrigatório do edital** esteja explícito em aula, módulo, apostila ou questão. Para evitar uma conclusão enganosa, este ponto continua `BLOCKED` até que o programa de conhecimentos específico seja transcrito do documento oficial, normalizado e cruzado contra cada código de módulo.

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
| QA-001 | Crítica | BLOCKED | Não há prova reproduzível de cobertura integral dos subitens do edital oficial. | Converter ou obter o anexo programático e executar matriz tópico × módulo/apostila/questão. |
| QA-002 | Crítica | BLOCKED | Não foi possível executar os fluxos E2E autenticados de aluno e ROOT sem uma sessão de QA. | Usar duas contas de teste, uma matrícula ativa e uma conta ROOT, com evidências de cada passo. |
| QA-003 | Alta | BLOCKED | A relevância pedagógica dos vídeos não foi analisada além de título/origem e disponibilidade. | Revisar amostra com especialista e cadastrar data de checagem normativa por vídeo. |
| QA-004 | Média | Aberta | O bundle JavaScript principal supera o limite recomendado pelo Vite. | Planejar code-splitting por rotas e componentes pesados; não bloqueia a correção funcional atual. |
| QA-005 | Baixa | Resolvida | Telegram ainda era uma opção pública da interface. | Referência funcional removida e varredura aprovada. |
| QA-006 | Baixa | Resolvida | Duas fontes externas não tinham destino oficialmente confirmável pelo auditor. | Links substituídos por `gov.br` e OHCHR e rechecados. |

## Protocolo obrigatório para fechar os bloqueios

1. Fornecer ou abrir no navegador uma conta de **aluno de QA**, com matrícula ativa temporária, e uma sessão **ROOT**. Nenhuma senha deve ser registrada neste documento ou em código.
2. Executar o E2E do aluno: login; painel; trilha; aula; vídeo; apostila; questão; simulado; revisão de resultado; logout/login; confirmação do progresso e da nota.
3. Executar o E2E ROOT: login; curso; matrícula com início e vencimento; criação e edição de questão; envio para revisão; decisão; auditoria; exclusão bloqueada de questão usada.
4. Validar os mesmos passos críticos em viewport mobile e desktop; registrar captura, data, usuário de teste e resultado.
5. Obter o conteúdo programático do edital oficial em texto, mapear cada item à unidade publicada e classificar `PASS`, `FAIL` ou `BLOCKED`. Só então remover QA-001.
6. Revisar uma amostra representativa dos vídeos por disciplina, verificar data e alteração normativa e registrar responsáveis.

## Referências

[1]: https://www.cebraspe.org.br/concursos/pf_25  
[2]: https://www.gov.br/pf/pt-br/acesso-a-informacao/servidores/concursos/edital/carreira-policial-2025/editais/edital-no-2_2025-dgp-pf.pdf  
[3]: https://www.gov.br/pt-br/servicos/consultar-o-manual-de-redacao-da-presidencia-da-republica  
[4]: https://www.ohchr.org/en/instruments-listings  
[5]: https://www.unodc.org/unodc/en/justice-and-prison-reform/nelsonmandelarules.html

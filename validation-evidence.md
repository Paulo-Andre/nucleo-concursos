# Registro de validação ROOT

## Evidência em andamento — 19/08/2026

- O formulário publicado de **Nova questão** foi preenchido com o enunciado temporário `[VALIDAÇÃO DE MENSAGEM] Questão temporária para registrar o aviso de criação bem-sucedida no painel ROOT.`
- O tipo selecionado é **Certo / Errado** e a resposta correta está definida como **CERTO**.
- A biblioteca central exibiu **67 conteúdos disponíveis**, com conteúdos selecionáveis para o vínculo N:N.

O envio foi confirmado no painel ROOT publicado. A interface renderizou a mensagem: **“Questão criada com identificador persistente.”** A persistência foi conferida sob o identificador temporário **#360001**. O próximo passo é confirmar explicitamente o cartão correspondente na listagem e removê-lo pelo fluxo auditável.

A recarga confirmou visualmente o cartão **#360001**, identificado como **RASCUNHO**, na listagem administrativa e a auditoria **“Questão 360001 criada.”** A exclusão do mesmo registro temporário será a última limpeza antes do checkpoint final.

A evidência DOM publicada registrou o cartão com o texto completo `#360001 · [VALIDAÇÃO DE MENSAGEM]` e o rótulo `RASCUNHO`, acompanhado da auditoria `Questão 360001 criada.` Após a confirmação explícita de exclusão, a listagem filtrada passou a exibir `Nenhuma questão encontrada` e a auditoria registrou `Questão 360001 excluída antes de ser usada em simulado.`

A versão `c6aca0ef` foi aberta como ROOT. Antes da estabilização das consultas, a área de vínculos exibiu o estado de carregamento da biblioteca central; a validação seguinte aguardará os conteúdos persistentes estarem disponíveis.

Após a estabilização, a interface ROOT exibiu **67 conteúdos disponíveis**. O vínculo reutilizável **DPP-05 — Provas e preservação do local** foi selecionado para a questão temporária de validação final.

Na primeira tentativa de envio final, o formulário permaneceu preenchido e não exibiu confirmação de criação. A validação foi interrompida antes de qualquer persistência; a seleção efetiva do vínculo será conferida antes de repetir o envio.

A operação assíncrona posteriormente registrou a criação temporária **#410001** na auditoria ROOT. Contudo, a leitura do DOM após a criação mostrou que o enunciado e o vínculo ainda permaneciam preenchidos no formulário. A reinicialização após sucesso permanece pendente de correção antes da publicação final.

Após a publicação da remontagem controlada, o painel ROOT exibiu uma nova instância do formulário com o campo de enunciado vazio e sem conteúdos selecionados. Na mesma tela, a listagem mostrou o cartão temporário **#450001** em estado **RASCUNHO**, comprovando que a criação persistiu enquanto o estado anterior do formulário foi descartado. A última etapa é excluir esse cartão pelo fluxo auditável.

O cartão **#450001** foi excluído pelo próprio painel ROOT após confirmação explícita. A listagem retornou ao estado **“Nenhuma questão encontrada”** e a auditoria recente exibiu **“Questão 450001 excluída antes de ser usada em simulado.”** Nenhuma questão temporária de validação permaneceu na biblioteca central.

Para a validação definitiva da publicação `6c412ebd`, o formulário ROOT reinicializado recebeu o enunciado `[VALIDAÇÃO EVIDÊNCIA FINAL]`, com resposta **CERTO** e vínculo marcado para o conteúdo central **DPP-05 — Provas e preservação do local**. O próximo passo é um único envio controlado pelo botão **Criar questão**.

O envio controlado concluiu com a mensagem renderizada no painel ROOT: **“Questão #540001 criada com identificador persistente.”** Na mesma leitura do DOM, o campo de enunciado retornou vazio e não havia conteúdos marcados, comprovando a reinicialização do formulário após o sucesso.

Em seguida, a edição controlada do cartão **#540001** confirmou e salvou o vínculo **DPP-05 — Provas e preservação do local**, com histórico de atualização. Após a confirmação explícita de exclusão, o DOM reportou `cardStillPresent: false`, `emptyQuestionList: true` e a auditoria exibiu **“Questão 540001 excluída antes de ser usada em simulado.”**

As verificações finais concluíram com **25 arquivos de teste e 53 testes aprovados**, incluindo os cinco casos de `question-form-validation.test.ts`; a verificação de tipos e o build de produção também terminaram sem erros. Após o reinício mais recente, o servidor iniciou normalmente e não reapresentou o erro histórico de exportação `ensureDefaultKnowledgeBase`.

A inspeção final confirmou que `KnowledgeBaseManager.tsx` usa `questionCreationSuccessMessage(created.id)` na mutação de criação e passa `key={editing?.id ?? newQuestionFormKey(newQuestionRevision)}` ao formulário, incrementando a revisão após criar uma questão. O teste unitário cobre a mensagem `Questão #42 criada com identificador persistente.` e a geração de uma nova chave. O banco exporta `ensureDefaultKnowledgeBase`, enquanto `rootBootstrap.ts` a importa e a executa para o ROOT; a última inicialização registrou apenas o servidor em execução, sem nova exceção de exportação.

A sessão isolada iniciada às **14:00:24** registrou somente a inicialização do comando de desenvolvimento e `Server running on http://localhost:3000/`. Uma verificação negativa no intervalo confirmou a ausência de `SyntaxError`, `ensureDefaultKnowledgeBase` e de mensagens de exportação ausente. O bootstrap ROOT importa a função de `../db` e a chama nos três caminhos possíveis; `server/db.ts` a exporta como função assíncrona idempotente.

O checkpoint final **d5cf7cd8** foi aberto no domínio público com a sessão ROOT ativa; o painel administrativo foi exibido com as abas de banco de questões, conteúdos, disciplinas e revisão.

Após as consultas concluírem, a publicação **d5cf7cd8** confirmou no painel ROOT os **67 conteúdos** reutilizáveis da biblioteca central, os cursos **PF**, **PM** e **PRF** ativos e a auditoria recente. A versão final segue acessível em `https://estudospf-peiyfhjy.manus.space/`.

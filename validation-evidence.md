# Registro de validação ROOT

## Evidência em andamento — 19/08/2026

- O formulário publicado de **Nova questão** foi preenchido com o enunciado temporário `[VALIDAÇÃO DE MENSAGEM] Questão temporária para registrar o aviso de criação bem-sucedida no painel ROOT.`
- O tipo selecionado é **Certo / Errado** e a resposta correta está definida como **CERTO**.
- A biblioteca central exibiu **67 conteúdos disponíveis**, com conteúdos selecionáveis para o vínculo N:N.

O envio foi confirmado no painel ROOT publicado. A interface renderizou a mensagem: **“Questão criada com identificador persistente.”** A persistência foi conferida sob o identificador temporário **#360001**. O próximo passo é confirmar explicitamente o cartão correspondente na listagem e removê-lo pelo fluxo auditável.

A recarga confirmou visualmente o cartão **#360001**, identificado como **RASCUNHO**, na listagem administrativa e a auditoria **“Questão 360001 criada.”** A exclusão do mesmo registro temporário será a última limpeza antes do checkpoint final.

A evidência DOM publicada registrou o cartão com o texto completo `#360001 · [VALIDAÇÃO DE MENSAGEM]` e o rótulo `RASCUNHO`, acompanhado da auditoria `Questão 360001 criada.` Após a confirmação explícita de exclusão, a listagem filtrada passou a exibir `Nenhuma questão encontrada` e a auditoria registrou `Questão 360001 excluída antes de ser usada em simulado.`

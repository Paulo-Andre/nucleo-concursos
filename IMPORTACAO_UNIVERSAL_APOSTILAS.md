# Importação universal de apostilas PDF

O importador em massa usa os conteúdos já cadastrados na disciplina selecionada como destinos. Não há cadastro de prefixos fixos (PT, RLM, etc.) para cada matéria.

## Fluxo para qualquer disciplina nova

1. Cadastre a disciplina e importe os conteúdos pelo Excel.
2. Na biblioteca, selecione a disciplina e os arquivos PDF (até 100 PDFs por lote e 10 MB cada).
3. Clique em **Conferir correspondências**. Um PDF pode ser identificado automaticamente por número de aula (ex.: `Aula_01.pdf`, `BIO_Aula_01.pdf`), código de tema presente no título (ex.: `FIS 2.3.pdf`) ou nome exatamente igual ao título de um conteúdo.
4. Se não houver correspondência, selecione no mesmo painel o **grupo de aula**, **conteúdo individual** ou marque **vários conteúdos**. O nome original do PDF pode permanecer inalterado.
5. Revalide e leia o mapa antes de confirmar.

## Segurança e integridade

- A pesquisa de destinos fica restrita aos conteúdos vinculados à disciplina escolhida.
- Quando duas aulas têm o mesmo número em módulos diferentes, o sistema exige escolha manual se não puder distinguir o grupo.
- A associação automática não ocorre quando o nome aparenta identificar outra disciplina ou um gabarito.
- Dois PDFs do mesmo lote não podem apontar ao mesmo conteúdo.
- PDFs existentes não são substituídos sem a opção explícita.
- Conteúdos compartilhados entre disciplinas não podem ser modificados por importação em massa, para evitar efeitos colaterais.
- A confirmação compara os IDs de destino aprovados na prévia e atualiza o banco em transação, com auditoria.
- Também é possível realocar PDFs já enviados para outro grupo ou conteúdo, sem reenviar o arquivo.

## Limites atuais

A disciplina é a unidade de escopo. Se houver conteúdos reutilizados entre cursos ou disciplinas, ou títulos sem qualquer código de aula, utilize a seleção por ID de conteúdo. Não é necessária uma alteração no código para cadastrar novas disciplinas.

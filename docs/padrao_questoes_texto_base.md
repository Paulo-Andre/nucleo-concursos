# Padrão obrigatório para novas questões — texto-base separado

O arquivo CSV/XLSX de importação de QUESTÕES deve usar a coluna opcional **texto_base**, imediatamente após **enunciado** no modelo atualizado.

- `texto_base`: copie **somente** a frase, oração ou trecho que será exibido no bloco **LEIA O TRECHO**. Não coloque o comando da pergunta nem a afirmação julgada.
- `enunciado`: coloque **somente** a pergunta de múltipla escolha ou a afirmação a julgar (Certo/Errado).
- `tipo`: `multipla_escolha` ou `certo_errado`.
- `resposta`: letra da alternativa correta em múltipla escolha, ou CERTO/ERRADO.
- `comentario`: justificativa pedagógica objetiva.
- `conteudo_ids` ou `conteudos`: vínculo com conteúdo; alternativamente, selecionar a disciplina de questões avulsas no importador.

## Exemplos

| texto_base | enunciado | tipo | resposta |
|---|---|---|---|
| A equipe registrou o fato. | Qual alternativa identifica corretamente o sujeito e o objeto direto? | multipla_escolha | A |
| Marina assinou a ata. Depois, ela arquivou o documento. | O pronome “ela” retoma o nome Marina. | certo_errado | CERTO |
| O despacho foi proferido de maneira célere. | No contexto, “célere” significa lento. | certo_errado | ERRADO |

**Regra para produção automatizada:** gerar texto-base e enunciado em campos distintos desde a origem. Se a questão não depende de frase ou texto, deixar `texto_base` em branco. Nunca inventar texto-base, remover informação essencial, ou substituir o gabarito sem validação.

Questões legadas sem `texto_base` continuam renderizadas por separação heurística apenas quando segura. É possível editar e preencher o novo campo manualmente no gerenciador sem perder o ID da questão.

## Implantação

O schema do banco adicionou `questions.passage` (TEXT NULL). Execute `bash deploy/adicionar_texto_base_questoes.sh` **antes** de iniciar a imagem da aplicação com o novo código. O script não reescreve nenhum enunciado nem gabarito.

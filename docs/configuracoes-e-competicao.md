# Configurações gerais e Competição

## Configurações gerais da marca

O usuário ROOT encontra a área **Configurações** dentro de **Gestão ROOT**. As alterações são persistidas e passam a ser aplicadas à vitrine pública e ao ambiente autenticado. Dessa forma, a identidade da plataforma pode evoluir sem alteração manual do código.

| Campo | Efeito na plataforma |
| --- | --- |
| Logo | Substitui a marca exibida nas áreas pública e autenticada. Caso não exista logo configurado, a plataforma mantém a identificação textual segura. |
| Frases da página inicial | Atualiza o título, o texto de apresentação e a chamada principal da vitrine. |
| Cor de fundo | Define a cor-base utilizada pela apresentação da plataforma. |
| Cor dos textos | Define a cor principal de leitura da identidade configurável. |

Antes de salvar, o ROOT deve revisar se a cor de texto mantém contraste suficiente sobre a cor de fundo escolhida. Após salvar, recomenda-se abrir a página inicial em celular para confirmar a leitura e o carregamento do logotipo.

## Competição independente

A opção **Competição** aparece no menu de alunos como uma área própria. Cada rodada utiliza questões publicadas da biblioteca central, mas suas respostas são gravadas exclusivamente nas estruturas de competição. Ela não altera XP, progresso de estudo, revisões pessoais, respostas de simulados ou resultados históricos de simulados.

| Recurso | Comportamento |
| --- | --- |
| Rodada | Apresenta a quantidade de questões definida pelo ROOT, escolhida aleatoriamente entre questões publicadas. |
| Pontuação | Aplica os pontos por acerto e, quando configurado, o desconto por erro. |
| Ranking | Mostra a classificação global ou o recorte de um concurso. Em empates, prioriza mais acertos e, depois, ordem alfabética do nome. |
| Acesso por concurso | Alunos podem iniciar rodadas de concursos com matrícula vigente. ROOT mantém acesso administrativo integral. |
| Separação de dados | Cada resposta usa tabela própria de competição, sem gravar em `studyAnswers` nem em registros de simulado. |

## Administração da competição

O ROOT encontra **Competição** dentro de **Gestão ROOT**. Nesse painel, é possível definir os pontos por acerto, o desconto por erro, o número de questões em cada rodada e pausar temporariamente novas rodadas. As regras alteradas são aplicadas nas respostas registradas depois da alteração; pontuações já registradas preservam o valor histórico que receberam.

| Ação ROOT | Procedimento seguro |
| --- | --- |
| Alterar regras | Revise os números e salve. O painel atualiza as regras disponíveis para as novas rodadas. |
| Pausar | Desative a competição para impedir início de novas rodadas sem apagar o ranking atual. |
| Limpar ranking geral | Selecione o escopo geral, digite exatamente `LIMPAR RANKING` e confirme. |
| Limpar ranking por concurso | Selecione o concurso, digite exatamente `LIMPAR RANKING` e confirme. Somente as rodadas e respostas daquele recorte são removidas. |

Cada limpeza registra uma entrada de auditoria administrativa. A limpeza é irreversível para as pontuações removidas; portanto, o ROOT deve exportar o backup administrativo antes da operação quando precisar preservar um histórico externo.

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

## Variedade das rodadas e histórico pessoal

Com **252 questões publicadas** na biblioteca no momento desta atualização, a competição prioriza automaticamente questões que o aluno ainda não respondeu em rodadas anteriores. Caso a quantidade inédita não seja suficiente para completar a rodada configurada, a plataforma só então utiliza questões já respondidas como complemento. Essa regra vale para a seleção geral e para o recorte de cada concurso, sem reutilizar registros de simulados.

O aluno encontra, abaixo do ranking, a área **Meta mensal e histórico**. Ela permite alternar entre o recorte geral e cada concurso, consultar as rodadas recentes e verificar número de respostas, acertos, pontos obtidos e data da rodada. Uma rodada ainda aberta aparece como **em andamento** e passa a compor o histórico concluído quando todas as questões forem respondidas.

## Meta mensal e reconhecimento

O ROOT configura a meta em **Gestão ROOT → Competição → Meta e reconhecimento do mês**. A meta exige simultaneamente uma quantidade de pontos e de rodadas concluídas. O título e a descrição do reconhecimento são mensagens exibidas ao aluno depois que ambos os requisitos forem atingidos; a plataforma não concede pontos extras nem entrega prêmio automaticamente.

| Configuração | Limite e efeito |
| --- | --- |
| Meta de pontos | Pontos competitivos que o aluno deve acumular no mês. |
| Rodadas concluídas | Quantidade mínima de rodadas integralmente respondidas no mês. |
| Título e descrição | Texto do reconhecimento que aparece após a conquista. |
| Meta mensal ativa | Permite ocultar a campanha sem apagar histórico ou ranking. |

O mês é identificado pelo calendário de Brasília e apurado sob demanda sempre que a área de competição é aberta. Assim, a virada mensal não depende de robôs, tarefas programadas ou do navegador do usuário permanecer aberto.

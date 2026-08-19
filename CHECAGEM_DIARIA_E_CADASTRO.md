# Checagem diária e cadastro local

## Regra da checagem diária

A checagem é calculada quando o aluno acessa a plataforma; ela não exige tarefa agendada nem processo em segundo plano. A seleção considera exclusivamente questões ligadas aos conteúdos do curso cuja matrícula está vigente. Questões do curso não liberado não entram no conjunto elegível.

O sistema prioriza itens de **certo/errado**, de dificuldade básica e com enunciado curto. Para manter consistência no mesmo dia, a questão é persistida por aluno e curso. Para evitar repetição, a escolha é personalizada por usuário, curso e data, e exclui questões respondidas recentemente e a questão exibida no dia anterior quando existem alternativas.

O aluno pode fechar a checagem pelo botão **×**. Essa dispensa é persistida somente até o encerramento do dia para aquele curso; no dia seguinte, uma nova questão elegível pode ser apresentada. O atalho de revisão continua independente: ele abre a questão que o aluno escolheu revisar e pode ser fechado sem alterar a checagem diária.

## Cadastro local

O cadastro exige e-mail e CPF. O e-mail é normalizado e possui índice único no banco. O CPF é armazenado somente com dígitos, deve possuir 11 algarismos, não pode ser sequência repetida e precisa passar pela validação dos dois dígitos verificadores.

As mesmas regras são aplicadas na interface e no contrato de servidor. Assim, uma requisição que ignore o formulário ainda não consegue criar CPF inválido, e a restrição única do banco impede duplicidade em condições concorrentes. Contas antigas podem permanecer sem CPF até atualização de seus dados, preservando o histórico existente.

## Evidências de validação

Em 19 de agosto de 2026, a suíte executou **79 testes aprovados**, incluindo validação de CPF, rejeição de CPF inválido no contrato público e seleção diária curta, estável e sem repetição recente. A checagem de tipos e a compilação de produção também foram aprovadas. A tela de acesso foi verificada em desktop e no viewport móvel de 375 × 812 px após a alteração.

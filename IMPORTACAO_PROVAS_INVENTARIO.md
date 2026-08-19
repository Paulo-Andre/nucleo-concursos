# Inventário de importação de provas

## Material recebido

| Arquivo | Identificação extraída | Estrutura observada | Situação inicial |
|---|---|---|---|
| `Pm.pdf` | Governo de Minas Gerais — SEJUSP, Edital de Concurso Público nº 01/2025, Policial Penal, Prova 01, nível médio, tipo 01 | Caderno com 60 questões objetivas e redação; inicia por Língua Portuguesa e Informática Básica | Aguardando identificação do gabarito correspondente e extração estruturada |
| `gabarito_preliminiar.pdf` | Polícia Federal — concurso de 2018, aplicação em 16/9/2018 | Gabaritos oficiais preliminares para conhecimentos básicos e vários cargos; inclui folha específica a localizar para Agente de Polícia Federal | Aguardando conciliação com caderno PF de 2018 e verificação contra gabarito definitivo |
| `gabarito(1).pdf` | Polícia Federal — Edital nº 1, PF Policial, 20/5/2025, aplicação em 27/7/2025 | Gabaritos oficiais preliminares de vários cargos; a folha inicialmente localizada é do Cargo 9 — Perito Criminal Federal, Área 16: Física Forense | Não utilizar para Agente PF; aguarda localização de folha de respostas do próprio cargo |
| `agente_de_policia_federal(2).pdf` | CESPE/CEBRASPE — DGP/PF, aplicação em 2018, matriz `408_DGPPF012` | Caderno objetivo de 120 itens C/E do cargo de Agente; blocos de conhecimentos básicos, informática/TI, direito, lógica e contabilidade | Conciliável com `gabarito_preliminiar.pdf`, Cargo 12, itens 1–120 |
| `agente_de_policia_federal(1).pdf` | CEBRASPE — PF, Edital 2025 | Caderno objetivo de 120 itens C/E; blocos I, II e III; inclui Português, direito, lógica, informática/TI e contabilidade | Cópia materialmente idêntica ao arquivo sem sufixo; aguarda gabarito de Agente comprovadamente correspondente |
| `agente_de_policia_federal.pdf` | CEBRASPE — PF, Edital 2025 | Mesmo conteúdo e mesma estrutura do arquivo `agente_de_policia_federal(1).pdf` | Duplicado lógico; não importar novamente |

## Evidência de correspondência

O arquivo `gabarito(1).pdf` reúne folhas de vários cargos do concurso PF Policial de 2025. A folha inicialmente extraída com respostas dos itens 51–120 foi identificada como **Cargo 9 — Perito Criminal Federal, Área 16: Física Forense**; portanto, ela não é evidência de resposta para o caderno de Agente. Nenhuma resposta de 2025 será inferida ou importada até a localização de uma folha atribuída expressamente ao cargo de Agente.

O arquivo `gabarito_preliminiar.pdf` identifica expressamente **Cargo 12: Agente de Polícia Federal**, aplicação em 16 de setembro de 2018, e contém respostas para os itens 1–120. A sequência de 2018 foi localizada integralmente nas linhas 783–799 do texto extraído e corresponde ao caderno `agente_de_policia_federal(2).pdf`.

## Qualidade de extração verificada

A extração alternativa em ordem de leitura de `agente_de_policia_federal(2).pdf` preserva os enunciados numerados e os comandos de julgamento C/E. A conferência inicial recuperou integralmente os itens 1–11, com os comandos de interpretação de texto e de Manual de Redação da Presidência da República. A fonte de origem deve permanecer identificada em cada questão importada como **CESPE/CEBRASPE — PF — Agente — 2018 — item N**.

Para 2025, `agente_de_policia_federal(1).pdf` preserva o caderno integral de 120 itens C/E, mas o material de gabarito recebido ainda não comprovou uma folha de respostas do próprio cargo de Agente. Os itens 1–120 de 2025 não serão importados com resposta presumida.

## Delimitação dos blocos recuperados

Os dois cadernos extraídos preservam a numeração sequencial dos itens objetivos. A prova de 2018 apresenta 120 itens, incluindo blocos de Língua Portuguesa/Manual de Redação, Direito Administrativo e Constitucional, Raciocínio Lógico, Informática e Contabilidade. A prova de 2025 também apresenta 120 itens C/E, mas aguarda gabarito do cargo de Agente. A importação segura deve limitar-se a **2018: itens 1–120**; as questões de 2025 ficam pendentes até que uma folha oficial correspondente seja fornecida ou localizada.

## Critérios de importação

As questões só serão importadas após associação comprovada com um gabarito do mesmo caderno, extração verificável de enunciado e alternativas, e classificação temática compatível com conteúdos já existentes. Questões de concursos não abrangidos por conteúdos atuais poderão permanecer sem importação até que exista conteúdo correlacionável.

## Blocos temáticos confirmados — PF Agente 2018

| Itens | Área identificada no caderno | Direção de vínculo na biblioteca |
|---|---|---|
| 1–24 | Língua Portuguesa, interpretação, redação oficial e gramática | Conteúdos `LP-*` pertinentes ao enunciado de cada item |
| 25–28 | Organização e controle da Administração Pública | Conteúdos `DA-*` de organização e controle administrativo |
| 29–32 | Defesa do Estado, segurança pública e atribuições da PF | Conteúdos `DC-*` de defesa do Estado e segurança pública |
| 33–37 | Direito Penal e Processo Penal | Conteúdos `DPP-*` específicos do instituto cobrado |
| 38–40 | Legislação especial: drogas, migração e ambiente | Conteúdos `LE-*` compatíveis; revisar a aderência temática item a item |
| 41–50 | Estatística e probabilidade | Conteúdos `EST-*` de probabilidade, inferência e regressão |
| 51–60 | Raciocínio lógico e conjuntos | Conteúdos `RL-*` de proposições, equivalências, contagem e conjuntos |
| 61–80 | Informática: redes, Windows, segurança, nuvem, Internet e serviços | Conteúdos `INF-*` conforme o assunto específico |
| 81–96 | Informática: modelagem de dados, bancos de dados, redes e programação | Conteúdos `INF-*` conforme o assunto específico |

> A classificação acima decorre do texto extraído do caderno de 2018. Os itens subsequentes serão adicionados somente após a mesma identificação temática e a confirmação da resposta no gabarito do Cargo 12.

## Conferência visual complementar

| Item | Informação recuperada no PDF original | Motivo da conferência |
|---|---|---|
| 50 | A assertiva integral é: “a razão `(W − 20) / √4` segue distribuição normal padrão.” | A expressão foi confirmada por visualização em alta resolução da página 4 do caderno original, pois a extração textual suprimiu a fração. |
| 58 | A assertiva integral termina em “é inferior a `1/30`”. | A fração foi confirmada por visualização da página 5 do caderno original, pois a extração textual suprimiu o numerador e o denominador. |
| 81–83 | O diagrama ER apresenta `produto` (código, descrição) relacionado N:1 a `tipo de produto` (código, descrição); `preço` aparece como atributo de `produto`. | O modelo foi confirmado por visualização da página 7 do caderno original; a extração textual não preservou a figura. |

## Execução da importação PF 2018

Em 19 de agosto de 2026, foram importados **120 itens C/E** da prova de Agente da Polícia Federal de 2018. Cada registro recebeu um marcador individual no formato `PROVA_PF_2018:item_N`, a referência à banca CESPE/CEBRASPE, ano de 2018 e ao menos um vínculo com conteúdo central. A validação de banco confirmou 120 marcadores distintos, 120 questões com vínculo e 121 vínculos no total; o vínculo adicional decorre de um item que abrange simultaneamente dois conteúdos de Informática.

O reinício repetido da aplicação preservou exatamente os mesmos 120 marcadores e 121 vínculos. Portanto, a operação é idempotente: novos bootstraps verificam o marcador de origem antes de inserir, preservando questões e vínculos já cadastrados. Os cadernos PF 2025 e Policial Penal MG/SEJUSP 2025 continuam fora da importação por não possuírem gabarito comprovadamente correspondente.

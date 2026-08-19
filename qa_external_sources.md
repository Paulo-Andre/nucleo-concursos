# Fontes externas para a auditoria de QA

| Fonte | Uso na auditoria | URL | Situação inicial |
|---|---|---|---|
| Polícia Federal — Edital nº 2/2025-DGP/PF | Fonte normativa do conteúdo programático do cargo de Agente de Polícia Federal | https://www.gov.br/pf/pt-br/acesso-a-informacao/servidores/concursos/edital/carreira-policial-2025/editais/edital-no-2_2025-dgp-pf.pdf | Localizado em 19/08/2026; será usado para mapear blocos, disciplinas e tópicos obrigatórios. |
| Cebraspe — Concurso PF 2025 | Página institucional de referência do concurso | https://www.cebraspe.org.br/concursos/pf_25 | Aberta em 19/08/2026; a renderização no ambiente não apresentou conteúdo navegável, portanto a confirmação detalhada ocorrerá pelo PDF oficial da PF. |

> A extração textual remota do PDF oficial retornou conteúdo binário em 19/08/2026. A conferência dos tópicos será feita por extração local de texto do mesmo PDF, sem executar conteúdo recebido.

## Achados públicos de apoio

As páginas de apoio consultadas em 19/08/2026 convergem para a estrutura do cargo de Agente com os seguintes grupos: Língua Portuguesa, Direito Administrativo, Direito Constitucional, Direito Penal e Processual Penal, Direitos Humanos, Legislação Especial, Estatística, Raciocínio Lógico, Informática e Contabilidade Geral. A fonte normativa continua sendo o edital da PF; páginas de cursos preparatórios são usadas somente como conferência de nomenclatura e de blocos.

## Correção de link identificada

O endereço legado da UNODC para as Regras de Mandela retornou `404` na auditoria. A busca pública identificou como endereço oficial atual: https://www.unodc.org/unodc/en/justice-and-prison-reform/nelsonmandelarules.html . Esse endereço substituirá a referência legada na apostila de Direitos Humanos.

A extração textual da URL atualizada em 19/08/2026 confirmou o conteúdo institucional da UNODC sobre as 122 disposições das Regras de Mandela e apresentou inclusive referência à versão em português. Resultado da correção: `PASS` quanto à disponibilidade e à correspondência temática.

## Alternativas oficiais para referências com limitação de acesso automatizado

| Referência | URL oficial confirmada por busca pública em 19/08/2026 | Finalidade | Próxima ação |
|---|---|---|---|
| Manual de Redação da Presidência da República | https://www.gov.br/pt-br/servicos/consultar-o-manual-de-redacao-da-presidencia-da-republica | Serviço oficial de consulta ao Manual de Redação | Usar como destino verificável no lugar do endereço legado que excedeu o tempo do verificador. |
| Instrumentos de Direitos Humanos | https://www.ohchr.org/en/instruments-listings | Lista oficial atual de instrumentos internacionais de direitos humanos | Usar como destino verificável no lugar da rota legada que respondeu `403` ao verificador automatizado. |

> Os demais endereços do Planalto sinalizados com `AbortError` não foram classificados como links quebrados: a extração textual independente confirmou a disponibilidade de Constituição, Lei nº 9.784/1999, Lei nº 14.133/2021 e Código Penal. As verificações restantes devem continuar na matriz como pendentes de segunda via até a confirmação individual ou substituição por rota oficial atual.

## Confirmação textual complementar de fontes legislativas

Em 19/08/2026, a extração textual independente confirmou que os seguintes destinos oficiais do Planalto estão disponíveis e correspondem ao material registrado: Código de Processo Penal (Decreto-Lei nº 3.689/1941), Lei nº 13.060/2014, Lei nº 13.445/2017, Lei nº 11.343/2006, Lei nº 10.826/2003 e Lei nº 14.534/2023. As extrações mostram o título normativo e o conteúdo legislativo esperado; assim, os `AbortError` do verificador local são limitações de tempo de requisição, não prova de indisponibilidade.

Também foram confirmadas em 19/08/2026 as duas substituições publicadas: o serviço oficial `gov.br` descreve o Manual de Redação da Presidência da República e o catálogo oficial da OHCHR lista instrumentos centrais, incluindo tratados contra tortura, discriminação racial e discriminação contra a mulher. Ambas correspondem aos assuntos das apostilas e receberam resultado `PASS` por disponibilidade e destino.

## Confirmação de disciplinas e material detalhado do cargo de Agente

Em 19/08/2026, a página institucional do Cebraspe para PF 2025 confirmou o concurso e a existência de links oficiais, mas não expôs o conteúdo programático no HTML extraído: https://www.cebraspe.org.br/concursos/pf_25 .

Como confirmação textual de apoio, a página do Estratégia Concursos listou, especificamente para o cargo de Agente, as 11 disciplinas: Língua Portuguesa; Noções de Direito Administrativo; Noções de Direito Constitucional; Noções de Direito Penal e de Direito Processual Penal; Direitos Humanos; Legislação Especial; Estatística; Raciocínio Lógico; Informática; e Contabilidade Geral. Fonte: https://www.estrategiaconcursos.com.br/blog/concurso-pf-2025-o-que-estudar/ .

Essa mesma fonte aponta para o arquivo de conteúdo programático detalhado de Agente: https://dhg1h5j42swfq.cloudfront.net/2025/05/22170832/conteudo-pf-agente.pdf . A extração automática retornou o fluxo binário do PDF em vez de texto estruturado; portanto, o arquivo serve como referência auxiliar de detalhamento, mas o mapa de subitens permanece marcado como pendente até transcrição verificável contra o PDF oficial da PF.

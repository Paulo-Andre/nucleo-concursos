# QA — Continuidade de estudo e roteiro semanal

## Evidência inicial

Em 20 de agosto de 2026, a prévia autenticada com a conta ROOT exibiu corretamente os blocos **Continuidade de estudo** e **Roteiro semanal** no painel da trilha Polícia Federal.

## Confirmação de carregamento

Após a conclusão assíncrona da consulta protegida `study.contentProgress.get`, o painel exibiu a próxima aula da trilha, o botão **Continuar** e a lista de aulas reais no seletor do roteiro semanal. A consulta autenticada para `pf-agente` retornou os conteúdos vinculados sem criação de dados artificiais.

Por ser uma conta administrativa em uso, a verificação visual não criou nem removeu itens de roteiro adicionais. A persistência e o isolamento dos dados já foram cobertos por teste de integração automatizado.

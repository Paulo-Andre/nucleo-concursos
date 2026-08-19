# Banco central de questões — requisitos recebidos

## Modelo reutilizável

O sistema deve tratar cursos, disciplinas, conteúdos e questões como entidades centrais reutilizáveis. Cursos vinculam disciplinas, disciplinas vinculam conteúdos e uma questão pode ser associada a um ou mais conteúdos sem ser duplicada. O mesmo conteúdo pode ser usado em disciplinas e cursos diferentes.

## Questões e simulados

Administradores devem criar, editar e corrigir questões sem alterar o identificador original nem apagar o histórico dos simulados em que ela já apareceu. A associação entre questão e conteúdo é muitos-para-muitos e precisa registrar data e responsável. O gerador de simulados não pode repetir a mesma questão dentro de um mesmo simulado, inclusive quando ela pertence a vários conteúdos.

## Revisão e auditoria

Questões e conteúdos possuem os estados Rascunho, Em revisão, Aprovado, Publicado e Inativo. A revisão permite envio, aprovação, rejeição, devolução e solicitação de correção. Deve haver uma aba Revisar com pendências, filtros e pesquisa. Todo evento deve registrar quem realizou a ação, data, tipo de alteração, campos anteriores/novos e vínculos adicionados ou removidos.

## Regras de uso

Questões em rascunho ou revisão não entram em simulados automáticos quando a aprovação for exigida. Itens publicados podem ser usados normalmente. Conteúdos podem ser atualizados sem quebrar o histórico de simulados anteriores.

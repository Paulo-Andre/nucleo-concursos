# Evidência Visual Autenticada — Fluxo de Revisão

**Data:** 20 de agosto de 2026  
**Perfil utilizado:** Paulo André — ROOT / ADMIN  
**Ambiente verificado:** sessão local autenticada no Núcleo Concursos.

## Resultado da verificação

Foi capturada uma sessão autenticada do ROOT dentro da **Biblioteca central**, usando uma questão temporária criada pelo procedimento administrativo real e identificada como `#1800002`. A captura comprova a fila editorial — distinta da fila pessoal do aluno —, a instrução de decisão e o salto direto do item para a tela de edição.

| Elemento verificado | Resultado observado |
|---|---|
| Elemento verificado | Resultado observado |
|---|---|
| Acesso autenticado do ROOT | A janela apresenta `ROOT / BIBLIOTECA CENTRAL` e o controle `Revisar (ROOT)`. |
| Instrução do processo | A fila enumera as etapas: adicionar à revisão, localizar na fila, abrir/corrigir e aprovar, solicitar correção ou rejeitar. |
| Item em fila | A questão temporária `#1800002` aparece como `PENDENTE`, com situação `EM REVISÃO`. |
| Decisão fundamentada | A interface exige justificativa para `Correção` e `Rejeitar`, além de disponibilizar `Aprovar`. |
| Abertura direta | O comando `Abrir e editar questão` abre a edição completa da questão temporária, preservando sua situação de revisão. |
| Decisão final registrada | A ação `Correção` gravou a justificativa `revisar a clareza do enunciado antes de publicar` e confirmou visualmente `Decisão de revisão registrada.` |

> A captura foi realizada com sessão temporária e descartável. Nenhuma senha, token de sessão ou dado pessoal do usuário ROOT foi incluído neste registro.

## Arquivos de evidência

As três etapas foram preservadas no armazenamento do projeto. Nenhuma imagem contém senha, token de sessão ou dado financeiro.

1. [Fila ROOT com item pendente e instrução editorial](/manus-storage/nucleo-concursos-editorial-pending-20260820_7171dba5.png)
2. [Abertura direta da questão em edição completa](/manus-storage/nucleo-concursos-editorial-open-question-20260820_deec4567.png)
3. [Correção fundamentada e confirmação visual da decisão](/manus-storage/nucleo-concursos-editorial-decision-20260820_090de38b.png)

> O item `#1800002` foi criado exclusivamente para a evidência, decidido como **Correção** e será removido pela mesma rotina administrativa usada na operação corrente.

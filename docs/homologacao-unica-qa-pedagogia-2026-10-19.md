# Homologação única — Núcleo Concursos (19/10/2026)

**Objetivo:** liberar uma única versão reunindo correções de QA, filtros, biblioteca dinâmica, segurança, pagamentos e metodologia de estudo. Este documento **não autoriza deploy automático**.

## Regra de segurança
- Branch de homologação: `fix/qa-seguranca-aprendizagem-20261019`.
- Site principal: `/srv/projetos/nucleo-concursos`, branch `fix/self-host-storage-public-courses`, Docker `nucleo-app` na porta local 3000, MySQL `nucleo-db`.
- Prévia: `/srv/projetos/nucleo-concursos-preview`, banco e volume independentes, porta local 3001.
- Não fazer `git reset --hard`, `git clean`, cópia de `.env` ou `docker compose down -v` em produção.
- Não executar `git merge --ff-only` diretamente sobre a branch de produção se os históricos forem divergentes; integrar mudanças deliberadamente por PR.
- Não copiar dados reais para o banco de testes sem anonimização e autorização.

## CI obrigatório antes da publicação
- [ ] `pnpm check`, `pnpm build`, todas as migrações em MySQL 8.4 limpo.
- [ ] `vitest` completo (frontend + backend + integrações MySQL), zero falhas.
- [ ] Teste de upload CSV/XLSX: prévia sem gravar, erros por linha, importação transacional, recusa de fórmula, campos excedidos e arquivos grandes.
- [ ] Testes de acesso: curso expirado, aluno bloqueado, ROOT, acesso cruzado a flashcards, questões e aulas; sessões e backup privados.
- [ ] Testes de simultaneidade: aprovação de pedido/webhook duplicado, cupons, reset de senha, registo de pontuação.
- [ ] Testes de regressão de UI: Conteúdo, Treinador, Simulados, Revisar, Histórico, Gestão ROOT.

## Validação real de navegador em prévia (aluno e ROOT)
- [ ] Celular 320/375/390/430 px, tablet 768 px, desktop 1366 px; sem cortes, texto legível, teclado e leitor de tela.
- [ ] ROOT cria nova disciplina, associa a um curso, cria e publica aula com texto, vídeo e PDF; aula aparece na biblioteca do aluno matriculado sem reconstruir código.
- [ ] ROOT deixa aula em rascunho/desativada; aluno não a vê e não consegue abri-la por chamada direta de API.
- [ ] ROOT importa CSV e XLSX de conteúdo e questões; prévia, validações, confirmação, vínculos, upload incorreto e reversão sem registro parcial.
- [ ] Aluno vê pesquisa por nome, disciplina, status e conteúdo combinados; limpa filtros; usa busca no celular.
- [ ] Aluno inicia, pausa, conclui uma aula e continua em outro navegador; anotações permanecem privadas.
- [ ] Treinador mostra plano adaptativo para 20/40/60 minutos; disciplina com amostra pequena não é apresentada como domínio confirmado.
- [ ] Flashcard pergunta/resposta, revela, avalia, muda data de revisão e desaparece do grupo vencido até a próxima revisão.
- [ ] Erros de questões ficam no caderno; classificação e observação persistem; aluno B não consegue ler os dados de A.
- [ ] Resposta maliciosa e simulado adulterado não alteram XP nem acertos; duplicidade de envio é tratada.
- [ ] Recuperação de senha encerra sessões antigas; logout/expiração; tempo da sessão em horário local.
- [ ] Plano não pago não libera acesso; desconto e cupom válidos; pedido pago libera somente cursos contratados.

## Integrações externas (separar de testes locais)
- [ ] Mercado Pago: usar conta de teste autorizada, pedido no ambiente correto, webhook com assinatura, repetição sem dupla matrícula, reembolso/cancelamento.
- [ ] Resend: domínio verificado, redefinição e confirmação enviadas apenas a caixas de teste autorizadas, sem dados sensíveis em logs.
- [ ] Backup: geração ROOT, tentativa sem autenticação (403), token de uso único (404 na segunda), expiração, arquivo fora de pasta pública.
- [ ] Restauração: usar banco **descartável**, jamais produção; comparar quantidade de registros, vínculos, progresso e hashes; testar também mídia anexada. A exportação lógica JSON não implementa por si só uma restauração automática.

## Janela de atualização única
1. Congelar alterações e anotar SHA exato aprovado; finalizar PRs deliberadamente, sem sobrescrever Dockerfile, compose.yaml ou dados locais.
2. Conferir espaço em disco; obter backup SQL atualizado, copia de `.env` e uploads, e verificar integridade de arquivos.
3. Testar migrações em clone anonimizado compatível com esquema real; preparar procedimento de reversão do código **e banco**.
4. Compilar imagem de produção antes da janela; executar smoke em container isolado.
5. Em janela comunicada, subir apenas a aplicação alterada, preservar volume MySQL e validar saúde, autenticação, matrícula, conteúdo, pagamento e logs.
6. Se falhar, restaurar release anterior; se migração for incompatível, seguir plano de rollback do banco aprovado anteriormente. **Não restaurar backups reais automaticamente.**

**Status na elaboração:** CI automatizado foi aprovado no commit anterior; os testes manuais, integrações reais e restauração continuam pendentes. A branch não está pronta para aplicação em produção até essas caixas serem marcadas após execução real.

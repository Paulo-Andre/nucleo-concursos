# Runbook de continuidade — Estudos PF

**Status:** plano de migração e recuperação. Nenhuma migração de hospedagem, alteração de DNS ou cópia de banco é executada por este documento.

## Objetivo

Este runbook reduz a dependência de uma única plataforma. A arquitetura proposta mantém quatro ativos independentes: o código no GitHub, o banco em um serviço gerenciado compatível, os segredos em cofre de senhas e o domínio em registrador/DNS separado da hospedagem. Nenhuma opção gratuita oferece garantia absoluta de permanência; a proteção real vem de cópias verificáveis e possibilidade de restauração.

> O endereço atual `estudospf-peiyfhjy.manus.space` pertence à plataforma de hospedagem. Ele não substitui um domínio próprio e não deve ser tratado como ativo portável.

## Destino sugerido

Para o servidor Express + React existente, usar **Render Web Service gratuito** ligado à branch `main` do repositório privado `Paulo-Andre/estudos-pf`. O Render recompila e republica automaticamente quando há push ou merge na branch conectada. No plano gratuito, o serviço suspende após 15 minutos sem acessos, portanto o primeiro acesso posterior pode demorar. [1] [2]

O banco deve ficar em uma conta distinta da hospedagem. Como o projeto usa `mysql2` e o banco atual é TiDB/MySQL, o caminho de menor alteração é **TiDB Cloud Starter**, que a PingCAP divulga com quota gratuita inicial. Antes da migração, validar conexão, limites e exportação na conta que será realmente usada. [3]

| Componente | Titularidade recomendada | Local | Regra de continuidade |
|---|---|---|---|
| Código-fonte | Conta GitHub do proprietário | `Paulo-Andre/estudos-pf` privado | `main` é a fonte de verdade e todo deploy nasce de commit versionado. |
| Aplicação web | Conta Render do proprietário | Web Service ligado ao GitHub | Deploy automático somente após os testes do GitHub passarem. |
| Banco | Conta TiDB Cloud do proprietário | Cluster separado | Exportações periódicas fora do provedor. |
| Segredos | Cofre de senhas do proprietário | Fora do Git e da hospedagem | Valores nunca entram em commits, issues, prints ou documentação. |
| Domínio e DNS | Registrador e provedor DNS independentes | Fora de Manus e Render | O domínio pode apontar para outro host sem alteração de propriedade. |

## Configuração mínima de publicação no Render

No painel do Render, criar um **Web Service** a partir de `Paulo-Andre/estudos-pf`, escolher a branch `main` e configurar a publicação automática após as verificações de CI. Os comandos confirmados no `package.json` atual são:

| Campo | Valor |
|---|---|
| Build command | `pnpm install --frozen-lockfile && pnpm run check && pnpm run test && pnpm run build` |
| Start command | `pnpm start` |
| Health check | Uma rota HTTP pública que responda com sucesso; definir somente após confirmar a rota existente. |
| Auto-deploy | **After CI Checks Pass** ou, enquanto não houver CI, **On Commit**. |

O processo usa a porta recebida do ambiente. Não fixar uma porta no código. Em cada alteração de infraestrutura, testar primeiro com um branch ou serviço de pré-produção.

## Checklist de segredos e variáveis

Configurar os valores apenas no painel do Render e no cofre do proprietário. Nunca criar `.env` com valores reais no repositório. Para uma nova base de dados, os itens mínimos a confirmar são:

| Variável | Finalidade | Regra |
|---|---|---|
| `DATABASE_URL` | Conexão TiDB/MySQL | URL do novo cluster; guardar também no cofre. |
| `JWT_SECRET` | Assinatura da sessão local | Gerar valor longo, aleatório e exclusivo para produção. |
| `ROOT_INITIAL_PASSWORD` | Criação inicial da conta ROOT `paulo` em banco novo | Registrar no cofre e substituir após o primeiro acesso, se necessário. |
| `OWNER_OPEN_ID` e `OWNER_NAME` | Metadados já consumidos pelo servidor atual | Levar os valores já definidos, sem divulgá-los. |
| `NODE_ENV` | Modo de execução | Definir como `production`. |

Antes de desligar qualquer hospedagem antiga, registrar em uma entrada protegida do cofre: nome da conta, e-mail de recuperação, autenticação de dois fatores, lista de variáveis, local do banco, domínio, DNS e data do último backup restaurado com sucesso.

## Rotina de backup

O responsável pela operação deve executar e registrar a rotina abaixo até que uma automação seja aprovada separadamente. O objetivo é recuperar tanto o código quanto os dados sem depender de Manus, Render ou TiDB individualmente.

| Ativo | Frequência mínima | Retenção | Destino independente | Evidência exigida |
|---|---|---|---|---|
| Código GitHub | A cada alteração | Histórico permanente e uma cópia mensal | Repositório privado + `git bundle` criptografado em nuvem pessoal | SHA do commit e data da cópia. |
| Banco completo | Semanal e antes de cada mudança estrutural | 7 diários, 4 semanais e 6 mensais | Drive/OneDrive/Dropbox do proprietário, em arquivo criptografado | Tamanho do dump, checksum e teste de importação trimestral. |
| Segredos | Após inclusão ou troca | Versão atual e uma versão anterior | Cofre de senhas com MFA | Checklist datado, sem valores expostos. |
| DNS/domínio | Após cada alteração e mensalmente | Última zona e histórico de mudanças | Cofre + exportação da zona DNS | Captura/exportação dos registros e vencimento do domínio. |

Para gerar um dump lógico de um banco MySQL/TiDB, usar uma máquina confiável com `mysqldump` instalado, sem salvar a senha em histórico de terminal. Um exemplo conceitual é `mysqldump --single-transaction --routines --events --databases NOME_DO_BANCO > estudospf-AAAAMMDD.sql`; em seguida, cifrar o arquivo, calcular um checksum e enviá-lo ao armazenamento externo. O comando final deve ser ajustado à URL e às políticas do provedor antes da primeira execução.

## Procedimento de restauração

Use esta ordem em caso de perda de acesso à hospedagem, falha de deploy ou troca de provedor. A ordem evita apontar o domínio para uma aplicação sem banco, segredos ou dados restaurados.

1. **Recuperar o código.** Entrar na conta GitHub do proprietário, confirmar o último commit validado em `main`, clonar o repositório e executar `pnpm install --frozen-lockfile`, `pnpm run check`, `pnpm run test` e `pnpm run build`.
2. **Criar o banco de destino.** Criar um cluster TiDB/MySQL na conta controlada pelo proprietário. Registrar a nova `DATABASE_URL` somente no cofre e no painel da hospedagem.
3. **Preparar schema e dados.** Aplicar as migrações revisadas do repositório e importar o último dump íntegro. Conferir especificamente usuários locais, cursos, matrículas, conteúdos, questões, simulados e histórico de respostas.
4. **Reconstruir os segredos.** Copiar do cofre as variáveis necessárias para o serviço de destino. Não reutilizar `JWT_SECRET` sem avaliar o impacto: alterá-lo encerra sessões ativas, mas pode ser preferível após comprometimento.
5. **Publicar e validar.** Criar/recuperar o Web Service, conectar o GitHub, aplicar os comandos de build/start e validar login local de ROOT, acesso a cursos, consulta de questões e dados de matrícula antes de expor o domínio.
6. **Reapontar o domínio.** No DNS independente, alterar somente os registros `CNAME`/`A` indicados pela nova hospedagem. Reduzir o TTL com antecedência quando a mudança for planejada. Manter o host anterior ativo até validar certificado HTTPS, login e leituras essenciais.
7. **Registrar o incidente.** Anotar data, commit, dump restaurado, pessoa responsável, alterações de segredo e teste final. Executar um novo backup após estabilizar.

## Domínio independente

Para não perder o endereço público ao trocar de hospedagem, registrar um **domínio próprio pago** em uma conta controlada pelo proprietário e manter o DNS em um provedor separado da hospedagem. Um domínio próprio nunca é garantidamente gratuito, pois há renovação anual; esse custo pequeno é justamente o que assegura que o nome possa ser transferido e reapontado.

O registrador deve ter MFA, e-mail de recuperação que o proprietário controle e bloqueio de transferência ativado. O provedor DNS deve permitir exportar a zona. A configuração típica será um `CNAME` de `www` para o host informado pelo Render e um redirecionamento de raiz para `www`, de acordo com as instruções do provedor escolhido. Não alterar nameservers sem exportar a zona atual e registrar todos os TXT de verificação.

## Critério de migração concluída

A migração só é considerada concluída quando cada item abaixo estiver comprovado pelo proprietário: código sincronizado no GitHub, deploy automático de um commit de teste, backup de banco fora do provedor, restauração testada em ambiente separado, segredos em cofre e domínio próprio apontando para a nova hospedagem. Até lá, a URL Manus atual deve permanecer como contingência.

## Referências

[1]: https://render.com/docs/your-first-deploy "Render — Your First Deploy"
[2]: https://render.com/docs/deploys "Render — Deploys"
[3]: https://docs.pingcap.com/tidbcloud/select-cluster-tier/ "TiDB Cloud — Select a Plan"

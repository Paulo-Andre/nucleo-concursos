# Validação do player integrado de aulas

**Data:** 20 de agosto de 2026

O player foi verificado em uma sessão autenticada ROOT na aula `LP-01 — Compreensão textual`. O vídeo complementar de Língua Portuguesa foi carregado dentro do modal da aula por meio de um iframe do YouTube, sem abrir uma nova guia ou redirecionar o aluno para o YouTube.

O componente reutilizável aceita URLs do YouTube nas variantes `watch`, `youtu.be`, `embed`, `shorts` e `live`, convertendo-as para o domínio de privacidade aprimorada `youtube-nocookie.com`. Arquivos próprios diretos em MP4, WebM ou OGV, inclusive os enviados ao armazenamento controlado `/manus-storage/`, são exibidos pelo elemento nativo `video`.

Para o vídeo próprio, o player desabilita o menu de contexto, a opção visível de download, a reprodução remota e o modo picture-in-picture. Essas medidas reduzem a exposição casual, mas não substituem DRM nem conseguem impedir integralmente capturas de tela ou ferramentas do navegador.

| Verificação | Resultado |
| --- | --- |
| Reprodução do vídeo do YouTube dentro da aula | Aprovada |
| Normalização de URL e isolamento em `youtube-nocookie.com` | Aprovada por teste |
| Reconhecimento de MP4, WebM e OGV próprios | Aprovado por teste |
| Checagem TypeScript | Aprovada |
| Build de produção | Aprovado |
| Suíte Vitest | 107 testes aprovados em 50 arquivos |

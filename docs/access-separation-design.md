# Separação entre catálogo e acessos do aluno

- A aba **Cursos para comprar** usa a visão `Cursos` do espaço de estudo e deve concentrar catálogo, filtros, cupom e compra.
- O botão atual **Planos e acessos** abre o mesmo painel comercial e, por isso, mistura compras novas com informações de matrícula.
- A área **Meus acessos** deve consultar apenas matrículas e pedidos da conta autenticada, apresentando situação e validade sem ofertas ou cupom.
- A área autenticada já aguarda o catálogo de cursos antes de decidir acesso; a nova tela deve respeitar essa mesma regra para evitar estados transitórios.

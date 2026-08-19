export function filterLinkOptions<T>(items: T[], search: string, getText: (item: T) => string) {
  const normalizedSearch = search.trim().toLocaleLowerCase();
  if (!normalizedSearch) return items;
  return items.filter(item => getText(item).toLocaleLowerCase().includes(normalizedSearch));
}

export function reviewEmptyStateMessage(hasActiveFilters: boolean) {
  return hasActiveFilters
    ? "Nenhum item corresponde aos filtros atuais. Ajuste a busca ou selecione ‘Todas as decisões’."
    : "Não há pendências agora. Para iniciar uma revisão, edite uma questão ou conteúdo e escolha ‘EM REVISÃO’, ou clique em ‘Enviar para revisão’ no cartão.";
}

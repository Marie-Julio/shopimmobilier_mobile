// Un bien réservé, loué ou vendu doit l'afficher publiquement à la place de « À louer / À vendre ».
const STATUTS_INDISPONIBLES: Record<string, { label: string; color: string }> = {
  reserve: { label: 'Réservé', color: '#D97706' },
  loue: { label: 'Loué', color: '#0369A1' },
  vendu: { label: 'Vendu', color: '#DC2626' },
  archived: { label: 'Indisponible', color: '#64748B' },
};

export const getStatutIndisponible = (statut?: string | null) =>
  statut ? STATUTS_INDISPONIBLES[statut] : undefined;

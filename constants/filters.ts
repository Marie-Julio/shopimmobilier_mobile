export const FILTER_OPTIONS = {
  types: [
    { value: '', label: 'Tous les types' },
    { value: 'appartement', label: 'Appartement' },
    { value: 'maison', label: 'Maison' },
    { value: 'terrain', label: 'Terrain' },
    { value: 'commerce', label: 'Commerce' },
    { value: 'bureau', label: 'Bureau' },
    { value: 'entrepot', label: 'Entrepôt' }
  ],
  operations: [
    { value: '', label: 'Toutes les opérations' },
    { value: 'vente', label: 'Vente' },
    { value: 'location', label: 'Location' },
    { value: 'location_saisonniere', label: 'Location Saisonnière' }
  ],
  villes: [
    { value: '', label: 'Toutes les villes' },
    { value: 'Conakry', label: 'Conakry' },
    { value: 'Kindia', label: 'Kindia' },
    { value: 'Kankan', label: 'Kankan' },
    { value: 'Labé', label: 'Labé' },
    { value: 'Mamou', label: 'Mamou' },
    { value: 'Nzérékoré', label: 'Nzérékoré' },
    { value: 'Boké', label: 'Boké' }
  ],
  etats: [
    { value: '', label: 'Tous les états' },
    { value: 'neuf', label: 'Neuf' },
    { value: 'excellent', label: 'Excellent' },
    { value: 'bon', label: 'Bon' },
    { value: 'renovation', label: 'À rénover' }
  ],
  electriciteOptions: [
    { value: '', label: 'Tous' },
    { value: 'Disponible', label: 'Électricité disponible' },
    { value: 'Instable', label: 'Électricité instable' },
    { value: 'Non disponible', label: 'Électricité non disponible' }
  ],
  quartierBruitOptions: [
    { value: '', label: 'Tous' },
    { value: 'Calme', label: 'Quartier calme' },
    { value: 'Modérément bruyant', label: 'Modérément bruyant' },
    { value: 'Bruyant', label: 'Quartier bruyant' }
  ],
  niveauSecuriteOptions: [
    { value: '', label: 'Tous' },
    { value: 'Élevé', label: 'Sécurité élevée' },
    { value: 'Moyen', label: 'Sécurité moyenne' },
    { value: 'Faible', label: 'Sécurité faible' }
  ],
  orderOptions: [
    { value: 'date_publication_desc', label: 'Plus récents' },
    { value: 'date_publication_asc', label: 'Plus anciens' },
    { value: 'prix_asc', label: 'Prix croissant' },
    { value: 'prix_desc', label: 'Prix décroissant' },
    { value: 'surface_desc', label: 'Surface décroissante' },
    { value: 'surface_asc', label: 'Surface croissante' },
    { value: 'qualite_score_desc', label: 'Meilleure qualité' }
  ]
};
import { useCallback, useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import { getResource } from '../services/api';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface Property {
  id_propriete: number;
  titre: string;
  description: string;
  prix: number;
  devise: string;
  type: string;
  operation: string;
  surface: number;
  chambres: number;
  salles_de_bain: number;
  adresse: string;
  ville: string;
  quartier?: string;
  etat?: string;
  featured: boolean;
  images: Array<{ url: string; principale: boolean }>;
  video?: string;
  agent?: {
    id_agent: number;
    telephone_bureau?: string;
    email?: string;
    utilisateur?: {
      nom?: string;
      prenom?: string;
      photo_profil?: string;
    };
  };
  date_publication: string;
  date_collecte?: string;
  electricite?: string;
  quartier_bruit?: string;
  niveau_securite?: string;
  forage?: boolean;
  groupe_electrogene?: boolean;
  meuble?: boolean;
  climatisation?: boolean;
  parking?: boolean;
  jardin?: boolean;
  piscine?: boolean;
  ascenseur?: boolean;
}

export interface Filters {
  type: string;
  operation: string;
  prix_min: string;
  prix_max: string;
  chambres_min: string;
  ville: string;
  quartier: string;
  meuble: boolean;
  climatisation: boolean;
  parking: boolean;
  featured: boolean;
  search: string;
  etat?: string;
  electricite?: string;
  niveau_securite?: string;
  order: string;
  quartier_bruit?: string;
  forage?: boolean;
  groupe_electrogene?: boolean;
}

export const useProperties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalProperties, setTotalProperties] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage] = useState(10);
  
  const [filters, setFilters] = useState<Filters>({
    type: '',
    operation: '',
    prix_min: '',
    prix_max: '',
    chambres_min: '',
    ville: '',
    quartier: '',
    meuble: false,
    climatisation: false,
    parking: false,
    featured: false,
    search: '',
    order: 'date_publication_desc'
  });

  const loadProperties = useCallback(async (page: number = 1, filterParams: Filters = filters) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString()
      });

      Object.entries(filterParams).forEach(([key, value]) => {
        if (value !== '' && value !== false && value !== null) {
          if (typeof value === 'boolean') {
            params.append(key, value ? 'true' : 'false');
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const orderValue = filterParams.order || 'date_publication_desc';
      const [orderBy, orderDirection] = orderValue.split('_');
      params.append('order_by', orderBy);
      params.append('order_direction', orderDirection);

      const response = await getResource(`${API_URL}/proprietes?${params.toString()}`);
      
      if (response && response.data) {
        if (response.data.data) {
          setProperties(page === 1 ? response.data.data : [...properties, ...response.data.data]);
          setTotalProperties(response.data.total);
          setCurrentPage(response.data.current_page || page);
          setTotalPages(response.data.last_page || 1);
        } else {
          setProperties(response.data);
          setTotalProperties(response.data.length);
        }
      }
    } catch (error) {
      console.error('Erreur chargement propriétés:', error);
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible de charger les propriétés'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, perPage, properties]);

  const loadFeaturedProperties = useCallback(async () => {
    try {
      const response = await getResource(`${API_URL}/proprietes?featured=true&per_page=4`);
      if (response && response.data && response.data.data) {
        setFeaturedProperties(response.data.data);
      }
    } catch (error) {
      console.log('Erreur chargement propriétés en vedette');
    }
  }, []);

  useEffect(() => {
    loadProperties();
    loadFeaturedProperties();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProperties(1);
  }, [loadProperties]);

  const loadMore = useCallback(() => {
    if (currentPage < totalPages && !loading) {
      loadProperties(currentPage + 1);
    }
  }, [currentPage, totalPages, loading, loadProperties]);

  const updateFilter = useCallback((key: keyof Filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const applyFilters = useCallback(() => {
    setCurrentPage(1);
    loadProperties(1);
  }, [loadProperties]);

  const clearFilters = useCallback(() => {
    const clearedFilters: Filters = {
      type: '',
      operation: '',
      prix_min: '',
      prix_max: '',
      chambres_min: '',
      ville: '',
      quartier: '',
      meuble: false,
      climatisation: false,
      parking: false,
      featured: false,
      search: '',
      order: 'date_publication_desc'
    };
    setFilters(clearedFilters);
    setCurrentPage(1);
    loadProperties(1, clearedFilters);
  }, [loadProperties]);

  return {
    properties,
    featuredProperties,
    loading,
    refreshing,
    totalProperties,
    currentPage,
    totalPages,
    filters,
    loadProperties,
    loadMore,
    onRefresh,
    updateFilter,
    applyFilters,
    clearFilters,
  };
};
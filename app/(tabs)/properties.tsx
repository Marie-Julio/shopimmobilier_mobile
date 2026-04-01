import { FILTER_OPTIONS } from '@/constants/filters';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getResource } from '../../services/api';

const { width } = Dimensions.get('window');

interface Property {
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
    utilisateur?: {
      nom?: string;
      prenom?: string;
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
  qualite_score?: number;
}

interface Filters {
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
  jardin: boolean;
  piscine: boolean;
  ascenseur: boolean;
  featured: boolean;
  search: string;
  order: string;
}

type EquipmentKey = keyof Pick<Filters, 'meuble' | 'climatisation' | 'parking' | 'jardin' | 'piscine' | 'ascenseur'>;

const equipmentOptions: Array<{ key: EquipmentKey; label: string; icon: string }> = [
  { key: 'meuble', label: 'Meublé', icon: 'bed-outline' },
  { key: 'climatisation', label: 'Climatisation', icon: 'snow-outline' },
  { key: 'parking', label: 'Parking', icon: 'car-outline' },
  { key: 'jardin', label: 'Jardin', icon: 'leaf-outline' },
  { key: 'piscine', label: 'Piscine', icon: 'water-outline' },
  { key: 'ascenseur', label: 'Ascenseur', icon: 'arrow-up-outline' },
];

const operationCategories = [
  { id: 'all', label: 'Tous', icon: 'apps-outline', color: '#065483' },
  { id: 'vente', label: 'Achat', icon: 'home-outline', color: '#FF3B30' },
  { id: 'location', label: 'Location', icon: 'calendar-outline', color: '#007AFF' },
  { id: 'location_saisonniere', label: 'Saisonnier', icon: 'sunny-outline', color: '#FF9800' },
];

export default function PropertiesScreen() {
  // Récupérer les paramètres de l'URL
  const params = useLocalSearchParams();
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalProperties, setTotalProperties] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage] = useState(10);
  
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Animation pour le header
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [180, 120],
    extrapolate: 'clamp',
  });
  
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
    jardin: false,
    piscine: false,
    ascenseur: false,
    featured: false,
    search: '',
    order: 'date_publication_desc'
  });

  const [tempFilters, setTempFilters] = useState<Filters>(filters);
  const [selectedOperation, setSelectedOperation] = useState('all');
  const [initialized, setInitialized] = useState(false);

  // Initialiser les filtres avec les paramètres de l'URL
  useEffect(() => {
    console.log('Paramètres reçus dans properties:', params);
    
    // Vérifier s'il y a un paramètre search dans l'URL
    if (params.search) {
      const searchValue = Array.isArray(params.search) ? params.search[0] : params.search;
      console.log('Recherche à effectuer:', searchValue);
      
      // Mettre à jour les filtres avec la valeur de recherche
      setFilters(prev => ({ ...prev, search: searchValue }));
      setTempFilters(prev => ({ ...prev, search: searchValue }));
      
      // Charger les propriétés avec le filtre de recherche
      // Note: On utilise setTimeout pour s'assurer que les filtres sont mis à jour avant le chargement
      setTimeout(() => {
        loadProperties(1, { 
          ...filters, 
          search: searchValue,
          operation: selectedOperation === 'all' ? '' : selectedOperation 
        });
      }, 100);
    } else {
      // Chargement normal sans recherche
      loadProperties();
    }
    
    setInitialized(true);
  }, []); // Dépendances vides pour ne s'exécuter qu'au montage

  // Mettre à jour les filtres quand l'opération sélectionnée change
  useEffect(() => {
    if (!initialized) return;
    
    const operationValue = selectedOperation === 'all' ? '' : selectedOperation;
    const newFilters = { ...filters, operation: operationValue };
    setFilters(newFilters);
    setTempFilters(prev => ({ ...prev, operation: operationValue }));
    loadProperties(1, newFilters);
  }, [selectedOperation, initialized]);

  const loadProperties = async (page: number = 1, filterParams: Filters = filters) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString()
      });

      // Ajouter tous les filtres non vides
      Object.entries(filterParams).forEach(([key, value]) => {
        if (value !== '' && value !== false && value !== null) {
          if (typeof value === 'boolean') {
            params.append(key, value ? '1' : '0');
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const orderValue = filterParams.order || 'date_publication_desc';
      const [orderBy, orderDirection] = orderValue.split('_');
      params.append('order_by', orderBy);
      params.append('order_direction', orderDirection);

      console.log('Chargement avec params:', params.toString());
      
      const response = await getResource(`/proprietes?${params.toString()}`);
      
      if (response?.data?.data) {
        setProperties(page === 1 ? response.data.data : [...properties, ...response.data.data]);
        setTotalProperties(response.data.total);
        setCurrentPage(response.data.current_page || page);
        setTotalPages(response.data.last_page || 1);
      }
    } catch (error) {
      console.error('Erreur chargement propriétés:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    loadProperties(1, filters);
  };

  const loadMore = () => {
    if (currentPage < totalPages && !loading) {
      loadProperties(currentPage + 1, filters);
    }
  };

  const applyFilters = () => {
    setFilters(tempFilters);
    setCurrentPage(1);
    loadProperties(1, tempFilters);
    setShowFilters(false);
  };

  const clearFilters = () => {
    const clearedFilters: Filters = {
      type: '',
      operation: selectedOperation === 'all' ? '' : selectedOperation,
      prix_min: '',
      prix_max: '',
      chambres_min: '',
      ville: '',
      quartier: '',
      meuble: false,
      climatisation: false,
      parking: false,
      jardin: false,
      piscine: false,
      ascenseur: false,
      featured: false,
      search: '',
      order: 'date_publication_desc'
    };
    setTempFilters(clearedFilters);
    setFilters(clearedFilters);
    setCurrentPage(1);
    loadProperties(1, clearedFilters);
    setShowFilters(false);
  };

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setTempFilters(prev => ({ ...prev, [key]: value }));
  };

  const formatPrice = (price?: number, devise: string = 'GNF') => {
    if (!price) return 'N/A';
    if (devise === 'GNF') {
      return new Intl.NumberFormat('fr-FR').format(price) + ' GNF';
    }
    return new Intl.NumberFormat('fr-FR').format(price) + ' ' + devise;
  };

  const getPropertyImage = (property: Property) => {
    if (property.images?.length > 0) {
      const mainImage = property.images.find(img => img.principale) || property.images[0];
      return { uri: `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${mainImage.url}` };
    }
    return require('../../assets/images/default-property.jpg');
  };

  const getPropertyTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'appartement': 'Appartement',
      'maison': 'Maison',
      'terrain': 'Terrain',
      'commerce': 'Commerce',
      'bureau': 'Bureau',
      'entrepot': 'Entrepôt',
    };
    return typeMap[type] || type;
  };

  const getOperationLabel = (operation: string) => {
    const operationMap: Record<string, string> = {
      'vente': 'À vendre',
      'location': 'À louer',
      'location_saisonniere': 'Location saisonnière',
    };
    return operationMap[operation] || operation;
  };

  const getBadges = (property: Property) => {
    const badges = [];
    
    if (property.featured) {
      badges.push({ text: 'En Vedette', color: '#FFD700' });
    }
    
    if (property.qualite_score && property.qualite_score >= 80) {
      badges.push({ text: 'Premium', color: '#4CAF50' });
    }
    
    const pubDate = new Date(property.date_publication);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) {
      badges.push({ text: 'Nouveau', color: '#FF3B30' });
    }
    
    return badges;
  };

  const PropertyCardGrid = ({ property }: { property: Property }) => {
    const badges = getBadges(property);
    
    return (
      <TouchableOpacity
        style={styles.gridCard}
        onPress={() => router.push(`/property/${property.id_propriete}`)}
        activeOpacity={0.9}
      >
        <View style={styles.gridImageContainer}>
          <Image source={getPropertyImage(property)} style={styles.gridImage} />
          
          {/* Badges */}
          <View style={styles.gridBadges}>
            {badges.map((badge, index) => (
              <View key={index} style={[styles.gridBadge, { backgroundColor: badge.color }]}>
                <Text style={styles.gridBadgeText}>{badge.text}</Text>
              </View>
            ))}
          </View>

          {/* Prix */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gridPriceGradient}
          >
            <Text style={styles.gridPrice}>{formatPrice(property.prix, property.devise)}</Text>
          </LinearGradient>

          {/* Type d'opération */}
          <View style={[styles.gridOperationBadge, 
            { backgroundColor: property.operation === 'vente' ? '#FF3B30' : 
              property.operation === 'location' ? '#007AFF' : '#FF9800' }
          ]}>
            <Ionicons 
              name={property.operation === 'vente' ? 'home' : 
                    property.operation === 'location' ? 'calendar' : 'sunny'} 
              size={12} 
              color="#fff" 
            />
            <Text style={styles.gridOperationText}>
              {getOperationLabel(property.operation)}
            </Text>
          </View>
        </View>

        <View style={styles.gridContent}>
          <Text style={styles.gridTitle} numberOfLines={1}>{property.titre}</Text>
          
          <View style={styles.gridLocation}>
            <Ionicons name="location-outline" size={12} color="#999" />
            <Text style={styles.gridLocationText} numberOfLines={1}>
              {property.ville}{property.quartier ? `, ${property.quartier}` : ''}
            </Text>
          </View>

          <View style={styles.gridFeatures}>
            {property.surface > 0 && (
              <View style={styles.gridFeature}>
                <Ionicons name="resize-outline" size={12} color="#065483" />
                <Text style={styles.gridFeatureText}>{property.surface} m²</Text>
              </View>
            )}
            {property.chambres > 0 && (
              <View style={styles.gridFeature}>
                <Ionicons name="bed-outline" size={12} color="#065483" />
                <Text style={styles.gridFeatureText}>{property.chambres} ch</Text>
              </View>
            )}
            {property.salles_de_bain > 0 && (
              <View style={styles.gridFeature}>
                <Ionicons name="water-outline" size={12} color="#065483" />
                <Text style={styles.gridFeatureText}>{property.salles_de_bain} sdb</Text>
              </View>
            )}
          </View>

          {/* Agent info */}
          {property.agent && (
            <View style={styles.gridAgent}>
              <Ionicons name="person-circle-outline" size={16} color="#065483" />
              <Text style={styles.gridAgentText} numberOfLines={1}>
                {property.agent.utilisateur?.prenom} {property.agent.utilisateur?.nom}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const PropertyCardList = ({ property }: { property: Property }) => {
    const badges = getBadges(property);
    
    return (
      <TouchableOpacity
        style={styles.listCard}
        onPress={() => router.push(`/property/${property.id_propriete}`)}
        activeOpacity={0.9}
      >
        <View style={styles.listImageContainer}>
          <Image source={getPropertyImage(property)} style={styles.listImage} />
          
          {/* Badges */}
          <View style={styles.listBadges}>
            {badges.slice(0, 2).map((badge, index) => (
              <View key={index} style={[styles.listBadge, { backgroundColor: badge.color }]}>
                <Text style={styles.listBadgeText}>{badge.text}</Text>
              </View>
            ))}
          </View>

          {/* Prix */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.listPriceGradient}
          >
            <Text style={styles.listPrice}>{formatPrice(property.prix, property.devise)}</Text>
          </LinearGradient>
        </View>

        <View style={styles.listContent}>
          <Text style={styles.listTitle} numberOfLines={1}>{property.titre}</Text>
          
          <View style={styles.listLocation}>
            <Ionicons name="location-outline" size={12} color="#999" />
            <Text style={styles.listLocationText} numberOfLines={1}>
              {property.ville}{property.quartier ? `, ${property.quartier}` : ''}
            </Text>
          </View>

          <View style={styles.listFeatures}>
            {property.surface > 0 && (
              <View style={styles.listFeature}>
                <Ionicons name="resize-outline" size={14} color="#065483" />
                <Text style={styles.listFeatureText}>{property.surface} m²</Text>
              </View>
            )}
            {property.chambres > 0 && (
              <View style={styles.listFeature}>
                <Ionicons name="bed-outline" size={14} color="#065483" />
                <Text style={styles.listFeatureText}>{property.chambres} ch</Text>
              </View>
            )}
            {property.salles_de_bain > 0 && (
              <View style={styles.listFeature}>
                <Ionicons name="water-outline" size={14} color="#065483" />
                <Text style={styles.listFeatureText}>{property.salles_de_bain} sdb</Text>
              </View>
            )}
          </View>

          <View style={styles.listFooter}>
            <View style={styles.listOperation}>
              <View style={[styles.listOperationDot, 
                { backgroundColor: property.operation === 'vente' ? '#FF3B30' : 
                  property.operation === 'location' ? '#007AFF' : '#FF9800' }
              ]} />
              <Text style={styles.listOperationText}>
                {getOperationLabel(property.operation)}
              </Text>
            </View>
            
            {property.agent && (
              <View style={styles.listAgent}>
                <Ionicons name="person-circle-outline" size={16} color="#065483" />
                <Text style={styles.listAgentText}>
                  {property.agent.utilisateur?.prenom}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const FiltersModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtres</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Recherche */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Recherche</Text>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Titre, ville, quartier..."
                  placeholderTextColor="#999"
                  value={tempFilters.search}
                  onChangeText={(text) => updateFilter('search', text)}
                />
              </View>
            </View>

            {/* Type de propriété */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Type de propriété</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      tempFilters.type === '' && styles.filterChipActive
                    ]}
                    onPress={() => updateFilter('type', '')}
                  >
                    <Text style={[
                      styles.filterChipText,
                      tempFilters.type === '' && styles.filterChipTextActive
                    ]}>
                      Tous
                    </Text>
                  </TouchableOpacity>
                  {FILTER_OPTIONS.types.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterChip,
                        tempFilters.type === option.value && styles.filterChipActive
                      ]}
                      onPress={() => updateFilter('type', option.value)}
                    >
                      <Text style={[
                        styles.filterChipText,
                        tempFilters.type === option.value && styles.filterChipTextActive
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Prix */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Prix (GNF)</Text>
              <View style={styles.priceInputs}>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Min"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={tempFilters.prix_min}
                  onChangeText={(text) => updateFilter('prix_min', text)}
                />
                <Text style={styles.priceSeparator}>-</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Max"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={tempFilters.prix_max}
                  onChangeText={(text) => updateFilter('prix_max', text)}
                />
              </View>
            </View>

            {/* Ville */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Ville</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      tempFilters.ville === '' && styles.filterChipActive
                    ]}
                    onPress={() => updateFilter('ville', '')}
                  >
                    <Text style={[
                      styles.filterChipText,
                      tempFilters.ville === '' && styles.filterChipTextActive
                    ]}>
                      Toutes
                    </Text>
                  </TouchableOpacity>
                  {FILTER_OPTIONS.villes.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterChip,
                        tempFilters.ville === option.value && styles.filterChipActive
                      ]}
                      onPress={() => updateFilter('ville', option.value)}
                    >
                      <Text style={[
                        styles.filterChipText,
                        tempFilters.ville === option.value && styles.filterChipTextActive
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Quartier */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Quartier</Text>
              <TextInput
                style={styles.input}
                placeholder="Nom du quartier"
                placeholderTextColor="#999"
                value={tempFilters.quartier}
                onChangeText={(text) => updateFilter('quartier', text)}
              />
            </View>

            {/* Chambres */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Chambres minimum</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={tempFilters.chambres_min}
                onChangeText={(text) => updateFilter('chambres_min', text)}
              />
            </View>

            {/* Équipements */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Équipements</Text>
              <View style={styles.equipmentGrid}>
                {equipmentOptions.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.equipmentItem,
                      tempFilters[item.key] && styles.equipmentItemActive
                    ]}
                    onPress={() => updateFilter(item.key, !tempFilters[item.key])}
                  >
                    <Ionicons 
                      name={item.icon as any} 
                      size={20} 
                      color={tempFilters[item.key] ? '#fff' : '#666'} 
                    />
                    <Text style={[
                      styles.equipmentLabel,
                      tempFilters[item.key] && styles.equipmentLabelActive
                    ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* En vedette */}
            <View style={styles.filterSection}>
              <TouchableOpacity
                style={styles.featuredToggle}
                onPress={() => updateFilter('featured', !tempFilters.featured)}
              >
                <View style={[
                  styles.featuredCheckbox,
                  tempFilters.featured && styles.featuredCheckboxActive
                ]}>
                  {tempFilters.featured && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Ionicons name="star" size={18} color="#FFD700" />
                <Text style={styles.featuredLabel}>Propriétés en vedette uniquement</Text>
              </TouchableOpacity>
            </View>

            {/* Tri */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Trier par</Text>
              <View style={styles.sortOptions}>
                {FILTER_OPTIONS.orderOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortChip,
                      tempFilters.order === option.value && styles.sortChipActive
                    ]}
                    onPress={() => updateFilter('order', option.value)}
                  >
                    <Text style={[
                      styles.sortChipText,
                      tempFilters.order === option.value && styles.sortChipTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Réinitialiser</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.applyButtonText}>Appliquer</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderOperationCategories = () => (
    <View style={styles.categoriesContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContent}
      >
        {operationCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryItem,
              selectedOperation === category.id && styles.categoryItemActive
            ]}
            onPress={() => setSelectedOperation(category.id)}
          >
            <LinearGradient
              colors={selectedOperation === category.id 
                ? ['#222', '#444']
                : ['#f5f5f5', '#f0f0f0']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.categoryGradient}
            >
              <Ionicons 
                name={category.icon as any} 
                size={24} 
                color={selectedOperation === category.id ? '#fff' : category.color} 
              />
              <Text style={[
                styles.categoryLabel,
                selectedOperation === category.id && styles.categoryLabelActive
              ]}>
                {category.label}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderHeader = () => (
    <Animated.View style={[styles.header, { height: headerHeight }]}>
      <LinearGradient
        colors={['#065483', '#EC9107']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.headerContent}>
        <View>
          <Text style={styles.headerTitle}>Propriétés</Text>
          <Text style={styles.headerSubtitle}>
            {totalProperties} bien{totalProperties > 1 ? 's' : ''} disponible{totalProperties > 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerFilterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={22} color="#065483" />
          <View style={styles.filterBadge} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchSection}>
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une propriété..."
            placeholderTextColor="#999"
            value={filters.search}
            onChangeText={(text) => {
              setFilters(prev => ({ ...prev, search: text }));
              setTempFilters(prev => ({ ...prev, search: text }));
            }}
            onSubmitEditing={() => loadProperties(1, { ...filters, search: filters.search })}
            returnKeyType="search"
          />
          {filters.search ? (
            <TouchableOpacity onPress={() => {
              setFilters(prev => ({ ...prev, search: '' }));
              setTempFilters(prev => ({ ...prev, search: '' }));
              loadProperties(1, { ...filters, search: '' });
            }}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.viewModeButton}
          onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
        >
          <Ionicons 
            name={viewMode === 'grid' ? 'grid' : 'list'} 
            size={22} 
            color="#065483" 
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderActiveFilters = () => {
    const activeFilters = [];
    
    if (filters.type) {
      activeFilters.push({
        key: 'type',
        label: FILTER_OPTIONS.types.find(t => t.value === filters.type)?.label,
      });
    }
    if (filters.ville) {
      activeFilters.push({
        key: 'ville',
        label: FILTER_OPTIONS.villes.find(v => v.value === filters.ville)?.label,
      });
    }
    if (filters.prix_min) {
      activeFilters.push({
        key: 'prix_min',
        label: `Min: ${filters.prix_min} GNF`,
      });
    }
    if (filters.prix_max) {
      activeFilters.push({
        key: 'prix_max',
        label: `Max: ${filters.prix_max} GNF`,
      });
    }
    if (filters.chambres_min) {
      activeFilters.push({
        key: 'chambres',
        label: `${filters.chambres_min}+ ch`,
      });
    }
    
    equipmentOptions.forEach(item => {
      if (filters[item.key]) {
        activeFilters.push({
          key: item.key,
          label: item.label,
          icon: item.icon,
        });
      }
    });

    if (activeFilters.length === 0) return null;

    return (
      <View style={styles.activeFiltersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.activeFilters}>
            {activeFilters.map((filter) => (
              <View key={filter.key} style={styles.activeFilter}>
                <Text style={styles.activeFilterText}>{filter.label}</Text>
                <TouchableOpacity onPress={() => {
                  if (filter.key === 'type' || filter.key === 'ville' || 
                      filter.key === 'prix_min' || filter.key === 'prix_max' || 
                      filter.key === 'chambres') {
                    setFilters(prev => ({ ...prev, [filter.key]: '' }));
                    setTempFilters(prev => ({ ...prev, [filter.key]: '' }));
                  } else {
                    setFilters(prev => ({ ...prev, [filter.key]: false }));
                    setTempFilters(prev => ({ ...prev, [filter.key]: false }));
                  }
                  loadProperties(1, { ...filters, [filter.key]: '' });
                }}>
                  <Ionicons name="close" size={14} color="#999" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.clearAllButton} onPress={clearFilters}>
              <Text style={styles.clearAllText}>Tout effacer</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="large" color="#065483" />
        <Text style={styles.footerLoaderText}>Chargement...</Text>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="home-outline" size={60} color="#065483" />
      </View>
      <Text style={styles.emptyTitle}>Aucune propriété trouvée</Text>
      <Text style={styles.emptyText}>
        Aucune propriété ne correspond à vos critères de recherche.
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={clearFilters}>
        <Text style={styles.emptyButtonText}>Réinitialiser les filtres</Text>
        <Ionicons name="refresh" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderOperationCategories()}
      {renderSearchBar()}
      {renderActiveFilters()}

      {loading && properties.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#065483" />
          <Text style={styles.loadingText}>Chargement des propriétés...</Text>
        </View>
      ) : (
        <FlatList
          data={properties}
          renderItem={({ item }) => viewMode === 'grid' ? 
            <PropertyCardGrid property={item} /> : 
            <PropertyCardList property={item} />
          }
          keyExtractor={(item) => item.id_propriete.toString()}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode}
          contentContainerStyle={[
            styles.listContent,
            viewMode === 'grid' && styles.gridListContent
          ]}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#065483']}
              tintColor="#065483"
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={!loading ? renderEmptyState : null}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        />
      )}

      <FiltersModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#065483',
    paddingTop: 50,
    overflow: 'hidden',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  headerFilterButton: {
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  categoriesContainer: {
    marginTop: -20,
    marginBottom: 15,
    zIndex: 10,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryItem: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryItemActive: {
    transform: [{ scale: 1.05 }],
  },
  categoryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  categoryLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  searchWrapper: {
    flexDirection: 'row',
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    marginLeft: 10,
    color: '#333',
  },
  viewModeButton: {
    width: 50,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activeFiltersContainer: {
    marginBottom: 15,
    paddingLeft: 20,
  },
  activeFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 20,
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activeFilterText: {
    fontSize: 12,
    color: '#333',
  },
  clearAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearAllText: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '500',
  },
  gridListContent: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerLoaderText: {
    marginTop: 8,
    fontSize: 13,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    backgroundColor: '#065483',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  // Styles pour la vue en grille
  gridCard: {
    flex: 1,
    margin: 6,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    maxWidth: (width - 36) / 2,
  },
  gridImageContainer: {
    position: 'relative',
    height: 140,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridBadges: {
    position: 'absolute',
    top: 8,
    left: 8,
    gap: 4,
  },
  gridBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gridBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  gridPriceGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  gridPrice: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  gridOperationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  gridOperationText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  gridContent: {
    padding: 12,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  gridLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridLocationText: {
    fontSize: 10,
    color: '#999',
    marginLeft: 4,
    flex: 1,
  },
  gridFeatures: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  gridFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  gridFeatureText: {
    fontSize: 9,
    color: '#666',
  },
  gridAgent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  gridAgentText: {
    fontSize: 10,
    color: '#065483',
    flex: 1,
  },
  // Styles pour la vue en liste
  listCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  listImageContainer: {
    width: 120,
    height: 120,
    position: 'relative',
  },
  listImage: {
    width: '100%',
    height: '100%',
  },
  listBadges: {
    position: 'absolute',
    top: 6,
    left: 6,
    gap: 3,
  },
  listBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  listBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  listPriceGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  listPrice: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  listLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  listLocationText: {
    fontSize: 11,
    color: '#999',
    marginLeft: 4,
    flex: 1,
  },
  listFeatures: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  listFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listFeatureText: {
    fontSize: 11,
    color: '#666',
  },
  listFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listOperation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listOperationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listOperationText: {
    fontSize: 11,
    color: '#666',
  },
  listAgent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listAgentText: {
    fontSize: 11,
    color: '#065483',
  },
  // Styles pour le modal de filtres
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
    maxHeight: '70%',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    paddingRight: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#065483',
  },
  filterChipText: {
    color: '#666',
    fontSize: 13,
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  priceInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f8f8f8',
  },
  priceSeparator: {
    fontSize: 16,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f8f8f8',
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    minWidth: '30%',
  },
  equipmentItemActive: {
    backgroundColor: '#065483',
  },
  equipmentLabel: {
    fontSize: 12,
    color: '#666',
  },
  equipmentLabelActive: {
    color: '#fff',
  },
  featuredToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featuredCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#065483',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredCheckboxActive: {
    backgroundColor: '#065483',
  },
  featuredLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  sortOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  sortChipActive: {
    backgroundColor: '#065483',
  },
  sortChipText: {
    fontSize: 13,
    color: '#666',
  },
  sortChipTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#065483',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#065483',
    fontSize: 15,
    fontWeight: '500',
  },
  applyButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#065483',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
});
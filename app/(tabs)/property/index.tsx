import { FILTER_OPTIONS } from '@/constants/filters';
import { getResource } from '@/services/api';
import { LIBELLE_AGENT_MASQUE, estAgentDjamabizz } from '@/utils/djamabizz';
import { getStatutIndisponible } from '@/utils/statutPropriete';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

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
  statut?: string;
  images: Array<{ url: string; principale: boolean }>;
  video?: string;
  agent?: {
    id_agent: number;
    telephone_bureau?: string;
    utilisateur?: {
      nom?: string;
      prenom?: string;
      photo_profil: string;
      // Rôle du compte : sert à masquer les comptes 'djamabizz'.
      role?: string;
    };
    // Drapeau calculé renvoyé par l'API (App\Models\Agent::est_djamabizz).
    est_djamabizz?: boolean;
    type_agent?: string;
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

type EquipmentKey = keyof Pick<
  Filters,
  'meuble' | 'climatisation' | 'parking' | 'jardin' | 'piscine' | 'ascenseur'
>;

// ─────────────────────────────────────────────────────────────────────────────
// THEME — mirrors HomeScreen palette exactly
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  primary:   '#065483',
  secondary: '#EC9107',
  danger:    '#EF4444',
  success:   '#22C55E',
  bg:        '#f0f4f8',
  card:      '#FFFFFF',
  text:      '#0f172a',
  sub:       '#1e293b',
  muted:     '#94a3b8',
  border:    '#e2e8f0',
  accent:    '#e0edf8',
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const equipmentOptions: Array<{
  key: EquipmentKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'meuble',        label: 'Meublé',       icon: 'bed-outline'        },
  { key: 'climatisation', label: 'Climatisation', icon: 'snow-outline'       },
  { key: 'parking',       label: 'Parking',       icon: 'car-outline'        },
  { key: 'jardin',        label: 'Jardin',        icon: 'leaf-outline'       },
  { key: 'piscine',       label: 'Piscine',       icon: 'water-outline'      },
  { key: 'ascenseur',     label: 'Ascenseur',     icon: 'arrow-up-outline'   },
];

const operationCategories = [
  { id: 'all',                  label: 'Tous',       icon: 'apps-outline'     as const },
  { id: 'vente',                label: 'Achat',      icon: 'home-outline'     as const },
  { id: 'location',             label: 'Location',   icon: 'calendar-outline' as const },
  { id: 'location_saisonniere', label: 'Saisonnier', icon: 'sunny-outline'    as const },
];

const OPERATION_COLOR: Record<string, string> = {
  vente:                '#EF4444',
  location:             '#065483',
  location_saisonniere: '#F59E0B',
};

const ETAT_COLOR: Record<string, string> = {
  neuf:      '#22C55E',
  excellent: '#22C55E',
  bon:       '#3B82F6',
  renovation:'#F59E0B',
  a_renover: '#EF4444',
};

const FAVORITES_KEY = 'property_favorites_v2';

const defaultFilters: Filters = {
  type: '', operation: '', prix_min: '', prix_max: '',
  chambres_min: '', ville: '', quartier: '',
  meuble: false, climatisation: false, parking: false,
  jardin: false, piscine: false, ascenseur: false,
  featured: false, search: '', order: 'date_publication_desc',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const formatPrice = (price?: number, devise = 'GNF') => {
  if (!price) return 'N/A';
  return new Intl.NumberFormat('fr-FR').format(price) + ' ' + devise;
};

const getPropertyImage = (property: Property) => {
  if (property.images?.length > 0) {
    const main = property.images.find(i => i.principale) ?? property.images[0];
    return { uri: `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${main.url}` };
  }
  return require('../../../assets/images/default-property.jpg');
};

const getTypeLabel = (type: string) =>
  ({ appartement: 'Appartement', maison: 'Maison', terrain: 'Terrain',
     commerce: 'Commerce', bureau: 'Bureau', entrepot: 'Entrepôt' }[type] ?? type);

const getOperationLabel = (op: string) =>
  ({ vente: 'À vendre', location: 'À louer',
     location_saisonniere: 'Saisonnier' }[op] ?? op);

const getEtatLabel = (e: string) =>
  ({ neuf: 'Neuf', excellent: 'Excellent', bon: 'Bon état',
     renovation: 'À rénover', a_renover: 'À rénover' }[e] ?? e);

const relativeTime = (dateStr: string) => {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d === 0)  return "Aujourd'hui";
  if (d === 1)  return 'Hier';
  if (d < 7)    return `il y a ${d}j`;
  if (d < 30)   return `il y a ${Math.floor(d / 7)}sem`;
  if (d < 365)  return `il y a ${Math.floor(d / 30)}mois`;
  return `il y a ${Math.floor(d / 365)}an(s)`;
};

const isNew = (dateStr: string) =>
  Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000) <= 7;

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS (indépendants, définis en dehors du composant principal)
// ─────────────────────────────────────────────────────────────────────────────

/** Animated heart button */
const FavoriteButton = ({ isFav, onPress }: { isFav: boolean; onPress: () => void }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, speed: 40 }),
      Animated.spring(scale, { toValue: 1,   useNativeDriver: true, speed: 40 }),
    ]).start();
    onPress();
  };
  return (
    <TouchableOpacity onPress={handlePress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={ss.favBtnBg}>
          <Ionicons
            name={isFav ? 'heart' : 'heart-outline'}
            size={15}
            color={isFav ? T.danger : '#fff'}
          />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

/** Quality dots */
const QualityDots = ({ score }: { score: number }) => {
  const level = score >= 80 ? 3 : score >= 60 ? 2 : score >= 40 ? 1 : 0;
  return (
    <View style={ss.qualityDots}>
      {[0, 1, 2].map(i => (
        <View
          key={i}
          style={[ss.dot, { backgroundColor: i < level ? T.success : T.border }]}
        />
      ))}
    </View>
  );
};

/** Section header — same as HomeScreen */
const SectionHeader = ({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle?: string;
  count?: number;
}) => (
  <View style={ss.sectionHeader}>
    <View>
      <Text style={ss.sectionTitle}>{title}</Text>
      {subtitle && <Text style={ss.sectionSubtitle}>{subtitle}</Text>}
    </View>
    {count !== undefined && (
      <View style={ss.seeAllBtn}>
        <Text style={ss.seeAllText}>{count} bien{count > 1 ? 's' : ''}</Text>
        <Ionicons name="home-outline" size={13} color={T.primary} />
      </View>
    )}
  </View>
);

/** SearchBar – définie en dehors pour éviter la perte de focus */
const SearchBar = ({
  searchValue,
  onChangeText,
  onClear,
  onFilterPress,
  filterCount,
  showFavoritesOnly,
  favoritesCount,
  onToggleFavorites,
}: SearchBarProps) => (
  <View style={ss.searchBarWrap}>
    <View style={ss.searchInner}>
      <Ionicons name="search-outline" size={18} color={T.primary} style={{ marginRight: 8 }} />
      <TextInput
        style={ss.searchInput}
        placeholder="Ville, quartier, type…"
        placeholderTextColor={T.muted}
        value={searchValue}
        onChangeText={onChangeText}
        returnKeyType="search"
        blurOnSubmit={false}
      />
      {!!searchValue && (
        <TouchableOpacity onPress={onClear}>
          <Ionicons name="close-circle" size={18} color={T.muted} />
        </TouchableOpacity>
      )}
    </View>

    <TouchableOpacity style={ss.iconBtn} onPress={onFilterPress}>
      <Ionicons name="funnel" size={20} color="#fff" />
      {filterCount > 0 && (
        <View style={ss.filterBadge}>
          <Text style={ss.filterBadgeText}>{filterCount}</Text>
        </View>
      )}
    </TouchableOpacity>

    <TouchableOpacity
      style={[ss.iconBtnWhite, showFavoritesOnly && ss.iconBtnWhiteActive]}
      onPress={onToggleFavorites}
    >
      <Ionicons
        name={showFavoritesOnly ? 'heart' : 'heart-outline'}
        size={20}
        color={showFavoritesOnly ? T.danger : T.primary}
      />
      {favoritesCount > 0 && (
        <Text style={[ss.favCount, showFavoritesOnly && { color: T.danger }]}>
          {favoritesCount}
        </Text>
      )}
    </TouchableOpacity>
  </View>
);

interface SearchBarProps {
  searchValue: string;
  onChangeText: (t: string) => void;
  onClear: () => void;
  onFilterPress: () => void;
  filterCount: number;
  showFavoritesOnly: boolean;
  favoritesCount: number;
  onToggleFavorites: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTERS MODAL COMPONENT (défini en dehors de PropertiesScreen)
// ─────────────────────────────────────────────────────────────────────────────

interface FiltersModalProps {
  visible: boolean;
  onClose: () => void;
  tempFilters: Filters;
  filterCount: number;
  onFilterChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  onClearFilters: () => void;
  onApplyFilters: () => void;
  localPrixMin: string;
  setLocalPrixMin: (v: string) => void;
  localPrixMax: string;
  setLocalPrixMax: (v: string) => void;
  localQuartier: string;
  setLocalQuartier: (v: string) => void;
}

const FiltersModalComponent: React.FC<FiltersModalProps> = ({
  visible,
  onClose,
  tempFilters,
  filterCount,
  onFilterChange,
  onClearFilters,
  onApplyFilters,
  localPrixMin,
  setLocalPrixMin,
  localPrixMax,
  setLocalPrixMax,
  localQuartier,
  setLocalQuartier,
}) => {
  const Section = ({ title }: { title: string }) => (
    <View style={ss.fSectionHeader}>
      <View style={ss.fSectionBar} />
      <Text style={ss.fSectionLabel}>{title}</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={ss.modalOverlay}>
        <View style={ss.modalSheet}>
          <View style={ss.modalHandle} />

          <View style={ss.modalHeaderRow}>
            <View>
              <Text style={ss.modalTitle}>Filtres</Text>
              {filterCount > 0 && (
                <Text style={ss.modalSubtitle}>{filterCount} filtre(s) actif(s)</Text>
              )}
            </View>
            <TouchableOpacity
              style={ss.modalCloseBtn}
              onPress={onClose}
            >
              <Ionicons name="close" size={20} color={T.sub} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
            {/* Search */}
            <Section title="Recherche rapide" />
            <View style={ss.fSearchBox}>
              <Ionicons name="search-outline" size={16} color={T.muted} />
              <TextInput
                style={ss.fSearchInput}
                placeholder="Titre, ville, quartier…"
                placeholderTextColor={T.muted}
                value={tempFilters.search}
                onChangeText={t => onFilterChange('search', t)}
              />
            </View>

            {/* Type */}
            <Section title="Type de bien" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={ss.chipRowWrap}>
              {[{ value: '', label: 'Tous' }, ...(FILTER_OPTIONS.types ?? [])].map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[ss.fChip, tempFilters.type === o.value && ss.fChipOn]}
                  onPress={() => onFilterChange('type', o.value)}
                >
                  <Text style={[ss.fChipText, tempFilters.type === o.value && ss.fChipTextOn]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Prix */}
            <Section title="Fourchette de prix (GNF)" />
            <View style={ss.priceRow}>
              <TextInput
                style={ss.priceInput}
                placeholder="Min"
                placeholderTextColor={T.muted}
                keyboardType="numeric"
                value={localPrixMin}
                onChangeText={setLocalPrixMin}
              />
              <View style={ss.priceDash} />
              <TextInput
                style={ss.priceInput}
                placeholder="Max"
                placeholderTextColor={T.muted}
                keyboardType="numeric"
                value={localPrixMax}
                onChangeText={setLocalPrixMax}
              />
            </View>

            {/* Ville */}
            <Section title="Ville" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={ss.chipRowWrap}>
              {[{ value: '', label: 'Toutes' }, ...(FILTER_OPTIONS.villes ?? [])].map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[ss.fChip, tempFilters.ville === o.value && ss.fChipOn]}
                  onPress={() => onFilterChange('ville', o.value)}
                >
                  <Text style={[ss.fChipText, tempFilters.ville === o.value && ss.fChipTextOn]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Quartier */}
            <Section title="Quartier" />
            <TextInput
              style={ss.fInput}
              placeholder="Ex: Ratoma, Kipé…"
              placeholderTextColor={T.muted}
              value={localQuartier}
              onChangeText={setLocalQuartier}
            />

            {/* Chambres minimum */}
            <Section title="Chambres minimum" />
            <View style={ss.chipRowWrap}>
              {['', '1', '2', '3', '4', '5+'].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[ss.fChip, tempFilters.chambres_min === n && ss.fChipOn]}
                  onPress={() => onFilterChange('chambres_min', n)}
                >
                  <Text style={[ss.fChipText, tempFilters.chambres_min === n && ss.fChipTextOn]}>
                    {n === '' ? 'Tous' : n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Équipements */}
            <Section title="Équipements" />
            <View style={ss.equipGrid}>
              {equipmentOptions.map(e => {
                const on = tempFilters[e.key];
                return (
                  <TouchableOpacity
                    key={e.key}
                    style={[ss.equipItem, on && ss.equipItemOn]}
                    onPress={() => onFilterChange(e.key, !on)}
                  >
                    <View style={[ss.equipIconWrap, on && ss.equipIconWrapOn]}>
                      <Ionicons name={e.icon} size={16} color={on ? '#fff' : T.primary} />
                    </View>
                    <Text style={[ss.equipLabel, on && ss.equipLabelOn]}>{e.label}</Text>
                    {on && (
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color={T.primary}
                        style={{ marginLeft: 'auto' }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* En vedette */}
            <Section title="Mise en avant" />
            <TouchableOpacity
              style={ss.switchRow}
              onPress={() => onFilterChange('featured', !tempFilters.featured)}
            >
              <View style={ss.switchInfo}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={ss.switchLabel}>Propriétés en vedette uniquement</Text>
              </View>
              <View style={[ss.switchTrack, tempFilters.featured && ss.switchTrackOn]}>
                <View style={[ss.switchThumb, tempFilters.featured && ss.switchThumbOn]} />
              </View>
            </TouchableOpacity>

            {/* Tri */}
            <Section title="Trier par" />
            <View style={ss.sortGrid}>
              {(FILTER_OPTIONS.orderOptions ?? []).map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[ss.sortChip, tempFilters.order === o.value && ss.sortChipOn]}
                  onPress={() => onFilterChange('order', o.value)}
                >
                  <Text style={[ss.sortChipText, tempFilters.order === o.value && ss.sortChipTextOn]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Footer */}
          <View style={ss.modalFooter}>
            <TouchableOpacity style={ss.btnReset} onPress={onClearFilters}>
              <Ionicons name="refresh-outline" size={16} color={T.primary} />
              <Text style={ss.btnResetText}>Réinitialiser</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ss.btnApply} onPress={onApplyFilters}>
              <Text style={ss.btnApplyText}>Voir les résultats</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HOOK DE DEBOUNCE PERSONNALISÉ
// ─────────────────────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function PropertiesScreen() {
  const params = useLocalSearchParams();

  const [properties, setProperties]               = useState<Property[]>([]);
  const [loading, setLoading]                     = useState(true);
  const [refreshing, setRefreshing]               = useState(false);
  const [totalProperties, setTotalProperties]     = useState(0);
  const [currentPage, setCurrentPage]             = useState(1);
  const [totalPages, setTotalPages]               = useState(1);
  const [perPage]                                 = useState(10);
  const [showFilters, setShowFilters]             = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites]                 = useState<number[]>([]);
  const [favoriteProps, setFavoriteProps]         = useState<Property[]>([]);
  const [filters, setFilters]                     = useState<Filters>(defaultFilters);
  const [tempFilters, setTempFilters]             = useState<Filters>(defaultFilters);
  const [selectedOperation, setSelectedOperation] = useState('all');
  const [initialized, setInitialized]             = useState(false);

  // Valeur locale pour la recherche (avec débounce)
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 500);

  // Valeurs locales pour les champs texte du modal (prix, quartier)
  const [localPrixMin, setLocalPrixMin] = useState('');
  const [localPrixMax, setLocalPrixMax] = useState('');
  const [localQuartier, setLocalQuartier] = useState('');
  const debouncedPrixMin = useDebounce(localPrixMin, 500);
  const debouncedPrixMax = useDebounce(localPrixMax, 500);
  const debouncedQuartier = useDebounce(localQuartier, 500);

  const filterCount = Object.entries(filters).filter(
    ([k, v]) => !['operation', 'search', 'order'].includes(k) && v !== '' && v !== false
  ).length;

  // ── Favorites ───────────────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY).then(json => {
      if (json) setFavorites(JSON.parse(json));
    });
  }, []);

  const toggleFavorite = (property: Property) => {
    setFavorites(prev => {
      const next = prev.includes(property.id_propriete)
        ? prev.filter(id => id !== property.id_propriete)
        : [...prev, property.id_propriete];
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
    setFavoriteProps(prev =>
      prev.find(p => p.id_propriete === property.id_propriete)
        ? prev.filter(p => p.id_propriete !== property.id_propriete)
        : [...prev, property]
    );
  };

  const isFav = (id: number) => favorites.includes(id);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const initialFilters = { ...defaultFilters };

    if (params.search) {
      const s = Array.isArray(params.search) ? params.search[0] : params.search;
      initialFilters.search = s;
      setSearchInput(s);
    }

    if (params.type) {
      const t = Array.isArray(params.type) ? params.type[0] : params.type;
      const typeMap: Record<string, string> = {
        appartements: 'appartement',
        appartement: 'appartement',
        maisons: 'maison',
        maison: 'maison',
        terrains: 'terrain',
        terrain: 'terrain',
        commerces: 'commerce',
        commerce: 'commerce',
        bureaux: 'bureau',
        bureau: 'bureau',
        entrepots: 'entrepot',
        entrepot: 'entrepot',
      };
      const normalised = typeMap[t.toLowerCase()] ?? t.toLowerCase();
      initialFilters.type = normalised;
    }

    if (params.operation) {
      const op = Array.isArray(params.operation) ? params.operation[0] : params.operation;
      initialFilters.operation = op;
      setSelectedOperation(op);
    }

    setFilters(initialFilters);
    setTempFilters(initialFilters);
    // Initialiser les champs locaux du modal
    setLocalPrixMin(initialFilters.prix_min);
    setLocalPrixMax(initialFilters.prix_max);
    setLocalQuartier(initialFilters.quartier);
    loadProperties(1, initialFilters);
    setInitialized(true);
  }, []);

  // Synchronisation des champs texte du modal avec tempFilters (pour affichage)
  useEffect(() => {
    if (!showFilters) {
      // Quand le modal s'ouvre, on recopie les valeurs courantes
      setLocalPrixMin(tempFilters.prix_min);
      setLocalPrixMax(tempFilters.prix_max);
      setLocalQuartier(tempFilters.quartier);
    }
  }, [showFilters]);

  // Application des valeurs débouncées (prix, quartier) aux filtres temporaires
  useEffect(() => {
    setTempFilters(prev => ({ ...prev, prix_min: debouncedPrixMin }));
  }, [debouncedPrixMin]);
  useEffect(() => {
    setTempFilters(prev => ({ ...prev, prix_max: debouncedPrixMax }));
  }, [debouncedPrixMax]);
  useEffect(() => {
    setTempFilters(prev => ({ ...prev, quartier: debouncedQuartier }));
  }, [debouncedQuartier]);

  // Lorsque la recherche débouncée change, on met à jour les filtres et on recharge
  useEffect(() => {
    if (!initialized) return;
    const newFilters = { ...filters, search: debouncedSearch };
    setFilters(newFilters);
    loadProperties(1, newFilters);
  }, [debouncedSearch]);

  // Lorsque l'onglet opération change
  useEffect(() => {
    if (!initialized) return;
    const opVal = selectedOperation === 'all' ? '' : selectedOperation;
    const f = { ...filters, operation: opVal };
    setFilters(f);
    setTempFilters(prev => ({ ...prev, operation: opVal }));
    loadProperties(1, f);
  }, [selectedOperation, initialized]);

  // ── API ─────────────────────────────────────────────────────────────────────
  const loadProperties = async (page = 1, fp: Filters = filters) => {
    try {
      setLoading(true);
      const qs = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      Object.entries(fp).forEach(([k, v]) => {
        if (v !== '' && v !== false && v !== null)
          qs.append(k, typeof v === 'boolean' ? '1' : String(v));
      });
      const [ob, od] = (fp.order || 'date_publication_desc').split('_');
      qs.set('order_by', ob); qs.set('order_direction', od);

      const res = await getResource(`/proprietes?${qs}`);
      if (res?.data?.data) {
        setProperties(page === 1 ? res.data.data : [...properties, ...res.data.data]);
        setTotalProperties(res.data.total);
        setCurrentPage(res.data.current_page ?? page);
        setTotalPages(res.data.last_page ?? 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  const onRefresh    = () => { setRefreshing(true); setCurrentPage(1); loadProperties(1, filters); };
  const loadMore     = () => { if (currentPage < totalPages && !loading) loadProperties(currentPage + 1, filters); };
  
  // Applique les filtres temporaires (y compris les valeurs locales déjà debouncées) et recharge
  const applyFilters = () => {
    // Fusionner tempFilters avec les valeurs locales (car setTempFilters est asynchrone)
    const finalFilters = {
      ...tempFilters,
      prix_min: localPrixMin,
      prix_max: localPrixMax,
      quartier: localQuartier,
    };
    setFilters(finalFilters);
    setTempFilters(finalFilters);
    setCurrentPage(1);
    loadProperties(1, finalFilters);
    setShowFilters(false);
  };

  const clearFilters = () => {
    const c = { ...defaultFilters, operation: selectedOperation === 'all' ? '' : selectedOperation };
    setFilters(c);
    setTempFilters(c);
    setLocalPrixMin('');
    setLocalPrixMax('');
    setLocalQuartier('');
    setSearchInput('');
    setCurrentPage(1);
    loadProperties(1, c);
    setShowFilters(false);
  };

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setTempFilters(prev => ({ ...prev, [key]: value }));
    // Pour les filtres qui ne sont pas dans le modal à texte, on applique immédiatement
    if (!['prix_min', 'prix_max', 'quartier'].includes(key)) {
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);
      loadProperties(1, newFilters);
    }
    // Si c'est un filtre "search", on met à jour searchInput aussi
    if (key === 'search') setSearchInput(value as string);
  };

  const displayedProperties = showFavoritesOnly ? favoriteProps : properties;

  // ─────────────────────────────────────────────────────────────────────────
  // PROPERTY CARD (composant interne, mais il ne bouge pas)
  // ─────────────────────────────────────────────────────────────────────────
  const PropertyCard = ({ property }: { property: Property }) => {
    const fav = isFav(property.id_propriete);
    const statutIndispo = getStatutIndisponible(property.statut);
    const opColor = statutIndispo?.color ?? OPERATION_COLOR[property.operation] ?? T.primary;

    const amenities: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string }> = [];
    if (property.meuble)        amenities.push({ icon: 'bed-outline',     label: 'Meublé'    });
    if (property.climatisation) amenities.push({ icon: 'snow-outline',    label: 'Clim'      });
    if (property.parking)       amenities.push({ icon: 'car-outline',     label: 'Parking'   });
    if (property.piscine)       amenities.push({ icon: 'water-outline',   label: 'Piscine'   });

    return (
      <TouchableOpacity
        style={ss.card}
        onPress={() => router.push(`/property/${property.id_propriete}`)}
        activeOpacity={0.92}
      >
        {/* ── Image ── */}
        <View style={ss.cardImgWrap}>
          <Image source={getPropertyImage(property)} style={ss.cardImg} />

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.65)']}
            style={ss.imgGradient}
          />

          <View style={ss.favBtn}>
            <FavoriteButton isFav={fav} onPress={() => toggleFavorite(property)} />
          </View>

          <Text style={ss.priceOverlay}>
            {formatPrice(property.prix, property.devise)}
          </Text>

          <View style={[ss.opBadge, { backgroundColor: opColor }]}>
            <Text style={ss.opBadgeText}>{statutIndispo?.label ?? getOperationLabel(property.operation)}</Text>
          </View>
        </View>

        <View style={ss.cardBody}>
          <Text style={ss.cardTitle} numberOfLines={2}>{property.titre}</Text>

          <View style={ss.locationRow}>
            <Ionicons name="location-sharp" size={13} color={T.secondary} />
            <Text style={ss.locationText} numberOfLines={2}>
              {property.ville}{property.quartier ? ` · ${property.quartier}` : ''}
            </Text>
          </View>

          <View style={ss.statsRow}>
            {property.surface > 0 && (
              <View style={ss.statItem}>
                <Ionicons name="resize" size={12} color={T.primary} />
                <Text style={ss.statText}>{property.surface} m²</Text>
              </View>
            )}
            {property.chambres > 0 && (
              <View style={ss.statItem}>
                <Ionicons name="bed" size={12} color={T.primary} />
                <Text style={ss.statText}>{property.chambres} ch.</Text>
              </View>
            )}
            {property.salles_de_bain > 0 && (
              <View style={ss.statItem}>
                <Ionicons name="water" size={12} color={T.primary} />
                <Text style={ss.statText}>{property.salles_de_bain} sdb</Text>
              </View>
            )}
          </View>

          {amenities.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={ss.amenityRow}
            >
              {amenities.map((a, i) => (
                <View key={i} style={ss.amenityPill}>
                  <Ionicons name={a.icon} size={11} color={T.primary} />
                  <Text style={ss.amenityText}>{a.label}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={ss.cardDivider} />
          <View style={ss.cardFooter}>
            {property.agent ? (
              // Annonce d'un compte DjamaBizz : on affiche le nom de l'agence
              // et la photo générique, jamais l'identité du jeune mandataire.
              estAgentDjamabizz(property.agent) ? (
                <View style={ss.agentRow}>
                  <Image
                    source={require('../../../assets/images/default-agent.jpg')}
                    style={ss.agentAvatar}
                  />
                  <Text style={ss.agentName} numberOfLines={1}>
                    {LIBELLE_AGENT_MASQUE}
                  </Text>
                </View>
              ) : (
                <View style={ss.agentRow}>
                  <Image
                    source={
                      property.agent.utilisateur?.photo_profil
                        ? { uri: `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${property.agent.utilisateur.photo_profil}` }
                        : require('../../../assets/images/default-agent.jpg')
                    }
                    style={ss.agentAvatar}
                  />
                  <Text style={ss.agentName} numberOfLines={1}>
                    {property.agent.utilisateur?.prenom} {property.agent.utilisateur?.nom}
                  </Text>
                </View>
              )
            ) : <View />}

            <Text style={ss.dateText}>{relativeTime(property.date_publication)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // OPERATION TABS
  // ─────────────────────────────────────────────────────────────────────────
  const OperationTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={ss.tabsContent}
    >
      {operationCategories.map(cat => {
        const active = selectedOperation === cat.id;
        return (
          <TouchableOpacity
            key={cat.id}
            style={[ss.tab, active && ss.tabActive]}
            onPress={() => setSelectedOperation(cat.id)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={cat.icon}
              size={13}
              color={active ? '#fff' : T.primary}
            />
            <Text style={[ss.tabText, active && ss.tabTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIVE FILTERS STRIP
  // ─────────────────────────────────────────────────────────────────────────
  const ActiveFiltersStrip = () => {
    const chips: Array<{ label: string; key: string }> = [];
    if (filters.type)         chips.push({ key: 'type',         label: getTypeLabel(filters.type) });
    if (filters.ville)        chips.push({ key: 'ville',        label: filters.ville });
    if (filters.prix_min)     chips.push({ key: 'prix_min',     label: `≥ ${filters.prix_min}` });
    if (filters.prix_max)     chips.push({ key: 'prix_max',     label: `≤ ${filters.prix_max}` });
    if (filters.chambres_min) chips.push({ key: 'chambres_min', label: `${filters.chambres_min}+ ch.` });
    equipmentOptions.forEach(e => { if (filters[e.key]) chips.push({ key: e.key, label: e.label }); });
    if (!chips.length) return null;
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={ss.chipsRow}
        style={{ marginBottom: 6 }}
      >
        {chips.map((c, idx) => (
          <TouchableOpacity
            key={`${c.key}-${idx}`} 
            style={null}
            onPress={() => {
              const f = { ...filters, [c.key]: typeof (filters as any)[c.key] === 'boolean' ? false : '' };
              setFilters(f); setTempFilters(f); loadProperties(1, f);
              // Reset local states accordingly
              if (c.key === 'prix_min') setLocalPrixMin('');
              if (c.key === 'prix_max') setLocalPrixMax('');
              if (c.key === 'quartier') setLocalQuartier('');
            }}
          >
            <Text style={ss.chipText}>{c.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={clearFilters}>
          <Text style={ss.chipClearText}>Tout effacer</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // EMPTY STATE
  // ─────────────────────────────────────────────────────────────────────────
  const EmptyState = () => (
    <View style={ss.emptyWrap}>
      <LinearGradient
        colors={[T.primary + '18', T.secondary + '18']}
        style={ss.emptyIconBg}
      >
        <Ionicons name="home-outline" size={44} color={T.primary} />
      </LinearGradient>
      <Text style={ss.emptyTitle}>
        {showFavoritesOnly ? 'Aucun favori' : 'Aucune propriété'}
      </Text>
      <Text style={ss.emptyMsg}>
        {showFavoritesOnly
          ? 'Ajoutez des propriétés à vos favoris en appuyant sur ♡'
          : 'Essayez de modifier vos critères de recherche.'}
      </Text>
      {!showFavoritesOnly && (
        <TouchableOpacity style={ss.emptyBtn} onPress={clearFilters}>
          <Text style={ss.emptyBtnText}>Réinitialiser les filtres</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={ss.root}>
      <ImageBackground
        source={require('../../../assets/images/fond.jpg')}
        style={ss.hero}
        imageStyle={ss.heroBg}
      >
        <LinearGradient
          colors={['rgba(6,84,131,0.72)', 'rgba(20,20,40,0.88)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={ss.heroOverlay}
        >
          <View style={ss.heroTopRow}>
            <View>
              <Text style={ss.heroTitle}>Propriétés</Text>
              <Text style={ss.heroSubtitle}>
                Des centaines de biens d'exception en Guinée
              </Text>
            </View>
            <View style={ss.heroBadge}>
              <Ionicons name="home-outline" size={14} color="#fff" />
              <Text style={ss.heroBadgeText}>
                {totalProperties} bien{totalProperties > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>

      {/* SearchBar (définie en dehors) */}
      <SearchBar
        searchValue={searchInput}
        onChangeText={setSearchInput}
        onClear={() => {
          setSearchInput('');
          updateFilter('search', '');
        }}
        onFilterPress={() => setShowFilters(true)}
        filterCount={filterCount}
        showFavoritesOnly={showFavoritesOnly}
        favoritesCount={favorites.length}
        onToggleFavorites={() => setShowFavoritesOnly(p => !p)}
      />

      <View style={{ marginBottom: 8 }}>
        <OperationTabs />
      </View>

      <ActiveFiltersStrip />

      {loading && properties.length === 0 ? (
        <View style={ss.loaderWrap}>
          <ActivityIndicator size="large" color={T.primary} />
          <Text style={ss.loaderText}>Chargement…</Text>
        </View>
      ) : (
        <FlatList
          data={displayedProperties}
          renderItem={({ item }) => <PropertyCard property={item} />}
          keyExtractor={item => String(item.id_propriete)}
          numColumns={2}
          contentContainerStyle={ss.listContent}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[T.primary]}
              tintColor={T.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading
              ? () => (
                  <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={T.primary} />
                  </View>
                )
              : null
          }
          ListEmptyComponent={!loading ? <EmptyState /> : null}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FiltersModalComponent
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        tempFilters={tempFilters}
        filterCount={filterCount}
        onFilterChange={updateFilter}
        onClearFilters={clearFilters}
        onApplyFilters={applyFilters}
        localPrixMin={localPrixMin}
        setLocalPrixMin={setLocalPrixMin}
        localPrixMax={localPrixMax}
        setLocalPrixMax={setLocalPrixMax}
        localQuartier={localQuartier}
        setLocalQuartier={setLocalQuartier}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES — identical to original (no changes needed)
// ─────────────────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg, paddingBottom: 40 },

  hero:        { height: 200, width: '100%' },
  heroBg:      { borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  heroOverlay: {
    flex: 1,
    paddingTop: 96,
    paddingBottom: 8,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 4,
    lineHeight: 18,
    fontWeight: '500',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  heroBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    marginTop: -24,
    marginBottom: 16,
  },
  searchInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 54,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: T.sub,
    fontWeight: '500',
  },
  searchBtn: {
    backgroundColor: T.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginLeft: 6,
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  iconBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: T.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 8,
    elevation: 6,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: T.danger,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: T.bg,
  },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  iconBtnWhite: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  iconBtnWhiteActive: { backgroundColor: '#FFF0F0' },
  favCount:           { fontSize: 11, fontWeight: '700', color: T.primary },

  tabsContent: { paddingHorizontal: 18, gap: 8, paddingBottom: 2 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: T.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabActive: {
    backgroundColor: T.primary,
    borderColor: T.primary,
    shadowColor: T.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  tabText:       { fontSize: 13, color: T.primary, fontWeight: '700' },
  tabTextActive: { color: '#fff' },

  chipsRow: {
    paddingHorizontal: 18,
    gap: 8,
    paddingBottom: 2,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: T.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.primary + '30',
  },
  chipText:      { fontSize: 12, color: T.primary, fontWeight: '600' },
  chipClearText: { fontSize: 12, color: T.danger, fontWeight: '700', paddingHorizontal: 6 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: T.text,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: T.muted,
    marginTop: 2,
    fontWeight: '500',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  seeAllText: { color: T.primary, fontSize: 13, fontWeight: '700' },

  listContent:  { paddingHorizontal: 14, paddingBottom: 100 },
  loaderWrap:   { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
  loaderText:   { marginTop: 12, color: T.primary, fontSize: 15, fontWeight: '600' },

  card: {
    width: CARD_WIDTH,
    marginBottom: 16,
    backgroundColor: T.card,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 6,
  },
  cardImgWrap:  { height: 144, position: 'relative' },
  cardImg:      { width: '100%', height: '100%' },
  imgGradient:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },

  newBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    backgroundColor: T.danger,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  newBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },

  favBtn:     { position: 'absolute', top: 8, right: 8 },
  favBtnBg: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },

  priceOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 9,
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  opBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  opBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  cardBody:     { padding: 11 },
  cardTitle:    { fontSize: 15, fontWeight: '700', color: T.text, marginBottom: 4, letterSpacing: -0.1 },
  locationRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  locationText: { fontSize: 13, color: T.muted, marginLeft: 3, flex: 1, fontWeight: '500' },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 7, flexWrap: 'wrap' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText: { fontSize: 10, color: T.sub, fontWeight: '700' },

  amenityRow:   { gap: 5, marginBottom: 7 },
  amenityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: T.accent,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  amenityText: { fontSize: 9, color: T.primary, fontWeight: '700' },

  cardDivider: { height: 1, backgroundColor: T.border, marginVertical: 8 },
  cardFooter:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  agentRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, overflow: 'hidden' },
  agentAvatar: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: T.secondary,
  },
  agentName:   { fontSize: 12, color: T.primary, fontWeight: '700', flex: 1 },
  dateText:    { fontSize: 11, color: T.muted, fontWeight: '500' },
  qualityDots: { flexDirection: 'row', gap: 3 },
  dot:         { width: 7, height: 7, borderRadius: 3.5 },

  emptyWrap: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  emptyIconBg: {
    width: 90, height: 90, borderRadius: 45,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle:  { fontSize: 18, fontWeight: '800', color: T.text, marginBottom: 8 },
  emptyMsg:    { fontSize: 13, color: T.muted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyBtn: {
    backgroundColor: T.primary,
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 25, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '92%', paddingBottom: 10,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: T.border,
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  modalHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  modalTitle:    { fontSize: 20, fontWeight: '800', color: T.text, letterSpacing: -0.3 },
  modalSubtitle: { fontSize: 12, color: T.secondary, fontWeight: '600', marginTop: 2 },
  modalCloseBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: T.bg, justifyContent: 'center', alignItems: 'center',
  },

  fSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 20, marginBottom: 10,
  },
  fSectionBar:   { width: 3, height: 16, backgroundColor: T.secondary, borderRadius: 2 },
  fSectionLabel: { fontSize: 14, fontWeight: '700', color: T.text },

  fSearchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.bg, borderRadius: 12, paddingHorizontal: 12, height: 46,
    borderWidth: 1, borderColor: T.border,
  },
  fSearchInput: { flex: 1, fontSize: 14, color: T.sub },

  chipRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: T.bg, borderWidth: 1.5, borderColor: T.border,
  },
  fChipOn:      { backgroundColor: T.accent, borderColor: T.primary },
  fChipText:    { fontSize: 13, color: T.muted, fontWeight: '500' },
  fChipTextOn:  { color: T.primary, fontWeight: '700' },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceInput: {
    flex: 1, height: 46, backgroundColor: T.bg,
    borderRadius: 12, paddingHorizontal: 12, fontSize: 14,
    borderWidth: 1, borderColor: T.border, color: T.sub,
  },
  priceDash: { width: 16, height: 2, backgroundColor: T.muted, borderRadius: 1 },
  fInput: {
    height: 46, backgroundColor: T.bg, borderRadius: 12,
    paddingHorizontal: 12, fontSize: 14,
    borderWidth: 1, borderColor: T.border, color: T.sub,
  },

  equipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  equipItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.bg, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1.5, borderColor: T.border,
    minWidth: '45%', flex: 1,
  },
  equipItemOn:     { backgroundColor: T.accent, borderColor: T.primary },
  equipIconWrap:   {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: T.accent, justifyContent: 'center', alignItems: 'center',
  },
  equipIconWrapOn: { backgroundColor: T.primary },
  equipLabel:      { fontSize: 12, color: T.sub, fontWeight: '500', flex: 1 },
  equipLabelOn:    { color: T.primary, fontWeight: '700' },

  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: T.bg, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: T.border,
  },
  switchInfo:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchLabel:   { fontSize: 13, color: T.sub, fontWeight: '500' },
  switchTrack: {
    width: 44, height: 24, borderRadius: 12,
    backgroundColor: T.border, justifyContent: 'center', paddingHorizontal: 2,
  },
  switchTrackOn: { backgroundColor: T.primary },
  switchThumb:   { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  switchThumbOn: { alignSelf: 'flex-end' },

  sortGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sortChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: T.bg, borderWidth: 1.5, borderColor: T.border,
  },
  sortChipOn:      { backgroundColor: T.primary, borderColor: T.primary },
  sortChipText:    { fontSize: 12, color: T.muted, fontWeight: '500' },
  sortChipTextOn:  { color: '#fff', fontWeight: '700' },

  modalFooter: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 20,
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: T.border,
  },
  btnReset: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: T.primary,
    backgroundColor: T.accent,
  },
  btnResetText: { color: T.primary, fontSize: 14, fontWeight: '700' },
  btnApply: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, backgroundColor: T.primary,
    shadowColor: T.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  btnApplyText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
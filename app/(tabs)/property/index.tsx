import { FILTER_OPTIONS } from '@/constants/filters';
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
import { getResource } from '../../../services/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 36) / 2;

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
  images: Array<{ url: string; principale: boolean }>;
  video?: string;
  agent?: {
    id_agent: number;
    telephone_bureau?: string;
    utilisateur?: {
      nom?: string;
      prenom?: string;
      photo_profil: string;
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

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const THEME = {
  primary: '#065483',
  secondary: '#EC9107',
  danger: '#EF4444',
  success: '#22C55E',
  bg: '#F0F4F8',
  card: '#FFFFFF',
  text: '#1E293B',
  muted: '#94A3B8',
  border: '#E2E8F0',
};

const equipmentOptions: Array<{ key: EquipmentKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'meuble',       label: 'Meublé',        icon: 'bed-outline'       },
  { key: 'climatisation',label: 'Climatisation',  icon: 'snow-outline'      },
  { key: 'parking',      label: 'Parking',        icon: 'car-outline'       },
  { key: 'jardin',       label: 'Jardin',         icon: 'leaf-outline'      },
  { key: 'piscine',      label: 'Piscine',        icon: 'water-outline'     },
  { key: 'ascenseur',    label: 'Ascenseur',      icon: 'arrow-up-outline'  },
];

const operationCategories = [
  { id: 'all',                 label: 'Tous',      icon: 'apps-outline'     as const },
  { id: 'vente',               label: 'Achat',     icon: 'home-outline'     as const },
  { id: 'location',            label: 'Location',  icon: 'calendar-outline' as const },
  { id: 'location_saisonniere',label: 'Saisonnier',icon: 'sunny-outline'    as const },
];

const OPERATION_COLOR: Record<string, string> = {
  vente: '#EF4444',
  location: '#065483',
  location_saisonniere: '#F59E0B',
};

const ETAT_COLOR: Record<string, string> = {
  neuf: '#22C55E',
  excellent: '#22C55E',
  bon: '#3B82F6',
  renovation: '#F59E0B',
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
  if (d === 0) return "aujourd'hui";
  if (d === 1) return 'hier';
  if (d < 7)  return `il y a ${d}j`;
  if (d < 30) return `il y a ${Math.floor(d / 7)}sem`;
  if (d < 365)return `il y a ${Math.floor(d / 30)}mois`;
  return `il y a ${Math.floor(d / 365)}an(s)`;
};

const isNew = (dateStr: string) =>
  Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000) <= 7;

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Animated heart button */
const FavoriteButton = ({
  isFav, onPress,
}: { isFav: boolean; onPress: () => void }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.35, useNativeDriver: true, speed: 40 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 40 }),
    ]).start();
    onPress();
  };
  return (
    <TouchableOpacity onPress={handlePress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={styles.favBtnBg}>
          <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={16}
            color={isFav ? THEME.danger : '#fff'} />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

/** Quality dots indicator */
const QualityDots = ({ score }: { score: number }) => {
  const level = score >= 80 ? 3 : score >= 60 ? 2 : score >= 40 ? 1 : 0;
  return (
    <View style={styles.qualityDots}>
      {[0, 1, 2].map(i => (
        <View key={i} style={[styles.dot,
          { backgroundColor: i < level ? '#22C55E' : THEME.border }]} />
      ))}
    </View>
  );
};

/** Single amenity pill */
const AmenityPill = ({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) => (
  <View style={styles.amenityPill}>
    <Ionicons name={icon} size={10} color={THEME.primary} />
    <Text style={styles.amenityText}>{label}</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function PropertiesScreen() {
  const params = useLocalSearchParams();

  const [properties, setProperties]             = useState<Property[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [refreshing, setRefreshing]             = useState(false);
  const [totalProperties, setTotalProperties]   = useState(0);
  const [currentPage, setCurrentPage]           = useState(1);
  const [totalPages, setTotalPages]             = useState(1);
  const [perPage]                               = useState(10);
  const [showFilters, setShowFilters]           = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites]               = useState<number[]>([]);
  const [favoriteProps, setFavoriteProps]       = useState<Property[]>([]);
  const [filters, setFilters]                   = useState<Filters>(defaultFilters);
  const [tempFilters, setTempFilters]           = useState<Filters>(defaultFilters);
  const [selectedOperation, setSelectedOperation] = useState('all');
  const [initialized, setInitialized]           = useState(false);

  const filterCount = Object.entries(filters).filter(([k, v]) =>
    !['operation', 'search', 'order'].includes(k) && v !== '' && v !== false
  ).length;

  // ── Load favorites ──────────────────────────────────────────────────────────
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
    setFavoriteProps(prev => {
      if (prev.find(p => p.id_propriete === property.id_propriete))
        return prev.filter(p => p.id_propriete !== property.id_propriete);
      return [...prev, property];
    });
  };

  const isFav = (id: number) => favorites.includes(id);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (params.search) {
      const s = Array.isArray(params.search) ? params.search[0] : params.search;
      const f = { ...defaultFilters, search: s };
      setFilters(f); setTempFilters(f);
      setTimeout(() => loadProperties(1, f), 100);
    } else {
      loadProperties();
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const opVal = selectedOperation === 'all' ? '' : selectedOperation;
    const f = { ...filters, operation: opVal };
    setFilters(f); setTempFilters(prev => ({ ...prev, operation: opVal }));
    loadProperties(1, f);
  }, [selectedOperation, initialized]);

  // ── API ─────────────────────────────────────────────────────────────────────
  const loadProperties = async (page = 1, fp: Filters = filters) => {
    try {
      setLoading(true);
      const qs = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      Object.entries(fp).forEach(([k, v]) => {
        if (v !== '' && v !== false && v !== null) {
          qs.append(k, typeof v === 'boolean' ? '1' : String(v));
        }
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

  const onRefresh   = () => { setRefreshing(true); setCurrentPage(1); loadProperties(1, filters); };
  const loadMore    = () => { if (currentPage < totalPages && !loading) loadProperties(currentPage + 1, filters); };
  const applyFilters = () => { setFilters(tempFilters); setCurrentPage(1); loadProperties(1, tempFilters); setShowFilters(false); };
  const clearFilters = () => {
    const c = { ...defaultFilters, operation: selectedOperation === 'all' ? '' : selectedOperation };
    setTempFilters(c); setFilters(c); setCurrentPage(1); loadProperties(1, c); setShowFilters(false);
  };
  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setTempFilters(prev => ({ ...prev, [key]: value }));

  const displayedProperties = showFavoritesOnly ? favoriteProps : properties;

  // ─────────────────────────────────────────────────────────────────────────
  // PROPERTY CARD
  // ─────────────────────────────────────────────────────────────────────────
  const PropertyCard = ({ property }: { property: Property }) => {
    const fav = isFav(property.id_propriete);
    const badges: Array<{ label: string; color: string }> = [];
    if (property.featured) badges.push({ label: '★ Vedette', color: '#F59E0B' });
    if ((property.qualite_score ?? 0) >= 80) badges.push({ label: 'Premium', color: '#22C55E' });
    if (isNew(property.date_publication)) badges.push({ label: 'Nouveau', color: THEME.danger });

    const amenities: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string }> = [];
    if (property.meuble)        amenities.push({ icon: 'bed-outline',    label: 'Meublé'    });
    if (property.climatisation) amenities.push({ icon: 'snow-outline',   label: 'Clim'      });
    if (property.parking)       amenities.push({ icon: 'car-outline',    label: 'Parking'   });
    if (property.piscine)       amenities.push({ icon: 'water-outline',  label: 'Piscine'   });
    if (property.jardin)        amenities.push({ icon: 'leaf-outline',   label: 'Jardin'    });
    if (property.ascenseur)     amenities.push({ icon: 'arrow-up-outline',label: 'Ascenseur'});

    const opColor = OPERATION_COLOR[property.operation] ?? THEME.primary;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/property/${property.id_propriete}`)}
        activeOpacity={0.93}
      >
        {/* ── Image zone ── */}
        <View style={styles.cardImgWrap}>
          <Image source={getPropertyImage(property)} style={styles.cardImg} />

          {/* gradient bottom */}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.72)']}
            style={styles.imgGradient} />

          {/* top badges */}
          <View style={styles.topBadgeRow}>
            {badges.map((b, i) => (
              <View key={i} style={[styles.badgePill, { backgroundColor: b.color }]}>
                <Text style={styles.badgeText}>{b.label}</Text>
              </View>
            ))}
          </View>

          {/* favorite */}
          <View style={styles.favBtn}>
            <FavoriteButton isFav={fav} onPress={() => toggleFavorite(property)} />
          </View>

          {/* operation badge */}
          <View style={[styles.opBadge, { backgroundColor: opColor }]}>
            <Text style={styles.opBadgeText}>{getOperationLabel(property.operation)}</Text>
          </View>

          {/* price */}
          <Text style={styles.priceOverlay}>{formatPrice(property.prix, property.devise)}</Text>

          {/* image count */}
          {(property.images?.length ?? 0) > 1 && (
            <View style={styles.imgCount}>
              <Ionicons name="images-outline" size={9} color="#fff" />
              <Text style={styles.imgCountText}>{property.images.length}</Text>
            </View>
          )}
        </View>

        {/* ── Content ── */}
        <View style={styles.cardBody}>
          {/* title */}
          <Text style={styles.cardTitle} numberOfLines={1}>{property.titre}</Text>

          {/* location */}
          <View style={styles.locationRow}>
            <Ionicons name="location" size={11} color={THEME.secondary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {property.ville}{property.quartier ? ` · ${property.quartier}` : ''}
            </Text>
          </View>

          {/* key stats */}
          <View style={styles.statsRow}>
            {property.surface > 0 && (
              <View style={styles.statItem}>
                <Ionicons name="resize-outline" size={11} color={THEME.primary} />
                <Text style={styles.statText}>{property.surface} m²</Text>
              </View>
            )}
            {property.chambres > 0 && (
              <View style={styles.statItem}>
                <Ionicons name="bed-outline" size={11} color={THEME.primary} />
                <Text style={styles.statText}>{property.chambres} ch.</Text>
              </View>
            )}
            {property.salles_de_bain > 0 && (
              <View style={styles.statItem}>
                <Ionicons name="water-outline" size={11} color={THEME.primary} />
                <Text style={styles.statText}>{property.salles_de_bain} sdb</Text>
              </View>
            )}
          </View>

          {/* amenity pills */}
          {amenities.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={styles.amenityScroll} contentContainerStyle={{ gap: 4 }}>
              {amenities.slice(0, 4).map((a, i) => (
                <AmenityPill key={i} icon={a.icon} label={a.label} />
              ))}
            </ScrollView>
          )}

          {/* extra info row */}
          <View style={styles.extraRow}>
            {property.etat && (
              <View style={[styles.etatBadge, { backgroundColor: (ETAT_COLOR[property.etat] ?? THEME.muted) + '22' }]}>
                <Text style={[styles.etatText, { color: ETAT_COLOR[property.etat] ?? THEME.muted }]}>
                  {getEtatLabel(property.etat)}
                </Text>
              </View>
            )}
            {property.electricite && (
              <View style={styles.infoChip}>
                <Ionicons name="flash-outline" size={9}
                  color={property.electricite === 'Disponible' ? '#22C55E' :
                         property.electricite === 'Instable' ? '#F59E0B' : '#EF4444'} />
                <Text style={styles.infoChipText}>{property.electricite}</Text>
              </View>
            )}
            {property.qualite_score !== undefined && (
              <QualityDots score={property.qualite_score} />
            )}
          </View>

          {/* divider */}
          <View style={styles.divider} />

          {/* footer: agent + date */}
          <View style={styles.cardFooter}>
            {property.agent ? (
              <View style={styles.agentRow}>
                <Image
                  source={property.agent.utilisateur?.photo_profil
                    ? { uri: `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${property.agent.utilisateur.photo_profil}` }
                    : require('../../../assets/images/default-agent.jpg')}
                  style={styles.agentAvatar}
                />
                <Text style={styles.agentName} numberOfLines={1}>
                  {property.agent.utilisateur?.prenom} {property.agent.utilisateur?.nom}
                </Text>
              </View>
            ) : <View />}

            <Text style={styles.dateText}>{relativeTime(property.date_publication)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH BAR
  // ─────────────────────────────────────────────────────────────────────────
  const SearchBar = () => (
    <View style={styles.searchBarWrap}>
      <View style={styles.searchInner}>
        <Ionicons name="search-outline" size={18} color={THEME.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Ville, quartier, type..."
          placeholderTextColor={THEME.muted}
          value={filters.search}
          onChangeText={t => {
            setFilters(p => ({ ...p, search: t }));
            setTempFilters(p => ({ ...p, search: t }));
          }}
          onSubmitEditing={() => loadProperties(1, filters)}
          returnKeyType="search"
        />
        {!!filters.search && (
          <TouchableOpacity onPress={() => {
            const f = { ...filters, search: '' };
            setFilters(f); setTempFilters(f); loadProperties(1, f);
          }}>
            <Ionicons name="close-circle" size={18} color={THEME.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* filter trigger */}
      <TouchableOpacity style={styles.filterTrigger} onPress={() => setShowFilters(true)}>
        <Ionicons name="options-outline" size={20} color="#fff" />
        {filterCount > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{filterCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* favorites toggle */}
      <TouchableOpacity
        style={[styles.favToggle, showFavoritesOnly && styles.favToggleActive]}
        onPress={() => setShowFavoritesOnly(p => !p)}
      >
        <Ionicons
          name={showFavoritesOnly ? 'heart' : 'heart-outline'}
          size={20}
          color={showFavoritesOnly ? THEME.danger : THEME.primary}
        />
        {favorites.length > 0 && (
          <Text style={[styles.favCount, showFavoritesOnly && { color: THEME.danger }]}>
            {favorites.length}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // OPERATION TABS
  // ─────────────────────────────────────────────────────────────────────────
  const OperationTabs = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabsContent}>
      {operationCategories.map(cat => {
        const active = selectedOperation === cat.id;
        return (
          <TouchableOpacity
            key={cat.id}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => setSelectedOperation(cat.id)}
          >
            <Ionicons name={cat.icon} size={13}
              color={active ? '#fff' : THEME.primary} />
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
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
    if (filters.type)        chips.push({ key: 'type',        label: getTypeLabel(filters.type) });
    if (filters.ville)       chips.push({ key: 'ville',       label: filters.ville });
    if (filters.prix_min)    chips.push({ key: 'prix_min',    label: `≥ ${filters.prix_min}` });
    if (filters.prix_max)    chips.push({ key: 'prix_max',    label: `≤ ${filters.prix_max}` });
    if (filters.chambres_min)chips.push({ key: 'chambres_min',label: `${filters.chambres_min}+ ch.` });
    equipmentOptions.forEach(e => { if (filters[e.key]) chips.push({ key: e.key, label: e.label }); });
    if (!chips.length) return null;
    return (
      <View style={styles.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}>
          {chips.map(c => (
            <TouchableOpacity key={c.key} style={styles.chip} onPress={() => {
              const f = { ...filters, [c.key]: typeof (filters as any)[c.key] === 'boolean' ? false : '' };
              setFilters(f); setTempFilters(f); loadProperties(1, f);
            }}>
              <Text style={styles.chipText}>{c.label}</Text>
              <Ionicons name="close" size={11} color={THEME.primary} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.chipClear} onPress={clearFilters}>
            <Text style={styles.chipClearText}>Tout effacer</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // FILTERS MODAL
  // ─────────────────────────────────────────────────────────────────────────
  const FiltersModal = () => {
    const Section = ({ title }: { title: string }) => (
      <View style={styles.fSection}>
        <View style={styles.fSectionTitle}>
          <View style={styles.fSectionBar} />
          <Text style={styles.fSectionLabel}>{title}</Text>
        </View>
      </View>
    );

    return (
      <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>

            {/* drag handle */}
            <View style={styles.modalHandle} />

            {/* header */}
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Filtres</Text>
                {filterCount > 0 && (
                  <Text style={styles.modalSubtitle}>{filterCount} filtre(s) actif(s)</Text>
                )}
              </View>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={20} color={THEME.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>

              {/* Search */}
              <Section title="Recherche rapide" />
              <View style={styles.fSearchBox}>
                <Ionicons name="search-outline" size={16} color={THEME.muted} />
                <TextInput
                  style={styles.fSearchInput}
                  placeholder="Titre, ville, quartier..."
                  placeholderTextColor={THEME.muted}
                  value={tempFilters.search}
                  onChangeText={t => updateFilter('search', t)}
                />
              </View>

              {/* Type */}
              <Section title="Type de bien" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}>
                {[{ value: '', label: 'Tous' }, ...(FILTER_OPTIONS.types ?? [])].map(o => (
                  <TouchableOpacity key={o.value}
                    style={[styles.fChip, tempFilters.type === o.value && styles.fChipOn]}
                    onPress={() => updateFilter('type', o.value)}>
                    <Text style={[styles.fChipText, tempFilters.type === o.value && styles.fChipTextOn]}>
                      {o.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Prix */}
              <Section title="Fourchette de prix (GNF)" />
              <View style={styles.priceRow}>
                <TextInput style={styles.priceInput} placeholder="Min"
                  placeholderTextColor={THEME.muted} keyboardType="numeric"
                  value={tempFilters.prix_min}
                  onChangeText={t => updateFilter('prix_min', t)} />
                <View style={styles.priceDash} />
                <TextInput style={styles.priceInput} placeholder="Max"
                  placeholderTextColor={THEME.muted} keyboardType="numeric"
                  value={tempFilters.prix_max}
                  onChangeText={t => updateFilter('prix_max', t)} />
              </View>

              {/* Ville */}
              <Section title="Ville" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}>
                {[{ value: '', label: 'Toutes' }, ...(FILTER_OPTIONS.villes ?? [])].map(o => (
                  <TouchableOpacity key={o.value}
                    style={[styles.fChip, tempFilters.ville === o.value && styles.fChipOn]}
                    onPress={() => updateFilter('ville', o.value)}>
                    <Text style={[styles.fChipText, tempFilters.ville === o.value && styles.fChipTextOn]}>
                      {o.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Quartier */}
              <Section title="Quartier" />
              <TextInput style={styles.fInput} placeholder="Ex: Ratoma, Kipé..."
                placeholderTextColor={THEME.muted}
                value={tempFilters.quartier}
                onChangeText={t => updateFilter('quartier', t)} />

              {/* Chambres */}
              <Section title="Chambres minimum" />
              <View style={styles.chipRow}>
                {['', '1', '2', '3', '4', '5+'].map(n => (
                  <TouchableOpacity key={n}
                    style={[styles.fChip, tempFilters.chambres_min === n && styles.fChipOn]}
                    onPress={() => updateFilter('chambres_min', n)}>
                    <Text style={[styles.fChipText, tempFilters.chambres_min === n && styles.fChipTextOn]}>
                      {n === '' ? 'Tous' : n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Équipements */}
              <Section title="Équipements" />
              <View style={styles.equipGrid}>
                {equipmentOptions.map(e => {
                  const on = tempFilters[e.key];
                  return (
                    <TouchableOpacity key={e.key}
                      style={[styles.equipItem, on && styles.equipItemOn]}
                      onPress={() => updateFilter(e.key, !on)}>
                      <View style={[styles.equipIcon, on && styles.equipIconOn]}>
                        <Ionicons name={e.icon} size={16} color={on ? '#fff' : THEME.primary} />
                      </View>
                      <Text style={[styles.equipLabel, on && styles.equipLabelOn]}>{e.label}</Text>
                      {on && <Ionicons name="checkmark-circle" size={14} color={THEME.primary} style={{ marginLeft: 'auto' }} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* En vedette */}
              <Section title="Mise en avant" />
              <TouchableOpacity style={styles.switchRow}
                onPress={() => updateFilter('featured', !tempFilters.featured)}>
                <View style={styles.switchInfo}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text style={styles.switchLabel}>Propriétés en vedette uniquement</Text>
                </View>
                <View style={[styles.switchTrack, tempFilters.featured && styles.switchTrackOn]}>
                  <View style={[styles.switchThumb, tempFilters.featured && styles.switchThumbOn]} />
                </View>
              </TouchableOpacity>

              {/* Tri */}
              <Section title="Trier par" />
              <View style={styles.sortGrid}>
                {(FILTER_OPTIONS.orderOptions ?? []).map(o => (
                  <TouchableOpacity key={o.value}
                    style={[styles.sortChip, tempFilters.order === o.value && styles.sortChipOn]}
                    onPress={() => updateFilter('order', o.value)}>
                    <Text style={[styles.sortChipText, tempFilters.order === o.value && styles.sortChipTextOn]}>
                      {o.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnReset} onPress={clearFilters}>
                <Ionicons name="refresh-outline" size={16} color={THEME.primary} />
                <Text style={styles.btnResetText}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnApply} onPress={applyFilters}>
                <Text style={styles.btnApplyText}>Voir les résultats</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // EMPTY / LOADING STATES
  // ─────────────────────────────────────────────────────────────────────────
  const EmptyState = () => (
    <View style={styles.emptyWrap}>
      <LinearGradient colors={[THEME.primary + '18', THEME.secondary + '18']}
        style={styles.emptyIconBg}>
        <Ionicons name="home-outline" size={44} color={THEME.primary} />
      </LinearGradient>
      <Text style={styles.emptyTitle}>
        {showFavoritesOnly ? 'Aucun favori' : 'Aucune propriété'}
      </Text>
      <Text style={styles.emptyMsg}>
        {showFavoritesOnly
          ? 'Ajoutez des propriétés à vos favoris en appuyant sur ♡'
          : 'Essayez de modifier vos critères de recherche.'}
      </Text>
      {!showFavoritesOnly && (
        <TouchableOpacity style={styles.emptyBtn} onPress={clearFilters}>
          <Text style={styles.emptyBtnText}>Réinitialiser les filtres</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* HERO */}
      <ImageBackground
        source={require('../../../assets/images/bg1.jpg')}
        style={styles.hero}
        imageStyle={styles.heroBg}
      >
        
        <LinearGradient
          colors={['rgba(6,84,131,0.8)', 'rgba(236,145,7,0.8)']}
          style={styles.heroOverlay}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Propriétés</Text>
            <Text style={styles.headerSubtitle}>
              {totalProperties} bien{totalProperties > 1 ? 's' : ''} disponible{totalProperties > 1 ? 's' : ''}
            </Text>
          </View>
        </LinearGradient>
      </ImageBackground>

      {/* SEARCH + TABS */}
      <SearchBar />
      <View style={styles.tabsWrap}>
        <OperationTabs />
      </View>
      <ActiveFiltersStrip />

      {/* LIST */}
      {loading && properties.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loaderText}>Chargement…</Text>
        </View>
      ) : (
        <FlatList
          data={displayedProperties}
          renderItem={({ item }) => <PropertyCard property={item} />}
          keyExtractor={item => String(item.id_propriete)}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
              colors={[THEME.primary]} tintColor={THEME.primary} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loading
            ? () => (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={THEME.primary} />
                </View>
              )
            : null}
          ListEmptyComponent={!loading ? <EmptyState /> : null}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
        />
      )}

      <FiltersModal />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg, paddingBottom: 40, },

  heroOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {},
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 24,
  },

  // HERO
  hero:        { height: 190, width: '100%' },
  heroBg:      { borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  
  heroTitle: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  heroMeta:  { flexDirection: 'row', gap: 8, marginTop: 8 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  heroBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // SEARCH BAR
  searchBarWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, marginTop: -22, marginBottom: 12,
  },
  searchInner: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 12, height: 46,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 6,
  },
  searchInput: { flex: 1, fontSize: 14, color: THEME.text, marginLeft: 8 },
  filterTrigger: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: THEME.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: THEME.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 6, elevation: 6,
  },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: THEME.danger, borderRadius: 10,
    width: 18, height: 18, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: THEME.bg,
  },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  favToggle: {
    width: 46, height: 46, borderRadius: 14, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  favToggleActive: { backgroundColor: '#FFF0F0' },
  favCount: { fontSize: 11, fontWeight: '700', color: THEME.primary },

  // TABS
  tabsWrap:    { marginBottom: 10 },
  tabsContent: { paddingHorizontal: 16, gap: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: THEME.border,
  },
  tabActive: {
    backgroundColor: THEME.primary, borderColor: THEME.primary,
    shadowColor: THEME.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  tabText:       { fontSize: 13, color: THEME.primary, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  // CHIPS STRIP
  chipsWrap:    { marginBottom: 8 },
  chipsContent: { paddingHorizontal: 16, gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: THEME.primary + '14',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: THEME.primary + '30',
  },
  chipText:      { fontSize: 12, color: THEME.primary, fontWeight: '500' },
  chipClear:     { paddingHorizontal: 10, paddingVertical: 5 },
  chipClearText: { fontSize: 12, color: THEME.danger, fontWeight: '600' },

  // LIST
  listContent: { paddingHorizontal: 10, paddingBottom: 100 },
  loaderWrap:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText:  { marginTop: 10, color: THEME.muted, fontSize: 14 },
  footerLoader:{ paddingVertical: 20, alignItems: 'center' },

  // CARD
  card: {
    width: CARD_WIDTH, marginBottom: 14,
    backgroundColor: THEME.card, borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  cardImgWrap:    { height: 148, position: 'relative' },
  cardImg:        { width: '100%', height: '100%' },
  imgGradient:    { position: 'absolute', bottom: 0, left: 0, right: 0, height: 70 },
  topBadgeRow:    { position: 'absolute', top: 7, left: 7, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  badgePill: {
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
  },
  badgeText:  { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  favBtn:     { position: 'absolute', top: 7, right: 7 },
  favBtnBg: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  opBadge: {
    position: 'absolute', bottom: 28, right: 7,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  opBadgeText:  { color: '#fff', fontSize: 9, fontWeight: '700' },
  priceOverlay: { position: 'absolute', bottom: 8, left: 8, color: '#fff', fontSize: 12, fontWeight: '800' },
  imgCount: {
    position: 'absolute', bottom: 8, right: 7,
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6,
  },
  imgCountText: { color: '#fff', fontSize: 9, fontWeight: '600' },

  cardBody:     { padding: 10 },
  cardTitle:    { fontSize: 13, fontWeight: '700', color: THEME.text, marginBottom: 4 },
  locationRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  locationText: { fontSize: 11, color: THEME.muted, marginLeft: 3, flex: 1 },
  statsRow:     { flexDirection: 'row', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  statItem:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText:     { fontSize: 10, color: THEME.text, fontWeight: '600' },
  amenityScroll:{ marginBottom: 6 },
  amenityPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: THEME.primary + '12',
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
  },
  amenityText:  { fontSize: 9, color: THEME.primary, fontWeight: '600' },
  extraRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6, flexWrap: 'wrap' },
  etatBadge:    { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  etatText:     { fontSize: 9, fontWeight: '700' },
  infoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F8FAFC', paddingHorizontal: 5, paddingVertical: 3, borderRadius: 5,
  },
  infoChipText: { fontSize: 9, color: THEME.text },
  qualityDots:  { flexDirection: 'row', gap: 3, alignItems: 'center', marginLeft: 'auto' },
  dot:          { width: 7, height: 7, borderRadius: 3.5 },
  divider:      { height: 1, backgroundColor: THEME.border, marginVertical: 7 },
  cardFooter:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  agentRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, overflow: 'hidden' },
  agentAvatar:  { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: THEME.secondary },
  agentName:    { fontSize: 10, color: THEME.primary, fontWeight: '600', flex: 1 },
  dateText:     { fontSize: 9, color: THEME.muted, fontWeight: '500' },

  // EMPTY
  emptyWrap:   { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  emptyIconBg: {
    width: 90, height: 90, borderRadius: 45,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle:  { fontSize: 18, fontWeight: '700', color: THEME.text, marginBottom: 8 },
  emptyMsg:    { fontSize: 13, color: THEME.muted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyBtn: {
    backgroundColor: THEME.primary, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 25, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // MODAL
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '92%', paddingBottom: 10,
  },
  modalHandle:  {
    width: 40, height: 4, backgroundColor: THEME.border,
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  modalHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  modalTitle:    { fontSize: 20, fontWeight: '800', color: THEME.text },
  modalSubtitle: { fontSize: 12, color: THEME.secondary, fontWeight: '600', marginTop: 2 },
  modalClose: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: THEME.bg, justifyContent: 'center', alignItems: 'center',
  },
  modalBody:    { paddingHorizontal: 20 },

  // Filter sections
  fSection: { marginTop: 20, marginBottom: 10 },
  fSectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fSectionBar: { width: 3, height: 16, backgroundColor: THEME.secondary, borderRadius: 2 },
  fSectionLabel: { fontSize: 14, fontWeight: '700', color: THEME.text },
  fSearchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: THEME.bg, borderRadius: 12, paddingHorizontal: 12, height: 44,
    borderWidth: 1, borderColor: THEME.border,
  },
  fSearchInput: { flex: 1, fontSize: 14, color: THEME.text },
  chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: THEME.bg, borderWidth: 1.5, borderColor: THEME.border,
  },
  fChipOn:      { backgroundColor: THEME.primary + '14', borderColor: THEME.primary },
  fChipText:    { fontSize: 13, color: THEME.muted, fontWeight: '500' },
  fChipTextOn:  { color: THEME.primary, fontWeight: '700' },
  priceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  priceInput: {
    flex: 1, height: 44, backgroundColor: THEME.bg,
    borderRadius: 12, paddingHorizontal: 12, fontSize: 14,
    borderWidth: 1, borderColor: THEME.border, color: THEME.text,
  },
  priceDash: { width: 16, height: 2, backgroundColor: THEME.muted, borderRadius: 1 },
  fInput: {
    height: 44, backgroundColor: THEME.bg, borderRadius: 12,
    paddingHorizontal: 12, fontSize: 14,
    borderWidth: 1, borderColor: THEME.border, color: THEME.text,
  },
  equipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  equipItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: THEME.bg, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1.5, borderColor: THEME.border,
    minWidth: '45%', flex: 1,
  },
  equipItemOn:   { backgroundColor: THEME.primary + '0E', borderColor: THEME.primary },
  equipIcon:     { width: 30, height: 30, borderRadius: 8, backgroundColor: THEME.primary + '14', justifyContent: 'center', alignItems: 'center' },
  equipIconOn:   { backgroundColor: THEME.primary },
  equipLabel:    { fontSize: 12, color: THEME.text, fontWeight: '500', flex: 1 },
  equipLabelOn:  { color: THEME.primary, fontWeight: '700' },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: THEME.bg, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: THEME.border,
  },
  switchInfo:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchLabel:   { fontSize: 13, color: THEME.text, fontWeight: '500' },
  switchTrack: {
    width: 44, height: 24, borderRadius: 12,
    backgroundColor: THEME.border, justifyContent: 'center', paddingHorizontal: 2,
  },
  switchTrackOn: { backgroundColor: THEME.primary },
  switchThumb:   { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  switchThumbOn: { alignSelf: 'flex-end' },
  sortGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sortChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: THEME.bg, borderWidth: 1.5, borderColor: THEME.border,
  },
  sortChipOn:      { backgroundColor: THEME.primary, borderColor: THEME.primary },
  sortChipText:    { fontSize: 12, color: THEME.muted, fontWeight: '500' },
  sortChipTextOn:  { color: '#fff', fontWeight: '700' },

  // Modal footer
  modalFooter: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 20,
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: THEME.border,
  },
  btnReset: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: THEME.primary,
    backgroundColor: THEME.primary + '0A',
  },
  btnResetText:  { color: THEME.primary, fontSize: 14, fontWeight: '700' },
  btnApply: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: THEME.primary,
    shadowColor: THEME.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  btnApplyText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
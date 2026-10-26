import { getResource } from '@/services/api';
import { filtrerAgentsVisibles } from '@/utils/djamabizz';
import { getStatutIndisponible } from '@/utils/statutPropriete';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

// ======================== TYPES ========================
interface Property {
  id_propriete: number;
  titre: string;
  prix: number;
  devise: string;
  type: string;
  operation: string;
  surface: number;
  chambres: number;
  ville: string;
  statut?: string;
  images: Array<{ url: string }>;
}

interface Agent {
  id_agent: number;
  utilisateur: {
    nom: string;
    prenom: string;
    photo_profil?: string;
    // Rôle du compte : permet d'écarter les comptes 'djamabizz'.
    role?: string;
  };
  titre: string;
  note_moyenne: number;
  // Drapeau calculé renvoyé par l'API (App\Models\Agent::est_djamabizz).
  est_djamabizz?: boolean;
  type_agent?: string;
}

interface Blog {
  id_blog: number;
  titre: string;
  slug: string;
  categorie: string;
  extrait: string;
  date_publication: string;
  temps_lecture: number;
  image_principale: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  icon: string;
  iconColor: string;
  iconBg: string;
}

// ======================== DONNÉES STATIQUES ========================
const propertyCategories = [
  { id: '1', name: 'Appartements', search: 'appartement', image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&q=80', icon: 'business' },
  { id: '2', name: 'Duplex', search: 'duplex', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=200&q=80', icon: 'layers' },
  { id: '3', name: 'Terrains', search: 'terrain', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=200&q=80', icon: 'map' },
  { id: '4', name: 'Villas', search: 'villas', image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=200&q=80', icon: 'ribbon' },
  { id: '5', name: 'Entrepôts', search: 'entrepot', image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=200&q=80', icon: 'warehouse' },
  { id: '6', name: 'Commerces', search: 'commerce', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&q=80', icon: 'storefront' },
  { id: '7', name: 'Autres', search: 'autres', image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200&q=80', icon: 'apps' }
];

const PROMO_ITEM_WIDTH = width - 48;

const realEstatePromotions = [
  {
    id: 'p1',
    title: "Frais d'agence\n−50%",
    subtitle: 'Sur toutes les ventes du mois',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80',
    colors: ['#065483', '#0a7abf'],
    badge: '🔥 Limité',
  },
  {
    id: 'p2',
    title: 'Offre\nInvestisseur',
    subtitle: 'Réduction sur lots multiples',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80',
    colors: ['#B45309', '#EC9107'],
    badge: '⚡ Exclusif',
  },
  {
    id: 'p3',
    title: 'Visite Virtuelle\nGratuite',
    subtitle: 'Pour toute demande en ligne',
    image: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800&q=80',
    colors: ['#1e3a5f', '#2C3E50'],
    badge: '🎁 Offert',
  },
  {
    id: 'p4',
    title: 'Pack Rénovation\nOffert',
    subtitle: 'Pour les maisons anciennes',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    colors: ['#065F46', '#16A34A'],
    badge: '✨ Nouveau',
  },
];

const rentImages = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80',
];

const publishImages = [
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80',
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=400&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80',
];

// ======================== FONCTIONS DE COMPARAISON ========================
const arePropertiesEqual = (o: Property[], n: Property[]) =>
  o.length === n.length && o.every((p, i) => p.id_propriete === n[i]?.id_propriete);
const areAgentsEqual = (o: Agent[], n: Agent[]) =>
  o.length === n.length && o.every((a, i) => a.id_agent === n[i]?.id_agent);
const areBlogsEqual = (o: Blog[], n: Blog[]) =>
  o.length === n.length && o.every((b, i) => b.id_blog === n[i]?.id_blog);

// ======================== MAPPING DES ICONES ========================
const getIconStyle = (iconName: string) => {
  const map: Record<string, { color: string; bg: string }> = {
    home: { color: '#065483', bg: '#e0edf8' },
    'checkmark-circle': { color: '#16a34a', bg: '#dcfce7' },
    pricetag: { color: '#B45309', bg: '#fef3c7' },
    chatbubble: { color: '#7c3aed', bg: '#ede9fe' },
    star: { color: '#EC9107', bg: '#fef3c7' },
    heart: { color: '#e11d48', bg: '#ffe4e6' },
    newspaper: { color: '#0891b2', bg: '#e0f2fe' },
  };
  return map[iconName] || { color: '#475569', bg: '#e2e8f0' };
};

// ======================== COMPOSANT SECTION HEADER ========================
const SectionHeader = ({
  title,
  subtitle,
  onSeeAll,
}: {
  title: string;
  subtitle?: string;
  onSeeAll: () => void;
}) => (
  <View style={styles.sectionHeader}>
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
    <TouchableOpacity style={styles.seeAllBtn} onPress={onSeeAll} activeOpacity={0.7}>
      <Text style={styles.seeAllText}>Voir tout</Text>
      <Ionicons name="arrow-forward" size={14} color="#065483" />
    </TouchableOpacity>
  </View>
);

// ======================== COMPOSANT NOTIFICATION MODAL ========================
const NotificationsModal = ({
  visible,
  onClose,
  notifications,
  onMarkAllRead,
  onPressNotification,
}: {
  visible: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAllRead: () => void;
  onPressNotification: (notif: Notification) => void;
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} activeOpacity={1} />
        <View style={[styles.notifPanel, { height: '80%' }]}>
          {/* Header */}
          <View style={styles.notifPanelHeader}>
            <View>
              <Text style={styles.notifPanelTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <Text style={styles.notifPanelSub}>{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</Text>
              )}
            </View>
            <View style={styles.notifHeaderActions}>
              {unreadCount > 0 && (
                <TouchableOpacity style={styles.markAllBtn} onPress={onMarkAllRead} activeOpacity={0.7}>
                  <Text style={styles.markAllText}>Tout lire</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          {/* List */}
          <FlatList
            data={notifications}
            keyExtractor={(item, index) => (item.id !== '0' ? item.id : index.toString())}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 30 }}
            renderItem={({ item: notif }) => (
              <TouchableOpacity
                style={[styles.notifItem, !notif.read && styles.notifItemUnread]}
                activeOpacity={0.7}
                onPress={() => onPressNotification(notif)}
              >
                {!notif.read && <View style={styles.unreadDot} />}
                <View style={[styles.notifIconBox, { backgroundColor: notif.iconBg }]}>
                  <Ionicons name={notif.icon as any} size={20} color={notif.iconColor} />
                </View>
                <View style={styles.notifContent}>
                  <Text style={[styles.notifTitle, !notif.read && styles.notifTitleUnread]}>
                    {notif.title}
                  </Text>
                  <Text style={styles.notifMessage} numberOfLines={2}>{notif.message}</Text>
                  <Text style={styles.notifTime}>{notif.time}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};

// ======================== ACTION CARD AVEC DÉFILEMENT D'IMAGES ========================
const ActionCardWithSlider = ({
  title,
  description,
  route,
  colors,
  icon,
  images,
  imageOnLeft,
}: {
  title: string;
  description: string;
  route: string;
  colors: [string, string];
  icon: string;
  images: string[];
  imageOnLeft: boolean;
}) => {
  const [currentImg, setCurrentImg] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentImg(prev => (prev + 1) % images.length);
    }, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [images.length]);

  const ImageSide = () => (
    <View style={styles.actionCardImageSide}>
      {images.map((img, i) => (
        <Image
          key={i}
          source={{ uri: img }}
          style={[
            styles.actionCardImage,
            { opacity: i === currentImg ? 1 : 0 },
          ]}
        />
      ))}
      <View style={styles.actionImgDots}>
        {images.map((_, i) => (
          <View
            key={i}
            style={[
              styles.actionImgDot,
              i === currentImg && styles.actionImgDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );

  const ContentSide = () => (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.actionCardContentSide}
    >
      <View style={styles.actionIconWrapper2}>
        <Ionicons name={icon as any} size={24} color="#fff" />
      </View>
      <Text style={styles.actionTitle2}>{title}</Text>
      <Text style={styles.actionDesc2}>{description}</Text>
      <TouchableOpacity
        style={styles.actionChip2}
        onPress={() => router.push(route as any)}
        activeOpacity={0.85}
      >
        <Text style={styles.actionChipText2}>Découvrir</Text>
        <Ionicons name="arrow-forward" size={13} color="#fff" />
      </TouchableOpacity>
    </LinearGradient>
  );

  return (
    <TouchableOpacity
      style={styles.actionCardNew}
      onPress={() => router.push(route as any)}
      activeOpacity={0.93}
    >
      {imageOnLeft ? (
        <>
          <ImageSide />
          <ContentSide />
        </>
      ) : (
        <>
          <ContentSide />
          <ImageSide />
        </>
      )}
    </TouchableOpacity>
  );
};

// ======================== COMPOSANT PRINCIPAL ========================
export default function HomeScreen() {
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [topAgents, setTopAgents] = useState<Agent[]>([]);
  const [latestBlogs, setLatestBlogs] = useState<Blog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const lastFetchTime = useRef<number>(0);
  const CACHE_DURATION = 5 * 60 * 1000;

  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
  const promoFlatListRef = useRef<FlatList>(null);
  const autoScrollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUserScrolling = useRef(false);

  // ── Notifications ──
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showFullMessageModal, setShowFullMessageModal] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Chargement depuis l'API
  const loadNotifications = async () => {
    try {
      const response = await getResource('/notificationsmobile');
      if (response?.data && Array.isArray(response.data)) {
        const apiNotifs = response.data.map((item: any, idx: number) => {
          const iconStyle = getIconStyle(item.icon);
          return {
            id: item.id !== undefined && item.id !== 0 ? String(item.id) : `notif_${idx}`,
            title: item.title,
            message: item.message,
            time: item.temps, // l'API renvoie "temps"
            read: item.lire === 1,
            icon: item.icon,
            iconColor: iconStyle.color,
            iconBg: iconStyle.bg,
          };
        });
        setNotifications(apiNotifs);
      }
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    }
  };

  // Marquage local (pas d'appel API)
  const markAsRead = (notifId: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notifId ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const onPressNotification = (notif: Notification) => {
    if (!notif.read) {
      markAsRead(notif.id);
    }
    setSelectedNotification(notif);
    setShowFullMessageModal(true);
  };

  // ---- DATA LOADING (propriétés, agents, blogs) ----
  const loadHomeData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const now = Date.now();
      if (silent && now - lastFetchTime.current < CACHE_DURATION) return;

      const [propertiesRes, agentsRes, blogsRes] = await Promise.all([
        getResource('/proprietes?featured=true'),
        getResource('/agents?note_min=4'),
        getResource('/blogs-public'),
      ]);

      if (propertiesRes?.data?.data) {
        const n = propertiesRes.data.data;
        setFeaturedProperties(p => (arePropertiesEqual(p, n) ? p : n));
      }
      if (agentsRes?.data?.data) {
        // Les comptes DjamaBizz ne sont jamais mis en avant sur l'accueil :
        // leur identité doit rester invisible dans la vitrine publique.
        const n = filtrerAgentsVisibles<Agent>(agentsRes.data.data);
        setTopAgents(p => (areAgentsEqual(p, n) ? p : n));
      }
      if (blogsRes?.data?.data) {
        const n = blogsRes.data.data;
        setLatestBlogs(p => (areBlogsEqual(p, n) ? p : n));
      }

      lastFetchTime.current = Date.now();
    } catch (e) {
      console.error('Erreur accueil:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // ---- PROMO AUTO-SCROLL ----
  const startAutoScroll = useCallback(() => {
    if (autoScrollInterval.current) clearInterval(autoScrollInterval.current);
    if (realEstatePromotions.length <= 1) return;
    autoScrollInterval.current = setInterval(() => {
      if (isUserScrolling.current) return;
      setCurrentPromoIndex(prev => {
        const next = (prev + 1) % realEstatePromotions.length;
        promoFlatListRef.current?.scrollToOffset({
          offset: next * (PROMO_ITEM_WIDTH + 16),
          animated: true,
        });
        return next;
      });
    }, 3500);
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
      autoScrollInterval.current = null;
    }
  }, []);

  const scrollToPromo = useCallback((index: number) => {
    promoFlatListRef.current?.scrollToOffset({
      offset: index * (PROMO_ITEM_WIDTH + 16),
      animated: true,
    });
    setCurrentPromoIndex(index);
  }, []);

  useEffect(() => {
    startAutoScroll();
    return () => stopAutoScroll();
  }, [startAutoScroll, stopAutoScroll]);

  useEffect(() => {
    loadHomeData(false);
    loadNotifications(); // charger les notifications au montage
  }, [loadHomeData]);

  useFocusEffect(
    useCallback(() => {
      if (isFirstLoad.current) { isFirstLoad.current = false; return; }
      loadHomeData(true);
    }, [loadHomeData])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') loadHomeData(true);
    });
    return () => sub.remove();
  }, [loadHomeData]);

  // ======================== GESTIONNAIRES ========================
  const handleSearch = () => {
    if (searchQuery.trim()) router.push({ pathname: '/property', params: { search: searchQuery.trim() } });
  };

  // ======================== SOUS-COMPOSANTS ========================
  const CategoryCard = ({ item }: { item: typeof propertyCategories[0] }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => router.push({ pathname: '/property', params: { type: item.search } })}
      activeOpacity={0.75}
    >
      <Image source={{ uri: item.image }} style={styles.categoryImage} />
      <View style={styles.categoryOverlay} />
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const PromotionCard = ({ item }: { item: typeof realEstatePromotions[0] }) => (
    <TouchableOpacity
      style={styles.promoCard}
      onPress={() => router.push({ pathname: '/property', params: { promo: 'true' } })}
      activeOpacity={0.92}
    >
      <LinearGradient colors={item.colors as [string, string]} style={StyleSheet.absoluteFillObject} />
      <Image source={{ uri: item.image }} style={styles.promoImage} blurRadius={1} />
      <LinearGradient
        colors={[item.colors[0] + 'ee', item.colors[1] + 'bb']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.promoContent}>
        <View style={styles.promoBadge}>
          <Text style={styles.promoBadgeText}>{item.badge}</Text>
        </View>
        <Text style={styles.promoTitle}>{item.title}</Text>
        <Text style={styles.promoSubtitle}>{item.subtitle}</Text>
        <View style={styles.promoArrow}>
          <Ionicons name="arrow-forward-circle" size={32} color="rgba(255,255,255,0.85)" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const PaginationDots = () => (
    <View style={styles.paginationContainer}>
      {realEstatePromotions.map((_, i) => (
        <TouchableOpacity key={i} onPress={() => scrollToPromo(i)}>
          <View style={[styles.paginationDot, i === currentPromoIndex && styles.paginationDotActive]} />
        </TouchableOpacity>
      ))}
    </View>
  );

  const PropertyCard = ({ property }: { property: Property }) => (
    <TouchableOpacity
      style={styles.propertyCard}
      onPress={() => router.push(`/property/${property.id_propriete}`)}
      activeOpacity={0.9}
    >
      <Image
        source={
          property.images?.[0]
            ? { uri: `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${property.images[0].url}` }
            : require('../../assets/images/default-property.jpg')
        }
        style={styles.propertyImage}
      />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={styles.propertyGradient} />
      <View style={[styles.propertyBadge, getStatutIndisponible(property.statut) && { backgroundColor: getStatutIndisponible(property.statut)!.color }]}>
        <Text style={styles.propertyBadgeText}>
          {getStatutIndisponible(property.statut)?.label.toUpperCase()
            ?? (property.operation === 'vente' ? '🏷 VENTE' : '🔑 LOCATION')}
        </Text>
      </View>
      <View style={styles.propertyInfo}>
        <Text style={styles.propertyPrice}>
          {new Intl.NumberFormat('fr-FR').format(property.prix)}{' '}
          <Text style={styles.propertyDevise}>{property.devise}</Text>
        </Text>
        <Text style={styles.propertyTitle} numberOfLines={1}>{property.titre}</Text>
        <View style={styles.propertyMeta}>
          <View style={styles.propertyMetaItem}>
            <Ionicons name="location-sharp" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.propertyMetaText}>{property.ville}</Text>
          </View>
          {property.surface > 0 && (
            <View style={styles.propertyMetaItem}>
              <Ionicons name="resize" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.propertyMetaText}>{property.surface}m²</Text>
            </View>
          )}
          {property.chambres > 0 && (
            <View style={styles.propertyMetaItem}>
              <Ionicons name="bed" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.propertyMetaText}>{property.chambres} ch.</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const AgentCard = ({ agent }: { agent: Agent }) => (
    <TouchableOpacity
      style={styles.agentCard}
      onPress={() => router.push(`/agent/${agent.id_agent}`)}
      activeOpacity={0.9}
    >
      <View style={styles.agentImageWrapper}>
        <Image
          source={
            agent.utilisateur?.photo_profil
              ? { uri: `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${agent.utilisateur.photo_profil}` }
              : require('../../assets/images/default-agent.jpg')
          }
          style={styles.agentImage}
        />
        <View style={styles.agentBadge}>
          <Ionicons name="checkmark-circle" size={18} color="#065483" />
        </View>
      </View>
      <Text style={styles.agentName} numberOfLines={1}>
        {agent.utilisateur.prenom} {agent.utilisateur.nom}
      </Text>
      <Text style={styles.agentTitle} numberOfLines={1}>{agent.titre || 'Agent Immobilier'}</Text>
      <View style={styles.agentRating}>
        {[1, 2, 3, 4, 5].map(s => (
          <Ionicons
            key={s}
            name={s <= Math.round(agent.note_moyenne || 5) ? 'star' : 'star-outline'}
            size={12}
            color="#EC9107"
          />
        ))}
        <Text style={styles.agentRatingText}>{(agent.note_moyenne || 0)}</Text>
      </View>
    </TouchableOpacity>
  );

  const BlogCard = ({ blog }: { blog: Blog }) => (
    <TouchableOpacity
      style={styles.blogCard}
      onPress={() => router.push(`/blog/${blog.slug}`)}
      activeOpacity={0.9}
    >
      <Image
        source={
          blog.image_principale
            ? { uri: `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${blog.image_principale}` }
            : require('../../assets/images/default-blog.jpg')
        }
        style={styles.blogImage}
      />
      <View style={styles.blogContent}>
        <View style={styles.blogCategoryPill}>
          <Text style={styles.blogCategoryText}>{blog.categorie}</Text>
        </View>
        <Text style={styles.blogTitle} numberOfLines={2}>{blog.titre}</Text>
        <View style={styles.blogFooter}>
          <Ionicons name="time-outline" size={12} color="#94a3b8" />
          <Text style={styles.blogReadTime}>{blog.temps_lecture} min de lecture</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // ======================== RENDU PRINCIPAL ========================
  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <ImageBackground
          source={require('../../assets/images/bg1.jpg')}
          style={styles.heroSection}
          imageStyle={styles.heroImage}
        >
          <LinearGradient
            colors={['rgba(6,84,131,0.72)', 'rgba(20,20,40,0.88)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroOverlay}
          >
            <View style={styles.heroTopRow}>
              <View>
                <Text style={styles.heroTitle}>Trouvez votre{'\n'}bien en Guinée</Text>
              </View>

              {/* Bouton notification avec badge */}
              <TouchableOpacity
                style={styles.heroNotifBtn}
                onPress={() => setShowNotifications(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="notifications-outline" size={22} color="#fff" />
                {unreadCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.heroSubtitle}>
              Shopimmobilier, la référence immobilière en Guinée
            </Text>

            <View style={styles.searchWrapper}>
              <Ionicons name="search-outline" size={20} color="#065483" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Ville, quartier, référence…"
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
                <Text style={styles.searchBtnText}>Chercher</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* ── Catégories ── */}
        <View style={styles.section2}>
          <SectionHeader
            title="Parcourir par type"
            subtitle="Trouvez selon vos besoins"
            onSeeAll={() => router.push('/property')}
          />
          <FlatList
            horizontal
            data={propertyCategories}
            renderItem={({ item }) => <CategoryCard item={item} />}
            keyExtractor={i => i.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
          />
        </View>

        {/* ── Promotions ── */}
        <View style={styles.section}>
          <SectionHeader
            title="Offres & Promotions"
            subtitle="Profitez avant expiration"
            onSeeAll={() => router.push({ pathname: '/property', params: { promo: 'true' } })}
          />
          <FlatList
            ref={promoFlatListRef}
            horizontal
            data={realEstatePromotions}
            renderItem={({ item }) => <PromotionCard item={item} />}
            keyExtractor={i => i.id}
            showsHorizontalScrollIndicator={false}
            snapToInterval={PROMO_ITEM_WIDTH + 16}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={styles.promoList}
            getItemLayout={(_, index) => ({
              length: PROMO_ITEM_WIDTH + 16,
              offset: (PROMO_ITEM_WIDTH + 16) * index,
              index,
            })}
            onScrollBeginDrag={() => { isUserScrolling.current = true; }}
            onMomentumScrollEnd={e => {
              const offset = e.nativeEvent.contentOffset.x;
              const idx = Math.round(offset / (PROMO_ITEM_WIDTH + 16));
              setCurrentPromoIndex(Math.max(0, Math.min(idx, realEstatePromotions.length - 1)));
              isUserScrolling.current = false;
            }}
          />
          <PaginationDots />
        </View>

        {loading && featuredProperties.length === 0 ?
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#065483" />
            <Text style={styles.loaderText}>Chargement en cours…</Text>
          </View> :
          <View style={styles.section2}>
            <SectionHeader
              title="Propriétés en vedette"
              subtitle="Sélection du moment"
              onSeeAll={() => router.push('/property')}
            />
            <FlatList
              horizontal
              data={featuredProperties}
              renderItem={({ item }) => <PropertyCard property={item} />}
              keyExtractor={i => i.id_propriete.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardList}
            />
          </View>
        }

        {/* ── Meilleurs agents ── */}
        {/* La section entière disparaît s'il ne reste aucun agent affichable
            après le retrait des comptes DjamaBizz (évite un bloc vide). */}
        {topAgents.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title="Nos meilleurs agents"
            subtitle="Experts certifiés & disponibles"
            onSeeAll={() => router.push('/agent')}
          />
          <FlatList
            horizontal
            data={topAgents}
            renderItem={({ item }) => <AgentCard agent={item} />}
            keyExtractor={i => i.id_agent.toString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardList}
          />
        </View>
        )}

        {/* ── Blog ── */}
        <View style={styles.section}>
          <SectionHeader
            title="Derniers articles"
            subtitle="Conseils & tendances immobilier"
            onSeeAll={() => router.push('/blog')}
          />
          <FlatList
            horizontal
            data={latestBlogs}
            renderItem={({ item }) => <BlogCard blog={item} />}
            keyExtractor={i => i.id_blog.toString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardList}
          />
        </View>

        {/* ── Action Cards (nouvelle version) ── */}
        <View style={styles.actionSection}>
          <Text style={styles.actionSectionTitle}>Que souhaitez-vous faire ?</Text>

          <ActionCardWithSlider
            title="Je cherche à louer"
            description="Trouvez la location idéale parmi nos offres"
            route="/demandeurs"
            colors={['#065483', '#0a7abf']}
            icon="home-outline"
            images={rentImages}
            imageOnLeft={true}
          />

          <ActionCardWithSlider
            title="Je publie mon bien"
            description="Mettez votre propriété en avant rapidement"
            route="/publierbien"
            colors={['#B45309', '#EC9107']}
            icon="add-circle-outline"
            images={publishImages}
            imageOnLeft={false}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Modal Notifications ── */}
      <NotificationsModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
        onPressNotification={onPressNotification}
      />

      {/* ── Modal pour lire toute la notification ── */}
      <Modal
        visible={showFullMessageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFullMessageModal(false)}
      >
        <View style={styles.fullMessageOverlay}>
          <View style={styles.fullMessageContainer}>
            <View style={styles.fullMessageHeader}>
              <Text style={styles.fullMessageTitle}>
                {selectedNotification?.title}
              </Text>
              <TouchableOpacity onPress={() => setShowFullMessageModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.fullMessageBody}>
              <Text style={styles.fullMessageText}>
                {selectedNotification?.message}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.fullMessageCloseBtn}
              onPress={() => setShowFullMessageModal(false)}
            >
              <Text style={styles.fullMessageCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ======================== STYLES ========================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    gap: 14,
    paddingVertical: 40,
  },
  loaderText: {
    fontSize: 15,
    color: '#065483',
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ── Hero ──
  heroSection: {
    width: '100%',
    minHeight: 280,
  },
  heroImage: {
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  heroOverlay: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  heroNotifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e11d48',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 22,
    lineHeight: 20,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
  },
  searchBtn: {
    backgroundColor: '#065483',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Section ──
  section: {
    marginTop: 10,
  },
  section2: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '500',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0edf8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  seeAllText: {
    color: '#065483',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Categories ──
  categoryList: {
    paddingLeft: 20,
    paddingRight: 8,
    paddingBottom: 15,
    gap: 12,
  },
  categoryCard: {
    width: 88,
    height: 100,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6,84,131,0.38)',
  },
  categoryName: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // ── Promos ──
  promoList: {
    paddingLeft: 20,
    paddingRight: 4,
    paddingBottom: 28,
  },
  promoCard: {
    width: PROMO_ITEM_WIDTH,
    height: 150,
    borderRadius: 26,
    overflow: 'hidden',
    marginRight: 16,
    elevation: 10,
    shadowColor: '#065483',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
  },
  promoImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  promoContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  promoBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  promoBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  promoTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  promoSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    fontWeight: '500',
  },
  promoArrow: {
    position: 'absolute',
    bottom: 18,
    right: 20,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    gap: 6,
  },
  paginationDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
    marginTop: -20,
    marginBottom: -40,
  },
  paginationDotActive: {
    width: 22,
    backgroundColor: '#065483',
    borderRadius: 4,
  },

  // ── Property Card ──
  cardList: {
    paddingLeft: 20,
    paddingRight: 8,
    paddingBottom: 15,
    gap: 4,
  },
  propertyCard: {
    width: width * 0.62,
    height: 240,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 14,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
  },
  propertyImage: {
    width: '100%',
    height: '100%',
  },
  propertyGradient: {
    ...StyleSheet.absoluteFillObject,
    top: '40%',
  },
  propertyBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(6,84,131,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  propertyBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  propertyInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
  },
  propertyPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  propertyDevise: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  propertyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    marginBottom: 6,
  },
  propertyMeta: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  propertyMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  propertyMetaText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },

  // ── Agent Card ──
  agentCard: {
    width: width * 0.38,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    marginRight: 14,
    padding: 16,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  agentImageWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  agentImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#e0edf8',
  },
  agentBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 1,
  },
  agentName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  agentTitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginVertical: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  agentRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  agentRatingText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginLeft: 4,
  },

  // ── Blog Card ──
  blogCard: {
    width: width * 0.62,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    marginRight: 14,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  blogImage: {
    width: '100%',
    height: 130,
  },
  blogContent: {
    padding: 14,
  },
  blogCategoryPill: {
    backgroundColor: '#e0edf8',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  blogCategoryText: {
    fontSize: 10,
    color: '#065483',
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  blogTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 20,
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  blogFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  blogReadTime: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },

  // ── Action Section ──
  actionSection: {
    paddingHorizontal: 20,
    marginTop: 28,
    gap: 14,
  },
  actionSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  actionCardNew: {
    height: 160,
    borderRadius: 24,
    overflow: 'hidden',
    flexDirection: 'row',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    marginBottom: 2,
  },
  actionCardImageSide: {
    flex: 1,
    position: 'relative',
  },
  actionCardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  actionImgDots: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  actionImgDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  actionImgDotActive: {
    width: 14,
    backgroundColor: '#fff',
  },
  actionCardContentSide: {
    flex: 1,
    padding: 18,
    justifyContent: 'center',
    gap: 4,
  },
  actionIconWrapper2: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionTitle2: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  actionDesc2: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    lineHeight: 15,
  },
  actionChip2: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionChipText2: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Notifications Modal ──
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  notifPanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    flex: 1,
    paddingBottom: 20,
  },
  notifPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  notifPanelTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  notifPanelSub: {
    fontSize: 12,
    color: '#065483',
    fontWeight: '600',
    marginTop: 2,
  },
  notifHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  markAllBtn: {
    backgroundColor: '#e0edf8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  markAllText: {
    fontSize: 12,
    color: '#065483',
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    position: 'relative',
  },
  notifItemUnread: {
    backgroundColor: '#f8fbff',
  },
  unreadDot: {
    position: 'absolute',
    left: 8,
    top: 22,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#065483',
  },
  notifIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: -0.1,
    marginBottom: 3,
  },
  notifTitleUnread: {
    color: '#0f172a',
    fontWeight: '700',
  },
  notifMessage: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 5,
  },
  notifTime: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },

  // ── Modal lecture complète ──
  fullMessageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullMessageContainer: {
    backgroundColor: '#fff',
    borderRadius: 28,
    width: '90%',
    maxHeight: '70%',
    padding: 20,
  },
  fullMessageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  fullMessageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    marginRight: 12,
  },
  fullMessageBody: {
    maxHeight: 400,
  },
  fullMessageText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
  },
  fullMessageCloseBtn: {
    marginTop: 20,
    backgroundColor: '#065483',
    borderRadius: 40,
    paddingVertical: 12,
    alignItems: 'center',
  },
  fullMessageCloseText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
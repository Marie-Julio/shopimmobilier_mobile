import { useFormulaireClavier } from '@/hooks/useFormulaireClavier';
import { getResource, postResource } from '@/services/api';
import { estAnnonceDjamabizz, LIBELLE_AGENT_MASQUE } from '@/utils/djamabizz';
import { getStatutIndisponible } from '@/utils/statutPropriete';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import RenderHTML from 'react-native-render-html';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// THEME — exact copy from PropertiesScreen
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

const OPERATION_COLOR: Record<string, string> = {
  vente:                '#EF4444',
  location:             '#065483',
  location_saisonniere: '#F59E0B',
};

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
    whatsapp?: string;
    email?: string;
    utilisateur?: { nom?: string; prenom?: string; photo_profil?: string; role?: string };
    // Drapeau calculé renvoyé par l'API (App\Models\Agent::est_djamabizz).
    est_djamabizz?: boolean;
    type_agent?: string;
    titre?: string;
    note_moyenne?: number;
    avis_count?: number;
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
  annee_construction?: number;
  etage?: number;
  etages_immeuble?: number;
  qualite_score?: number;
  latitude?: number;
  longitude?: number;
  views?: number;
  statut?: string;
  reference?: string;
}

interface ContactForm {
  nom: string;
  email: string;
  telephone: string;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const formatPrice = (price?: number, devise = 'GNF') => {
  if (!price) return 'N/A';
  return new Intl.NumberFormat('fr-FR').format(price) + ' ' + devise;
};

const getTypeLabel = (t: string) =>
  ({ appartement: 'Appartement', maison: 'Maison', terrain: 'Terrain',
     commerce: 'Commerce', bureau: 'Bureau', entrepot: 'Entrepôt' }[t] ?? t);

const getOperationLabel = (op: string) =>
  ({ vente: 'À vendre', location: 'À louer',
     location_saisonniere: 'Location saisonnière' }[op] ?? op);

const getEtatLabel = (e: string) =>
  ({ neuf: 'Neuf', excellent: 'Excellent', bon: 'Bon état',
     renovation: 'À rénover', a_renover: 'À rénover' }[e] ?? e);

const relativeTime = (dateStr: string) => {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d === 0) return "Aujourd'hui";
  if (d === 1) return 'Hier';
  if (d < 7)   return `il y a ${d}j`;
  if (d < 30)  return `il y a ${Math.floor(d / 7)}sem`;
  return `il y a ${Math.floor(d / 30)}mois`;
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Section header — same as PropertiesScreen */
const SectionHeader = ({ title, icon }: { title: string; icon?: keyof typeof Ionicons.glyphMap }) => (
  <View style={ss.sectionHeader}>
    <View style={ss.sectionBar} />
    {icon && <Ionicons name={icon} size={16} color={T.secondary} style={{ marginRight: 6 }} />}
    <Text style={ss.sectionTitle}>{title}</Text>
  </View>
);

/** Amenity pill — same as PropertyCard's amenityPill */
const AmenityPill = ({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) => (
  <View style={ss.amenityPill}>
    <Ionicons name={icon} size={13} color={T.primary} />
    <Text style={ss.amenityText}>{label}</Text>
  </View>
);

/** Stat chip — mirrors PropertyCard stats row */
const StatChip = ({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) => (
  <View style={ss.statChip}>
    <View style={ss.statIconWrap}>
      <Ionicons name={icon} size={18} color={T.primary} />
    </View>
    <Text style={ss.statValue}>{value}</Text>
    <Text style={ss.statLabel}>{label}</Text>
  </View>
);

/** Quality dots — same as PropertiesScreen */
const QualityDots = ({ score }: { score: number }) => {
  const level = score >= 80 ? 3 : score >= 60 ? 2 : score >= 40 ? 1 : 0;
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <View
          key={i}
          style={[ss.dot, { backgroundColor: i < level ? T.success : T.border }]}
        />
      ))}
      <Text style={ss.dotLabel}>{score}%</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function PropertyDetailScreen() {
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading]                     = useState(true);
  const [property, setProperty]                   = useState<Property | null>(null);
  const [mainImage, setMainImage]                 = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showMoreDetails, setShowMoreDetails]     = useState(false);
  const [isSpeaking, setIsSpeaking]               = useState(false);
  const [selectedLanguage, setSelectedLanguage]   = useState('fr-FR');
  const [sending, setSending]                     = useState(false);
  const [contactForm, setContactForm]             = useState<ContactForm>(
    { nom: '', email: '', telephone: '', message: '' }
  );

  // Confort de saisie : le champ visé remonte au-dessus du clavier,
  // « Entrée » passe au champ suivant, et le dernier champ referme le clavier.
  const clavier = useFormulaireClavier(['nom', 'email', 'telephone', 'message']);

  /**
   * Message WhatsApp pré-rempli : l'agent voit immédiatement de quelle
   * annonce il s'agit, sans avoir à demander.
   */
  const messageWhatsApp = () => {
    if (!property) return '';
    const lieu = [property.adresse, property.quartier, property.ville]
      .filter(Boolean)
      .join(', ');
    return [
      'Bonjour,',
      '',
      'Je suis intéressé(e) par cette annonce vue sur Shopimmobilier :',
      `« ${property.titre} »`,
      `Référence : ${property.reference ?? property.id_propriete}`,
      `Prix : ${formatPrice(property.prix, property.devise)}`,
      // `null` = ligne à retirer. Une chaîne vide reste une ligne vide
      // volontaire : filtrer sur Boolean les supprimait aussi et le message
      // arrivait en un seul bloc compact.
      lieu ? `Localisation : ${lieu}` : null,
      `Lien : https://shopimmobilier.com/property/${property.id_propriete}`,
      '',
      "Pouvez-vous me donner plus d'informations ?",
    ].filter((ligne) => ligne !== null).join('\n');
  };

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const languages = [
    { code: 'fr-FR', flag: '🇫🇷', name: 'Français' },
    { code: 'en-US', flag: '🇺🇸', name: 'English'  },
    { code: 'ar-SA', flag: '🇸🇦', name: 'العربية'  },
  ];

  useEffect(() => {
    fetchProperty();
    return () => { if (isSpeaking) Speech.stop(); };
  }, [id]);

  const fetchProperty = async () => {
    try {
      setLoading(true);
      const res = await getResource(`/proprietes-public/${id}`);
      if (res?.data) {
        setProperty(res.data);
        if (res.data.images?.length > 0)
          setMainImage(getImageUrl(res.data.images[0]));
        await postResource(`/proprietes/${id}/increment-view`, {});

        Animated.parallel([
          Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start();
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de charger la propriété');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (img: { url: string }) =>
    `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${img.url}`;

  const handlePrevImage = () => {
    if (!property?.images) return;
    const i = (currentImageIndex - 1 + property.images.length) % property.images.length;
    setMainImage(getImageUrl(property.images[i]));
    setCurrentImageIndex(i);
  };

  const handleNextImage = () => {
    if (!property?.images) return;
    const i = (currentImageIndex + 1) % property.images.length;
    setMainImage(getImageUrl(property.images[i]));
    setCurrentImageIndex(i);
  };

  const handleShare = async () => {
    await Share.share({
      message: `${property?.titre}\n${formatPrice(property?.prix, property?.devise)}\n\nSur Shopimmobilier https://shopimmobilier.com/property/${property?.id_propriete}`,
    });
  };

  const readPropertyInfo = (): void => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }

    if (!property) return;

    const text =
      `${property.titre}. ` +
      `${getTypeLabel(property.type)}, ${getOperationLabel(property.operation)}. ` +
      `Prix: ${formatPrice(property.prix, property.devise)}. ` +
      `Surface: ${property.surface || 'non précisée'} mètres carrés. ` +
      (property.chambres     ? `${property.chambres} chambre${property.chambres > 1 ? 's' : ''}. ` : '') +
      (property.salles_de_bain ? `${property.salles_de_bain} salle${property.salles_de_bain > 1 ? 's' : ''} de bain. ` : '') +
      `Localisation: ${property.ville}${property.quartier ? ', ' + property.quartier : ''}. `;

    Speech.stop();

    Speech.speak(text, {
      language: selectedLanguage,
      pitch: 1.0,
      rate: 0.85,
      onStart: () => setIsSpeaking(true),
      onDone:  () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const handleScheduleVisit = async () => {
    if (!contactForm.nom || !contactForm.email || !contactForm.message)
      return Alert.alert('Erreur', 'Veuillez remplir les champs obligatoires');
    try {
      setSending(true);
      const res = await postResource('/contacts', {
        ...contactForm, sujet: `Visite de ${property?.titre}`,
        id_propriete: id, type: 'visite',
      });
      if (res.status === 201) {
        Alert.alert('Succès', 'Votre demande a été envoyée');
        setContactForm({ nom: '', email: '', telephone: '', message: '' });
      }
    } catch { Alert.alert('Erreur', "Impossible d'envoyer"); }
    finally { setSending(false); }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={ss.loaderScreen}>
        <ActivityIndicator size="large" color={T.primary} />
        <Text style={ss.loaderText}>Chargement…</Text>
      </View>
    );
  }

  if (!property) return null;

  const statutIndispo = getStatutIndisponible(property.statut);
  const opColor = statutIndispo?.color ?? OPERATION_COLOR[property.operation] ?? T.primary;

  // ── Annonce publiée par un compte DjamaBizz ────────────────────────────
  // L'identité et les coordonnées personnelles du jeune mandataire ne sont
  // jamais exposées : le bloc « Agent » est remplacé par un bloc neutre au
  // nom de l'agence, et la mise en relation passe obligatoirement par le
  // formulaire « Demander une visite » situé juste en dessous.
  const agentMasque = estAnnonceDjamabizz(property);

  // Amenities
  const interiorAmenities: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string }> = [];
  const exteriorAmenities: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string }> = [];
  const serviceAmenities:  Array<{ icon: keyof typeof Ionicons.glyphMap; label: string }> = [];

  if (property.meuble)           interiorAmenities.push({ icon: 'bed-outline',             label: 'Meublé'             });
  if (property.climatisation)    interiorAmenities.push({ icon: 'snow-outline',             label: 'Climatisation'      });
  if (property.parking)          exteriorAmenities.push({ icon: 'car-outline',              label: 'Parking'            });
  if (property.jardin)           exteriorAmenities.push({ icon: 'leaf-outline',             label: 'Jardin'             });
  if (property.piscine)          exteriorAmenities.push({ icon: 'water-outline',            label: 'Piscine'            });
  if (property.ascenseur)        exteriorAmenities.push({ icon: 'arrow-up-outline',         label: 'Ascenseur'          });
  if (property.forage)           serviceAmenities.push({ icon: 'construct-outline',         label: 'Forage'             });
  if (property.groupe_electrogene) serviceAmenities.push({ icon: 'flash-outline',           label: 'Groupe électrogène' });
  if (property.electricite)      serviceAmenities.push({ icon: 'bulb-outline',              label: property.electricite });
  if (property.niveau_securite)  serviceAmenities.push({ icon: 'shield-checkmark-outline',  label: `Sécurité: ${property.niveau_securite}` });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={ss.root}>
      <ScrollView
        {...clavier.propsScrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={ss.scroll}
      >

        {/* ── HERO IMAGE ── */}
        <View style={ss.galleryWrap}>
          <Image
            source={
              mainImage
                ? { uri: mainImage }
                : require('../../../assets/images/default-property.jpg')
            }
            style={ss.heroImg}
          />

          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.72)']}
            style={ss.heroGradient}
          />

          {/* Top controls */}
          <View style={ss.heroTopRow}>
            <TouchableOpacity style={ss.heroIconBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={ss.heroIconBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Prev / Next */}
          {property.images?.length > 1 && (
            <>
              <TouchableOpacity style={[ss.navBtn, ss.navBtnLeft]}  onPress={handlePrevImage}>
                <Ionicons name="chevron-back"    size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[ss.navBtn, ss.navBtnRight]} onPress={handleNextImage}>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </>
          )}

          {/* Bottom-left: operation badge */}
          <View style={[ss.opBadge, { backgroundColor: opColor }]}>
            <Text style={ss.opBadgeText}>
              {statutIndispo
                ? `${getOperationLabel(property.operation)} · ${statutIndispo.label}`
                : getOperationLabel(property.operation)}
            </Text>
          </View>

          {/* Bottom-right: counter */}
          {property.images?.length > 1 && (
            <View style={ss.imgCounter}>
              <Text style={ss.imgCounterText}>
                {currentImageIndex + 1}/{property.images.length}
              </Text>
            </View>
          )}

          {/* Featured star */}
          {property.featured && (
            <View style={ss.featuredBadge}>
              <Ionicons name="star" size={11} color="#fff" />
              <Text style={ss.featuredText}>En vedette</Text>
            </View>
          )}
        </View>

        {/* ── THUMBNAILS ── */}
        {property.images?.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={ss.thumbRow}
          >
            {property.images.map((img, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => { setMainImage(getImageUrl(img)); setCurrentImageIndex(i); }}
                style={[ss.thumb, i === currentImageIndex && ss.thumbActive]}
              >
                <Image source={{ uri: getImageUrl(img) }} style={ss.thumbImg} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── CARD: PRICE + TITLE ── */}
        <Animated.View style={[ss.infoCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Price */}
          <Text style={ss.price}>{formatPrice(property.prix, property.devise)}</Text>
          <Text style={ss.title}>{property.titre}</Text>

          {/* Location */}
          <View style={ss.locationRow}>
            <Ionicons name="location-sharp" size={14} color={T.secondary} />
            <Text style={ss.locationText}>
              {property.adresse}, {property.ville}
              {property.quartier ? ` · ${property.quartier}` : ''}
            </Text>
          </View>

          {/* Date + views */}
          <View style={ss.metaRow}>
            <View style={ss.metaPill}>
              <Ionicons name="time-outline" size={12} color={T.muted} />
              <Text style={ss.metaText}>{relativeTime(property.date_publication)}</Text>
            </View>
            {property.views !== undefined && (
              <View style={ss.metaPill}>
                <Ionicons name="eye-outline" size={12} color={T.muted} />
                <Text style={ss.metaText}>{property.views} vues</Text>
              </View>
            )}
            {property.etat && (
              <View style={[ss.metaPill, { backgroundColor: T.accent, borderColor: T.primary + '30' }]}>
                <Text style={[ss.metaText, { color: T.primary, fontWeight: '700' }]}>
                  {getEtatLabel(property.etat)}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── CARD: STATS ── */}
        {/* Cette carte s'affichait VIDE quand le bien n'a ni surface, ni
            chambres, ni salles de bain, ni année, ni score qualité
            (cas fréquent des terrains). On ne l'affiche plus dans ce cas. */}
        {(property.surface > 0 ||
          property.chambres > 0 ||
          property.salles_de_bain > 0 ||
          !!property.annee_construction ||
          property.qualite_score !== undefined) && (
        <View style={ss.card}>
          <View style={ss.statsRow}>
            {property.surface > 0 && (
              <StatChip icon="resize"        value={`${property.surface}`} label="m²"      />
            )}
            {property.chambres > 0 && (
              <StatChip icon="bed"           value={`${property.chambres}`} label="ch."    />
            )}
            {property.salles_de_bain > 0 && (
              <StatChip icon="water"         value={`${property.salles_de_bain}`} label="sdb" />
            )}
            {property.annee_construction && (
              <StatChip icon="calendar"      value={`${property.annee_construction}`} label="année" />
            )}
          </View>

          {/* Quality score */}
          {property.qualite_score !== undefined && (
            <View style={ss.qualityRow}>
              <Text style={ss.qualityLabel}>Qualité</Text>
              <QualityDots score={property.qualite_score} />
            </View>
          )}
        </View>
        )}

        {/* ── CARD: DESCRIPTION ── */}
        <View style={ss.card}>
          <SectionHeader title="Description" />
          <RenderHTML
            contentWidth={width - 64}
            source={{ html: property.description }}
            tagsStyles={{
              p:  { fontSize: 14, color: T.sub, lineHeight: 22, marginBottom: 6 },
              h1: { fontSize: 18, fontWeight: '700', color: T.text },
              h2: { fontSize: 16, fontWeight: '700', color: T.text },
            }}
          />
        </View>

        {/* ── CARD: ÉQUIPEMENTS ── */}
        {(interiorAmenities.length + exteriorAmenities.length + serviceAmenities.length) > 0 && (
          <View style={ss.card}>
            <SectionHeader title="Équipements" />

            {interiorAmenities.length > 0 && (
              <>
                <Text style={ss.amenityGroupLabel}>Intérieur</Text>
                <View style={ss.amenityGrid}>
                  {interiorAmenities.map((a, i) => <AmenityPill key={i} {...a} />)}
                </View>
              </>
            )}
            {exteriorAmenities.length > 0 && (
              <>
                <Text style={[ss.amenityGroupLabel, { marginTop: 12 }]}>Extérieur</Text>
                <View style={ss.amenityGrid}>
                  {exteriorAmenities.map((a, i) => <AmenityPill key={i} {...a} />)}
                </View>
              </>
            )}
            {serviceAmenities.length > 0 && (
              <>
                <Text style={[ss.amenityGroupLabel, { marginTop: 12 }]}>Services</Text>
                <View style={ss.amenityGrid}>
                  {serviceAmenities.map((a, i) => <AmenityPill key={i} {...a} />)}
                </View>
              </>
            )}
          </View>
        )}

        {/* ── CARD: LECTEUR VOCAL ── */}
        <View style={ss.card}>
          <SectionHeader title="Écouter la description" icon="volume-high-outline" />
          <View style={ss.langRow}>
            {languages.map(l => (
              <TouchableOpacity
                key={l.code}
                style={[ss.langBtn, selectedLanguage === l.code && ss.langBtnOn]}
                onPress={() => setSelectedLanguage(l.code)}
              >
                <Text style={ss.langFlag}>{l.flag}</Text>
                <Text style={[ss.langName, selectedLanguage === l.code && ss.langNameOn]}>
                  {l.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[ss.speechBtn, isSpeaking && ss.speechBtnActive]}
            onPress={readPropertyInfo}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={isSpeaking ? [T.danger, '#FF8080'] : [T.primary, '#0a80c4']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={ss.speechGradient}
            >
              <Ionicons
                name={isSpeaking ? 'stop-circle' : 'play-circle'}
                size={22}
                color="#fff"
              />
              <Text style={ss.speechBtnText}>
                {isSpeaking ? 'Arrêter' : `Lire en ${languages.find(l => l.code === selectedLanguage)?.name}`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── CARD: PUBLIÉ PAR L'AGENCE (annonce DjamaBizz) ── */}
        {property.agent && agentMasque && (
          <View style={ss.card}>
            <SectionHeader title="Publié par" />

            <View style={ss.agentHeader}>
              <Image
                source={require('../../../assets/images/default-agent.jpg')}
                style={ss.agentAvatar}
              />
              <View style={{ flex: 1, marginTop: -20 }}>
                <Text style={ss.agentName}>{LIBELLE_AGENT_MASQUE}</Text>
                <Text style={ss.agentTitle}>Annonce gérée par l'agence</Text>
              </View>
            </View>

            <View style={ss.masqueNotice}>
              <Ionicons name="shield-checkmark-outline" size={16} color={T.primary} />
              <Text style={ss.masqueNoticeText}>
                Pour visiter ce bien ou obtenir plus d'informations, utilisez le
                formulaire ci-dessous : un conseiller vous recontacte.
              </Text>
            </View>
          </View>
        )}

        {/* ── CARD: AGENT ── */}
        {property.agent && !agentMasque && (
          <View style={ss.card}>
            <SectionHeader title="Agent" />

            <View style={ss.agentHeader}>
              <Image
                source={
                  property.agent.utilisateur?.photo_profil
                    ? { uri: `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${property.agent.utilisateur.photo_profil}` }
                    : require('../../../assets/images/default-agent.jpg')
                }
                style={ss.agentAvatar}
              />
              <View style={{ flex: 1, marginTop: -20, }}>
                <Text style={ss.agentName}>
                  {property.agent.utilisateur?.prenom} {property.agent.utilisateur?.nom}
                </Text>
                <Text style={ss.agentTitle}>{property.agent.titre ?? 'Agent Immobilier'}</Text>
                {property.agent.note_moyenne !== undefined && (
                  <View style={ss.ratingRow}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Ionicons
                        key={s}
                        name={s <= (property.agent?.note_moyenne ?? 0) ? 'star' : 'star-outline'}
                        size={13}
                        color={T.secondary}
                      />
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Agent action buttons */}
            <View style={ss.agentActions}>
              {property.agent.telephone_bureau && (
                <TouchableOpacity
                  style={[ss.agentBtn, { backgroundColor: T.primary }]}
                  onPress={() => {
                    Linking.openURL(`tel:${property.agent!.telephone_bureau}`);
                    postResource(`/proprietes/${id}/increment-call`, {});
                  }}
                >
                  <Ionicons name="call" size={16} color="#fff" />
                  <Text style={ss.agentBtnText}>Appeler</Text>
                </TouchableOpacity>
              )}
              {property.agent.whatsapp && (
                <TouchableOpacity
                  style={[ss.agentBtn, { backgroundColor: '#25D366' }]}
                  onPress={() => {
                    const numero = property.agent!.whatsapp!.replace(/\D/g, '');
                    Linking.openURL(
                      `https://wa.me/${numero}?text=${encodeURIComponent(messageWhatsApp())}`
                    );
                    postResource(`/proprietes/${id}/increment-whatsapp`, {});
                  }}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                  <Text style={ss.agentBtnText}>WhatsApp</Text>
                </TouchableOpacity>
              )}
              {property.agent.email && (
                <TouchableOpacity
                  style={[ss.agentBtn, { backgroundColor: T.secondary }]}
                  onPress={() => Linking.openURL(`mailto:${property.agent!.email}`)}
                >
                  <Ionicons name="mail" size={16} color="#fff" />
                  <Text style={ss.agentBtnText}>Email</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── CARD: FORMULAIRE VISITE ── */}
        <View style={ss.card}>
          <SectionHeader title="Demander une visite" />

          {[
            { key: 'nom',       placeholder: 'Votre nom *',          keyboard: 'default'       as const },
            { key: 'email',     placeholder: 'Votre email *',         keyboard: 'email-address' as const },
            { key: 'telephone', placeholder: 'Votre téléphone',       keyboard: 'phone-pad'     as const },
          ].map(f => (
            <TextInput
              key={f.key}
              {...clavier.champ(f.key as any, { keyboardType: f.keyboard })}
              style={ss.input}
              placeholder={f.placeholder}
              placeholderTextColor={T.muted}
              value={(contactForm as any)[f.key]}
              onChangeText={v => setContactForm(prev => ({ ...prev, [f.key]: v }))}
            />
          ))}

          <TextInput
            {...clavier.champ('message', { multiligne: true })}
            style={[ss.input, ss.textArea]}
            placeholder="Message *"
            placeholderTextColor={T.muted}
            numberOfLines={4}
            value={contactForm.message}
            onChangeText={v => setContactForm(prev => ({ ...prev, message: v }))}
          />

          <TouchableOpacity
            style={ss.submitBtn}
            onPress={handleScheduleVisit}
            disabled={sending}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[T.primary, '#0a80c4']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={ss.submitGradient}
            >
              {sending
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="calendar" size={18} color="#fff" />
                    <Text style={ss.submitText}>Envoyer la demande</Text>
                  </>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>


        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES — same visual language as PropertiesScreen / PropertyCard
// ─────────────────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  root:       { flex: 1, backgroundColor: T.bg },
  scroll:     { paddingBottom: 24 },

  // Loader
  loaderScreen: { flex: 1, backgroundColor: T.bg, justifyContent: 'center', alignItems: 'center' },
  loaderText:   { marginTop: 12, color: T.primary, fontSize: 15, fontWeight: '600' },

  // ── Gallery ──
  galleryWrap: { height: 310, position: 'relative', backgroundColor: '#000' },
  heroImg:     { width: '100%', height: '100%' },
  heroGradient:{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 130 },

  heroTopRow: {
    position: 'absolute', top: 48, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 18, zIndex: 10,
  },
  heroIconBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.40)',
    justifyContent: 'center', alignItems: 'center',
  },

  navBtn: {
    position: 'absolute', top: '50%', marginTop: -20,
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 8,
  },
  navBtnLeft:  { left: 12 },
  navBtnRight: { right: 12 },

  opBadge: {
    position: 'absolute', bottom: 14, left: 16,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 20 
  },
  opBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700'},

  imgCounter: {
    position: 'absolute', bottom: 14, right: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  imgCounterText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  featuredBadge: {
    position: 'absolute', top: 48, left: '50%', marginLeft: -42,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: T.secondary,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  featuredText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // ── Thumbnails ──
  thumbRow: { paddingHorizontal: 18, gap: 8, paddingVertical: 12 },
  thumb: {
    width: 64, height: 64, borderRadius: 14,
    borderWidth: 2.5, borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbActive: { borderColor: T.primary },
  thumbImg:    { width: '100%', height: '100%' },

  // ── Cards ──
  card: {
    backgroundColor: T.card,
    borderRadius: 24,
    padding: 18,
    marginHorizontal: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  infoCard: {
    backgroundColor: T.card,
    borderRadius: 24,
    padding: 18,
    marginHorizontal: 14,
    marginBottom: 14,
    marginTop: -28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 10,
  },

  // ── Price + Title ──
  price: {
    fontSize: 26, fontWeight: '800', color: T.primary,
    letterSpacing: -0.5, marginBottom: 4,
  },
  title: {
    fontSize: 18, fontWeight: '700', color: T.text,
    letterSpacing: -0.2, marginBottom: 10, lineHeight: 24,
  },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginBottom: 12 },
  locationText:{ fontSize: 13, color: T.muted, flex: 1, fontWeight: '500', lineHeight: 18 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: T.bg, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: T.border,
  },
  metaText: { fontSize: 11, color: T.muted, fontWeight: '500' },

  // ── Stats ──
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  statChip: {
    flex: 1, minWidth: 70,
    backgroundColor: T.accent,
    borderRadius: 16, padding: 12,
    alignItems: 'center', gap: 4,
  },
  statIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 2,
    shadowColor: T.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 2,
  },
  statValue:  { fontSize: 15, fontWeight: '800', color: T.text },
  statLabel:  { fontSize: 11, color: T.muted, fontWeight: '500' },

  qualityRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: T.border,
  },
  qualityLabel: { fontSize: 13, fontWeight: '600', color: T.sub },
  dot:  { width: 9, height: 9, borderRadius: 5 },
  dotLabel: { fontSize: 12, color: T.muted, fontWeight: '600', marginLeft: 4 },

  // ── Section header ──
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 14,
  },
  sectionBar:   { width: 3, height: 18, backgroundColor: T.secondary, borderRadius: 2, marginRight: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: T.text, letterSpacing: -0.2 },

  // ── Amenities ──
  amenityGroupLabel: { fontSize: 12, fontWeight: '700', color: T.muted, marginBottom: 8, letterSpacing: 0.5 },
  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: T.accent, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: T.primary + '25',
  },
  amenityText: { fontSize: 12, color: T.primary, fontWeight: '700' },

  // ── Speech ──
  langRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  langBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: T.bg, borderWidth: 1.5, borderColor: T.border,
  },
  langBtnOn:   { backgroundColor: T.accent, borderColor: T.primary },
  langFlag:    { fontSize: 16 },
  langName:    { fontSize: 12, color: T.muted, fontWeight: '500' },
  langNameOn:  { color: T.primary, fontWeight: '700' },

  speechBtn:       { borderRadius: 16, overflow: 'hidden' },
  speechBtnActive: { opacity: 0.9 },
  speechGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 14, borderRadius: 16,
  },
  speechBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // ── Agent ──
  agentHeader: { flexDirection: 'row', gap: 14, marginBottom: 16, alignItems: 'center' },
  agentAvatar: {
    width: 56, height: 56, borderRadius: 18,
    borderWidth: 2.5, borderColor: T.secondary,
  },
  agentName:  { fontSize: 15, fontWeight: '800', color: T.text, marginBottom: 2 },
  agentTitle: { fontSize: 12, color: T.muted, fontWeight: '500', marginBottom: 4 },
  ratingRow:  { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: 11, color: T.muted, marginLeft: 4, fontWeight: '500' },

  agentActions: { flexDirection: 'row', gap: 10 },
  agentBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  agentBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Bandeau explicatif affiché à la place des coordonnées d'un agent masqué.
  masqueNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#e0edf8',
    borderRadius: 14,
    padding: 12,
  },
  masqueNoticeText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: T.primary,
    fontWeight: '500',
  },

  // ── Form ──
  input: {
    backgroundColor: T.bg, borderRadius: 14, padding: 14,
    fontSize: 14, color: T.sub,
    borderWidth: 1.5, borderColor: T.border, marginBottom: 10,
  },
  textArea: { height: 110, textAlignVertical: 'top' },

  submitBtn:      { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  submitGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 15, borderRadius: 16,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // ── More details ──
  moreToggle: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailsTable: { marginTop: 4, borderRadius: 14, overflow: 'hidden' },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  detailRowAlt: { backgroundColor: T.bg },
  detailLabel:  { fontSize: 13, color: T.muted, fontWeight: '500' },
  detailValue:  { fontSize: 13, color: T.sub,   fontWeight: '700' },
});
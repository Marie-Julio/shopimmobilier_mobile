import { getResource, postResource } from '@/services/api';
import { estAgentDjamabizz } from '@/utils/djamabizz';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

interface Agent {
  id_agent: number;
  utilisateur: { nom: string; prenom: string; email?: string; photo_profil?: string; role?: string };
  // Drapeau calculé renvoyé par l'API (App\Models\Agent::est_djamabizz).
  est_djamabizz?: boolean;
  type_agent?: string;
  titre: string;
  biographie?: string;
  telephone_bureau?: string;
  whatsapp?: string;
  email?: string;
  specialite?: string | string[];
  note_moyenne: number;
  avis_count: number;
  proprietes_count: number;
  valeur_totale_vendue: number;
  annees_experience: number;
  badge?: string;
  verifie: boolean;
  facebook?: string;
  linkedin?: string;
  instagram?: string;
  twitter?: string;
  langues?: string | string[];
}

interface Property {
  id_propriete: number;
  titre: string;
  prix: number;
  devise: string;
  type: string;
  operation: string;
  surface: number;
  chambres: number;
  salles_de_bain: number;
  ville: string;
  images: Array<{ url: string }>;
}

interface Review {
  nom_client: string;
  note: number;
  commentaire: string;
  created_at: string;
}

// ── helpers ──
const toArray = (v?: string | string[]): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try { const p = JSON.parse(v); if (Array.isArray(p)) return p; } catch {}
  return v.split(',').map(s => s.trim());
};

const formatPrice = (p: number, d = 'GNF') =>
  new Intl.NumberFormat('fr-FR').format(p) + ' ' + d;

// ── Section header ──
const SH = ({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) => (
  <View style={sh.row}>
    <Text style={sh.title}>{title}</Text>
    {action && (
      <TouchableOpacity style={sh.btn} onPress={onAction}>
        <Text style={sh.btnText}>{action}</Text>
        <Ionicons name="arrow-forward" size={13} color="#065483" />
      </TouchableOpacity>
    )}
  </View>
);
const sh = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#e0edf8', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  btnText: { color: '#065483', fontSize: 13, fontWeight: '700' },
});

export default function AgentProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<Agent | null>(null);
  // Vrai si la fiche demandée appartient à un compte DjamaBizz : le profil
  // n'est alors jamais rendu, quel que soit le chemin d'arrivée (lien direct,
  // deep link, historique de navigation…).
  const [profilMasque, setProfilMasque] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [form, setForm] = useState({ nom: '', email: '', telephone: '', message: '' });
  const [sending, setSending] = useState(false);

  useEffect(() => { loadAll(); }, [id]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const r = await getResource(`/agents-public/${id}`);
      if (r?.data) {
        // ── Profil DjamaBizz : accès interdit ────────────────────────────
        // On n'enregistre NI l'agent, NI ses annonces, NI ses avis : rien de
        // sa fiche n'atteint le rendu. L'écran affiche un message neutre.
        if (estAgentDjamabizz(r.data)) {
          setProfilMasque(true);
          setAgent(null);
          return;
        }

        setAgent(r.data);
        await Promise.all([
          getResource(`/proprietes?id_agent=${id}&statut=disponible&limit=6`).then(res => {
            if (res?.data?.data) setProperties(res.data.data);
          }),
          getResource(`/avis-agents?id_agent=${id}&approuve=true&limit=10`).then(res => {
            if (res?.data?.data) setReviews(res.data.data);
          }),
        ]);
      }
    } catch {
      Alert.alert('Erreur', "Impossible de charger le profil");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.nom || !form.email || !form.message) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }
    try {
      setSending(true);
      const res = await postResource('/contacts', {
        ...form,
        sujet: `Demande de contact — ${agent?.utilisateur?.prenom} ${agent?.utilisateur?.nom}`,
        type: 'information',
        id_agent_assignee: id,
      });
      if (res.status === 201) {
        Alert.alert('Message envoyé ✓', 'L\'agent vous répondra bientôt.');
        setForm({ nom: '', email: '', telephone: '', message: '' });
      }
    } catch { Alert.alert('Erreur', "Impossible d'envoyer le message"); }
    finally { setSending(false); }
  };

  const badgeInfo = () => {
    if (!agent) return null;
    if (agent.badge === 'top_agent') return { label: '🏆 Top Agent', color: '#B45309', bg: '#FEF3C7' };
    if (agent.badge === 'expert') return { label: '⭐ Expert', color: '#065F46', bg: '#D1FAE5' };
    if (agent.verifie) return { label: '✓ Vérifié', color: '#065483', bg: '#e0edf8' };
    return null;
  };

  // ── Property Card ──
  const PropertyCard = ({ p }: { p: Property }) => (
    <TouchableOpacity
      style={s.propCard}
      onPress={() => router.push(`/property/${p.id_propriete}`)}
      activeOpacity={0.88}
    >
      <Image
        source={p.images?.[0]
          ? { uri: `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${p.images[0].url}` }
          : require('../../assets/images/default-property.jpg')}
        style={s.propImage}
      />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={s.propGradient} />
      <View style={s.propBadge}>
        <Text style={s.propBadgeText}>{p.operation === 'vente' ? '🏷 VENTE' : '🔑 LOUER'}</Text>
      </View>
      <View style={s.propInfo}>
        <Text style={s.propPrice}>{formatPrice(p.prix, p.devise)}</Text>
        <Text style={s.propTitle} numberOfLines={1}>{p.titre}</Text>
        <View style={s.propMeta}>
          <Ionicons name="location-sharp" size={11} color="rgba(255,255,255,0.75)" />
          <Text style={s.propMetaText}>{p.ville}</Text>
          {p.surface > 0 && <Text style={s.propMetaText}>· {p.surface}m²</Text>}
          {p.chambres > 0 && <Text style={s.propMetaText}>· {p.chambres}ch</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );

  // ── Review Card ──
  const ReviewCard = ({ r }: { r: Review }) => (
    <View style={s.reviewCard}>
      <View style={s.reviewTop}>
        <View style={s.reviewAvatar}>
          <Text style={s.reviewAvatarText}>{r.nom_client[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.reviewName}>{r.nom_client}</Text>
          <Text style={s.reviewDate}>{new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
        </View>
        <View style={s.reviewStars}>
          {[1,2,3,4,5].map(i => (
            <Ionicons key={i} name={i <= r.note ? 'star' : 'star-outline'} size={13} color="#EC9107" />
          ))}
        </View>
      </View>
      <Text style={s.reviewText}>{r.commentaire}</Text>
    </View>
  );

  if (loading) return (
    <View style={s.loader}>
      <ActivityIndicator size="large" color="#065483" />
      <Text style={s.loaderText}>Chargement du profil…</Text>
    </View>
  );

  // Fiche d'un compte DjamaBizz : message neutre, sans aucune donnée
  // personnelle, avec renvoi vers l'annonce ou l'annuaire public.
  if (profilMasque) return (
    <View style={s.loader}>
      <Ionicons name="lock-closed-outline" size={60} color="#cbd5e1" />
      <Text style={s.loaderText}>Profil non consultable</Text>
      <Text style={[s.loaderText, { fontSize: 13, fontWeight: '400', textAlign: 'center', paddingHorizontal: 40 }]}>
        Cette annonce est gérée directement par Shop Immobilier. Utilisez le
        formulaire de contact de l'annonce pour être mis en relation.
      </Text>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backBtnText}>Retour</Text>
      </TouchableOpacity>
    </View>
  );

  if (!agent) return (
    <View style={s.loader}>
      <Ionicons name="person-outline" size={60} color="#cbd5e1" />
      <Text style={s.loaderText}>Agent introuvable</Text>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backBtnText}>Retour</Text>
      </TouchableOpacity>
    </View>
  );

  const specs = toArray(agent.specialite);
  const langs = toArray(agent.langues);
  const badge = badgeInfo();

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>

      {/* ── Cover + Avatar ── */}
      <View style={s.cover}>
        <ImageBackground source={require('../../assets/images/sh26.jpg')} style={s.heroSection}  />
        
        <TouchableOpacity style={s.coverBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        {/* Avatar bottom-left */}
        <View style={s.avatarBlock}>
          <Image
            source={agent.utilisateur?.photo_profil
              ? { uri: `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${agent.utilisateur.photo_profil}` }
              : require('../../assets/images/default-agent.jpg')}
            style={s.avatar}
          />
          {agent.verifie && (
            <View style={s.avatarVerified}>
              <Ionicons name="checkmark-circle" size={22} color="#065483" />
            </View>
          )}
        </View>
      </View>

      {/* ── Main card ── */}
      <View style={s.card}>

        {/* Name + badge */}
        <View style={s.nameRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{agent.utilisateur.prenom} {agent.utilisateur.nom}</Text>
            <Text style={s.titleLine}>{agent.titre || 'Agent Immobilier'}</Text>
          </View>
          {badge && (
            <View style={[s.badgePill, { backgroundColor: badge.bg }]}>
              <Text style={[s.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          )}
        </View>

        {/* Stats bar */}
        <View style={s.statsBar}>
          {[
            { val: (agent.note_moyenne || 0), label: 'Note', icon: 'star', color: '#EC9107' },
            { val: String(agent.avis_count || 0), label: 'Avis', icon: 'chatbubbles', color: '#065483' },
            { val: String(agent.proprietes_count || 0), label: 'Ventes', icon: 'home', color: '#16A34A' },
            { val: String(agent.annees_experience || 0) + ' ans', label: 'Expérience', icon: 'ribbon', color: '#B45309' },
          ].map((st, i, arr) => (
            <View key={i} style={[s.statItem, i < arr.length - 1 && s.statBorder]}>
              <Ionicons name={st.icon as any} size={16} color={st.color} />
              <Text style={s.statVal}>{st.val}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Bio */}
        {agent.biographie && (
          <View style={s.section}>
            <SH title="À propos" />
            <Text style={s.bio}>{agent.biographie}</Text>
          </View>
        )}

        {/* Specialties */}
        {specs.length > 0 && (
          <View style={s.section}>
            <SH title="Spécialités" />
            <View style={s.tagsRow}>
              {specs.map((sp, i) => (
                <View key={i} style={s.tag}>
                  <Text style={s.tagText}>{sp}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Languages */}
        {langs.length > 0 && (
          <View style={s.section}>
            <SH title="Langues parlées" />
            <View style={s.tagsRow}>
              {langs.map((l, i) => (
                <View key={i} style={[s.tag, s.tagBlue]}>
                  <Text style={[s.tagText, { color: '#065483' }]}>🌐 {l}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Contact buttons */}
        <View style={s.section}>
          <SH title="Contacter" />
          <View style={s.contactRow}>
            {agent.telephone_bureau && (
              <TouchableOpacity style={s.contactBtnPrimary} onPress={() => Linking.openURL(`tel:${agent.telephone_bureau}`)}>
                <Ionicons name="call" size={18} color="#fff" />
                <Text style={s.contactBtnText}>Appeler</Text>
              </TouchableOpacity>
            )}
            {agent.whatsapp && (
              <TouchableOpacity style={s.contactBtnWa} onPress={() => Linking.openURL(`https://wa.me/${agent.whatsapp!.replace(/\D/g, '')}`)}>
                <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                <Text style={s.contactBtnText}>WhatsApp</Text>
              </TouchableOpacity>
            )}
            {agent.utilisateur?.email && (
              <TouchableOpacity style={s.contactBtnEmail} onPress={() => Linking.openURL(`mailto:${agent.utilisateur.email}`)}>
                <Ionicons name="mail" size={18} color="#fff" />
                <Text style={s.contactBtnText}>Email</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Social */}
        {(agent.facebook || agent.linkedin || agent.instagram || agent.twitter) && (
          <View style={s.socialRow}>
            {[
              { key: 'facebook', icon: 'logo-facebook', color: '#1877F2', url: agent.facebook },
              { key: 'linkedin', icon: 'logo-linkedin', color: '#0077B5', url: agent.linkedin },
              { key: 'instagram', icon: 'logo-instagram', color: '#E4405F', url: agent.instagram },
              { key: 'twitter', icon: 'logo-twitter', color: '#1DA1F2', url: agent.twitter },
            ].filter(x => x.url).map(x => (
              <TouchableOpacity key={x.key} style={s.socialBtn} onPress={() => Linking.openURL(x.url!)}>
                <Ionicons name={x.icon as any} size={22} color={x.color} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Properties */}
        {properties.length > 0 && (
          <View style={s.section}>
            <SH
              title={`Annonces (${properties.length})`}
              action="Voir tout"
              onAction={() => router.push({ pathname: '/property', params: { agentId: id } })}
            />
            <FlatList
              horizontal
              data={properties}
              renderItem={({ item }) => <PropertyCard p={item} />}
              keyExtractor={i => i.id_propriete.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 14 }}
            />
          </View>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <View style={s.section}>
            <SH title={`Avis clients (${reviews.length})`} />
            {reviews.slice(0, 3).map((r, i) => <ReviewCard key={i} r={r} />)}
          </View>
        )}

        {/* Contact form */}
        <View style={s.formBox}>
          <Text style={s.formTitle}>Envoyer un message</Text>
          <Text style={s.formSubtitle}>Réponse sous 24h garantie</Text>

          {[
            { key: 'nom', placeholder: 'Votre nom *', keyboard: 'default' },
            { key: 'email', placeholder: 'Votre email *', keyboard: 'email-address' },
            { key: 'telephone', placeholder: 'Votre téléphone', keyboard: 'phone-pad' },
          ].map(f => (
            <TextInput
              key={f.key}
              style={s.input}
              placeholder={f.placeholder}
              placeholderTextColor="#94a3b8"
              keyboardType={f.keyboard as any}
              value={(form as any)[f.key]}
              onChangeText={t => setForm(prev => ({ ...prev, [f.key]: t }))}
            />
          ))}
          <TextInput
            style={[s.input, s.textArea]}
            placeholder="Votre message *"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
            value={form.message}
            onChangeText={t => setForm(prev => ({ ...prev, message: t }))}
          />

          <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={sending} activeOpacity={0.85}>
            {sending
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={s.submitBtnText}>Envoyer le message</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, backgroundColor: '#f0f4f8' },
  loaderText: { fontSize: 15, color: '#065483', fontWeight: '600' },
  backBtn: { backgroundColor: '#065483', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 16, marginTop: 8 },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  heroSection: {
    height: '135%',
    minHeight: 280,
  },
  heroImage: {
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  // Cover
  cover: { height: 240, position: 'relative', justifyContent: 'flex-end', paddingBottom: 0 },
  coverBack: { position: 'absolute', top: 56, left: 20, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  avatarBlock: { position: 'absolute', bottom: -52, left: 24, zIndex: 10 },
  avatar: { width: 104, height: 104, borderRadius: 52, borderWidth: 4, borderColor: '#fff', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  avatarVerified: { position: 'absolute', bottom: 2, right: -2, backgroundColor: '#fff', borderRadius: 12, padding: 1 },

  // Card
  card: { backgroundColor: '#fff', marginTop: 64, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 10 },

  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 18 },
  name: { fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5, lineHeight: 28 },
  titleLine: { fontSize: 14, color: '#64748b', fontWeight: '500', marginTop: 3 },
  badgePill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start', marginTop: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  // Stats
  statsBar: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 20, paddingVertical: 16, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statBorder: { borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  statVal: { fontSize: 16, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  statLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },

  section: { marginBottom: 26 },
  bio: { fontSize: 14, color: '#475569', lineHeight: 22 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  tagBlue: { backgroundColor: '#e0edf8' },
  tagText: { fontSize: 13, color: '#475569', fontWeight: '600' },

  // Contact
  contactRow: { flexDirection: 'row', gap: 10 },
  contactBtnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#065483', paddingVertical: 13, borderRadius: 16 },
  contactBtnWa: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#16a34a', paddingVertical: 13, borderRadius: 16 },
  contactBtnEmail: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#EC9107', paddingVertical: 13, borderRadius: 16 },
  contactBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 26 },
  socialBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },

  // Property card
  propCard: { width: width * 0.58, height: 210, borderRadius: 22, overflow: 'hidden', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10 },
  propImage: { width: '100%', height: '100%' },
  propGradient: { ...StyleSheet.absoluteFillObject as any, top: '35%' },
  propBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(6,84,131,0.9)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  propBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  propInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 },
  propPrice: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  propTitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 2, marginBottom: 4 },
  propMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  propMetaText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  // Review
  reviewCard: { backgroundColor: '#f8fafc', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  reviewAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#065483', justifyContent: 'center', alignItems: 'center' },
  reviewAvatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  reviewName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  reviewDate: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewText: { fontSize: 13, color: '#475569', lineHeight: 20 },

  // Form
  formBox: { backgroundColor: '#f8fafc', borderRadius: 24, padding: 20, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  formTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3, marginBottom: 4 },
  formSubtitle: { fontSize: 13, color: '#94a3b8', fontWeight: '500', marginBottom: 16 },
  input: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: '#0f172a', marginBottom: 12, borderWidth: 1.5, borderColor: '#e2e8f0', fontWeight: '500' },
  textArea: { height: 110, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: '#065483', borderRadius: 18, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
});
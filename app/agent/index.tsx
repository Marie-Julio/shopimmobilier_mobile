import { getResource } from '@/services/api';
import { filtrerAgentsVisibles } from '@/utils/djamabizz';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

interface Agent {
  id_agent: number;
  utilisateur: {
    nom: string;
    prenom: string;
    email?: string;
    photo_profil?: string;
    // Rôle du compte rattaché : sert à écarter les comptes 'djamabizz'.
    role?: string;
  };
  // Drapeau calculé renvoyé par l'API (App\Models\Agent::est_djamabizz).
  est_djamabizz?: boolean;
  type_agent?: string;
  proprietes_count: number;
  titre: string;
  telephone_bureau?: string;
  whatsapp?: string;
  specialite?: string | string[];
  note_moyenne: number;
  avis_count: number;
  proprietes?: any[];
  verifie: boolean;
}

const SPECIALTIES = ['all', 'Résidentiel', 'Commercial', 'Terrain', 'Luxe', 'Investissement'];

export default function AgentsScreen() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { fetchAgents(); }, []);
  useEffect(() => { filterAgents(); }, [searchTerm, selectedSpecialty, agents]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await getResource('/agents?verifie=1');
      if (response?.data?.data) {
        // Les comptes DjamaBizz ne figurent jamais dans l'annuaire public :
        // on les retire dès la réception, avant même de les stocker, pour
        // qu'aucun rendu intermédiaire ne puisse les laisser apparaître.
        const visibles = filtrerAgentsVisibles<Agent>(response.data.data);
        setAgents(visibles);
        setFilteredAgents(visibles);
      }
    } catch (e) {
      console.error('Erreur agents:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchAgents(); };

  const getSpecialtiesArray = (s?: string | string[]): string[] => {
    if (!s) return [];
    if (typeof s === 'string') return s.split(',').map(x => x.trim());
    return s;
  };

  const filterAgents = () => {
    // Filet de sécurité : même si un agent djamabizz se glissait dans `agents`
    // (mise en cache, réponse API modifiée…), il ne peut pas être affiché.
    let f = filtrerAgentsVisibles<Agent>(agents);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      f = f.filter(a =>
        a.utilisateur.prenom.toLowerCase().includes(q) ||
        a.utilisateur.nom.toLowerCase().includes(q) ||
        a.titre?.toLowerCase().includes(q)
      );
    }
    if (selectedSpecialty !== 'all') {
      f = f.filter(a =>
        getSpecialtiesArray(a.specialite).some(s =>
          s.toLowerCase().includes(selectedSpecialty.toLowerCase())
        )
      );
    }
    setFilteredAgents(f);
  };

  // ── Agent Card ──
  const AgentCard = ({ agent }: { agent: Agent }) => {
    const specs = getSpecialtiesArray(agent.specialite);
    const rating = Math.round(agent.note_moyenne || 0);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/agent/${agent.id_agent}`)}
        activeOpacity={0.88}
      >
        {/* Left — Avatar */}
        <View style={styles.cardLeft}>
          <View style={styles.avatarWrapper}>
            <Image
              source={
                agent.utilisateur?.photo_profil
                  ? { uri: `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${agent.utilisateur.photo_profil}` }
                  : require('../../assets/images/default-agent.jpg')
              }
              style={styles.avatar}
            />
            {agent.verifie && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#065483" />
              </View>
            )}
          </View>
          {/* Stars */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(s => (
              <Ionicons
                key={s}
                name={s <= rating ? 'star' : 'star-outline'}
                size={11}
                color="#EC9107"
              />
            ))}
          </View>
          <Text style={styles.ratingCount}>({agent.avis_count || 0})</Text>
        </View>

        {/* Right — Info */}
        <View style={styles.cardRight}>
          <View style={styles.cardTopRow}>
            <Text style={styles.agentName} numberOfLines={1}>
              {agent.utilisateur.prenom} {agent.utilisateur.nom}
            </Text>
            <View style={styles.propsBadge}>
              <Ionicons name="business" size={11} color="#065483" />
              <Text style={styles.propsBadgeText}>{agent.proprietes_count || 0}</Text>
            </View>
          </View>

          <Text style={styles.agentTitle} numberOfLines={1}>
            {agent.titre || 'Agent Immobilier'}
          </Text>

          {/* Specialties */}
          {specs.length > 0 && (
            <View style={styles.specsRow}>
              {specs.slice(0, 2).map((s, i) => (
                <View key={i} style={styles.specPill}>
                  <Text style={styles.specText}>{s}</Text>
                </View>
              ))}
              {specs.length > 2 && (
                <View style={[styles.specPill, styles.specPillMore]}>
                  <Text style={[styles.specText, { color: '#065483' }]}>+{specs.length - 2}</Text>
                </View>
              )}
            </View>
          )}

          {/* Phone */}
          {agent.telephone_bureau && (
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={13} color="#94a3b8" />
              <Text style={styles.phoneText}>{agent.telephone_bureau}</Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => router.push({ pathname: '/contact', params: { agentId: agent.id_agent } })}
              activeOpacity={0.8}
            >
              <Ionicons name="mail-outline" size={15} color="#fff" />
              <Text style={styles.contactBtnText}>Contacter</Text>
            </TouchableOpacity>

            {agent.whatsapp && (
              <TouchableOpacity style={styles.waBtn} activeOpacity={0.8}>
                <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.profileBtn} activeOpacity={0.8}
              onPress={() => router.push(`/agent/${agent.id_agent}`)}>
              <Ionicons name="arrow-forward" size={15} color="#065483" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Filters Modal ──
  const FiltersModal = () => (
    <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          {/* Handle */}
          <View style={styles.sheetHandle} />

          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Filtrer par spécialité</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
            <View style={styles.chipsGrid}>
              {SPECIALTIES.map(spec => {
                const active = selectedSpecialty === spec;
                return (
                  <TouchableOpacity
                    key={spec}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => { setSelectedSpecialty(spec); setShowFilters(false); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {spec === 'all' ? '✦ Tous les agents' : spec}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>

      {/* ── Hero ── */}
      <ImageBackground
        source={require('../../assets/images/sh26.jpg')}
        style={styles.hero}
        imageStyle={styles.heroImg}
      >
        <LinearGradient
          colors={['rgba(6,84,131,0.58)', 'rgba(10,20,40,0.68)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroOverlay}
        >
          {/* Bouton demi-tour */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.heroTitle}>Nos Agents</Text>
          <Text style={styles.heroSubtitle}>
            {filteredAgents.length} expert{filteredAgents.length > 1 ? 's' : ''} disponible{filteredAgents.length > 1 ? 's' : ''}
          </Text>

        </LinearGradient>
      </ImageBackground>

      {/* ── Search + Filter bar (floating) ── */}
      <View style={styles.searchBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#065483" />
          <TextInput
            style={styles.searchInput}
            placeholder="Nom, titre, spécialité…"
            placeholderTextColor="#94a3b8"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={18} color="#cbd5e1" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, selectedSpecialty !== 'all' && styles.filterBtnActive]}
          onPress={() => setShowFilters(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="funnel" size={20} color={selectedSpecialty !== 'all' ? '#fff' : '#065483'} />
          {selectedSpecialty !== 'all' && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* ── Active filter tag ── */}
      {selectedSpecialty !== 'all' && (
        <View style={styles.activeFilterRow}>
          <View style={styles.activeFilterPill}>
            <Text style={styles.activeFilterText}>{selectedSpecialty}</Text>
            <TouchableOpacity onPress={() => setSelectedSpecialty('all')}>
              <Ionicons name="close-circle" size={16} color="#065483" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── List ── */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#065483" />
          <Text style={styles.loaderText}>Chargement des agents…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAgents}
          renderItem={({ item }) => <AgentCard agent={item} />}
          keyExtractor={i => i.id_agent.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#065483" />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons name="people-outline" size={48} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyTitle}>Aucun agent trouvé</Text>
              <Text style={styles.emptyText}>
                Modifiez vos filtres ou votre recherche pour voir plus de résultats.
              </Text>
              <TouchableOpacity
                style={styles.emptyReset}
                onPress={() => { setSearchTerm(''); setSelectedSpecialty('all'); }}
              >
                <Text style={styles.emptyResetText}>Réinitialiser les filtres</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <FiltersModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
    marginBottom: 60,
  },

  // ── Hero ──
  hero: {
    width: '100%',
    height: 220,
  },
  heroImg: {
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  heroOverlay: {
    flex: 1,
    paddingTop: 56,
    paddingHorizontal: 22,
    paddingBottom: 28,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    justifyContent: 'flex-end',
  },
  backBtn: {
    position: 'absolute',
    top: 56,
    left: 22,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 14,
  },
  heroPills: {
    flexDirection: 'row',
    gap: 10,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  heroPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Search Bar ──
  searchBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: -24,
    marginBottom: 8,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
  filterBtn: {
    width: 52,
    height: 52,
    backgroundColor: '#fff',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  filterBtnActive: {
    backgroundColor: '#065483',
  },
  filterDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EC9107',
    borderWidth: 1.5,
    borderColor: '#fff',
  },

  // ── Active filter ──
  activeFilterRow: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e0edf8',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  activeFilterText: {
    color: '#065483',
    fontWeight: '700',
    fontSize: 13,
  },

  // ── List ──
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 50,
    gap: 14,
  },

  // ── Card ──
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    gap: 14,
  },
  cardLeft: {
    alignItems: 'center',
    width: 82,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 6,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    borderColor: '#e0edf8',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 1,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  ratingCount: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 2,
  },
  cardRight: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
    letterSpacing: -0.2,
  },
  propsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#e0edf8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
  },
  propsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065483',
  },
  agentTitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 8,
  },
  specsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  specPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  specPillMore: {
    backgroundColor: '#e0edf8',
  },
  specText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  phoneText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#065483',
    paddingVertical: 9,
    borderRadius: 14,
  },
  contactBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  waBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  profileBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#e0edf8',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Loader ──
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    color: '#065483',
    fontWeight: '600',
  },

  // ── Empty ──
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyReset: {
    backgroundColor: '#065483',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 16,
  },
  emptyResetText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#065483',
    borderColor: '#065483',
  },
  chipText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
});
import useDjamabizzGuard from '@/hooks/useDjamabizzGuard';
import { deleteResource, getResource, postResource } from '@/services/api';
import { showAlert } from '@/utils/alert';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { jwtDecode } from 'jwt-decode';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

const apiUrl = process.env.EXPO_PUBLIC_STORAGE_URL || process.env.EXPO_PUBLIC_API_URI_BASE;

export default function Dashboard() {
  // ── Garde d'accès ────────────────────────────────────────────────────────
  // Seuls les comptes djamabizz peuvent rester sur cet écran. Tout autre
  // compte est déconnecté automatiquement et renvoyé vers la connexion.
  useDjamabizzGuard();

  const router = useRouter();

  // États
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [idAgent, setIdAgent] = useState<number | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [wallet, setWallet] = useState<{ solde: number; devise: string; peut_retirer: boolean } | null>(null);

  // Recherche et filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    statut: '',
    type: '',
    operation: '',
    ville: '',
    prix_min: '',
    prix_max: '',
  });
  const [showFilterModal, setShowFilterModal] = useState(false);

  // États pour la suppression
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<any>(null);

  // Initialisation
  const init = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/djamabizz?view=login');
        return;
      }
      const decoded: any = jwtDecode(token);

      const agentRes = await getResource(`/agents-utilisateur/${decoded.id_utilisateur}`);
      const agentId = agentRes.data.id_agent;
      setIdAgent(agentId);

      const userRes = await getResource(`/me?id=${decoded.id_utilisateur}`);
      if (userRes.data) {
        setUserInfo(userRes.data);
      }

      await fetchProperties(agentId);
      fetchWallet(agentId);
    } catch (error) {
      console.error('Erreur init:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWallet = async (agentId: number) => {
    try {
      const res = await getResource(`/djamabizz/portefeuille/${agentId}`);
      if (res?.data?.data) setWallet(res.data.data);
    } catch (error) {
      console.error('Erreur chargement portefeuille:', error);
    }
  };

  // Charger les propriétés avec filtres et recherche
  const fetchProperties = async (agentId: number, search = '', filtersObj = filters) => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      params.append('id_agent', String(agentId));
      if (search) params.append('search', search);
      Object.entries(filtersObj).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const res = await getResource(`/proprietes?${params.toString()}`);
      setProperties(res.data.data || []);
    } catch (error) {
      console.error('Erreur chargement propriétés:', error);
      showAlert('Erreur', 'Impossible de charger les propriétés');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    init();
  }, []);

  // Rafraîchissement
  const onRefresh = useCallback(() => {
    if (idAgent) {
      fetchProperties(idAgent, searchTerm, filters);
    } else {
      init();
    }
  }, [idAgent, searchTerm, filters]);

  // Appliquer la recherche
  const handleSearch = () => {
    if (idAgent) {
      fetchProperties(idAgent, searchTerm, filters);
    }
  };

  // Appliquer les filtres
  const applyFilters = () => {
    setShowFilterModal(false);
    if (idAgent) {
      fetchProperties(idAgent, searchTerm, filters);
    }
  };

  // Réinitialiser les filtres
  const clearFilters = () => {
    setFilters({
      statut: '',
      type: '',
      operation: '',
      ville: '',
      prix_min: '',
      prix_max: '',
    });
    setSearchTerm('');
    setShowFilterModal(false);
    if (idAgent) {
      fetchProperties(idAgent, '', {
        statut: '',
        type: '',
        operation: '',
        ville: '',
        prix_min: '',
        prix_max: '',
      });
    }
  };

  // Changer le statut d'une propriété
  const handleStatusChange = async (propertyId: number, newStatus: string) => {
    try {
      const reponse = await postResource(`/proprietesstatus/${propertyId}`, { statut: newStatus });
      // L'intercepteur renvoie les 4xx comme des réponses : sans ce contrôle,
      // un refus du serveur affichait quand même « Succès ».
      if (reponse.status >= 400) {
        const details = reponse.data?.errors
          ? Object.values(reponse.data.errors as Record<string, string[]>).flat().join('\n')
          : reponse.data?.message;
        showAlert('Erreur', details || `Changement refusé (code ${reponse.status}).`);
        return;
      }
      showAlert('Succès', 'Statut mis à jour');
      if (idAgent) fetchProperties(idAgent, searchTerm, filters);
    } catch (error: any) {
      // Message exact du serveur : indispensable pour distinguer un refus
      // d'autorisation (403) d'une route absente (404) ou d'une panne réseau.
      const messageServeur = error?.response?.data?.message
        || (error?.response?.status ? `Changement refusé (code ${error.response.status}).` : null);
      showAlert('Erreur', messageServeur || 'Impossible de changer le statut. Vérifiez votre connexion.');
      console.error('changement de statut', error?.response?.status, error?.response?.data);
    }
  };

  // Supprimer une propriété
  const confirmDelete = (property: any) => {
    setPropertyToDelete(property);
    setDeleteModalVisible(true);
  };

  const handleDelete = async () => {
    if (!propertyToDelete) return;
    try {
      await deleteResource(`/proprietes/${propertyToDelete.id_propriete}`);
      showAlert('Succès', 'Propriété supprimée');
      setDeleteModalVisible(false);
      setPropertyToDelete(null);
      if (idAgent) fetchProperties(idAgent, searchTerm, filters);
    } catch (error) {
      showAlert('Erreur', 'Impossible de supprimer la propriété');
    }
  };

  // Construction de l'URL de la photo de profil
  const getProfileImage = () => {
    if (userInfo?.photo_profil) {
      return `${apiUrl}/storage/${userInfo.photo_profil}`;
    }
    return null;
  };

  // Construction de l'image d'une propriété
  const getPropertyImage = (p: any) => {
    if (p.images?.length) {
      const main = p.images.find((i: any) => i.principale) || p.images[0];
      return `${apiUrl}/storage/${main.url}`;
    }
    return undefined;
  };

  const formatPrice = (price: number, devise = 'GNF') =>
    `${new Intl.NumberFormat('fr-FR').format(price)} ${devise}`;

  // Rendu d'une propriété
  const renderItem = ({ item }: any) => {
    const statusColors: any = {
      disponible: '#dcfce7',
      reserve: '#fef3c7',
      vendu: '#fee2e2',
      loue: '#e0f2fe',
      archived: '#f1f5f9',
    };
    const statusTextColors: any = {
      disponible: '#15803d',
      reserve: '#92400e',
      vendu: '#dc2626',
      loue: '#0369a1',
      archived: '#64748b',
    };

    return (
      <View style={s.card}>
        <Image source={{ uri: getPropertyImage(item) }} style={s.cardImg} />
        <View style={s.cardContent}>
          <Text style={s.cardTitle} numberOfLines={1}>
            {item.titre}
          </Text>
          <Text style={s.cardLoc}>
            <Ionicons name="location-sharp" size={12} color="#94a3b8" /> {item.ville}
          </Text>
          <Text style={s.cardPrice}>{formatPrice(item.prix, item.devise)}</Text>

          {/* Statut et métriques */}
          <View style={s.metricsRow}>
            <View
              style={[
                s.badge,
                { backgroundColor: statusColors[item.statut] || '#f1f5f9' },
              ]}
            >
              <Text
                style={[
                  s.badgeText,
                  { color: statusTextColors[item.statut] || '#64748b' },
                ]}
              >
                {item.statut}
              </Text>
            </View>
            <View style={s.metrics}>
              <Ionicons name="eye-outline" size={14} color="#94a3b8" />
              <Text style={s.metricText}>{item.views || 0}</Text>
              <Ionicons name="call-outline" size={14} color="#94a3b8" style={{ marginLeft: 8 }} />
              <Text style={s.metricText}>{item.calls || 0}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={s.actionsRow}>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: '#065483' }]}
              onPress={() => router.push({
                pathname: '/djamabizz/edit-property/[id]',
                params: { id: String(item.id_propriete) }
              })}
            >
              <Ionicons name="create-outline" size={16} color="#fff" />
              <Text style={s.actionText}>Modifier</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: '#dc2626' }]}
              onPress={() => confirmDelete(item)}
            >
              <Ionicons name="trash-outline" size={16} color="#fff" />
              <Text style={s.actionText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#065483" />
        <Text style={{ marginTop: 12, color: '#64748b' }}>Chargement du tableau de bord...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* En-tête profil */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.profileButton}
          onPress={() => router.push('/djamabizz/profile')}
          activeOpacity={0.7}
        >
          <View style={s.userInfo}>
            {getProfileImage() ? (
              <Image source={{ uri: getProfileImage()! }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, s.avatarPlaceholder]}>
                <Ionicons name="person" size={24} color="#fff" />
              </View>
            )}
            <View style={s.userText}>
              <Text style={s.userName}>
                {userInfo?.prenom} {userInfo?.nom}
              </Text>
              <Text style={s.userEmail} numberOfLines={1}>
                {userInfo?.email}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Carte portefeuille Djamabizz */}
      <TouchableOpacity
        style={s.walletCard}
        activeOpacity={0.85}
        onPress={() => router.push('/djamabizz/wallet')}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={s.walletIcon}>
            <Ionicons name="wallet-outline" size={22} color="#fff" />
          </View>
          <View>
            <Text style={s.walletLabel}>Mon portefeuille</Text>
            <Text style={s.walletAmount}>
              {wallet ? `${new Intl.NumberFormat('fr-FR').format(wallet.solde)} ${wallet.devise}` : '...'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#fff" />
      </TouchableOpacity>

      {/* Accès aux demandes de visite reçues sur les propriétés publiées */}
      <TouchableOpacity
        style={s.visitesCard}
        activeOpacity={0.85}
        onPress={() => router.push('/djamabizz/visites')}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={s.visitesIcon}>
            <Ionicons name="calendar-outline" size={20} color="#065483" />
          </View>
          <Text style={s.visitesLabel}>Demandes de visite reçues</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#065483" />
      </TouchableOpacity>

      {/* Section "Mes propriétés" avec barre de recherche et filtre */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Mes propriétés</Text>
        <View style={s.headerButtons}>
          <TouchableOpacity style={s.refreshBtn} onPress={onRefresh} disabled={refreshing}>
            <Ionicons
              name={refreshing ? 'sync' : 'refresh'}
              size={22}
              color={refreshing ? '#94a3b8' : '#065483'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={s.addBtn} onPress={() => router.push('/djamabizz/add-property')}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barre de recherche et filtre */}
      <View style={s.searchContainer}>
        <View style={s.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#94a3b8" style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            placeholder="Rechercher une propriété..."
            placeholderTextColor="#94a3b8"
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchTerm(''); handleSearch(); }}>
              <Ionicons name="close-circle" size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={s.filterBtn} onPress={() => setShowFilterModal(true)}>
          <Ionicons name="options-outline" size={24} color="#065483" />
        </TouchableOpacity>
      </View>

      {/* Liste des propriétés */}
      <FlatList
        data={properties}
        keyExtractor={(item) => String(item.id_propriete)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#065483']}
            tintColor="#065483"
          />
        }
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Ionicons name="home-outline" size={64} color="#cbd5e1" />
            <Text style={{ color: '#94a3b8', marginTop: 12 }}>
              Aucune propriété trouvée
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View style={{ height: 8 }} />
        }
      />

      {/* Modal des filtres */}
      <Modal visible={showFilterModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Filtres</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.modalBody}>
              {/* Statut */}
              <View style={s.filterGroup}>
                <Text style={s.filterLabel}>Statut</Text>
                <View style={s.filterOptions}>
                  {['', 'disponible', 'reserve', 'vendu', 'loue', 'archived'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        s.filterChip,
                        filters.statut === status && s.filterChipActive,
                      ]}
                      onPress={() => setFilters({ ...filters, statut: status })}
                    >
                      <Text
                        style={[
                          s.filterChipText,
                          filters.statut === status && s.filterChipTextActive,
                        ]}
                      >
                        {status || 'Tous'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Type */}
              <View style={s.filterGroup}>
                <Text style={s.filterLabel}>Type</Text>
                <View style={s.filterOptions}>
                  {['', 'appartement', 'maison', 'terrain', 'commerce', 'bureau'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        s.filterChip,
                        filters.type === type && s.filterChipActive,
                      ]}
                      onPress={() => setFilters({ ...filters, type })}
                    >
                      <Text
                        style={[
                          s.filterChipText,
                          filters.type === type && s.filterChipTextActive,
                        ]}
                      >
                        {type || 'Tous'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Opération */}
              <View style={s.filterGroup}>
                <Text style={s.filterLabel}>Opération</Text>
                <View style={s.filterOptions}>
                  {['', 'vente', 'location', 'location_saisonniere'].map((op) => (
                    <TouchableOpacity
                      key={op}
                      style={[
                        s.filterChip,
                        filters.operation === op && s.filterChipActive,
                      ]}
                      onPress={() => setFilters({ ...filters, operation: op })}
                    >
                      <Text
                        style={[
                          s.filterChipText,
                          filters.operation === op && s.filterChipTextActive,
                        ]}
                      >
                        {op || 'Toutes'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Ville */}
              <View style={s.filterGroup}>
                <Text style={s.filterLabel}>Ville</Text>
                <TextInput
                  style={s.filterInput}
                  placeholder="Ex: Conakry"
                  placeholderTextColor="#94a3b8"
                  value={filters.ville}
                  onChangeText={(text) => setFilters({ ...filters, ville: text })}
                />
              </View>

              {/* Prix min et max */}
              <View style={s.filterRow}>
                <View style={[s.filterGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={s.filterLabel}>Prix min</Text>
                  <TextInput
                    style={s.filterInput}
                    placeholder="Min"
                    keyboardType="numeric"
                    value={filters.prix_min}
                    onChangeText={(text) => setFilters({ ...filters, prix_min: text })}
                  />
                </View>
                <View style={[s.filterGroup, { flex: 1 }]}>
                  <Text style={s.filterLabel}>Prix max</Text>
                  <TextInput
                    style={s.filterInput}
                    placeholder="Max"
                    keyboardType="numeric"
                    value={filters.prix_max}
                    onChangeText={(text) => setFilters({ ...filters, prix_max: text })}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={s.modalFooter}>
              <TouchableOpacity style={[s.modalBtn, s.clearBtn]} onPress={clearFilters}>
                <Text style={s.clearBtnText}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, s.applyBtn]} onPress={applyFilters}>
                <Text style={s.applyBtnText}>Appliquer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmation de suppression */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <View style={s.deleteModalContent}>
            <View style={s.deleteModalHeader}>
              <Ionicons name="warning-outline" size={40} color="#dc2626" />
              <Text style={s.deleteModalTitle}>Confirmer la suppression</Text>
            </View>
            <Text style={s.deleteModalBody}>
              Êtes-vous sûr de vouloir supprimer la propriété{' '}
              <Text style={{ fontWeight: 'bold' }}>{propertyToDelete?.titre}</Text> ?
              Cette action est irréversible.
            </Text>
            <View style={s.deleteModalFooter}>
              <TouchableOpacity
                style={[s.deleteModalBtn, s.cancelDeleteBtn]}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setPropertyToDelete(null);
                }}
              >
                <Text style={s.cancelDeleteText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.deleteModalBtn, s.confirmDeleteBtn]}
                onPress={handleDelete}
              >
                <Text style={s.confirmDeleteText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Styles
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e2e8f0' },
  avatarPlaceholder: { backgroundColor: '#065483', alignItems: 'center', justifyContent: 'center' },
  userText: { flexShrink: 1 },
  userName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  userEmail: { fontSize: 13, color: '#64748b' },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#065483',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  walletIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  walletLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  walletAmount: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 2 },
  visitesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  visitesIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#eaf2f8',
    alignItems: 'center', justifyContent: 'center',
  },
  visitesLabel: { color: '#0f172a', fontSize: 13.5, fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f0f4f8',
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
  },
  addBtn: {
    backgroundColor: '#065483',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    paddingVertical: 8,
  },
  filterBtn: {
    marginLeft: 12,
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    padding: 12,
    elevation: 2,
    gap: 12,
  },
  cardImg: { width: 70, height: 70, borderRadius: 12, backgroundColor: '#e2e8f0' },
  cardContent: { flex: 1, justifyContent: 'space-between' },
  cardTitle: { fontWeight: '700', fontSize: 15, color: '#0f172a' },
  cardLoc: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  cardPrice: { fontWeight: '800', color: '#065483', marginTop: 4 },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  metrics: { flexDirection: 'row', alignItems: 'center' },
  metricText: { fontSize: 12, color: '#64748b', marginLeft: 4, marginRight: 8 },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  actionText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  statusDropdown: { flex: 1 },
  emptyContainer: { paddingTop: 40, alignItems: 'center', justifyContent: 'center' },

  // Modal Filtres
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  modalBody: { marginBottom: 16 },
  filterGroup: { marginBottom: 16 },
  filterLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: { backgroundColor: '#065483', borderColor: '#065483' },
  filterChipText: { fontSize: 13, color: '#64748b' },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  filterInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterRow: { flexDirection: 'row' },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  clearBtn: { backgroundColor: '#f1f5f9', marginRight: 8 },
  clearBtnText: { color: '#334155', fontWeight: '600' },
  applyBtn: { backgroundColor: '#065483', marginLeft: 8 },
  applyBtnText: { color: '#fff', fontWeight: '700' },

  // Modal Suppression
  deleteModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
  },
  deleteModalHeader: { alignItems: 'center', marginBottom: 16 },
  deleteModalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginTop: 8 },
  deleteModalBody: { fontSize: 15, color: '#334155', textAlign: 'center', marginBottom: 20 },
  deleteModalFooter: { flexDirection: 'row', gap: 12 },
  deleteModalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancelDeleteBtn: { backgroundColor: '#f1f5f9' },
  cancelDeleteText: { color: '#334155', fontWeight: '600' },
  confirmDeleteBtn: { backgroundColor: '#dc2626' },
  confirmDeleteText: { color: '#fff', fontWeight: '700' },
});
import useDjamabizzGuard from '@/hooks/useDjamabizzGuard';
import api, { getResource } from '@/services/api';
import { showAlert } from '@/utils/alert';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { jwtDecode } from 'jwt-decode';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const STATUT_INFO: Record<string, { label: string; color: string }> = {
  nouveau: { label: 'Nouveau', color: '#0d6efd' },
  en_cours: { label: 'En cours', color: '#f59e0b' },
  traite: { label: 'Traité', color: '#16a34a' },
  ignore: { label: 'Ignoré', color: '#94a3b8' },
};

const TYPE_LABELS: Record<string, string> = {
  visite: 'Demande de visite',
  information: "Demande d'information",
  devis: 'Demande de devis',
  autre: 'Autre',
};

export default function Visites() {
  // ── Garde d'accès ────────────────────────────────────────────────────────
  // Seuls les comptes djamabizz peuvent rester sur cet écran. Tout autre
  // compte est déconnecté automatiquement et renvoyé vers la connexion.
  useDjamabizzGuard();

  const router = useRouter();
  const [idAgent, setIdAgent] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [demandes, setDemandes] = useState<any[]>([]);
  const [filtre, setFiltre] = useState('');

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
      await fetchDemandes(agentId);
    } catch (error) {
      console.error('Erreur init visites:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDemandes = async (agentId: number, statut = filtre) => {
    try {
      const url = statut
        ? `/agents/${agentId}/contacts?statut=${statut}`
        : `/agents/${agentId}/contacts`;
      const res = await getResource(url);
      setDemandes(res?.data?.data || []);
    } catch (error) {
      console.error('Erreur chargement visites:', error);
    }
  };

  useEffect(() => { init(); }, []);
  useEffect(() => { if (idAgent) fetchDemandes(idAgent, filtre); }, [filtre]);

  const onRefresh = async () => {
    if (!idAgent) return;
    setRefreshing(true);
    await fetchDemandes(idAgent, filtre);
    setRefreshing(false);
  };

  const changerStatut = async (id: number, statut: string) => {
    try {
      const reponse = await api.patch(`/contacts-status/${id}`, { statut });
      if (reponse.status >= 400) {
        const details = reponse.data?.errors
          ? Object.values(reponse.data.errors as Record<string, string[]>).flat().join('\n')
          : reponse.data?.message;
        showAlert('Erreur', details || `Changement refusé (code ${reponse.status}).`);
        return;
      }
      if (idAgent) fetchDemandes(idAgent, filtre);
    } catch (error: any) {
      const messageServeur = error?.response?.data?.message
        || (error?.response?.status ? `Changement refusé (code ${error.response.status}).` : null);
      showAlert('Erreur', messageServeur || 'Impossible de mettre à jour le statut. Vérifiez votre connexion.');
      console.error('statut demande', error?.response?.status, error?.response?.data);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#065483" />
        <Text style={{ marginTop: 12, color: '#64748b' }}>Chargement des demandes...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Demandes de visite</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.filtres}>
        {[
          { value: '', label: 'Toutes' },
          { value: 'nouveau', label: 'Nouvelles' },
          { value: 'en_cours', label: 'En cours' },
          { value: 'traite', label: 'Traitées' },
        ].map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[s.filtreChip, filtre === f.value && s.filtreChipActive]}
            onPress={() => setFiltre(f.value)}
          >
            <Text style={[s.filtreChipText, filtre === f.value && s.filtreChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={demandes}
        keyExtractor={(item) => String(item.id_contact)}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Ionicons name="calendar-outline" size={40} color="#cbd5e1" />
            <Text style={{ color: '#94a3b8', marginTop: 10, textAlign: 'center', paddingHorizontal: 30 }}>
              Aucune demande de visite pour l'instant. Elles apparaîtront ici dès qu'un visiteur
              s'intéressera à l'une de vos propriétés.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardTop}>
              <Text style={s.typeLabel}>{TYPE_LABELS[item.type] || item.type}</Text>
              <View style={[s.badge, { backgroundColor: (STATUT_INFO[item.statut]?.color || '#94a3b8') + '22' }]}>
                <Text style={[s.badgeText, { color: STATUT_INFO[item.statut]?.color || '#94a3b8' }]}>
                  {STATUT_INFO[item.statut]?.label || item.statut}
                </Text>
              </View>
            </View>

            <Text style={s.nom}>{item.nom}</Text>
            <Text style={s.contactInfo}>{item.email}</Text>
            {item.telephone ? <Text style={s.contactInfo}>{item.telephone}</Text> : null}
            {item.propriete ? (
              <Text style={s.propriete} numberOfLines={1}>
                <Ionicons name="home-outline" size={13} /> {item.propriete.titre}
              </Text>
            ) : null}

            <Text style={s.message}>{item.message}</Text>

            <Text style={s.date}>
              {new Date(item.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>

            <View style={s.actions}>
              {item.statut !== 'traite' && (
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#16a34a' }]} onPress={() => changerStatut(item.id_contact, 'traite')}>
                  <Text style={s.actionBtnText}>Marquer traité</Text>
                </TouchableOpacity>
              )}
              {item.statut === 'nouveau' && (
                <TouchableOpacity style={[s.actionBtn, s.actionBtnOutline]} onPress={() => changerStatut(item.id_contact, 'en_cours')}>
                  <Text style={s.actionBtnOutlineText}>En cours</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingTop: 50, paddingBottom: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  filtres: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  filtreChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f1f5f9' },
  filtreChipActive: { backgroundColor: '#065483' },
  filtreChipText: { fontSize: 12.5, color: '#475569', fontWeight: '600' },
  filtreChipTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeLabel: { fontSize: 12, fontWeight: '700', color: '#065483' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  nom: { fontSize: 15.5, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  contactInfo: { fontSize: 13, color: '#64748b' },
  propriete: { fontSize: 13, color: '#334155', marginTop: 6, fontWeight: '600' },
  message: { fontSize: 13.5, color: '#334155', marginTop: 8, lineHeight: 19 },
  date: { fontSize: 11.5, color: '#94a3b8', marginTop: 10 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 12.5 },
  actionBtnOutline: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0' },
  actionBtnOutlineText: { color: '#475569', fontWeight: '700', fontSize: 12.5 },
});

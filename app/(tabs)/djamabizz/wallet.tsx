import useDjamabizzGuard from '@/hooks/useDjamabizzGuard';
import { getResource, postResource } from '@/services/api';
import { showAlert } from '@/utils/alert';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { jwtDecode } from 'jwt-decode';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const formatMontant = (m: number) => new Intl.NumberFormat('fr-FR').format(Math.round(m || 0));

const OPERATEURS = [
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'mtn_momo', label: 'MTN MoMo' },
  { value: 'moov_money', label: 'Moov Money' },
  { value: 'autre', label: 'Autre' },
];

export default function Wallet() {
  // ── Garde d'accès ────────────────────────────────────────────────────────
  // Seuls les comptes djamabizz peuvent rester sur cet écran. Tout autre
  // compte est déconnecté automatiquement et renvoyé vers la connexion.
  useDjamabizzGuard();

  const router = useRouter();
  const [idAgent, setIdAgent] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [wallet, setWallet] = useState<any>(null);
  const [gains, setGains] = useState<any[]>([]);
  const [retraits, setRetraits] = useState<any[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [montant, setMontant] = useState('');
  const [operateur, setOperateur] = useState('orange_money');
  const [numero, setNumero] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      await fetchAll(agentId);
    } catch (error) {
      console.error('Erreur init wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAll = async (agentId: number) => {
    try {
      const [walletRes, gainsRes, retraitsRes] = await Promise.all([
        getResource(`/djamabizz/portefeuille/${agentId}`),
        getResource(`/djamabizz/gains/${agentId}`),
        getResource(`/djamabizz/retraits/${agentId}`),
      ]);
      if (walletRes?.data?.data) setWallet(walletRes.data.data);
      if (gainsRes?.data?.data) setGains(gainsRes.data.data);
      if (retraitsRes?.data?.data) setRetraits(retraitsRes.data.data);

      if (numero === '' && wallet?.numero_mobile_money) {
        setNumero(wallet.numero_mobile_money);
      }
    } catch (error) {
      console.error('Erreur chargement portefeuille:', error);
    }
  };

  useEffect(() => { init(); }, []);

  const onRefresh = async () => {
    if (!idAgent) return;
    setRefreshing(true);
    await fetchAll(idAgent);
    setRefreshing(false);
  };

  const ouvrirDemande = () => {
    if (!wallet?.peut_retirer) {
      showAlert(
        'Solde insuffisant',
        `Vous devez avoir au moins ${formatMontant(wallet?.montant_min_retrait)} ${wallet?.devise} pour demander un retrait.`
      );
      return;
    }
    setMontant(String(wallet?.solde || ''));
    setShowModal(true);
  };

  const soumettreDemande = async () => {
    const montantNum = parseFloat(montant);
    if (!montantNum || montantNum <= 0) {
      showAlert('Montant invalide', 'Merci de saisir un montant valide.');
      return;
    }
    if (!numero) {
      showAlert('Numéro requis', 'Merci de renseigner votre numéro mobile money.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await postResource('/djamabizz/retraits', {
        id_agent: idAgent,
        montant: montantNum,
        operateur_mobile_money: operateur,
        numero_mobile_money: numero,
      });
      if (res?.data?.error === 0) {
        showAlert('Demande envoyée', 'Votre demande de retrait est en attente de validation.');
        setShowModal(false);
        if (idAgent) fetchAll(idAgent);
      } else {
        showAlert('Erreur', res?.data?.message || "Impossible d'envoyer la demande.");
      }
    } catch (error: any) {
      showAlert('Erreur', error?.response?.data?.message || "Impossible d'envoyer la demande.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#065483" />
        <Text style={{ marginTop: 12, color: '#64748b' }}>Chargement du portefeuille...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Mon portefeuille</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={s.balanceCard}>
          <Text style={s.balanceLabel}>Solde disponible</Text>
          <Text style={s.balanceAmount}>
            {wallet ? `${formatMontant(wallet.solde)} ${wallet.devise}` : '-'}
          </Text>
          <View style={s.balanceRow}>
            <View style={s.balanceCol}>
              <Text style={s.balanceColLabel}>Total gagné</Text>
              <Text style={s.balanceColValue}>{wallet ? formatMontant(wallet.total_gagne) : '-'}</Text>
            </View>
            <View style={s.balanceCol}>
              <Text style={s.balanceColLabel}>Déjà retiré</Text>
              <Text style={s.balanceColValue}>{wallet ? formatMontant(wallet.total_retire) : '-'}</Text>
            </View>
          </View>

          <TouchableOpacity style={s.withdrawBtn} onPress={ouvrirDemande}>
            <Ionicons name="cash-outline" size={18} color="#065483" />
            <Text style={s.withdrawBtnText}>Demander un retrait</Text>
          </TouchableOpacity>

          {wallet && (
            <Text style={s.helperText}>
              Retrait possible à partir de {formatMontant(wallet.montant_min_retrait)} {wallet.devise}
              {' '}(frais : {formatMontant(wallet.frais_retrait)} {wallet.devise}) — vous gagnez{' '}
              {formatMontant(wallet.gain_par_propriete)} {wallet.devise} par bien validé, crédité en fin de mois.
            </Text>
          )}
        </View>

        <Text style={s.sectionTitle}>Mes demandes de retrait</Text>
        {retraits.length === 0 ? (
          <Text style={s.emptyText}>Aucune demande de retrait pour l'instant.</Text>
        ) : (
          <FlatList
            data={retraits}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={s.rowCard}>
                <View>
                  <Text style={s.rowTitle}>{formatMontant(item.montant_net)} {wallet?.devise}</Text>
                  <Text style={s.rowSub}>{item.operateur_mobile_money} · {item.numero_mobile_money}</Text>
                </View>
                <View style={[s.badge, badgeStyle(item.statut)]}>
                  <Text style={s.badgeText}>{statutLabel(item.statut)}</Text>
                </View>
              </View>
            )}
          />
        )}

        <Text style={s.sectionTitle}>Historique de mes gains</Text>
        {gains.length === 0 ? (
          <Text style={s.emptyText}>Aucun gain pour l'instant. Publiez des biens pour commencer à gagner !</Text>
        ) : (
          <FlatList
            data={gains}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={s.rowCard}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={s.rowTitle} numberOfLines={1}>{item.propriete?.titre || 'Bien publié'}</Text>
                  <Text style={s.rowSub}>{item.propriete?.reference}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.rowTitle}>+{formatMontant(item.montant)}</Text>
                  <View style={[s.badge, item.statut === 'credite' ? badgeStyle('paye') : badgeStyle('en_attente')]}>
                    <Text style={s.badgeText}>{item.statut === 'credite' ? 'Crédité' : 'En attente'}</Text>
                  </View>
                </View>
              </View>
            )}
          />
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Demande de retrait</Text>

            <Text style={s.label}>Montant ({wallet?.devise})</Text>
            <TextInput
              style={s.input}
              keyboardType="numeric"
              value={montant}
              onChangeText={setMontant}
              placeholder="Montant à retirer"
            />

            <Text style={s.label}>Opérateur mobile money</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
              {OPERATEURS.map((op) => (
                <TouchableOpacity
                  key={op.value}
                  style={[s.opChip, operateur === op.value && s.opChipActive]}
                  onPress={() => setOperateur(op.value)}
                >
                  <Text style={[s.opChipText, operateur === op.value && s.opChipTextActive]}>{op.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Numéro mobile money</Text>
            <TextInput
              style={s.input}
              keyboardType="phone-pad"
              value={numero}
              onChangeText={setNumero}
              placeholder="ex : 620 00 00 00"
            />

            <TouchableOpacity style={s.confirmBtn} onPress={soumettreDemande} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.confirmBtnText}>Envoyer la demande</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 10, alignItems: 'center' }} onPress={() => setShowModal(false)}>
              <Text style={{ color: '#64748b' }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function statutLabel(statut: string) {
  switch (statut) {
    case 'en_attente': return 'En attente';
    case 'approuve': return 'Approuvé';
    case 'paye': return 'Payé';
    case 'rejete': return 'Rejeté';
    default: return statut;
  }
}

function badgeStyle(statut: string) {
  switch (statut) {
    case 'paye': return { backgroundColor: '#dcfce7' };
    case 'approuve': return { backgroundColor: '#dbeafe' };
    case 'rejete': return { backgroundColor: '#fee2e2' };
    default: return { backgroundColor: '#fef9c3' };
  }
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
  balanceCard: {
    backgroundColor: '#065483', margin: 16, borderRadius: 20, padding: 20,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  balanceAmount: { color: '#fff', fontSize: 32, fontWeight: '900', marginTop: 4 },
  balanceRow: { flexDirection: 'row', gap: 24, marginTop: 16 },
  balanceCol: {},
  balanceColLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  balanceColValue: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 2 },
  withdrawBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 13, marginTop: 18,
  },
  withdrawBtnText: { color: '#065483', fontWeight: '800', fontSize: 15 },
  helperText: { color: 'rgba(255,255,255,0.8)', fontSize: 11.5, marginTop: 12, lineHeight: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginHorizontal: 16, marginTop: 8, marginBottom: 10 },
  emptyText: { color: '#94a3b8', marginHorizontal: 16, marginBottom: 16, fontSize: 13 },
  rowCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  rowSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#0f172a' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, textTransform: 'uppercase' },
  input: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, marginBottom: 14, backgroundColor: '#f8fafc',
  },
  opChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', marginBottom: 10,
  },
  opChipActive: { backgroundColor: '#065483', borderColor: '#065483' },
  opChipText: { fontSize: 12.5, fontWeight: '700', color: '#475569' },
  opChipTextActive: { color: '#fff' },
  confirmBtn: {
    backgroundColor: '#065483', borderRadius: 16, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center', marginTop: 6,
  },
  confirmBtnText: { color: '#fff', fontWeight: '800', fontSize: 15.5 },
});

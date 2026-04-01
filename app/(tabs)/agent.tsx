import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { getResource } from '../../services/api';

interface Agent {
  id_agent: number;
  utilisateur: {
    nom: string;
    prenom: string;
    email?: string;
    photo_profil?: string;
  };
  proprietes_count: number;
  titre: string;
  telephone_bureau?: string;
  whatsapp?: string;
  specialite?: string | string[]; // Updated to accept both string and array
  note_moyenne: number;
  nombre_avis: number;
  proprietes?: any[];
  verifie: boolean;
}

export default function AgentsScreen() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const specialties = [
    'all',
    'Résidentiel',
    'Commercial',
    'Terrain',
    'Luxe',
    'Investissement',
  ];

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    filterAgents();
  }, [searchTerm, selectedSpecialty, agents]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await getResource('/agents?verifie=1');
      if (response?.data?.data) {
        setAgents(response.data.data);
        setFilteredAgents(response.data.data);
      }
    } catch (error) {
      console.error('Erreur chargement agents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAgents();
  };

  const getSpecialtiesArray = (specialite: string | string[] | undefined): string[] => {
    if (!specialite) return [];
    if (typeof specialite === 'string') {
      return specialite.split(',').map(s => s.trim());
    }
    if (Array.isArray(specialite)) {
      return specialite;
    }
    return [];
  };

  const filterAgents = () => {
    let filtered = [...agents];

    // Filtre par recherche
    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (agent) =>
          agent.utilisateur.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          agent.utilisateur.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          agent.titre?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par spécialité
    if (selectedSpecialty !== 'all') {
      filtered = filtered.filter((agent) => {
        const specialties = getSpecialtiesArray(agent.specialite);
        return specialties.some(spec => 
          spec.toLowerCase().includes(selectedSpecialty.toLowerCase())
        );
      });
    }

    setFilteredAgents(filtered);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={14}
          color="#FFD700"
        />
      );
    }
    return stars;
  };

  const AgentCard = ({ agent }: { agent: Agent }) => {
    const specialties = getSpecialtiesArray(agent.specialite);
    
    return (
      <TouchableOpacity
        style={styles.agentCard}
        onPress={() => router.push(`/agent/${agent.id_agent}`)}
        activeOpacity={0.9}
      >
        <View style={styles.agentImageContainer}>
          <Image
            source={
              agent.utilisateur?.photo_profil
                ? { uri: `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${agent.utilisateur.photo_profil}` }
                : require('../../assets/images/default-agent.jpg')
            }
            style={styles.agentImage}
          />
        </View>

        <View style={styles.agentContent}>
          <View style={styles.agentHeader}>
            <Text style={styles.agentName}>
              {agent.utilisateur.prenom} {agent.utilisateur.nom}
            </Text>
            <View style={styles.agentRating}>
              <View style={styles.starsContainer}>
                {renderStars(agent.note_moyenne || 0)}
              </View>
              <Text style={styles.ratingText}>({agent.nombre_avis || 0})</Text>
            </View>
          </View>

          <Text style={styles.agentTitle}>{agent.titre || 'Agent Immobilier'}</Text>

          {specialties.length > 0 && (
            <View style={styles.specialties}>
              {specialties.slice(0, 2).map((spec, index) => (
                <View key={index} style={styles.specialtyTag}>
                  <Text style={styles.specialtyText}>{spec}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.agentStats}>
            <View style={styles.statItem}>
              <Ionicons name="business-outline" size={16} color="#007AFF" />
              <Text style={styles.statText}>{agent.proprietes_count || 0} biens</Text>
            </View>
            {agent.telephone_bureau && (
              <View style={styles.statItem}>
                <Ionicons name="call-outline" size={16} color="#007AFF" />
                <Text style={styles.statText}>{agent.telephone_bureau}</Text>
              </View>
            )}
          </View>

          <View style={styles.agentActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.contactButton]}
              onPress={() => router.push({
                pathname: '/contact',
                params: { agentId: agent.id_agent }
              })}
            >
              <Ionicons name="mail-outline" size={18} color="#007AFF" />
              <Text style={styles.contactButtonText}>Contacter</Text>
            </TouchableOpacity>
            
            {agent.whatsapp && (
              <TouchableOpacity
                style={[styles.actionButton, styles.whatsappButton]}
                onPress={() => {
                  const url = `https://wa.me/${agent.whatsapp?.replace(/\D/g, '')}`;
                  // Ouvrir WhatsApp
                }}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              </TouchableOpacity>
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

          <ScrollView style={styles.modalBody}>
            <Text style={styles.filterLabel}>Spécialité</Text>
            <View style={styles.specialtyList}>
              {specialties.map((spec) => (
                <TouchableOpacity
                  key={spec}
                  style={[
                    styles.specialtyChip,
                    selectedSpecialty === spec && styles.specialtyChipActive,
                  ]}
                  onPress={() => {
                    setSelectedSpecialty(spec);
                    setShowFilters(false);
                  }}
                >
                  <Text
                    style={[
                      styles.specialtyChipText,
                      selectedSpecialty === spec && styles.specialtyChipTextActive,
                    ]}
                  >
                    {spec === 'all' ? 'Tous' : spec}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nos Agents</Text>
        <Text style={styles.headerSubtitle}>
          {filteredAgents.length} agents disponibles
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un agent..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons
            name="options-outline"
            size={24}
            color={selectedSpecialty !== 'all' ? '#007AFF' : '#666'}
          />
        </TouchableOpacity>
      </View>

      {/* Agents List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={filteredAgents}
          renderItem={({ item }) => <AgentCard agent={item} />}
          keyExtractor={(item) => item.id_agent.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={80} color="#ccc" />
              <Text style={styles.emptyTitle}>Aucun agent trouvé</Text>
              <Text style={styles.emptyText}>
                Aucun agent ne correspond à vos critères de recherche.
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <FiltersModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#065483',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: -25,
    marginBottom: 20,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 50,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  filterButton: {
    width: 50,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  agentCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 15,
    padding: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  agentImageContainer: {
    position: 'relative',
    marginRight: 15,
  },
  agentImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  agentContent: {
    flex: 1,
  },
  agentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  agentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  agentRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 5,
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
  },
  agentTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  specialties: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  specialtyTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  specialtyText: {
    fontSize: 11,
    color: '#666',
  },
  agentStats: {
    marginBottom: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  statText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  agentActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
  },
  contactButton: {
    flex: 1,
    borderColor: '#065483',
  },
  contactButtonText: {
    color: '#065483',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 5,
  },
  whatsappButton: {
    width: 40,
    paddingHorizontal: 0,
    borderColor: '#25D366',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
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
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 15,
  },
  specialtyList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specialtyChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  specialtyChipActive: {
    backgroundColor: '#065483',
  },
  specialtyChipText: {
    color: '#666',
    fontSize: 14,
  },
  specialtyChipTextActive: {
    color: '#fff',
  },
});
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getResource, postResource } from '../../services/api';

interface Agent {
  id_agent: number;
  utilisateur: {
    nom: string;
    prenom: string;
    email?: string;
    photo_profil?: string;
  };
  titre: string;
  biographie?: string;
  telephone_bureau?: string;
  whatsapp?: string;
  email?: string;
  specialite?: string | string[]; // Updated to accept both string and array
  note_moyenne: number;
  nombre_avis: number;
  proprietes_vendues: number;
  valeur_totale_vendue: number;
  annees_experience: number;
  badge?: string;
  verifie: boolean;
  facebook?: string;
  linkedin?: string;
  instagram?: string;
  twitter?: string;
  langues?: string | string[]; // Updated to accept both string and array
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
  featured?: boolean;
  date_publication: string;
}

interface Review {
  nom_client: string;
  note: number;
  commentaire: string;
  created_at: string;
}

export default function AgentProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [contactForm, setContactForm] = useState({
    nom: '',
    email: '',
    telephone: '',
    message: ''
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadAgentData();
  }, [id]);

  const loadAgentData = async () => {
    try {
      setLoading(true);
      const response = await getResource(`/agents-public/${id}`);
      
      if (response?.data) {
        setAgent(response.data);
        await Promise.all([
          fetchProperties(),
          fetchReviews()
        ]);
      }
    } catch (error) {
      console.error('Erreur chargement agent:', error);
      Alert.alert('Erreur', 'Impossible de charger le profil de l\'agent');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true);
      const response = await getResource(`/agents/${id}/proprietes?statut=disponible&limit=6`);
      if (response?.data?.data) {
        setProperties(response.data.data);
      }
    } catch (error) {
      console.error('Erreur chargement propriétés:', error);
    } finally {
      setLoadingProperties(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setLoadingReviews(true);
      const response = await getResource(`/avis-agents?id_agent=${id}&approuve=true&limit=10`);
      if (response?.data?.data) {
        setReviews(response.data.data);
      }
    } catch (error) {
      console.error('Erreur chargement avis:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleCallAgent = () => {
    if (agent?.telephone_bureau) {
      Linking.openURL(`tel:${agent.telephone_bureau}`);
    }
  };

  const handleWhatsApp = () => {
    if (agent?.whatsapp) {
      Linking.openURL(`https://wa.me/${agent.whatsapp.replace(/\D/g, '')}`);
    }
  };

  const handleEmail = () => {
    if (agent?.utilisateur?.email) {
      Linking.openURL(`mailto:${agent.utilisateur.email}`);
    }
  };

  const handleSubmitContact = async () => {
    if (!contactForm.nom || !contactForm.email || !contactForm.message) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setSending(true);
      
      const contactData = {
        ...contactForm,
        sujet: `Demande de contact avec l'agent ${agent?.utilisateur?.prenom} ${agent?.utilisateur?.nom}`,
        type: 'information',
        id_agent_assignee: id
      };

      const response = await postResource('/contacts', contactData);
      
      if (response.status === 201) {
        Alert.alert('Succès', 'Votre message a été envoyé');
        setContactForm({ nom: '', email: '', telephone: '', message: '' });
      }
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'envoyer le message");
    } finally {
      setSending(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={16}
          color="#FFD700"
        />
      );
    }
    return stars;
  };

  const formatPrice = (price: number, devise: string = 'GNF') => {
    if (devise === 'GNF') {
      return new Intl.NumberFormat('fr-FR').format(price) + ' GNF';
    }
    return new Intl.NumberFormat('fr-FR').format(price) + ' ' + devise;
  };

  const getPropertyImage = (property: Property) => {
    if (property.images?.length > 0) {
      return { uri: `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${property.images[0].url}` };
    }
    return require('../../assets/images/default-property.jpg');
  };

  const getPropertyTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'appartement': 'Appartement',
      'maison': 'Maison',
      'terrain': 'Terrain',
      'commerce': 'Commerce',
      'bureau': 'Bureau',
      'entrepot': 'Entrepôt',
    };
    return typeMap[type] || type;
  };

  const getOperationLabel = (operation: string) => {
    const operationMap: Record<string, string> = {
      'vente': 'À vendre',
      'location': 'À louer',
      'location_saisonniere': 'Location saisonnière',
    };
    return operationMap[operation] || operation;
  };

  const getStatusText = () => {
    if (!agent) return '';
    if (agent.badge === 'top_agent') return 'Top Agent';
    if (agent.badge === 'expert') return 'Expert';
    if (agent.verifie) return 'Vérifié';
    return '';
  };

  const getStatusColor = () => {
    if (!agent) return '#666';
    if (agent.badge === 'top_agent') return '#FFD700';
    if (agent.badge === 'expert') return '#4CAF50';
    if (agent.verifie) return '#007AFF';
    return '#666';
  };

  // Updated formatLanguages function to handle both string and array
  const formatLanguages = (languages?: string | string[]): string[] => {
    if (!languages) return ['Français'];
    
    // If it's already an array, return it
    if (Array.isArray(languages)) {
      return languages;
    }
    
    // If it's a string, try to parse it as JSON first
    if (typeof languages === 'string') {
      try {
        const parsed = JSON.parse(languages);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // If JSON parsing fails, split by comma
        return languages.split(',').map(l => l.trim());
      }
    }
    
    return ['Français'];
  };

  // Updated formatSpecialties function to handle both string and array
  const formatSpecialties = (specialties?: string | string[]): string[] => {
    if (!specialties) return [];
    
    // If it's already an array, return it
    if (Array.isArray(specialties)) {
      return specialties;
    }
    
    // If it's a string, split by comma
    if (typeof specialties === 'string') {
      return specialties.split(',').map(s => s.trim());
    }
    
    return [];
  };

  const PropertyCard = ({ property }: { property: Property }) => (
    <TouchableOpacity
      style={styles.propertyCard}
      onPress={() => router.push(`/property/${property.id_propriete}`)}
    >
      <Image source={getPropertyImage(property)} style={styles.propertyImage} />
      <View style={styles.propertyBadge}>
        <Text style={styles.propertyBadgeText}>
          {getOperationLabel(property.operation)}
        </Text>
      </View>
      <View style={styles.propertyInfo}>
        <Text style={styles.propertyPrice}>{formatPrice(property.prix, property.devise)}</Text>
        <Text style={styles.propertyTitle} numberOfLines={1}>{property.titre}</Text>
        <View style={styles.propertyLocation}>
          <Ionicons name="location-outline" size={12} color="#666" />
          <Text style={styles.propertyLocationText}>{property.ville}</Text>
        </View>
        <View style={styles.propertyFeatures}>
          {property.surface > 0 && (
            <Text style={styles.propertyFeature}>{property.surface} m²</Text>
          )}
          {property.chambres > 0 && (
            <Text style={styles.propertyFeature}>{property.chambres} ch</Text>
          )}
          {property.salles_de_bain > 0 && (
            <Text style={styles.propertyFeature}>{property.salles_de_bain} sdb</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!agent) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="person-outline" size={80} color="#ccc" />
        <Text style={styles.errorTitle}>Agent non trouvé</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const specialties = formatSpecialties(agent.specialite);
  const languages = formatLanguages(agent.langues);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header avec photo de couverture */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/images/default-blog.jpg')}
          style={styles.coverImage}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.coverGradient}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.profileImageContainer}>
          <Image
            source={
              agent.utilisateur?.photo_profil
                ? { uri: `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${agent.utilisateur.photo_profil}` }
                : require('../../assets/images/default-agent.jpg')
            }
            style={styles.profileImage}
          />
          {agent.verifie && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
            </View>
          )}
        </View>
      </View>

      {/* Informations principales */}
      <View style={styles.infoContainer}>
        <Text style={styles.agentName}>
          {agent.utilisateur.prenom} {agent.utilisateur.nom}
        </Text>
        <Text style={styles.agentTitle}>{agent.titre || 'Agent Immobilier'}</Text>
        
        {getStatusText() && (
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        )}

        {/* Statistiques */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{agent.note_moyenne || 0}</Text>
            <View style={styles.starsContainer}>
              {renderStars(agent.note_moyenne || 0)}
            </View>
            <Text style={styles.statLabel}>({agent.nombre_avis || 0} avis)</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{agent.proprietes_vendues || 0}</Text>
            <Text style={styles.statLabel}>Ventes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{agent.annees_experience || 0}</Text>
            <Text style={styles.statLabel}>Ans d'exp.</Text>
          </View>
        </View>

        {/* Bio */}
        {agent.biographie && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>À propos</Text>
            <Text style={styles.bio}>{agent.biographie}</Text>
          </View>
        )}

        {/* Spécialités */}
        {specialties.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spécialités</Text>
            <View style={styles.specialtiesContainer}>
              {specialties.map((spec, index) => (
                <View key={index} style={styles.specialtyTag}>
                  <Text style={styles.specialtyText}>{spec}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Langues */}
        {languages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Langues parlées</Text>
            <View style={styles.languagesContainer}>
              {languages.map((lang, index) => (
                <View key={index} style={styles.languageTag}>
                  <Text style={styles.languageText}>{lang}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Boutons de contact */}
        <View style={styles.contactButtons}>
          {agent.telephone_bureau && (
            <TouchableOpacity style={[styles.contactButton, styles.callButton]} onPress={handleCallAgent}>
              <Ionicons name="call" size={20} color="#fff" />
              <Text style={styles.contactButtonText}>Appeler</Text>
            </TouchableOpacity>
          )}
          {agent.whatsapp && (
            <TouchableOpacity style={[styles.contactButton, styles.whatsappButton]} onPress={handleWhatsApp}>
              <Ionicons name="logo-whatsapp" size={20} color="#fff" />
              <Text style={styles.contactButtonText}>WhatsApp</Text>
            </TouchableOpacity>
          )}
          {agent.utilisateur?.email && (
            <TouchableOpacity style={[styles.contactButton, styles.emailButton]} onPress={handleEmail}>
              <Ionicons name="mail" size={20} color="#fff" />
              <Text style={styles.contactButtonText}>Email</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Réseaux sociaux */}
        {(agent.facebook || agent.linkedin || agent.instagram || agent.twitter) && (
          <View style={styles.socialContainer}>
            {agent.facebook && (
              <TouchableOpacity style={styles.socialButton} onPress={() => Linking.openURL(agent.facebook!)}>
                <Ionicons name="logo-facebook" size={24} color="#1877F2" />
              </TouchableOpacity>
            )}
            {agent.linkedin && (
              <TouchableOpacity style={styles.socialButton} onPress={() => Linking.openURL(agent.linkedin!)}>
                <Ionicons name="logo-linkedin" size={24} color="#0077B5" />
              </TouchableOpacity>
            )}
            {agent.instagram && (
              <TouchableOpacity style={styles.socialButton} onPress={() => Linking.openURL(agent.instagram!)}>
                <Ionicons name="logo-instagram" size={24} color="#E4405F" />
              </TouchableOpacity>
            )}
            {agent.twitter && (
              <TouchableOpacity style={styles.socialButton} onPress={() => Linking.openURL(agent.twitter!)}>
                <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Formulaire de contact */}
        <View style={styles.formSection}>
          <Text style={styles.formTitle}>Contacter l'agent</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Votre nom *"
            value={contactForm.nom}
            onChangeText={(text) => setContactForm(prev => ({ ...prev, nom: text }))}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Votre email *"
            keyboardType="email-address"
            value={contactForm.email}
            onChangeText={(text) => setContactForm(prev => ({ ...prev, email: text }))}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Votre téléphone"
            keyboardType="phone-pad"
            value={contactForm.telephone}
            onChangeText={(text) => setContactForm(prev => ({ ...prev, telephone: text }))}
          />
          
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Message *"
            multiline
            numberOfLines={4}
            value={contactForm.message}
            onChangeText={(text) => setContactForm(prev => ({ ...prev, message: text }))}
          />

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmitContact}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Envoyer</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Propriétés de l'agent */}
        {properties.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Annonces ({properties.length})</Text>
              <TouchableOpacity onPress={() => router.push({
                pathname: '/properties',
                params: { agentId: id }
              })}>
                <Text style={styles.seeAllText}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            {loadingProperties ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <FlatList
                data={properties.slice(0, 3)}
                renderItem={({ item }) => <PropertyCard property={item} />}
                keyExtractor={(item) => item.id_propriete.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.propertiesList}
              />
            )}
          </View>
        )}

        {/* Avis clients */}
        {reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Avis clients</Text>
            
            {loadingReviews ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              reviews.slice(0, 3).map((review, index) => (
                <View key={index} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>{review.nom_client}</Text>
                    <View style={styles.reviewRating}>
                      {renderStars(review.note)}
                    </View>
                  </View>
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                  <Text style={styles.reviewComment}>{review.commentaire}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: '#065483',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    height: 200,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
  profileImageContainer: {
    position: 'absolute',
    bottom: -50,
    left: 20,
    zIndex: 10,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  infoContainer: {
    backgroundColor: '#fff',
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  agentName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  agentTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  starsContainer: {
    flexDirection: 'row',
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e0e0e0',
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingBottom: 10,
  },
  seeAllText: {
    color: '#065483',
    fontSize: 14,
  },
  bio: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  specialtyText: {
    fontSize: 13,
    color: '#666',
  },
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageTag: {
    backgroundColor: '#065483',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  languageText: {
    fontSize: 13,
    color: '#fff',
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 5,
  },
  callButton: {
    backgroundColor: '#065483',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  emailButton: {
    backgroundColor: '#FF9500',
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    marginBottom: 20,
  },
  socialButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSection: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 15,
    marginBottom: 25,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#065483',
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  propertiesList: {
    paddingRight: 20,
  },
  propertyCard: {
    width: 200,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginRight: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  propertyImage: {
    width: '100%',
    height: 120,
  },
  propertyBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#065483',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  propertyBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  propertyInfo: {
    padding: 10,
  },
  propertyPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#065483',
    marginBottom: 5,
  },
  propertyTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  propertyLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  propertyLocationText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
  propertyFeatures: {
    flexDirection: 'row',
    gap: 10,
  },
  propertyFeature: {
    fontSize: 11,
    color: '#666',
  },
  reviewCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  reviewRating: {
    flexDirection: 'row',
  },
  reviewDate: {
    fontSize: 11,
    color: '#999',
    marginBottom: 10,
  },
  reviewComment: {
    fontSize: 13,
    color: '#444',
    lineHeight: 18,
  },
});
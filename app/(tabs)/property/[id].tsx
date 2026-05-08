import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, Image, Linking, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';

import { useWindowDimensions } from 'react-native';
import RenderHTML from 'react-native-render-html';

import { getResource, postResource } from '../../../services/api';

const { width } = Dimensions.get('window');

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
    utilisateur?: {
      nom?: string;
      prenom?: string;
      photo_profil?: string;
    };
    titre?: string;
    note_moyenne?: number;
    nombre_avis?: number;
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

interface Badge {
  text: string;
  color: string;
}

interface Amenities {
  interior: string[];
  exterior: string[];
  services: string[];
  securite: string[];
}

interface Language {
  code: string;
  name: string;
  flag: string;
}

export default function PropertyDetailScreen() {
  const { width } = useWindowDimensions();

  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<Property | null>(null);
  const [mainImage, setMainImage] = useState<string>('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  
  // État pour le lecteur vocal
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('fr-FR');
  
  // Formulaire de contact
  const [contactForm, setContactForm] = useState<ContactForm>({
    nom: '',
    email: '',
    telephone: '',
    message: ''
  });
  const [sending, setSending] = useState(false);

  const languages: Language[] = [
    { code: 'fr-FR', name: 'Français', flag: '🇫🇷' },
    { code: 'en-US', name: 'English', flag: '🇺🇸' },
    { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
    { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it-IT', name: 'Italiano', flag: '🇮🇹' },
    { code: 'ar-SA', name: 'العربية', flag: '🇸🇦' },
  ];

  useEffect(() => {
    fetchProperty();
    return () => {
      if (isSpeaking) {
        Speech.stop();
      }
    };
  }, [id]);

  const fetchProperty = async () => {
    try {
      setLoading(true);
      const response = await getResource(`/proprietes-public/${id}`);
      
      if (response?.data) {
        setProperty(response.data);
        
        if (response.data.images?.length > 0) {
          setMainImage(getImageUrl(response.data.images[0]));
        }
        
        // Incrémenter les vues
        await postResource(`/proprietes/${id}/increment-view`, {});
      }
    } catch (error) {
      console.error('Erreur chargement propriété:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de la propriété');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (image: { url: string }): string => {
    return `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${image.url}`;
  };

  const formatPrice = (price?: number, devise: string = 'GNF'): string => {
    if (!price) return 'N/A';
    if (devise === 'GNF') {
      return new Intl.NumberFormat('fr-FR').format(price) + ' GNF';
    }
    return new Intl.NumberFormat('fr-FR').format(price) + ' ' + devise;
  };

  const getPropertyTypeLabel = (type: string): string => {
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

  const getOperationLabel = (operation: string): string => {
    const operationMap: Record<string, string> = {
      'vente': 'À vendre',
      'location': 'À louer',
      'location_saisonniere': 'Location saisonnière',
    };
    return operationMap[operation] || operation;
  };

  const getEtatLabel = (etat: string): string => {
    const etatMap: Record<string, string> = {
      'neuf': 'Neuf',
      'excellent': 'Excellent',
      'bon': 'Bon',
      'renovation': 'À rénover',
    };
    return etatMap[etat] || etat;
  };

  const getBadges = (): Badge[] => {
    if (!property) return [];
    
    const badges: Badge[] = [];
    
    if (property.featured) {
      badges.push({ text: 'En Vedette', color: '#FFD700' });
    }
    
    if (property.statut === 'nouveau') {
      badges.push({ text: 'Nouveau', color: '#4CAF50' });
    }
    
    badges.push({ 
      text: getOperationLabel(property.operation), 
      color: property.operation === 'vente' ? '#FF3B30' : '#007AFF' 
    });
    
    return badges;
  };

  const getAmenities = (): Amenities => {
    if (!property) return { interior: [], exterior: [], services: [], securite: [] };
    
    const amenities: Amenities = {
      interior: [],
      exterior: [],
      services: [],
      securite: []
    };
    
    if (property.chambres > 0) {
      amenities.interior.push(`${property.chambres} chambre(s)`);
    }
    
    if (property.salles_de_bain > 0) {
      amenities.interior.push(`${property.salles_de_bain} salle(s) de bain`);
    }
    
    if (property.meuble) amenities.interior.push('Meublé');
    if (property.climatisation) amenities.interior.push('Climatisation');
    if (property.parking) amenities.exterior.push('Parking');
    if (property.jardin) amenities.exterior.push('Jardin');
    if (property.piscine) amenities.exterior.push('Piscine');
    if (property.ascenseur) amenities.exterior.push('Ascenseur');
    if (property.forage) amenities.services.push('Forage');
    if (property.groupe_electrogene) amenities.services.push('Groupe électrogène');
    if (property.electricite) amenities.services.push(`Électricité: ${property.electricite}`);
    if (property.quartier_bruit) amenities.services.push(`Quartier: ${property.quartier_bruit}`);
    if (property.niveau_securite) amenities.securite.push(`Sécurité: ${property.niveau_securite}`);
    
    return amenities;
  };

  const readPropertyInfo = async (): Promise<void> => {
    if (isSpeaking) {
      await Speech.stop();
      setIsSpeaking(false);
      return;
    }

    if (!property) return;

    const text = generateSpeechText(selectedLanguage);
    
    try {
      await Speech.speak(text, {
        language: selectedLanguage,
        pitch: 1,
        rate: 0.9,
        onStart: () => setIsSpeaking(true),
        onDone: () => setIsSpeaking(false),
        onError: () => {
          setIsSpeaking(false);
          Alert.alert('Erreur', 'Impossible de lire le texte');
        },
      });
    } catch (error) {
      console.error('Erreur lecture:', error);
      setIsSpeaking(false);
    }
  };

  const generateSpeechText = (lang: string): string => {
    if (!property) return '';
    
    const baseText = `${property.titre}. ${getPropertyTypeLabel(property.type)} ${getOperationLabel(property.operation)}. ` +
      `Prix: ${formatPrice(property.prix, property.devise)}. ` +
      `Surface: ${property.surface || 'non spécifiée'} mètres carrés. ` +
      (property.chambres ? `${property.chambres} chambre(s). ` : '') +
      (property.salles_de_bain ? `${property.salles_de_bain} salle(s) de bain. ` : '') +
      `Localisation: ${property.adresse}, ${property.ville}. ` +
      (property.description ? `Description: ${property.description}. ` : '');
    
    return baseText;
  };

  const handleThumbnailPress = (image: { url: string }, index: number): void => {
    setMainImage(getImageUrl(image));
    setCurrentImageIndex(index);
  };

  const handlePrevImage = (): void => {
    if (!property?.images) return;
    const newIndex = (currentImageIndex - 1 + property.images.length) % property.images.length;
    setMainImage(getImageUrl(property.images[newIndex]));
    setCurrentImageIndex(newIndex);
  };

  const handleNextImage = (): void => {
    if (!property?.images) return;
    const newIndex = (currentImageIndex + 1) % property.images.length;
    setMainImage(getImageUrl(property.images[newIndex]));
    setCurrentImageIndex(newIndex);
  };

  const handleShare = async (): Promise<void> => {
    try {
      await Share.share({
        message: `${property?.titre}\n${formatPrice(property?.prix, property?.devise)}\n\nDécouvrez cette propriété sur ShopImmo`,
        url: `https://shopimmo.com/property/${id}`,
      });
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  const handleCallAgent = (): void => {
    if (property?.agent?.telephone_bureau) {
      Linking.openURL(`tel:${property.agent.telephone_bureau}`);
      postResource(`/proprietes/${id}/increment-call`, {});
    }
  };

  const handleWhatsAppAgent = (): void => {
    if (property?.agent?.whatsapp) {
      Linking.openURL(`https://wa.me/${property.agent.whatsapp.replace(/\D/g, '')}`);
      postResource(`/proprietes/${id}/increment-whatsapp`, {});
    }
  };

  const handleEmailAgent = (): void => {
    if (property?.agent?.email) {
      Linking.openURL(`mailto:${property.agent.email}`);
    }
  };

  const handleScheduleVisit = async (): Promise<void> => {
    if (!contactForm.nom || !contactForm.email || !contactForm.message) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setSending(true);
      
      const formData = {
        ...contactForm,
        sujet: `Visite de ${property?.titre}`,
        id_propriete: id,
        type: 'visite'
      };

      const response = await postResource('/contacts', formData);
      
      if (response.status === 201) {
        Alert.alert('Succès', 'Votre demande de visite a été envoyée');
        setContactForm({ nom: '', email: '', telephone: '', message: '' });
      }
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'envoyer la demande");
    } finally {
      setSending(false);
    }
  };

  const handleContactFormChange = (field: keyof ContactForm, value: string): void => {
    setContactForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="home-outline" size={80} color="#ccc" />
        <Text style={styles.errorTitle}>Propriété non trouvée</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const amenities = getAmenities();
  const badges = getBadges();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Image Gallery */}
      <View style={styles.galleryContainer}>
        <Image 
          source={mainImage ? { uri: mainImage } : require('../../../assets/images/default-property.jpg')} 
          style={styles.mainImage} 
        />
        
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color="#fff" />
        </TouchableOpacity>

        {property.images && property.images.length > 1 && (
          <>
            <TouchableOpacity style={[styles.navButton, styles.prevButton]} onPress={handlePrevImage}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.navButton, styles.nextButton]} onPress={handleNextImage}>
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>
          </>
        )}

        {/* Badges */}
        <View style={styles.badgesContainer}>
          {badges.map((badge, index) => (
            <View key={index} style={[styles.badge, { backgroundColor: badge.color }]}>
              <Text style={styles.badgeText}>{badge.text}</Text>
            </View>
          ))}
        </View>

        {/* Image Counter */}
        {property.images && property.images.length > 1 && (
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {currentImageIndex + 1} / {property.images.length}
            </Text>
          </View>
        )}
      </View>

      {/* Thumbnails */}
      {property.images && property.images.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailsContainer}>
          {property.images.map((image, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleThumbnailPress(image, index)}
              style={[
                styles.thumbnail,
                index === currentImageIndex && styles.thumbnailActive,
              ]}
            >
              <Image source={{ uri: getImageUrl(image) }} style={styles.thumbnailImage} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Property Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.price}>{formatPrice(property.prix, property.devise)}</Text>
        <Text style={styles.title}>{property.titre}</Text>
        
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={18} color="#666" />
          <Text style={styles.location}>
            {property.adresse}, {property.ville}
            {property.quartier && `, ${property.quartier}`}
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          {property.surface > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="resize-outline" size={20} color="#007AFF" />
              <Text style={styles.statValue}>{property.surface} m²</Text>
            </View>
          )}
          {property.chambres > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="bed-outline" size={20} color="#007AFF" />
              <Text style={styles.statValue}>{property.chambres} ch</Text>
            </View>
          )}
          {property.salles_de_bain > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="water-outline" size={20} color="#007AFF" />
              <Text style={styles.statValue}>{property.salles_de_bain} sdb</Text>
            </View>
          )}
          {property.annee_construction && (
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={20} color="#007AFF" />
              <Text style={styles.statValue}>{property.annee_construction}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <RenderHTML
            contentWidth={width}
            source={{ html: property.description }}
            tagsStyles={{
              p: { fontSize: 16, marginBottom: 8 },
              h1: { fontSize: 24, fontWeight: 'bold' },
            }}
          />
        </View>

        {/* Caractéristiques */}
        {amenities.interior.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Caractéristiques</Text>
            <View style={styles.amenitiesGrid}>
              {amenities.interior.map((item, index) => (
                <View key={index} style={styles.amenityItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                  <Text style={styles.amenityText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Équipements */}
        {amenities.exterior.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Équipements</Text>
            <View style={styles.amenitiesGrid}>
              {amenities.exterior.map((item, index) => (
                <View key={index} style={styles.amenityItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                  <Text style={styles.amenityText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Services */}
        {amenities.services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services</Text>
            <View style={styles.amenitiesGrid}>
              {amenities.services.map((item, index) => (
                <View key={index} style={styles.amenityItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                  <Text style={styles.amenityText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Sécurité */}
        {amenities.securite.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sécurité</Text>
            <View style={styles.amenitiesGrid}>
              {amenities.securite.map((item, index) => (
                <View key={index} style={styles.amenityItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                  <Text style={styles.amenityText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Lecteur vocal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Écouter la description</Text>
          <View style={styles.speechContainer}>
            <View style={styles.languageSelector}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    selectedLanguage === lang.code && styles.languageOptionActive,
                  ]}
                  onPress={() => setSelectedLanguage(lang.code)}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.speechButton, isSpeaking && styles.speechButtonActive]}
              onPress={readPropertyInfo}
            >
              <Ionicons
                name={isSpeaking ? 'stop-circle' : 'play-circle'}
                size={50}
                color={isSpeaking ? '#FF3B30' : '#007AFF'}
              />
              <Text style={styles.speechButtonText}>
                {isSpeaking ? 'Arrêter' : `Lire en ${languages.find(l => l.code === selectedLanguage)?.name}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Agent Info */}
        {property.agent && (
          <View style={styles.agentSection}>
            <View style={styles.agentHeader}>
              <Image
                source={
                  property.agent.utilisateur?.photo_profil
                    ? { uri: `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${property.agent.utilisateur.photo_profil}` }
                    : require('../../../assets/images/default-agent.jpg')
                }
                style={styles.agentImage}
              />
              <View style={styles.agentInfo}>
                <Text style={styles.agentName}>
                  {property.agent.utilisateur?.prenom} {property.agent.utilisateur?.nom}
                </Text>
                <Text style={styles.agentTitle}>{property.agent.titre || 'Agent Immobilier'}</Text>
                {property.agent.note_moyenne && (
                  <View style={styles.agentRating}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= (property.agent?.note_moyenne || 0) ? 'star' : 'star-outline'}
                        size={14}
                        color="#FFD700"
                      />
                    ))}
                    <Text style={styles.ratingText}>({property.agent.nombre_avis || 0} avis)</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.agentActions}>
              {property.agent.telephone_bureau && (
                <TouchableOpacity style={[styles.agentButton, styles.callButton]} onPress={handleCallAgent}>
                  <Ionicons name="call" size={20} color="#fff" />
                  <Text style={styles.agentButtonText}>Appeler</Text>
                </TouchableOpacity>
              )}
              {property.agent.whatsapp && (
                <TouchableOpacity style={[styles.agentButton, styles.whatsappButton]} onPress={handleWhatsAppAgent}>
                  <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                  <Text style={styles.agentButtonText}>WhatsApp</Text>
                </TouchableOpacity>
              )}
              {property.agent.email && (
                <TouchableOpacity style={[styles.agentButton, styles.emailButton]} onPress={handleEmailAgent}>
                  <Ionicons name="mail" size={20} color="#fff" />
                  <Text style={styles.agentButtonText}>Email</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Formulaire de visite */}
        <View style={styles.formSection}>
          <Text style={styles.formTitle}>Demander une visite</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Votre nom *"
            value={contactForm.nom}
            onChangeText={(text) => handleContactFormChange('nom', text)}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Votre email *"
            keyboardType="email-address"
            value={contactForm.email}
            onChangeText={(text) => handleContactFormChange('email', text)}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Votre téléphone"
            keyboardType="phone-pad"
            value={contactForm.telephone}
            onChangeText={(text) => handleContactFormChange('telephone', text)}
          />
          
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Message *"
            multiline
            numberOfLines={4}
            value={contactForm.message}
            onChangeText={(text) => handleContactFormChange('message', text)}
          />

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleScheduleVisit}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="calendar" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Demander une visite</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Map */}
        {(property.latitude || property.longitude) && (
          <View style={styles.mapSection}>
            <Text style={styles.sectionTitle}>Localisation</Text>
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map" size={40} color="#007AFF" />
              <Text style={styles.mapText}>Voir sur Google Maps</Text>
            </View>
          </View>
        )}

        {/* Détails supplémentaires */}
        <TouchableOpacity
          style={styles.moreDetailsButton}
          onPress={() => setShowMoreDetails(!showMoreDetails)}
        >
          <Text style={styles.moreDetailsText}>
            {showMoreDetails ? 'Masquer les détails' : 'Afficher plus de détails'}
          </Text>
          <Ionicons
            name={showMoreDetails ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#007AFF"
          />
        </TouchableOpacity>

        {showMoreDetails && (
          <View style={styles.moreDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Référence:</Text>
              <Text style={styles.detailValue}>{property.reference || `PROP-${id}`}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type de bien:</Text>
              <Text style={styles.detailValue}>{getPropertyTypeLabel(property.type)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>État:</Text>
              <Text style={styles.detailValue}>{getEtatLabel(property.etat || '')}</Text>
            </View>
            {property.etage && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Étage:</Text>
                <Text style={styles.detailValue}>{property.etage}</Text>
              </View>
            )}
            {property.etages_immeuble && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Étages immeuble:</Text>
                <Text style={styles.detailValue}>{property.etages_immeuble}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date publication:</Text>
              <Text style={styles.detailValue}>
                {new Date(property.date_publication).toLocaleDateString('fr-FR')}
              </Text>
            </View>
            {property.qualite_score && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Score qualité:</Text>
                <Text style={styles.detailValue}>{property.qualite_score}%</Text>
              </View>
            )}
            {property.views && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Vues:</Text>
                <Text style={styles.detailValue}>{property.views}</Text>
              </View>
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
  galleryContainer: {
    height: 300,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
  shareButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
  prevButton: {
    left: 10,
  },
  nextButton: {
    right: 10,
  },
  badgesContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  imageCounter: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 12,
  },
  thumbnailsContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: '#065483',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  infoContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    padding: 20,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#065483',
    marginBottom: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    width: '45%',
  },
  amenityText: {
    fontSize: 14,
    color: '#555',
  },
  speechContainer: {
    alignItems: 'center',
  },
  languageSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  languageOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageOptionActive: {
    backgroundColor: '#065483',
  },
  languageFlag: {
    fontSize: 20,
  },
  speechButton: {
    alignItems: 'center',
  },
  speechButtonActive: {
    opacity: 0.8,
  },
  speechButtonText: {
    fontSize: 14,
    color: '#065483',
    marginTop: 5,
  },
  agentSection: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  agentHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  agentImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  agentTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  agentRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  agentActions: {
    flexDirection: 'row',
    gap: 10,
  },
  agentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
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
  agentButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  formSection: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
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
  mapSection: {
    marginBottom: 20,
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapText: {
    fontSize: 16,
    color: '#065483',
    marginTop: 10,
  },
  moreDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    gap: 5,
  },
  moreDetailsText: {
    fontSize: 14,
    color: '#065483',
    fontWeight: '500',
  },
  moreDetails: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});
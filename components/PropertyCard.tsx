import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Property } from '../hooks/useProperties.js';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_STORAGE_URL || 'http://localhost:8000/api';

interface PropertyCardProps {
  property: Property;
  onPress: () => void;
  onAgentPress?: () => void;
  compact?: boolean;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ 
  property, 
  onPress, 
  onAgentPress, 
  compact = false 
}) => {
  const getPropertyImage = () => {
    if (property.images && property.images.length > 0) {
      const mainImage = property.images.find(img => img.principale);
      if (mainImage) {
        return { uri: `${API_URL}/storage/${mainImage.url}` };
      }
      return { uri: `${API_URL}/storage/${property.images[0].url}` };
    }
    
    // Image par défaut
    return require('../assets/images/default-property.jpg');
  };

  const formatPrice = (price?: number, devise: string = 'GNF') => {
    if (!price) return 'N/A';
    if (devise === 'GNF') {
      return new Intl.NumberFormat('fr-FR').format(price) + ' GNF';
    }
    return new Intl.NumberFormat('fr-FR').format(price) + ' ' + devise;
  };

  const getOperationLabel = (operation: string): string => {
    const operationMap: Record<string, string> = {
      'vente': 'À vendre',
      'location': 'À louer',
      'location_saisonniere': 'Location saisonnière',
    };
    return operationMap[operation] || operation;
  };

  const getPropertyBadges = () => {
    const badges: Array<{ text: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = [];
    
    if (property.featured) {
      badges.push({ 
        text: 'En Vedette', 
        color: '#FFD700',
        icon: 'star'
      });
    }
    
    badges.push({ 
      text: getOperationLabel(property.operation), 
      color: property.operation === 'vente' ? '#FF3B30' : '#065483',
      icon: property.operation === 'vente' ? 'cash-outline' : 'calendar-outline'
    });
    
    return badges;
  };

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={onPress}>
        <Image source={getPropertyImage()} style={styles.compactImage} />
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {property.titre}
          </Text>
          <Text style={styles.compactLocation} numberOfLines={1}>
            <Ionicons name="location-outline" size={12} color="#666" /> {property.ville}
          </Text>
          <Text style={styles.compactPrice}>
            {formatPrice(property.prix, property.devise)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.imageContainer}>
        <Image source={getPropertyImage()} style={styles.image} />
        
        {/* Badges */}
        <View style={styles.badgeContainer}>
          {getPropertyBadges().map((badge, index) => (
            <View key={index} style={[styles.badge, { backgroundColor: badge.color }]}>
              <Ionicons name={badge.icon} size={12} color="#fff" />
              <Text style={styles.badgeText}>{badge.text}</Text>
            </View>
          ))}
        </View>

        {/* Prix */}
        <View style={styles.priceTag}>
          <Text style={styles.priceText}>
            {formatPrice(property.prix, property.devise)}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {property.titre}
        </Text>
        
        <Text style={styles.location} numberOfLines={1}>
          <Ionicons name="location-outline" size={16} color="#666" /> {property.adresse}, {property.ville}
        </Text>

        {/* Caractéristiques */}
        <View style={styles.features}>
          {property.surface > 0 && (
            <View style={styles.feature}>
              <Ionicons name="resize-outline" size={16} color="#007AFF" />
              <Text style={styles.featureText}>{property.surface} m²</Text>
            </View>
          )}
          {property.chambres > 0 && (
            <View style={styles.feature}>
              <Ionicons name="bed-outline" size={16} color="#007AFF" />
              <Text style={styles.featureText}>{property.chambres} ch</Text>
            </View>
          )}
          {property.salles_de_bain > 0 && (
            <View style={styles.feature}>
              <Ionicons name="water-outline" size={16} color="#007AFF" />
              <Text style={styles.featureText}>{property.salles_de_bain} sdb</Text>
            </View>
          )}
        </View>

        {/* Agent */}
        {property.agent && (
          <TouchableOpacity style={styles.agentContainer} onPress={onAgentPress}>
            <Image 
              source={
                property.agent.utilisateur?.photo_profil 
                  ? { uri: `${API_URL}/storage/${property.agent.utilisateur.photo_profil}` }
                  : require('../assets/images/default-agent.jpg')
              }
              style={styles.agentAvatar}
            />
            <View style={styles.agentInfo}>
              <Text style={styles.agentName}>
                {property.agent.utilisateur?.prenom || ''} {property.agent.utilisateur?.nom || 'Agent'}
              </Text>
              {property.agent.telephone_bureau && (
                <Text style={styles.agentPhone}>
                  <Ionicons name="call-outline" size={12} color="#666" /> {property.agent.telephone_bureau}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* Date de publication */}
        <Text style={styles.date}>
          <Ionicons name="time-outline" size={12} color="#999" /> 
          Publié le {new Date(property.date_publication).toLocaleDateString('fr-FR')}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  priceTag: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  priceText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  features: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureText: {
    fontSize: 13,
    color: '#333',
  },
  agentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  agentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  agentPhone: {
    fontSize: 12,
    color: '#666',
  },
  date: {
    fontSize: 11,
    color: '#999',
  },
  // Compact styles
  compactCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  compactImage: {
    width: 80,
    height: 80,
  },
  compactContent: {
    flex: 1,
    padding: 8,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  compactLocation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  compactPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#065483',
  },
});

export default PropertyCard;
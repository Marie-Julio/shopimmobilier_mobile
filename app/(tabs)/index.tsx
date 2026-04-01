import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { getResource } from '../../services/api';

const { width } = Dimensions.get('window');

interface Property {
  id_propriete: number;
  titre: string;
  prix: number;
  devise: string;
  type: string;
  operation: string;
  surface: number;
  chambres: number;
  ville: string;
  images: Array<{ url: string }>;
}

interface Agent {
  id_agent: number;
  utilisateur: {
    nom: string;
    prenom: string;
    photo_profil?: string;
  };
  titre: string;
  note_moyenne: number;
}

interface Blog {
  id_blog: number;
  titre: string;
  slug: string;
  categorie: string;
  date_publication: string;
  temps_lecture: number;
}

export default function HomeScreen() {
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [topAgents, setTopAgents] = useState<Agent[]>([]);
  const [latestBlogs, setLatestBlogs] = useState<Blog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      const [propertiesRes, agentsRes, blogsRes] = await Promise.all([
        getResource('/proprietes?featured=true&per_page=5'),
        getResource('/agents?note_min=4&per_page=4'),
        getResource('/blogs-public?per_page=3'),
      ]);

      if (propertiesRes?.data?.data) {
        setFeaturedProperties(propertiesRes.data.data);
      }
      if (agentsRes?.data?.data) {
        setTopAgents(agentsRes.data.data);
      }
      if (blogsRes?.data?.data) {
        setLatestBlogs(blogsRes.data.data);
      }
    } catch (error) {
      console.error('Erreur chargement données accueil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Navigation vers la page properties avec le paramètre de recherche
      router.push(`/properties?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const PropertyCard = ({ property }: { property: Property }) => (
    <TouchableOpacity
      style={styles.propertyCard}
      onPress={() => router.push(`/property/${property.id_propriete}`)}
    >
      <Image
        source={
          property.images?.[0]
            ? { uri: `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${property.images[0].url}` }
            : require('../../assets/images/default-property.jpg')
        }
        style={styles.propertyImage}
      />
      <View style={styles.propertyBadge}>
        <Text style={styles.propertyBadgeText}>
          {property.operation === 'vente' ? 'À VENDRE' : 'À LOUER'}
        </Text>
      </View>
      <View style={styles.propertyInfo}>
        <Text style={styles.propertyPrice}>
          {new Intl.NumberFormat('fr-FR').format(property.prix)} {property.devise}
        </Text>
        <Text style={styles.propertyTitle} numberOfLines={1}>
          {property.titre}
        </Text>
        <View style={styles.propertyLocation}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.propertyLocationText}>{property.ville}</Text>
        </View>
        <View style={styles.propertyFeatures}>
          {property.surface > 0 && (
            <View style={styles.featureItem}>
              <Ionicons name="resize-outline" size={14} color="#007AFF" />
              <Text style={styles.featureText}>{property.surface} m²</Text>
            </View>
          )}
          {property.chambres > 0 && (
            <View style={styles.featureItem}>
              <Ionicons name="bed-outline" size={14} color="#007AFF" />
              <Text style={styles.featureText}>{property.chambres} ch</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const AgentCard = ({ agent }: { agent: Agent }) => (
    <TouchableOpacity
      style={styles.agentCard}
      onPress={() => router.push(`/agent/${agent.id_agent}`)}
    >
      <Image
        source={
          agent.utilisateur?.photo_profil
            ? { uri: `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${agent.utilisateur.photo_profil}` }
            : require('../../assets/images/default-agent.jpg')
        }
        style={styles.agentImage}
      />
      <View style={styles.agentInfo}>
        <Text style={styles.agentName}>
          {agent.utilisateur.prenom} {agent.utilisateur.nom}
        </Text>
        <Text style={styles.agentTitle}>{agent.titre || 'Agent Immobilier'}</Text>
        <View style={styles.agentRating}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= (agent.note_moyenne || 0) ? 'star' : 'star-outline'}
              size={14}
              color="#FFD700"
            />
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  const BlogCard = ({ blog }: { blog: Blog }) => (
    <TouchableOpacity
      style={styles.blogCard}
      onPress={() => router.push(`/blog/${blog.slug}`)}
    >
      <Image
        source={require('../../assets/images/default-blog.jpg')}
        style={styles.blogImage}
      />
      <View style={styles.blogContent}>
        <View style={styles.blogCategory}>
          <Text style={styles.blogCategoryText}>{blog.categorie}</Text>
        </View>
        <Text style={styles.blogTitle} numberOfLines={2}>
          {blog.titre}
        </Text>
        <View style={styles.blogMeta}>
          <Ionicons name="time-outline" size={12} color="#999" />
          <Text style={styles.blogMetaText}>{blog.temps_lecture} min</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <ImageBackground
        source={require('../../assets/images/bg1.jpg')}
        style={styles.heroSection}
        imageStyle={styles.heroBackgroundImage}
      >
        <LinearGradient
          colors={['rgba(6,84,131,0.8)', 'rgba(236,145,7,0.8)']}
          style={styles.heroOverlay}
        >
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>
              Trouvez votre{'\n'}bien idéal
            </Text>
            <Text style={styles.heroSubtitle}>
              Découvrez les meilleures propriétés en Guinée
            </Text>
            
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher une propriété..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>1000+</Text>
          <Text style={styles.statLabel}>Biens</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>50+</Text>
          <Text style={styles.statLabel}>Agents</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>500+</Text>
          <Text style={styles.statLabel}>Clients</Text>
        </View>
      </View>

      {/* Featured Properties */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Propriétés en vedette</Text>
          <TouchableOpacity onPress={() => router.push('/properties')}>
            <Text style={styles.sectionLink}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={featuredProperties}
          renderItem={({ item }) => <PropertyCard property={item} />}
          keyExtractor={(item) => item.id_propriete.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.propertiesList}
        />
      </View>

      {/* Top Agents */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Meilleurs agents</Text>
          <TouchableOpacity onPress={() => router.push('/agent')}>
            <Text style={styles.sectionLink}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={topAgents}
          renderItem={({ item }) => <AgentCard agent={item} />}
          keyExtractor={(item) => item.id_agent.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.agentsList}
        />
      </View>

      {/* Latest Blog Posts */}
      <View style={[styles.section, styles.lastSection]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Derniers articles</Text>
          <TouchableOpacity onPress={() => router.push('/blog')}>
            <Text style={styles.sectionLink}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={latestBlogs}
          renderItem={({ item }) => <BlogCard blog={item} />}
          keyExtractor={(item) => item.id_blog.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.blogsList}
        />
      </View>

      {/* CTA Section */}
      <LinearGradient
        colors={['#065483', '#EC9107']}
        style={styles.ctaSection}
      >
        <Text style={styles.ctaTitle}>Vous souhaitez vendre ou louer ?</Text>
        <Text style={styles.ctaText}>
          Contactez nos experts pour une estimation gratuite
        </Text>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push('/contact')}
        >
          <Text style={styles.ctaButtonText}>Nous contacter</Text>
          <Ionicons name="arrow-forward" size={20} color="#007AFF" />
        </TouchableOpacity>
      </LinearGradient>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  heroSection: {
    height: 400,
    width: '100%',
  },
  heroBackgroundImage: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 30,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingHorizontal: 15,
    width: '100%',
    height: 50,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#065483',
    borderRadius: 10,
    padding: 8,
  },
  statsSection: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 15,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#065483',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  section: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  lastSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionLink: {
    color: '#065483',
    fontSize: 14,
    fontWeight: '500',
  },
  propertiesList: {
    paddingRight: 20,
  },
  propertyCard: {
    width: width * 0.7,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginRight: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  propertyImage: {
    width: '100%',
    height: 150,
  },
  propertyBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#065483',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  propertyBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  propertyInfo: {
    padding: 12,
  },
  propertyPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065483',
    marginBottom: 5,
  },
  propertyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  propertyLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  propertyLocationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  propertyFeatures: {
    flexDirection: 'row',
    gap: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureText: {
    fontSize: 12,
    color: '#666',
  },
  agentsList: {
    paddingRight: 20,
  },
  agentCard: {
    width: width * 0.4,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginRight: 15,
    padding: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  agentImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  agentInfo: {
    alignItems: 'center',
  },
  agentName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  agentTitle: {
    fontSize: 12,
    color: '#666',
    marginVertical: 5,
    textAlign: 'center',
  },
  agentRating: {
    flexDirection: 'row',
    gap: 2,
  },
  blogsList: {
    paddingRight: 20,
  },
  blogCard: {
    width: width * 0.6,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginRight: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  blogImage: {
    width: '100%',
    height: 120,
  },
  blogContent: {
    padding: 12,
  },
  blogCategory: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  blogCategoryText: {
    fontSize: 10,
    color: '#666',
  },
  blogTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  blogMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  blogMetaText: {
    fontSize: 11,
    color: '#999',
  },
  ctaSection: {
    marginHorizontal: 20,
    marginVertical: 30,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  ctaText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  ctaButtonText: {
    color: '#065483',
    fontSize: 16,
    fontWeight: '500',
  },
});
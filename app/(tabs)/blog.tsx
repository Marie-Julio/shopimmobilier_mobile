import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getResource } from '../../services/api';

interface BlogPost {
  id_blog: number;
  titre: string;
  slug: string;
  extrait: string;
  contenu: string;
  categorie: string;
  date_publication: string;
  temps_lecture: number;
  vue: number;
  auteur?: {
    utilisateur: {
      nom: string;
      prenom: string;
    };
  };
}

export default function BlogScreen() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [filteredBlogs, setFilteredBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    'all',
    'investissement',
    'marche',
    'conseils',
    'renovation',
    'legal',
    'finance',
  ];

  const categoryLabels: Record<string, string> = {
    all: 'Tous',
    investissement: 'Investissement',
    marche: 'Marché',
    conseils: 'Conseils',
    renovation: 'Rénovation',
    legal: 'Légal',
    finance: 'Finance',
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  useEffect(() => {
    filterBlogs();
  }, [searchQuery, selectedCategory, blogs]);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const response = await getResource('/blogs-public');
      if (response?.data?.data) {
        setBlogs(response.data.data);
        setFilteredBlogs(response.data.data);
      }
    } catch (error) {
      console.error('Erreur chargement blogs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBlogs();
  };

  const filterBlogs = () => {
    let filtered = [...blogs];

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (blog) =>
          blog.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
          blog.extrait?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((blog) => blog.categorie === selectedCategory);
    }

    setFilteredBlogs(filtered);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const BlogCard = ({ blog }: { blog: BlogPost }) => (
    <TouchableOpacity
      style={styles.blogCard}
      onPress={() => router.push(`/blog/${blog.slug}`)}
      activeOpacity={0.9}
    >
      <Image
        source={require('../../assets/images/default-blog.jpg')}
        style={styles.blogImage}
      />
      
      <View style={styles.blogContent}>
        <View style={styles.blogCategory}>
          <Text style={styles.blogCategoryText}>
            {categoryLabels[blog.categorie] || blog.categorie}
          </Text>
        </View>

        <Text style={styles.blogTitle} numberOfLines={2}>
          {blog.titre}
        </Text>

        {blog.extrait && (
          <Text style={styles.blogExcerpt} numberOfLines={2}>
            {blog.extrait}
          </Text>
        )}

        <View style={styles.blogMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color="#999" />
            <Text style={styles.metaText}>{formatDate(blog.date_publication)}</Text>
          </View>
          
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color="#999" />
            <Text style={styles.metaText}>{blog.temps_lecture} min</Text>
          </View>
          
          {blog.vue > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="eye-outline" size={14} color="#999" />
              <Text style={styles.metaText}>{blog.vue}</Text>
            </View>
          )}
        </View>

        {blog.auteur && (
          <View style={styles.blogAuthor}>
            <Ionicons name="person-outline" size={14} color="#666" />
            <Text style={styles.authorText}>
              {blog.auteur.utilisateur.prenom} {blog.auteur.utilisateur.nom}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Blog Immobilier</Text>
        <Text style={styles.headerSubtitle}>
          Conseils, actualités et tendances du marché
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un article..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Categories - Correction ici : utilisation de ScrollView au lieu de FlatList pour les catégories horizontales */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === category && styles.categoryChipTextActive,
              ]}
            >
              {categoryLabels[category]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Blog List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={filteredBlogs}
          renderItem={({ item }) => <BlogCard blog={item} />}
          keyExtractor={(item) => item.id_blog.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="newspaper-outline" size={80} color="#ccc" />
              <Text style={styles.emptyTitle}>Aucun article trouvé</Text>
              <Text style={styles.emptyText}>
                Aucun article ne correspond à vos critères de recherche.
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
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
    paddingHorizontal: 20,
    marginTop: -25,
    marginBottom: 15,
  },
  searchBox: {
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
  categoriesContainer: {
    maxHeight: 50,
    marginBottom: 15,
    paddingBottom: 30,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginTop: -10,
  },
  categoryChipActive: {
    backgroundColor: '#065483',
  },
  categoryChipText: {
    color: '#666',
    fontSize: 14,
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  blogCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  blogImage: {
    width: '100%',
    height: 200,
  },
  blogContent: {
    padding: 15,
  },
  blogCategory: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  blogCategoryText: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
  },
  blogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    lineHeight: 24,
  },
  blogExcerpt: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  blogMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
  },
  blogAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  authorText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
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
});
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
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { getResource } from '../../../services/api';

const { width } = Dimensions.get('window');

interface BlogPost {
  id_blog: number;
  titre: string;
  slug: string;
  extrait: string;
  contenu: string;
  categorie: string;
  date_publication: string;
  temps_lecture: number;
  image_principale?: string;
  vue: number;
  auteur?: { utilisateur: { nom: string; prenom: string } };
}

const CATEGORIES = ['all', 'investissement', 'marche', 'conseils', 'renovation', 'legal', 'finance'];
const CAT_LABELS: Record<string, string> = {
  all: '✦ Tous',
  investissement: '📈 Investissement',
  marche: '🏙 Marché',
  conseils: '💡 Conseils',
  renovation: '🔨 Rénovation',
  legal: '⚖️ Légal',
  finance: '💰 Finance',
};

const formatDate = (d: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d));

export default function BlogScreen() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [filtered, setFiltered] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('all');

  useEffect(() => { fetchBlogs(); }, []);
  useEffect(() => { doFilter(); }, [query, cat, blogs]);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const r = await getResource('/blogs-public');
      if (r?.data?.data) { setBlogs(r.data.data); setFiltered(r.data.data); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); fetchBlogs(); };

  const doFilter = () => {
    let f = [...blogs];
    if (query.trim()) {
      const q = query.toLowerCase();
      f = f.filter(b => b.titre.toLowerCase().includes(q) || b.extrait?.toLowerCase().includes(q));
    }
    if (cat !== 'all') f = f.filter(b => b.categorie === cat);
    setFiltered(f);
  };

  const imgSrc = (b: BlogPost) =>
    b.image_principale
      ? { uri: `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${b.image_principale}` }
      : require('../../../assets/images/default-blog.jpg');

  // ── Featured Card (first article, large) ──
  const FeaturedCard = ({ blog }: { blog: BlogPost }) => (
    <TouchableOpacity
      style={styles.featCard}
      onPress={() => router.push(`/blog/${blog.slug}`)}
      activeOpacity={0.88}
    >
      <Image source={imgSrc(blog)} style={StyleSheet.absoluteFillObject as any} />
      <LinearGradient colors={['transparent', 'rgba(6,84,131,0.92)']} style={styles.featGradient} />
      <View style={styles.featContent}>
        <View style={styles.catPill}>
          <Text style={styles.catPillText}>{CAT_LABELS[blog.categorie] || blog.categorie}</Text>
        </View>
        <Text style={styles.featTitle} numberOfLines={2}>{blog.titre}</Text>
        {blog.extrait && <Text style={styles.featExcerpt} numberOfLines={2}>{blog.extrait}</Text>}
        <View style={styles.featMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={styles.featMetaText}>{formatDate(blog.date_publication)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={styles.featMetaText}>{blog.temps_lecture} min</Text>
          </View>
          {blog.vue > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="eye-outline" size={12} color="rgba(255,255,255,0.7)" />
              <Text style={styles.featMetaText}>{blog.vue}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // ── Regular Card ──
  const BlogCard = ({ blog }: { blog: BlogPost }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/blog/${blog.slug}`)}
      activeOpacity={0.88}
    >
      <Image source={imgSrc(blog)} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <View style={styles.cardCatPill}>
          <Text style={styles.cardCatText}>{CAT_LABELS[blog.categorie] || blog.categorie}</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{blog.titre}</Text>
        {blog.extrait && <Text style={styles.cardExcerpt} numberOfLines={2}>{blog.extrait}</Text>}
        <View style={styles.cardFooter}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color="#94a3b8" />
            <Text style={styles.cardMetaText}>{blog.temps_lecture} min</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color="#94a3b8" />
            <Text style={styles.cardMetaText}>{formatDate(blog.date_publication)}</Text>
          </View>
          {blog.auteur && (
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={12} color="#94a3b8" />
              <Text style={styles.cardMetaText}>
                {blog.auteur.utilisateur.prenom} {blog.auteur.utilisateur.nom}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <View style={styles.container}>

      {/* ── Hero ── */}
      <ImageBackground
        source={require('../../../assets/images/4mg.jpg')}
        style={styles.hero}
        imageStyle={styles.heroImg}
      >
        <LinearGradient
          colors={['rgba(6,84,131,0.58)', 'rgba(10,20,40,0.68)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroOverlay}
        >
          <Text style={styles.heroTitle}>Blog & Conseils</Text>
          <Text style={styles.heroSubtitle}>Actus, tendances et expertises du marché</Text>
        </LinearGradient>
      </ImageBackground>

      {/* ── Search (floating) ── */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#065483" />
        <TextInput
          style={styles.searchInput}
          placeholder="Titre, mot-clé, thème…"
          placeholderTextColor="#94a3b8"
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color="#cbd5e1" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#065483" />
          <Text style={styles.loaderText}>Chargement des articles…</Text>
        </View>
      ) : (
        <FlatList
          data={rest}
          keyExtractor={i => i.id_blog.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#065483" />}
          ListHeaderComponent={featured ? (
            <View style={{ marginBottom: 8 }}>
              <View style={styles.listSectionHeader}>
                <Text style={styles.listSectionTitle}>À la une</Text>
              </View>
              <FeaturedCard blog={featured} />
              {rest.length > 0 && (
                <View style={[styles.listSectionHeader, { marginTop: 24 }]}>
                  <Text style={styles.listSectionTitle}>Tous les articles</Text>
                  <View style={styles.countPill}>
                    <Text style={styles.countText}>{filtered.length}</Text>
                  </View>
                </View>
              )}
            </View>
          ) : null}
          renderItem={({ item }) => <BlogCard blog={item} />}
          ListEmptyComponent={
            !featured ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="newspaper-outline" size={48} color="#cbd5e1" />
                </View>
                <Text style={styles.emptyTitle}>Aucun article trouvé</Text>
                <Text style={styles.emptyText}>Modifiez votre recherche ou sélectionnez une autre catégorie.</Text>
                <TouchableOpacity style={styles.emptyReset} onPress={() => { setQuery(''); setCat('all'); }}>
                  <Text style={styles.emptyResetText}>Réinitialiser</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', marginBottom: 60 },

  // Hero
  hero: { width: '100%', height: 220 },
  heroImg: { borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  heroOverlay: { flex: 1, paddingTop: 56, paddingHorizontal: 22, paddingBottom: 24, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, justifyContent: 'flex-end' },
  heroEyebrow: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  
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

  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, marginHorizontal: 20, marginTop: -24, marginBottom: 10, height: 52, paddingHorizontal: 16, gap: 10, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 14 },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a', fontWeight: '500' },

  // Categories
  catScroll: { marginTop: 14, marginBottom: 0 },
  catContent: { paddingHorizontal: 20, gap: 8, paddingBottom: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: '#065483', borderColor: '#065483' },
  chipText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  // Loader / Empty
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60, gap: 12 },
  loaderText: { fontSize: 14, color: '#065483', fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyIcon: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 8, letterSpacing: -0.2 },
  emptyText: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyReset: { backgroundColor: '#065483', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  emptyResetText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // List
  listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  listSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  listSectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  countPill: { backgroundColor: '#e0edf8', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  countText: { fontSize: 13, color: '#065483', fontWeight: '700' },

  // Featured Card
  featCard: { height: 280, borderRadius: 28, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 14, marginBottom: 0 },
  featGradient: { ...StyleSheet.absoluteFillObject as any, top: '25%' },
  featContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  catPill: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  catPillText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  featTitle: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.4, lineHeight: 26, marginBottom: 6 },
  featExcerpt: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 18, marginBottom: 10 },
  featMeta: { flexDirection: 'row', gap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  featMetaText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  // Regular Card
  card: { backgroundColor: '#fff', borderRadius: 24, marginBottom: 16, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8 },
  cardImage: { width: '100%', height: 180 },
  cardBody: { padding: 16 },
  cardCatPill: { backgroundColor: '#e0edf8', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10 },
  cardCatText: { fontSize: 11, color: '#065483', fontWeight: '700', letterSpacing: 0.3 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', lineHeight: 24, marginBottom: 6, letterSpacing: -0.2 },
  cardExcerpt: { fontSize: 13, color: '#64748b', lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  cardMetaText: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
});
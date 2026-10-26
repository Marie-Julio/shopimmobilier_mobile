import { getResource, postResource } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Linking,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import RenderHTML from 'react-native-render-html';

const { width: SW } = Dimensions.get('window');

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
  image_principale?: string;
  auteur?: {
    utilisateur: { nom: string; prenom: string; photo_profil?: string };
    titre?: string;
  };
  tags?: string[];
}

interface Comment {
  id_commentaire: number;
  nom: string;
  email?: string;
  contenu: string;
  created_at: string;
  likes: number;
  reponses?: Comment[];
}

const CAT_LABELS: Record<string, string> = {
  investissement: '📈 Investissement', marche: '🏙 Marché', conseils: '💡 Conseils',
  renovation: '🔨 Rénovation', legal: '⚖️ Légal', finance: '💰 Finance',
  construction: '🏗 Construction', gestion: '📋 Gestion', commercial: '🏢 Commercial',
  ecologie: '🌿 Écologie', location: '🔑 Location',
};

const SOCIAL = [
  { icon: 'logo-facebook', color: '#1877F2', url: (s: string) => `https://www.facebook.com/sharer/sharer.php?u=https://shopimmo.com/blog/${s}` },
  { icon: 'logo-twitter', color: '#1DA1F2', url: (s: string) => `https://twitter.com/intent/tweet?url=https://shopimmo.com/blog/${s}` },
  { icon: 'logo-linkedin', color: '#0077B5', url: (s: string) => `https://www.linkedin.com/shareArticle?url=https://shopimmo.com/blog/${s}` },
  { icon: 'logo-whatsapp', color: '#25D366', url: (s: string) => `https://wa.me/?text=https://shopimmo.com/blog/${s}` },
];

const formatDate = (d: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d));

const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (m < 60) return `Il y a ${m} min`;
  if (h < 24) return `Il y a ${h}h`;
  if (day < 7) return `Il y a ${day}j`;
  return formatDate(d);
};

const SH = ({ title, count }: { title: string; count?: number }) => (
  <View style={s.shRow}>
    <Text style={s.shTitle}>{title}</Text>
    {count !== undefined && (
      <View style={s.shPill}><Text style={s.shPillText}>{count}</Text></View>
    )}
  </View>
);

export default function BlogDetailScreen() {
  const { width } = useWindowDimensions();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const [loading, setLoading] = useState(true);
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [similar, setSimilar] = useState<BlogPost[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [totalComments, setTotalComments] = useState(0);
  const [form, setForm] = useState({ nom: '', email: '', contenu: '' });
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());

  useEffect(() => { if (slug) load(); }, [slug]);

  const load = async () => {
    try {
      setLoading(true);
      const r = await getResource(`/blogs-public/${slug}`);
      if (r?.data?.article) {
        setBlog(r.data.article);
        setSimilar(r.data.similaires || []);
        fetchComments(r.data.article.id_blog);
      } else router.back();
    } catch { router.back(); }
    finally { setLoading(false); }
  };

  const fetchComments = async (id: number) => {
    try {
      setLoadingComments(true);
      const r = await getResource(`/blogs/${id}/commentaires`);
      if (r?.data?.commentaires) {
        setComments(r.data.commentaires.data || []);
        setTotalComments(r.data.statistiques?.total_commentaires || 0);
      }
    } catch {} finally { setLoadingComments(false); }
  };

  const submitComment = async () => {
    if (!form.contenu.trim() || !form.nom.trim()) {
      Alert.alert('Champs requis', 'Nom et commentaire sont obligatoires.');
      return;
    }
    try {
      setSending(true);
      const r = await postResource('/commentaires-blog', {
        ...form, id_blog: blog?.id_blog, id_parent: replyTo?.id_commentaire || null,
      });
      if (r?.data?.message) {
        Alert.alert('Envoyé ✓', 'Votre commentaire sera publié après validation.');
        setForm({ nom: '', email: '', contenu: '' });
        setReplyTo(null);
        setTimeout(() => { if (blog) fetchComments(blog.id_blog); }, 2000);
      }
    } catch { Alert.alert('Erreur', "Impossible d'envoyer le commentaire"); }
    finally { setSending(false); }
  };

  const likeComment = async (id: number) => {
    if (likedIds.has(id)) return;
    try {
      await postResource(`/commentaires-blog-like/${id}`, null);
      setLikedIds(p => new Set([...p, id]));
      setComments(p => p.map(c => {
        if (c.id_commentaire === id) return { ...c, likes: (c.likes || 0) + 1 };
        if (c.reponses) return { ...c, reponses: c.reponses.map(r => r.id_commentaire === id ? { ...r, likes: (r.likes || 0) + 1 } : r) };
        return c;
      }));
    } catch {}
  };

  const toggleExpanded = (id: number) => setExpanded(p => {
    const n = new Set(p);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const imgSrc = blog?.image_principale
    ? { uri: `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${blog.image_principale}` }
    : require('../../../assets/images/default-blog.jpg');

  const avatarSrc = blog?.auteur?.utilisateur?.photo_profil
    ? { uri: `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${blog.auteur.utilisateur.photo_profil}` }
    : require('../../../assets/images/default-agent.jpg');

  const CommentNode = ({ c, level = 0 }: { c: Comment; level?: number }) => {
    const liked = likedIds.has(c.id_commentaire);
    return (
      <View style={[s.comment, level > 0 && s.commentReply]}>
        <View style={s.commentTop}>
          <View style={s.commentAvatar}>
            <Text style={s.commentAvatarText}>{c.nom[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.commentName}>{c.nom}</Text>
            <Text style={s.commentTime}>{timeAgo(c.created_at)}</Text>
          </View>
        </View>
        <Text style={s.commentText}>{c.contenu}</Text>
        <View style={s.commentActions}>
          <TouchableOpacity
            style={[s.commentAction, liked && s.commentActionLiked]}
            onPress={() => likeComment(c.id_commentaire)}
          >
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={16} color={liked ? '#ef4444' : '#94a3b8'} />
            <Text style={[s.commentActionText, liked && { color: '#ef4444' }]}>{c.likes || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.commentAction}
            onPress={() => { setReplyTo(c); setForm(p => ({ ...p, contenu: `@${c.nom} ` })); }}
          >
            <Ionicons name="chatbubble-outline" size={16} color="#94a3b8" />
            <Text style={s.commentActionText}>Répondre</Text>
          </TouchableOpacity>
        </View>
        {c.reponses && c.reponses.length > 0 && (
          <>
            <TouchableOpacity style={s.toggleReplies} onPress={() => toggleExpanded(c.id_commentaire)}>
              <Ionicons name={expanded.has(c.id_commentaire) ? 'chevron-up' : 'chevron-down'} size={14} color="#065483" />
              <Text style={s.toggleRepliesText}>
                {expanded.has(c.id_commentaire) ? 'Masquer' : 'Voir'} {c.reponses.length} réponse{c.reponses.length > 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
            {expanded.has(c.id_commentaire) && c.reponses.map(r => <CommentNode key={r.id_commentaire} c={r} level={level + 1} />)}
          </>
        )}
      </View>
    );
  };

  if (loading) return (
    <View style={s.loader}>
      <ActivityIndicator size="large" color="#065483" />
      <Text style={s.loaderText}>Chargement de l'article…</Text>
    </View>
  );

  if (!blog) return (
    <View style={s.loader}>
      <View style={s.emptyIcon}><Ionicons name="newspaper-outline" size={48} color="#cbd5e1" /></View>
      <Text style={s.loaderText}>Article introuvable</Text>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}><Text style={s.backBtnText}>Retour</Text></TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>

      {/* ── Hero ── */}
      <View style={s.hero}>
        <Image source={imgSrc} style={StyleSheet.absoluteFillObject as any} resizeMode="cover" />
        <LinearGradient colors={['rgba(6,84,131,0.3)', 'rgba(5,10,20,0.92)']} style={s.heroGradient}>
          <TouchableOpacity style={s.heroBack} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={s.heroShare} onPress={() => Share.share({ message: `${blog.titre}\nhttps://shopimmo.com/blog/${slug}` })}>
            <Ionicons name="share-social-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={s.heroContent}>
            <Text style={s.heroTitle}>{blog.titre}</Text>
            <View style={s.heroMeta}>
              <View style={s.heroMetaItem}>
                <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={s.heroMetaText}>{blog.temps_lecture} min de lecture</Text>
              </View>
              <View style={s.heroMetaItem}>
                <Ionicons name="eye-outline" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={s.heroMetaText}>{blog.vue || 0} vues</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* ── Author card ── */}
      <View style={s.authorCard}>
        <Image source={avatarSrc} style={s.authorAvatar} />
        <View style={{ flex: 1 }}>
          <Text style={s.authorName}>
            {blog.auteur?.utilisateur?.prenom} {blog.auteur?.utilisateur?.nom}
          </Text>
          <Text style={s.authorRole}>{blog.auteur?.titre || 'Expert Immobilier'}</Text>
        </View>
        <View style={s.datePill}>
          <Ionicons name="calendar-outline" size={13} color="#065483" />
          <Text style={s.dateText}>{formatDate(blog.date_publication)}</Text>
        </View>
      </View>

      {/* ── Content ── */}
      <View style={s.contentCard}>
        {blog.extrait && (
          <View style={s.excerptBox}>
            <View style={s.excerptBar} />
            <Text style={s.excerptText}>{blog.extrait}</Text>
          </View>
        )}
        <RenderHTML
          contentWidth={width - 44}
          source={{ html: blog.contenu }}
          tagsStyles={{
            p: { fontSize: 16, color: '#334155', lineHeight: 28, marginBottom: 12 },
            h1: { fontSize: 26, fontWeight: '800', color: '#0f172a', marginBottom: 10, letterSpacing: -0.4 },
            h2: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 8, letterSpacing: -0.3 },
            h3: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
            li: { fontSize: 15, color: '#475569', lineHeight: 26 },
            a: { color: '#065483', fontWeight: '600' },
            blockquote: { borderLeftWidth: 4, borderLeftColor: '#EC9107', paddingLeft: 14, marginLeft: 0, fontStyle: 'italic', color: '#64748b' },
          }}
        />
        {blog.tags && blog.tags.length > 0 && (
          <View style={s.tagsSection}>
            <Text style={s.tagsLabel}>Mots-clés</Text>
            <View style={s.tagsRow}>
              {blog.tags.map((t, i) => (
                <View key={i} style={s.tag}><Text style={s.tagText}>#{t}</Text></View>
              ))}
            </View>
          </View>
        )}
        <View style={s.shareSection}>
          <Text style={s.shareLabel}>Partager cet article</Text>
          <View style={s.shareRow}>
            {SOCIAL.map((soc, i) => (
              <TouchableOpacity key={i} style={[s.shareBtn, { backgroundColor: soc.color }]} onPress={() => Linking.openURL(soc.url(slug))} activeOpacity={0.85}>
                <Ionicons name={soc.icon as any} size={20} color="#fff" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.shareBtn, { backgroundColor: '#475569' }]} onPress={() => Share.share({ message: `${blog.titre}\nhttps://shopimmobilier.com/blog/${slug}` })} activeOpacity={0.85}>
              <Ionicons name="share-social" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Similar ── */}
      {similar.length > 0 && (
        <View style={s.similarSection}>
          <SH title="Articles similaires" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
            {similar.map(item => (
              <TouchableOpacity key={item.id_blog} style={s.similarCard} onPress={() => router.replace(`/blog/${item.slug}` as any)} activeOpacity={0.88}>
                <Image
                  source={item.image_principale ? { uri: `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${item.image_principale}` } : require('../../../assets/images/default-blog.jpg')}
                  style={s.similarImage}
                />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.65)']} style={s.similarGradient} />
                <View style={s.similarContent}>
                  <Text style={s.similarTitle} numberOfLines={2}>{item.titre}</Text>
                  <Text style={s.similarDate}>{formatDate(item.date_publication)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Comments ── */}
      <View style={s.commentsSection}>
        <SH title="Commentaires" count={totalComments} />
        {loadingComments ? (
          <View style={s.commentsLoader}><ActivityIndicator size="small" color="#065483" /></View>
        ) : comments.length === 0 ? (
          <View style={s.noComments}>
            <View style={s.noCommentsIcon}><Ionicons name="chatbubbles-outline" size={36} color="#cbd5e1" /></View>
            <Text style={s.noCommentsTitle}>Aucun commentaire</Text>
            <Text style={s.noCommentsText}>Soyez le premier à partager votre avis !</Text>
          </View>
        ) : (
          comments.map(c => <CommentNode key={c.id_commentaire} c={c} />)
        )}

        {/* Form */}
        <View style={s.formBox}>
          <Text style={s.formTitle}>{replyTo ? `↩ Répondre à ${replyTo.nom}` : '✍️ Laisser un commentaire'}</Text>
          {replyTo && (
            <TouchableOpacity style={s.cancelReply} onPress={() => { setReplyTo(null); setForm(p => ({ ...p, contenu: '' })); }}>
              <Ionicons name="close-circle" size={18} color="#ef4444" />
              <Text style={s.cancelReplyText}>Annuler la réponse</Text>
            </TouchableOpacity>
          )}
          {[
            { key: 'nom', placeholder: 'Votre nom *', icon: 'person-outline', keyboard: 'default' },
            { key: 'email', placeholder: 'Votre email', icon: 'mail-outline', keyboard: 'email-address' },
          ].map(f => (
            <View key={f.key} style={s.inputWrap}>
              <Ionicons name={f.icon as any} size={17} color="#94a3b8" />
              <TextInput style={s.input} placeholder={f.placeholder} placeholderTextColor="#94a3b8" keyboardType={f.keyboard as any} value={(form as any)[f.key]} onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))} />
            </View>
          ))}
          <View style={[s.inputWrap, s.textAreaWrap]}>
            <Ionicons name="document-text-outline" size={17} color="#94a3b8" style={{ marginTop: 2 }} />
            <TextInput style={[s.input, s.textArea]} placeholder="Votre commentaire *" placeholderTextColor="#94a3b8" multiline numberOfLines={4} textAlignVertical="top" value={form.contenu} onChangeText={v => setForm(p => ({ ...p, contenu: v }))} />
          </View>
          <TouchableOpacity style={s.submitBtn} onPress={submitComment} disabled={sending} activeOpacity={0.85}>
            {sending ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="send" size={17} color="#fff" />
                <Text style={s.submitBtnText}>{replyTo ? 'Envoyer la réponse' : 'Publier le commentaire'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, backgroundColor: '#f0f4f8', paddingTop: 100 },
  loaderText: { fontSize: 15, color: '#065483', fontWeight: '600' },
  emptyIcon: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  backBtn: { backgroundColor: '#065483', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 16 },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  hero: { height: 380, position: 'relative' },
  heroGradient: { ...StyleSheet.absoluteFillObject as any, justifyContent: 'flex-end', padding: 22 },
  heroBack: { position: 'absolute', top: 56, left: 20, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  heroShare: { position: 'absolute', top: 56, right: 20, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  heroContent: { gap: 10, marginBottom: 15, },
  heroCatPill: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  heroCatText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5, lineHeight: 34 },
  heroMeta: { flexDirection: 'row', gap: 16 },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroMetaText: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },

  authorCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', marginHorizontal: 20, marginTop: -24, borderRadius: 22, padding: 16, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 14 },
  authorAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: '#e0edf8' },
  authorName: { fontSize: 15, fontWeight: '800', color: '#0f172a', letterSpacing: -0.2 },
  authorRole: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginTop: 2 },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#e0edf8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  dateText: { fontSize: 11, color: '#065483', fontWeight: '700' },

  contentCard: { backgroundColor: '#fff', marginHorizontal: 20, marginTop: 14, borderRadius: 28, padding: 22, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 },
  excerptBox: { flexDirection: 'row', gap: 14, backgroundColor: '#f8fafc', borderRadius: 18, padding: 16, marginBottom: 22 },
  excerptBar: { width: 4, borderRadius: 2, backgroundColor: '#EC9107' },
  excerptText: { flex: 1, fontSize: 15, fontStyle: 'italic', color: '#475569', lineHeight: 24, fontWeight: '500' },

  tagsSection: { marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  tagsLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  tagText: { fontSize: 13, color: '#475569', fontWeight: '600' },

  shareSection: { marginTop: 22, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  shareLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  shareRow: { flexDirection: 'row', gap: 10 },
  shareBtn: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },

  similarSection: { paddingHorizontal: 20, marginTop: 28 },
  similarCard: { width: SW * 0.58, height: 190, borderRadius: 22, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  similarImage: { width: '100%', height: '100%' },
  similarGradient: { ...StyleSheet.absoluteFillObject as any, top: '40%' },
  similarContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 },
  similarTitle: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: -0.2, lineHeight: 20, marginBottom: 4 },
  similarDate: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  commentsSection: { backgroundColor: '#fff', marginHorizontal: 20, marginTop: 22, borderRadius: 28, padding: 22, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 },
  commentsLoader: { paddingVertical: 30, alignItems: 'center' },
  noComments: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  noCommentsIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  noCommentsTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', letterSpacing: -0.2 },
  noCommentsText: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },

  shRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  shTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  shPill: { backgroundColor: '#e0edf8', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  shPillText: { fontSize: 13, color: '#065483', fontWeight: '700' },

  comment: { marginBottom: 18, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  commentReply: { marginLeft: 16, paddingLeft: 14, borderLeftWidth: 3, borderLeftColor: '#e0edf8', borderBottomWidth: 0 },
  commentTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  commentAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#065483', justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  commentName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  commentTime: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
  commentText: { fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 10 },
  commentActions: { flexDirection: 'row', gap: 10 },
  commentAction: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  commentActionLiked: { backgroundColor: '#fef2f2' },
  commentActionText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  toggleReplies: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  toggleRepliesText: { fontSize: 13, color: '#065483', fontWeight: '700' },

  formBox: { marginTop: 24, paddingTop: 22, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  formTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', letterSpacing: -0.2, marginBottom: 16 },
  cancelReply: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef2f2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, alignSelf: 'flex-start', marginBottom: 14 },
  cancelReplyText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8fafc', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 4, borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 12 },
  textAreaWrap: { alignItems: 'flex-start', paddingTop: 12 },
  input: { flex: 1, fontSize: 15, color: '#0f172a', paddingVertical: 11, fontWeight: '500' },
  textArea: { height: 110, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: '#065483', borderRadius: 18, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, elevation: 5, shadowColor: '#065483', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
});
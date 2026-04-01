import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { getResource, postResource } from '../../services/api';

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
    utilisateur: {
      nom: string;
      prenom: string;
      photo_profil?: string;
    };
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

export default function BlogDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [similarBlogs, setSimilarBlogs] = useState<BlogPost[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [totalComments, setTotalComments] = useState(0);
  
  // Formulaire de commentaire
  const [commentForm, setCommentForm] = useState({
    nom: '',
    email: '',
    contenu: '',
  });
  const [sendingComment, setSendingComment] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (slug) {
      fetchBlogDetails();
    }
  }, [slug]);

  const fetchBlogDetails = async () => {
    try {
      setLoading(true);
      const response = await getResource(`/blogs-public/${slug}`);
      
      if (response?.data?.article) {
        setBlog(response.data.article);
        setSimilarBlogs(response.data.similaires || []);
        fetchComments(response.data.article.id_blog);
      } else {
        router.back();
      }
    } catch (error) {
      console.error('Erreur chargement blog:', error);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (blogId: number) => {
    try {
      setLoadingComments(true);
      const response = await getResource(`/blogs/${blogId}/commentaires`);
      if (response?.data?.commentaires) {
        setComments(response.data.commentaires.data || []);
        setTotalComments(response.data.statistiques?.total_commentaires || 0);
      }
    } catch (error) {
      console.error('Erreur chargement commentaires:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentForm.contenu.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un commentaire');
      return;
    }

    if (!commentForm.nom.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre nom');
      return;
    }

    try {
      setSendingComment(true);
      
      const commentData = {
        ...commentForm,
        id_blog: blog?.id_blog,
        id_parent: replyTo?.id_commentaire || null
      };

      const response = await postResource('/commentaires-blog', commentData);
      
      if (response?.data?.message) {
        Alert.alert('Succès', 'Votre commentaire a été envoyé et sera publié après validation');
        setCommentForm({ nom: '', email: '', contenu: '' });
        setReplyTo(null);
        // Recharger les commentaires après un délai
        setTimeout(() => {
          if (blog) fetchComments(blog.id_blog);
        }, 2000);
      }
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'envoyer le commentaire");
    } finally {
      setSendingComment(false);
    }
  };

  const handleLikeComment = async (commentId: number) => {
    try {
      await postResource(`/commentaires-blog-like/${commentId}`, null);
      // Mettre à jour localement
      setComments(prevComments => 
        prevComments.map(comment => {
          if (comment.id_commentaire === commentId) {
            return { ...comment, likes: (comment.likes || 0) + 1 };
          }
          if (comment.reponses) {
            return {
              ...comment,
              reponses: comment.reponses.map(reply => 
                reply.id_commentaire === commentId 
                  ? { ...reply, likes: (reply.likes || 0) + 1 }
                  : reply
              )
            };
          }
          return comment;
        })
      );
    } catch (error) {
      console.error('Erreur like:', error);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${blog?.titre}\n\nDécouvrez cet article sur ShopImmo`,
        url: `https://shopimmo.com/blog/${slug}`,
      });
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) {
      return `Il y a ${diffMins} min`;
    } else if (diffHours < 24) {
      return `Il y a ${diffHours}h`;
    } else if (diffDays < 7) {
      return `Il y a ${diffDays}j`;
    } else {
      return formatDate(dateString);
    }
  };

  const getBlogImage = () => {
    if (blog?.image_principale) {
      return { uri: `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${blog.image_principale}` };
    }
    return require('../../assets/images/default-blog.jpg');
  };


  const getAuthorAvatar = () => {
    if (blog?.auteur?.utilisateur?.photo_profil) {
      return { uri: `${process.env.EXPO_PUBLIC_STORAGE_URL}/storage/${blog.auteur.utilisateur.photo_profil}` };
    }
    return require('../../assets/images/default-agent.jpg');
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: Record<string, string> = {
      'investissement': 'Investissement',
      'marche': 'Marché',
      'conseils': 'Conseils',
      'renovation': 'Rénovation',
      'legal': 'Légal',
      'finance': 'Finance',
      'construction': 'Construction',
      'gestion': 'Gestion',
      'commercial': 'Commercial',
      'ecologie': 'Écologie',
      'location': 'Location'
    };
    return categoryMap[category] || category;
  };

  const toggleCommentReplies = (commentId: number) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const renderComment = (comment: Comment, level: number = 0) => (
    <View key={comment.id_commentaire} style={[styles.comment, level > 0 && styles.commentReply]}>
      <View style={styles.commentHeader}>
        <View style={styles.commentAvatar}>
          <Ionicons name="person-circle" size={40} color="#007AFF" />
        </View>
        <View style={styles.commentInfo}>
          <Text style={styles.commentAuthor}>{comment.nom}</Text>
          <Text style={styles.commentTime}>{getTimeAgo(comment.created_at)}</Text>
        </View>
      </View>

      <Text style={styles.commentContent}>{comment.contenu}</Text>

      <View style={styles.commentActions}>
        <TouchableOpacity 
          style={styles.commentAction}
          onPress={() => handleLikeComment(comment.id_commentaire)}
        >
          <Ionicons name="heart-outline" size={18} color="#666" />
          <Text style={styles.commentActionText}>{comment.likes || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.commentAction}
          onPress={() => {
            setReplyTo(comment);
            setCommentForm(prev => ({ ...prev, contenu: `@${comment.nom} ` }));
          }}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#666" />
          <Text style={styles.commentActionText}>Répondre</Text>
        </TouchableOpacity>
      </View>

      {comment.reponses && comment.reponses.length > 0 && (
        <>
          <TouchableOpacity 
            style={styles.showRepliesButton}
            onPress={() => toggleCommentReplies(comment.id_commentaire)}
          >
            <Text style={styles.showRepliesText}>
              {expandedComments.has(comment.id_commentaire) ? 'Masquer' : 'Afficher'} les réponses ({comment.reponses.length})
            </Text>
            <Ionicons 
              name={expandedComments.has(comment.id_commentaire) ? 'chevron-up' : 'chevron-down'} 
              size={16} 
              color="#007AFF" 
            />
          </TouchableOpacity>

          {expandedComments.has(comment.id_commentaire) && (
            <View style={styles.repliesContainer}>
              {comment.reponses.map(reply => renderComment(reply, level + 1))}
            </View>
          )}
        </>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!blog) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="newspaper-outline" size={80} color="#ccc" />
        <Text style={styles.errorTitle}>Article non trouvé</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Image */}
      <View style={styles.heroContainer}>
        <Image source={getBlogImage()} style={styles.heroImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.heroGradient}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.heroContent}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{getCategoryLabel(blog.categorie)}</Text>
            </View>
            <Text style={styles.heroTitle}>{blog.titre}</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Article Meta */}
      <View style={styles.metaContainer}>
        <View style={styles.authorContainer}>
          <Image source={getAuthorAvatar()} style={styles.authorAvatar} />
          <View>
            <Text style={styles.authorName}>
              {blog.auteur?.utilisateur?.prenom} {blog.auteur?.utilisateur?.nom}
            </Text>
            <Text style={styles.authorRole}>{blog.auteur?.titre || 'Expert Immobilier'}</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.statText}>{formatDate(blog.date_publication)}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.statText}>{blog.temps_lecture} min</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={16} color="#666" />
            <Text style={styles.statText}>{blog.vue || 0} vues</Text>
          </View>
        </View>
      </View>

      {/* Article Content */}
      <View style={styles.contentContainer}>
        {blog.extrait && (
          <Text style={styles.excerpt}>{blog.extrait}</Text>
        )}

<View style={styles.htmlContent}>
  <Text style={styles.contentText}>{blog.contenu}</Text>
</View>

        {/* Tags */}
        {blog.tags && blog.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            <Text style={styles.tagsTitle}>Mots-clés</Text>
            <View style={styles.tagsList}>
              {blog.tags.map((tag, index) => (
                <TouchableOpacity key={index} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Share Buttons */}
        <View style={styles.shareContainer}>
          <Text style={styles.shareTitle}>Partager cet article</Text>
          <View style={styles.shareButtons}>
            <TouchableOpacity style={[styles.shareButton, styles.shareFacebook]}>
              <Ionicons name="logo-facebook" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.shareButton, styles.shareTwitter]}>
              <Ionicons name="logo-twitter" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.shareButton, styles.shareLinkedin]}>
              <Ionicons name="logo-linkedin" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.shareButton, styles.shareWhatsapp]}>
              <Ionicons name="logo-whatsapp" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.shareButton, styles.shareCopy]} onPress={handleShare}>
              <Ionicons name="share-social" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Similar Articles */}
      {similarBlogs.length > 0 && (
        <View style={styles.similarContainer}>
          <Text style={styles.similarTitle}>Articles similaires</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {similarBlogs.map((item) => (
              <TouchableOpacity
                key={item.id_blog}
                style={styles.similarCard}
                onPress={() => router.push(`/blog/${item.slug}`)}
              >
                <Image source={require('../../assets/images/default-blog.jpg')} style={styles.similarImage} />
                <View style={styles.similarContent}>
                  <Text style={styles.similarCardTitle} numberOfLines={2}>
                    {item.titre}
                  </Text>
                  <Text style={styles.similarDate}>{formatDate(item.date_publication)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Comments Section */}
      <View style={styles.commentsContainer}>
        <View style={styles.commentsHeader}>
          <Text style={styles.commentsTitle}>Commentaires</Text>
          <View style={styles.commentsCount}>
            <Text style={styles.commentsCountText}>{totalComments}</Text>
          </View>
        </View>

        {loadingComments ? (
          <ActivityIndicator size="small" color="#007AFF" style={styles.commentsLoader} />
        ) : comments.length === 0 ? (
          <View style={styles.noComments}>
            <Ionicons name="chatbubble-outline" size={40} color="#ccc" />
            <Text style={styles.noCommentsText}>Soyez le premier à commenter</Text>
          </View>
        ) : (
          comments.map(comment => renderComment(comment))
        )}

        {/* Comment Form */}
        <View style={styles.commentForm}>
          <Text style={styles.formTitle}>
            {replyTo ? `Répondre à ${replyTo.nom}` : 'Laisser un commentaire'}
          </Text>

          {replyTo && (
            <TouchableOpacity
              style={styles.cancelReply}
              onPress={() => {
                setReplyTo(null);
                setCommentForm(prev => ({ ...prev, contenu: '' }));
              }}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
              <Text style={styles.cancelReplyText}>Annuler la réponse</Text>
            </TouchableOpacity>
          )}

          <TextInput
            style={styles.input}
            placeholder="Votre nom *"
            value={commentForm.nom}
            onChangeText={(text) => setCommentForm(prev => ({ ...prev, nom: text }))}
          />

          <TextInput
            style={styles.input}
            placeholder="Votre email *"
            keyboardType="email-address"
            value={commentForm.email}
            onChangeText={(text) => setCommentForm(prev => ({ ...prev, email: text }))}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Votre commentaire *"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={commentForm.contenu}
            onChangeText={(text) => setCommentForm(prev => ({ ...prev, contenu: text }))}
          />

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmitComment}
            disabled={sendingComment}
          >
            {sendingComment ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>
                  {replyTo ? 'Envoyer la réponse' : 'Publier le commentaire'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  heroContainer: {
    height: 300,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 8,
  },
  heroContent: {
    marginTop: 'auto',
  },
  categoryBadge: {
    backgroundColor: '#065483',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    lineHeight: 32,
  },
  metaContainer: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  authorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  authorRole: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    fontSize: 13,
    color: '#666',
  },
  contentContainer: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 10,
  },
  excerpt: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 20,
    lineHeight: 24,
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
  },
  htmlContent: {
    // Remove these lines:
    // lineHeight: 24,
    // fontSize: 16,
    // color: '#333',
  },
  contentText: {
    lineHeight: 24,
    fontSize: 16,
    color: '#333',
  },
  tagsContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  tagsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 13,
    color: '#666',
  },
  shareContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  shareTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  shareButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareFacebook: {
    backgroundColor: '#1877F2',
  },
  shareTwitter: {
    backgroundColor: '#1DA1F2',
  },
  shareLinkedin: {
    backgroundColor: '#0077B5',
  },
  shareWhatsapp: {
    backgroundColor: '#25D366',
  },
  shareCopy: {
    backgroundColor: '#666',
  },
  similarContainer: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 10,
  },
  similarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  similarCard: {
    width: 200,
    marginRight: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  similarImage: {
    width: '100%',
    height: 120,
  },
  similarContent: {
    padding: 10,
  },
  similarCardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  similarDate: {
    fontSize: 11,
    color: '#999',
  },
  commentsContainer: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  commentsCount: {
    backgroundColor: '#065483',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  commentsCountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  commentsLoader: {
    marginVertical: 20,
  },
  noComments: {
    alignItems: 'center',
    padding: 30,
  },
  noCommentsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  comment: {
    marginBottom: 20,
  },
  commentReply: {
    marginLeft: 20,
    paddingLeft: 15,
    borderLeftWidth: 2,
    borderLeftColor: '#065483',
  },
  commentHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  commentAvatar: {
    marginRight: 10,
  },
  commentInfo: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  commentTime: {
    fontSize: 11,
    color: '#999',
  },
  commentContent: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginBottom: 10,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 15,
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    fontSize: 12,
    color: '#666',
  },
  showRepliesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    marginBottom: 5,
  },
  showRepliesText: {
    fontSize: 13,
    color: '#065483',
    fontWeight: '500',
  },
  repliesContainer: {
    marginTop: 10,
  },
  commentForm: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  cancelReply: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 15,
  },
  cancelReplyText: {
    fontSize: 14,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: '#f8f8f8',
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
});
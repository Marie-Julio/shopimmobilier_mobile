import useDjamabizzGuard from '@/hooks/useDjamabizzGuard';
import { useFormulaireClavier } from '@/hooks/useFormulaireClavier';
import { deleteResource, getResource, postFile } from '@/services/api';
import { showAlert } from '@/utils/alert';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { jwtDecode } from 'jwt-decode';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const apiUrl = process.env.EXPO_PUBLIC_STORAGE_URL || process.env.EXPO_PUBLIC_API_URI_BASE;

// Options pour les sélecteurs
const TYPE_OPTIONS = [
  { label: 'Appartement', value: 'appartement' },
  { label: 'Maison', value: 'maison' },
  { label: 'Terrain', value: 'terrain' },
  { label: 'Commerce', value: 'commerce' },
  { label: 'Bureau', value: 'bureau' },
  { label: 'Entrepôt', value: 'entrepot' },
  { label: 'Autre', value: 'autre' },
];

const OPERATION_OPTIONS = [
  { label: 'À vendre', value: 'vente' },
  { label: 'À louer', value: 'location' },
  { label: 'Location saisonnière', value: 'location_saisonniere' },
  { label: 'Échange', value: 'echange' },
];

const ETAT_OPTIONS = [
  { label: 'Neuf', value: 'neuf' },
  { label: 'Excellent', value: 'excellent' },
  { label: 'Bon', value: 'bon' },
  { label: 'À rénover', value: 'renovation' },
  { label: 'À rénover complètement', value: 'a_renover' },
];

const DEVISE_OPTIONS = [
  { label: 'GNF', value: 'GNF' },
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
  { label: 'XOF', value: 'XOF' },
];

const STATUT_OPTIONS = [
  { label: 'Disponible', value: 'disponible' },
  { label: 'Réservé', value: 'reserve' },
  { label: 'Vendu', value: 'vendu' },
  { label: 'Loué', value: 'loue' },
  { label: 'Archivé', value: 'archived' },
];

export default function EditProperty() {
  // ── Garde d'accès ────────────────────────────────────────────────────────
  // Seuls les comptes djamabizz peuvent rester sur cet écran. Tout autre
  // compte est déconnecté automatiquement et renvoyé vers la connexion.
  useDjamabizzGuard();

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // États généraux
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [idAgent, setIdAgent] = useState<number | null>(null);
  const [property, setProperty] = useState<any>(null);

  // États du formulaire
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    type: 'appartement',
    operation: 'vente',
    etat: 'bon',
    prix: '',
    devise: 'GNF',
    surface: '',
    chambres: '',
    salles_de_bain: '',
    adresse: '',
    ville: '',
    quartier: '',
    meuble: false,
    climatisation: false,
    chauffage: false,
    internet: false,
    piscine: false,
    jardin: false,
    terrasse: false,
    parking: false,
    ascenseur: false,
    gardiennage: false,
    camera: false,
    statut: 'disponible',
    featured: false,
    expire_le: '',
    delete_images: [] as number[],
    new_images: [] as ImagePicker.ImagePickerAsset[],
    video: null as ImagePicker.ImagePickerAsset | null,
    delete_video: false,
  });

  // Remontée du champ au-dessus du clavier + « Entrée » = champ suivant.
  const clavier = useFormulaireClavier(['titre', 'description', 'prix', 'surface', 'chambres', 'salles_de_bain', 'adresse', 'ville', 'quartier', 'expire_le']);


  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [existingVideo, setExistingVideo] = useState<string | null>(null);

  // États pour les modales
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showOperationModal, setShowOperationModal] = useState(false);
  const [showEtatModal, setShowEtatModal] = useState(false);
  const [showDeviseModal, setShowDeviseModal] = useState(false);
  const [showStatutModal, setShowStatutModal] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Récupération de l'agent
  const fetchAgent = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/djamabizz?view=login');
        return null;
      }
      const decoded: any = jwtDecode(token);
      const agentRes = await getResource(`/agents-utilisateur/${decoded.id_utilisateur}`);
      return agentRes.data.id_agent;
    } catch (error) {
      console.error('Erreur fetchAgent:', error);
      return null;
    }
  };

  // Chargement de la propriété
  const fetchProperty = async () => {
    try {
      setLoading(true);
      const agentId = await fetchAgent();
      if (!agentId) return;
      setIdAgent(agentId);

      const response = await getResource(`/proprietes/${id}`);
      const data = response.data;
      setProperty(data);

      setFormData({
        titre: data.titre || '',
        description: data.description || '',
        type: data.type || 'appartement',
        operation: data.operation || 'vente',
        etat: data.etat || 'bon',
        prix: data.prix ? String(data.prix) : '',
        devise: data.devise || 'GNF',
        surface: data.surface ? String(data.surface) : '',
        chambres: data.chambres ? String(data.chambres) : '',
        salles_de_bain: data.salles_de_bain ? String(data.salles_de_bain) : '',
        adresse: data.adresse || '',
        ville: data.ville || '',
        quartier: data.quartier || '',
        meuble: Boolean(data.meuble),
        climatisation: Boolean(data.climatisation),
        chauffage: Boolean(data.chauffage),
        internet: Boolean(data.internet),
        piscine: Boolean(data.piscine),
        jardin: Boolean(data.jardin),
        terrasse: Boolean(data.terrasse),
        parking: Boolean(data.parking),
        ascenseur: Boolean(data.ascenseur),
        gardiennage: Boolean(data.gardiennage),
        camera: Boolean(data.camera),
        statut: data.statut || 'disponible',
        featured: Boolean(data.featured),
        expire_le: data.expire_le ? data.expire_le.split('T')[0] : '',
        delete_images: [],
        new_images: [],
        video: null,
        delete_video: false,
      });

      if (data.images) setExistingImages(data.images);
      if (data.video) setExistingVideo(data.video);
    } catch (error) {
      console.error('Erreur chargement propriété:', error);
      showAlert('Erreur', 'Impossible de charger la propriété');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperty();
  }, [id]);

  // Vérification d'autorisation
  if (!loading && property && idAgent !== property.id_agent) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Modifier</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="lock-closed" size={48} color="#dc2626" />
          <Text style={styles.unauthorizedText}>
            Vous n'êtes pas autorisé à modifier cette propriété.
          </Text>
        </View>
      </View>
    );
  }

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const toggleCheckbox = (name: string) => {
    setFormData((prev) => ({ ...prev, [name]: !prev[name as keyof typeof prev] }));
  };

  // ==================== IMAGES ====================
  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission refusée', 'Autorisez l\'accès à la galerie');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      const totalImages =
        existingImages.length -
        formData.delete_images.length +
        formData.new_images.length +
        result.assets.length;
      if (totalImages > 40) {
        showAlert('Limite atteinte', 'Maximum 40 images autorisées.');
        return;
      }

      const oversized = result.assets.filter(
        (asset) => (asset.fileSize || 0) > 5 * 1024 * 1024
      );
      if (oversized.length > 0) {
        showAlert('Fichier trop volumineux', 'Certaines images dépassent 5MB.');
        return;
      }

      setFormData((prev) => ({
        ...prev,
        new_images: [...prev.new_images, ...result.assets],
      }));
      setErrors((prev) => ({ ...prev, images: '' }));
    }
  };

  const removeNewImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      new_images: prev.new_images.filter((_, i) => i !== index),
    }));
  };

  const markImageForDeletion = (imageId: number) => {
    if (!formData.delete_images.includes(imageId)) {
      setFormData((prev) => ({
        ...prev,
        delete_images: [...prev.delete_images, imageId],
      }));
    }
  };

  const unmarkImageForDeletion = (imageId: number) => {
    setFormData((prev) => ({
      ...prev,
      delete_images: prev.delete_images.filter((id) => id !== imageId),
    }));
  };

  const getImageUrl = (image: any) => {
    if (image.url) {
      return `${apiUrl}/storage/${image.url}`;
    }
    return undefined;
  };

  // ==================== VIDÉO ====================
  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission refusée', 'Autorisez l\'accès à la galerie');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      const videoAsset = result.assets[0];
      if (videoAsset.fileSize && videoAsset.fileSize > 300 * 1024 * 1024) {
        showAlert('Trop volumineux', 'La vidéo ne doit pas dépasser 300MB');
        return;
      }
      const mimeType = videoAsset.mimeType || '';
      const allowed = ['video/mp4', 'video/avi', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'];
      if (!allowed.some((type) => mimeType.includes(type))) {
        showAlert('Format non supporté', 'Formats acceptés: MP4, AVI, MPEG, MOV');
        return;
      }
      setFormData((prev) => ({
        ...prev,
        video: videoAsset,
        delete_video: false,
      }));
    }
  };

  const removeVideo = () => {
    setFormData((prev) => ({
      ...prev,
      video: null,
      delete_video: true,
    }));
  };

  // ==================== VALIDATION ====================
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.titre.trim()) newErrors.titre = 'Le titre est requis';
    if (!formData.description.trim()) newErrors.description = 'La description est requise';
    if (!formData.prix) newErrors.prix = 'Le prix est requis';
    if (formData.prix && parseFloat(formData.prix) < 0) newErrors.prix = 'Le prix doit être positif';
    if (!formData.adresse.trim()) newErrors.adresse = 'L\'adresse est requise';
    if (!formData.ville.trim()) newErrors.ville = 'La ville est requise';

    const totalImages =
      existingImages.length - formData.delete_images.length + formData.new_images.length;
    if (totalImages === 0) newErrors.images = 'Au moins une image est requise';
    else if (totalImages > 40) newErrors.images = 'Maximum 40 images autorisées';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ==================== SOUMISSION ====================
  const handleSubmit = async () => {
    if (!validateForm()) {
      showAlert('Erreur', 'Veuillez corriger les champs en rouge.');
      return;
    }

    setSaving(true);
    try {
      const queryParams = new URLSearchParams();
      const excludeKeys = ['new_images', 'delete_images', 'video', 'delete_video'];
      Object.keys(formData).forEach((key) => {
        if (!excludeKeys.includes(key)) {
          const val = formData[key as keyof typeof formData];
          if (val !== '' && val !== null && val !== undefined) {
            queryParams.append(key, String(val));
          }
        }
      });
      const booleanFields = [
        'meuble',
        'climatisation',
        'chauffage',
        'internet',
        'piscine',
        'jardin',
        'terrasse',
        'parking',
        'ascenseur',
        'gardiennage',
        'camera',
        'featured',
      ];
      booleanFields.forEach((field) => {
        queryParams.append(field, formData[field as keyof typeof formData] ? '1' : '0');
      });

      if (formData.delete_images.length > 0) {
        // Le serveur valide `delete_images` comme un TABLEAU. L'ancien envoi
        // JSON.stringify([...]) donnait une chaine => 422 « must be an array » :
        // la suppression de photo echouait a chaque fois (teste contre le backend).
        formData.delete_images.forEach((idImage) => {
          queryParams.append('delete_images[]', String(idImage));
        });
      }
      if (formData.delete_video) {
        queryParams.append('delete_video', '1');
      }
      queryParams.append('id', id);

      const formDataToSend = new FormData();
      formData.new_images.forEach((asset) => {
        // @ts-ignore - FormData accepte les objets avec uri
        formDataToSend.append('new_images[]', {
          uri: asset.uri,
          name: asset.fileName || 'image.jpg',
          type: asset.mimeType || 'image/jpeg',
        });
      });
      if (formData.video) {
        // @ts-ignore
        formDataToSend.append('video', {
          uri: formData.video.uri,
          name: formData.video.fileName || 'video.mp4',
          type: formData.video.mimeType || 'video/mp4',
        });
      }

      const endpoint = `/updateproprietes?${queryParams.toString()}`;
      const res = await postFile(endpoint, formDataToSend);

      // L'intercepteur axios renvoie les 4xx comme des réponses normales :
      // sans ce contrôle, une erreur de validation affichait « Succès ».
      if (res.status !== 200 && res.status !== 201) {
        const details = res.data?.errors
          ? Object.values(res.data.errors as Record<string, string[]>).flat().join('\n')
          : res.data?.message;
        showAlert('Erreur', details || `Mise à jour refusée (code ${res.status}).`);
        return;
      }

      showAlert('Succès', 'Propriété mise à jour avec succès');
      router.back();
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      showAlert('Erreur', 'Impossible de mettre à jour la propriété');
    } finally {
      setSaving(false);
    }
  };

  // ==================== SUPPRESSION ====================
  const confirmDelete = () => {
    showAlert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer cette propriété ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: handleDelete },
      ]
    );
  };

  const handleDelete = async () => {
    try {
      await deleteResource(`/proprietes/${id}`);
      showAlert('Succès', 'Propriété supprimée');
      router.back();
    } catch (error) {
      showAlert('Erreur', 'Impossible de supprimer la propriété');
    }
  };

  // ==================== RENDU ====================
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#065483" />
        <Text style={{ marginTop: 12, color: '#64748b' }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifier la propriété</Text>
        <TouchableOpacity onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={24} color="#dc2626" />
        </TouchableOpacity>
      </View>

      <ScrollView
        {...clavier.propsScrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Titre */}
        <View style={styles.field}>
          <Text style={styles.label}>Titre *</Text>
          <TextInput
            {...clavier.champ('titre')}
            style={[styles.input, errors.titre && styles.inputError]}
            value={formData.titre}
            onChangeText={(text) => handleChange('titre', text)}
            placeholder="Ex: Magnifique appartement 3 chambres"
          />
          {errors.titre && <Text style={styles.errorText}>{errors.titre}</Text>}
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            {...clavier.champ('description', { multiligne: true })}
            style={[styles.input, styles.textArea, errors.description && styles.inputError]}
            value={formData.description}
            onChangeText={(text) => handleChange('description', text)}
            placeholder="Description détaillée..."
            numberOfLines={6}
            textAlignVertical="top"
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </View>

        {/* Type */}
        <TouchableOpacity style={styles.field} onPress={() => setShowTypeModal(true)}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.selectBox}>
            <Text style={styles.selectText}>
              {TYPE_OPTIONS.find((o) => o.value === formData.type)?.label || 'Sélectionner'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#64748b" />
          </View>
        </TouchableOpacity>

        {/* Opération */}
        <TouchableOpacity style={styles.field} onPress={() => setShowOperationModal(true)}>
          <Text style={styles.label}>Opération</Text>
          <View style={styles.selectBox}>
            <Text style={styles.selectText}>
              {OPERATION_OPTIONS.find((o) => o.value === formData.operation)?.label || 'Sélectionner'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#64748b" />
          </View>
        </TouchableOpacity>

        {/* État */}
        <TouchableOpacity style={styles.field} onPress={() => setShowEtatModal(true)}>
          <Text style={styles.label}>État</Text>
          <View style={styles.selectBox}>
            <Text style={styles.selectText}>
              {ETAT_OPTIONS.find((o) => o.value === formData.etat)?.label || 'Sélectionner'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#64748b" />
          </View>
        </TouchableOpacity>

        {/* Prix et devise */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 2, marginRight: 8 }]}>
            <Text style={styles.label}>Prix *</Text>
            <TextInput
            {...clavier.champ('prix')}
              style={[styles.input, errors.prix && styles.inputError]}
              value={formData.prix}
              onChangeText={(text) => handleChange('prix', text)}
              placeholder="0"
              keyboardType="numeric"
            />
            {errors.prix && <Text style={styles.errorText}>{errors.prix}</Text>}
          </View>
          <TouchableOpacity style={[styles.field, { flex: 1 }]} onPress={() => setShowDeviseModal(true)}>
            <Text style={styles.label}>Devise</Text>
            <View style={styles.selectBox}>
              <Text style={styles.selectText}>{formData.devise}</Text>
              <Ionicons name="chevron-down" size={20} color="#64748b" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Surface */}
        <View style={styles.field}>
          <Text style={styles.label}>Surface (m²)</Text>
          <TextInput
            {...clavier.champ('surface')}
            style={styles.input}
            value={formData.surface}
            onChangeText={(text) => handleChange('surface', text)}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>

        {/* Chambres et SDB */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Chambres</Text>
            <TextInput
            {...clavier.champ('chambres')}
              style={styles.input}
              value={formData.chambres}
              onChangeText={(text) => handleChange('chambres', text)}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Salles de bain</Text>
            <TextInput
            {...clavier.champ('salles_de_bain')}
              style={styles.input}
              value={formData.salles_de_bain}
              onChangeText={(text) => handleChange('salles_de_bain', text)}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Adresse, Ville, Quartier */}
        <View style={styles.field}>
          <Text style={styles.label}>Adresse *</Text>
          <TextInput
            {...clavier.champ('adresse')}
            style={[styles.input, errors.adresse && styles.inputError]}
            value={formData.adresse}
            onChangeText={(text) => handleChange('adresse', text)}
            placeholder="Ex: Rue 12, Quartier"
          />
          {errors.adresse && <Text style={styles.errorText}>{errors.adresse}</Text>}
        </View>
        <View style={styles.row}>
          <View style={[styles.field, { flex: 2, marginRight: 8 }]}>
            <Text style={styles.label}>Ville *</Text>
            <TextInput
            {...clavier.champ('ville')}
              style={[styles.input, errors.ville && styles.inputError]}
              value={formData.ville}
              onChangeText={(text) => handleChange('ville', text)}
              placeholder="Ex: Conakry"
            />
            {errors.ville && <Text style={styles.errorText}>{errors.ville}</Text>}
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Quartier</Text>
            <TextInput
            {...clavier.champ('quartier')}
              style={styles.input}
              value={formData.quartier}
              onChangeText={(text) => handleChange('quartier', text)}
              placeholder="Ex: Sonfonia"
            />
          </View>
        </View>

        {/* Équipements */}
        <Text style={[styles.label, { marginTop: 16 }]}>Équipements</Text>
        <View style={styles.checkboxGrid}>
          {[
            { key: 'meuble', label: 'Meublé', icon: 'bed-outline' },
            { key: 'climatisation', label: 'Climatisation', icon: 'snow-outline' },
            { key: 'chauffage', label: 'Chauffage', icon: 'flame-outline' },
            { key: 'internet', label: 'Internet', icon: 'wifi-outline' },
            { key: 'piscine', label: 'Piscine', icon: 'water-outline' },
            { key: 'jardin', label: 'Jardin', icon: 'leaf-outline' },
            { key: 'terrasse', label: 'Terrasse', icon: 'sunny-outline' },
            { key: 'parking', label: 'Parking', icon: 'car-outline' },
            { key: 'ascenseur', label: 'Ascenseur', icon: 'elevator-outline' },
            { key: 'gardiennage', label: 'Gardiennage', icon: 'shield-outline' },
            { key: 'camera', label: 'Caméra', icon: 'camera-outline' },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.checkboxItem}
              onPress={() => toggleCheckbox(item.key)}
            >
              <View
                style={[
                  styles.checkbox,
                  formData[item.key as keyof typeof formData] && styles.checkboxChecked,
                ]}
              >
                {formData[item.key as keyof typeof formData] && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
              <Ionicons name={item.icon as any} size={18} color="#0f172a" />
              <Text style={styles.checkboxLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Images */}
        <Text style={[styles.label, { marginTop: 16 }]}>Images *</Text>
        {errors.images && <Text style={styles.errorText}>{errors.images}</Text>}

        {/* Images existantes */}
        {existingImages.length > 0 && (
          <View style={styles.imageSection}>
            <Text style={styles.sectionSubtitle}>Images existantes ({existingImages.length})</Text>
            <View style={styles.imageGrid}>
              {existingImages.map((img) => {
                const isMarked = formData.delete_images.includes(img.id_image);
                return (
                  <View key={img.id_image} style={styles.imageItem}>
                    <Image source={{ uri: getImageUrl(img) }} style={styles.imageThumb} />
                    {isMarked && (
                      <View style={styles.imageOverlay}>
                        <Text style={styles.imageOverlayText}>Supprimée</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.imageAction,
                        isMarked ? styles.imageActionUndo : styles.imageActionDelete,
                      ]}
                      onPress={() =>
                        isMarked
                          ? unmarkImageForDeletion(img.id_image)
                          : markImageForDeletion(img.id_image)
                      }
                    >
                      <Ionicons
                        name={isMarked ? 'arrow-undo-outline' : 'trash-outline'}
                        size={16}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Nouvelles images */}
        {formData.new_images.length > 0 && (
          <View style={styles.imageSection}>
            <Text style={styles.sectionSubtitle}>Nouvelles images ({formData.new_images.length})</Text>
            <View style={styles.imageGrid}>
              {formData.new_images.map((asset, index) => (
                <View key={index} style={styles.imageItem}>
                  <Image source={{ uri: asset.uri }} style={styles.imageThumb} />
                  <TouchableOpacity
                    style={[styles.imageAction, styles.imageActionDelete]}
                    onPress={() => removeNewImage(index)}
                  >
                    <Ionicons name="close-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.uploadBtn} onPress={pickImages}>
          <Ionicons name="cloud-upload-outline" size={20} color="#065483" />
          <Text style={styles.uploadBtnText}>Ajouter des images</Text>
        </TouchableOpacity>

        {/* Vidéo */}
        <Text style={[styles.label, { marginTop: 16 }]}>Vidéo de présentation (facultatif)</Text>
        {(existingVideo && !formData.delete_video) || formData.video ? (
          <View style={styles.videoPreview}>
            <View style={styles.videoPlaceholder}>
              <Ionicons name="videocam" size={40} color="#94a3b8" />
              <Text style={styles.videoText}>
                {formData.video
                  ? `Nouvelle vidéo: ${formData.video.fileName || 'video'}`
                  : 'Vidéo existante'}
              </Text>
            </View>
            <TouchableOpacity style={styles.removeVideoBtn} onPress={removeVideo}>
              <Ionicons name="trash-outline" size={20} color="#dc2626" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadBtn} onPress={pickVideo}>
            <Ionicons name="videocam-outline" size={20} color="#065483" />
            <Text style={styles.uploadBtnText}>Ajouter une vidéo</Text>
          </TouchableOpacity>
        )}

        {/* Statut */}
        <TouchableOpacity style={styles.field} onPress={() => setShowStatutModal(true)}>
          <Text style={styles.label}>Statut</Text>
          <View style={styles.selectBox}>
            <Text style={styles.selectText}>
              {STATUT_OPTIONS.find((o) => o.value === formData.statut)?.label || 'Sélectionner'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#64748b" />
          </View>
        </TouchableOpacity>

        {/* Featured */}
        <TouchableOpacity style={styles.checkboxItem} onPress={() => toggleCheckbox('featured')}>
          <View style={[styles.checkbox, formData.featured && styles.checkboxChecked]}>
            {formData.featured && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
          <Ionicons name="star-outline" size={18} color="#0f172a" />
          <Text style={styles.checkboxLabel}>Mettre en vedette</Text>
        </TouchableOpacity>

        {/* Date d'expiration */}
        <View style={styles.field}>
          <Text style={styles.label}>Date d'expiration</Text>
          <TextInput
            {...clavier.champ('expire_le')}
            style={styles.input}
            value={formData.expire_le}
            onChangeText={(text) => handleChange('expire_le', text)}
            placeholder="YYYY-MM-DD"
          />
        </View>

        {/* Bouton enregistrer */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Mettre à jour</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modales */}
      <SelectModal
        visible={showTypeModal}
        options={TYPE_OPTIONS}
        selected={formData.type}
        onSelect={(value: string) => {
          handleChange('type', value);
          setShowTypeModal(false);
        }}
        onClose={() => setShowTypeModal(false)}
      />
      <SelectModal
        visible={showOperationModal}
        options={OPERATION_OPTIONS}
        selected={formData.operation}
        onSelect={(value: string) => {
          handleChange('operation', value);
          setShowOperationModal(false);
        }}
        onClose={() => setShowOperationModal(false)}
      />
      <SelectModal
        visible={showEtatModal}
        options={ETAT_OPTIONS}
        selected={formData.etat}
        onSelect={(value: string) => {
          handleChange('etat', value);
          setShowEtatModal(false);
        }}
        onClose={() => setShowEtatModal(false)}
      />
      <SelectModal
        visible={showDeviseModal}
        options={DEVISE_OPTIONS}
        selected={formData.devise}
        onSelect={(value: string) => {
          handleChange('devise', value);
          setShowDeviseModal(false);
        }}
        onClose={() => setShowDeviseModal(false)}
      />
      <SelectModal
        visible={showStatutModal}
        options={STATUT_OPTIONS}
        selected={formData.statut}
        onSelect={(value: string) => {
          handleChange('statut', value);
          setShowStatutModal(false);
        }}
        onClose={() => setShowStatutModal(false)}
      />
    </View>
  );
}

// Composant modal de sélection
function SelectModal({
  visible,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.modalOption, selected === opt.value && styles.modalOptionSelected]}
                onPress={() => onSelect(opt.value)}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    selected === opt.value && styles.modalOptionTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
                {selected === opt.value && <Ionicons name="checkmark" size={20} color="#065483" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// Styles (inchangés)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  unauthorizedText: { marginTop: 16, fontSize: 16, color: '#dc2626', textAlign: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  field: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 4 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  inputError: { borderColor: '#dc2626' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  errorText: { color: '#dc2626', fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row' },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  selectText: { fontSize: 15, color: '#0f172a' },
  checkboxGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 8,
    marginRight: '2%',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#065483', borderColor: '#065483' },
  checkboxLabel: { fontSize: 14, color: '#0f172a', marginLeft: 4 },
  imageSection: { marginTop: 12 },
  sectionSubtitle: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  imageItem: {
    width: 80,
    height: 80,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  imageThumb: { width: '100%', height: '100%' },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlayText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  imageAction: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageActionDelete: { backgroundColor: '#dc2626' },
  imageActionUndo: { backgroundColor: '#22c55e' },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#065483',
    borderRadius: 10,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  uploadBtnText: { color: '#065483', fontWeight: '600', marginLeft: 8 },
  videoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  videoPlaceholder: { flexDirection: 'row', alignItems: 'center' },
  videoText: { marginLeft: 8, fontSize: 14, color: '#334155' },
  removeVideoBtn: { padding: 8 },
  saveBtn: {
    backgroundColor: '#065483',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalOptionSelected: { backgroundColor: '#f0f4f8' },
  modalOptionText: { fontSize: 16, color: '#0f172a' },
  modalOptionTextSelected: { fontWeight: '600', color: '#065483' },
});
import useDjamabizzGuard from '@/hooks/useDjamabizzGuard';
import useAuth from '@/hooks/useAuth';
import { showAlert } from '@/utils/alert';
import { useFormulaireClavier } from '@/hooks/useFormulaireClavier';
import { deleteResource, getResource, patchResource, postFile, postResource, putResource } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
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

export default function DjamabizzProfile() {
  // ── Garde d'accès ────────────────────────────────────────────────────────
  // Seuls les comptes djamabizz peuvent rester sur cet écran. Tout autre
  // compte est déconnecté automatiquement et renvoyé vers la connexion.
  useDjamabizzGuard();

  const router = useRouter();

  const { logout } = useAuth();
  
  // États
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [utilisateurInfo, setUtilisateurInfo] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Profil agent rattaché au compte djamabizz : un djamabizz est un agent
  // comme un autre, il gère donc aussi titre, bio, spécialité, coordonnées
  // professionnelles et réseaux sociaux affichés publiquement.
  const [agentInfo, setAgentInfo] = useState<any>(null);
  const [agentForm, setAgentForm] = useState({
    titre: '',
    biographie: '',
    specialite: '',
    annees_experience: '',
    telephone_bureau: '',
    whatsapp: '',
    facebook: '',
    linkedin: '',
    twitter: '',
    instagram: '',
  });

  // État du formulaire profil
  const [profileForm, setProfileForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  // États pour les modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // État du formulaire mot de passe
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  // Confort de saisie. Deux suites distinctes : la page elle-même, et la
  // fenêtre de changement de mot de passe, qui a sa propre zone de défilement.
  const clavier = useFormulaireClavier(['profile_prenom', 'profile_nom', 'profile_email', 'profile_telephone', 'agent_titre', 'agent_specialite', 'agent_annees_experience', 'agent_biographie', 'agent_telephone_bureau', 'agent_whatsapp', 'agent_facebook', 'agent_linkedin', 'agent_twitter', 'agent_instagram']);
  const clavierMdp = useFormulaireClavier(['current_password', 'new_password', 'confirm_password']);

  // Récupération du token et decode
  const getTokenAndDecode = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/djamabizz?view=login');
      return null;
    }
    try {
      return jwtDecode(token) as any;
    } catch {
      router.replace('/djamabizz?view=login');
      return null;
    }
  };

  // Charger les données utilisateur + le profil agent rattaché
  const fetchUserData = async () => {
    try {
      setLoading(true);
      const decoded = await getTokenAndDecode();
      if (!decoded) return;

      const response = await getResource(`/me?id=${decoded.id_utilisateur}`);
      if (response.data) {
        setUtilisateurInfo(response.data);
        setProfileForm({
          nom: response.data.nom || '',
          prenom: response.data.prenom || '',
          email: response.data.email || '',
          telephone: response.data.telephone || '',
        });
        if (response.data.photo_profil) {
          const url = `${apiUrl}/storage/${response.data.photo_profil}`;
          setImagePreview(url);
        }
      }

      const agentResponse = await getResource(`/agents-utilisateur/${decoded.id_utilisateur}`);
      if (agentResponse.data) {
        setAgentInfo(agentResponse.data);
        setAgentForm({
          titre: agentResponse.data.titre || '',
          biographie: agentResponse.data.biographie || '',
          specialite: agentResponse.data.specialite || '',
          annees_experience: agentResponse.data.annees_experience
            ? String(agentResponse.data.annees_experience)
            : '',
          telephone_bureau: agentResponse.data.telephone_bureau || '',
          whatsapp: agentResponse.data.whatsapp || '',
          facebook: agentResponse.data.facebook || '',
          linkedin: agentResponse.data.linkedin || '',
          twitter: agentResponse.data.twitter || '',
          instagram: agentResponse.data.instagram || '',
        });
      }
    } catch (error) {
      showAlert('Erreur', 'Impossible de charger les données du profil');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // --- Gestion de l'image ---
  const handleImagePick = async () => {
    // Demander la permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission refusée', 'Vous devez autoriser l\'accès à la galerie.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      // Prévisualisation locale
      setImagePreview(asset.uri);

      // Upload automatique
      try {
        setImageLoading(true);
        const decoded = await getTokenAndDecode();
        if (!decoded) return;

        const formData = new FormData();
        formData.append('photo_profil', {
          uri: asset.uri,
          name: asset.fileName || 'profile.jpg',
          type: asset.mimeType || 'image/jpeg',
        } as any);
        formData.append('_method', 'PATCH');

        const response = await postFile(`/profil-user/${decoded.id_utilisateur}`, formData);
        if (response.status === 201) {
          showAlert('Succès', 'Photo de profil mise à jour');
          fetchUserData(); // rafraîchir pour obtenir l'URL serveur
        } else {
          // Restaurer l'ancienne image
          if (utilisateurInfo?.photo_profil) {
            setImagePreview(`${apiUrl}/storage/${utilisateurInfo.photo_profil}`);
          } else {
            setImagePreview(null);
          }
          showAlert('Erreur', 'Échec de la mise à jour de la photo');
        }
      } catch (error) {
        // Restaurer
        if (utilisateurInfo?.photo_profil) {
          setImagePreview(`${apiUrl}/storage/${utilisateurInfo.photo_profil}`);
        } else {
          setImagePreview(null);
        }
        showAlert('Erreur', 'Erreur lors de l\'upload');
        console.error(error);
      } finally {
        setImageLoading(false);
      }
    }
  };

  // --- Mise à jour du profil ---
  const validateProfile = () => {
    const errors: Record<string, string> = {};
    if (!profileForm.nom.trim()) errors.nom = 'Le nom est requis';
    if (!profileForm.prenom.trim()) errors.prenom = 'Le prénom est requis';
    if (!profileForm.email.trim()) errors.email = 'L\'email est requis';
    else if (!/\S+@\S+\.\S+/.test(profileForm.email)) errors.email = 'Email invalide';
    if (!profileForm.telephone.trim()) errors.telephone = 'Le téléphone est requis';
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSubmit = async () => {
    if (!validateProfile()) return;
    try {
      setSaving(true);
      const decoded = await getTokenAndDecode();
      if (!decoded) return;

      // La route est déclarée en PATCH côté serveur (@OA\Patch) et le site web
      // l'appelle en PATCH. L'appeler en PUT renvoyait « 405 Method Not
      // Allowed » : c'est pour cela que « modifier un utilisateur » échouait.
      const reponse = await patchResource(
        `/modifier_utilisateur/${decoded.id_utilisateur}`,
        profileForm
      );
      if (reponse.status >= 400) {
        const details = reponse.data?.errors
          ? Object.values(reponse.data.errors as Record<string, string[]>).flat().join('\n')
          : reponse.data?.message;
        showAlert('Erreur', details || `Échec de la mise à jour (code ${reponse.status}).`);
        return;
      }
      showAlert('Succès', 'Informations mises à jour');
      fetchUserData();
    } catch (error: any) {
      // On remonte le message exact du serveur plutôt qu'un texte générique.
      showAlert(
        'Erreur',
        error?.response?.data?.message
          || (error?.response?.status ? `Échec de la mise à jour (code ${error.response.status}).` : 'Échec de la mise à jour')
      );
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // --- Mise à jour du profil agent (titre, bio, coordonnées pro, réseaux) ---
  const handleAgentSubmit = async () => {
    if (!agentInfo?.id_agent) return;
    try {
      setSaving(true);
      const payload = {
        ...agentForm,
        annees_experience: agentForm.annees_experience
          ? Number(agentForm.annees_experience)
          : null,
      };
      const reponse = await putResource(`/agents/${agentInfo.id_agent}`, payload);
      if (reponse.status >= 400) {
        const details = reponse.data?.errors
          ? Object.values(reponse.data.errors as Record<string, string[]>).flat().join('\n')
          : reponse.data?.message;
        showAlert('Erreur', details || `Échec de la mise à jour (code ${reponse.status}).`);
        return;
      }
      showAlert('Succès', 'Informations professionnelles mises à jour');
      fetchUserData();
    } catch (error: any) {
      showAlert(
        'Erreur',
        error?.response?.data?.message
          || (error?.response?.status ? `Échec de la mise à jour (code ${error.response.status}).` : 'Échec de la mise à jour')
      );
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // --- Changement de mot de passe ---
  const validatePassword = () => {
    const errors: Record<string, string> = {};
    if (!passwordForm.current_password.trim()) errors.current_password = 'Le mot de passe actuel est requis';
    if (!passwordForm.new_password.trim()) {
      errors.new_password = 'Le nouveau mot de passe est requis';
    } else if (passwordForm.new_password.length < 8) {
      errors.new_password = 'Minimum 8 caractères';
    } else if (!/[A-Z]/.test(passwordForm.new_password)) {
      errors.new_password = 'Doit contenir une majuscule';
    } else if (!/[a-z]/.test(passwordForm.new_password)) {
      errors.new_password = 'Doit contenir une minuscule';
    } else if (!/[0-9]/.test(passwordForm.new_password)) {
      errors.new_password = 'Doit contenir un chiffre';
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      errors.confirm_password = 'Les mots de passe ne correspondent pas';
    }
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordSubmit = async () => {
    if (!validatePassword()) return;
    try {
      setSaving(true);
      const decoded = await getTokenAndDecode();
      if (!decoded) return;

      // Auparavant : POST /reset-password (route du mot de passe OUBLIÉ, qui
      // exige un `code` reçu par email) sans code ni mot de passe actuel
      // => 422 systématique. On passe par la route authentifiée dédiée.
      const payload = {
        current_password: passwordForm.current_password,
        password: passwordForm.new_password,
        password_confirmation: passwordForm.confirm_password,
      };
      const response = await postResource('/change-password', payload);
      if (response.status === 422 && response.data?.errors) {
        const errs: Record<string, string> = {};
        const e = response.data.errors as Record<string, string[]>;
        if (e.current_password) errs.current_password = e.current_password[0];
        if (e.password) errs.new_password = e.password[0];
        setPasswordErrors(errs);
        return;
      }
      // Session expiree : le serveur renvoie « Unauthenticated. » (anglais,
      // incomprehensible pour l'utilisateur). On explique et on renvoie a la connexion.
      if (response.status === 401) {
        setShowPasswordModal(false);
        showAlert('Session expirée', 'Votre session a expiré. Reconnectez-vous puis recommencez.', [
          { text: 'OK', onPress: handleLogout },
        ]);
        return;
      }
      if (response.status === 200 && (response.data?.status === true || response.data?.error === 0)) {
        showAlert('Succès', 'Mot de passe changé avec succès. Vous allez être déconnecté.', [
          { text: 'OK', onPress: handleLogout },
        ]);
        setShowPasswordModal(false);
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
        setPasswordErrors({});
      } else {
        showAlert('Erreur', response.data?.message || 'Échec du changement de mot de passe');
      }
    } catch (error) {
      showAlert('Erreur', 'Erreur lors du changement de mot de passe');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // --- Suppression de compte ---
  const handleDeleteAccount = async () => {
    try {
      setSaving(true);
      const decoded = await getTokenAndDecode();
      if (!decoded) return;

      await deleteResource(`/utilisateursdelete/${decoded.id_utilisateur}`);
      showAlert('Compte supprimé', 'Votre compte a été supprimé avec succès.');
      handleLogout();
    } catch (error) {
      showAlert('Erreur', 'Impossible de supprimer le compte');
      console.error(error);
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
    }
  };

  // --- Déconnexion ---
  const handleLogout = async () => {
    await logout();
  };


  // --- Rendu en cas de chargement ---
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#065483" />
        <Text style={{ marginTop: 12, color: '#64748b' }}>Chargement du profil...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* En-tête avec retour */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView {...clavier.propsScrollView} contentContainerStyle={styles.scrollContent}>
        {/* Bloc photo de profil */}
        <View style={styles.profileImageContainer}>
          <View style={styles.imageWrapper}>
            <Image
              source={
                imagePreview
                  ? { uri: imagePreview }
                  : require('../../../assets/images/shopuser.png') // ajuste le chemin
              }
              style={styles.profileImage}
            />
            <TouchableOpacity style={styles.cameraBtn} onPress={handleImagePick} disabled={imageLoading}>
              {imageLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>
            {utilisateurInfo?.prenom} {utilisateurInfo?.nom}
          </Text>
          <Text style={styles.userEmail}>{utilisateurInfo?.email}</Text>
        </View>

        {/* Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="person-outline" size={20} /> Informations personnelles
          </Text>
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Prénom</Text>
              <TextInput
                  {...clavier.champ('profile_prenom')}
                style={styles.input}
                value={profileForm.prenom}
                onChangeText={(text) => setProfileForm({ ...profileForm, prenom: text })}
                placeholder="Prénom"
              />
              {profileErrors.prenom && <Text style={styles.error}>{profileErrors.prenom}</Text>}
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Nom</Text>
              <TextInput
                  {...clavier.champ('profile_nom')}
                style={styles.input}
                value={profileForm.nom}
                onChangeText={(text) => setProfileForm({ ...profileForm, nom: text })}
                placeholder="Nom"
              />
              {profileErrors.nom && <Text style={styles.error}>{profileErrors.nom}</Text>}
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                  {...clavier.champ('profile_email')}
                style={styles.input}
                value={profileForm.email}
                onChangeText={(text) => setProfileForm({ ...profileForm, email: text })}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {profileErrors.email && <Text style={styles.error}>{profileErrors.email}</Text>}
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput
                  {...clavier.champ('profile_telephone')}
                style={styles.input}
                value={profileForm.telephone}
                onChangeText={(text) => setProfileForm({ ...profileForm, telephone: text })}
                placeholder="Téléphone"
                keyboardType="phone-pad"
              />
              {profileErrors.telephone && <Text style={styles.error}>{profileErrors.telephone}</Text>}
            </View>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleProfileSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>Sauvegarder</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Section Informations professionnelles (profil agent) */}
        {agentInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="briefcase-outline" size={20} /> Informations professionnelles
            </Text>
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Titre professionnel</Text>
                <TextInput
                  {...clavier.champ('agent_titre')}
                  style={styles.input}
                  value={agentForm.titre}
                  onChangeText={(text) => setAgentForm({ ...agentForm, titre: text })}
                  placeholder="Ex: Agent immobilier"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Spécialité</Text>
                <TextInput
                  {...clavier.champ('agent_specialite')}
                  style={styles.input}
                  value={agentForm.specialite}
                  onChangeText={(text) => setAgentForm({ ...agentForm, specialite: text })}
                  placeholder="Ex: Appartements, Maisons, Terrains"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Années d'expérience</Text>
                <TextInput
                  {...clavier.champ('agent_annees_experience')}
                  style={styles.input}
                  value={agentForm.annees_experience}
                  onChangeText={(text) => setAgentForm({ ...agentForm, annees_experience: text.replace(/[^0-9]/g, '') })}
                  placeholder="0"
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Biographie</Text>
                <TextInput
                  {...clavier.champ('agent_biographie', { multiligne: true })}
                  style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
                  value={agentForm.biographie}
                  onChangeText={(text) => setAgentForm({ ...agentForm, biographie: text })}
                  placeholder="Présentez-vous professionnellement..."
                  numberOfLines={4}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Téléphone bureau</Text>
                <TextInput
                  {...clavier.champ('agent_telephone_bureau')}
                  style={styles.input}
                  value={agentForm.telephone_bureau}
                  onChangeText={(text) => setAgentForm({ ...agentForm, telephone_bureau: text })}
                  placeholder="+241 XX XX XX XX"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>WhatsApp</Text>
                <TextInput
                  {...clavier.champ('agent_whatsapp')}
                  style={styles.input}
                  value={agentForm.whatsapp}
                  onChangeText={(text) => setAgentForm({ ...agentForm, whatsapp: text })}
                  placeholder="+241 XX XX XX XX"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Facebook</Text>
                <TextInput
                  {...clavier.champ('agent_facebook')}
                  style={styles.input}
                  value={agentForm.facebook}
                  onChangeText={(text) => setAgentForm({ ...agentForm, facebook: text })}
                  placeholder="URL Facebook"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>LinkedIn</Text>
                <TextInput
                  {...clavier.champ('agent_linkedin')}
                  style={styles.input}
                  value={agentForm.linkedin}
                  onChangeText={(text) => setAgentForm({ ...agentForm, linkedin: text })}
                  placeholder="URL LinkedIn"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Twitter</Text>
                <TextInput
                  {...clavier.champ('agent_twitter')}
                  style={styles.input}
                  value={agentForm.twitter}
                  onChangeText={(text) => setAgentForm({ ...agentForm, twitter: text })}
                  placeholder="URL Twitter"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Instagram</Text>
                <TextInput
                  {...clavier.champ('agent_instagram')}
                  style={styles.input}
                  value={agentForm.instagram}
                  onChangeText={(text) => setAgentForm({ ...agentForm, instagram: text })}
                  placeholder="URL Instagram"
                  autoCapitalize="none"
                />
              </View>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAgentSubmit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Sauvegarder</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Section Sécurité */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="shield-outline" size={20} /> Sécurité
          </Text>
          <View style={styles.securityRow}>
            <View>
              <Text style={styles.securityLabel}>Changer le mot de passe</Text>
            </View>
            <TouchableOpacity
              style={styles.changePwdBtn}
              onPress={() => setShowPasswordModal(true)}
            >
              <Ionicons name="lock-closed-outline" size={16} color="#065483" />
              <Text style={styles.changePwdText}>Changer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Boutons Déconnexion et Supprimer le compte */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#dc2626" />
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDeleteModal(true)}>
            <Ionicons name="trash-outline" size={18} color="#dc2626" />
            <Text style={styles.deleteText}>Supprimer le compte</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal Changer le mot de passe */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                <Ionicons name="lock-closed-outline" size={20} /> Changer le mot de passe
              </Text>
              <TouchableOpacity onPress={() => { setShowPasswordModal(false); setPasswordErrors({}); setPasswordForm({ current_password: '', new_password: '', confirm_password: '' }); }}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <ScrollView {...clavierMdp.propsScrollView} style={styles.modalBody}>
              <View style={styles.field}>
                <Text style={styles.label}>Mot de passe actuel</Text>
                <TextInput
                  {...clavierMdp.champ('current_password')}
                  style={styles.input}
                  secureTextEntry
                  value={passwordForm.current_password}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, current_password: text })}
                  placeholder="Entrez votre mot de passe actuel"
                />
                {passwordErrors.current_password && <Text style={styles.error}>{passwordErrors.current_password}</Text>}
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Nouveau mot de passe</Text>
                <TextInput
                  {...clavierMdp.champ('new_password')}
                  style={styles.input}
                  secureTextEntry
                  value={passwordForm.new_password}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, new_password: text })}
                  placeholder="Nouveau mot de passe"
                />
                {passwordErrors.new_password && <Text style={styles.error}>{passwordErrors.new_password}</Text>}
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Confirmer le mot de passe</Text>
                <TextInput
                  {...clavierMdp.champ('confirm_password')}
                  style={styles.input}
                  secureTextEntry
                  value={passwordForm.confirm_password}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, confirm_password: text })}
                  placeholder="Confirmez le nouveau mot de passe"
                />
                {passwordErrors.confirm_password && <Text style={styles.error}>{passwordErrors.confirm_password}</Text>}
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => { setShowPasswordModal(false); setPasswordErrors({}); setPasswordForm({ current_password: '', new_password: '', confirm_password: '' }); }}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirm]}
                onPress={handlePasswordSubmit}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalConfirmText}>Changer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Supprimer le compte */}
      <Modal visible={showDeleteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#dc2626' }]}>
                <Ionicons name="trash-outline" size={20} color="#dc2626" /> Supprimer le compte
              </Text>
              <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.deleteWarning}>
                <Ionicons name="warning-outline" size={24} color="#dc2626" />
                <Text style={styles.deleteWarningTitle}>Attention ! Action irréversible</Text>
              </View>
              <Text style={styles.deleteWarningDesc}>
                Toutes vos données seront définitivement supprimées :
              </Text>
              <View style={styles.deleteList}>
                <Text style={styles.deleteItem}>• Vos informations personnelles</Text>
                <Text style={styles.deleteItem}>• Votre historique d'activité</Text>
                <Text style={styles.deleteItem}>• Vos préférences et paramètres</Text>
              </View>
              <Text style={styles.deleteConfirmText}>
                Êtes-vous sûr de vouloir supprimer votre compte ? Cette action ne peut pas être annulée.
              </Text>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalDeleteConfirm]}
                onPress={handleDeleteAccount}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalConfirmText}>Supprimer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8', marginBottom: 50 
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
  },
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
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  imageWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#e2e8f0',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#065483',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  form: {
    gap: 12,
  },
  field: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  error: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: '#065483',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  securityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  securityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  securityDesc: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  changePwdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#065483',
    borderRadius: 8,
  },
  changePwdText: {
    color: '#065483',
    fontWeight: '600',
    fontSize: 13,
  },
  actionButtons: {
    gap: 12,
    marginTop: 8,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  logoutText: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 15,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
  },
  deleteText: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 15,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalBody: {
    marginBottom: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
  },
  modalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  modalCancel: {
    backgroundColor: '#f1f5f9',
  },
  modalCancelText: {
    color: '#334155',
    fontWeight: '600',
  },
  modalConfirm: {
    backgroundColor: '#065483',
  },
  modalDeleteConfirm: {
    backgroundColor: '#dc2626',
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '700',
  },
  deleteWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  deleteWarningTitle: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 15,
  },
  deleteWarningDesc: {
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 8,
  },
  deleteList: {
    marginLeft: 8,
    marginBottom: 12,
  },
  deleteItem: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 4,
  },
  deleteConfirmText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
});
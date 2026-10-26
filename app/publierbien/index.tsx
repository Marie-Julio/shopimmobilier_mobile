import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useFormulaireClavier } from '@/hooks/useFormulaireClavier';
import { postFile, postResource } from '../../services/api';

const { width } = Dimensions.get('window');

// ---------- Types ----------
type Phase = 'owner' | 'choice' | 'property' | 'success' | 'loading';

type OwnerDataType = {
  type: 'proprietaire' | 'agence' | 'demarcheur';
  nom_prenom: string;
  telephone: string;
  ville_residence: string;
  situation_matrimoniale: string;
  vit_dans_cour: boolean;
  ville_bien: string;
  quartier_bien: string;
  type_bien: string;
  nombre_chambres: string;
  nombre_douches: string;
  cuisine: boolean;
  balcon: boolean;
  cour_interne: boolean;
  espace_parking: boolean;
  garage_accessible: boolean;
  type_batiment: string;
  etat_bien: string;
  duree_location: string;
  montant_loyer: string;
  conditions_location: string;
  colocation_autorisee: boolean;
  profession_souhaitee: string;
  type_locataire: string;
  nombre_max_occupants: string;
  criteres_specifiques: string;
  acces_eau: string;
  electricite: string;
  gardien: boolean;
  portail: boolean;
  cameras: boolean;
  accessibilite: string;
  environnement: string;
  proximite_ecoles: boolean;
  proximite_marche: boolean;
  proximite_transport: boolean;
  proximite_lieu_culte: boolean;
  animaux_autorises: boolean;
  autres_exigences: string;
};

type PropertyDataType = {
  titre: string;
  description: string;
  type: string;
  operation: string;
  prix: string;
  devise: string;
  surface: string;
  chambres: string;
  salles_de_bain: string;
  adresse: string;
  ville: string;
  quartier: string;
  pays: string;
  etat: string;
  annee_construction: string;
  meuble: boolean;
  climatisation: boolean;
  parking: boolean;
  jardin: boolean;
  terrasse: boolean;
  piscine: boolean;
  images: ImagePicker.ImagePickerAsset[];
  video: ImagePicker.ImagePickerAsset | null;
};

// ---------- Composant principal ----------
export default function PublierPropriete() {
  // États de phase et navigation
  const [phase, setPhase] = useState<Phase>('owner');
  const [ownerStep, setOwnerStep] = useState(1);
  const [propertyStep, setPropertyStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  // Données propriétaire
  const [ownerData, setOwnerData] = useState<OwnerDataType>({
    type: 'proprietaire',
    nom_prenom: '',
    telephone: '',
    ville_residence: '',
    situation_matrimoniale: '',
    vit_dans_cour: false,
    ville_bien: '',
    quartier_bien: '',
    type_bien: '',
    nombre_chambres: '',
    nombre_douches: '',
    cuisine: false,
    balcon: false,
    cour_interne: false,
    espace_parking: false,
    garage_accessible: false,
    type_batiment: '',
    etat_bien: '',
    duree_location: '',
    montant_loyer: '',
    conditions_location: '',
    colocation_autorisee: false,
    profession_souhaitee: '',
    type_locataire: '',
    nombre_max_occupants: '',
    criteres_specifiques: '',
    acces_eau: '',
    electricite: '',
    gardien: false,
    portail: false,
    cameras: false,
    accessibilite: '',
    environnement: '',
    proximite_ecoles: false,
    proximite_marche: false,
    proximite_transport: false,
    proximite_lieu_culte: false,
    animaux_autorises: false,
    autres_exigences: '',
  });

  // Remontée du champ au-dessus du clavier + « Entrée » = champ suivant.
  const clavier = useFormulaireClavier(['nom_prenom', 'telephone', 'ville_residence', 'ville_bien', 'quartier_bien', 'montant_loyer', 'nombre_chambres', 'nombre_douches', 'conditions_location', 'profession_souhaitee', 'nombre_max_occupants', 'criteres_specifiques', 'autres_exigences']);


  // Données annonce
  const [propertyData, setPropertyData] = useState<PropertyDataType>({
    titre: '',
    description: '',
    type: 'appartement',
    operation: 'location',
    prix: '',
    devise: 'GNF',
    surface: '',
    chambres: '',
    salles_de_bain: '',
    adresse: '',
    ville: '',
    quartier: '',
    pays: 'Guinée',
    etat: 'bon',
    annee_construction: '',
    meuble: false,
    climatisation: false,
    parking: false,
    jardin: false,
    terrasse: false,
    piscine: false,
    images: [],
    video: null,
  });

  // Helpers
  const handleOwnerChange = (name: keyof OwnerDataType, value: any) => {
    setOwnerData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleOwnerNumber = (name: keyof OwnerDataType, text: string) => {
    if (text === '' || /^\d+$/.test(text)) {
      handleOwnerChange(name, text);
    }
  };

  const handlePropertyChange = (name: keyof PropertyDataType, value: any) => {
    setPropertyData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      setPropertyData((prev) => ({
        ...prev,
        images: [...prev.images, ...result.assets],
      }));
    }
  };

  const removeImage = (index: number) => {
    setPropertyData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPropertyData((prev) => ({ ...prev, video: result.assets[0] }));
    }
  };

  const removeVideo = () => {
    setPropertyData((prev) => ({ ...prev, video: null }));
  };

  const populatePropertyFromOwner = () => {
    setPropertyData((prev) => ({
      ...prev,
      ville: ownerData.ville_bien,
      quartier: ownerData.quartier_bien,
      type: ownerData.type_bien || 'appartement',
      chambres: ownerData.nombre_chambres,
      salles_de_bain: ownerData.nombre_douches,
      prix: ownerData.montant_loyer,
      parking: ownerData.espace_parking,
    }));
  };

  // Validations
  const validateOwnerStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (step === 1) {
      if (ownerData.type === 'proprietaire' && !ownerData.nom_prenom.trim())
        newErrors.nom_prenom = 'Nom requis';
      if (!ownerData.telephone.trim()) newErrors.telephone = 'Téléphone requis';
      if (!ownerData.ville_residence.trim())
        newErrors.ville_residence = 'Ville requise';
    }
    if (step === 2) {
      if (!ownerData.ville_bien.trim()) newErrors.ville_bien = 'Ville du bien requise';
      if (!ownerData.quartier_bien.trim()) newErrors.quartier_bien = 'Quartier requis';
      if (!ownerData.type_bien) newErrors.type_bien = 'Type de bien requis';
      if (!ownerData.montant_loyer) newErrors.montant_loyer = 'Montant requis';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePropertyStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (step === 1) {
      if (!propertyData.titre.trim()) newErrors.titre = 'Titre requis';
      if (!propertyData.description.trim())
        newErrors.description = 'Description requise';
      if (!propertyData.prix) newErrors.prix = 'Prix requis';
    }
    if (step === 2) {
      if (!propertyData.adresse.trim()) newErrors.adresse = 'Adresse requise';
      if (!propertyData.ville.trim()) newErrors.ville = 'Ville requise';
    }
    if (step === 3) {
      if (propertyData.images.length === 0) newErrors.images = 'Au moins une image requise';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Soumission propriétaire
  const submitOwnerData = async (): Promise<number | null> => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(ownerData).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') {
          params.append(k, typeof v === 'boolean' ? (v ? '1' : '0') : v);
        }
      });
      const res = await postResource(`/proprietaires?${params.toString()}`, null);
      if (res.status === 200 || res.status === 201) {
        const id = res.data.data?.id_proprietaire;
        setOwnerId(id);
        return id;
      }
      throw new Error('Réponse inattendue');
    } catch (error) {
      Alert.alert('Erreur', "Erreur lors de l'enregistrement du propriétaire");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Choix agent
  const handleAgencyCreate = async () => {
    setPhase('loading');
    const id = await submitOwnerData();
    if (id) {
      setSuccessMessage(
        'Propriétaire enregistré avec succès ! Un agent vous contactera très prochainement pour créer votre annonce.'
      );
      setPhase('success');
    } else {
      setPhase('choice');
    }
  };

  // Choix soi-même
  const handleSelfCreate = async () => {
    setPhase('loading');
    const id = await submitOwnerData();
    if (id) {
      Alert.alert('Succès', 'Propriétaire enregistré ! Créez maintenant votre annonce.');
      populatePropertyFromOwner();
      setPropertyStep(1);
      setPhase('property');
    } else {
      setPhase('choice');
    }
  };

  // Soumission finale annonce
  const handleSubmitProperty = async () => {
    if (!ownerId) {
      Alert.alert('Erreur', 'Identifiant propriétaire manquant.');
      return;
    }
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('id_proprietaire', ownerId.toString());
      queryParams.append('idagent', '6');

      Object.keys(propertyData).forEach((key) => {
        if (key !== 'images' && key !== 'video') {
          const value = propertyData[key as keyof PropertyDataType];
          if (typeof value === 'boolean') {
            queryParams.append(key, value ? '1' : '0');
          } else if (value && typeof value === 'string' && value.trim() !== '') {
            queryParams.append(key, value);
          } else if (value && typeof value === 'number') {
            queryParams.append(key, value);
          }
        }
      });

      const formData = new FormData();
      propertyData.images.forEach((img, idx) => {
        formData.append('images[]', {
          uri: img.uri,
          type: img.mimeType || 'image/jpeg',
          name: img.fileName || `photo_${idx}.jpg`,
        } as any);
      });
      if (propertyData.video) {
        formData.append('video', {
          uri: propertyData.video.uri,
          type: propertyData.video.mimeType || 'video/mp4',
          name: propertyData.video.fileName || 'video.mp4',
        } as any);
      }

      const endpoint = `/proprieteproprietaire?${queryParams.toString()}`;
      const res = await postFile(endpoint, formData);
      if (res && (res.status === 200 || res.status === 201)) {
        setSuccessMessage(
          'Félicitations ! Votre annonce a été publiée avec succès. Elle sera visible après validation.'
        );
        setPhase('success');
      } else {
        throw new Error();
      }
    } catch (error) {
      Alert.alert('Erreur', "Erreur lors de la publication de l'annonce");
    } finally {
      setLoading(false);
    }
  };

  // Navigation propriétaire
  const ownerNext = () => {
    if (ownerStep < 3) {
      if (validateOwnerStep(ownerStep)) setOwnerStep((s) => s + 1);
      else Alert.alert('Champ requis', 'Veuillez remplir les champs obligatoires');
    } else if (ownerStep === 3) {
      setOwnerStep(4);
    }
  };
  const ownerPrev = () => setOwnerStep((s) => Math.max(1, s - 1));

  // Navigation annonce
  const propertyNext = () => {
    if (propertyStep < 3) {
      if (validatePropertyStep(propertyStep)) setPropertyStep((s) => s + 1);
      else Alert.alert('Champ requis', 'Veuillez remplir les champs obligatoires');
    } else if (propertyStep === 3) {
      if (validatePropertyStep(3)) setPropertyStep(4);
      else Alert.alert('Champ requis', 'Veuillez remplir les champs obligatoires');
    }
  };
  const propertyPrev = () => setPropertyStep((s) => Math.max(1, s - 1));

  // Rendu des étapes propriétaire
  const renderOwnerStep = () => {
    switch (ownerStep) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>Informations du propriétaire</Text>
            <Text style={styles.sectionSubtitle}>Ces données restent confidentielles</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Type <Text style={styles.required}>*</Text></Text>
              <View style={styles.rowButtons}>
                {(['proprietaire', 'agence', 'demarcheur'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.optionButton, ownerData.type === t && styles.optionActive]}
                    onPress={() => handleOwnerChange('type', t)}
                  >
                    <Text style={[styles.optionText, ownerData.type === t && styles.optionTextActive]}>
                      {t === 'proprietaire' ? 'Propriétaire' : t === 'agence' ? 'Agence' : 'Démarcheur'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {ownerData.type === 'agence'
                  ? "Nom de l'agence & agent"
                  : ownerData.type === 'demarcheur'
                  ? 'Nom du démarcheur'
                  : 'Nom et prénom'}
                {ownerData.type === 'proprietaire' && <Text style={styles.required}>*</Text>}
              </Text>
              <TextInput
                {...clavier.champ('nom_prenom')}
                style={[styles.input, errors.nom_prenom && styles.inputError]}
                value={ownerData.nom_prenom}
                onChangeText={(text) => handleOwnerChange('nom_prenom', text)}
                placeholder="Ex: Mamadou Diallo"
              />
              {errors.nom_prenom && <Text style={styles.errorText}>{errors.nom_prenom}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Téléphone <Text style={styles.required}>*</Text></Text>
              <TextInput
                {...clavier.champ('telephone')}
                style={[styles.input, errors.telephone && styles.inputError]}
                value={ownerData.telephone}
                onChangeText={(text) => handleOwnerChange('telephone', text)}
                placeholder="+224 6XX XXX XXX"
                keyboardType="phone-pad"
              />
              {errors.telephone && <Text style={styles.errorText}>{errors.telephone}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ville de résidence <Text style={styles.required}>*</Text></Text>
              <TextInput
                {...clavier.champ('ville_residence')}
                style={[styles.input, errors.ville_residence && styles.inputError]}
                value={ownerData.ville_residence}
                onChangeText={(text) => handleOwnerChange('ville_residence', text)}
                placeholder="Conakry"
              />
              {errors.ville_residence && <Text style={styles.errorText}>{errors.ville_residence}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Situation matrimoniale</Text>
              <View style={styles.rowButtons}>
                {['celibataire', 'marie'].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.optionButton, ownerData.situation_matrimoniale === opt && styles.optionActive]}
                    onPress={() => handleOwnerChange('situation_matrimoniale', opt)}
                  >
                    <Text style={[styles.optionText, ownerData.situation_matrimoniale === opt && styles.optionTextActive]}>
                      {opt === 'celibataire' ? 'Célibataire' : 'Marié(e)'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Le propriétaire vit dans la cour</Text>
              <Switch
                value={ownerData.vit_dans_cour}
                onValueChange={(val) => handleOwnerChange('vit_dans_cour', val)}
                trackColor={{ false: '#e2e8f0', true: '#065483' }}
                thumbColor="#fff"
              />
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>Informations sur le bien</Text>
            <Text style={styles.sectionSubtitle}>Décrivez le bien à louer</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ville du bien <Text style={styles.required}>*</Text></Text>
              <TextInput
                {...clavier.champ('ville_bien')}
                style={[styles.input, errors.ville_bien && styles.inputError]}
                value={ownerData.ville_bien}
                onChangeText={(text) => handleOwnerChange('ville_bien', text)}
                placeholder="Conakry"
              />
              {errors.ville_bien && <Text style={styles.errorText}>{errors.ville_bien}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Quartier <Text style={styles.required}>*</Text></Text>
              <TextInput
                {...clavier.champ('quartier_bien')}
                style={[styles.input, errors.quartier_bien && styles.inputError]}
                value={ownerData.quartier_bien}
                onChangeText={(text) => handleOwnerChange('quartier_bien', text)}
                placeholder="Kaloum, Ratoma…"
              />
              {errors.quartier_bien && <Text style={styles.errorText}>{errors.quartier_bien}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Type de bien <Text style={styles.required}>*</Text></Text>
              <View style={styles.rowButtons}>
                {['chambre', 'appartement', 'studio', 'villa'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.optionButton, ownerData.type_bien === t && styles.optionActive]}
                    onPress={() => handleOwnerChange('type_bien', t)}
                  >
                    <Text style={[styles.optionText, ownerData.type_bien === t && styles.optionTextActive]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.type_bien && <Text style={styles.errorText}>{errors.type_bien}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Montant du loyer (GNF) <Text style={styles.required}>*</Text></Text>
              <TextInput
                {...clavier.champ('montant_loyer')}
                style={[styles.input, errors.montant_loyer && styles.inputError]}
                value={ownerData.montant_loyer}
                onChangeText={(text) => handleOwnerNumber('montant_loyer', text)}
                placeholder="Ex: 2000000"
                keyboardType="numeric"
              />
              {errors.montant_loyer && <Text style={styles.errorText}>{errors.montant_loyer}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nb. chambres</Text>
              <TextInput
                {...clavier.champ('nombre_chambres')}
                style={styles.input}
                value={ownerData.nombre_chambres}
                onChangeText={(text) => handleOwnerNumber('nombre_chambres', text)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nb. douches</Text>
              <TextInput
                {...clavier.champ('nombre_douches')}
                style={styles.input}
                value={ownerData.nombre_douches}
                onChangeText={(text) => handleOwnerNumber('nombre_douches', text)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Type de bâtiment</Text>
              <View style={styles.rowButtons}>
                {['immeuble', 'r_plus', 'rez_de_chaussee'].map((b) => (
                  <TouchableOpacity
                    key={b}
                    style={[styles.optionButton, ownerData.type_batiment === b && styles.optionActive]}
                    onPress={() => handleOwnerChange('type_batiment', b)}
                  >
                    <Text style={[styles.optionText, ownerData.type_batiment === b && styles.optionTextActive]}>
                      {b === 'immeuble' ? 'Immeuble' : b === 'r_plus' ? 'R+' : 'Rez-de-chaussée'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>État du bien</Text>
              <View style={styles.rowButtons}>
                {['neuf', 'bon', 'moyen', 'a_renover'].map((e) => (
                  <TouchableOpacity
                    key={e}
                    style={[styles.optionButton, ownerData.etat_bien === e && styles.optionActive]}
                    onPress={() => handleOwnerChange('etat_bien', e)}
                  >
                    <Text style={[styles.optionText, ownerData.etat_bien === e && styles.optionTextActive]}>
                      {e === 'a_renover' ? 'À rénover' : e.charAt(0).toUpperCase() + e.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Durée de location</Text>
              <View style={styles.rowButtons}>
                {['court_sejour', 'long_sejour'].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.optionButton, ownerData.duree_location === d && styles.optionActive]}
                    onPress={() => handleOwnerChange('duree_location', d)}
                  >
                    <Text style={[styles.optionText, ownerData.duree_location === d && styles.optionTextActive]}>
                      {d === 'court_sejour' ? 'Court séjour' : 'Long séjour'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Conditions de location</Text>
              <TextInput
                {...clavier.champ('conditions_location', { multiligne: true })}
                style={[styles.input, styles.textArea]}
                value={ownerData.conditions_location}
                onChangeText={(text) => handleOwnerChange('conditions_location', text)}
                placeholder="Caution, avance…"
                numberOfLines={3}
              />
            </View>

            <Text style={styles.label}>Équipements disponibles</Text>
            <View style={styles.checkboxGroup}>
              {(['cuisine', 'balcon', 'cour_interne', 'espace_parking', 'garage_accessible', 'colocation_autorisee'] as const).map((eq) => (
                <TouchableOpacity
                  key={eq}
                  style={[styles.checkboxRow, ownerData[eq] && styles.checkboxActive]}
                  onPress={() => handleOwnerChange(eq, !ownerData[eq])}
                >
                  <Ionicons
                    name={ownerData[eq] ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={ownerData[eq] ? '#065483' : '#64748b'}
                  />
                  <Text style={styles.checkboxLabel}>
                    {eq === 'cuisine' ? '🍳 Cuisine' : eq === 'balcon' ? '🌿 Balcon' : eq === 'cour_interne' ? '🏡 Cour interne' : eq === 'espace_parking' ? '🚗 Parking' : eq === 'garage_accessible' ? '🚪 Garage' : '👥 Colocation'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>Profil locataire & environnement</Text>
            <Text style={styles.sectionSubtitle}>Précisez vos préférences (optionnel)</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Profession souhaitée</Text>
              <TextInput
                {...clavier.champ('profession_souhaitee')}
                style={styles.input}
                value={ownerData.profession_souhaitee}
                onChangeText={(text) => handleOwnerChange('profession_souhaitee', text)}
                placeholder="Fonctionnaire, étudiant…"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Type de locataire</Text>
              <View style={styles.rowButtons}>
                {(['celibataire', 'couple', 'famille'] as const).map((l) => (
                  <TouchableOpacity
                    key={l}
                    style={[styles.optionButton, ownerData.type_locataire === l && styles.optionActive]}
                    onPress={() => handleOwnerChange('type_locataire', l)}
                  >
                    <Text style={[styles.optionText, ownerData.type_locataire === l && styles.optionTextActive]}>
                      {l === 'celibataire' ? 'Célibataire' : l === 'couple' ? 'Couple' : 'Famille'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre max d'occupants</Text>
              <TextInput
                {...clavier.champ('nombre_max_occupants')}
                style={styles.input}
                value={ownerData.nombre_max_occupants}
                onChangeText={(text) => handleOwnerNumber('nombre_max_occupants', text)}
                placeholder="Ex: 4"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Accès eau</Text>
              <View style={styles.rowButtons}>
                {['permanent', 'forage'].map((w) => (
                  <TouchableOpacity
                    key={w}
                    style={[styles.optionButton, ownerData.acces_eau === w && styles.optionActive]}
                    onPress={() => handleOwnerChange('acces_eau', w)}
                  >
                    <Text style={[styles.optionText, ownerData.acces_eau === w && styles.optionTextActive]}>
                      {w === 'permanent' ? 'Permanent' : 'Forage'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Électricité</Text>
              <View style={styles.rowButtons}>
                {['edg', 'groupe', 'solaire'].map((e) => (
                  <TouchableOpacity
                    key={e}
                    style={[styles.optionButton, ownerData.electricite === e && styles.optionActive]}
                    onPress={() => handleOwnerChange('electricite', e)}
                  >
                    <Text style={[styles.optionText, ownerData.electricite === e && styles.optionTextActive]}>
                      {e === 'edg' ? 'EDG' : e === 'groupe' ? 'Groupe électrogène' : 'Solaire'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Accessibilité</Text>
              <View style={styles.rowButtons}>
                {['route_goudronnee', 'facile_acces'].map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[styles.optionButton, ownerData.accessibilite === a && styles.optionActive]}
                    onPress={() => handleOwnerChange('accessibilite', a)}
                  >
                    <Text style={[styles.optionText, ownerData.accessibilite === a && styles.optionTextActive]}>
                      {a === 'route_goudronnee' ? 'Route goudronnée' : 'Accès facile'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Environnement</Text>
              <View style={styles.rowButtons}>
                {['calme', 'anime'].map((env) => (
                  <TouchableOpacity
                    key={env}
                    style={[styles.optionButton, ownerData.environnement === env && styles.optionActive]}
                    onPress={() => handleOwnerChange('environnement', env)}
                  >
                    <Text style={[styles.optionText, ownerData.environnement === env && styles.optionTextActive]}>
                      {env === 'calme' ? 'Calme' : 'Animé'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={styles.label}>Sécurité & proximité</Text>
            <View style={styles.checkboxGroup}>
              {(['gardien', 'portail', 'cameras', 'proximite_ecoles', 'proximite_marche', 'proximite_transport', 'proximite_lieu_culte', 'animaux_autorises'] as const).map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.checkboxRow, ownerData[item] && styles.checkboxActive]}
                  onPress={() => handleOwnerChange(item, !ownerData[item])}
                >
                  <Ionicons
                    name={ownerData[item] ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={ownerData[item] ? '#065483' : '#64748b'}
                  />
                  <Text style={styles.checkboxLabel}>
                    {item === 'gardien' ? '🛡 Gardien' : item === 'portail' ? '🚪 Portail' : item === 'cameras' ? '📹 Caméras' : item === 'proximite_ecoles' ? '🏫 Écoles' : item === 'proximite_marche' ? '🛒 Marché' : item === 'proximite_transport' ? '🚌 Transport' : item === 'proximite_lieu_culte' ? '🕌 Lieu de culte' : '🐾 Animaux'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Critères spécifiques</Text>
              <TextInput
                {...clavier.champ('criteres_specifiques', { multiligne: true })}
                style={[styles.input, styles.textArea]}
                value={ownerData.criteres_specifiques}
                onChangeText={(text) => handleOwnerChange('criteres_specifiques', text)}
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Autres exigences</Text>
              <TextInput
                {...clavier.champ('autres_exigences', { multiligne: true })}
                style={[styles.input, styles.textArea]}
                value={ownerData.autres_exigences}
                onChangeText={(text) => handleOwnerChange('autres_exigences', text)}
                numberOfLines={3}
              />
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>Récapitulatif</Text>
            <Text style={styles.sectionSubtitle}>Vérifiez vos informations avant de continuer</Text>

            <View style={styles.recapCard}>
              <Text style={styles.recapTitle}>Propriétaire</Text>
              <RecapRow label="Type" value={ownerData.type === 'proprietaire' ? 'Propriétaire' : ownerData.type === 'agence' ? 'Agence immobilière' : 'Démarcheur/Mandataire'} />
              <RecapRow label="Nom / Raison sociale" value={ownerData.nom_prenom || 'Non renseigné'} />
              <RecapRow label="Téléphone" value={ownerData.telephone} />
              <RecapRow label="Ville résidence" value={ownerData.ville_residence} />
              <RecapRow label="Situation matrimoniale" value={ownerData.situation_matrimoniale || '–'} />
              <RecapRow label="Vit dans la cour" value={ownerData.vit_dans_cour ? 'Oui' : 'Non'} />
            </View>

            <View style={styles.recapCard}>
              <Text style={styles.recapTitle}>Bien immobilier</Text>
              <RecapRow label="Lieu" value={`${ownerData.quartier_bien}, ${ownerData.ville_bien}`} />
              <RecapRow label="Type" value={ownerData.type_bien} />
              <RecapRow label="Loyer" value={`${ownerData.montant_loyer} GNF`} />
              <RecapRow label="Chambres / Douches" value={`${ownerData.nombre_chambres || 0} / ${ownerData.nombre_douches || 0}`} />
              <RecapRow label="État" value={ownerData.etat_bien || '–'} />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.outlineButton} onPress={() => setOwnerStep(3)}>
                <Text style={styles.outlineButtonText}>✏️ Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setPhase('choice')}>
                <Text style={styles.primaryButtonText}>Confirmer et continuer →</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  // Rendu des étapes annonce
  const renderPropertyStep = () => {
    switch (propertyStep) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>Informations générales de l'annonce</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Titre de l'annonce <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.titre && styles.inputError]}
                value={propertyData.titre}
                onChangeText={(text) => handlePropertyChange('titre', text)}
                placeholder="Ex: Bel appartement 3 pièces à Kaloum"
              />
              {errors.titre && <Text style={styles.errorText}>{errors.titre}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, styles.textArea, errors.description && styles.inputError]}
                value={propertyData.description}
                onChangeText={(text) => handlePropertyChange('description', text)}
                placeholder="Décrivez le bien en détail…"
                multiline
                numberOfLines={4}
              />
              {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Type de bien</Text>
              <View style={styles.rowButtons}>
                {['appartement', 'maison', 'studio', 'villa', 'terrain', 'commerce'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.optionButton, propertyData.type === t && styles.optionActive]}
                    onPress={() => handlePropertyChange('type', t)}
                  >
                    <Text style={[styles.optionText, propertyData.type === t && styles.optionTextActive]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Opération</Text>
              <View style={styles.rowButtons}>
                {['location', 'vente'].map((op) => (
                  <TouchableOpacity
                    key={op}
                    style={[styles.optionButton, propertyData.operation === op && styles.optionActive]}
                    onPress={() => handlePropertyChange('operation', op)}
                  >
                    <Text style={[styles.optionText, propertyData.operation === op && styles.optionTextActive]}>
                      {op === 'location' ? 'Location' : 'Vente'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Prix <Text style={styles.required}>*</Text></Text>
              <View style={styles.rowWithSelect}>
                <TextInput
                  style={[styles.input, styles.flex1, errors.prix && styles.inputError]}
                  value={propertyData.prix}
                  onChangeText={(text) => handlePropertyChange('prix', text)}
                  placeholder="0"
                  keyboardType="numeric"
                />
                <View style={styles.currencyGroup}>
                  {(['GNF', 'USD', 'EUR'] as const).map((dev) => (
                    <TouchableOpacity
                      key={dev}
                      style={[styles.currencyButton, propertyData.devise === dev && styles.currencyActive]}
                      onPress={() => handlePropertyChange('devise', dev)}
                    >
                      <Text style={[styles.currencyText, propertyData.devise === dev && styles.currencyTextActive]}>
                        {dev}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {errors.prix && <Text style={styles.errorText}>{errors.prix}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Surface (m²)</Text>
              <TextInput
                style={styles.input}
                value={propertyData.surface}
                onChangeText={(text) => handlePropertyChange('surface', text)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Chambres</Text>
              <TextInput
                style={styles.input}
                value={propertyData.chambres}
                onChangeText={(text) => handlePropertyChange('chambres', text)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Salles de bain</Text>
              <TextInput
                style={styles.input}
                value={propertyData.salles_de_bain}
                onChangeText={(text) => handlePropertyChange('salles_de_bain', text)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>Localisation & état du bien</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.adresse && styles.inputError]}
                value={propertyData.adresse}
                onChangeText={(text) => handlePropertyChange('adresse', text)}
                placeholder="Rue, numéro…"
              />
              {errors.adresse && <Text style={styles.errorText}>{errors.adresse}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ville <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.ville && styles.inputError]}
                value={propertyData.ville}
                onChangeText={(text) => handlePropertyChange('ville', text)}
                placeholder="Conakry"
              />
              {errors.ville && <Text style={styles.errorText}>{errors.ville}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Quartier</Text>
              <TextInput
                style={styles.input}
                value={propertyData.quartier}
                onChangeText={(text) => handlePropertyChange('quartier', text)}
                placeholder="Ratoma…"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>État</Text>
              <View style={styles.rowButtons}>
                {['neuf', 'excellent', 'bon', 'renovation'].map((et) => (
                  <TouchableOpacity
                    key={et}
                    style={[styles.optionButton, propertyData.etat === et && styles.optionActive]}
                    onPress={() => handlePropertyChange('etat', et)}
                  >
                    <Text style={[styles.optionText, propertyData.etat === et && styles.optionTextActive]}>
                      {et === 'renovation' ? 'À rénover' : et.charAt(0).toUpperCase() + et.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Année de construction</Text>
              <TextInput
                style={styles.input}
                value={propertyData.annee_construction}
                onChangeText={(text) => handlePropertyChange('annee_construction', text)}
                placeholder="2020"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Pays</Text>
              <TextInput
                style={styles.input}
                value={propertyData.pays}
                onChangeText={(text) => handlePropertyChange('pays', text)}
              />
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>Équipements & médias</Text>
            <Text style={styles.sectionSubtitle}>Ajoutez au moins une photo</Text>

            <Text style={styles.label}>Équipements</Text>
            <View style={styles.checkboxGroup}>
              {(['meuble', 'climatisation', 'parking', 'jardin', 'terrasse', 'piscine'] as const).map((eq) => (
                <TouchableOpacity
                  key={eq}
                  style={[styles.checkboxRow, propertyData[eq] && styles.checkboxActive]}
                  onPress={() => handlePropertyChange(eq, !propertyData[eq])}
                >
                  <Ionicons
                    name={propertyData[eq] ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={propertyData[eq] ? '#065483' : '#64748b'}
                  />
                  <Text style={styles.checkboxLabel}>
                    {eq === 'meuble' ? '🛋 Meublé' : eq === 'climatisation' ? '❄️ Clim' : eq === 'parking' ? '🚗 Parking' : eq === 'jardin' ? '🌳 Jardin' : eq === 'terrasse' ? '☀️ Terrasse' : '🏊 Piscine'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Photos du bien <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity style={styles.uploadButton} onPress={pickImages}>
                <Ionicons name="camera-outline" size={28} color="#065483" />
                <Text style={styles.uploadButtonText}>Ajouter des photos</Text>
              </TouchableOpacity>
              {errors.images && <Text style={styles.errorText}>{errors.images}</Text>}
              {propertyData.images.length > 0 && (
                <ScrollView
        {...clavier.propsScrollView} horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewContainer}>
                  {propertyData.images.map((img, idx) => (
                    <View key={idx} style={styles.imagePreview}>
                      <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(idx)}>
                        <Ionicons name="close-circle" size={24} color="#C0392B" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vidéo (optionnel)</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={pickVideo}>
                <Ionicons name="videocam-outline" size={28} color="#065483" />
                <Text style={styles.uploadButtonText}>Ajouter une vidéo</Text>
              </TouchableOpacity>
              {propertyData.video && (
                <View style={styles.videoPreview}>
                  <Text style={styles.videoName}>{propertyData.video.fileName || 'video.mp4'}</Text>
                  <TouchableOpacity onPress={removeVideo}>
                    <Ionicons name="trash-outline" size={24} color="#C0392B" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>Récapitulatif de l'annonce</Text>
            <Text style={styles.sectionSubtitle}>Vérifiez avant de publier</Text>

            <View style={styles.recapCard}>
              <RecapRow label="Titre" value={propertyData.titre} />
              <RecapRow label="Type / Opération" value={`${propertyData.type} – ${propertyData.operation}`} />
              <RecapRow label="Prix" value={`${propertyData.prix} ${propertyData.devise}`} />
              <RecapRow label="Surface" value={propertyData.surface ? `${propertyData.surface} m²` : '–'} />
              <RecapRow label="Chambres / SDB" value={`${propertyData.chambres || 0} / ${propertyData.salles_de_bain || 0}`} />
              <RecapRow label="Adresse" value={`${propertyData.adresse}, ${propertyData.quartier} ${propertyData.ville}`} />
              <RecapRow label="État" value={propertyData.etat} />
              <RecapRow label="Images" value={`${propertyData.images.length} photo(s)`} />
              <RecapRow label="Vidéo" value={propertyData.video ? 'Oui' : 'Non'} />
              <RecapRow
                label="Équipements"
                value={['meuble', 'climatisation', 'parking', 'jardin', 'terrasse', 'piscine']
                  .filter((k) => propertyData[k as keyof PropertyDataType] === true)
                  .join(', ') || 'Aucun'}
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.outlineButton} onPress={() => setPropertyStep(3)}>
                <Text style={styles.outlineButtonText}>✏️ Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.successButton} onPress={handleSubmitProperty} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.successButtonText}>🚀 Publier l'annonce</Text>}
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  // Indicateur d'étapes
  const StepIndicator = ({ steps, current }: { steps: { label: string }[]; current: number }) => (
    <View style={styles.stepIndicatorContainer}>
      {steps.map((step, idx) => {
        const stepNum = idx + 1;
        const isCompleted = current > stepNum;
        const isActive = current === stepNum;
        return (
          <View key={idx} style={styles.stepWrapper}>
            <View style={[styles.stepCircle, isCompleted && styles.stepCircleCompleted, isActive && styles.stepCircleActive]}>
              {isCompleted ? <Ionicons name="checkmark" size={16} color="#fff" /> : <Text style={[styles.stepNumber, isActive && styles.stepNumberActive]}>{stepNum}</Text>}
            </View>
            <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{step.label}</Text>
          </View>
        );
      })}
    </View>
  );

  // Affichage principal selon phase
  if (phase === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#065483" />
        <Text style={styles.loadingText}>Traitement en cours…</Text>
      </View>
    );
  }

  if (phase === 'success') {
    return (
      <View style={styles.successContainer}>
        <Ionicons name="checkmark-circle" size={100} color="#10b981" />
        <Text style={styles.successTitle}>Succès !</Text>
        <Text style={styles.successMessage}>{successMessage}</Text>
        <TouchableOpacity style={styles.homeButton} onPress={() => router.back()}>
          <Text style={styles.homeButtonText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'choice') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Publier une annonce</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.choiceContainer}>
          <Text style={styles.choiceTitle}>Que souhaitez-vous faire ?</Text>
          <Text style={styles.choiceSubtitle}>Choisissez comment créer l'annonce</Text>
          <TouchableOpacity style={styles.choiceButtonPrimary} onPress={handleSelfCreate}>
            <Text style={styles.choiceButtonPrimaryText}>✍️ Créer l'annonce moi-même</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.choiceButtonOutline} onPress={handleAgencyCreate}>
            <Text style={styles.choiceButtonOutlineText}>📞 Laisser un agent créer l'annonce</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPhase('owner')}>
            <Text style={styles.choiceBackLink}>← Retour et modifier</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (phase === 'property') {
    const propertySteps = [{ label: 'Annonce' }, { label: 'Localisation' }, { label: 'Médias' }, { label: 'Récap' }];
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Publier l'annonce</Text>
          <View style={{ width: 40 }} />
        </View>
        <StepIndicator steps={propertySteps} current={propertyStep} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {renderPropertyStep()}
        </ScrollView>
        <View style={styles.navButtons}>
          <TouchableOpacity style={[styles.navPrev, propertyStep === 1 && styles.navDisabled]} onPress={propertyPrev} disabled={propertyStep === 1}>
            <Ionicons name="arrow-back" size={20} color={propertyStep === 1 ? '#94a3b8' : '#065483'} />
            <Text style={[styles.navPrevText, propertyStep === 1 && styles.navDisabledText]}>Précédent</Text>
          </TouchableOpacity>
          {propertyStep < 4 && (
            <TouchableOpacity style={styles.navNext} onPress={propertyNext}>
              <Text style={styles.navNextText}>{propertyStep === 3 ? 'Voir le récapitulatif →' : 'Suivant →'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Phase propriétaire par défaut
  const ownerSteps = [{ label: 'Propriétaire' }, { label: 'Le bien' }, { label: 'Profil' }, { label: 'Récap' }];
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Publier une annonce</Text>
        <View style={{ width: 40 }} />
      </View>
      <StepIndicator steps={ownerSteps} current={ownerStep} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {renderOwnerStep()}
      </ScrollView>
      {ownerStep < 4 && (
        <View style={styles.navButtons}>
          <TouchableOpacity style={[styles.navPrev, ownerStep === 1 && styles.navDisabled]} onPress={ownerPrev} disabled={ownerStep === 1}>
            <Ionicons name="arrow-back" size={20} color={ownerStep === 1 ? '#94a3b8' : '#065483'} />
            <Text style={[styles.navPrevText, ownerStep === 1 && styles.navDisabledText]}>Précédent</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navNext} onPress={ownerNext}>
            <Text style={styles.navNextText}>{ownerStep === 3 ? 'Voir le récapitulatif →' : 'Suivant →'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Composant auxiliaire pour les lignes de récapitulatif
const RecapRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.recapRow}>
    <Text style={styles.recapLabel}>{label}</Text>
    <Text style={styles.recapValue}>{value}</Text>
  </View>
);

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  stepWrapper: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleCompleted: {
    backgroundColor: '#10b981',
  },
  stepCircleActive: {
    backgroundColor: '#065483',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  stepLabelActive: {
    color: '#065483',
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  stepContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 6,
  },
  required: {
    color: '#C0392B',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  inputError: {
    borderColor: '#C0392B',
  },
  errorText: {
    color: '#C0392B',
    fontSize: 12,
    marginTop: 4,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  rowButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    marginBottom: 8,
  },
  optionActive: {
    backgroundColor: '#065483',
  },
  optionText: {
    color: '#64748b',
  },
  optionTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    color: '#1e293b',
  },
  checkboxGroup: {
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  checkboxActive: {
    backgroundColor: '#EBF5FB',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#1e293b',
  },
  rowWithSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  currencyGroup: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    overflow: 'hidden',
  },
  currencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencyActive: {
    backgroundColor: '#065483',
  },
  currencyText: {
    color: '#64748b',
    fontWeight: '500',
  },
  currencyTextActive: {
    color: '#fff',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: '#065483',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 24,
    backgroundColor: '#EBF5FB',
  },
  uploadButtonText: {
    color: '#065483',
    fontWeight: '600',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    marginTop: 12,
  },
  imagePreview: {
    position: 'relative',
    marginRight: 12,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#065483',
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  videoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  videoName: {
    fontSize: 14,
    color: '#1e293b',
  },
  recapCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recapTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065483',
    marginBottom: 12,
  },
  recapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  recapLabel: {
    color: '#64748b',
    fontSize: 14,
  },
  recapValue: {
    color: '#1e293b',
    fontWeight: '500',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#065483',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  outlineButton: {
    borderWidth: 1.5,
    borderColor: '#065483',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  outlineButtonText: {
    color: '#065483',
    fontWeight: '700',
  },
  successButton: {
    backgroundColor: '#1E8449',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  successButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  navPrev: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  navPrevText: {
    color: '#065483',
    fontWeight: '500',
  },
  navNext: {
    backgroundColor: '#065483',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  navNextText: {
    color: '#fff',
    fontWeight: '700',
  },
  navDisabled: {
    opacity: 0.5,
  },
  navDisabledText: {
    color: '#94a3b8',
  },
  choiceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  choiceTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  choiceSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 32,
  },
  choiceButtonPrimary: {
    backgroundColor: '#065483',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  choiceButtonPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  choiceButtonOutline: {
    borderWidth: 1.5,
    borderColor: '#065483',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  choiceButtonOutlineText: {
    color: '#065483',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  choiceBackLink: {
    color: '#64748b',
    textDecorationLine: 'underline',
    marginTop: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1e293b',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10b981',
    marginTop: 16,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 32,
  },
  homeButton: {
    backgroundColor: '#065483',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  homeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
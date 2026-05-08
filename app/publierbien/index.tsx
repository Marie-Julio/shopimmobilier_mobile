import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { getResource, postResource } from '../../services/api';

interface Property {
  id_propriete: number;
  titre: string;
  adresse: string;
  ville: string;
  prix: number;
  devise: string;
  operation: string;
  type: string;
  surface?: number;
  chambres?: number;
  quartier: string;
  parking: boolean;
}

export default function ProprietaireScreen() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertySearchTerm, setPropertySearchTerm] = useState('');
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
// Ajoutez cette ligne après les déclarations useState
const filteredProperties = properties.filter(
  (prop) =>
    prop.titre?.toLowerCase().includes(propertySearchTerm.toLowerCase()) ||
    prop.adresse?.toLowerCase().includes(propertySearchTerm.toLowerCase()) ||
    prop.ville?.toLowerCase().includes(propertySearchTerm.toLowerCase())
);

  const [formData, setFormData] = useState({
    // Section 1: Informations du propriétaire
    nom_prenom: '',
    telephone: '',
    ville_residence: '',
    situation_matrimoniale: '',
    vit_dans_cour: false,
    // Section 2: Informations sur le bien
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
    // Section 3: Conditions de location
    duree_location: '',
    montant_loyer: '',
    conditions_location: '',
    colocation_autorisee: false,
    // Section 4: Profil du locataire recherché
    profession_souhaitee: '',
    type_locataire: '',
    nombre_max_occupants: '',
    criteres_specifiques: '',
    // Section 5: Détails supplémentaires
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
    id_propriete: null as number | null,
    id_proprietaire: null as number | null,
  });

  useEffect(() => {
    if (selectedProperty) {
      fetchPropertyAndOwner();
    }
  }, [selectedProperty]);

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true);
      const response = await getResource('/proprietes');
      if (response?.data?.data) {
        setProperties(response.data.data);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les propriétés');
    } finally {
      setLoadingProperties(false);
    }
  };

  const fetchPropertyAndOwner = async () => {
    if (!selectedProperty) return;

    try {
      setLoadingData(true);
      // Récupérer les infos de la propriété
      const propertyRes = await getResource(`/proprietes/${selectedProperty.id_propriete}`);
      if (propertyRes && propertyRes.data) {
        const prop = propertyRes.data;
        setProperty(prop);
        setFormData(prev => ({
          ...prev,
          ville_bien: prop.ville || '',
          quartier_bien: prop.quartier || '',
          type_bien: prop.type || '',
          nombre_chambres: prop.chambres?.toString() || '',
          nombre_douches: prop.salles_de_bain?.toString() || '',
          espace_parking: prop.parking || false,
          montant_loyer: prop.prix?.toString() || '',
          id_propriete: selectedProperty.id_propriete,
        }));
      }

      // Vérifier si un propriétaire existe déjà pour cette propriété
      const ownerRes = await getResource(`/proprietaires?id_propriete=${selectedProperty.id_propriete}`);
      if (ownerRes && ownerRes.data && ownerRes.data.data && ownerRes.data.data.length > 0) {
        const owner = ownerRes.data.data[0];
        setOwnerId(owner.id_proprietaire);
        setFormData(prev => ({
          ...prev,
          nom_prenom: owner.nom_prenom || '',
          telephone: owner.telephone || '',
          ville_residence: owner.ville_residence || '',
          situation_matrimoniale: owner.situation_matrimoniale || '',
          vit_dans_cour: owner.vit_dans_cour || false,
          ...owner,
          id_proprietaire: owner.id_proprietaire,
          id_propriete: selectedProperty.id_propriete,
        }));
      }
    } catch (err) {
      Alert.alert('Erreur', 'Erreur lors du chargement des données');
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (name: string, text: string) => {
    if (text === '' || /^\d+$/.test(text)) {
      handleChange(name, text);
    }
  };

  const handlePropertySelect = async (prop: Property) => {
    setSelectedProperty(prop);
    setPropertySearchTerm(`${prop.titre} - ${prop.adresse}, ${prop.ville}`);
    setShowPropertyDropdown(false);
    setFormData((prev) => ({ 
      ...prev, 
      id_propriete: prop.id_propriete,
      montant_loyer: prop.prix?.toString() || '',
    }));
  };

  const validateForm = () => {
    if (!formData.nom_prenom.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir le nom et prénom du propriétaire');
      return false;
    }
    if (!formData.telephone.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir le numéro de téléphone');
      return false;
    }
    if (!formData.ville_residence.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir la ville de résidence');
      return false;
    }
    if (!formData.ville_bien.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir la ville du bien');
      return false;
    }
    if (!formData.quartier_bien.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir le quartier du bien');
      return false;
    }
    if (!formData.type_bien) {
      Alert.alert('Champ requis', 'Veuillez sélectionner le type de bien');
      return false;
    }
    if (!formData.montant_loyer.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir le montant du loyer');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Construction des paramètres de requête
      const queryParams = new URLSearchParams();
      Object.keys(formData).forEach(key => {
        let value = formData[key as keyof typeof formData];
        if (value !== null && value !== undefined && value !== '') {
          if (typeof value === 'boolean') {
            queryParams.append(key, value ? '1' : '0');
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });

      const endpoint = formData.id_proprietaire
        ? `/updateproprietaires?${queryParams.toString()}`
        : `/proprietaires?${queryParams.toString()}`;

      const response = await postResource(endpoint, null);

      if (response.status === 200 || response.status === 201) {
        Alert.alert(
          'Succès', 
          formData.id_proprietaire ? 'Propriétaire mis à jour avec succès' : 'Propriétaire ajouté avec succès'
        );
        setFormSubmitted(true);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Erreur lors de l\'enregistrement du propriétaire';
      Alert.alert('Erreur', msg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nom_prenom: '',
      telephone: '',
      ville_residence: '',
      situation_matrimoniale: '',
      vit_dans_cour: false,
      ville_bien: property?.ville || '',
      quartier_bien: property?.quartier || '',
      type_bien: property?.type || '',
      nombre_chambres: property?.chambres?.toString() || '',
      nombre_douches: '',
      cuisine: false,
      balcon: false,
      cour_interne: false,
      espace_parking: property?.parking || false,
      garage_accessible: false,
      type_batiment: '',
      etat_bien: '',
      duree_location: '',
      montant_loyer: property?.prix?.toString() || '',
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
      id_propriete: selectedProperty?.id_propriete || null,
      id_proprietaire: null,
    });
    setOwnerId(null);
    setFormSubmitted(false);
  };

  if (formSubmitted) {
    return (
      <View style={styles.successContainer}>
        <Ionicons name="checkmark-circle" size={80} color="#28a745" />
        <Text style={styles.successTitle}>
          {ownerId ? "Propriétaire mis à jour !" : "Propriétaire ajouté avec succès !"}
        </Text>
        <Text style={styles.successText}>
          Les informations ont été correctement enregistrées.
        </Text>
        <TouchableOpacity style={styles.resetButton} onPress={resetForm}>
          <Text style={styles.resetButtonText}>Ajouter un autre propriétaire</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backArrow}>
          <Ionicons name="arrow-back" size={24} color="#065483" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {ownerId ? "Modifier le propriétaire" : "Nouveau propriétaire"}
        </Text>
      </View>

      <View style={styles.formCard}>
        <View style={styles.iconCircle}>
          <Ionicons name="person-add" size={40} color="#fff" />
        </View>
        <Text style={styles.formTitle}>
          {ownerId ? "Modifier le propriétaire" : "Nouveau propriétaire"}
        </Text>
        <Text style={styles.formSubtitle}>
          Tous les champs marqués d'un * sont obligatoires
        </Text>

        {/* Recherche de propriété */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="business" size={16} /> Propriété liée *
          </Text>
          <TouchableOpacity
            style={styles.propertySearchInput}
            onPress={() => {
              fetchProperties();
              setShowPropertyDropdown(true);
            }}
          >
            <Text style={selectedProperty ? styles.selectedPropertyText : styles.placeholderText}>
              {selectedProperty ? `${selectedProperty.titre} - ${selectedProperty.adresse}, ${selectedProperty.ville}` : "Sélectionner une propriété"}
            </Text>
            <Ionicons name="search" size={20} color="#065483" />
          </TouchableOpacity>
        </View>

        {loadingData && selectedProperty ? (
          <ActivityIndicator size="large" color="#065483" style={{ marginVertical: 20 }} />
        ) : (
          <>
            {/* Section 1: Informations du propriétaire */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="person-circle" size={16} /> Informations du propriétaire
              </Text>

              <Text style={styles.label}>Nom et prénom *</Text>
              <TextInput
                style={styles.input}
                value={formData.nom_prenom}
                onChangeText={(text) => handleChange('nom_prenom', text)}
                placeholder="Jean Dupont"
              />

              <Text style={styles.label}>Téléphone *</Text>
              <TextInput
                style={styles.input}
                value={formData.telephone}
                onChangeText={(text) => handleChange('telephone', text)}
                placeholder="+224 6XX XX XX XX"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Ville de résidence *</Text>
              <TextInput
                style={styles.input}
                value={formData.ville_residence}
                onChangeText={(text) => handleChange('ville_residence', text)}
                placeholder="Conakry"
              />

              <Text style={styles.label}>Situation matrimoniale</Text>
              <View style={styles.pickerContainer}>
                {['celibataire', 'marie'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.pickerOption,
                      formData.situation_matrimoniale === option && styles.pickerOptionSelected,
                    ]}
                    onPress={() => handleChange('situation_matrimoniale', option)}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      formData.situation_matrimoniale === option && styles.pickerOptionTextSelected,
                    ]}>
                      {option === 'celibataire' ? 'Célibataire' : 'Marié(e)'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.label}>Vit dans la cour</Text>
                <Switch
                  value={formData.vit_dans_cour}
                  onValueChange={(val) => handleChange('vit_dans_cour', val)}
                  trackColor={{ false: '#ccc', true: '#065483' }}
                />
              </View>
            </View>

            {/* Section 2: Informations sur le bien */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="home" size={16} /> Informations sur le bien
              </Text>

              <Text style={styles.label}>Ville du bien *</Text>
              <TextInput
                style={styles.input}
                value={formData.ville_bien}
                onChangeText={(text) => handleChange('ville_bien', text)}
                placeholder="Conakry"
              />

              <Text style={styles.label}>Quartier du bien *</Text>
              <TextInput
                style={styles.input}
                value={formData.quartier_bien}
                onChangeText={(text) => handleChange('quartier_bien', text)}
                placeholder="Kaloum"
              />

              <Text style={styles.label}>Type de bien *</Text>
              <View style={styles.pickerContainer}>
                {['chambre', 'appartement', 'studio', 'villa', 'autre'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.pickerOption,
                      formData.type_bien === type && styles.pickerOptionSelected,
                    ]}
                    onPress={() => handleChange('type_bien', type)}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      formData.type_bien === type && styles.pickerOptionTextSelected,
                    ]}>
                      {type === 'chambre' ? 'Chambre' : 
                       type === 'appartement' ? 'Appartement' : 
                       type === 'studio' ? 'Studio' : 
                       type === 'villa' ? 'Villa' : 'Autre'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Nombre de chambres</Text>
              <TextInput
                style={styles.input}
                value={formData.nombre_chambres}
                onChangeText={(text) => handleNumberChange('nombre_chambres', text)}
                placeholder="3"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Nombre de douches</Text>
              <TextInput
                style={styles.input}
                value={formData.nombre_douches}
                onChangeText={(text) => handleNumberChange('nombre_douches', text)}
                placeholder="2"
                keyboardType="numeric"
              />

              <View style={styles.checkboxGroup}>
                <View style={styles.checkboxRow}>
                  <Switch
                    value={formData.cuisine}
                    onValueChange={(val) => handleChange('cuisine', val)}
                    trackColor={{ false: '#ccc', true: '#065483' }}
                  />
                  <Text style={styles.checkboxLabel}>Cuisine</Text>
                </View>
                <View style={styles.checkboxRow}>
                  <Switch
                    value={formData.balcon}
                    onValueChange={(val) => handleChange('balcon', val)}
                    trackColor={{ false: '#ccc', true: '#065483' }}
                  />
                  <Text style={styles.checkboxLabel}>Balcon</Text>
                </View>
                <View style={styles.checkboxRow}>
                  <Switch
                    value={formData.cour_interne}
                    onValueChange={(val) => handleChange('cour_interne', val)}
                    trackColor={{ false: '#ccc', true: '#065483' }}
                  />
                  <Text style={styles.checkboxLabel}>Cour interne</Text>
                </View>
                <View style={styles.checkboxRow}>
                  <Switch
                    value={formData.espace_parking}
                    onValueChange={(val) => handleChange('espace_parking', val)}
                    trackColor={{ false: '#ccc', true: '#065483' }}
                  />
                  <Text style={styles.checkboxLabel}>Espace parking</Text>
                </View>
                <View style={styles.checkboxRow}>
                  <Switch
                    value={formData.garage_accessible}
                    onValueChange={(val) => handleChange('garage_accessible', val)}
                    trackColor={{ false: '#ccc', true: '#065483' }}
                  />
                  <Text style={styles.checkboxLabel}>Garage accessible</Text>
                </View>
              </View>

              <Text style={styles.label}>Type de bâtiment</Text>
              <View style={styles.pickerContainer}>
                {['immeuble', 'r_plus', 'rez_de_chaussee', 'autre'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.pickerOption,
                      formData.type_batiment === type && styles.pickerOptionSelected,
                    ]}
                    onPress={() => handleChange('type_batiment', type)}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      formData.type_batiment === type && styles.pickerOptionTextSelected,
                    ]}>
                      {type === 'immeuble' ? 'Immeuble' : 
                       type === 'r_plus' ? 'R+' : 
                       type === 'rez_de_chaussee' ? 'Rez-de-chaussée' : 'Autre'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>État du bien</Text>
              <View style={styles.pickerContainer}>
                {['neuf', 'bon', 'moyen', 'a_renover'].map((etat) => (
                  <TouchableOpacity
                    key={etat}
                    style={[
                      styles.pickerOption,
                      formData.etat_bien === etat && styles.pickerOptionSelected,
                    ]}
                    onPress={() => handleChange('etat_bien', etat)}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      formData.etat_bien === etat && styles.pickerOptionTextSelected,
                    ]}>
                      {etat === 'neuf' ? 'Neuf' : 
                       etat === 'bon' ? 'Bon' : 
                       etat === 'moyen' ? 'Moyen' : 'À rénover'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Section 3: Conditions de location */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="document-text" size={16} /> Conditions de location
              </Text>

              <Text style={styles.label}>Durée de location</Text>
              <View style={styles.pickerContainer}>
                {['court_sejour', 'long_sejour'].map((duree) => (
                  <TouchableOpacity
                    key={duree}
                    style={[
                      styles.pickerOption,
                      formData.duree_location === duree && styles.pickerOptionSelected,
                    ]}
                    onPress={() => handleChange('duree_location', duree)}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      formData.duree_location === duree && styles.pickerOptionTextSelected,
                    ]}>
                      {duree === 'court_sejour' ? 'Court séjour' : 'Long séjour'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Montant du loyer *</Text>
              <TextInput
                style={styles.input}
                value={formData.montant_loyer}
                onChangeText={(text) => handleNumberChange('montant_loyer', text)}
                placeholder="500000"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Conditions de location</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.conditions_location}
                onChangeText={(text) => handleChange('conditions_location', text)}
                placeholder="Conditions spécifiques..."
                multiline
                numberOfLines={3}
              />

              <View style={styles.switchRow}>
                <Text style={styles.label}>Colocation autorisée</Text>
                <Switch
                  value={formData.colocation_autorisee}
                  onValueChange={(val) => handleChange('colocation_autorisee', val)}
                  trackColor={{ false: '#ccc', true: '#065483' }}
                />
              </View>
            </View>

            {/* Section 4: Profil du locataire recherché */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="people" size={16} /> Profil du locataire recherché
              </Text>

              <Text style={styles.label}>Profession souhaitée</Text>
              <TextInput
                style={styles.input}
                value={formData.profession_souhaitee}
                onChangeText={(text) => handleChange('profession_souhaitee', text)}
                placeholder="Employé, Étudiant..."
              />

              <Text style={styles.label}>Type de locataire</Text>
              <View style={styles.pickerContainer}>
                {['celibataire', 'couple', 'famille', 'etudiant'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.pickerOption,
                      formData.type_locataire === type && styles.pickerOptionSelected,
                    ]}
                    onPress={() => handleChange('type_locataire', type)}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      formData.type_locataire === type && styles.pickerOptionTextSelected,
                    ]}>
                      {type === 'celibataire' ? 'Célibataire' : 
                       type === 'couple' ? 'Couple' : 
                       type === 'famille' ? 'Famille' : 'Étudiant'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Nombre max d'occupants</Text>
              <TextInput
                style={styles.input}
                value={formData.nombre_max_occupants}
                onChangeText={(text) => handleNumberChange('nombre_max_occupants', text)}
                placeholder="4"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Critères spécifiques</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.criteres_specifiques}
                onChangeText={(text) => handleChange('criteres_specifiques', text)}
                placeholder="Critères particuliers..."
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Section 5: Détails supplémentaires */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="settings" size={16} /> Détails supplémentaires
              </Text>

              <Text style={styles.label}>Accès eau</Text>
              <View style={styles.pickerContainer}>
                {['permanent', 'forage', 'autre'].map((acces) => (
                  <TouchableOpacity
                    key={acces}
                    style={[
                      styles.pickerOption,
                      formData.acces_eau === acces && styles.pickerOptionSelected,
                    ]}
                    onPress={() => handleChange('acces_eau', acces)}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      formData.acces_eau === acces && styles.pickerOptionTextSelected,
                    ]}>
                      {acces === 'permanent' ? 'Permanent' : 
                       acces === 'forage' ? 'Forage' : 'Autre'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Électricité</Text>
              <View style={styles.pickerContainer}>
                {['edg', 'groupe', 'solaire'].map((elec) => (
                  <TouchableOpacity
                    key={elec}
                    style={[
                      styles.pickerOption,
                      formData.electricite === elec && styles.pickerOptionSelected,
                    ]}
                    onPress={() => handleChange('electricite', elec)}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      formData.electricite === elec && styles.pickerOptionTextSelected,
                    ]}>
                      {elec === 'edg' ? 'EDG' : 
                       elec === 'groupe' ? 'Groupe électrogène' : 'Solaire'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.checkboxGroup}>
                <View style={styles.checkboxRow}>
                  <Switch
                    value={formData.gardien}
                    onValueChange={(val) => handleChange('gardien', val)}
                    trackColor={{ false: '#ccc', true: '#065483' }}
                  />
                  <Text style={styles.checkboxLabel}>Gardien</Text>
                </View>
                <View style={styles.checkboxRow}>
                  <Switch
                    value={formData.portail}
                    onValueChange={(val) => handleChange('portail', val)}
                    trackColor={{ false: '#ccc', true: '#065483' }}
                  />
                  <Text style={styles.checkboxLabel}>Portail</Text>
                </View>
                <View style={styles.checkboxRow}>
                  <Switch
                    value={formData.cameras}
                    onValueChange={(val) => handleChange('cameras', val)}
                    trackColor={{ false: '#ccc', true: '#065483' }}
                  />
                  <Text style={styles.checkboxLabel}>Caméras</Text>
                </View>
              </View>

              <Text style={styles.label}>Accessibilité</Text>
              <View style={styles.pickerContainer}>
                {['route_goudronnee', 'facile_acces', 'enclave'].map((acc) => (
                  <TouchableOpacity
                    key={acc}
                    style={[
                      styles.pickerOption,
                      formData.accessibilite === acc && styles.pickerOptionSelected,
                    ]}
                    onPress={() => handleChange('accessibilite', acc)}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      formData.accessibilite === acc && styles.pickerOptionTextSelected,
                    ]}>
                      {acc === 'route_goudronnee' ? 'Route goudronnée' : 
                       acc === 'facile_acces' ? 'Accès facile' : 'Enclavé'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Environnement</Text>
              <View style={styles.pickerContainer}>
                {['calme', 'anime', 'familial', 'commercial'].map((env) => (
                  <TouchableOpacity
                    key={env}
                    style={[
                      styles.pickerOption,
                      formData.environnement === env && styles.pickerOptionSelected,
                    ]}
                    onPress={() => handleChange('environnement', env)}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      formData.environnement === env && styles.pickerOptionTextSelected,
                    ]}>
                      {env === 'calme' ? 'Calme' : 
                       env === 'anime' ? 'Animé' : 
                       env === 'familial' ? 'Familial' : 'Commercial'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.checkboxGroup}>
                <View style={styles.checkboxRow}>
                  <Switch
                    value={formData.proximite_ecoles}
                    onValueChange={(val) => handleChange('proximite_ecoles', val)}
                    trackColor={{ false: '#ccc', true: '#065483' }}
                  />
                  <Text style={styles.checkboxLabel}>Proximité écoles</Text>
                </View>
                <View style={styles.checkboxRow}>
                  <Switch
                    value={formData.proximite_marche}
                    onValueChange={(val) => handleChange('proximite_marche', val)}
                    trackColor={{ false: '#ccc', true: '#065483' }}
                  />
                  <Text style={styles.checkboxLabel}>Proximité marché</Text>
                </View>
                <View style={styles.checkboxRow}>
                  <Switch
                    value={formData.proximite_transport}
                    onValueChange={(val) => handleChange('proximite_transport', val)}
                    trackColor={{ false: '#ccc', true: '#065483' }}
                  />
                  <Text style={styles.checkboxLabel}>Proximité transport</Text>
                </View>
                <View style={styles.checkboxRow}>
                  <Switch
                    value={formData.proximite_lieu_culte}
                    onValueChange={(val) => handleChange('proximite_lieu_culte', val)}
                    trackColor={{ false: '#ccc', true: '#065483' }}
                  />
                  <Text style={styles.checkboxLabel}>Lieu de culte</Text>
                </View>
                <View style={styles.checkboxRow}>
                  <Switch
                    value={formData.animaux_autorises}
                    onValueChange={(val) => handleChange('animaux_autorises', val)}
                    trackColor={{ false: '#ccc', true: '#065483' }}
                  />
                  <Text style={styles.checkboxLabel}>Animaux autorisés</Text>
                </View>
              </View>

              <Text style={styles.label}>Autres exigences</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.autres_exigences}
                onChangeText={(text) => handleChange('autres_exigences', text)}
                placeholder="Autres exigences..."
                multiline
                numberOfLines={3}
              />
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.submitButton, (loading || !selectedProperty) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading || !selectedProperty}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {ownerId ? "Mettre à jour le propriétaire" : "Enregistrer le propriétaire"}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.securityNote}>
          <Ionicons name="lock-closed" size={12} /> Je certifie que les informations fournies sont exactes et conformes à la réglementation.
        </Text>
      </View>

      {/* Modal de recherche de propriété */}
      <Modal
        visible={showPropertyDropdown}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPropertyDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sélectionner une propriété</Text>
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Rechercher..."
              value={propertySearchTerm}
              onChangeText={setPropertySearchTerm}
              autoFocus
            />
            {loadingProperties ? (
              <ActivityIndicator style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={filteredProperties}
                keyExtractor={(item) => item.id_propriete.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.modalItem} onPress={() => handlePropertySelect(item)}>
                    <Text style={styles.modalItemTitle}>{item.titre}</Text>
                    <Text style={styles.modalItemSub}>
                      {item.adresse}, {item.ville} - {formatPrice(item.prix)}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.modalEmpty}>Aucune propriété trouvée</Text>}
              />
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowPropertyDropdown(false)}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backArrow: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  formCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 20,
    marginBottom: 60,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#065483',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065483',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 8,
    gap: 10,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  pickerOptionSelected: {
    backgroundColor: '#065483',
  },
  pickerOptionText: {
    color: '#333',
  },
  pickerOptionTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  checkboxGroup: {
    marginTop: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxLabel: {
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#065483',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  securityNote: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginTop: 16,
  },
  propertySearchInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  placeholderText: {
    color: '#999',
  },
  selectedPropertyText: {
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalSearchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalItemTitle: {
    fontWeight: '500',
  },
  modalItemSub: {
    fontSize: 12,
    color: '#666',
  },
  modalEmpty: {
    textAlign: 'center',
    marginTop: 20,
    color: '#999',
  },
  modalClose: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#065483',
    borderRadius: 30,
  },
  modalCloseText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28a745',
    marginTop: 16,
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 12,
  },
  successSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  resetButton: {
    backgroundColor: '#065483',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    marginTop: 24,
  },
  resetButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 12,
  },
  backButtonText: {
    color: '#065483',
    textDecorationLine: 'underline',
  },
});

function formatPrice(price?: number, devise = 'GNF') {
  if (!price) return 'N/A';
  if (devise === 'GNF') return `${price.toLocaleString('fr-FR')} GNF`;
  if (devise === 'USD') return `$${price.toLocaleString('en-US')}`;
  if (devise === 'EUR') return `${price.toLocaleString('fr-FR')} €`;
  return `${price.toLocaleString('fr-FR')} ${devise}`;
}
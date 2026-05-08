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
  View,
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
}

export default function DemandeursScreen() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertySearchTerm, setPropertySearchTerm] = useState('');
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    nom_prenom: '',
    email: '',
    contact: '',
    lieux_recherches: '',
    provenance: '',
    ethnie: '',
    statut_familial: 'celibataire',
    type_logement: 'appartement',
    type_logement_autre: '',
    nombre_chambres: '',
    besoin_parking: false,
    enfants: false,
    nombre_enfants: '',
    preference_proprietaire: 'indifferent',
    budget_max: '',
    devise_budget: 'GNF',
    duree_location: 'long_terme',
    autres_criteres: '',
    id_propriete: null as number | null,
  });

  useEffect(() => {
    fetchProperties();
  }, []);

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

  const filteredProperties = properties.filter(
    (prop) =>
      prop.titre?.toLowerCase().includes(propertySearchTerm.toLowerCase()) ||
      prop.adresse?.toLowerCase().includes(propertySearchTerm.toLowerCase()) ||
      prop.ville?.toLowerCase().includes(propertySearchTerm.toLowerCase())
  );

  const handlePropertySelect = (prop: Property) => {
    setSelectedProperty(prop);
    setPropertySearchTerm(`${prop.titre} - ${prop.adresse}, ${prop.ville}`);
    setShowPropertyDropdown(false);
    setFormData((prev) => ({ ...prev, id_propriete: prop.id_propriete }));
  };

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (name: string, text: string) => {
    if (text === '' || /^\d+$/.test(text)) {
      handleChange(name, text);
    }
  };

  const validateForm = () => {
    if (!formData.nom_prenom.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir votre nom et prénom');
      return false;
    }
    if (!formData.lieux_recherches.trim()) {
      Alert.alert('Champ requis', 'Veuillez indiquer les lieux recherchés');
      return false;
    }
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      Alert.alert('Email invalide', 'Veuillez saisir une adresse email valide');
      return false;
    }
    if (formData.contact && !/^[0-9+\s-]+$/.test(formData.contact)) {
      Alert.alert('Téléphone invalide', 'Veuillez saisir un numéro valide');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await postResource('/demandeurs', formData);
      if (response.status === 201) {
        setFormSubmitted(true);
        Alert.alert('Succès', 'Votre demande a été soumise avec succès !');
      }
    } catch (error: any) {
      const msg =
        error.response?.data?.errors
          ? Object.values(error.response.data.errors).flat()[0]
          : error.response?.data?.message || 'Erreur lors de l\'envoi';
      Alert.alert('Erreur', msg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nom_prenom: '',
      email: '',
      contact: '',
      lieux_recherches: '',
      provenance: '',
      ethnie: '',
      statut_familial: 'celibataire',
      type_logement: 'appartement',
      type_logement_autre: '',
      nombre_chambres: '',
      besoin_parking: false,
      enfants: false,
      nombre_enfants: '',
      preference_proprietaire: 'indifferent',
      budget_max: '',
      devise_budget: 'GNF',
      duree_location: 'long_terme',
      autres_criteres: '',
      id_propriete: null,
    });
    setSelectedProperty(null);
    setPropertySearchTerm('');
    setFormSubmitted(false);
  };

  const formatPrice = (price?: number, devise = 'GNF') => {
    if (!price) return 'N/A';
    if (devise === 'GNF') return `${price.toLocaleString('fr-FR')} GNF`;
    if (devise === 'USD') return `$${price.toLocaleString('en-US')}`;
    if (devise === 'EUR') return `${price.toLocaleString('fr-FR')} €`;
    return `${price.toLocaleString('fr-FR')} ${devise}`;
  };

  if (formSubmitted) {
    return (
      <View style={styles.successContainer}>
        <Ionicons name="checkmark-circle" size={80} color="#28a745" />
        <Text style={styles.successTitle}>Demande soumise avec succès !</Text>
        <Text style={styles.successText}>
          Votre demande a bien été enregistrée. Elle sera traitée après validation par notre équipe.
        </Text>
        <Text style={styles.successSubtext}>Vous serez contacté dès que possible.</Text>
        <TouchableOpacity style={styles.resetButton} onPress={resetForm}>
          <Text style={styles.resetButtonText}>Nouvelle demande</Text>
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
        <Text style={styles.headerTitle}>Nouvelle demande</Text>
      </View>

      <View style={styles.formCard}>
        <View style={styles.iconCircle}>
          <Ionicons name="search" size={40} color="#fff" />
        </View>
        <Text style={styles.formTitle}>Exprimer mes besoins</Text>
        <Text style={styles.formSubtitle}>
          Nous trouverons la propriété idéale pour vous
        </Text>


        {/* --- Informations personnelles --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="person-circle" size={20} /> Informations personnelles
          </Text>

          <Text style={styles.label}>Nom & Prénom *</Text>
          <TextInput
            style={styles.input}
            value={formData.nom_prenom}
            onChangeText={(text) => handleChange('nom_prenom', text)}
            placeholder="Jean Dupont"
          />

          <Text style={styles.label}>Email (optionnel)</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => handleChange('email', text)}
            placeholder="exemple@domaine.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Téléphone *</Text>
          <TextInput
            style={styles.input}
            value={formData.contact}
            onChangeText={(text) => handleChange('contact', text)}
            placeholder="+224 6XX XX XX XX"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Provenance (optionnel)</Text>
          <TextInput
            style={styles.input}
            value={formData.provenance}
            onChangeText={(text) => handleChange('provenance', text)}
            placeholder="Ville ou pays"
          />

          <Text style={styles.label}>Ethnie (optionnel)</Text>
          <TextInput
            style={styles.input}
            value={formData.ethnie}
            onChangeText={(text) => handleChange('ethnie', text)}
          />

          <Text style={styles.label}>Statut familial *</Text>
          <View style={styles.pickerContainer}>
            {['celibataire', 'en_couple', 'marie', 'marie_en_devenir'].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.pickerOption,
                  formData.statut_familial === option && styles.pickerOptionSelected,
                ]}
                onPress={() => handleChange('statut_familial', option)}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    formData.statut_familial === option && styles.pickerOptionTextSelected,
                  ]}
                >
                  {option === 'celibataire' && 'Célibataire'}
                  {option === 'en_couple' && 'En couple'}
                  {option === 'marie' && 'Marié(e)'}
                  {option === 'marie_en_devenir' && 'Marié(e) en devenir'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>A des enfants ?</Text>
            <Switch
              value={formData.enfants}
              onValueChange={(val) => handleChange('enfants', val)}
              trackColor={{ false: '#ccc', true: '#065483' }}
            />
          </View>

          {formData.enfants && (
            <TextInput
              style={styles.input}
              value={formData.nombre_enfants}
              onChangeText={(text) => handleNumberChange('nombre_enfants', text)}
              placeholder="Nombre d'enfants"
              keyboardType="numeric"
            />
          )}
        </View>

        {/* --- Détails de la recherche --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="search" size={16} /> Détails de la recherche
          </Text>

          <Text style={styles.label}>Lieux recherchés *</Text>
          <TextInput
            style={styles.input}
            value={formData.lieux_recherches}
            onChangeText={(text) => handleChange('lieux_recherches', text)}
            placeholder="Ex: Kaloum, Dixinn, Lambagny"
          />

          <Text style={styles.label}>Type de logement</Text>
          <View style={styles.pickerContainer}>
            {['appartement', 'studio', 'maison', 'autre'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.pickerOption,
                  formData.type_logement === type && styles.pickerOptionSelected,
                ]}
                onPress={() => handleChange('type_logement', type)}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    formData.type_logement === type && styles.pickerOptionTextSelected,
                  ]}
                >
                  {type === 'appartement' && 'Appartement'}
                  {type === 'studio' && 'Studio'}
                  {type === 'maison' && 'Maison'}
                  {type === 'autre' && 'Autre'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {formData.type_logement === 'autre' && (
            <TextInput
              style={styles.input}
              value={formData.type_logement_autre}
              onChangeText={(text) => handleChange('type_logement_autre', text)}
              placeholder="Précisez le type"
            />
          )}

          <Text style={styles.label}>Nombre de chambres</Text>
          <TextInput
            style={styles.input}
            value={formData.nombre_chambres}
            onChangeText={(text) => handleNumberChange('nombre_chambres', text)}
            placeholder="Ex: 3"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Budget maximum</Text>
          <View style={styles.budgetRow}>
            <TextInput
              style={[styles.input, { flex: 2, marginRight: 8 }]}
              value={formData.budget_max}
              onChangeText={(text) => handleNumberChange('budget_max', text)}
              placeholder="Montant"
              keyboardType="numeric"
            />
            <View style={styles.currencyPicker}>
              {['GNF', 'USD', 'EUR'].map((dev) => (
                <TouchableOpacity
                  key={dev}
                  style={[
                    styles.currencyOption,
                    formData.devise_budget === dev && styles.currencyOptionSelected,
                  ]}
                  onPress={() => handleChange('devise_budget', dev)}
                >
                  <Text
                    style={[
                      styles.currencyOptionText,
                      formData.devise_budget === dev && styles.currencyOptionTextSelected,
                    ]}
                  >
                    {dev}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.label}>Durée souhaitée</Text>
          <View style={styles.pickerContainer}>
            {['court_terme', 'moyen_terme', 'long_terme'].map((duree) => (
              <TouchableOpacity
                key={duree}
                style={[
                  styles.pickerOption,
                  formData.duree_location === duree && styles.pickerOptionSelected,
                ]}
                onPress={() => handleChange('duree_location', duree)}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    formData.duree_location === duree && styles.pickerOptionTextSelected,
                  ]}
                >
                  {duree === 'court_terme' && 'Court terme'}
                  {duree === 'moyen_terme' && 'Moyen terme'}
                  {duree === 'long_terme' && 'Long terme'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Préférence propriétaire</Text>
          <View style={styles.pickerContainer}>
            {['oui', 'non', 'indifferent'].map((pref) => (
              <TouchableOpacity
                key={pref}
                style={[
                  styles.pickerOption,
                  formData.preference_proprietaire === pref && styles.pickerOptionSelected,
                ]}
                onPress={() => handleChange('preference_proprietaire', pref)}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    formData.preference_proprietaire === pref && styles.pickerOptionTextSelected,
                  ]}
                >
                  {pref === 'oui' && 'Avec propriétaire'}
                  {pref === 'non' && 'Sans propriétaire'}
                  {pref === 'indifferent' && 'Indifférent'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Besoin de parking</Text>
            <Switch
              value={formData.besoin_parking}
              onValueChange={(val) => handleChange('besoin_parking', val)}
              trackColor={{ false: '#ccc', true: '#065483' }}
            />
          </View>

          <Text style={styles.label}>Autres critères</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.autres_criteres}
            onChangeText={(text) => handleChange('autres_criteres', text)}
            placeholder="Proximité écoles, transport, commerces, sécurité..."
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Envoyer ma demande</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.securityNote}>
          <Ionicons name="lock-closed" size={12} /> Vos données sont sécurisées.
        </Text>
      </View>

      {/* Modal de recherche de propriété */}
      <Modal visible={showPropertyDropdown} animationType="slide" transparent>
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
                      {item.adresse}, {item.ville}
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
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyPicker: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  currencyOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  currencyOptionSelected: {
    backgroundColor: '#065483',
  },
  currencyOptionText: {
    color: '#333',
  },
  currencyOptionTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
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
  selectedPropertyCard: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#e8f0fe',
    borderRadius: 12,
  },
  propertyDetail: {
    fontSize: 14,
    color: '#065483',
  },
  propertyPrice: {
    fontSize: 13,
    color: '#333',
    marginTop: 4,
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
import { useFormulaireClavier } from '@/hooks/useFormulaireClavier';
import { getResource, postResource } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
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

const { width } = Dimensions.get('window');

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

interface FormDataType {
  nom_prenom: string;
  email: string;
  contact: string;
  lieux_recherches: string;
  provenance: string;
  ethnie: string;
  statut_familial: string;
  type_logement: string;
  type_logement_autre: string;
  nombre_chambres: string;
  besoin_parking: boolean;
  enfants: boolean;
  nombre_enfants: string;
  preference_proprietaire: string;
  budget_max: string;
  devise_budget: string;
  duree_location: string;
  autres_criteres: string;
  id_propriete: number | null;
}

type Step = 1 | 2 | 3 | 4;

export default function DemandeursScreen() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertySearchTerm, setPropertySearchTerm] = useState('');
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [progress, setProgress] = useState(25);

  const [formData, setFormData] = useState<FormDataType>({
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

  // Confort de saisie : remontée au-dessus du clavier et « Entrée » pour
  // passer au champ suivant. Le formulaire étant découpé en étapes, le
  // clavier se referme quand le champ suivant n'est pas encore affiché.
  const clavier = useFormulaireClavier(['nom_prenom', 'email', 'contact', 'provenance', 'nombre_enfants', 'lieux_recherches', 'type_logement_autre', 'autres_criteres', 'budget_max']);


  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    setProgress((currentStep / 4) * 100);
  }, [currentStep]);

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

  const validateStep = (step: Step): boolean => {
    switch (step) {
      case 1:
        if (!formData.nom_prenom.trim()) {
          Alert.alert('Champ requis', 'Veuillez saisir votre nom et prénom');
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
      case 2:
        if (!formData.lieux_recherches.trim()) {
          Alert.alert('Champ requis', 'Veuillez indiquer les lieux recherchés');
          return false;
        }
        return true;
      case 3:
      case 4:
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep((prev) => (prev + 1) as Step);
      } else {
        handleSubmit();
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const handleSubmit = async () => {
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
    setCurrentStep(1);
  };

  const renderStepIndicator = () => {
    const steps = ['Identité', 'Recherche', 'Préférences', 'Budget'];
    return (
      <View style={styles.stepIndicatorContainer}>
        {steps.map((step, index) => (
          <View key={index} style={styles.stepWrapper}>
            <View
              style={[
                styles.stepCircle,
                currentStep > index + 1 && styles.stepCircleCompleted,
                currentStep === index + 1 && styles.stepCircleActive,
              ]}
            >
              {currentStep > index + 1 ? (
                <Ionicons name="checkmark" size={16} color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.stepNumber,
                    currentStep === index + 1 && styles.stepNumberActive,
                  ]}
                >
                  {index + 1}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                currentStep === index + 1 && styles.stepLabelActive,
              ]}
            >
              {step}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.greetingCard}>
        <Ionicons name="person-outline" size={48} color="#065483" />
        <Text style={styles.greetingTitle}>Bonjour ! 👋</Text>
        <Text style={styles.greetingSubtitle}>Commençons par faire connaissance</Text>
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.inputIconWrapper}>
          <Ionicons name="person-outline" size={20} color="#065483" />
          <TextInput
            {...clavier.champ('nom_prenom')}
            style={styles.input}
            value={formData.nom_prenom}
            onChangeText={(text) => handleChange('nom_prenom', text)}
            placeholder="Nom et prénom"
            placeholderTextColor="#94a3b8"
            accessibilityLabel="Nom et prénom"
          />
        </View>

        <View style={styles.inputIconWrapper}>
          <Ionicons name="mail-outline" size={20} color="#065483" />
          <TextInput
            {...clavier.champ('email')}
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => handleChange('email', text)}
            placeholder="Email (optionnel)"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            autoCapitalize="none"
            accessibilityLabel="Email"
          />
        </View>

        <View style={styles.inputIconWrapper}>
          <Ionicons name="call-outline" size={20} color="#065483" />
          <TextInput
            {...clavier.champ('contact')}
            style={styles.input}
            value={formData.contact}
            onChangeText={(text) => handleChange('contact', text)}
            placeholder="Téléphone"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
            accessibilityLabel="Téléphone"
          />
        </View>

        <View style={styles.inputIconWrapper}>
          <Ionicons name="location-outline" size={20} color="#065483" />
          <TextInput
            {...clavier.champ('provenance')}
            style={styles.input}
            value={formData.provenance}
            onChangeText={(text) => handleChange('provenance', text)}
            placeholder="Ville / Pays d'origine"
            placeholderTextColor="#94a3b8"
            accessibilityLabel="Ville ou pays d'origine"
          />
        </View>
      </View>

      <View style={styles.quickInfo}>
        <Text style={styles.quickInfoTitle}>Statut familial</Text>
        <View style={styles.chipContainer}>
          {['celibataire', 'en_couple', 'marie', 'marie_en_devenir'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.chip,
                formData.statut_familial === option && styles.chipActive,
              ]}
              onPress={() => handleChange('statut_familial', option)}
              accessibilityRole="radio"
              accessibilityLabel={
                option === 'celibataire' ? 'Célibataire' :
                option === 'en_couple' ? 'En couple' :
                option === 'marie' ? 'Marié(e)' : 'Bientôt marié(e)'
              }
              accessibilityState={{ checked: formData.statut_familial === option }}
            >
              <Text
                style={[
                  styles.chipText,
                  formData.statut_familial === option && styles.chipTextActive,
                ]}
              >
                {option === 'celibataire' && 'Célibataire'}
                {option === 'en_couple' && 'En couple'}
                {option === 'marie' && 'Marié(e)'}
                {option === 'marie_en_devenir' && 'Bientôt marié(e)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.switchCard}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Ionicons name="people-outline" size={20} color="#065483" />
              <Text style={styles.switchText}>Avez-vous des enfants ?</Text>
            </View>
            <Switch
              value={formData.enfants}
              onValueChange={(val) => handleChange('enfants', val)}
              trackColor={{ false: '#e2e8f0', true: '#065483' }}
              thumbColor="#fff"
              accessibilityRole="switch"
              accessibilityLabel="Avez-vous des enfants ?"
              accessibilityState={{ checked: formData.enfants }}
            />
          </View>
          {formData.enfants && (
            <View style={styles.inputIconWrapper}>
              <Ionicons name="happy-outline" size={20} color="#065483" />
              <TextInput
            {...clavier.champ('nombre_enfants')}
                style={styles.input}
                value={formData.nombre_enfants}
                onChangeText={(text) => handleNumberChange('nombre_enfants', text)}
                placeholder="Nombre d'enfants"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                accessibilityLabel="Nombre d'enfants"
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <View style={styles.greetingCard}>
        <Ionicons name="home-outline" size={48} color="#065483" />
        <Text style={styles.greetingTitle}>Où cherchez-vous ? 🏠</Text>
        <Text style={styles.greetingSubtitle}>Dites-nous ce que vous recherchez</Text>
      </View>

      <View style={styles.inputIconWrapper}>
        <Ionicons name="map-outline" size={20} color="#065483" />
        <TextInput
            {...clavier.champ('lieux_recherches')}
          style={styles.input}
          value={formData.lieux_recherches}
          onChangeText={(text) => handleChange('lieux_recherches', text)}
          placeholder="Lieux recherchés (Kaloum, Dixinn, ...)"
          placeholderTextColor="#94a3b8"
          accessibilityLabel="Lieux recherchés"
        />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionCardTitle}>Type de logement</Text>
        <View style={styles.gridContainer}>
          {[
            { id: 'appartement', icon: 'business-outline', label: 'Appartement' },
            { id: 'studio', icon: 'home-outline', label: 'Studio' },
            { id: 'maison', icon: 'house-outline', label: 'Maison' },
            { id: 'autre', icon: 'add-circle-outline', label: 'Autre' },
          ].map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.gridCard,
                formData.type_logement === type.id && styles.gridCardActive,
              ]}
              onPress={() => handleChange('type_logement', type.id)}
              accessibilityRole="radio"
              accessibilityLabel={type.label}
              accessibilityState={{ checked: formData.type_logement === type.id }}
            >
              <Ionicons
                name={type.icon as any}
                size={28}
                color={formData.type_logement === type.id ? '#fff' : '#065483'}
              />
              <Text
                style={[
                  styles.gridCardText,
                  formData.type_logement === type.id && styles.gridCardTextActive,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {formData.type_logement === 'autre' && (
          <View style={[styles.inputIconWrapper, { marginTop: 16 }]}>
            <Ionicons name="create-outline" size={20} color="#065483" />
            <TextInput
            {...clavier.champ('type_logement_autre')}
              style={styles.input}
              value={formData.type_logement_autre}
              onChangeText={(text) => handleChange('type_logement_autre', text)}
              placeholder="Précisez le type"
              placeholderTextColor="#94a3b8"
              accessibilityLabel="Précisez le type de logement"
            />
          </View>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionCardTitle}>Nombre de chambres</Text>
        <View style={styles.chamberContainer}>
          {['1', '2', '3', '4', '5+'].map((num) => (
            <TouchableOpacity
              key={num}
              style={[
                styles.chamberButton,
                formData.nombre_chambres === num && styles.chamberButtonActive,
              ]}
              onPress={() => handleChange('nombre_chambres', num)}
              accessibilityRole="radio"
              accessibilityLabel={`${num} chambre${num !== '1' ? 's' : ''}`}
              accessibilityState={{ checked: formData.nombre_chambres === num }}
            >
              <Text
                style={[
                  styles.chamberButtonText,
                  formData.nombre_chambres === num && styles.chamberButtonTextActive,
                ]}
              >
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.greetingCard}>
        <Ionicons name="options-outline" size={48} color="#065483" />
        <Text style={styles.greetingTitle}>Vos préférences ✨</Text>
        <Text style={styles.greetingSubtitle}>Affinons votre recherche</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionCardTitle}>Durée de location</Text>
        <View style={styles.durationContainer}>
          {[
            { id: 'court_terme', label: 'Court terme', icon: 'calendar-outline' },
            { id: 'moyen_terme', label: 'Moyen terme', icon: 'calendar-clear-outline' },
            { id: 'long_terme', label: 'Long terme', icon: 'calendar-number-outline' },
          ].map((duree) => (
            <TouchableOpacity
              key={duree.id}
              style={[
                styles.durationCard,
                formData.duree_location === duree.id && styles.durationCardActive,
              ]}
              onPress={() => handleChange('duree_location', duree.id)}
              accessibilityRole="radio"
              accessibilityLabel={duree.label}
              accessibilityState={{ checked: formData.duree_location === duree.id }}
            >
              <Ionicons
                name={duree.icon as any}
                size={24}
                color={formData.duree_location === duree.id ? '#fff' : '#065483'}
              />
              <Text
                style={[
                  styles.durationCardText,
                  formData.duree_location === duree.id && styles.durationCardTextActive,
                ]}
              >
                {duree.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionCardTitle}>Préférence propriétaire</Text>
        <View style={styles.chipContainer}>
          {[
            { id: 'oui', label: 'Avec propriétaire', icon: 'person' },
            { id: 'non', label: 'Sans propriétaire', icon: 'business' },
            { id: 'indifferent', label: 'Indifférent', icon: 'remove' },
          ].map((pref) => (
            <TouchableOpacity
              key={pref.id}
              style={[
                styles.chip,
                formData.preference_proprietaire === pref.id && styles.chipActive,
              ]}
              onPress={() => handleChange('preference_proprietaire', pref.id)}
              accessibilityRole="radio"
              accessibilityLabel={pref.label}
              accessibilityState={{ checked: formData.preference_proprietaire === pref.id }}
            >
              <Text
                style={[
                  styles.chipText,
                  formData.preference_proprietaire === pref.id && styles.chipTextActive,
                ]}
              >
                {pref.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.switchCard}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Ionicons name="car-outline" size={20} color="#065483" />
            <Text style={styles.switchText}>Besoin d'un parking</Text>
          </View>
          <Switch
            value={formData.besoin_parking}
            onValueChange={(val) => handleChange('besoin_parking', val)}
            trackColor={{ false: '#e2e8f0', true: '#065483' }}
            thumbColor="#fff"
            accessibilityRole="switch"
            accessibilityLabel="Besoin d'un parking"
            accessibilityState={{ checked: formData.besoin_parking }}
          />
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionCardTitle}>Autres critères</Text>
        <View style={styles.inputIconWrapper}>
          <Ionicons name="document-text-outline" size={20} color="#065483" />
          <TextInput
            {...clavier.champ('autres_criteres', { multiligne: true })}
            style={[styles.input, styles.textArea]}
            value={formData.autres_criteres}
            onChangeText={(text) => handleChange('autres_criteres', text)}
            placeholder="Proximité écoles, transport, commerces..."
            placeholderTextColor="#94a3b8"
            numberOfLines={3}
            accessibilityLabel="Autres critères"
          />
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <View style={styles.greetingCard}>
        <Ionicons name="cash-outline" size={48} color="#065483" />
        <Text style={styles.greetingTitle}>Votre budget 💰</Text>
        <Text style={styles.greetingSubtitle}>Pour trouver les meilleures options</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionCardTitle}>Budget maximum</Text>
        <View style={styles.budgetContainer}>
          <View style={[styles.inputIconWrapper, { flex: 2 }]}>
            <Ionicons name="trending-up-outline" size={20} color="#065483" />
            <TextInput
            {...clavier.champ('budget_max')}
              style={styles.input}
              value={formData.budget_max}
              onChangeText={(text) => handleNumberChange('budget_max', text)}
              placeholder="Montant"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              accessibilityLabel="Budget maximum"
            />
          </View>
          <View style={styles.currencyContainer}>
            {['GNF', 'USD', 'EUR'].map((dev) => (
              <TouchableOpacity
                key={dev}
                style={[
                  styles.currencyButton,
                  formData.devise_budget === dev && styles.currencyButtonActive,
                ]}
                onPress={() => handleChange('devise_budget', dev)}
                accessibilityRole="radio"
                accessibilityLabel={`Devise ${dev}`}
                accessibilityState={{ checked: formData.devise_budget === dev }}
              >
                <Text
                  style={[
                    styles.currencyButtonText,
                    formData.devise_budget === dev && styles.currencyButtonTextActive,
                  ]}
                >
                  {dev}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return null;
    }
  };

  if (formSubmitted) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successAnimation}>
          <Ionicons name="checkmark-circle" size={100} color="#10b981" />
        </View>
        <Text style={styles.successTitle}>Demande envoyée ! 🎉</Text>
        <Text style={styles.successText}>Votre demande a bien été enregistrée.</Text>
        <Text style={styles.successSubtext}>Notre équipe vous contactera dans les plus brefs délais.</Text>
        <TouchableOpacity
          style={styles.newRequestButton}
          onPress={resetForm}
          accessibilityRole="button"
          accessibilityLabel="Nouvelle demande"
        >
          <Text style={styles.newRequestButtonText}>Nouvelle demande</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour à l'accueil"
        >
          <Text style={styles.homeButtonText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle demande</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>

      {renderStepIndicator()}

      <ScrollView
        {...clavier.propsScrollView}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {renderCurrentStep()}
      </ScrollView>

      <View style={styles.navigationButtons}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.prevButton}
            onPress={prevStep}
            accessibilityRole="button"
            accessibilityLabel="Précédent"
          >
            <Ionicons name="arrow-back" size={20} color="#065483" />
            <Text style={styles.prevButtonText}>Précédent</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.nextButton,
            loading && styles.nextButtonDisabled,
            currentStep === 1 && styles.nextButtonFull,
          ]}
          onPress={nextStep}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={currentStep === 4 ? "Envoyer" : "Continuer"}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {currentStep === 4 ? 'Envoyer' : 'Continuer'}
              </Text>
              {currentStep !== 4 && <Ionicons name="arrow-forward" size={20} color="#fff" />}
            </>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={showPropertyDropdown} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sélectionner une propriété</Text>
            <View style={styles.inputIconWrapper}>
              <Ionicons name="search-outline" size={20} color="#065483" />
              <TextInput
                style={styles.input}
                placeholder="Rechercher..."
                value={propertySearchTerm}
                onChangeText={setPropertySearchTerm}
                autoFocus
                accessibilityLabel="Rechercher une propriété"
              />
            </View>
            {loadingProperties ? (
              <ActivityIndicator style={{ marginTop: 20 }} color="#065483" />
            ) : (
              <FlatList
                data={filteredProperties}
                keyExtractor={(item) => item.id_propriete.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => handlePropertySelect(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Propriété ${item.titre} - ${item.adresse}, ${item.ville}`}
                  >
                    <Text style={styles.modalItemTitle}>{item.titre}</Text>
                    <Text style={styles.modalItemSub}>{item.adresse}, {item.ville}</Text>
                    <Text style={styles.modalItemPrice}>{formatPrice(item.prix, item.devise)}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.modalEmpty}>Aucune propriété trouvée</Text>}
              />
            )}
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowPropertyDropdown(false)}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );

  function formatPrice(price?: number, devise = 'GNF') {
    if (!price) return 'N/A';
    if (devise === 'GNF') return `${price.toLocaleString('fr-FR')} GNF`;
    if (devise === 'USD') return `$${price.toLocaleString('en-US')}`;
    if (devise === 'EUR') return `${price.toLocaleString('fr-FR')} €`;
    return `${price.toLocaleString('fr-FR')} ${devise}`;
  }
}

// Styles (inchangés par rapport à votre version)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#fff' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  progressBarContainer: { height: 4, backgroundColor: '#e2e8f0' },
  progressBar: { height: 4, backgroundColor: '#065483', borderRadius: 2 },
  stepIndicatorContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, paddingVertical: 20, backgroundColor: '#fff' },
  stepWrapper: { alignItems: 'center' },
  stepCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  stepCircleCompleted: { backgroundColor: '#10b981' },
  stepCircleActive: { backgroundColor: '#065483' },
  stepNumber: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  stepNumberActive: { color: '#fff' },
  stepLabel: { fontSize: 12, color: '#64748b' },
  stepLabelActive: { color: '#065483', fontWeight: '500' },
  content: { flex: 1 },
  contentContainer: { paddingBottom: 100 },
  stepContent: { padding: 20 },
  greetingCard: { alignItems: 'center', marginBottom: 32 },
  greetingTitle: { fontSize: 24, fontWeight: '700', color: '#1e293b', marginTop: 12 },
  greetingSubtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  inputGroup: { gap: 16, marginBottom: 24 },
  inputIconWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16, marginBottom: 12 },
  input: { flex: 1, paddingVertical: 14, paddingLeft: 12, fontSize: 16, color: '#1e293b' },
  quickInfo: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  quickInfoTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 16 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 30, backgroundColor: '#f1f5f9' },
  chipActive: { backgroundColor: '#065483' },
  chipText: { color: '#64748b' },
  chipTextActive: { color: '#fff', fontWeight: '500' },
  switchCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchText: { fontSize: 16, color: '#1e293b' },
  sectionCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 },
  sectionCardTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 16 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: { flex: 1, minWidth: (width - 64) / 3, alignItems: 'center', paddingVertical: 20, backgroundColor: '#f1f5f9', borderRadius: 16, gap: 8 },
  gridCardActive: { backgroundColor: '#065483' },
  gridCardText: { fontSize: 14, color: '#64748b' },
  gridCardTextActive: { color: '#fff' },
  textArea: { height: 80, textAlignVertical: 'top' },
  chamberContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chamberButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  chamberButtonActive: { backgroundColor: '#065483' },
  chamberButtonText: { fontSize: 18, fontWeight: '600', color: '#64748b' },
  chamberButtonTextActive: { color: '#fff' },
  durationContainer: { flexDirection: 'row', gap: 12 },
  durationCard: { flex: 1, alignItems: 'center', paddingVertical: 16, backgroundColor: '#f1f5f9', borderRadius: 16, gap: 8 },
  durationCardActive: { backgroundColor: '#065483' },
  durationCardText: { fontSize: 14, color: '#64748b' },
  durationCardTextActive: { color: '#fff' },
  budgetContainer: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  currencyContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, overflow: 'hidden' },
  currencyButton: { paddingHorizontal: 16, paddingVertical: 12 },
  currencyButtonActive: { backgroundColor: '#065483' },
  currencyButtonText: { color: '#64748b', fontWeight: '500' },
  currencyButtonTextActive: { color: '#fff' },
  propertySelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 16, padding: 16, gap: 12 },
  propertySelectorText: { flex: 1, fontSize: 14, color: '#1e293b' },
  navigationButtons: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0', gap: 12, position: 'absolute', bottom: 0, left: 0, right: 0 },
  prevButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: '#f1f5f9', gap: 8 },
  prevButtonText: { fontSize: 16, fontWeight: '500', color: '#065483' },
  nextButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: '#065483', gap: 8 },
  nextButtonFull: { flex: 1 },
  nextButtonDisabled: { opacity: 0.7 },
  nextButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxHeight: '80%', backgroundColor: '#fff', borderRadius: 24, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalItemTitle: { fontSize: 16, fontWeight: '500', color: '#1e293b' },
  modalItemSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  modalItemPrice: { fontSize: 12, color: '#065483', marginTop: 4, fontWeight: '500' },
  modalEmpty: { textAlign: 'center', marginTop: 20, color: '#64748b' },
  modalClose: { marginTop: 16, alignItems: 'center', paddingVertical: 14, backgroundColor: '#065483', borderRadius: 16 },
  modalCloseText: { color: '#fff', fontWeight: '600' },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f8fafc' },
  successAnimation: { marginBottom: 24 },
  successTitle: { fontSize: 28, fontWeight: '700', color: '#10b981', marginBottom: 12, textAlign: 'center' },
  successText: { fontSize: 16, color: '#1e293b', textAlign: 'center', marginBottom: 8 },
  successSubtext: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  newRequestButton: { backgroundColor: '#065483', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 30, marginTop: 32 },
  newRequestButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  homeButton: { marginTop: 12, paddingVertical: 12 },
  homeButtonText: { color: '#065483', fontSize: 14 },
});
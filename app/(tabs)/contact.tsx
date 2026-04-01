import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { postResource } from '../../services/api';

export default function ContactScreen() {
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    sujet: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const contactInfo = [
    {
      icon: 'location-outline',
      title: 'Notre Adresse',
      content: 'Nongo, bureau AgPDP, Conakry, Guinée',
    },
    {
      icon: 'mail-outline',
      title: 'Adresses Email',
      content: 'contact@shopimmobilier.com\nsupport@shopimmobilier.com',
    },
    {
      icon: 'time-outline',
      title: "Heures d'ouverture",
      content: 'Lun-Ven: 9h - 17h\nSam: 10h - 17h\nDim: 11h - 18h',
    },
  ];

  const contactMethods = [
    {
      icon: 'logo-whatsapp',
      color: '#25D366',
      title: 'WhatsApp',
      number: '+224 613002248',
      onPress: () => {
        Linking.openURL('https://wa.me/224613002248');
      },
    },
    {
      icon: 'mail-outline',
      color: '#FF3B30',
      title: 'Email',
      number: 'contact@shopimmobilier.com',
      onPress: () => {
        Linking.openURL('mailto:contact@shopimmobilier.com');
      },
    },
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.nom || !formData.email || !formData.sujet || !formData.message) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      const response = await postResource('/contact-public', formData);
      if (response.status === 201) {
        setSubmitted(true);
        setFormData({
          nom: '',
          email: '',
          telephone: '',
          sujet: '',
          message: '',
        });
        Alert.alert(
          'Succès',
          'Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.'
        );
        setTimeout(() => setSubmitted(false), 5000);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer plus tard.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={['#065483', '#EC9107']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Contactez-nous</Text>
        <Text style={styles.headerSubtitle}>
          Notre équipe est disponible pour répondre à toutes vos questions
        </Text>
      </LinearGradient>

      {/* Contact Info Cards */}
      <View style={styles.infoCards}>
        {contactInfo.map((info, index) => (
          <View key={index} style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons name={info.icon as any} size={24} color="#007AFF" />
            </View>
            <Text style={styles.infoTitle}>{info.title}</Text>
            <Text style={styles.infoContent}>{info.content}</Text>
          </View>
        ))}
      </View>

      {/* Contact Methods */}
      <View style={styles.methodsSection}>
        <Text style={styles.sectionTitle}>Contact direct</Text>
        <View style={styles.methodsGrid}>
          {contactMethods.map((method, index) => (
            <TouchableOpacity
              key={index}
              style={styles.methodCard}
              onPress={method.onPress}
            >
              <Ionicons name={method.icon as any} size={32} color={method.color} />
              <Text style={styles.methodTitle}>{method.title}</Text>
              <Text style={styles.methodNumber}>{method.number}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Contact Form */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Envoyez-nous un message</Text>
        <Text style={styles.formSubtitle}>
          Remplissez le formulaire ci-dessous et nous vous répondrons dans les plus brefs délais.
        </Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nom complet *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#999" />
              <TextInput
                style={styles.input}
                placeholder="Votre nom"
                value={formData.nom}
                onChangeText={(text) => handleInputChange('nom', text)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#999" />
              <TextInput
                style={styles.input}
                placeholder="votre@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Téléphone</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#999" />
              <TextInput
                style={styles.input}
                placeholder="+224 60000000"
                keyboardType="phone-pad"
                value={formData.telephone}
                onChangeText={(text) => handleInputChange('telephone', text)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Sujet *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="chatbubble-outline" size={20} color="#999" />
              <TextInput
                style={styles.input}
                placeholder="Objet de votre message"
                value={formData.sujet}
                onChangeText={(text) => handleInputChange('sujet', text)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Message *</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <Ionicons name="document-text-outline" size={20} color="#999" style={styles.textAreaIcon} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Votre message..."
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                value={formData.message}
                onChangeText={(text) => handleInputChange('message', text)}
              />
            </View>
          </View>

          {submitted && (
            <View style={styles.successMessage}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.successText}>
                Message envoyé avec succès !
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>ENVOYER LE MESSAGE</Text>
                <Ionicons name="send" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Support Info */}
      <View style={styles.supportSection}>
        <Text style={styles.supportTitle}>Support disponible</Text>
        <Text style={styles.supportText}>
          Nous sommes disponibles 24h/24 et 7j/7 pour vous assister dans vos projets immobiliers.
          N'hésitez pas à nous contacter par le moyen qui vous convient le mieux.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 24,
  },
  infoCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: -20,
    marginBottom: 30,
  },
  infoCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,122,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  infoContent: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  methodsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  methodsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  methodCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginTop: 10,
    marginBottom: 5,
  },
  methodNumber: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  form: {
    gap: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8f8f8',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#333',
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  textAreaIcon: {
    marginTop: 3,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  successText: {
    color: '#4CAF50',
    fontSize: 14,
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#065483',
    borderRadius: 10,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mapSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  mapContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mapText: {
    marginTop: 10,
    color: '#065483',
    fontSize: 14,
    fontWeight: '500',
  },
  supportSection: {
    backgroundColor: '#065483',
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 25,
    borderRadius: 20,
  },
  supportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  supportText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
  },
});
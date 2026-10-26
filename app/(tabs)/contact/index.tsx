import { useFormulaireClavier } from '@/hooks/useFormulaireClavier';
import { postResource } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const CONTACT_INFO = [
  {
    icon: 'location-sharp',
    label: 'Adresse',
    value: 'Nongo, bureau AgPDP\nConakry, Guinée',
    color: '#065483',
    bg: '#e0edf8',
  },
  {
    icon: 'mail',
    label: 'Email',
    value: 'contact@shopimmobilier.com',
    color: '#EC9107',
    bg: '#FEF3C7',
  },
];

const CONTACT_METHODS = [
  {
    icon: 'logo-whatsapp',
    label: 'WhatsApp',
    value: '+224 613 002 248',
    color: '#fff',
    bg: '#16a34a',
    onPress: () => Linking.openURL('https://wa.me/224613002248'),
  },
  {
    icon: 'mail',
    label: 'Email direct',
    value: 'contact@shopimmobilier.com',
    color: '#fff',
    bg: '#065483',
    onPress: () => Linking.openURL('mailto:contact@shopimmobilier.com'),
  },
];

const FIELDS = [
  { key: 'nom', label: 'Nom complet', placeholder: 'Votre nom et prénom', icon: 'person-outline', keyboard: 'default', required: true },
  { key: 'email', label: 'Adresse email', placeholder: 'votre@email.com', icon: 'mail-outline', keyboard: 'email-address', required: true },
  { key: 'telephone', label: 'Téléphone', placeholder: '+224 60 00 00 00', icon: 'call-outline', keyboard: 'phone-pad', required: false },
  { key: 'sujet', label: 'Sujet', placeholder: 'Objet de votre message', icon: 'chatbubble-outline', keyboard: 'default', required: true },
];

export default function ContactScreen() {
  const [form, setForm] = useState({ nom: '', email: '', telephone: '', sujet: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  // Remontée du champ au-dessus du clavier + « Entrée » = champ suivant.
  const clavier = useFormulaireClavier(['nom', 'email', 'telephone', 'sujet', 'message']);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.nom || !form.email || !form.sujet || !form.message) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs marqués *.');
      return;
    }
    setLoading(true);
    try {
      const r = await postResource('/contact-public', form);
      if (r.status === 201) {
        setSubmitted(true);
        setForm({ nom: '', email: '', telephone: '', sujet: '', message: '' });
        setTimeout(() => setSubmitted(false), 5000);
      }
    } catch {
      Alert.alert('Erreur', 'Une erreur est survenue. Réessayez plus tard.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView {...clavier.propsScrollView} style={s.container} showsVerticalScrollIndicator={false}>

      {/* ── Hero ── */}
      <ImageBackground
        source={require('../../../assets/images/3mg.jpg')}
        style={s.hero}
        imageStyle={s.heroImg}
      >
        <LinearGradient
          colors={['rgba(6,84,131,0.58)', 'rgba(10,20,40,0.68)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroOverlay}
        >
          <Text style={s.heroTitle}>Contactez-nous</Text>
          <Text style={s.heroSubtitle}>Notre équipe est disponible 24h/24 et 7j/7 pour vous accompagner.</Text>
        </LinearGradient>
      </ImageBackground>

      {/* ── Info cards (floating) ── */}
      <View style={s.infoRow}>
        {CONTACT_INFO.map((info, i) => (
          <View key={i} style={s.infoCard}>
            <View style={[s.infoIconBox, { backgroundColor: info.bg }]}>
              <Ionicons name={info.icon as any} size={22} color={info.color} />
            </View>
            <Text style={s.infoLabel}>{info.label}</Text>
            <Text style={s.infoValue}>{info.value}</Text>
          </View>
        ))}
      </View>

      {/* ── Direct contact methods ── */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Contact direct</Text>
          <Text style={s.sectionSub}>Réponse instantanée</Text>
        </View>
        <View style={s.methodsRow}>
          {CONTACT_METHODS.map((m, i) => (
            <TouchableOpacity
              key={i}
              style={[s.methodCard, { backgroundColor: m.bg }]}
              onPress={m.onPress}
              activeOpacity={0.85}
            >
              <View style={s.methodIconBox}>
                <Ionicons name={m.icon as any} size={28} color={m.color} />
              </View>
              <Text style={[s.methodLabel, { color: m.color }]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Contact Form ── */}
      <View style={s.formBox}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Envoyez un message</Text>
          <Text style={s.sectionSub}>Nous répondons sous 24h</Text>
        </View>

        {FIELDS.map(f => (
          <View key={f.key} style={s.fieldGroup}>
            <Text style={s.fieldLabel}>
              {f.label}{f.required && <Text style={s.required}> *</Text>}
            </Text>
            <View style={[s.inputWrap, focused === f.key && s.inputWrapFocused]}>
              <Ionicons name={f.icon as any} size={18} color={focused === f.key ? '#065483' : '#94a3b8'} />
              <TextInput
                {...clavier.champ(f.key as 'nom' | 'email' | 'telephone' | 'sujet', {
                  keyboardType: f.keyboard as any,
                  onFocus: () => setFocused(f.key),
                })}
                style={s.input}
                placeholder={f.placeholder}
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                value={(form as any)[f.key]}
                onChangeText={v => set(f.key, v)}
                onBlur={() => setFocused(null)}
              />
            </View>
          </View>
        ))}

        {/* Message textarea */}
        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>Message<Text style={s.required}> *</Text></Text>
          <View style={[s.inputWrap, s.textAreaWrap, focused === 'message' && s.inputWrapFocused]}>
            <Ionicons
              name="document-text-outline"
              size={18}
              color={focused === 'message' ? '#065483' : '#94a3b8'}
              style={{ marginTop: 2 }}
            />
            <TextInput
              {...clavier.champ('message', {
                multiligne: true,
                onFocus: () => setFocused('message'),
              })}
              style={[s.input, s.textArea]}
              placeholder="Décrivez votre demande en détail…"
              placeholderTextColor="#94a3b8"
              numberOfLines={5}
              textAlignVertical="top"
              value={form.message}
              onChangeText={v => set('message', v)}
              onBlur={() => setFocused(null)}
            />
          </View>
        </View>

        {/* Success state */}
        {submitted && (
          <View style={s.successBox}>
            <View style={s.successIconBox}>
              <Ionicons name="checkmark-circle" size={28} color="#16a34a" />
            </View>
            <View>
              <Text style={s.successTitle}>Message envoyé ✓</Text>
              <Text style={s.successText}>Nous vous répondrons très bientôt.</Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={s.submitBtnText}>Envoyer le message</Text>
              </>
          }
        </TouchableOpacity>
      </View>

      {/* ── Support banner ── */}
      <LinearGradient
        colors={['#065483', '#0a4f7a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.supportBanner}
      >
        <View style={s.supportLeft}>
          <Text style={s.supportTitle}>🛡 Support Premium</Text>
          <Text style={s.supportText}>
            Disponible 24h/24 et 7j/7, notre équipe d'experts immobiliers est à votre écoute pour tous vos projets.
          </Text>
        </View>
        <View style={s.supportStats}>
          {[
            { val: '< 2h', label: 'Délai réponse' },
            { val: '98%', label: 'Satisfaction' },
          ].map((st, i) => (
            <View key={i} style={s.supportStat}>
              <Text style={s.supportStatVal}>{st.val}</Text>
              <Text style={s.supportStatLabel}>{st.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },

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

  availBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  availDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  availText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Info cards
  infoRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: -28,
    marginBottom: 28,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
  },
  infoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    fontWeight: '600',
  },

  // Section
  section: { paddingHorizontal: 20, marginBottom: 28 },
  sectionHeader: { marginBottom: 14 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  sectionSub: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginTop: 2 },

  // Method cards
  methodsRow: { flexDirection: 'row', gap: 12 },
  methodCard: {
    flex: 1,
    borderRadius: 24,
    padding: 18,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    margin: 'auto',
    overflow: 'hidden',
  },
  methodIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 'auto',
    marginBottom: 12,
  },
  methodLabel: { fontSize: 15, margin: 'auto', fontWeight: '800', letterSpacing: -0.2, marginBottom: 4 },
  methodValue: { fontSize: 11, fontWeight: '500', lineHeight: 16 },
  methodArrow: { position: 'absolute', bottom: 16, right: 16 },

  // Form
  formBox: {
    backgroundColor: '#fff',
    borderRadius: 28,
    marginHorizontal: 20,
    padding: 22,
    marginBottom: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8, letterSpacing: 0.1 },
  required: { color: '#ef4444' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  inputWrapFocused: { borderColor: '#065483', backgroundColor: '#f0f6ff' },
  input: { flex: 1, fontSize: 15, color: '#0f172a', paddingVertical: 12, fontWeight: '500' },
  textAreaWrap: { alignItems: 'flex-start', paddingTop: 12, paddingBottom: 8 },
  textArea: { height: 110, textAlignVertical: 'top' },

  // Success
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  successIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: { fontSize: 15, fontWeight: '800', color: '#15803d' },
  successText: { fontSize: 13, color: '#16a34a', fontWeight: '500', marginTop: 2 },

  // Submit
  submitBtn: {
    backgroundColor: '#065483',
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 6,
    shadowColor: '#065483',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },

  // Support banner
  supportBanner: {
    marginHorizontal: 20,
    borderRadius: 28,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  supportLeft: { flex: 1 },
  supportTitle: { fontSize: 17, fontWeight: '800', color: '#fff', marginBottom: 6, letterSpacing: -0.2 },
  supportText: { fontSize: 12, color: 'rgba(255,255,255,0.78)', lineHeight: 18, fontWeight: '500' },
  supportStats: { gap: 12 },
  supportStat: { alignItems: 'center' },
  supportStatVal: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: -0.4 },
  supportStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 1 },
});
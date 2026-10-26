import useAuth, { estRoleDjamabizz, roleDepuisToken } from '@/hooks/useAuth';
import { useFormulaireClavier } from '@/hooks/useFormulaireClavier';
import { postResource } from '@/services/api';
import { showAlert } from '@/utils/alert';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground, KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
  type TextInputProps,
} from 'react-native';

type View_ = 'choice' | 'login' | 'register' | 'code' | 'forgot' | 'forgotCode' | 'forgotNew';

// ----------------------------------------------------------------------
// IMPORTANT : Field est défini EN DEHORS de DjamaBizzAuth.
// S'il était défini à l'intérieur, il serait recréé à chaque render
// du parent (à chaque frappe), ce qui force React à démonter/remonter
// le TextInput et donc à perdre le focus après chaque lettre.
// ----------------------------------------------------------------------
type FieldProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  toggle?: boolean;
  onToggle?: () => void;
  /** Props de confort clavier fournies par useFormulaireClavier. */
  propsClavier?: Partial<TextInputProps> & { ref?: any };
};

function Field({
  icon, label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, toggle, onToggle,
  propsClavier,
}: FieldProps) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputWrap}>
        <View style={s.inputIconWrap}>
          <Ionicons name={icon} size={17} color="#0a6ba8" />
        </View>
        <TextInput
          {...propsClavier}
          style={s.input}
          placeholder={placeholder}
          placeholderTextColor="#a3adc2"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
        {toggle && (
          <TouchableOpacity onPress={onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={secureTextEntry ? 'eye-off-outline' : 'eye-outline'} size={19} color="#9aa5b8" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------
// Aide à la lecture des erreurs réseau / serveur pour donner un message
// précis à l'utilisateur plutôt qu'un "Erreur" générique.
// ----------------------------------------------------------------------
function describeError(e: any, fallbackTitle: string): { title: string; message: string } {
  // Pas de réponse du tout => problème réseau (pas de connexion, mauvaise URL API, serveur injoignable)
  if (!e?.response) {
    if (e?.message?.includes('Network')) {
      return {
        title: 'Pas de connexion',
        message: "Impossible de joindre le serveur. Vérifiez votre connexion internet et réessayez.",
      };
    }
    return {
      title: 'Serveur injoignable',
      message: "Le serveur ne répond pas actuellement. Réessayez dans quelques instants.",
    };
  }

  const status = e.response.status;
  const serverMsg = e.response.data?.message;

  if (status === 401) {
    return { title: 'Identifiants incorrects', message: serverMsg || "L'email ou le mot de passe est incorrect." };
  }
  if (status === 422) {
    return { title: 'Champs invalides', message: serverMsg || "Certaines informations saisies ne sont pas valides." };
  }
  if (status === 404) {
    return { title: 'Compte introuvable', message: serverMsg || "Aucun compte ne correspond à ces informations." };
  }
  if (status === 403) {
    return { title: 'Accès refusé', message: serverMsg || "Ce compte n'est pas autorisé à se connecter." };
  }
  if (status === 429) {
    // Deux sources possibles : nos propres messages (déjà en français) ou la
    // limite de débit Laravel (« Too Many Attempts. », en anglais).
    const francais = serverMsg && serverMsg !== 'Too Many Attempts.';
    return {
      title: 'Trop de tentatives',
      message: francais ? serverMsg : 'Trop de tentatives. Patientez une minute puis réessayez.',
    };
  }
  if (status >= 500) {
    return { title: 'Problème serveur', message: "Une erreur est survenue côté serveur. Réessayez plus tard." };
  }
  return { title: fallbackTitle, message: serverMsg || "Une erreur inattendue est survenue." };
}

export default function DjamaBizzAuth() {
  const router = useRouter();
  const auth = useAuth();
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<View_>(params.view === 'login' ? 'login' : 'choice');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    prenom: '', nom: '', email: '', telephone: '',
    password: '', password_confirmation: '', typeCompte: 'djamabizz',
  });
  const [code, setCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── Mot de passe oublié (flux par code à 6 chiffres) ──────────────────
  // Distinct du web (lien cliquable + page /forget/:token) : sur mobile un
  // lien e-mail ouvrirait le navigateur, pas l'application. L'utilisateur
  // reçoit donc un code qu'il saisit directement dans l'app.
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [newPwd, setNewPwd] = useState({ password: '', password_confirmation: '' });

  // Confort de saisie, vue par vue : « Entrée » enchaîne les champs du
  // formulaire affiché, et referme le clavier sur le dernier.
  // Une seule suite pour tout l'écran : les noms sont préfixés par vue, car
  // « email » ou « password » existent dans plusieurs formulaires. Un seul
  // hook = une seule zone de défilement à brancher, donc la remontée du champ
  // fonctionne dans toutes les vues.
  const clavier = useFormulaireClavier([
    'connexion_email', 'connexion_password',
    'inscription_prenom', 'inscription_nom', 'inscription_email',
    'inscription_telephone', 'inscription_password', 'inscription_password_confirmation',
    'code_inscription',
    'oubli_email',
    'oubli_code',
    'oubli_password', 'oubli_password_confirmation',
  ]);

  // Reprise de session : on ne renvoie vers le tableau de bord QUE si le token
  // déjà présent appartient à un compte djamabizz. Un token d'un autre rôle
  // (client, agent, admin) — par exemple hérité d'une ancienne version de
  // l'app — est effacé immédiatement et l'utilisateur reste sur l'écran de
  // connexion.
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const { autorise, raison } = await auth.verifierRoleDjamabizz();
      if (autorise) {
        router.replace('/djamabizz/dashboard');
        return;
      }

      await auth.clearSession();
      if (raison === 'role') {
        showAlert(
          'Accès réservé',
          "Le compte enregistré sur cet appareil n'est pas un compte DjamaBizz. Il a été déconnecté."
        );
        setView('login');
      }
    })();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleLogin = async () => {
    if (!loginData.email || !loginData.password) {
      showAlert('Champs manquants', 'Merci de renseigner votre email et votre mot de passe.');
      return;
    }
    setLoading(true);
    try {
      const res = await postResource('login', loginData);
      if (res?.data?.error === 0) {
        const accessToken = res.data.token.access_token;

        // ── Filtrage par rôle ────────────────────────────────────────────
        // Cet espace n'accepte QUE les comptes djamabizz. Le rôle est lu
        // depuis la réponse de `/login` et, à défaut, depuis le claim `role`
        // du JWT. Le token n'est jamais enregistré si le compte est refusé :
        // l'utilisateur n'est donc à aucun moment « connecté ».
        const role = res.data?.role ?? roleDepuisToken(accessToken);

        if (!estRoleDjamabizz(role)) {
          await auth.clearSession();
          showAlert(
            'Accès réservé aux comptes DjamaBizz',
            "Ce compte existe bien, mais il n'est pas un compte DjamaBizz. Créez un compte DjamaBizz pour accéder à cet espace."
          );
          setLoginData((p) => ({ ...p, password: '' }));
          return;
        }

        await auth.login(accessToken, role);
        router.replace('/djamabizz/dashboard');
      } else {
        showAlert(
          'Connexion refusée',
          res?.data?.message || "Nous n'avons pas pu vous connecter avec ces identifiants."
        );
      }
    } catch (e) {
      const { title, message } = describeError(e, 'Connexion impossible');
      showAlert(title, message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerData.prenom || !registerData.nom || !registerData.email || !registerData.telephone) {
      showAlert('Informations incomplètes', 'Merci de remplir tous les champs du formulaire.');
      return;
    }
    if (!registerData.password || !registerData.password_confirmation) {
      showAlert('Mot de passe requis', 'Merci de renseigner et confirmer votre mot de passe.');
      return;
    }
    if (registerData.password !== registerData.password_confirmation) {
      showAlert('Mots de passe différents', 'Les deux mots de passe saisis ne correspondent pas.');
      return;
    }
    if (registerData.password.length < 6) {
      showAlert('Mot de passe trop court', 'Choisissez un mot de passe d\'au moins 6 caractères.');
      return;
    }
    setLoading(true);
    try {
      // Inscription mobile simplifiée : on envoie un code à 6 chiffres par
      // email, l'utilisateur le saisit à l'écran suivant pour créer et
      // activer son compte directement (pas de lien à cliquer).
      const res = await postResource('mobile/register/request-code', registerData);
      if (res?.data?.error === 0) {
        setCode('');
        setResendCooldown(60);
        setView('code');
      } else {
        showAlert(
          "Inscription refusée",
          res?.data?.message || "Cette inscription n'a pas pu aboutir. Vérifiez vos informations."
        );
      }
    } catch (e) {
      const { title, message } = describeError(e, 'Inscription impossible');
      showAlert(title, message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      showAlert('Code incomplet', 'Merci de saisir le code à 6 chiffres reçu par email.');
      return;
    }
    setLoading(true);
    try {
      const res = await postResource('mobile/register/verify-code', {
        email: registerData.email,
        code,
      });
      if (res?.data?.error === 0) {
        const accessToken = res.data.token.access_token;
        // L'inscription depuis cet écran crée toujours un compte djamabizz
        // (`typeCompte: 'djamabizz'`), mais on enregistre le rôle réellement
        // renvoyé plutôt que de le supposer.
        await auth.login(accessToken, res.data?.role ?? roleDepuisToken(accessToken));
        router.replace('/djamabizz/dashboard');
      } else {
        showAlert(
          'Code invalide',
          res?.data?.message || "Ce code n'est pas valide. Vérifiez ou demandez-en un nouveau."
        );
      }
    } catch (e) {
      const { title, message } = describeError(e, 'Vérification impossible');
      showAlert(title, message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      const res = await postResource('mobile/register/resend-code', { email: registerData.email });
      if (res?.data?.error === 0) {
        setResendCooldown(60);
        showAlert('Code renvoyé', 'Un nouveau code vient d\'être envoyé à votre adresse email.');
      } else {
        showAlert('Erreur', res?.data?.message || "Impossible de renvoyer un code pour le moment.");
      }
    } catch (e) {
      const { title, message } = describeError(e, 'Erreur');
      showAlert(title, message);
    } finally {
      setLoading(false);
    }
  };

  const emailValide = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  /** Étape 1 : demande d'envoi du code (sert aussi au « renvoyer le code »). */
  const handleForgotRequest = async (renvoi = false) => {
    if (!emailValide(forgotEmail)) {
      showAlert('Email invalide', 'Merci de saisir l\'adresse e-mail de votre compte.');
      return;
    }
    if (renvoi && resendCooldown > 0) return;
    setLoading(true);
    try {
      const res = await postResource('mobile/password/request-code', { email: forgotEmail.trim() });
      if (res?.data?.error === 0) {
        setResendCooldown(60);
        if (renvoi) {
          showAlert('Code renvoyé', 'Un nouveau code vient d\'être envoyé à votre adresse e-mail.');
        } else {
          setForgotCode('');
          setView('forgotCode');
        }
      } else {
        showAlert('Envoi impossible', res?.data?.message || "Impossible d'envoyer le code pour le moment.");
      }
    } catch (e) {
      const { title, message } = describeError(e, 'Envoi impossible');
      showAlert(title, message);
    } finally {
      setLoading(false);
    }
  };

  /** Étape 2 : vérification du code AVANT de demander le nouveau mot de passe. */
  const handleForgotVerify = async () => {
    if (forgotCode.length !== 6) {
      showAlert('Code incomplet', 'Merci de saisir le code à 6 chiffres reçu par e-mail.');
      return;
    }
    setLoading(true);
    try {
      const res = await postResource('mobile/password/verify-code', {
        email: forgotEmail.trim(),
        code: forgotCode,
      });
      if (res?.data?.error === 0) {
        setNewPwd({ password: '', password_confirmation: '' });
        setView('forgotNew');
      } else {
        showAlert('Code invalide', res?.data?.message || 'Ce code est invalide ou a expiré.');
      }
    } catch (e) {
      const { title, message } = describeError(e, 'Vérification impossible');
      showAlert(title, message);
    } finally {
      setLoading(false);
    }
  };

  /** Étape 3 : enregistrement du nouveau mot de passe. */
  const handleForgotReset = async () => {
    if (newPwd.password.length < 6) {
      showAlert('Mot de passe trop court', 'Choisissez un mot de passe d\'au moins 6 caractères.');
      return;
    }
    if (newPwd.password !== newPwd.password_confirmation) {
      showAlert('Mots de passe différents', 'Les deux mots de passe saisis ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      const res = await postResource('mobile/password/reset', {
        email: forgotEmail.trim(),
        code: forgotCode,
        password: newPwd.password,
        password_confirmation: newPwd.password_confirmation,
      });
      if (res?.data?.error === 0) {
        setLoginData({ email: forgotEmail.trim(), password: '' });
        setForgotCode('');
        setNewPwd({ password: '', password_confirmation: '' });
        showAlert('Mot de passe modifié', 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.');
        setView('login');
      } else {
        const details = res?.data?.errors
          ? Object.values(res.data.errors as Record<string, string[]>).flat().join('\n')
          : res?.data?.message;
        showAlert('Échec', details || 'Impossible de modifier le mot de passe.');
        // Code expiré entre-temps : on renvoie l'utilisateur à la saisie du code.
        if (res?.data?.code_invalide) setView('forgotCode');
      }
    } catch (e) {
      const { title, message } = describeError(e, 'Échec');
      showAlert(title, message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        {...clavier.propsScrollView}
        contentContainerStyle={{ flexGrow: 1 }}
        style={s.container}
      >
        <ImageBackground source={require('../../../assets/images/djamabizz.jpeg')} style={s.hero} imageStyle={s.heroImg}>
          <LinearGradient colors={['rgba(6,84,131,0.4)', 'rgba(4,12,26,0.92)']} style={s.heroOverlay}>
            <Text style={s.heroTitle}>DjamaBizz</Text>
            <Text style={s.heroSubtitle}>Diffusez vos annonces et développez vos revenus, où que vous soyez.</Text>
          </LinearGradient>
        </ImageBackground>

        <View style={s.card}>
          {view === 'choice' && (
            <View style={{ alignItems: 'center' }}>
              <View style={[s.iconCircle, { overflow: 'hidden' }]}>
                <View style={{ width: 120, height: 120, borderRadius: 25, overflow: 'hidden' }}>
                  <Image
                    source={require('../../../assets/images/djb.png')}
                    style={{ width: 120, height: 120, borderRadius: 25 }}
                    resizeMode="contain"
                  />
                </View>
              </View>
              <Text style={s.cardTitle}>Bienvenue sur DjamaBizz</Text>
              <Text style={s.cardSub}>Accédez à votre espace ou créez un compte en quelques secondes.</Text>

              <TouchableOpacity style={s.fullWidthBtnWrap} activeOpacity={0.85} onPress={() => setView('login')}>
                <LinearGradient colors={['#0a6ba8', '#053f60']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
                  <Ionicons name="log-in-outline" size={20} color="#fff" />
                  <Text style={s.primaryBtnText}>J'ai déjà un compte</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={s.outlineBtn} activeOpacity={0.85} onPress={() => setView('register')}>
                <Ionicons name="person-add-outline" size={20} color="#0a6ba8" />
                <Text style={s.outlineBtnText}>Je m'inscris</Text>
              </TouchableOpacity>

              <View style={s.secureRow}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#94a3b8" />
                <Text style={s.secureText}>Vos données restent confidentielles et protégées</Text>
              </View>
            </View>
          )}

          {view === 'login' && (
            <View>
              <Text style={s.cardTitle}>Content de vous revoir</Text>
              <Text style={s.cardSub}>Entrez vos identifiants pour accéder à votre compte.</Text>

              <Field
                propsClavier={clavier.champ('connexion_email')}
                icon="mail-outline"
                label="Adresse e-mail"
                placeholder="ex : awa.diallo@gmail.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={loginData.email}
                onChangeText={(v) => setLoginData((p) => ({ ...p, email: v }))}
              />
              <Field
                propsClavier={clavier.champ('connexion_password')}
                icon="lock-closed-outline"
                label="Mot de passe"
                placeholder="Saisissez votre mot de passe"
                secureTextEntry={!showPwd}
                toggle
                onToggle={() => setShowPwd((v) => !v)}
                value={loginData.password}
                onChangeText={(v) => setLoginData((p) => ({ ...p, password: v }))}
              />

              <TouchableOpacity
                style={{ alignSelf: 'flex-end', marginTop: 10 }}
                onPress={() => { setForgotEmail(loginData.email); setView('forgot'); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={s.switchLink}>Mot de passe oublié ?</Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.85} onPress={handleLogin} disabled={loading} style={{ marginTop: 6 }}>
                <LinearGradient colors={['#0a6ba8', '#053f60']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <><Ionicons name="log-in-outline" size={20} color="#fff" /><Text style={s.primaryBtnText}>Me connecter</Text></>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setView('register')}>
                <Text style={s.switchText}>Pas encore de compte ? <Text style={s.switchLink}>S'inscrire</Text></Text>
              </TouchableOpacity>
            </View>
          )}

          {view === 'register' && (
            <View>
              <Text style={s.cardTitle}>Créer votre compte agent</Text>
              <Text style={s.cardSub}>Quelques informations suffisent pour démarrer.</Text>

              <Field
                propsClavier={clavier.champ('inscription_prenom')}
                icon="person-outline"
                label="Prénom"
                placeholder="ex : Awa"
                value={registerData.prenom}
                onChangeText={(v) => setRegisterData((p) => ({ ...p, prenom: v }))}
              />
              <Field
                propsClavier={clavier.champ('inscription_nom')}
                icon="person-outline"
                label="Nom"
                placeholder="ex : Diallo"
                value={registerData.nom}
                onChangeText={(v) => setRegisterData((p) => ({ ...p, nom: v }))}
              />
              <Field
                propsClavier={clavier.champ('inscription_email')}
                icon="mail-outline"
                label="Adresse e-mail"
                placeholder="ex : awa.diallo@gmail.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={registerData.email}
                onChangeText={(v) => setRegisterData((p) => ({ ...p, email: v }))}
              />
              <Field
                propsClavier={clavier.champ('inscription_telephone')}
                icon="call-outline"
                label="Numéro de téléphone"
                placeholder="ex : 97 00 00 00"
                keyboardType="phone-pad"
                value={registerData.telephone}
                onChangeText={(v) => setRegisterData((p) => ({ ...p, telephone: v }))}
              />
              <Field
                propsClavier={clavier.champ('inscription_password')}
                icon="lock-closed-outline"
                label="Mot de passe"
                placeholder="6 caractères minimum"
                secureTextEntry={!showPwd}
                toggle
                onToggle={() => setShowPwd((v) => !v)}
                value={registerData.password}
                onChangeText={(v) => setRegisterData((p) => ({ ...p, password: v }))}
              />
              <Field
                propsClavier={clavier.champ('inscription_password_confirmation')}
                icon="lock-closed-outline"
                label="Confirmez le mot de passe"
                placeholder="Ressaisissez le mot de passe"
                secureTextEntry={!showPwd2}
                toggle
                onToggle={() => setShowPwd2((v) => !v)}
                value={registerData.password_confirmation}
                onChangeText={(v) => setRegisterData((p) => ({ ...p, password_confirmation: v }))}
              />

              <TouchableOpacity activeOpacity={0.85} onPress={handleRegister} disabled={loading} style={{ marginTop: 6 }}>
                <LinearGradient colors={['#0a6ba8', '#053f60']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <><Ionicons name="person-add-outline" size={20} color="#fff" /><Text style={s.primaryBtnText}>Valider mon inscription</Text></>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setView('login')}>
                <Text style={s.switchText}>Déjà un compte ? <Text style={s.switchLink}>Me connecter</Text></Text>
              </TouchableOpacity>
            </View>
          )}

          {view === 'code' && (
            <View>
              <View style={{ alignItems: 'center' }}>
                <View style={s.successCircle}>
                  <Ionicons name="mail-open-outline" size={44} color="#16a34a" />
                </View>
                <Text style={s.cardTitle}>Vérifiez votre email</Text>
                <Text style={s.cardSub}>
                  Un code à 6 chiffres a été envoyé à{'\n'}
                  <Text style={{ fontWeight: '700', color: '#0f172a' }}>{registerData.email}</Text>{'\n'}
                  Entrez-le ci-dessous pour créer votre compte.
                </Text>
              </View>

              <Field
                propsClavier={clavier.champ('code_inscription')}
                icon="keypad-outline"
                label="Code de vérification"
                placeholder="123456"
                keyboardType="default"
                value={code}
                onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
              />

              <TouchableOpacity activeOpacity={0.85} onPress={handleVerifyCode} disabled={loading} style={{ marginTop: 6 }}>
                <LinearGradient colors={['#0a6ba8', '#053f60']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={s.primaryBtnText}>Valider le code</Text></>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleResendCode} disabled={resendCooldown > 0 || loading}>
                <Text style={s.switchText}>
                  {resendCooldown > 0 ? (
                    <>Renvoyer le code dans {resendCooldown}s</>
                  ) : (
                    <>Vous n&apos;avez rien reçu ? <Text style={s.switchLink}>Renvoyer le code</Text></>
                  )}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setView('register')}>
                <Text style={s.switchText}><Text style={s.switchLink}>Modifier mes informations</Text></Text>
              </TouchableOpacity>
            </View>
          )}

          {view === 'forgot' && (
            <View>
              <View style={{ alignItems: 'center' }}>
                <View style={s.successCircle}>
                  <Ionicons name="key-outline" size={44} color="#16a34a" />
                </View>
                <Text style={s.cardTitle}>Mot de passe oublié</Text>
                <Text style={s.cardSub}>
                  Saisissez l&apos;adresse e-mail de votre compte. Nous vous enverrons un code à 6 chiffres.
                </Text>
              </View>

              <Field
                propsClavier={clavier.champ('oubli_email')}
                icon="mail-outline"
                label="Adresse e-mail"
                placeholder="ex : awa.diallo@gmail.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={forgotEmail}
                onChangeText={setForgotEmail}
              />

              <TouchableOpacity activeOpacity={0.85} onPress={() => handleForgotRequest(false)} disabled={loading} style={{ marginTop: 6 }}>
                <LinearGradient colors={['#0a6ba8', '#053f60']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <><Ionicons name="send-outline" size={20} color="#fff" /><Text style={s.primaryBtnText}>Recevoir le code</Text></>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setView('login')}>
                <Text style={s.switchText}><Text style={s.switchLink}>Retour à la connexion</Text></Text>
              </TouchableOpacity>
            </View>
          )}

          {view === 'forgotCode' && (
            <View>
              <View style={{ alignItems: 'center' }}>
                <View style={s.successCircle}>
                  <Ionicons name="mail-open-outline" size={44} color="#16a34a" />
                </View>
                <Text style={s.cardTitle}>Saisissez le code</Text>
                <Text style={s.cardSub}>
                  Si un compte existe pour{'\n'}
                  <Text style={{ fontWeight: '700', color: '#0f172a' }}>{forgotEmail}</Text>{'\n'}
                  vous venez de recevoir un code valable 15 minutes.
                </Text>
              </View>

              <Field
                propsClavier={clavier.champ('oubli_code')}
                icon="keypad-outline"
                label="Code reçu par e-mail"
                placeholder="123456"
                keyboardType="phone-pad"
                value={forgotCode}
                onChangeText={(v) => setForgotCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
              />

              <TouchableOpacity activeOpacity={0.85} onPress={handleForgotVerify} disabled={loading} style={{ marginTop: 6 }}>
                <LinearGradient colors={['#0a6ba8', '#053f60']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={s.primaryBtnText}>Vérifier le code</Text></>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleForgotRequest(true)} disabled={resendCooldown > 0 || loading}>
                <Text style={s.switchText}>
                  {resendCooldown > 0 ? (
                    <>Renvoyer le code dans {resendCooldown}s</>
                  ) : (
                    <>Vous n&apos;avez rien reçu ? <Text style={s.switchLink}>Renvoyer le code</Text></>
                  )}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setView('forgot')}>
                <Text style={s.switchText}><Text style={s.switchLink}>Changer d&apos;adresse e-mail</Text></Text>
              </TouchableOpacity>
            </View>
          )}

          {view === 'forgotNew' && (
            <View>
              <Text style={s.cardTitle}>Nouveau mot de passe</Text>
              <Text style={s.cardSub}>Choisissez un mot de passe d&apos;au moins 6 caractères.</Text>

              <Field
                propsClavier={clavier.champ('oubli_password')}
                icon="lock-closed-outline"
                label="Nouveau mot de passe"
                placeholder="6 caractères minimum"
                secureTextEntry={!showPwd}
                toggle
                onToggle={() => setShowPwd((v) => !v)}
                value={newPwd.password}
                onChangeText={(v) => setNewPwd((p) => ({ ...p, password: v }))}
              />
              <Field
                propsClavier={clavier.champ('oubli_password_confirmation')}
                icon="lock-closed-outline"
                label="Confirmez le mot de passe"
                placeholder="Ressaisissez le mot de passe"
                secureTextEntry={!showPwd2}
                toggle
                onToggle={() => setShowPwd2((v) => !v)}
                value={newPwd.password_confirmation}
                onChangeText={(v) => setNewPwd((p) => ({ ...p, password_confirmation: v }))}
              />

              <TouchableOpacity activeOpacity={0.85} onPress={handleForgotReset} disabled={loading} style={{ marginTop: 6 }}>
                <LinearGradient colors={['#0a6ba8', '#053f60']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <><Ionicons name="save-outline" size={20} color="#fff" /><Text style={s.primaryBtnText}>Enregistrer</Text></>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setView('login')}>
                <Text style={s.switchText}><Text style={s.switchLink}>Annuler</Text></Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef3f8' },
  hero: { width: '100%', height: 260 },
  heroImg: { borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  heroOverlay: { flex: 1, padding: 26, justifyContent: 'flex-end', borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  logoBadge: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  heroTitle: { fontSize: 36, fontWeight: '900', color: '#fff', marginTop: -10, letterSpacing: 0.4 },
  heroSubtitle: { fontSize: 14.5, color: 'rgba(255,255,255,0.88)', marginTop: 10, marginBottom: 40, lineHeight: 21, maxWidth: '90%' },
  card: {
    backgroundColor: '#fff', borderRadius: 30, margin: 20, marginTop: -28, marginBottom: 100, padding: 26,
    shadowColor: '#0f172a', shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  iconCircle: {
    width: 132, height: 132,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  successCircle: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: '#ecfdf5',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 6, textAlign: 'center' },
  cardSub: { fontSize: 13.5, color: '#64748b', marginBottom: 18, textAlign: 'center', lineHeight: 20 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.4 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
    borderRadius: 16, borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 14,
  },
  inputIconWrap: {
    width: 26, height: 26, borderRadius: 8, backgroundColor: '#e6f0fa',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: '#0f172a' },
  primaryBtn: {
    borderRadius: 18, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 8,
    shadowColor: '#065483', shadowOpacity: 0.32, shadowRadius: 12, shadowOffset: { width: 0, height: 8 },
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15.5 },
  fullWidthBtnWrap: { width: '100%', marginTop: 4 },
  outlineBtn: {
    borderWidth: 1.5, borderColor: '#0a6ba8', borderRadius: 18, paddingVertical: 15,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    marginTop: 12, width: '100%', backgroundColor: '#f8fbfe',
  },
  outlineBtnText: { color: '#0a6ba8', fontWeight: '800', fontSize: 15.5 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14, alignSelf: 'flex-start' },
  backText: { color: '#0a6ba8', fontWeight: '600' },
  switchText: { textAlign: 'center', marginTop: 18, color: '#64748b', fontSize: 13.5 },
  switchLink: { color: '#0a6ba8', fontWeight: '700' },
  secureRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  secureText: { fontSize: 12, color: '#94a3b8' },
});
import useDjamabizzGuard from '@/hooks/useDjamabizzGuard';
import { useFormulaireClavier } from '@/hooks/useFormulaireClavier';
import { postFile } from '@/services/api';
import { showAlert } from '@/utils/alert';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from 'react-native';

// Mêmes listes que l'écran « Modifier une propriété », pour que les deux
// formulaires proposent exactement les mêmes choix.
const TYPE_OPTIONS = [
  { label: 'Appartement', value: 'appartement' },
  { label: 'Maison', value: 'maison' },
  { label: 'Terrain', value: 'terrain' },
  { label: 'Commerce', value: 'commerce' },
  { label: 'Bureau', value: 'bureau' },
];
const OPERATION_OPTIONS = [
  { label: 'À vendre', value: 'vente' },
  { label: 'À louer', value: 'location' },
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
// « Mettre en vedette » est volontairement absent : réservé au web.
const STATUT_OPTIONS = [
  { label: 'Disponible', value: 'disponible' },
  { label: 'Réservé', value: 'reserve' },
  { label: 'Vendu', value: 'vendu' },
  { label: 'Loué', value: 'loue' },
  { label: 'Archivé', value: 'archived' },
];
const EQUIPEMENTS = [
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
] as const;

// Ordre de passage du clavier : « Entrée » suit cette liste, puis referme.
const ORDRE_CHAMPS = [
  'titre', 'description', 'prix', 'surface', 'chambres', 'salles_de_bain',
  'cuisines', 'salons', 'garages', 'etage', 'etages_immeuble',
  'annee_construction', 'adresse', 'ville', 'quartier', 'expire_le',
];

export default function AddProperty() {
  // ── Garde d'accès ────────────────────────────────────────────────────────
  // Seuls les comptes djamabizz peuvent rester sur cet écran. Tout autre
  // compte est déconnecté automatiquement et renvoyé vers la connexion.
  useDjamabizzGuard();

  const router = useRouter();
  const clavier = useFormulaireClavier(ORDRE_CHAMPS);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<any[]>([]);
  const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const [form, setForm] = useState({
    // Informations de base
    titre: '', description: '', type: 'appartement', operation: 'vente',
    prix: '', devise: 'GNF',
    // IMPORTANT : la colonne `etat` est un ENUM strict côté base
    // ('neuf','excellent','bon','renovation','a_renover') — toute autre
    // valeur (ex: 'Bon état') fait échouer l'insertion SQL.
    etat: 'bon',
    // Caractéristiques de la propriété
    surface: '', chambres: '', salles_de_bain: '', cuisines: '', salons: '',
    garages: '', etage: '', etages_immeuble: '', annee_construction: '',
    // Localisation
    adresse: '', ville: '', quartier: '',
    // Paramètres additionnels (sans « mettre en vedette », réservé au web)
    statut: 'disponible', expire_le: '',
  });

  const [equipements, setEquipements] = useState<Record<string, boolean>>({});

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const basculer = (k: string) => setEquipements((p) => ({ ...p, [k]: !p[k] }));

  const pickImages = async () => {
    // Sur Android il faut la permission d'acces a la mediatheque : sans elle,
    // launchImageLibraryAsync revient « canceled » sans explication.
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert(
        'Autorisation refusée',
        "Autorisez l'accès à vos photos dans les réglages du téléphone pour pouvoir illustrer votre annonce."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      // `MediaTypeOptions` est deprecie depuis expo-image-picker 16 et supprime
      // en 17 (SDK 54, la version utilisee ici) : `ImagePicker.MediaTypeOptions`
      // valait donc `undefined`. Le nouveau format est un simple tableau.
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets]);
    }
  };

  const removeImage = (i: number) => setImages((prev) => prev.filter((_, idx) => idx !== i));

  // Mêmes limites que l'écran « Modifier » : 300 Mo et formats acceptés par
  // le serveur (mp4, avi, mpeg, mov).
  const pickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert('Autorisation refusée', "Autorisez l'accès à votre galerie.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets.length) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 300 * 1024 * 1024) {
      showAlert('Trop volumineux', 'La vidéo ne doit pas dépasser 300 Mo.');
      return;
    }
    const mime = asset.mimeType || '';
    const acceptes = ['video/mp4', 'video/avi', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'];
    if (!acceptes.some((t) => mime.includes(t))) {
      showAlert('Format non supporté', 'Formats acceptés : MP4, AVI, MPEG, MOV.');
      return;
    }
    setVideo(asset);
  };

  const handleSubmit = async () => {
    if (!form.titre || !form.description || !form.prix || !form.adresse || !form.ville) {
      showAlert('Champs requis', 'Titre, description, prix, adresse et ville sont obligatoires.');
      return;
    }
    if (images.length === 0) {
      showAlert('Images requises', 'Ajoutez au moins une image.');
      return;
    }
    if (form.expire_le && !/^\d{4}-\d{2}-\d{2}$/.test(form.expire_le)) {
      showAlert('Date invalide', "La date d'expiration doit être au format AAAA-MM-JJ.");
      return;
    }

    setLoading(true);
    try {
      // Pas besoin de résoudre l'agent nous-mêmes : le serveur identifie
      // automatiquement l'agent à partir de l'utilisateur connecté
      // (token), donc aucun paramètre "idagent" n'est nécessaire ici.
      const params = new URLSearchParams();
      Object.entries(form).forEach(([k, v]) => { if (v) params.append(k, String(v)); });
      // Le serveur valide ces champs avec la règle `boolean` : on envoie
      // « 1 » / « 0 », le format qu'elle accepte dans une query string.
      EQUIPEMENTS.forEach(({ key }) => params.append(key, equipements[key] ? '1' : '0'));

      const fd = new FormData();
      images.forEach((img, i) => {
        // On reprend le type MIME et le nom REELS fournis par le selecteur
        // plutot que d'annoncer « image/jpeg » pour tout fichier.
        // NB : le serveur n'accepte que jpg, jpeg, png, webp
        // (ProprieteController::store, regle `images.*`). Une photo HEIC
        // sera refusee avec une erreur 422, desormais affichee a l'ecran.
        const extension = (img.fileName?.split('.').pop() || 'jpg').toLowerCase();
        fd.append('images[]', {
          uri: img.uri,
          name: img.fileName || `image_${i}.${extension}`,
          type: img.mimeType || 'image/jpeg',
        } as any);
      });
      if (video) {
        fd.append('video', {
          uri: video.uri,
          name: video.fileName || 'video.mp4',
          type: video.mimeType || 'video/mp4',
        } as any);
      }

      const res = await postFile(`/proprietes?${params.toString()}`, fd);

      // Le serveur repond 201 (cree) mais certaines versions renvoient 200 :
      // n'accepter que 201 affichait « Erreur inattendue » sur un succes.
      if ((res.status === 201 || res.status === 200) && res.data?.data) {
        // Controle explicite : si l'annonce revient sans aucune image, on le
        // dit clairement plutot que d'annoncer un succes complet. C'est ce
        // silence qui rendait l'ancien bug si difficile a reperer.
        const nbImages = res.data.data?.images?.length ?? 0;
        if (nbImages === 0) {
          showAlert(
            'Annonce créée sans photo',
            "La propriété a bien été enregistrée, mais aucune photo n'a pu être envoyée. Modifiez l'annonce pour réessayer d'ajouter vos images."
          );
        } else {
          showAlert('Succès', res.data.message || 'Propriété créée avec succès');
        }
        router.replace('/djamabizz/dashboard');
        return;
      }

      if (res.data?.errors) {
        // Erreur de validation (422) : on affiche le détail exact de chaque
        // champ en cause, pas un message générique.
        const details = Object.values(res.data.errors as Record<string, string[]>)
          .flat()
          .join('\n');
        showAlert('Champs invalides', details || 'Merci de vérifier les informations saisies.');
        return;
      }

      showAlert('Erreur', res.data?.message || res.data?.error || `Erreur inattendue (code ${res.status}).`);
    } catch (e: any) {
      // Erreur réseau ou 500 non gérée par l'intercepteur : on remonte le
      // message exact du serveur si disponible, plutôt qu'un texte générique.
      const messageServeur = e?.response?.data?.message
        || (e?.response?.data?.errors ? Object.values(e.response.data.errors).flat().join('\n') : null);
      showAlert('Erreur', messageServeur || 'Erreur de connexion au serveur. Vérifiez votre connexion internet.');
    } finally {
      setLoading(false);
    }
  };

  /** Groupe de choix affiché sous forme de pastilles. */
  const Choix = ({ options, valeur, onChoisir }: {
    options: readonly { label: string; value: string }[];
    valeur: string;
    onChoisir: (v: string) => void;
  }) => (
    <View style={s.row}>
      {options.map((o) => (
        <TouchableOpacity
          key={o.value}
          style={[s.chip, valeur === o.value && s.chipActive]}
          onPress={() => onChoisir(o.value)}
        >
          <Text style={[s.chipText, valeur === o.value && s.chipTextActive]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  /** Petit champ numérique utilisé dans la grille des caractéristiques. */
  const Nombre = ({ nom, label }: { nom: string; label: string }) => (
    <View style={{ flex: 1, minWidth: 100 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        {...clavier.champ(nom, { keyboardType: 'numeric' })}
        style={s.input}
        value={(form as any)[nom]}
        onChangeText={(v: string) => set(nom, v.replace(/[^0-9]/g, ''))}
        placeholder="0"
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        {...clavier.propsScrollView}
        style={s.container}
        contentContainerStyle={{ padding: 20, paddingTop: 50, paddingBottom: 120 }}
      >
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={s.title}>Ajouter une propriété</Text>
        </View>

        {/* ── Informations de base ── */}
        <Text style={s.section}>Informations de base</Text>

        <Text style={s.label}>Titre *</Text>
        <TextInput
          {...clavier.champ('titre')}
          style={s.input}
          value={form.titre}
          onChangeText={(v) => set('titre', v)}
          placeholder="Ex: Appartement 3 chambres à Sonfonia"
        />

        <Text style={s.label}>Description *</Text>
        <TextInput
          {...clavier.champ('description', { multiligne: true })}
          style={[s.input, s.textarea]}
          value={form.description}
          onChangeText={(v) => set('description', v)}
          placeholder="Décrivez la propriété..."
        />

        <Text style={s.label}>Type</Text>
        <Choix options={TYPE_OPTIONS} valeur={form.type} onChoisir={(v) => set('type', v)} />

        <Text style={s.label}>Opération</Text>
        <Choix options={OPERATION_OPTIONS} valeur={form.operation} onChoisir={(v) => set('operation', v)} />

        <Text style={s.label}>Prix *</Text>
        <TextInput
          {...clavier.champ('prix', { keyboardType: 'numeric' })}
          style={s.input}
          value={form.prix}
          onChangeText={(v) => set('prix', v.replace(/[^0-9.]/g, ''))}
          placeholder="0"
        />

        <Text style={s.label}>Devise</Text>
        <Choix options={DEVISE_OPTIONS} valeur={form.devise} onChoisir={(v) => set('devise', v)} />

        {/* ── Caractéristiques de la propriété ── */}
        <Text style={s.section}>Caractéristiques de la propriété</Text>

        <Text style={s.label}>Surface (m²)</Text>
        <TextInput
          {...clavier.champ('surface', { keyboardType: 'numeric' })}
          style={s.input}
          value={form.surface}
          onChangeText={(v) => set('surface', v.replace(/[^0-9.]/g, ''))}
          placeholder="0"
        />

        <View style={s.grille}>
          <Nombre nom="chambres" label="Chambres" />
          <Nombre nom="salles_de_bain" label="Salles de bain" />
        </View>
        <View style={s.grille}>
          <Nombre nom="cuisines" label="Cuisines" />
          <Nombre nom="salons" label="Salons" />
        </View>
        <View style={s.grille}>
          <Nombre nom="garages" label="Garages" />
          <Nombre nom="etage" label="Étage" />
        </View>
        <View style={s.grille}>
          <Nombre nom="etages_immeuble" label="Étages immeuble" />
          <Nombre nom="annee_construction" label="Année construction" />
        </View>

        <Text style={s.label}>État du bien</Text>
        <Choix options={ETAT_OPTIONS} valeur={form.etat} onChoisir={(v) => set('etat', v)} />

        {/* ── Localisation ── */}
        <Text style={s.section}>Localisation</Text>

        <Text style={s.label}>Adresse *</Text>
        <TextInput
          {...clavier.champ('adresse')}
          style={s.input}
          value={form.adresse}
          onChangeText={(v) => set('adresse', v)}
          placeholder="Rue, quartier"
        />

        <View style={s.grille}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Ville *</Text>
            <TextInput
              {...clavier.champ('ville')}
              style={s.input}
              value={form.ville}
              onChangeText={(v) => set('ville', v)}
              placeholder="Conakry"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Quartier</Text>
            <TextInput
              {...clavier.champ('quartier')}
              style={s.input}
              value={form.quartier}
              onChangeText={(v) => set('quartier', v)}
              placeholder="Sonfonia"
            />
          </View>
        </View>

        {/* ── Équipements et commodités ── */}
        <Text style={s.section}>Équipements et commodités</Text>
        <View style={s.checkboxGrid}>
          {EQUIPEMENTS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={s.checkboxItem}
              onPress={() => basculer(item.key)}
            >
              <View style={[s.checkbox, equipements[item.key] && s.checkboxChecked]}>
                {equipements[item.key] && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Ionicons name={item.icon as any} size={18} color="#0f172a" />
              <Text style={s.checkboxLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Photos ── */}
        <Text style={s.section}>Photos *</Text>
        <TouchableOpacity style={s.uploadArea} onPress={pickImages}>
          <Ionicons name="cloud-upload-outline" size={36} color="#94a3b8" />
          <Text style={{ color: '#64748b', marginTop: 6 }}>Ajouter des photos</Text>
        </TouchableOpacity>

        {images.length > 0 && (
          <View style={s.imageGrid}>
            {images.map((img, i) => (
              <View key={i} style={s.imgWrap}>
                <Image source={{ uri: img.uri }} style={s.imgPreview} />
                <TouchableOpacity style={s.imgRemove} onPress={() => removeImage(i)}>
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── Vidéo de présentation ── */}
        <Text style={s.section}>Vidéo de présentation (facultatif)</Text>
        {video ? (
          <View style={s.videoPreview}>
            <View style={s.videoPlaceholder}>
              <Ionicons name="videocam" size={34} color="#94a3b8" />
              <Text style={s.videoText}>{video.fileName || 'Vidéo sélectionnée'}</Text>
            </View>
            <TouchableOpacity style={s.removeVideoBtn} onPress={() => setVideo(null)}>
              <Ionicons name="trash-outline" size={20} color="#dc2626" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.uploadBtn} onPress={pickVideo}>
            <Ionicons name="videocam-outline" size={20} color="#065483" />
            <Text style={s.uploadBtnText}>Ajouter une vidéo</Text>
          </TouchableOpacity>
        )}

        {/* ── Paramètres additionnels ── */}
        <Text style={s.section}>Paramètres additionnels</Text>

        <Text style={s.label}>Statut</Text>
        <Choix options={STATUT_OPTIONS} valeur={form.statut} onChoisir={(v) => set('statut', v)} />

        <Text style={s.label}>Date d&apos;expiration</Text>
        <TextInput
          {...clavier.champ('expire_le')}
          style={s.input}
          value={form.expire_le}
          onChangeText={(v) => set('expire_le', v)}
          placeholder="AAAA-MM-JJ"
        />

        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={s.submitText}>Publier la propriété</Text></>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 20 },
  section: {
    fontSize: 16, fontWeight: '800', color: '#065483',
    marginTop: 26, marginBottom: 4,
    borderBottomWidth: 2, borderBottomColor: '#e2e8f0', paddingBottom: 6,
  },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textarea: { height: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grille: { flexDirection: 'row', gap: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: '#065483', borderColor: '#065483' },
  chipText: { color: '#334155', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  checkboxGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  checkboxItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 10, paddingVertical: 10, marginBottom: 4,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#cbd5e1',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#065483', borderColor: '#065483' },
  checkboxLabel: { fontSize: 13, color: '#334155', fontWeight: '600' },
  uploadArea: { borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', borderRadius: 16, padding: 24, alignItems: 'center', backgroundColor: '#fff', marginTop: 12 },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#065483',
    paddingVertical: 14, marginTop: 12,
  },
  uploadBtnText: { color: '#065483', fontWeight: '700' },
  videoPreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, marginTop: 12 },
  videoPlaceholder: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  videoText: { color: '#475569', fontSize: 13, flexShrink: 1 },
  removeVideoBtn: { padding: 8 },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  imgWrap: { width: 80, height: 80, position: 'relative' },
  imgPreview: { width: 80, height: 80, borderRadius: 12 },
  imgRemove: { position: 'absolute', top: -6, right: -6, backgroundColor: '#ef4444', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  submitBtn: { backgroundColor: '#065483', borderRadius: 14, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 28 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

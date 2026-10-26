import { Alert, Platform } from 'react-native';

/**
 * `Alert.alert()` de `react-native-web` est un no-op total
 * (`static alert() {}` dans react-native-web/dist/cjs/exports/Alert/index.js)
 * — sur le web (ex: `expo start --web`, aperçu navigateur), aucun popup ne
 * s'affiche jamais, même si le code s'exécute correctement. C'est ce qui
 * donnait l'impression qu'aucune réponse n'arrivait après l'ajout d'une
 * propriété, alors que la réponse était bien reçue et traitée.
 *
 * Cette fonction affiche un vrai message quelle que soit la plateforme.
 */
export function showAlert(
  title: string,
  message?: string,
  buttons?: { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[]
) {
  if (Platform.OS === 'web') {
    const texte = message ? `${title}\n\n${message}` : title;

    if (buttons && buttons.length > 1) {
      const confirme = window.confirm(texte);
      const bouton = confirme
        ? buttons.find((b) => b.style !== 'cancel') ?? buttons[0]
        : buttons.find((b) => b.style === 'cancel') ?? buttons[buttons.length - 1];
      bouton?.onPress?.();
      return;
    }

    window.alert(texte);
    buttons?.[0]?.onPress?.();
    return;
  }

  Alert.alert(title, message, buttons);
}

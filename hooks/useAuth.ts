import { getResource } from '@/services/api';
import { ROLE_DJAMABIZZ } from '@/utils/djamabizz';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { jwtDecode } from 'jwt-decode';

/**
 * ---------------------------------------------------------------------------
 * AUTHENTIFICATION DE L'ESPACE DJAMABIZZ
 * ---------------------------------------------------------------------------
 *
 * L'espace DjamaBizz de l'app mobile est STRICTEMENT réservé aux comptes dont
 * le rôle est « djamabizz ». Tout autre compte (client, agent, administrateur)
 * est refusé à la connexion et déconnecté automatiquement s'il possédait déjà
 * un token valide.
 *
 * Le contrôle se fait à trois niveaux (défense en profondeur) :
 *
 *   1. À la connexion : la réponse de `/login` contient déjà `role`.
 *   2. Localement, sans appel réseau : le JWT embarque un claim `role`
 *      (voir App\Models\User::getJWTCustomClaims côté Laravel). On peut donc
 *      vérifier instantanément, même hors ligne, à chaque ouverture d'écran.
 *   3. Côté serveur : `GET /me` est interrogé pour confirmer le rôle réel
 *      (un JWT pourrait théoriquement dater d'avant un changement de rôle).
 */

export const CLE_TOKEN = 'token';
export const CLE_ROLE = 'role';

/** Extrait le rôle contenu dans le JWT sans appel réseau. */
export function roleDepuisToken(token?: string | null): string | null {
  if (!token) return null;
  try {
    const decoded: any = jwtDecode(token);
    const role = decoded?.role;
    return typeof role === 'string' ? role.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

export type RaisonRefus = 'ok' | 'absente' | 'role' | 'expiree' | 'reseau';

export type ResultatVerification = { autorise: boolean; raison: RaisonRefus };

export function estRoleDjamabizz(role?: string | null): boolean {
  return typeof role === 'string' && role.trim().toLowerCase() === ROLE_DJAMABIZZ;
}

export default function useAuth() {
  const router = useRouter();

  /**
   * Enregistre la session. `role` est stocké à part pour éviter de décoder le
   * JWT à chaque écran.
   */
  const login = async (token: string, role?: string | null) => {
    await AsyncStorage.setItem(CLE_TOKEN, token);
    const roleFinal = (role ?? roleDepuisToken(token) ?? '').trim().toLowerCase();
    if (roleFinal) {
      await AsyncStorage.setItem(CLE_ROLE, roleFinal);
    } else {
      await AsyncStorage.removeItem(CLE_ROLE);
    }
  };

  /** Efface la session locale sans redirection (usage interne / garde). */
  const clearSession = async () => {
    await AsyncStorage.multiRemove([CLE_TOKEN, CLE_ROLE]);
  };

  const logout = async () => {
    await clearSession();
    router.replace('/djamabizz');
  };

  const getToken = async () => AsyncStorage.getItem(CLE_TOKEN);

  const getRole = async () => {
    const stocke = await AsyncStorage.getItem(CLE_ROLE);
    if (stocke) return stocke;
    return roleDepuisToken(await AsyncStorage.getItem(CLE_TOKEN));
  };

  /**
   * Vérifie que la session courante appartient bien à un compte djamabizz.
   * `raison` permet à l'appelant d'afficher le bon message :
   *   - 'absente' : pas connecté (redirection silencieuse vers le login)
   *   - 'role'    : compte d'un autre type → déconnexion + message explicite
   *   - 'expiree' : session invalide côté serveur
   *   - 'reseau'  : serveur injoignable et rôle local inconnu
   */
  const verifierRoleDjamabizz = async (): Promise<ResultatVerification> => {
    const token = await getToken();
    if (!token) return { autorise: false, raison: 'absente' };

    // Contrôle local immédiat : un token appartenant à un autre rôle est
    // rejeté sans même contacter le serveur.
    const roleLocal = await getRole();
    if (roleLocal && !estRoleDjamabizz(roleLocal)) {
      return { autorise: false, raison: 'role' };
    }

    try {
      const res = await getResource('/me');

      // Réponse d'erreur interceptée par l'intercepteur axios (401/403…) :
      // la session n'est plus valide côté serveur.
      if (res?.status && res.status >= 400) return { autorise: false, raison: 'expiree' };

      const roleServeur = res?.data?.role ?? res?.data?.data?.role;
      if (!roleServeur) {
        // Le serveur n'a pas renvoyé le rôle : on s'en tient au rôle local,
        // déjà validé lors de la connexion.
        return estRoleDjamabizz(roleLocal)
          ? { autorise: true, raison: 'ok' }
          : { autorise: false, raison: 'role' };
      }

      if (!estRoleDjamabizz(roleServeur)) return { autorise: false, raison: 'role' };

      await AsyncStorage.setItem(CLE_ROLE, String(roleServeur).toLowerCase());
      return { autorise: true, raison: 'ok' };
    } catch {
      // Réseau indisponible : on ne déconnecte pas un djamabizz légitime pour
      // une simple coupure de connexion.
      return estRoleDjamabizz(roleLocal)
        ? { autorise: true, raison: 'ok' }
        : { autorise: false, raison: 'reseau' };
    }
  };

  return { login, logout, clearSession, getToken, getRole, verifierRoleDjamabizz };
}

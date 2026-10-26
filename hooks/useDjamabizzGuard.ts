import useAuth from '@/hooks/useAuth';
import { showAlert } from '@/utils/alert';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

/**
 * ---------------------------------------------------------------------------
 * GARDE D'ACCÈS — Espace DjamaBizz
 * ---------------------------------------------------------------------------
 *
 * À placer en tête de chaque écran privé de l'espace DjamaBizz (dashboard,
 * portefeuille, visites, profil, publication / édition d'annonce).
 *
 * Comportement :
 *   - Pas de token           → redirection silencieuse vers l'écran de connexion.
 *   - Token d'un autre rôle  → session effacée + message explicite + redirection.
 *   - Session expirée        → session effacée + invitation à se reconnecter.
 *   - Token djamabizz valide → accès autorisé.
 *
 * Le contrôle local (claim `role` du JWT) est instantané ; la confirmation
 * serveur (`GET /me`) intervient juste après, ce qui couvre le cas d'un compte
 * dont le rôle a été modifié par l'admin après l'émission du token.
 */
export default function useDjamabizzGuard() {
  const router = useRouter();
  const { verifierRoleDjamabizz, clearSession } = useAuth();

  const [verifie, setVerifie] = useState(false);
  const [autorise, setAutorise] = useState(false);
  // Évite d'empiler deux alertes si l'écran se remonte pendant la redirection.
  const dejaTraite = useRef(false);

  useEffect(() => {
    let actif = true;

    (async () => {
      const { autorise: ok, raison } = await verifierRoleDjamabizz();
      if (!actif || dejaTraite.current) return;

      if (ok) {
        setAutorise(true);
        setVerifie(true);
        return;
      }

      dejaTraite.current = true;
      await clearSession();
      setAutorise(false);
      setVerifie(true);

      if (raison === 'role') {
        showAlert(
          'Accès réservé',
          "Cet espace est réservé aux comptes DjamaBizz. Votre session a été fermée."
        );
      } else if (raison === 'expiree') {
        showAlert('Session expirée', 'Merci de vous reconnecter pour continuer.');
      } else if (raison === 'reseau') {
        showAlert(
          'Serveur injoignable',
          "Impossible de vérifier votre compte. Reconnectez-vous une fois la connexion rétablie."
        );
      }
      // raison === 'absente' : simple visiteur non connecté, aucun message.

      router.replace('/djamabizz?view=login');
    })();

    return () => {
      actif = false;
    };
  }, []);

  return { verifie, autorise };
}

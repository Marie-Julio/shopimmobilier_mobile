/**
 * ---------------------------------------------------------------------------
 * DJAMABIZZ — Règles de visibilité côté application mobile
 * ---------------------------------------------------------------------------
 *
 * Décision produit (30/08/2026) : un compte « djamabizz » est traité EXACTEMENT
 * comme n'importe quel autre agent sur toutes les vues publiques de l'app
 * (liste des agents, carrousel « Nos meilleurs agents », fiche profil,
 * bloc « Agent » sur une annonce). Plus aucune anonymisation ni filtrage
 * côté mobile — le backend renvoie déjà l'identité et les coordonnées
 * réelles de l'agent, quel que soit son rôle.
 *
 * Les fonctions ci-dessous sont conservées en no-op (elles ne masquent /
 * filtrent plus rien) pour ne pas casser les composants qui les appellent
 * encore, et pour pouvoir réactiver rapidement l'ancien comportement si la
 * règle métier redevient nécessaire. Toute la logique reste centralisée ici :
 * un seul endroit à modifier si elle doit évoluer de nouveau.
 */

export const ROLE_DJAMABIZZ = 'djamabizz';

/** Libellé neutre affiché à la place d'un agent djamabizz. */
export const LIBELLE_AGENT_MASQUE = 'Shop Immobilier';
export const SOUS_LIBELLE_AGENT_MASQUE = 'Annonce gérée par l’agence';

/** Forme minimale attendue d'un agent, quelle que soit la route appelée. */
export type AgentPartiel = {
  id_agent?: number;
  titre?: string | null;
  type_agent?: string | null;
  role?: string | null;
  est_djamabizz?: boolean | null;
  utilisateur?: { role?: string | null } | null;
} | null | undefined;

/**
 * Ancien indicateur « ceci est un compte Djamabizz, il faut le masquer ».
 *
 * Désactivé par décision produit : renvoie toujours `false` afin qu'aucun
 * composant ne remplace plus le nom/la photo/les coordonnées de l'agent par
 * un bloc neutre. Le paramètre est conservé pour compatibilité avec les
 * appels existants.
 */
export function estAgentDjamabizz(_agent: AgentPartiel): boolean {
  return false;
}

/** N'exclut plus personne : renvoie la liste telle quelle. */
export function filtrerAgentsVisibles<T extends AgentPartiel>(agents?: T[] | null): T[] {
  if (!Array.isArray(agents)) return [];
  return agents;
}

/**
 * Ancien indicateur « annonce publiée par un djamabizz, masquer le bloc
 * agent ». Désactivé par décision produit : renvoie toujours `false`.
 */
export function estAnnonceDjamabizz(_propriete?: { agent?: AgentPartiel } | null): boolean {
  return false;
}

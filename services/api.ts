import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// URL de base – utilise ta variable d'environnement
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

// Création de l'instance Axios
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// --- Intercepteur de requête : ajoute le token si présent ---
api.interceptors.request.use(async (config) => {
  // Tu peux exclure certaines URLs avec une condition, ex: config.url?.includes('noToken')
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['cache-control'] = 'no-cache'; // utile pour éviter le cache
  }
  return config;
});

// --- Intercepteur de réponse : transforme les erreurs "normales" en réponse, rejette les autres ---
// + rafraîchissement automatique et silencieux du token sur 401, pour éviter
// de renvoyer l'utilisateur à l'écran de connexion à chaque expiration
// (voir POST /refresh côté backend).
let isRefreshingToken = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onTokenRefreshed(newToken: string) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url: string = originalRequest?.url || '';
    const estRouteAuthSensible = url.includes('/refresh') || url.includes('login') || url.includes('register');

    const tokenActuel = await AsyncStorage.getItem('token');

    if (status === 401 && originalRequest && !originalRequest._retry && !estRouteAuthSensible && tokenActuel) {
      originalRequest._retry = true;

      if (!isRefreshingToken) {
        isRefreshingToken = true;
        try {
          const res = await axios.post(`${API_URL}/refresh`, {}, {
            headers: { Authorization: `Bearer ${tokenActuel}` },
          });
          const nouveauToken = res.data?.token?.access_token;

          if (!nouveauToken) throw new Error('Rafraîchissement du token invalide');

          await AsyncStorage.setItem('token', nouveauToken);
          isRefreshingToken = false;
          onTokenRefreshed(nouveauToken);

          // C'est CETTE requête qui a déclenché le rafraîchissement : elle
          // rejoue directement (la file d'attente ci-dessous ne concerne
          // que les AUTRES requêtes arrivées pendant le rafraîchissement,
          // sans quoi cette requête resterait bloquée indéfiniment en
          // attendant un signal déjà envoyé avant qu'elle ne s'y abonne).
          originalRequest.headers.Authorization = `Bearer ${nouveauToken}`;
          return api(originalRequest);
        } catch {
          isRefreshingToken = false;
          refreshSubscribers = [];
          // Session réellement terminée : l'utilisateur devra se reconnecter.
          await AsyncStorage.removeItem('token');
          if (error.response && [400, 401, 403, 404, 422].includes(error.response.status)) {
            return error.response;
          }
          return Promise.reject(error);
        }
      }

      return new Promise((resolve) => {
        refreshSubscribers.push((nouveauToken) => {
          originalRequest.headers.Authorization = `Bearer ${nouveauToken}`;
          resolve(api(originalRequest));
        });
      });
    }

    // Si l'erreur a une réponse et que le status est dans la liste, on retourne la réponse (pas de rejet)
    if (error.response && [400, 401, 403, 404, 422].includes(error.response.status)) {
      return error.response;
    }
    // Sinon on rejette pour que le code appelant puisse gérer (erreur réseau, 500, etc.)
    return Promise.reject(error);
  }
);

// --- Fonctions exportées (utilisant l'instance) ---

export const getResource = async <T = any>(
  url: string,
  params: Record<string, any> = {},
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> => {
  return api.get<T>(url, { params, ...config });
};

export const postResource = async <T = any>(
  url: string,
  data: any,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> => {
  return api.post<T>(url, data, config);
};

export const putResource = async <T = any>(
  url: string,
  data: any,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> => {
  return api.put<T>(url, data, config);
};

/**
 * PATCH — indispensable pour les routes annotées @OA\Patch côté backend
 * (ex. /modifier_utilisateur/{id}, /contacts-status/{id}). Les appeler en PUT
 * renvoie une erreur 405 « Method Not Allowed ».
 */
export const patchResource = async <T = any>(
  url: string,
  data: any,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> => {
  return api.patch<T>(url, data, config);
};

export const deleteResource = async <T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> => {
  return api.delete<T>(url, config);
};

// Version avec un ID (comme dans ton second exemple)
export const deleteResourceById = async <T = any>(
  url: string,
  id: any,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> => {
  return api.delete<T>(`${url}/${id}`, config);
};

// Upload de fichier avec progression
export const uploadFile = async <T = any>(
  url: string,
  formData: FormData,
  _onProgress?: (progress: number) => void
): Promise<AxiosResponse<T>> => {
  // Même piège que postFile avec axios : on délègue à la version fetch.
  // (La progression n'est pas remontée ; fonction non utilisée actuellement.)
  return postFile<T>(url, formData);
};

/**
 * ---------------------------------------------------------------------------
 *  ENVOI DE FICHIERS (images, vidéo, photo de profil) — via fetch, PAS axios
 * ---------------------------------------------------------------------------
 *
 *  Pourquoi pas axios ici : son traitement d'un FormData React Native dépend
 *  de sa version. Le package.json autorise « ^1.13.6 » :
 *   - axios >= 1.17 retire lui-même le Content-Type → OK ;
 *   - axios <  1.17 garde le Content-Type fourni (ou celui par défaut de
 *     l'instance) → sur Android, l'en-tête reçu par la couche native n'est
 *     pas un multipart valide et les photos n'arrivent pas au serveur,
 *     alors que les champs texte (passés dans l'URL) créent bien l'annonce.
 *
 *  fetch n'a pas ce problème : on ne fixe AUCUN Content-Type, et React Native
 *  construit lui-même « multipart/form-data; boundary=... » sur iOS comme sur
 *  Android (méthode documentée par React Native pour les envois de fichiers).
 *
 *  La réponse imite celle d'axios ({ status, data }) et suit la même
 *  convention que l'intercepteur : 400/401/403/404/422 sont renvoyés comme
 *  des réponses, les autres erreurs sont levées avec `error.response`.
 */
export const postFile = async <T = any>(
  url: string,
  data: FormData,
  _config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> => {
  const token = await AsyncStorage.getItem('token');
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  // SURTOUT PAS de 'Content-Type' : il effacerait la boundary.

  const urlComplete = /^https?:\/\//.test(url)
    ? url
    : `${API_URL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;

  const res = await fetch(urlComplete, { method: 'POST', headers, body: data as any });

  const texte = await res.text();
  let corps: any = null;
  try {
    corps = texte ? JSON.parse(texte) : null;
  } catch {
    corps = texte;
  }

  const reponse = {
    data: corps,
    status: res.status,
    statusText: res.statusText,
    headers: {},
    config: {},
  } as AxiosResponse<T>;

  if (res.ok || [400, 401, 403, 404, 422].includes(res.status)) {
    return reponse;
  }
  const erreur: any = new Error(`Request failed with status code ${res.status}`);
  erreur.response = reponse;
  throw erreur;
};

export default api;
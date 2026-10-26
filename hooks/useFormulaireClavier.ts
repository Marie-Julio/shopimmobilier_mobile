import { useCallback, useEffect, useRef } from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type TextInputProps,
} from 'react-native';

/**
 * Confort de saisie des formulaires.
 *
 *  1. Le champ sur lequel on tape remonte au-dessus du clavier, qui sinon le
 *     cache complètement sur les petits écrans.
 *  2. La touche « Entrée » passe au champ suivant.
 *  3. Sur le dernier champ, la touche devient « OK » et referme le clavier.
 *
 * Utilisation :
 *
 *   const clavier = useFormulaireClavier(['nom', 'email', 'telephone']);
 *   <ScrollView {...clavier.propsScrollView}>
 *     <TextInput {...clavier.champ('nom')} />
 *     <TextInput {...clavier.champ('email', { keyboardType: 'email-address' })} />
 *     <TextInput {...clavier.champ('telephone')} />
 *   </ScrollView>
 *
 * Un champ multiligne se déclare avec { multiligne: true } : « Entrée » y
 * insère un retour à la ligne au lieu de sauter au champ suivant.
 */
export function useFormulaireClavier<T extends string>(ordre: T[]) {
  const scrollRef = useRef<ScrollView | null>(null);
  const champsRef = useRef<Partial<Record<T, TextInput | null>>>({});
  const positionY = useRef(0);          // défilement courant
  const hauteurClavier = useRef(0);
  const hauteurVisible = useRef(0);     // hauteur de la zone de défilement

  useEffect(() => {
    const ouvert = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => { hauteurClavier.current = e.endCoordinates?.height ?? 0; }
    );
    const ferme = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => { hauteurClavier.current = 0; }
    );
    return () => { ouvert.remove(); ferme.remove(); };
  }, []);

  const propsScrollView = {
    ref: scrollRef,
    keyboardShouldPersistTaps: 'handled' as const,
    keyboardDismissMode: (Platform.OS === 'ios' ? 'interactive' : 'on-drag') as
      | 'interactive'
      | 'on-drag',
    scrollEventThrottle: 16,
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      positionY.current = e.nativeEvent.contentOffset.y;
      hauteurVisible.current = e.nativeEvent.layoutMeasurement.height;
    },
    onLayout: (e: any) => { hauteurVisible.current = e.nativeEvent.layout.height; },
  };

  /** Fait remonter le champ juste au-dessus du clavier s'il est masqué. */
  const remonter = useCallback((nom: T) => {
    // Le clavier s'ouvre avec un léger décalage : on mesure après coup.
    setTimeout(() => {
      const champ = champsRef.current[nom];
      const scroll = scrollRef.current as any;
      if (!champ || !scroll) return;
      try {
        (champ as any).measureLayout(
          scroll.getInnerViewNode ? scroll.getInnerViewNode() : scroll,
          (_x: number, y: number, _w: number, h: number) => {
            const clavier = hauteurClavier.current || 300;   // valeur de repli
            const visible = (hauteurVisible.current || 600) - clavier;
            const basDuChamp = y + h;
            const marge = 24;
            // Le champ dépasse sous le clavier : on défile juste ce qu'il faut.
            if (basDuChamp > positionY.current + visible - marge) {
              scroll.scrollTo({ y: basDuChamp - visible + marge, animated: true });
            } else if (y < positionY.current + marge) {
              scroll.scrollTo({ y: Math.max(0, y - marge), animated: true });
            }
          },
          () => {}
        );
      } catch {
        // measureLayout indisponible : on ne bloque jamais la saisie.
      }
    }, Platform.OS === 'ios' ? 120 : 220);
  }, []);

  /** Props à étaler sur un <TextInput>. */
  const champ = useCallback(
    (
      nom: T,
      options: TextInputProps & { multiligne?: boolean } = {}
    ): TextInputProps & { ref: (el: TextInput | null) => void } => {
      const { multiligne, onFocus, ...reste } = options;
      const index = ordre.indexOf(nom);
      const suivant = index >= 0 && index < ordre.length - 1 ? ordre[index + 1] : null;

      return {
        ref: (el: TextInput | null) => { champsRef.current[nom] = el; },
        onFocus: (e) => { remonter(nom); onFocus?.(e); },
        ...(multiligne
          ? { multiline: true }
          : {
              returnKeyType: suivant ? 'next' : 'done',
              // 'submit' garde le clavier ouvert pour enchaîner sur le champ
              // suivant ; 'blurAndSubmit' le referme sur le dernier champ.
              // (submitBehavior remplace blurOnSubmit depuis React Native 0.73.)
              submitBehavior: suivant ? 'submit' : 'blurAndSubmit',
              onSubmitEditing: () => {
                // Le champ suivant peut ne pas être affiché (formulaire en
                // plusieurs étapes) : dans ce cas on referme le clavier
                // plutôt que de le laisser ouvert sans rien faire.
                const cible = suivant ? champsRef.current[suivant] : null;
                if (cible) cible.focus();
                else Keyboard.dismiss();
              },
            }),
        ...reste,
      };
    },
    [ordre, remonter]
  );

  return { propsScrollView, champ, scrollRef, focus: (nom: T) => champsRef.current[nom]?.focus() };
}

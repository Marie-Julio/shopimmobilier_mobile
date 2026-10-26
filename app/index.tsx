import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width, height } = Dimensions.get('window');

const FloatingParticle = ({ delay, size, startX, startY }: any) => {
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(animation, {
          toValue: 1,
          duration: 8000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height * 1.5],
  });

  const translateX = animation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 50, 0],
  });

  const opacity = animation.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [1, 0.8, 0.4, 0],
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          left: startX,
          top: startY,
          opacity,
          transform: [{ translateY }, { translateX }],
        },
      ]}
    />
  );
};

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animation de pulsation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animation de rotation lente
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Animation d'entrée
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Image de fond avec parallax */}
      <Image
        source={require('../assets/images/fond.jpg')}
        style={styles.backgroundImage}
      />
      
      {/* Overlay avec couleur unie (dégradé supprimé) */}
      <View style={styles.overlay} />

      {/* Contenu principal */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={require('../assets/images/react-logo.png')}
          style={styles.logo}
        />
        {/* Sous-titre */}
        <Text style={styles.subtagline2}>Shopimmobilier</Text>
        
        {/* Ligne décorative animée */}
        <View style={styles.decorativeContainer}>
          <View style={styles.decorativeLine} />
          <Animated.View 
            style={[
              styles.decorativeDot,
              {
                transform: [
                  {
                    translateX: pulseAnim.interpolate({
                      inputRange: [1, 1.2],
                      outputRange: [0, 20],
                    }),
                  },
                ],
              },
            ]} 
          />
          <View style={styles.decorativeLine} />
        </View>

        {/* Slogan */}
        <Text style={styles.tagline}>Votre partenaire immobilier</Text>
        
        {/* Sous-titre */}
        <Text style={styles.subtagline}>Trouvez le bien de vos rêves</Text>

        {/* Bouton sans LinearGradient */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Découvrir"
        >
          <View style={styles.buttonBackground}>
            <Text style={styles.buttonText}>Découvrir</Text>
          </View>
        </TouchableOpacity>

        {/* Indicateur de chargement */}
        <View style={styles.loadingContainer}>
          <View style={styles.loadingDot} />
          <View style={[styles.loadingDot, styles.loadingDotActive]} />
          <View style={styles.loadingDot} />
        </View>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(6,84,131,0.95)', // couleur unie à la place du dégradé
  },
  particle: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 999,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logo: {
  },
  decorativeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '60%',
  },
  decorativeLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  decorativeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EC9107',
    marginHorizontal: 10,
  },
  tagline: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtagline2: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.8)',
    paddingTop: 20,
    marginBottom: 250,
  },
  subtagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 40,
  },
  button: {
    width: '80%',
    marginBottom: 30,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonBackground: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    gap: 10,
    backgroundColor: '#EC9107', // couleur unie orange
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  loadingDotActive: {
    width: 20,
    backgroundColor: '#EC9107',
  },
});
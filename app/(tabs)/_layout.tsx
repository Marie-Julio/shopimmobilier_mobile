import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
} from 'react-native';
import djbPng from '../../assets/images/djb.png'; // Votre image PNG

const AnimatedTabIcon = ({
  name,
  focused,
  color,
  isCenter = false,
  CustomIcon,
  imageSource,
  iconSize = 24,
}: {
  name?: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
  isCenter?: boolean;
  CustomIcon?: React.FC<{
    width?: number;
    height?: number;
    fill?: string;
  }>;
  imageSource?: any;
  iconSize?: number;
}) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const translateYValue = useRef(new Animated.Value(0)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;
  const glowValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1.3,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.spring(translateYValue, {
          toValue: isCenter ? -8 : -4,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(rotateValue, {
          toValue: 1,
          duration: 300,
          easing: Easing.elastic(1),
          useNativeDriver: true,
        }),
        Animated.timing(glowValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.spring(translateYValue, {
          toValue: 0,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(rotateValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(glowValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [focused, isCenter]);

  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '5deg'],
  });

  const glowOpacity = glowValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  const renderIcon = (size: number, iconColor: string) => {
    // Si une image est fournie, on l'affiche sans aucune teinte
    if (imageSource) {
      return (
        <Image
          source={imageSource}
          style={{
            width: size,
            height: size,
          }}
          resizeMode="contain"
        />
      );
    }

    if (CustomIcon) {
      return (
        <CustomIcon
          width={size}
          height={size}
          fill={iconColor}
        />
      );
    }

    return (
      <Ionicons
        name={name!}
        size={size}
        color={iconColor}
      />
    );
  };

  if (isCenter) {
    return (
      <View style={styles.centerWrapper}>
        <Animated.View
          style={[
            styles.centerGlow,
            {
              opacity: glowOpacity,
              transform: [{ scale: glowValue }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.centerIconContainer,
            {
              transform: [
                { scale: scaleValue },
                { translateY: translateYValue },
                { rotate },
              ],
            },
          ]}
        >
          {renderIcon(32, '#fff')}
        </Animated.View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.iconWrapper,
        {
          transform: [
            { scale: scaleValue },
            { translateY: translateYValue },
            { rotate },
          ],
        },
      ]}
    >
      {renderIcon(iconSize, color)}
    </Animated.View>
  );
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          height: 85,
          paddingBottom: 12,
          paddingTop: 12,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -4,
          },
          shadowOpacity: 0.15,
          shadowRadius: 15,
          elevation: 10,
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
          letterSpacing: 0.3,
        },
        tabBarActiveTintColor: '#065483',
        tabBarInactiveTintColor: '#b0b0b0',
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ focused, color }) => (
            <AnimatedTabIcon
              name={focused ? 'home-sharp' : 'home-outline'}
              focused={focused}
              color={color}
              iconSize={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="blog"
        options={{
          title: 'Actualités',
          tabBarIcon: ({ focused, color }) => (
            <AnimatedTabIcon
              name={focused ? 'newspaper-sharp' : 'newspaper-outline'}
              focused={focused}
              color={color}
              iconSize={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="property"
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('property', { screen: 'index' });
          },
        })}
        options={{
          title: 'Propriétés',
          tabBarIcon: ({ focused, color }) => (
            <AnimatedTabIcon
              name={focused ? 'search-sharp' : 'search-outline'}
              focused={focused}
              color={color}
              iconSize={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="djamabizz"
        options={{
          title: 'Djamabizz',
          tabBarIcon: ({ focused, color }) => (
            <View style={styles.djamabizzIconWrapper}>
              <AnimatedTabIcon
                imageSource={djbPng}
                focused={focused}
                color={color} // couleur non utilisée pour l'image
                iconSize={40}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="contact"
        options={{
          title: 'Contact',
          tabBarIcon: ({ focused, color }) => (
            <AnimatedTabIcon
              name={focused ? 'mail-sharp' : 'mail-outline'}
              focused={focused}
              color={color}
              iconSize={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  djamabizzIconWrapper: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  centerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  centerIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 25,
    backgroundColor: '#065483',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -35,
    shadowColor: '#065483',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 15,
    borderWidth: 4,
    borderColor: '#fff',
  },
  centerGlow: {
    position: 'absolute',
    width: 73,
    height: 73,
    borderRadius: 28,
    backgroundColor: '#065483',
    top: -45,
    opacity: 0.3,
  },
});
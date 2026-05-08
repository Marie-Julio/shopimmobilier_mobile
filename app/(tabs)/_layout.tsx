import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const AnimatedTabIcon = ({ 
  name, 
  focused, 
  color,
  isCenter = false 
}: { 
  name: keyof typeof Ionicons.glyphMap; 
  focused: boolean; 
  color: string;
  isCenter?: boolean;
}) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const translateYValue = useRef(new Animated.Value(0)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;
  const glowValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      // Animation complexe au focus
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
  }, [focused]);

  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '5deg']
  });

  const glowOpacity = glowValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3]
  });

  if (isCenter) {
    return (
      <View style={styles.centerWrapper}>
        <Animated.View 
          style={[
            styles.centerGlow,
            {
              opacity: glowOpacity,
              transform: [{ scale: glowValue }]
            }
          ]}
        />
        <Animated.View 
          style={[
            styles.centerIconContainer,
            {
              transform: [
                { scale: scaleValue },
                { translateY: translateYValue },
                { rotate: rotate }
              ]
            }
          ]}
        >
          <Ionicons 
            name={name}
            size={32} 
            color="#fff" 
          />
        </Animated.View>
      </View>
    );
  }

  return (
    <Animated.View style={{
      transform: [
        { scale: scaleValue },
        { translateY: translateYValue },
        { rotate: rotate }
      ]
    }}>
      <Ionicons 
        name={name}
        size={24} 
        color={color} 
      />
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
          shadowOffset: { width: 0, height: -4 },
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
              name={focused ? "home-sharp" : "home-outline"} 
              focused={focused}
              color={color}
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
              name={focused ? "newspaper-sharp" : "newspaper-outline"} 
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      
      <Tabs.Screen
        name="property"
        options={{
          title: 'Propriétés',
          tabBarIcon: ({ focused, color }) => (
            <AnimatedTabIcon 
              name={focused ? "search-sharp" : "search-outline"} 
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      
      <Tabs.Screen
        name="agent"
        options={{
          title: 'Agents',
          tabBarIcon: ({ focused, color }) => (
            <AnimatedTabIcon 
              name={focused ? "people-sharp" : "people-outline"} 
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      
      <Tabs.Screen
        name="contact"
        options={{
          title: 'Contact',
          tabBarIcon: ({ focused, color }) => (
            <AnimatedTabIcon 
              name={focused ? "mail-sharp" : "mail-outline"} 
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
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
    shadowOffset: { width: 0, height: 8 },
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
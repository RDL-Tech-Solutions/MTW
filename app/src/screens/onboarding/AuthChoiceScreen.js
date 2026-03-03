import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

export default function AuthChoiceScreen({ navigation }) {
  // Animações
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(50)).current;
  const button1Scale = useRef(new Animated.Value(0.8)).current;
  const button2Scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Sequência de animações de entrada
    Animated.sequence([
      // Logo e texto aparecem
      Animated.parallel([
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideUp, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // Botões aparecem
      Animated.parallel([
        Animated.spring(button1Scale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(button2Scale, {
          toValue: 1,
          delay: 100,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={['#DC2626', '#B91C1C', '#991B1B']}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View 
          style={[
            styles.logoContainer,
            {
              opacity: fadeIn,
              transform: [{ translateY: slideUp }],
            }
          ]}
        >
          {/* Ícone SEM animação */}
          <View style={styles.logoCircle}>
            <Ionicons name="pricetag" size={60} color="#DC2626" />
          </View>
          <Text style={styles.logoText}>PreçoCerto</Text>
          <Text style={styles.tagline}>Economize com inteligência</Text>
        </Animated.View>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <Animated.View style={{ transform: [{ scale: button1Scale }] }}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Criar Conta</Text>
              <Ionicons name="person-add" size={20} color="#DC2626" />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: button2Scale }] }}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Já tenho conta</Text>
              <Ionicons name="log-in" size={20} color="#FFF" />
            </TouchableOpacity>
          </Animated.View>

          <Animated.Text 
            style={[
              styles.termsText,
              { opacity: fadeIn }
            ]}
          >
            Ao continuar, você concorda com nossos{'\n'}
            <Text style={styles.termsLink}>Termos de Uso</Text> e{' '}
            <Text style={styles.termsLink}>Política de Privacidade</Text>
          </Animated.Text>
        </View>
      </View>

      {/* Decorative Elements */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />
      <View style={styles.circle3} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: height * 0.15,
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#FEE2E2',
    fontWeight: '500',
  },
  buttonsContainer: {
    gap: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    paddingVertical: 18,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#DC2626',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  termsText: {
    fontSize: 12,
    color: '#FEE2E2',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  termsLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  // Decorative circles
  circle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle2: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  circle3: {
    position: 'absolute',
    top: height * 0.4,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});

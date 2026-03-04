import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFcmStore } from '../../stores/fcmStore';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: 1,
    icon: 'pricetag',
    title: 'Melhores Ofertas',
    description: 'Encontre os melhores preços e cupons de desconto das principais lojas do Brasil',
    color: '#DC2626',
    gradient: ['#DC2626', '#EF4444'],
    features: [
      { icon: 'flash', text: 'Ofertas em tempo real' },
      { icon: 'trending-down', text: 'Até 90% de desconto' },
      { icon: 'gift', text: 'Cupons exclusivos' },
    ],
  },
  {
    id: 2,
    icon: 'notifications',
    title: 'Notificações Personalizadas',
    description: 'Receba alertas de produtos e categorias que você realmente se interessa',
    color: '#F59E0B',
  },
  {
    id: 3,
    icon: 'heart',
    title: 'Salve seus Favoritos',
    description: 'Marque produtos e cupons favoritos para acessar rapidamente quando precisar',
    color: '#10B981',
  },
  {
    id: 4,
    icon: 'notifications-circle',
    title: 'Ativar Notificações?',
    description: 'Permita que enviemos alertas sobre ofertas imperdíveis e cupons exclusivos. Você pode desativar a qualquer momento.',
    color: '#DC2626',
    hasAction: true,
  },
];

export default function OnboardingScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef(null);
  const [requestingPermission, setRequestingPermission] = useState(false);

  // FCM Store
  const { requestPermission, isAvailable } = useFcmStore();

  // Animações para texto
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Animar entrada do texto
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentIndex]);

  const viewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      // Reset animações
      fadeAnim.setValue(0);
      slideUpAnim.setValue(30);
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollTo = () => {
    if (currentIndex < slides.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem('@onboarding_completed', 'true');
      navigation.replace('AuthChoice');
    } catch (error) {
      console.error('Erro ao salvar onboarding:', error);
    }
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem('@onboarding_completed', 'true');
      navigation.replace('AuthChoice');
    } catch (error) {
      console.error('Erro ao salvar onboarding:', error);
    }
  };

  // Função para ativar notificações
  const handleActivateNotifications = async () => {
    if (!isAvailable) {
      Alert.alert(
        'Notificações Não Disponíveis',
        'As notificações push não estão disponíveis neste dispositivo. Você pode ativá-las depois nas configurações.',
        [{ text: 'OK', onPress: handleFinish }]
      );
      return;
    }

    try {
      setRequestingPermission(true);
      const granted = await requestPermission();

      if (granted) {
        Alert.alert(
          'Sucesso! 🎉',
          'Notificações ativadas! Você receberá alertas sobre ofertas imperdíveis.',
          [{ text: 'Continuar', onPress: handleFinish }]
        );
      } else {
        Alert.alert(
          'Sem Problema',
          'Você pode ativar as notificações depois em Configurações.',
          [{ text: 'OK', onPress: handleFinish }]
        );
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      Alert.alert(
        'Erro',
        'Não foi possível solicitar permissão. Você pode tentar depois nas configurações.',
        [{ text: 'OK', onPress: handleFinish }]
      );
    } finally {
      setRequestingPermission(false);
    }
  };

  // Função para pular ativação de notificações
  const handleSkipNotifications = () => {
    Alert.alert(
      'Tem Certeza?',
      'Você pode perder ofertas incríveis! Quer mesmo pular?',
      [
        { text: 'Ativar Agora', onPress: handleActivateNotifications },
        { text: 'Pular', onPress: handleFinish, style: 'cancel' },
      ]
    );
  };

  // Animação de pulse no botão Next
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const renderSlide = ({ item }) => (
    <View style={styles.slide}>
      {/* Ícone com gradiente para primeiro slide */}
      <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon} size={80} color={item.color} />
      </View>

      {/* Texto COM animação */}
      <Animated.View
        style={{
          width: '100%',
          opacity: fadeAnim,
          transform: [{ translateY: slideUpAnim }],
        }}
      >
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>

        {/* Features do primeiro slide */}
        {item.features && (
          <View style={styles.featuresContainer}>
            {item.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={[styles.featureIconContainer, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={feature.icon} size={24} color={item.color} />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>
        )}
      </Animated.View>

      {/* Botões de ação para slide de notificações */}
      {item.hasAction && (
        <Animated.View
          style={[
            styles.actionButtonsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.actionButton, styles.activateButton]}
            onPress={handleActivateNotifications}
            disabled={requestingPermission}
            activeOpacity={0.8}
          >
            {requestingPermission ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="notifications" size={20} color="#FFF" />
                <Text style={styles.actionButtonText}>Ativar Agora</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.skipActionButton]}
            onPress={handleSkipNotifications}
            disabled={requestingPermission}
            activeOpacity={0.7}
          >
            <Text style={styles.skipActionButtonText}>Mais Tarde</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Skip Button */}
      {currentIndex < slides.length - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Pular</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <Animated.FlatList
        ref={slidesRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(item) => item.id.toString()}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        scrollEventThrottle={32}
      />

      {/* Pagination */}
      <View style={styles.pagination}>
        {slides.map((_, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [10, 30, 10],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[styles.dot, { width: dotWidth, opacity }]}
            />
          );
        })}
      </View>

      {/* Next/Finish Button - Não mostrar no slide de ativação */}
      {!slides[currentIndex]?.hasAction && (
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={scrollTo}
            activeOpacity={0.8}
          >
            <Text style={styles.nextText}>
              {currentIndex === slides.length - 1 ? 'Começar' : 'Próximo'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresContainer: {
    marginTop: 32,
    width: '100%',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  dot: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
    marginHorizontal: 4,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    marginHorizontal: 40,
    marginBottom: 60,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  actionButtonsContainer: {
    width: '100%',
    paddingHorizontal: 40,
    marginTop: 40,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activateButton: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOpacity: 0.3,
  },
  skipActionButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  skipActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});

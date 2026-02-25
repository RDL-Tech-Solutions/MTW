import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ onFinish }) {
  const videoRef = useRef(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    // Configurar áudio para permitir reprodução
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
        });
      } catch (error) {
        console.log('Erro ao configurar áudio:', error);
      }
    };

    setupAudio();

    // Fallback: garantir que onFinish seja chamado após 6s mesmo se vídeo falhar
    const fallbackTimer = setTimeout(() => {
      if (onFinish) {
        onFinish();
      }
    }, 6500);

    return () => clearTimeout(fallbackTimer);
  }, [onFinish]);

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded && !videoLoaded) {
      setVideoLoaded(true);
    }

    // Quando vídeo terminar, chamar onFinish
    if (status.didJustFinish) {
      if (onFinish) {
        onFinish();
      }
    }
  };

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={require('../../../assets/intro.mp4')}
        style={styles.video}
        resizeMode={ResizeMode.COVER}  // COVER preenche toda tela
        shouldPlay={true}
        isLooping={false}
        isMuted={false}
        volume={1.0}
        rate={1.0}
        useNativeControls={false}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        onLoad={() => {
          if (videoRef.current) {
            videoRef.current.playAsync();
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: '100%',
    height: '100%',
  },
});

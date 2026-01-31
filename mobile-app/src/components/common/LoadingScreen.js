import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../theme/theme';
import LoadingSpinner from './LoadingSpinner';

const { width } = Dimensions.get('window');

/**
 * Tela de loading animada e moderna
 */
export default function LoadingScreen({ message = 'Carregando...' }) {
    const { colors } = useThemeStore();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const dotsAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Fade in
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();

        // Float animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: -10,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Dots animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(dotsAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: false,
                }),
                Animated.timing(dotsAnim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: false,
                }),
            ])
        ).start();
    }, []);

    const dots = dotsAnim.interpolate({
        inputRange: [0, 0.33, 0.66, 1],
        outputRange: ['', '.', '..', '...'],
    });

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.background, colors.card]}
                style={StyleSheet.absoluteFill}
            />

            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: floatAnim }],
                    },
                ]}
            >
                <LoadingSpinner size={60} />

                <View style={styles.textContainer}>
                    <Text style={[styles.message, { color: colors.text }]}>
                        {message}
                    </Text>
                    <View style={styles.dotsContainer}>
                        <Animated.Text style={[styles.dots, { color: colors.primary }]}>
                            {dots.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['', '...'],
                            })}
                        </Animated.Text>
                    </View>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        gap: 24,
    },
    textContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 24,
    },
    message: {
        fontSize: 16,
        fontWeight: '600',
    },
    dotsContainer: {
        width: 24,
        alignItems: 'flex-start',
    },
    dots: {
        fontSize: 16,
        fontWeight: '600',
    },
});

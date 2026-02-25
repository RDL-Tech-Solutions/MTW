import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme/theme';

export default function GradientHeader({
    title,
    subtitle,
    gradientColors,
    leftComponent,
    rightComponent,
    height = 140,
    showBackButton = false,
    onBackPress,
}) {
    const { colors } = useThemeStore();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-20)).current;

    const defaultGradient = gradientColors || [colors.primary, colors.primaryDark || colors.primary];

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <LinearGradient
            colors={defaultGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradient, { minHeight: height }]}
        >
            <SafeAreaView edges={['top']} style={styles.safeArea}>
                <View style={styles.container}>
                    {/* Top Actions Row */}
                    <View style={styles.actionsRow}>
                        {/* Left Side */}
                        <View style={styles.leftSection}>
                            {showBackButton && onBackPress && (
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={onBackPress}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="arrow-back" size={24} color="#fff" />
                                </TouchableOpacity>
                            )}
                            {leftComponent && !showBackButton && leftComponent}
                        </View>

                        {/* Right Side */}
                        {rightComponent && (
                            <View style={styles.rightSection}>
                                {rightComponent}
                            </View>
                        )}
                    </View>

                    {/* Content Section */}
                    <Animated.View
                        style={[
                            styles.content,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            },
                        ]}
                    >
                        {/* Avatar/Icon if provided */}
                        {leftComponent && showBackButton && (
                            <View style={styles.avatarSection}>
                                {leftComponent}
                            </View>
                        )}

                        {/* Title and Subtitle */}
                        <View style={styles.textSection}>
                            {title && (
                                <Text style={styles.title} numberOfLines={1}>
                                    {title}
                                </Text>
                            )}
                            {subtitle && (
                                <Text style={styles.subtitle} numberOfLines={2}>
                                    {subtitle}
                                </Text>
                            )}
                        </View>
                    </Animated.View>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        width: '100%',
    },
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 12,
        justifyContent: 'space-between',
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        ...(Platform.OS === 'web' ? {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        } : {
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
        }),
    },
    content: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingBottom: 4,
    },
    avatarSection: {
        marginBottom: 12,
        alignItems: 'flex-start',
    },
    textSection: {
        gap: 4,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.3,
        ...(Platform.OS === 'web' ? {
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        } : {
            textShadowColor: 'rgba(0, 0, 0, 0.1)',
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 4,
        }),
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.95)',
        lineHeight: 20,
        ...(Platform.OS === 'web' ? {
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
        } : {
            textShadowColor: 'rgba(0, 0, 0, 0.1)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
        }),
    },
});

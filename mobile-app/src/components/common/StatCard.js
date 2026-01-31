import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme/theme';

export default function StatCard({
    icon,
    iconColor,
    value,
    label,
    gradient = false,
    gradientColors,
    onPress,
}) {
    const { colors } = useThemeStore();
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const defaultGradient = gradientColors || [colors.primary + '15', colors.primary + '05'];
    const cardColor = iconColor || colors.primary;

    // Fade in animation on mount
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

    // Scale animation on press
    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
        }).start();
    };

    const CardContent = () => (
        <View style={[styles.container, { backgroundColor: gradient ? 'transparent' : colors.card, borderColor: colors.border }]}>
            {/* Icon Container */}
            <View style={[styles.iconContainer, { backgroundColor: cardColor + '20' }]}>
                <Ionicons name={icon} size={22} color={cardColor} />
            </View>

            {/* Value */}
            <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
                {value}
            </Text>

            {/* Label */}
            <Text style={[styles.label, { color: colors.textMuted }]} numberOfLines={1}>
                {label}
            </Text>
        </View>
    );

    const animatedStyle = {
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
    };

    if (gradient) {
        return (
            <Animated.View style={[styles.wrapper, animatedStyle]}>
                <TouchableOpacity
                    onPress={onPress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    activeOpacity={1}
                    disabled={!onPress}
                >
                    <LinearGradient
                        colors={defaultGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.container, { borderColor: colors.border }]}
                    >
                        <CardContent />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        );
    }

    return (
        <Animated.View style={[styles.wrapper, animatedStyle]}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                disabled={!onPress}
            >
                <CardContent />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
    },
    container: {
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        minHeight: 100,
        ...(Platform.OS === 'web' ? {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        } : {
            elevation: 3,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
        }),
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    value: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 2,
        letterSpacing: 0.5,
    },
    label: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});

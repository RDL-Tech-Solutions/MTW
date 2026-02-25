import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme/theme';

export default function MenuCard({
    icon,
    iconColor,
    iconBackground,
    title,
    subtitle,
    onPress,
    badge,
    rightComponent,
    showArrow = true,
    danger = false,
}) {
    const { colors } = useThemeStore();
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const cardIconColor = danger ? colors.error : (iconColor || colors.primary);
    const cardIconBg = danger ? colors.errorLight : (iconBackground || colors.primary + '15');

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.98,
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

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
            >
                {/* Icon Container */}
                <View style={[styles.iconContainer, { backgroundColor: cardIconBg }]}>
                    <Ionicons name={icon} size={24} color={cardIconColor} />
                </View>

                {/* Content */}
                <View style={styles.content}>
                    <View style={styles.textContainer}>
                        <Text style={[styles.title, { color: danger ? colors.error : colors.text }]} numberOfLines={1}>
                            {title}
                        </Text>
                        {subtitle && (
                            <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
                                {subtitle}
                            </Text>
                        )}
                    </View>

                    {/* Badge */}
                    {badge && (
                        <View style={[styles.badge, { backgroundColor: colors.error }]}>
                            <Text style={styles.badgeText}>{badge}</Text>
                        </View>
                    )}
                </View>

                {/* Right Side */}
                <View style={styles.rightSection}>
                    {rightComponent || (
                        showArrow && (
                            <Ionicons
                                name="chevron-forward"
                                size={20}
                                color={colors.textMuted}
                            />
                        )
                    )}
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        ...(Platform.OS === 'web' ? {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        } : {
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
        }),
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 13,
        fontWeight: '400',
    },
    badge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        paddingHorizontal: 6,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    badgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    rightSection: {
        marginLeft: 12,
    },
});

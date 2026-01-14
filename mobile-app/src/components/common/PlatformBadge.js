import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PLATFORM_CONFIG = {
    shopee: {
        color: '#EE4D2D',
        icon: '🛍️',
        name: 'Shopee',
    },
    mercadolivre: {
        color: '#FFE600',
        textColor: '#333',
        icon: '🏪',
        name: 'Mercado Livre',
    },
    amazon: {
        color: '#FF9900',
        icon: '📦',
        name: 'Amazon',
    },
    aliexpress: {
        color: '#E62E04',
        icon: '🌐',
        name: 'AliExpress',
    },
    kabum: {
        color: '#FF6500',
        icon: '💻',
        name: 'Kabum',
    },
    magazineluiza: {
        color: '#0086FF',
        icon: '🏬',
        name: 'Magazine Luiza',
    },
    terabyteshop: {
        color: '#00A8E1',
        icon: '🖥️',
        name: 'Terabyteshop',
    },
    general: {
        color: '#6B7280',
        icon: '🏷️',
        name: 'Geral',
    },
    unknown: {
        color: '#9CA3AF',
        icon: '❓',
        name: 'Desconhecido',
    },
};

export default function PlatformBadge({ platform, size = 'medium', showIcon = true, showName = true }) {
    const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.unknown;

    const sizeStyles = {
        small: {
            container: styles.containerSmall,
            text: styles.textSmall,
            icon: styles.iconSmall,
        },
        medium: {
            container: styles.containerMedium,
            text: styles.textMedium,
            icon: styles.iconMedium,
        },
        large: {
            container: styles.containerLarge,
            text: styles.textLarge,
            icon: styles.iconLarge,
        },
    };

    const currentSize = sizeStyles[size];

    return (
        <View style={[
            styles.container,
            currentSize.container,
            { backgroundColor: config.color }
        ]}>
            {showIcon && (
                <Text style={[styles.icon, currentSize.icon]}>
                    {config.icon}
                </Text>
            )}
            {showName && (
                <Text style={[
                    styles.text,
                    currentSize.text,
                    { color: config.textColor || '#FFFFFF' }
                ]}>
                    {config.name}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    containerSmall: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    containerMedium: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    containerLarge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    icon: {
        marginRight: 4,
    },
    iconSmall: {
        fontSize: 10,
        marginRight: 2,
    },
    iconMedium: {
        fontSize: 12,
        marginRight: 4,
    },
    iconLarge: {
        fontSize: 16,
        marginRight: 6,
    },
    text: {
        fontWeight: '600',
    },
    textSmall: {
        fontSize: 10,
    },
    textMedium: {
        fontSize: 12,
    },
    textLarge: {
        fontSize: 14,
    },
});

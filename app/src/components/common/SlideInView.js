import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * Container que faz slide-in com fade automático ao montar
 */
export default function SlideInView({
    children,
    duration = 400,
    delay = 0,
    direction = 'bottom', // 'bottom', 'top', 'left', 'right'
    distance = 30,
    style,
    ...props
}) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(distance)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: duration,
                delay: delay,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                duration: duration,
                delay: delay,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const getTransform = () => {
        switch (direction) {
            case 'top':
                return [{
                    translateY: slideAnim.interpolate({
                        inputRange: [0, distance],
                        outputRange: [0, -distance],
                    })
                }];
            case 'left':
                return [{
                    translateX: slideAnim.interpolate({
                        inputRange: [0, distance],
                        outputRange: [0, -distance],
                    })
                }];
            case 'right':
                return [{ translateX: slideAnim }];
            case 'bottom':
            default:
                return [{ translateY: slideAnim }];
        }
    };

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: fadeAnim,
                    transform: getTransform(),
                },
            ]}
            {...props}
        >
            {children}
        </Animated.View>
    );
}

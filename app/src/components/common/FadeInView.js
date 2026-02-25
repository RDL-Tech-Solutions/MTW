import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * Container que faz fade-in automático ao montar
 */
export default function FadeInView({
    children,
    duration = 400,
    delay = 0,
    style,
    ...props
}) {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: duration,
            delay: delay,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: fadeAnim,
                },
            ]}
            {...props}
        >
            {children}
        </Animated.View>
    );
}

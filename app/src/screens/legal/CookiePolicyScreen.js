import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme/theme';

export default function CookiePolicyScreen({ navigation }) {
    const { colors } = useThemeStore();
    const s = createStyles(colors);

    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" />
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Política de Cookies</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={s.lastUpdated}>Última atualização: 25 de fevereiro de 2026</Text>

                <Text style={s.sectionTitle}>1. O que são Cookies?</Text>
                <Text style={s.paragraph}>
                    Cookies são pequenos arquivos de texto armazenados no seu dispositivo quando você utiliza nosso aplicativo. Eles nos ajudam a melhorar sua experiência e fornecer funcionalidades personalizadas.
                </Text>

                <Text style={s.sectionTitle}>2. Tipos de Cookies que Utilizamos</Text>
                <Text style={s.paragraph}>
                    • Cookies essenciais: necessários para o funcionamento básico do aplicativo, como autenticação e preferências de sessão.{'\n\n'}
                    • Cookies de personalização: armazenam suas preferências de notificação, filtros da home e tema (claro/escuro).{'\n\n'}
                    • Cookies de análise: coletam dados anônimos sobre como o aplicativo é usado para nos ajudar a melhorar o serviço.
                </Text>

                <Text style={s.sectionTitle}>3. Armazenamento Local</Text>
                <Text style={s.paragraph}>
                    O PreçoCerto utiliza AsyncStorage para armazenar dados localmente no seu dispositivo, incluindo token de autenticação, preferências de tema e lista de favoritos em cache para uso offline.
                </Text>

                <Text style={s.sectionTitle}>4. Como Gerenciar Cookies</Text>
                <Text style={s.paragraph}>
                    Você pode controlar suas preferências de dados nas configurações do aplicativo. Ao desativar certas funcionalidades, os dados relacionados deixarão de ser armazenados.
                </Text>

                <Text style={s.sectionTitle}>5. Cookies de Terceiros</Text>
                <Text style={s.paragraph}>
                    Ao acessar links de lojas parceiras (Shopee, Mercado Livre, Amazon, etc.), essas plataformas podem utilizar seus próprios cookies. Recomendamos consultar as políticas de cookies de cada plataforma.
                </Text>

                <Text style={s.sectionTitle}>6. Contato</Text>
                <Text style={s.paragraph}>
                    Para dúvidas sobre o uso de cookies, entre em contato pelo e-mail contato@mtwpromo.com.
                </Text>

                <View style={s.footer}>
                    <Text style={s.footerText}>© 2026 RDL Tech Solutions. Todos os direitos reservados.</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
        paddingTop: Platform.OS === 'ios' ? 54 : StatusBar.currentHeight + 12,
        backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    scroll: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 40 },
    lastUpdated: { fontSize: 12, color: colors.textMuted, marginBottom: 24, fontStyle: 'italic' },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 20, marginBottom: 8 },
    paragraph: { fontSize: 14, color: colors.textMuted, lineHeight: 22, marginBottom: 12 },
    footer: { marginTop: 32, alignItems: 'center', paddingVertical: 16 },
    footerText: { fontSize: 12, color: colors.textMuted },
});

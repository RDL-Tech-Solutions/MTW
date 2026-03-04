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

export default function PrivacyPolicyScreen({ navigation }) {
    const { colors } = useThemeStore();
    const s = createStyles(colors);

    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" />
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Política de Privacidade</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={s.lastUpdated}>Última atualização: 25 de fevereiro de 2026</Text>

                <Text style={s.sectionTitle}>1. Informações que Coletamos</Text>
                <Text style={s.paragraph}>
                    Coletamos informações que você nos fornece diretamente, como nome, e-mail e preferências de notificação, além de dados de uso do aplicativo para melhorar sua experiência.
                </Text>

                <Text style={s.sectionTitle}>2. Como Usamos suas Informações</Text>
                <Text style={s.paragraph}>
                    Utilizamos suas informações para personalizar ofertas e cupons, enviar notificações de promoções relevantes, melhorar nossos serviços e garantir a segurança da sua conta.
                </Text>

                <Text style={s.sectionTitle}>3. Compartilhamento de Dados</Text>
                <Text style={s.paragraph}>
                    Não vendemos ou compartilhamos suas informações pessoais com terceiros para fins de marketing. Podemos compartilhar dados anonimizados para análise e melhoria do serviço.
                </Text>

                <Text style={s.sectionTitle}>4. Armazenamento e Segurança</Text>
                <Text style={s.paragraph}>
                    Seus dados são armazenados de forma segura utilizando criptografia e práticas de segurança padrão da indústria. Utilizamos o Supabase como infraestrutura de banco de dados com criptografia em repouso e em trânsito.
                </Text>

                <Text style={s.sectionTitle}>5. Seus Direitos</Text>
                <Text style={s.paragraph}>
                    Você tem o direito de acessar, corrigir ou excluir seus dados pessoais a qualquer momento. Para exercer esses direitos, entre em contato conosco pelo e-mail contato@mtwpromo.com.
                </Text>

                <Text style={s.sectionTitle}>6. Notificações Push</Text>
                <Text style={s.paragraph}>
                    Ao ativar as notificações push, armazenamos seu token de dispositivo para enviar alertas sobre promoções e ofertas. Você pode desativar as notificações a qualquer momento nas configurações do aplicativo.
                </Text>

                <Text style={s.sectionTitle}>7. Menores de Idade</Text>
                <Text style={s.paragraph}>
                    O PreçoCerto não é direcionado a menores de 13 anos. Não coletamos intencionalmente informações de crianças.
                </Text>

                <Text style={s.sectionTitle}>8. Alterações nesta Política</Text>
                <Text style={s.paragraph}>
                    Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre alterações significativas através do aplicativo.
                </Text>

                <Text style={s.sectionTitle}>9. Contato</Text>
                <Text style={s.paragraph}>
                    Para questões sobre privacidade, entre em contato pelo e-mail suporte@rdltech.com.br.
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

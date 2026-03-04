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

export default function TermsScreen({ navigation }) {
    const { colors } = useThemeStore();
    const s = createStyles(colors);

    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" />
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Termos de Uso</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={s.lastUpdated}>Última atualização: 25 de fevereiro de 2026</Text>

                <Text style={s.sectionTitle}>1. Aceitação dos Termos</Text>
                <Text style={s.paragraph}>
                    Ao utilizar o aplicativo PreçoCerto, você concorda com estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não utilize o aplicativo.
                </Text>

                <Text style={s.sectionTitle}>2. Descrição do Serviço</Text>
                <Text style={s.paragraph}>
                    O PreçoCerto é uma plataforma de comparação de preços e cupons de desconto que agrega ofertas de diversas lojas online, incluindo Shopee, Mercado Livre, Amazon, AliExpress, Kabum, Magazine Luiza e Pichau.
                </Text>

                <Text style={s.sectionTitle}>3. Cadastro e Conta</Text>
                <Text style={s.paragraph}>
                    Para utilizar funcionalidades como favoritos e notificações personalizadas, é necessário criar uma conta. Você é responsável por manter a confidencialidade de suas credenciais de acesso.
                </Text>

                <Text style={s.sectionTitle}>4. Uso Adequado</Text>
                <Text style={s.paragraph}>
                    Você concorda em utilizar o aplicativo apenas para fins legítimos e de acordo com a legislação vigente. É proibido utilizar o serviço para fins fraudulentos ou que prejudiquem outros usuários.
                </Text>

                <Text style={s.sectionTitle}>5. Preços e Ofertas</Text>
                <Text style={s.paragraph}>
                    As informações de preços e cupons são obtidas automaticamente das plataformas parceiras. O PreçoCerto não garante a exatidão, disponibilidade ou validade das ofertas exibidas, sendo responsabilidade do usuário verificar as condições diretamente na loja.
                </Text>

                <Text style={s.sectionTitle}>6. Propriedade Intelectual</Text>
                <Text style={s.paragraph}>
                    Todo o conteúdo do aplicativo, incluindo design, código, logotipos e textos, é de propriedade da RDL Tech Solutions e protegido pelas leis de propriedade intelectual.
                </Text>

                <Text style={s.sectionTitle}>7. Limitação de Responsabilidade</Text>
                <Text style={s.paragraph}>
                    O PreçoCerto não se responsabiliza por transações realizadas entre o usuário e as lojas parceiras. Qualquer problema relacionado a compras deve ser tratado diretamente com a loja em questão.
                </Text>

                <Text style={s.sectionTitle}>8. Modificações dos Termos</Text>
                <Text style={s.paragraph}>
                    Reservamo-nos o direito de modificar estes termos a qualquer momento. Alterações significativas serão comunicadas através do aplicativo.
                </Text>

                <Text style={s.sectionTitle}>9. Contato</Text>
                <Text style={s.paragraph}>
                    Em caso de dúvidas sobre estes Termos de Uso, entre em contato pelo e-mail suporte@rdltech.com.br.
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

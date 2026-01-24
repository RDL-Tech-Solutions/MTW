import couponQualityAnalyzer from '../src/ai/couponQualityAnalyzer.js';
import couponValidator from '../src/ai/couponValidator.js';
import couponIntelligentFilter from '../src/ai/couponIntelligentFilter.js';
import logger from '../src/config/logger.js';

/**
 * Script de teste para validar melhorias na IA de cupons
 */

const testCoupons = [
    {
        name: '✅ Cupom Excelente - Frete Grátis',
        coupon: {
            code: 'FRETEGRATIS',
            platform: 'shopee',
            discount_value: 0,
            discount_type: 'free_shipping',
            min_purchase: 0,
            description: 'Frete grátis sem mínimo'
        },
        expected: {
            quality_score: '>0.85',
            value_score: '>0.85',
            should_approve: true,
            recommendation: 'approve'
        }
    },
    {
        name: '✅ Cupom Muito Bom - 30% de desconto',
        coupon: {
            code: 'DESC30',
            platform: 'mercadolivre',
            discount_value: 30,
            discount_type: 'percentage',
            min_purchase: 100,
            description: '30% de desconto em compras acima de R$ 100'
        },
        expected: {
            quality_score: '>0.75',
            value_score: '>0.75',
            should_approve: true,
            recommendation: 'approve'
        }
    },
    {
        name: '✅ Cupom Bom - R$ 50 OFF',
        coupon: {
            code: 'VALE50',
            platform: 'amazon',
            discount_value: 50,
            discount_type: 'fixed',
            min_purchase: 200,
            description: 'R$ 50 de desconto em compras acima de R$ 200'
        },
        expected: {
            quality_score: '>0.70',
            value_score: '>0.65',
            should_approve: true,
            recommendation: 'approve'
        }
    },
    {
        name: '⚠️ Cupom Mediano - 10% desconto',
        coupon: {
            code: 'SAVE10',
            platform: 'shopee',
            discount_value: 10,
            discount_type: 'percentage',
            min_purchase: 50,
            description: '10% de desconto'
        },
        expected: {
            quality_score: '>0.50',
            value_score: '>0.50',
            should_approve: false,
            recommendation: 'review'
        }
    },
    {
        name: '❌ Cupom Ruim - 5% + mínimo alto',
        coupon: {
            code: 'X5',
            platform: 'desconhecido',
            discount_value: 5,
            discount_type: 'percentage',
            min_purchase: 500,
            description: '5% de desconto em compras acima de R$ 500'
        },
        expected: {
            quality_score: '<0.50',
            value_score: '<0.50',
            should_approve: false,
            recommendation: 'reject'
        }
    },
    {
        name: '❌ Cupom Inválido - Código suspeito',
        coupon: {
            code: 'TESTE',
            platform: 'shopee',
            discount_value: 20,
            discount_type: 'percentage',
            min_purchase: 0,
            description: 'Cupom de teste'
        },
        expected: {
            quality_score: '<0.60',
            should_approve: false,
            recommendation: 'review'
        }
    }
];

async function runTests() {
    logger.info('\n🧪 ========================================');
    logger.info('   TESTE DE MELHORIAS DA IA DE CUPONS');
    logger.info('========================================\n');

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    for (const test of testCoupons) {
        totalTests++;
        logger.info(`\n📋 Teste ${totalTests}: ${test.name}`);
        logger.info('─'.repeat(60));

        try {
            // 1. Validação do cupom
            logger.info('\n1️⃣ Validação do Cupom:');
            const validation = couponValidator.validateCoupon(test.coupon);
            logger.info(`   Válido: ${validation.valid ? '✅' : '❌'}`);
            logger.info(`   Confiança: ${(validation.confidence * 100).toFixed(0)}%`);
            if (validation.issues.length > 0) {
                logger.info(`   Issues: ${validation.issues.join(', ')}`);
            }

            // 2. Análise de qualidade
            logger.info('\n2️⃣ Análise de Qualidade (Fallback):');
            const analysis = couponQualityAnalyzer.getDefaultAnalysis(test.coupon);

            logger.info(`   Quality Score: ${analysis.quality_score.toFixed(2)} (${analysis.quality_score >= 0.7 ? '✅' : analysis.quality_score >= 0.5 ? '⚠️' : '❌'})`);
            logger.info(`   Value Score: ${analysis.value_score.toFixed(2)} (${analysis.value_score >= 0.7 ? '✅' : analysis.value_score >= 0.5 ? '⚠️' : '❌'})`);
            logger.info(`   Relevance Score: ${analysis.relevance_score.toFixed(2)} (${analysis.relevance_score >= 0.7 ? '✅' : analysis.relevance_score >= 0.5 ? '⚠️' : '❌'})`);
            logger.info(`   Should Approve: ${analysis.should_approve ? '✅ SIM' : '❌ NÃO'}`);
            logger.info(`   Recommendation: ${analysis.recommendation.toUpperCase()}`);
            logger.info(`   Reasoning: ${analysis.reasoning}`);

            if (analysis.strengths.length > 0) {
                logger.info(`   Pontos Fortes: ${analysis.strengths.join(', ')}`);
            }
            if (analysis.issues.length > 0) {
                logger.info(`   Problemas: ${analysis.issues.join(', ')}`);
            }

            // 3. Score Composto
            logger.info('\n3️⃣ Score Composto:');
            const compositeScore = couponIntelligentFilter.calculateCompositeScore(analysis);
            logger.info(`   Score Composto: ${compositeScore.composite_score.toFixed(2)}`);
            logger.info(`   Grade: ${compositeScore.grade}`);
            logger.info(`   Auto-Aprovar: ${compositeScore.auto_approve ? '✅ SIM' : '❌ NÃO'}`);

            // 4. Verificar expectativas
            logger.info('\n4️⃣ Verificação de Expectativas:');
            let testPassed = true;
            const checks = [];

            if (test.expected.quality_score) {
                const [op, val] = test.expected.quality_score.match(/([><]=?)(.+)/).slice(1);
                const expected = parseFloat(val);
                const actual = analysis.quality_score;
                const passed = op === '>' ? actual > expected : actual < expected;
                checks.push({ name: `Quality Score ${op} ${expected}`, passed, actual: actual.toFixed(2) });
                if (!passed) testPassed = false;
            }

            if (test.expected.value_score) {
                const [op, val] = test.expected.value_score.match(/([><]=?)(.+)/).slice(1);
                const expected = parseFloat(val);
                const actual = analysis.value_score;
                const passed = op === '>' ? actual > expected : actual < expected;
                checks.push({ name: `Value Score ${op} ${expected}`, passed, actual: actual.toFixed(2) });
                if (!passed) testPassed = false;
            }

            if (test.expected.should_approve !== undefined) {
                const passed = analysis.should_approve === test.expected.should_approve;
                checks.push({ name: 'Should Approve', passed, actual: analysis.should_approve });
                if (!passed) testPassed = false;
            }

            if (test.expected.recommendation) {
                const passed = analysis.recommendation === test.expected.recommendation;
                checks.push({ name: 'Recommendation', passed, actual: analysis.recommendation });
                if (!passed) testPassed = false;
            }

            checks.forEach(check => {
                logger.info(`   ${check.passed ? '✅' : '❌'} ${check.name}: ${check.actual}`);
            });

            if (testPassed) {
                passedTests++;
                logger.info(`\n✅ TESTE PASSOU!`);
            } else {
                failedTests++;
                logger.info(`\n❌ TESTE FALHOU!`);
            }

        } catch (error) {
            failedTests++;
            logger.error(`\n❌ ERRO NO TESTE: ${error.message}`);
            logger.error(`Stack: ${error.stack}`);
        }
    }

    // Resumo final
    logger.info('\n\n📊 ========================================');
    logger.info('   RESUMO DOS TESTES');
    logger.info('========================================');
    logger.info(`Total de Testes: ${totalTests}`);
    logger.info(`✅ Passou: ${passedTests} (${((passedTests / totalTests) * 100).toFixed(0)}%)`);
    logger.info(`❌ Falhou: ${failedTests} (${((failedTests / totalTests) * 100).toFixed(0)}%)`);

    if (passedTests === totalTests) {
        logger.info('\n🎉 TODOS OS TESTES PASSARAM! 🎉\n');
    } else {
        logger.warn(`\n⚠️ ${failedTests} teste(s) falharam. Revise os resultados acima.\n`);
    }
}

// Executar testes
runTests().then(() => {
    logger.info('🏁 Testes concluídos\n');
    process.exit(0);
}).catch(error => {
    logger.error(`\n❌ Erro fatal: ${error.message}`);
    process.exit(1);
});

import logger from '../config/logger.js';

const MEMORY_CHECK_INTERVAL = parseInt(process.env.MEMORY_CHECK_INTERVAL) || 60000; // 1 minuto
const MEMORY_WARNING_THRESHOLD = parseInt(process.env.MEMORY_WARNING_THRESHOLD) || 80; // %
const MEMORY_CRITICAL_THRESHOLD = parseInt(process.env.MEMORY_CRITICAL_THRESHOLD) || 90; // %

let lastWarningTime = 0;
let monitoringInterval = null;

/**
 * Iniciar monitoramento automático de memória
 */
export function startMemoryMonitoring() {
    if (monitoringInterval) {
        logger.warn('⚠️ Memory monitor já está rodando');
        return;
    }

    monitoringInterval = setInterval(() => {
        checkMemoryUsage();
    }, MEMORY_CHECK_INTERVAL);

    logger.info('✅ Monitor de memória iniciado');
    logger.info(`   Intervalo: ${MEMORY_CHECK_INTERVAL / 1000}s`);
    logger.info(`   Warning: ${MEMORY_WARNING_THRESHOLD}%`);
    logger.info(`   Critical: ${MEMORY_CRITICAL_THRESHOLD}%`);
}

/**
 * Parar monitoramento de memória
 */
export function stopMemoryMonitoring() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
        logger.info('🛑 Monitor de memória parado');
    }
}

/**
 * Verificar uso de memória e alertar se necessário
 */
export function checkMemoryUsage() {
    const MAX_MEMORY_MB = parseInt(process.env.MAX_MEMORY_MB) || 512;

    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);

    // Calcular porcentagem baseada no LIMITE MÁXIMO (não no total alocado atual)
    // V8 gerencia heapTotal dinamicamente, então usar/total é enganoso (sempre será alto)
    const heapUsedPercent = (heapUsedMB / MAX_MEMORY_MB * 100).toFixed(2);
    const rssUsedMB = Math.round(usage.rss / 1024 / 1024);

    const now = Date.now();
    const timeSinceLastWarning = now - lastWarningTime;

    // Avisar apenas a cada 5 minutos para não floodar logs
    const WARNING_COOLDOWN = 300000; // 5 min

    if (parseFloat(heapUsedPercent) > MEMORY_CRITICAL_THRESHOLD && timeSinceLastWarning > WARNING_COOLDOWN) {
        logger.error(`🚨 MEMÓRIA CRÍTICA: ${heapUsedPercent}% (${heapUsedMB}MB / ${MAX_MEMORY_MB}MB Limit)`);
        logger.error(`   Allocated: ${heapTotalMB}MB`);
        logger.error(`   RSS: ${rssUsedMB}MB`);
        logger.error(`   External: ${Math.round(usage.external / 1024 / 1024)}MB`);
        lastWarningTime = now;

        // Forçar garbage collection se disponível
        if (global.gc) {
            logger.info('🗑️ Forçando garbage collection...');
            const before = process.memoryUsage().heapUsed;
            global.gc();
            const after = process.memoryUsage().heapUsed;
            const freed = Math.round((before - after) / 1024 / 1024);
            logger.info(`✅ GC executado. Liberados: ${freed}MB`);
        } else {
            logger.warn('⚠️ GC manual não disponível. Inicie com --expose-gc');
        }
    } else if (parseFloat(heapUsedPercent) > MEMORY_WARNING_THRESHOLD && timeSinceLastWarning > WARNING_COOLDOWN) {
        logger.warn(`⚠️ Memória elevada: ${heapUsedPercent}% (${heapUsedMB}MB / ${heapTotalMB}MB)`);
        logger.warn(`   RSS: ${rssUsedMB}MB`);
        lastWarningTime = now;
    }

    return {
        heapUsed: heapUsedMB,
        heapTotal: heapTotalMB,
        heapUsedPercent: parseFloat(heapUsedPercent),
        rss: rssUsedMB,
        external: Math.round(usage.external / 1024 / 1024)
    };
}

/**
 * Obter estatísticas de memória (para health check)
 */
export function getMemoryStats() {
    const usage = process.memoryUsage();
    return {
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
        heapUsedPercent: Math.round((usage.heapUsed / usage.heapTotal) * 100),
        rss: Math.round(usage.rss / 1024 / 1024),
        external: Math.round(usage.external / 1024 / 1024),
        arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024)
    };
}

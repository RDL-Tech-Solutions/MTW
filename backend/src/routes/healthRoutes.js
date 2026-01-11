import express from 'express';
import { testConnection } from '../config/database.js';
import openrouterClient from '../ai/openrouterClient.js';

const router = express.Router();

/**
 * Health check básico (para load balancer)
 * Sempre retorna 200 OK se o servidor estiver rodando
 */
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

/**
 * Health check detalhado (para monitoramento e debugging)
 * Verifica status de componentes críticos
 */
router.get('/health/detailed', async (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            limit: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
        },
        checks: {}
    };

    // Check 1: Database
    try {
        await testConnection();
        health.checks.database = { status: 'ok' };
    } catch (error) {
        health.checks.database = {
            status: 'error',
            message: error.message
        };
        health.status = 'degraded';
    }

    // Check 2: AI Request Queue
    try {
        const queueSize = openrouterClient.requestQueue?.length || 0;
        const queueLimit = parseInt(process.env.OPENROUTER_QUEUE_MAX_SIZE) || 100;
        const queuePercentage = Math.round((queueSize / queueLimit) * 100);

        let queueStatus = 'ok';
        if (queuePercentage > 90) {
            queueStatus = 'critical';
            health.status = 'degraded';
        } else if (queuePercentage > 80) {
            queueStatus = 'warning';
            health.status = health.status === 'ok' ? 'degraded' : health.status;
        }

        health.checks.ai_queue = {
            status: queueStatus,
            size: queueSize,
            limit: queueLimit,
            percentage: queuePercentage
        };
    } catch (error) {
        health.checks.ai_queue = {
            status: 'error',
            message: error.message
        };
    }

    // Check 3: Circuit Breaker Status
    try {
        const circuitState = openrouterClient.circuitBreaker?.state || 'UNKNOWN';
        const circuitStatus = circuitState === 'OPEN' ? 'warning' : 'ok';

        health.checks.circuit_breaker = {
            status: circuitStatus,
            state: circuitState,
            failures: openrouterClient.circuitBreaker?.failures || 0
        };

        if (circuitState === 'OPEN') {
            health.status = 'degraded';
        }
    } catch (error) {
        health.checks.circuit_breaker = {
            status: 'error',
            message: error.message
        };
    }

    // Check 4: Memory
    if (health.memory.percentage > 90) {
        health.status = 'critical';
        health.checks.memory = {
            status: 'critical',
            message: 'Memory usage > 90%'
        };
    } else if (health.memory.percentage > 80) {
        if (health.status === 'ok') health.status = 'degraded';
        health.checks.memory = {
            status: 'warning',
            message: 'Memory usage > 80%'
        };
    } else {
        health.checks.memory = { status: 'ok' };
    }

    // Determinar HTTP status code baseado na saúde geral
    const httpStatus = health.status === 'critical' ? 503 : 200;
    res.status(httpStatus).json(health);
});

export default router;

import os from 'os';
import logger from '../config/logger.js';
import { getMemoryStats } from '../utils/memoryMonitor.js';
import { testConnection } from '../config/database.js';
import openrouterClient from '../ai/openrouterClient.js';

/**
 * Obter estatísticas do servidor em tempo real
 */
export const getServerStats = async (req, res, next) => {
    try {
        // Memory stats (Node.js heap)
        const memory = getMemoryStats();

        // System RAM stats
        const totalRAM = Math.round(os.totalmem() / 1024 / 1024); // MB
        const freeRAM = Math.round(os.freemem() / 1024 / 1024); // MB
        const usedRAM = totalRAM - freeRAM;
        const usedRAMPercent = Math.round((usedRAM / totalRAM) * 100);

        // CPU usage (média dos últimos segundos)
        const cpus = os.cpus();
        const cpuUsage = cpus.reduce((acc, cpu) => {
            const total = Object.values(cpu.times).reduce((a, b) => a + b);
            const idle = cpu.times.idle;
            return acc + ((total - idle) / total * 100);
        }, 0) / cpus.length;

        // Health checks
        const health = {};

        // Database check
        try {
            await testConnection();
            health.database = 'ok';
        } catch (error) {
            health.database = 'error';
        }

        // AI Queue check
        health.ai_queue = {
            size: openrouterClient.requestQueue?.length || 0,
            limit: parseInt(process.env.OPENROUTER_QUEUE_MAX_SIZE) || 100
        };

        // Circuit Breaker check
        health.circuit_breaker = openrouterClient.circuitBreaker?.state || 'UNKNOWN';

        res.json({
            success: true,
            data: {
                status: 'ok',
                uptime: Math.floor(process.uptime()),
                memory,
                systemRAM: {
                    total: totalRAM,
                    free: freeRAM,
                    used: usedRAM,
                    usedPercent: usedRAMPercent
                },
                cpu: {
                    usage: parseFloat(cpuUsage.toFixed(2)),
                    cores: cpus.length
                },
                system: {
                    platform: os.platform(),
                    nodeVersion: process.version,
                    pid: process.pid,
                    hostname: os.hostname()
                },
                health
            }
        });
    } catch (error) {
        logger.error(`Erro ao obter stats do servidor: ${error.message}`);
        next(error);
    }
};

/**
 * Reiniciar o servidor backend
 */
export const restartServer = async (req, res, next) => {
    try {
        logger.info('🔄 Restart solicitado pelo admin panel');
        logger.info(`   Usuário: ${req.user?.email || 'desconhecido'}`);

        res.json({
            success: true,
            message: 'Servidor será reiniciado em 3 segundos'
        });

        // Aguardar resposta ser enviada antes de reiniciar
        setTimeout(() => {
            if (process.env.PM2_HOME || process.send) {
                // PM2 environment - enviar sinal de reload
                logger.info('🔄 Enviando sinal de reload para PM2');
                process.send && process.send('shutdown');
            } else {
                // Development ou standalone - graceful shutdown
                logger.info('🔄 Iniciando graceful shutdown');
                process.kill(process.pid, 'SIGTERM');
            }
        }, 3000);
    } catch (error) {
        logger.error(`Erro ao reiniciar servidor: ${error.message}`);
        next(error);
    }
};

module.exports = {
    apps: [{
        name: 'mtw-backend',
        script: './src/server.js',
        instances: 1,
        exec_mode: 'fork',

        // VPS Optimization: Restart automático se ultrapassar limite de memória
        max_memory_restart: '512M',

        // Restart automático em caso de crash
        autorestart: true,
        watch: false,

        // Limites de restart
        max_restarts: 10,
        min_uptime: '10s',
        restart_delay: 4000,

        // Logs com rotação
        error_file: './logs/pm2-error.log',
        out_file: './logs/pm2-out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,

        // Variáveis de ambiente para produção
        env_production: {
            NODE_ENV: 'production',
            PORT: 3000,

            // VPS Mode: Ativar otimizações para VPS
            VPS_MODE: 'true',

            // Puppeteer: Usar Chromium do sistema
            PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: 'false',
            PUPPETEER_EXECUTABLE_PATH: '/usr/bin/chromium-browser',

            // Browser Pool: Limitar instâncias simultâneas
            MAX_BROWSER_INSTANCES: '2',
            BROWSER_TIMEOUT: '30000',

            // Telegram Queue: Limitar concorrência
            TELEGRAM_QUEUE_CONCURRENCY: '5',

            // Memory: Limites de memória
            MAX_MEMORY_MB: '512',
            ENABLE_MEMORY_MONITORING: 'true',

            // Shutdown: Timeout para graceful shutdown
            SHUTDOWN_TIMEOUT: '30000',

            // Cron Jobs: Habilitar em VPS
            ENABLE_CRON_JOBS: 'true'
        },

        // Variáveis de ambiente para desenvolvimento
        env_development: {
            NODE_ENV: 'development',
            PORT: 3000,
            VPS_MODE: 'false',
            MAX_BROWSER_INSTANCES: '3',
            TELEGRAM_QUEUE_CONCURRENCY: '10'
        }
    }]
};

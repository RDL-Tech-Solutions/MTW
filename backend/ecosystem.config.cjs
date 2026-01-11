module.exports = {
    apps: [{
        name: 'precocerto-api',
        script: './src/server.js',
        instances: 2, // Cluster mode para alta disponibilidade
        exec_mode: 'cluster',

        // Auto-restart com configurações inteligentes
        autorestart: true,
        watch: false,
        max_memory_restart: '1G', // Restart se exceder 1GB

        // Restart strategy
        min_uptime: '10s',  // Considera saudável se rodar por 10s
        max_restarts: 10,   // Max restarts em 1 min
        restart_delay: 4000, // 4s entre restarts

        // Logs com rotação
        error_file: './logs/pm2-error.log',
        out_file: './logs/pm2-out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,

        // Environment variables
        env_production: {
            NODE_ENV: 'production',
            ENABLE_CRON_JOBS: 'true'
        },

        // Health check e timeouts
        listen_timeout: 10000,  // 10s para app estar online
        kill_timeout: 30000,    // 30s para graceful shutdown (match SHUTDOWN_TIMEOUT)

        // Node options - habilitar GC manual e limitar memória
        node_args: '--max-old-space-size=1024 --expose-gc',

        // Cron para restart diário (opcional - descomente se necessário)
        // cron_restart: '0 4 * * *' // 4 AM todos os dias
    }]
};

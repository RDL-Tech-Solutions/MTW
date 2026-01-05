module.exports = {
    apps: [{
        name: 'mtw-backend',
        script: 'src/server.js',
        instances: 1, // Start with 1 instance, can be scaled to 'max' if needed
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'development'
        },
        env_production: {
            NODE_ENV: 'production'
        },
        // Error handling configuration
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        error_file: 'logs/pm2-error.log',
        out_file: 'logs/pm2-out.log',
        merge_logs: true,
    }]
};

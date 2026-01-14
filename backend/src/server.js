import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { testConnection } from './config/database.js';

import logger from './config/logger.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { startCronJobs } from './services/cron/index.js';
import { startMemoryMonitoring, stopMemoryMonitoring } from './utils/memoryMonitor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar trust proxy para obter IP correto
app.set('trust proxy', 1); // Confiar no primeiro proxy

// Middlewares de segurança
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Configurar CORS - Prioriza .env, usa defaults apenas como fallback
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:19006',
  'http://localhost:8081', // Expo Web
  'http://localhost:3000',
  'https://precocertoadmin.netlify.app',
  'https://precocertooo.vercel.app', // Frontend Vercel
];

// Usar CORS_ORIGIN do .env se definido, senão usar defaults
let allowedOrigins;
if (process.env.CORS_ORIGIN) {
  // Usar APENAS as origens do .env (não mesclar com defaults)
  allowedOrigins = process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(o => o);
  logger.info(`🌐 CORS: Usando origens do .env (${allowedOrigins.length} configuradas)`);
} else {
  // Fallback para defaults se .env não estiver configurado
  allowedOrigins = defaultOrigins;
  logger.info(`🌐 CORS: Usando origens padrão (${allowedOrigins.length} configuradas)`);
}

// Log de origens permitidas no startup
logger.info(`📋 CORS: Origens permitidas: ${allowedOrigins.join(', ')}`);

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir requisições sem origin (mobile apps nativos, Postman, etc)
    if (!origin) {
      return callback(null, true);
    }

    // Verificar se origin está na lista
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Em desenvolvimento, logar para debug
      if (process.env.NODE_ENV === 'development') {
        logger.warn(`⚠️  CORS: Origin bloqueada: ${origin}`);
        logger.info(`📋 CORS: Origens permitidas: ${allowedOrigins.join(', ')}`);
      }
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 horas
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Handle preflight requests explicitamente (antes das rotas)
app.options('*', (req, res) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    res.sendStatus(204);
  } else {
    res.sendStatus(403);
  }
});

// Middlewares gerais
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Rate limiting
app.use('/api', generalLimiter);

// Servir arquivos estáticos (logos, assets)
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// Rotas
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'PreçoCerto API',
    version: '1.0.0',
    docs: '/api/health'
  });
});

app.use('/api', routes);

// Handlers de erro
app.use(notFoundHandler);
app.use(errorHandler);

// Inicialização do servidor
let server; // Salvar referência para graceful shutdown

const startServer = async () => {
  try {
    // Testar conexão com banco de dados
    logger.info('🔄 Testando conexão com Supabase...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Falha ao conectar com Supabase');
    }

    // Iniciar cron jobs (apenas se não for Vercel, pois Vercel usa cron externo)
    if (process.env.ENABLE_CRON_JOBS === 'true' && !process.env.VERCEL) {
      logger.info('🔄 Iniciando cron jobs (Node-Cron)...');
      startCronJobs();
    }

    // Iniciar servidor e salvar referência
    server = app.listen(PORT, () => {
      logger.info(`🚀 Servidor rodando na porta ${PORT}`);
      logger.info(`📝 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 API disponível em: http://localhost:${PORT}/api`);
    });

    // Configurar timeouts do servidor
    server.keepAliveTimeout = 65000; // Nginx padrão é 60s
    server.headersTimeout = 66000; // Ligeiramente maior que keepAlive

    // Iniciar monitor de memória em produção
    if (process.env.NODE_ENV === 'production') {
      startMemoryMonitoring();
    }

  } catch (error) {
    logger.error(`❌ Erro ao iniciar servidor: ${error.message}`);
    process.exit(1);
  }
};

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', promise);
  logger.error('❌ Reason:', reason);
  if (reason instanceof Error) {
    logger.error('❌ Stack:', reason.stack);
  }
  // Não fazer exit para evitar crash, apenas logar
});

process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  logger.error('❌ Stack:', error.stack);
  // Fazer exit apenas em erros críticos
  if (error.code === 'EADDRINUSE' || error.message.includes('port')) {
    logger.error('❌ Erro crítico: porta já em uso');
    process.exit(1);
  }
  // Para outros erros, apenas logar e continuar
});

// Graceful shutdown completo
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`${signal} recebido. Iniciando shutdown gracioso...`);

  // 1. Parar de aceitar novas requisições
  if (server) {
    server.close(() => {
      logger.info('✅ Servidor HTTP fechado');
    });
  }

  // 2. Configurar timeout de shutdown
  const shutdownTimeout = setTimeout(() => {
    logger.error('⏱️ Timeout no shutdown. Forçando saída...');
    process.exit(1);
  }, parseInt(process.env.SHUTDOWN_TIMEOUT) || 30000); // 30s padrão

  // 3. Limpar recursos
  try {
    // Parar monitor de memória
    stopMemoryMonitoring();

    // Limpar cache AI
    const openrouterClient = (await import('./ai/openrouterClient.js')).default;
    openrouterClient.clearCache();
    logger.info('✅ Cache AI limpo');

    // Mensagem final
    clearTimeout(shutdownTimeout);
    logger.info('✅ Shutdown completo. Até logo! 👋');
    process.exit(0);
  } catch (error) {
    logger.error(`Erro no shutdown: ${error.message}`);
    process.exit(1);
  }
};

// Graceful shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Iniciar
// Iniciar
if (!process.env.VERCEL) {
  startServer();
}

export default app;

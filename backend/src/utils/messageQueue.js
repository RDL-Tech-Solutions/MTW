import logger from '../config/logger.js';

/**
 * Queue de processamento de mensagens do Telegram
 * Otimizado para VPS - processa mensagens de forma controlada
 * para evitar sobrecarga de CPU e memória
 */
class MessageQueue {
    constructor(maxConcurrent = 5) {
        this.maxConcurrent = maxConcurrent;
        this.queue = [];
        this.processing = 0;
        this.metrics = {
            totalQueued: 0,
            totalProcessed: 0,
            totalFailed: 0,
            totalRetried: 0,
            currentQueueSize: 0,
            currentProcessing: 0,
            averageProcessingTime: 0,
            processingTimes: []
        };
    }

    /**
     * Adicionar mensagem à queue
     * @param {Function} processFn - Função async que processa a mensagem
     * @param {Object} options - Opções de processamento
     */
    async add(processFn, options = {}) {
        const {
            priority = 0, // Maior = maior prioridade
            maxRetries = 3,
            retryDelay = 1000,
            timeout = 30000,
            metadata = {}
        } = options;

        const task = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            processFn,
            priority,
            maxRetries,
            retryDelay,
            timeout,
            metadata,
            retries: 0,
            addedAt: Date.now(),
            startedAt: null,
            completedAt: null
        };

        this.metrics.totalQueued++;
        this.metrics.currentQueueSize++;

        // Se pode processar imediatamente, processar
        if (this.processing < this.maxConcurrent) {
            logger.debug(`📨 [MessageQueue] Processando mensagem imediatamente (${this.processing + 1}/${this.maxConcurrent})`);
            this._process(task);
        } else {
            // Senão, adicionar à fila com prioridade
            logger.debug(`⏳ [MessageQueue] Adicionando à fila (tamanho: ${this.queue.length + 1}, processando: ${this.processing}/${this.maxConcurrent})`);

            // Inserir na posição correta baseado na prioridade
            let inserted = false;
            for (let i = 0; i < this.queue.length; i++) {
                if (this.queue[i].priority < priority) {
                    this.queue.splice(i, 0, task);
                    inserted = true;
                    break;
                }
            }
            if (!inserted) {
                this.queue.push(task);
            }
        }

        return task.id;
    }

    /**
     * Processar uma task
     */
    async _process(task) {
        this.processing++;
        this.metrics.currentProcessing = this.processing;
        task.startedAt = Date.now();

        const waitTime = task.startedAt - task.addedAt;
        logger.debug(`▶️  [MessageQueue] Iniciando processamento da task ${task.id} (aguardou ${waitTime}ms)`);

        try {
            // Executar com timeout
            const result = await this._executeWithTimeout(task.processFn, task.timeout);

            task.completedAt = Date.now();
            const processingTime = task.completedAt - task.startedAt;

            this.metrics.totalProcessed++;
            this.metrics.currentQueueSize--;
            this._updateAverageProcessingTime(processingTime);

            logger.debug(`✅ [MessageQueue] Task ${task.id} concluída em ${processingTime}ms`);

        } catch (error) {
            logger.error(`❌ [MessageQueue] Erro ao processar task ${task.id}: ${error.message}`);

            // Tentar retry se ainda tem tentativas
            if (task.retries < task.maxRetries) {
                task.retries++;
                this.metrics.totalRetried++;

                logger.warn(`🔄 [MessageQueue] Retry ${task.retries}/${task.maxRetries} para task ${task.id} em ${task.retryDelay}ms`);

                // Aguardar e tentar novamente
                await new Promise(resolve => setTimeout(resolve, task.retryDelay));

                // Re-adicionar à fila (sem incrementar totalQueued)
                this.queue.unshift(task);

            } else {
                this.metrics.totalFailed++;
                this.metrics.currentQueueSize--;
                logger.error(`💥 [MessageQueue] Task ${task.id} falhou após ${task.maxRetries} tentativas`);
            }
        } finally {
            this.processing--;
            this.metrics.currentProcessing = this.processing;

            // Processar próxima da fila se houver
            if (this.queue.length > 0 && this.processing < this.maxConcurrent) {
                const nextTask = this.queue.shift();
                this._process(nextTask);
            }
        }
    }

    /**
     * Executar função com timeout
     */
    async _executeWithTimeout(fn, timeout) {
        return Promise.race([
            fn(),
            new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout no processamento da mensagem')), timeout);
            })
        ]);
    }

    /**
     * Atualizar tempo médio de processamento
     */
    _updateAverageProcessingTime(time) {
        this.metrics.processingTimes.push(time);

        // Manter apenas últimas 100 medições
        if (this.metrics.processingTimes.length > 100) {
            this.metrics.processingTimes.shift();
        }

        const sum = this.metrics.processingTimes.reduce((a, b) => a + b, 0);
        this.metrics.averageProcessingTime = Math.round(sum / this.metrics.processingTimes.length);
    }

    /**
     * Limpar a fila (cancelar todas as tasks pendentes)
     */
    clear() {
        const clearedCount = this.queue.length;
        this.queue = [];
        this.metrics.currentQueueSize = 0;

        logger.info(`🧹 [MessageQueue] Fila limpa (${clearedCount} tasks canceladas)`);
        return clearedCount;
    }

    /**
     * Aguardar todas as tasks em processamento terminarem
     */
    async waitForIdle(timeout = 60000) {
        const startTime = Date.now();

        while (this.processing > 0 || this.queue.length > 0) {
            if (Date.now() - startTime > timeout) {
                throw new Error('Timeout aguardando queue ficar idle');
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        logger.info(`✅ [MessageQueue] Queue idle (todas as tasks processadas)`);
    }

    /**
     * Obter métricas da queue
     */
    getMetrics() {
        return {
            ...this.metrics,
            queueSize: this.queue.length,
            processing: this.processing,
            maxConcurrent: this.maxConcurrent,
            utilizationPercent: Math.round((this.processing / this.maxConcurrent) * 100)
        };
    }

    /**
     * Obter status da queue
     */
    getStatus() {
        return {
            isIdle: this.processing === 0 && this.queue.length === 0,
            isBusy: this.processing >= this.maxConcurrent,
            queueSize: this.queue.length,
            processing: this.processing,
            maxConcurrent: this.maxConcurrent
        };
    }

    /**
     * Ajustar concorrência máxima em runtime
     */
    setMaxConcurrent(newMax) {
        const oldMax = this.maxConcurrent;
        this.maxConcurrent = newMax;

        logger.info(`⚙️  [MessageQueue] Concorrência ajustada: ${oldMax} → ${newMax}`);

        // Se aumentou, processar mais tasks da fila
        if (newMax > oldMax) {
            const toProcess = Math.min(newMax - this.processing, this.queue.length);
            for (let i = 0; i < toProcess; i++) {
                const task = this.queue.shift();
                if (task) {
                    this._process(task);
                }
            }
        }
    }

    /**
     * Log de status (útil para debug)
     */
    logStatus() {
        const metrics = this.getMetrics();
        logger.info(`📊 [MessageQueue] Status:`);
        logger.info(`   Processando: ${metrics.processing}/${metrics.maxConcurrent} (${metrics.utilizationPercent}%)`);
        logger.info(`   Fila: ${metrics.queueSize} mensagens`);
        logger.info(`   Total processado: ${metrics.totalProcessed}`);
        logger.info(`   Total falhas: ${metrics.totalFailed}`);
        logger.info(`   Tempo médio: ${metrics.averageProcessingTime}ms`);
    }
}

export default MessageQueue;

import dispatcher from './src/services/bots/notificationDispatcher.js';
import logger from './src/config/logger.js';
import util from 'util';

// Set logger level to debug to see the exact rejection reason
logger.level = 'debug';

async function testDispatch() {
    try {
        const mockData = {
            id: 'mock-uuid-timestamp',
            code: 'WSTEST3',
            platform: 'shopee',
            discount_type: 'percentage',
            discount_value: 10,
            min_purchase: 20,
            is_general: true,
            description: 'Cupom WS Teste'
        };

        // We are passing manual: true which allows bypass of duplication logic.
        const res = await dispatcher.dispatch('coupon_new', mockData, { manual: true, platformFilter: 'whatsapp_web' });
        console.log("Dispatch Result:", util.inspect(res, { depth: null }));
    } catch (e) {
        console.error("Test Error:", e);
    } finally {
        process.exit(0);
    }
}
testDispatch();

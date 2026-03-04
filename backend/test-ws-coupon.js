import { saveAndPublishCoupon } from './src/services/whatsappWeb/handlers/whatsappCouponHandler.js';
import Coupon from './src/models/Coupon.js';
import mongoose from 'mongoose';

async function testPub() {
    try {
        console.log("Starting test publish...");

        // Simulate data that executeCouponCapture returns
        const mockData = {
            code: 'TESTE-BOT-WPP-' + Date.now(),
            platform: 'shopee',
            discount_type: 'percentage',
            discount_value: 10,
            min_purchase: 20,
            is_general: true,
            description: 'Cupom de teste WS',
            valid_until: new Date(Date.now() + 86400000).toISOString()
        };

        console.log("Data to save:", mockData);

        const res = await saveAndPublishCoupon(mockData);
        console.log("Result:", res);

    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        process.exit(0);
    }
}

testPub();

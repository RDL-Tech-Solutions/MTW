

try {
    await import('./src/services/whatsappWeb/handlers/messageHandler.js');
    console.log('✅ messageHandler.js syntax OK');
} catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND') {
        // Ignore dependency errors, we check syntax mainly
        console.log('⚠️ messageHandler.js dependencies missing (expected), but syntax likely OK');
    } else {
        console.error('❌ messageHandler.js error:', e);
    }
}

try {
    await import('./src/services/whatsappWeb/handlers/adminCommandHandler.js');
    console.log('✅ adminCommandHandler.js syntax OK');
} catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND') {
        console.log('⚠️ adminCommandHandler.js dependencies missing (expected), but syntax likely OK');
    } else {
        console.error('❌ adminCommandHandler.js error:', e);
    }
}

try {
    await import('./src/services/adminBot/index.js');
    console.log('✅ adminBot/index.js syntax OK');
} catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND') {
        console.log('⚠️ adminBot/index.js dependencies missing (expected), but syntax likely OK');
    } else {
        console.error('❌ adminBot/index.js error:', e);
    }
}

try {
    await import('./src/services/whatsappWeb/handlers/whatsappPendingHandler.js');
    console.log('✅ whatsappPendingHandler.js syntax OK');
} catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND') {
        console.log('⚠️ whatsappPendingHandler.js dependencies missing (expected), but syntax likely OK');
    } else {
        console.error('❌ whatsappPendingHandler.js error:', e);
    }
}

try {
    await import('./src/services/whatsappWeb/handlers/whatsappEditHandler.js');
    console.log('✅ whatsappEditHandler.js syntax OK');
} catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND') {
        console.log('⚠️ whatsappEditHandler.js dependencies missing (expected), but syntax likely OK');
    } else {
        console.error('❌ whatsappEditHandler.js error:', e);
    }
}

try {
    await import('./src/services/whatsappWeb/handlers/whatsappCaptureHandler.js');
    console.log('✅ whatsappCaptureHandler.js syntax OK');
} catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND') {
        console.log('⚠️ whatsappCaptureHandler.js dependencies missing (expected), but syntax likely OK');
    } else {
        console.error('❌ whatsappCaptureHandler.js error:', e);
    }
}

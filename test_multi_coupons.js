import axios from 'axios';

async function testMultiCoupon() {
    try {
        console.log('Fetching products list...');
        const listRes = await axios.get('http://localhost:3000/api/products?limit=10');
        const products = listRes.data.data.products;

        if (!products || products.length === 0) {
            console.log('No products found to test.');
            return;
        }

        // Try to find a product that has coupons
        let testProduct = products.find(p => p.coupons && p.coupons.length > 0);
        if (!testProduct) testProduct = products[0];

        console.log(`Testing Product: ${testProduct.name} [ID: ${testProduct.id}]`);
        console.log(`Original Price: ${testProduct.current_price}`);
        console.log(`Coupons attached in list view: ${testProduct.coupons?.length || 0}`);
        if (testProduct.coupons) {
            testProduct.coupons.forEach(c => {
                console.log(` - [${c.id}] ${c.code} (${c.discount_value} ${c.discount_type})`);
            });
        }

        console.log('\nFetching single product view...');
        const singleRes = await axios.get(`http://localhost:3000/api/products/${testProduct.id}`);
        const singleProd = singleRes.data.data;

        console.log(`Single View Coupons: ${singleProd.coupons?.length || 0}`);
        console.log(`Final Price Calculated: ${singleProd.final_price}`);

        if (singleProd.coupons) {
            singleProd.coupons.forEach(c => {
                console.log(` - [${c.id}] ${c.code} (${c.discount_value} ${c.discount_type})`);
            });
        }

    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testMultiCoupon();

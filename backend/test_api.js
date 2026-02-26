(async () => {
    try {
        const resCoupons = await fetch('http://localhost:3000/api/coupons?limit=5');
        const resJson = await resCoupons.json();
        const coupons = resJson.data.coupons || resJson.data;
        if (coupons.length > 0) {
            for (const coupon of coupons) {
                console.log('Testing Coupon:', coupon.id, coupon.title || coupon.code);
                console.log('Applicable products:', coupon.applicable_products);
                try {
                    const resProds = await fetch('http://localhost:3000/api/coupons/' + coupon.id + '/products?limit=1');
                    const prodsJson = await resProds.json();
                    console.log('Products returned:', prodsJson.data.total || 0);
                } catch (e) { console.error('Error fetching prods:', e.message); }
            }
        } else {
            console.log('No coupons found');
        }
    } catch (e) { console.error(e.message); }
})();

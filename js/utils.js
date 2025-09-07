// Utility functions - Will be expanded as needed
'use strict';

console.log('Utils module loaded');

// Realtime delete wrapper to avoid local-only delete in app.js
// Calls the API delete and refreshes orders on success
window.onDeleteOrderClick = async function(orderId) {
    try {
        if (!orderId) return;
        if (!confirm('Bạn có chắc muốn xóa đơn hàng này?')) return;
        if (typeof window.deleteOrder !== 'function') {
            console.error('deleteOrder API function not available');
            alert('API delete not available');
            return;
        }
        if (typeof window.refreshOrders !== 'function') {
            console.warn('refreshOrders not available; proceeding without refresh');
        }
        if (typeof window.showLoading === 'function') showLoading(true);
        await window.deleteOrder(orderId);
        if (typeof window.showToast === 'function') showToast('✅ Đã xóa đơn hàng', 'success');
        if (typeof window.refreshOrders === 'function') await window.refreshOrders();
    } catch (err) {
        console.error('Failed to delete order via API:', err);
        if (typeof window.showToast === 'function') showToast('Không thể xóa đơn hàng', 'error');
    } finally {
        if (typeof window.showLoading === 'function') showLoading(false);
    }
};

// Realtime-only save
window.saveOrderRealtime = async function(order) {
    try {
        if (!(typeof window.createOrder === 'function' && window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL && !window.APP_CONFIG.API_BASE_URL.includes('DEMO_ID'))) {
            throw new Error('API not configured');
        }
        if (typeof window.showLoading === 'function') showLoading(true);
        const response = await Promise.race([
            window.createOrder({
                employee: order.employee,
                service: order.service,
                price: order.price,
                notes: order.notes
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('API timeout after 10s')), 10000))
        ]);
        const saved = response?.order || response;
        if (typeof window.showToast === 'function') showToast('✅ Đã lưu đơn hàng thành công', 'success');
        // Optional: refresh stats
        if (typeof window.refreshStatsFromAPI === 'function') setTimeout(window.refreshStatsFromAPI, 300);
        return saved;
    } catch (err) {
        console.error('Failed to save order via API:', err);
        if (typeof window.showToast === 'function') showToast('Không thể lưu đơn. Vui lòng thử lại.', 'error');
        throw err;
    } finally {
        if (typeof window.showLoading === 'function') showLoading(false);
    }
};

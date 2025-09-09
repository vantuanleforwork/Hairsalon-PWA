'use strict';

console.log('Utils module loaded');

// Delete order via API and refresh list
window.onDeleteOrderClick = async function(orderId) {
    try {
        if (!orderId) return;
        if (!confirm('Bạn có chắc muốn xóa đơn hàng này?')) return;

        if (typeof window.deleteOrder !== 'function') {
            console.error('deleteOrder API function not available');
            alert('API delete not available');
            return;
        }

        if (typeof window.showLoading === 'function') showLoading(true);
        await window.deleteOrder(orderId);
        if (typeof window.showToast === 'function') showToast('Đã xóa đơn hàng', 'success');
        if (typeof window.refreshOrders === 'function') await window.refreshOrders();
    } catch (err) {
        console.error('Failed to delete order via API:', err);
        if (typeof window.showToast === 'function') showToast('Không thể xóa đơn hàng', 'error');
    } finally {
        if (typeof window.showLoading === 'function') showLoading(false);
    }
};

// Save order via API and return a normalized object for UI rendering
window.saveOrderRealtime = async function(order) {
    try {
        const hasAPI = (
            typeof window.createOrder === 'function' &&
            window.APP_CONFIG &&
            window.APP_CONFIG.API_BASE_URL &&
            !window.APP_CONFIG.API_BASE_URL.includes('DEMO_ID')
        );
        if (!hasAPI) throw new Error('API not configured');

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

        // Some GAS deployments (no-cors) don't return full JSON; normalize for UI
        const raw = (response && (response.order || response)) || {};
        const normalized = {
            id: raw.id || order.id,
            timestamp: raw.timestamp || raw.date || order.timestamp || new Date().toISOString(),
            service: raw.service || order.service,
            price: typeof raw.price !== 'undefined' ? parseInt(raw.price) : order.price,
            notes: typeof raw.notes !== 'undefined' ? raw.notes : order.notes,
            employee: raw.employee || order.employee,
            employeeName: raw.employeeName || ''
        };

        if (typeof window.showToast === 'function') showToast('Đã lưu đơn hàng thành công', 'success');
        if (typeof window.refreshStatsFromAPI === 'function') setTimeout(window.refreshStatsFromAPI, 300);
        return normalized;
    } catch (err) {
        console.error('Failed to save order via API:', err);
        if (typeof window.showToast === 'function') showToast('Không thể lưu đơn. Vui lòng thử lại.', 'error');
        throw err;
    } finally {
        if (typeof window.showLoading === 'function') showLoading(false);
    }
};


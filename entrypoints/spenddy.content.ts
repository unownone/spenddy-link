
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

export default defineContentScript({
  matches: ['*://spenddy.ikr.one/*'],
  main() {
    requestAndStore();

    // Also listen for a custom event from the page to refresh (optional)
    window.addEventListener('spenddy-fetch-orders', () => {
      requestAndStore();
    });

    function requestAndStore() {
      chrome.runtime.sendMessage({ type: 'get_orders' }, (resp: { orderData?: any[]; latestOrderTime?: string }) => {
        if (!resp || !Array.isArray(resp.orderData) || resp.orderData.length === 0) return;
        const rawStr = JSON.stringify(resp.orderData);
        const sizeBytes = new TextEncoder().encode(rawStr).length;
        const info = {
          name: 'swiggy_orders.json',
          size: sizeBytes,
          uploadDate: resp.latestOrderTime ?? new Date().toISOString(),
          orderCount: resp.orderData.length,
        };
        localStorage.setItem('swiggy_file_info', JSON.stringify(info));
        localStorage.setItem('swiggy_raw_data', rawStr);
      });
    }
  },
}); 
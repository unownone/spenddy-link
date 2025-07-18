
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

export default defineContentScript({
  matches: ['*://spenddy.fyi/*'],
  main() {
    requestAndStore();

    // Also listen for a custom event from the page to refresh (optional)
    window.addEventListener('spenddy-fetch-orders', () => {
      requestAndStore();
    });

    function requestAndStore() {
      chrome.runtime.sendMessage({ type: 'get_orders' }, (resp: { orderData?: any[]; latestOrderTime?: string; instamartData?: any[]; latestInstamartTime?: string; dineoutData?: any[]; latestDineoutTime?: string }) => {
        if (!resp) return;

        // Store regular food orders
        if (Array.isArray(resp.orderData) && resp.orderData.length > 0) {
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
        }

        // Store Instamart orders
        if (Array.isArray(resp.instamartData) && resp.instamartData.length > 0) {
          const rawStr = JSON.stringify(resp.instamartData);
          const sizeBytes = new TextEncoder().encode(rawStr).length;
          const info = {
            name: 'swiggy_instamart_orders.json',
            size: sizeBytes,
            uploadDate: resp.latestInstamartTime ?? new Date().toISOString(),
            orderCount: resp.instamartData.length,
          };
          localStorage.setItem('swiggy_instamart_file_info', JSON.stringify(info));
          localStorage.setItem('swiggy_instamart_raw_data', rawStr);
        }

        // Store Dineout orders
        if (Array.isArray(resp.dineoutData) && resp.dineoutData.length > 0) {
          const rawStr = JSON.stringify(resp.dineoutData);
          const sizeBytes = new TextEncoder().encode(rawStr).length;
          const info = {
            name: 'swiggy_dineout_orders.json',
            size: sizeBytes,
            uploadDate: resp.latestDineoutTime ?? new Date().toISOString(),
            orderCount: resp.dineoutData.length,
          };
          localStorage.setItem('swiggy_dineout_file_info', JSON.stringify(info));
          localStorage.setItem('swiggy_dineout_raw_data', rawStr);
        }
      });
    }
  },
}); 
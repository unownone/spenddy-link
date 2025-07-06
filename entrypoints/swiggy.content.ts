
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

export default defineContentScript({
  matches: ['*://*.swiggy.com/*'],
  main() {
    // let's not continue if it's not swiggy for these parts
    if (!window.location.href.includes('swiggy.com')) return;

    fetch('https://www.swiggy.com/dapi/cart', { credentials: 'include' })
      .then((res) => {
        if (res.ok) {
          chrome.runtime.sendMessage({ type: 'swiggy_cart_ok' });
        }
      })
      .catch(() => {/* ignore */});

    // Listen for order fetch request from popup/background
    chrome.runtime.onMessage.addListener((msg: { type?: string }, _sender: unknown, sendResponse: (resp: any) => void) => {
      if (msg?.type === 'fetch_orders') {
        chrome.runtime.sendMessage({ type: 'fetch_start' });
        fetchAllOrders()
          .then((orders) => {
            chrome.runtime.sendMessage({ type: 'fetch_progress', count: orders.length });
            const latestTime = orders?.[0]?.order_time ?? null;
            chrome.storage.local.set({ orderData: orders, ordersFetched: true, latestOrderTime: latestTime, fetching: false, progressCount: orders.length }, () => {
              chrome.runtime.sendMessage({ type: 'orders_fetched', latestOrderTime: latestTime, total: orders.length });
              sendResponse({ success: true });
            });
          })
          .catch((err) => {
            console.error('Order fetch failed', err);
            sendResponse({ success: false, error: err?.message });
          });
        // Indicate async response
        return true;
      }
    });

    async function fetchAllOrders(): Promise<any[]> {
      const orders: any[] = [];
      let nextOrderId: string | undefined = undefined;
      while (true) {
        const url: string = nextOrderId ? `https://www.swiggy.com/dapi/order/all?order_id=${nextOrderId}` : 'https://www.swiggy.com/dapi/order/all';
        const res: Response = await fetch(url, { credentials: 'include' });
        if (!res.ok) break;
        const json: any = await res.json();
        const pageOrders: any[] = json?.data?.orders ?? [];
        if (!Array.isArray(pageOrders) || pageOrders.length === 0) break;
        orders.push(...pageOrders);
        if (pageOrders.length < 5) break; // last page
        nextOrderId = pageOrders[pageOrders.length - 1].order_id;
        // Safety: break if orders exceed 5000 to avoid infinite loop
        if (orders.length > 5000) break;
        chrome.runtime.sendMessage({ type: 'fetch_progress', count: orders.length });
        chrome.storage.local.set({ progressCount: orders.length, fetching: true });
      }
      return orders;
    }
  },
});


// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

const pageSize = 5;

// Swiggy endpoints require these headers for mweb requests
const defaultHeaders: HeadersInit = {
  'sec-ch-ua-mobile': '?1',
  'sec-ch-ua-platform': '"Android"',
};

export default defineContentScript({
  matches: ['*://*.swiggy.com/*'],
  main() {
    // let's not continue if it's not swiggy for these parts
    if (!window.location.href.includes('swiggy.com')) return;

    fetch('https://www.swiggy.com/dapi/cart', { credentials: 'include', headers: defaultHeaders })
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
        Promise.all([
          fetchAllOrders(),
          fetchAllInstamartOrders(),
          fetchAllDineoutOrders(),
        ])
          .then(([orders, instamartOrders, dineoutOrders]) => {
            const totalFetched = orders.length + instamartOrders.length + dineoutOrders.length;
            chrome.runtime.sendMessage({ type: 'fetch_progress', count: totalFetched });
            const latestOrderTime = orders?.[0]?.order_time ?? null;
            const latestInstamartTime = instamartOrders?.[0]?.created_at ?? null;
            const latestDineoutTime = dineoutOrders?.[0]?.created_at ?? null;
            chrome.storage.local.set({
              orderData: orders,
              instamartData: instamartOrders,
              dineoutData: dineoutOrders,
              swiggy_instamart_order_data: instamartOrders,
              swiggy_dineout_order_data: dineoutOrders,
              ordersFetched: true,
              latestOrderTime,
              latestInstamartTime,
              latestDineoutTime,
              instamartTotal: instamartOrders.length,
              dineoutTotal: dineoutOrders.length,
              swiggyTotal: orders.length,
              fetching: false,
              progressCount: totalFetched,
            }, () => {
              chrome.runtime.sendMessage({ type: 'orders_fetched', latestOrderTime, total: totalFetched, instamartTotal: instamartOrders.length, dineoutTotal: dineoutOrders.length, swiggyTotal: orders.length });
              sendResponse({ success: true });
            });
          })
          .catch((err) => {
            console.error('Order fetch failed', err);
            sendResponse({ success: false, error: err?.message });
          });
        return true; // async response
      }
    });

    async function fetchAllOrders(): Promise<any[]> {
      const orders: any[] = [];
      let nextOrderId: string | undefined = undefined;
      while (true) {
        const url: string = nextOrderId ? `https://www.swiggy.com/dapi/order/all?order_id=${nextOrderId}&order_count=${pageSize}` : 'https://www.swiggy.com/dapi/order/all';
        const res: Response = await fetch(url, { credentials: 'include', headers: defaultHeaders });
        if (!res.ok) break;
        const json: any = await res.json();
        const pageOrders: any[] = json?.data?.orders ?? [];
        if (!Array.isArray(pageOrders) || pageOrders.length === 0) break;
        orders.push(...pageOrders);
        if (pageOrders.length < pageSize) break; // last page
        nextOrderId = pageOrders[pageOrders.length - 1].order_id;
        chrome.runtime.sendMessage({ type: 'fetch_progress', count: orders.length });
        chrome.storage.local.set({ progressCount: orders.length, fetching: true });
      }
      return orders;
    }

    async function fetchAllInstamartOrders(): Promise<any[]> {
      const pageSizeIm = 5;
      const orders: any[] = [];
      let fromTime = Date.now();
      while (true) {
        const url = `https://www.swiggy.com/mapi/order/dash?count=${pageSizeIm}&from_time=${fromTime}&order_type=DASH`;
        const res: Response = await fetch(url, { credentials: 'include', headers: defaultHeaders });
        if (!res.ok) break;
        const json: any = await res.json();
        const pageOrders: any[] = json?.data?.orders ?? [];
        if (!Array.isArray(pageOrders) || pageOrders.length === 0) break;
        orders.push(...pageOrders);
        if (pageOrders.length < pageSizeIm) break;
        fromTime = pageOrders[pageOrders.length - 1].created_at ?? fromTime;
        chrome.runtime.sendMessage({ type: 'fetch_progress', count: orders.length });
        chrome.storage.local.set({ progressCount: orders.length, fetching: true });
      }
      return orders;
    }

    async function fetchAllDineoutOrders(): Promise<any[]> {
      const pageSizeDine = 5;
      const orders: any[] = [];
      let fromTime = Date.now();
      while (true) {
        const url = `https://www.swiggy.com/mapi/order/dineout?count=${pageSizeDine}&from_time=${fromTime}&order_type=DINEOUT`;
        const res: Response = await fetch(url, { credentials: 'include', headers: defaultHeaders });
        if (!res.ok) break;
        const json: any = await res.json();
        const pageOrders: any[] = json?.data?.orders ?? [];
        if (!Array.isArray(pageOrders) || pageOrders.length === 0) break;
        orders.push(...pageOrders);
        if (pageOrders.length < pageSizeDine) break;
        fromTime = pageOrders[pageOrders.length - 1].created_at ?? fromTime;
        chrome.runtime.sendMessage({ type: 'fetch_progress', count: orders.length });
        chrome.storage.local.set({ progressCount: orders.length, fetching: true });
      }
      return orders;
    }
  },
});

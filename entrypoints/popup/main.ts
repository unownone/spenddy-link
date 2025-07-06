import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;

function renderDisconnected() {
  app.innerHTML = `
    <img src="icon/logo.png" class="brand-logo" width="64" alt="Spenddy logo" />
    <div class="status disconnected">
      <span class="icon">🔌</span>
      <span class="label">Disconnected</span>
    </div>
    <ol class="steps">
      <li>Open Swiggy.com</li>
      <li>Log in to your account</li>
      <li>Reopen this extension popup</li>
    </ol>
    <button id="open-swiggy">Open Swiggy</button>
  `;

  const btn = document.querySelector<HTMLButtonElement>('#open-swiggy')!;
  btn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://www.swiggy.com/' });
  });
}

function renderConnected(ordersFetched: boolean, latestOrderTime?: string | null, fetching = false, progressCount = 0) {
  if (!ordersFetched && !fetching) {
    app.innerHTML = `
      <img src="icon/logo.png" class="brand-logo" width="64" alt="Spenddy logo" />
      <div class="status connected">
        <span class="icon">🔌</span>
        <span class="label">Connected</span>
      </div>
      <p class="success">Connected! Fetch your order history.</p>
      <button id="fetch-orders">Fetch Order Data</button>
    `;

    document.querySelector<HTMLButtonElement>('#fetch-orders')!.addEventListener('click', () => {
      chrome.tabs.query({ url: '*://*.swiggy.com/*', active: true }, (tabs) => {
        if (tabs.length > 0 && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'fetch_orders' });
        } else {
          alert('Open Swiggy.com tab and stay logged in before fetching orders.');
        }
      });
    });
  } else if (fetching) {
    app.innerHTML = `
      <img src="icon/logo.png" class="brand-logo" width="64" alt="Spenddy logo" />
      <div class="status connected">
        <span class="icon">🔌</span>
        <span class="label">Connected</span>
      </div>
      <p class="success">Fetching orders... ${progressCount} fetched</p>
      <p>Please wait until completion.</p>
    `;
  } else {
    const latestHtml = latestOrderTime ? `<p class="latest">Last order: ${latestOrderTime}</p>` : '';
    app.innerHTML = `
      <img src="icon/logo.png" class="brand-logo" width="64" alt="Spenddy logo" />
      <div class="status connected">
        <span class="icon">🔌</span>
        <span class="label">Connected</span>
      </div>
      <p class="success">Order data captured!</p>
      ${latestHtml}
      <button id="open-spenddy">Go to Spenddy</button>
    `;

    const btn = document.querySelector<HTMLButtonElement>('#open-spenddy')!;
    btn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://spenddy.ikr.one/' });
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
chrome.storage.local.get(['swiggyConnected', 'ordersFetched', 'latestOrderTime', 'fetching', 'progressCount'], (res: { swiggyConnected?: boolean; ordersFetched?: boolean; latestOrderTime?: string; fetching?: boolean; progressCount?: number }) => {
  const { swiggyConnected, ordersFetched, latestOrderTime, fetching, progressCount } = res;
  if (swiggyConnected) {
    renderConnected(Boolean(ordersFetched), latestOrderTime, Boolean(fetching), progressCount ?? 0);
  } else {
    renderDisconnected();
  }
});

// Listen for storage changes to update UI in real-time
chrome.storage.onChanged.addListener((changes: any) => {
  if (changes.swiggyConnected || changes.ordersFetched || changes.latestOrderTime || changes.fetching || changes.progressCount) {
    chrome.storage.local.get(['swiggyConnected', 'ordersFetched', 'latestOrderTime', 'fetching', 'progressCount'], (res: { swiggyConnected?: boolean; ordersFetched?: boolean; latestOrderTime?: string; fetching?: boolean; progressCount?: number }) => {
      if (res.swiggyConnected) {
        renderConnected(Boolean(res.ordersFetched), res.latestOrderTime, Boolean(res.fetching), res.progressCount ?? 0);
      } else {
        renderDisconnected();
      }
    });
  }
});

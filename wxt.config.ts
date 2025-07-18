import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    permissions: ['storage', 'tabs', 'declarativeNetRequest', 'webRequest'],
    host_permissions: ['https://*.swiggy.com/*', '*://spenddy.fyi/*'],
    icons: {
      '16': 'icon/logo-16.png',
      '32': 'icon/logo-32.png',
      '48': 'icon/logo-48.png',
      '128': 'icon/logo-128.png',
    },
    action: {
      default_icon: {
        '16': 'icon/logo-16.png',
        '32': 'icon/logo-32.png',
        '48': 'icon/logo-48.png',
      },
      default_title: 'Spenddy Link',
    },
  },
});

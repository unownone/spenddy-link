# Spenddy Link Browser Extension

Spenddy Link is a lightweight, privacy-respecting browser extension that helps you seamlessly transfer your **Swiggy** order history to [Spenddy](https://spenddy.fyi/) where you can analyse your food spending patterns.

## Install from Chrome Web Store

Spenddy Link is now publicly available:

[**Install Spenddy Link**](https://chromewebstore.google.com/detail/mibpmhoncjmniigifepbckapmoflkglo)

![Spenddy Link Demo](assets/demo/demo_01.png)

The extension performs three things:

1. Detects when you are logged in on Swiggy and confirms connectivity.
2. Fetches your full order history on demand (the data never leaves your browser until you visit Spenddy).
3. Exposes the fetched data to the Spenddy web app so it can be imported with a single click.

Built with [WXT](https://wxt.dev/) + TypeScript, it works in both **Chrome** and **Firefox**.

---

## Prerequisites

* **Node.js** ≥ 18
* **pnpm** ≥ 8 (or swap `pnpm` with `npm` / `yarn` if you prefer)
* **WXT CLI** (optional) – install globally with `npm install -g wxt` *or* run one-off commands via `pnpm dlx wxt@latest <command>`

> The repo already includes WXT as a dev dependency, so installing it globally is optional.

---

## Getting started (development)

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Run the development server** – this builds the extension in watch-mode and starts a live-reloading environment:

   ```bash
   # Chromium / Chrome
   pnpm dev

   # Firefox (optional)
   pnpm dev:firefox
   ```

   The compiled extension will be output to `.wxt/dist/` (Chrome) or `.wxt/dist-firefox/` (Firefox). Follow the *Load unpacked* instructions below to load it into your browser.

---

## Building a production bundle

Generate an optimised, production-ready build:

```bash
# Chrome build (default)
pnpm build

# Firefox build
pnpm build:firefox
```

The artefacts are placed in `.wxt/dist/` and are ready to be published to the respective web-store.

### Creating a distributable zip

If you need a zipped upload bundle you can run:

```bash
# Chrome zip (default)
pnpm zip

# Firefox zip
pnpm zip:firefox
```

The zip file will appear at the project root.

---

## Loading the extension locally

### Chrome / Edge (Chromium)

1. Navigate to `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `.wxt/dist/` directory.

### Firefox

1. Navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and pick the `manifest.json` inside `.wxt/dist-firefox/`.

The extension icon should now appear in your toolbar.

---

## How to use

1. **Open Swiggy and log in.**
2. Click the **Spenddy Link** extension icon.  
   • If everything is connected you will see a green "Connected" status.  
   • Otherwise follow the on-screen steps to establish connectivity.
3. Press **Fetch Order Data** – the extension will fetch your entire order history (this can take a minute for large accounts). Progress is displayed in real time.
4. When finished, click **Go to Spenddy** to visit the Spenddy web app where the freshly fetched data is automatically detected and can be imported.

That's it – happy budgeting! 🎉

---

## Project structure (TL;DR)

```
entrypoints/
  background.ts        # Service-worker style background script
  spenddy.content.ts   # Content-script injected on the Spenddy site
  swiggy.content.ts    # Content-script injected on Swiggy
  popup/               # Extension popup (UI)
components/            # Shared TS utilities/helpers
wxt.config.ts          # WXT configuration
```

---

## Further documentation

* [Extension Architecture](docs/ARCHITECTURE.md) – component diagram, message matrix, build process.
* [Data Type Reference](docs/DATA_TYPES.md) – full TypeScript interfaces for Swiggy order payloads and storage keys.

---

## License

[MIT](LICENSE) – © 2024 Spenddy

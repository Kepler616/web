# web

This repository contains the source for the personal site and portfolio.

## Live demos

### Snake Game Using Phaser

Browser based implementation of the classic Snake game using Phaser 3. It focuses on grid based movement, separation between rendering and game state, and a lightweight UI shell that integrates with the rest of the site.

### Crypto Real-Time Admin Dashboard

Demo dashboard that reads crypto and market data from a backend in Cloudflare Workers and renders a small admin style view using React on the frontend. The goal is to show how to design a narrow backend surface, normalize external data and keep the frontend simple.

The demo is limited to a curated list of up to ten assets and uses a refresh interval of ten seconds.

## Crypto demo backend design (Cloudflare Workers)

The backend is designed as a single Cloudflare Worker with a small HTTP surface:

- `GET /api/markets?ids=bitcoin,ethereum,...` returns normalized market data for the requested assets.
- `GET /api/asset/:id/chart?days=1` returns a normalized intraday price series for one asset.

The Worker reads data from a third party public API such as CoinGecko and maps the responses into a compact JSON format that is easy for the frontend to consume.

Example Worker implementation in TypeScript:

```ts
export interface Env {
  COINGECKO_API_BASE: string;
}

const ALLOWED_ASSETS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
  { id: "binancecoin", symbol: "BNB", name: "Binance Coin" },
  { id: "ripple", symbol: "XRP", name: "Ripple" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot" },
  { id: "matic-network", symbol: "MATIC", name: "Polygon" }
];

function normalizeIdsParam(idsParam: string): string[] {
  var requested = idsParam.split(",").map(function (value) {
    return value.trim();
  }).filter(function (value) {
    return value.length > 0;
  });
  var allowedIds = ALLOWED_ASSETS.map(function (asset) {
    return asset.id;
  });
  return requested.filter(function (id) {
    return allowedIds.indexOf(id) !== -1;
  }).slice(0, 10);
}

export default {
  async fetch(request, env: Env): Promise<Response> {
    var url = new URL(request.url);
    if (url.pathname === "/api/markets") {
      var idsParam = url.searchParams.get("ids") || "";
      var ids = normalizeIdsParam(idsParam);
      if (ids.length === 0) {
        return new Response(JSON.stringify({ assets: [] }), {
          status: 200,
          headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
        });
      }
      var upstreamUrl = env.COINGECKO_API_BASE + "/coins/markets?vs_currency=usd&ids=" + ids.join(",");
      var upstreamResponse = await fetch(upstreamUrl, { cf: { cacheTtl: 8, cacheEverything: true } });
      if (!upstreamResponse.ok) {
        return new Response(JSON.stringify({ error: "upstream_error" }), {
          status: 502,
          headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
        });
      }
      var json = await upstreamResponse.json();
      var assets = json.map(function (item) {
        return {
          id: item.id,
          symbol: item.symbol.toUpperCase(),
          name: item.name,
          priceUsd: item.current_price,
          changePercent24h: item.price_change_percentage_24h,
          volume24hUsd: item.total_volume
        };
      });
      return new Response(JSON.stringify({ assets: assets }), {
        status: 200,
        headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
      });
    }
    if (url.pathname.startsWith("/api/asset/") && url.pathname.endsWith("/chart")) {
      var parts = url.pathname.split("/");
      var id = parts[3];
      var allowedIds = ALLOWED_ASSETS.map(function (asset) {
        return asset.id;
      });
      if (allowedIds.indexOf(id) === -1) {
        return new Response(JSON.stringify({ error: "unknown_asset" }), {
          status: 400,
          headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
        });
      }
      var days = url.searchParams.get("days") || "1";
      var chartUrl = env.COINGECKO_API_BASE + "/coins/" + id + "/market_chart?vs_currency=usd&days=" + days;
      var chartResponse = await fetch(chartUrl, { cf: { cacheTtl: 8, cacheEverything: true } });
      if (!chartResponse.ok) {
        return new Response(JSON.stringify({ error: "upstream_error" }), {
          status: 502,
          headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
        });
      }
      var chartJson = await chartResponse.json();
      var points = chartJson.prices.map(function (pair) {
        return { time: pair[0], priceUsd: pair[1] };
      });
      return new Response(JSON.stringify({ points: points }), {
        status: 200,
        headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
      });
    }
    return new Response("Not found", { status: 404 });
  }
};
```

### Security and configuration

- Narrow, versioned HTTP surface limited to read only endpoints.
- Asset ids validated against the fixed list in the Worker so users cannot query arbitrary assets.
- basic caching on the Worker edge to reduce calls to the upstream public API and smooth bursts during refresh cycles.
- CORS headers set to allow the portfolio site origin to call the Worker.
- Upstream base URL and keys are provided through the Worker environment rather than hard coded.

## Crypto demo frontend design (React)

The frontend for the crypto demo is implemented as a React app embedded directly in `services/crypto-dashboard.html`. It uses the following ideas:

- A polling hook that calls the Worker every ten seconds and exposes loading, error and data state.
- A merged asset list that combines the fixed asset catalog with live fields from the backend.
- A symbol filter input that filters the in memory list by symbol or name.
- A detail panel that renders a lightweight SVG line chart using normalized price points.

The React bundle is loaded from a CDN and rendered into a single root node. This keeps the hosting side simple while still showing a modern component based frontend.

## Real time behaviour

The dashboard uses a ten second polling interval for both the asset overview and the selected asset chart. The interval is coordinated in the frontend so the UI can show a clear connection status message that reflects the last load state.

Each request hits the Worker, which in turn reads from the upstream API with short lived caching. This pattern produces a steady rhythm of refreshes without overwhelming the public API and makes it easy to extend or change the cadence later.

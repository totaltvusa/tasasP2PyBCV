export interface RateItem {
  moneda: string;
  fuente: 'oficial' | 'paralelo';
  nombre: string;
  promedio: number;
  compra?: number | null;
  venta?: number | null;
  fechaActualizacion: string;
}

export interface P2POffer {
  price: number;
  minLimit: number;
  maxLimit: number;
  merchantName: string;
  monthOrderCount: number;
  monthFinishRate: number;
  payMethods: string[];
}

export interface P2PTradeSummary {
  average: number;
  min: number;
  max: number;
  count: number;
  topOffers: P2POffer[];
  isFallback?: boolean;
}

export interface BCVNextBusinessDay {
  isAnnounced: boolean;
  fechaValorTexto: string;
  fechaValorIso: string;
  usd: number;
  eur: number;
  diffUsd: number;
  diffEur: number;
  diffUsdPct: number;
  diffEurPct: number;
}

export interface MarketRatesData {
  timestamp: string;
  bcv: {
    usd: RateItem;
    eur: RateItem;
    nextBusinessDay?: BCVNextBusinessDay;
  };
  paralelo?: {
    usd?: RateItem;
    eur?: RateItem;
  };
  binanceP2P: {
    fiat: string;
    asset: string;
    buy: P2PTradeSummary;  // Comprar USDT con VES
    sell: P2PTradeSummary; // Vender USDT por VES
  };
  spreads: {
    p2pBuyVsBcvPct: number;  // Prima P2P Compra vs Dólar Oficial BCV
    p2pSellVsBcvPct: number; // Prima P2P Venta vs Dólar Oficial BCV
    p2pSpreadPct: number;    // Spread entre Compra y Venta P2P
  };
}

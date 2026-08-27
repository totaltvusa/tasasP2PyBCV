import { NextResponse } from 'next/server';
import { MarketRatesData, P2POffer, P2PTradeSummary, RateItem } from '@/lib/types/rates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAY_TYPE_MAP: Record<string, string> = {
  BNC: 'BNCBancoNacional',
  BancoNacionalDeCredito: 'BNCBancoNacional',
  BNCBancoNacional: 'BNCBancoNacional',
  BancoDeVenezuela: 'BancoDeVenezuela',
  BDV: 'BancoDeVenezuela',
  PagoMovil: 'PagoMovil',
  Banesco: 'Banesco',
  Mercantil: 'Mercantil',
  Provincial: 'Provincial',
  BBVA: 'Provincial',
  Bancamiga: 'Bancamiga',
  Bancaribe: 'Bancaribe',
  Banplus: 'Banplus',
  BancoDelTesoro: 'BancoDelTesoro',
  BancoPlaza: 'BancoPlaza',
  BFC: 'BFC',
  BancoActivo: 'BancoActivo',
  Zinli: 'Zinli',
};

async function fetchBinanceP2P(
  tradeType: 'BUY' | 'SELL',
  payTypes: string[] = [],
  allowFallback = true
): Promise<P2PTradeSummary> {
  try {
    const mappedPayTypes = payTypes.map((pt) => PAY_TYPE_MAP[pt] || pt);

    const payload = JSON.stringify({
      fiat: 'VES',
      page: 1,
      rows: 15,
      tradeType,
      asset: 'USDT',
      countries: [],
      proMerchantAds: false,
      shieldMerchantAds: false,
      filterType: 'all',
      periods: [],
      additionalKycVerifyFilter: 0,
      publisherType: null,
      payTypes: mappedPayTypes.length > 0 ? mappedPayTypes : [],
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://p2p.binance.com',
      },
      body: payload,
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Binance P2P status error: ${res.status}`);
    }

    const json = await res.json();
    const ads = json.data || [];

    const offers: P2POffer[] = [];
    const prices: number[] = [];

    for (const adItem of ads) {
      const adv = adItem.adv;
      const advertiser = adItem.advertiser;
      const price = parseFloat(adv?.price);

      if (!isNaN(price) && price > 0) {
        prices.push(price);
        offers.push({
          price,
          minLimit: parseFloat(adv?.minSingleTransAmount) || 0,
          maxLimit: parseFloat(adv?.dynamicMaxSingleTransAmount || adv?.maxSingleTransAmount) || 0,
          merchantName: advertiser?.nickName || 'Comerciante P2P',
          monthOrderCount: advertiser?.monthOrderCount || 0,
          monthFinishRate: (advertiser?.monthFinishRate || 0) * 100,
          payMethods: (adv?.tradeMethods || []).map((m: any) => m.tradeMethodName || m.identifier).filter(Boolean),
        });
      }
    }

    const count = prices.length;

    // If a specific filter was requested and 0 ads found, fallback to general market
    if (count === 0 && mappedPayTypes.length > 0 && allowFallback) {
      console.warn(`[P2P ${tradeType}] No ads for filter [${mappedPayTypes.join(',')}]. Falling back to general market.`);
      const fallbackResult = await fetchBinanceP2P(tradeType, [], false);
      return {
        ...fallbackResult,
        isFallback: true,
      };
    }

    const min = count > 0 ? Math.min(...prices) : 0;
    const max = count > 0 ? Math.max(...prices) : 0;
    const average = count > 0 ? prices.reduce((a, b) => a + b, 0) / count : 0;

    return {
      average,
      min,
      max,
      count,
      topOffers: offers.slice(0, 8),
      isFallback: false,
    };
  } catch (err: any) {
    console.warn(`[P2P Binance ${tradeType}] fetch warning:`, err.message);
    if (payTypes.length > 0 && allowFallback) {
      const fallbackResult = await fetchBinanceP2P(tradeType, [], false);
      return {
        ...fallbackResult,
        isFallback: true,
      };
    }
    return {
      average: 0,
      min: 0,
      max: 0,
      count: 0,
      topOffers: [],
      isFallback: true,
    };
  }
}

async function fetchDolarApiRates(): Promise<{
  usdOficial?: RateItem;
  usdParalelo?: RateItem;
  eurOficial?: RateItem;
  eurParalelo?: RateItem;
}> {
  try {
    const [dolaresRes, eurosRes] = await Promise.all([
      fetch('https://ve.dolarapi.com/v1/dolares', { cache: 'no-store' }),
      fetch('https://ve.dolarapi.com/v1/euros', { cache: 'no-store' }),
    ]);

    const result: {
      usdOficial?: RateItem;
      usdParalelo?: RateItem;
      eurOficial?: RateItem;
      eurParalelo?: RateItem;
    } = {};

    if (dolaresRes.ok) {
      const dolaresList: RateItem[] = await dolaresRes.json();
      result.usdOficial = dolaresList.find((d) => d.fuente === 'oficial');
      result.usdParalelo = dolaresList.find((d) => d.fuente === 'paralelo');
    }

    if (eurosRes.ok) {
      const eurosList: RateItem[] = await eurosRes.json();
      result.eurOficial = eurosList.find((e) => e.fuente === 'oficial');
      result.eurParalelo = eurosList.find((e) => e.fuente === 'paralelo');
    }

    return result;
  } catch (err: any) {
    console.warn('[DolarApi] fetch warning:', err.message);
    return {};
  }
}

import https from 'https';

interface BCVScrapedData {
  usd: number;
  eur: number;
  fechaValorIso: string;
  fechaValorTexto: string;
}

async function fetchBCVDirect(): Promise<BCVScrapedData | null> {
  return new Promise((resolve) => {
    try {
      const agent = new https.Agent({ rejectUnauthorized: false });
      const req = https.get(
        'https://www.bcv.org.ve/',
        {
          agent,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          },
          timeout: 7000,
        },
        (res) => {
          let html = '';
          res.on('data', (c) => (html += c));
          res.on('end', () => {
            try {
              const dolarMatch = html.match(/id=\"dolar\"[\s\S]*?<strong[^>]*>\s*([\d,.]+)\s*<\/strong>/i);
              const euroMatch = html.match(/id=\"euro\"[\s\S]*?<strong[^>]*>\s*([\d,.]+)\s*<\/strong>/i);
              const dateMatch = html.match(
                /<span class=\"date-display-single\"[^>]*content=\"([^\"]+)\"[^>]*>([\s\S]*?)<\/span>/i
              );

              const parseRate = (str?: string) =>
                str ? parseFloat(str.replace(/\./g, '').replace(',', '.')) : 0;

              const usd = parseRate(dolarMatch?.[1]);
              const eur = parseRate(euroMatch?.[1]);
              const fechaValorIso = dateMatch?.[1] || '';
              const fechaValorTexto = dateMatch?.[2]?.replace(/\s+/g, ' ').trim() || '';

              if (usd > 0) {
                resolve({ usd, eur, fechaValorIso, fechaValorTexto });
              } else {
                resolve(null);
              }
            } catch {
              resolve(null);
            }
          });
        }
      );

      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const payTypesParam = searchParams.get('payTypes') || searchParams.get('payType') || '';
    const payTypes = payTypesParam
      ? payTypesParam.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const [dolarApiData, p2pBuy, p2pSell, bcvDirect] = await Promise.all([
      fetchDolarApiRates(),
      fetchBinanceP2P('BUY', payTypes),
      fetchBinanceP2P('SELL', payTypes),
      fetchBCVDirect(),
    ]);

    const defaultDate = new Date().toISOString();

    const usdOficial: RateItem = dolarApiData.usdOficial || {
      moneda: 'USD',
      fuente: 'oficial',
      nombre: 'Dólar BCV',
      promedio: bcvDirect?.usd || 787.52,
      fechaActualizacion: defaultDate,
    };

    const eurOficial: RateItem = dolarApiData.eurOficial || {
      moneda: 'EUR',
      fuente: 'oficial',
      nombre: 'Euro BCV',
      promedio: bcvDirect?.eur || 919.15,
      fechaActualizacion: defaultDate,
    };

    let nextBusinessDay: any = undefined;

    if (bcvDirect && bcvDirect.usd > 0) {
      const diffUsd = bcvDirect.usd - usdOficial.promedio;
      const diffEur = bcvDirect.eur - eurOficial.promedio;
      const diffUsdPct = usdOficial.promedio > 0 ? (diffUsd / usdOficial.promedio) * 100 : 0;
      const diffEurPct = eurOficial.promedio > 0 ? (diffEur / eurOficial.promedio) * 100 : 0;

      const isAnnounced = Math.abs(diffUsd) > 0.001 || (Boolean(bcvDirect.fechaValorIso) && bcvDirect.fechaValorIso !== usdOficial.fechaActualizacion);

      nextBusinessDay = {
        isAnnounced,
        fechaValorTexto: bcvDirect.fechaValorTexto,
        fechaValorIso: bcvDirect.fechaValorIso,
        usd: bcvDirect.usd,
        eur: bcvDirect.eur,
        diffUsd,
        diffEur,
        diffUsdPct,
        diffEurPct,
      };
    }

    const bcvUsdRate = usdOficial.promedio;
    const p2pBuyAvg = p2pBuy.average;
    const p2pSellAvg = p2pSell.average;

    const p2pBuyVsBcvPct = bcvUsdRate > 0 && p2pBuyAvg > 0 
      ? ((p2pBuyAvg - bcvUsdRate) / bcvUsdRate) * 100 
      : 0;

    const p2pSellVsBcvPct = bcvUsdRate > 0 && p2pSellAvg > 0 
      ? ((p2pSellAvg - bcvUsdRate) / bcvUsdRate) * 100 
      : 0;

    const p2pSpreadPct = p2pSellAvg > 0 && p2pBuyAvg > 0
      ? (Math.abs(p2pBuyAvg - p2pSellAvg) / p2pBuyAvg) * 100
      : 0;

    const responseData: MarketRatesData = {
      timestamp: new Date().toISOString(),
      bcv: {
        usd: usdOficial,
        eur: eurOficial,
        nextBusinessDay,
      },
      paralelo: {
        usd: dolarApiData.usdParalelo,
        eur: dolarApiData.eurParalelo,
      },
      binanceP2P: {
        fiat: 'VES',
        asset: 'USDT',
        buy: p2pBuy,
        sell: p2pSell,
      },
      spreads: {
        p2pBuyVsBcvPct,
        p2pSellVsBcvPct,
        p2pSpreadPct,
      },
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error('[Rates API] unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener las tasas de mercado.',
      },
      { status: 500 }
    );
  }
}

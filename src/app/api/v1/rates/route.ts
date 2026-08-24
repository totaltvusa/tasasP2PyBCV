import { NextResponse } from 'next/server';
import { MarketRatesData, P2POffer, P2PTradeSummary, RateItem } from '@/lib/types/rates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function fetchBinanceP2P(tradeType: 'BUY' | 'SELL'): Promise<P2PTradeSummary> {
  try {
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
      payTypes: [],
    });

    const res = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://p2p.binance.com',
      },
      body: payload,
      cache: 'no-store',
    });

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
    const min = count > 0 ? Math.min(...prices) : 0;
    const max = count > 0 ? Math.max(...prices) : 0;
    const average = count > 0 ? prices.reduce((a, b) => a + b, 0) / count : 0;

    return {
      average,
      min,
      max,
      count,
      topOffers: offers.slice(0, 8),
    };
  } catch (err: any) {
    console.warn(`[P2P Binance ${tradeType}] fetch warning:`, err.message);
    return {
      average: 0,
      min: 0,
      max: 0,
      count: 0,
      topOffers: [],
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

export async function GET() {
  try {
    const [dolarApiData, p2pBuy, p2pSell] = await Promise.all([
      fetchDolarApiRates(),
      fetchBinanceP2P('BUY'),
      fetchBinanceP2P('SELL'),
    ]);

    const defaultDate = new Date().toISOString();

    const usdOficial: RateItem = dolarApiData.usdOficial || {
      moneda: 'USD',
      fuente: 'oficial',
      nombre: 'Dólar BCV',
      promedio: 780.0,
      fechaActualizacion: defaultDate,
    };

    const eurOficial: RateItem = dolarApiData.eurOficial || {
      moneda: 'EUR',
      fuente: 'oficial',
      nombre: 'Euro BCV',
      promedio: 911.0,
      fechaActualizacion: defaultDate,
    };

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

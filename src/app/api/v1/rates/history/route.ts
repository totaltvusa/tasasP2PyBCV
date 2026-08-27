import { NextResponse } from 'next/server';
import { HistoricalRatesData, HistoricalRateEntry } from '@/lib/types/rates';

export const dynamic = 'force-dynamic';

// In-memory cache for historical rate lists (cached for 10 minutes)
let cache: {
  dolares: HistoricalRateEntry[];
  euros: HistoricalRateEntry[];
  cachedAt: number;
} | null = null;

const CACHE_TTL_MS = 10 * 60 * 1000;

async function fetchHistoricalData(): Promise<{
  dolares: HistoricalRateEntry[];
  euros: HistoricalRateEntry[];
}> {
  const now = Date.now();
  if (cache && now - cache.cachedAt < CACHE_TTL_MS) {
    return { dolares: cache.dolares, euros: cache.euros };
  }

  try {
    const [dolaresRes, eurosRes] = await Promise.all([
      fetch('https://ve.dolarapi.com/v1/historicos/dolares', { next: { revalidate: 600 } }),
      fetch('https://ve.dolarapi.com/v1/historicos/euros', { next: { revalidate: 600 } }),
    ]);

    const dolares: HistoricalRateEntry[] = dolaresRes.ok ? await dolaresRes.json() : [];
    const euros: HistoricalRateEntry[] = eurosRes.ok ? await eurosRes.json() : [];

    if (Array.isArray(dolares) && dolares.length > 0) {
      cache = { dolares, euros, cachedAt: now };
    }

    return { dolares, euros };
  } catch (err: any) {
    console.warn('[Historical API] fetch error:', err.message);
    return cache ? { dolares: cache.dolares, euros: cache.euros } : { dolares: [], euros: [] };
  }
}

function findRate(
  list: HistoricalRateEntry[],
  fuente: 'oficial' | 'paralelo',
  targetDate: string
): HistoricalRateEntry | null {
  if (!Array.isArray(list) || list.length === 0) return null;
  const filtered = list.filter((item) => item.fuente === fuente);
  
  // Exact match
  const exact = filtered.find((item) => item.fecha === targetDate);
  if (exact) return exact;

  // Closest prior business day / date
  const prior = filtered
    .filter((item) => item.fecha <= targetDate)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return prior[0] || null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let targetDate = searchParams.get('date');

    // Default to yesterday if no date provided
    if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      targetDate = yesterday.toISOString().split('T')[0];
    }

    const { dolares, euros } = await fetchHistoricalData();

    const usdOficial = findRate(dolares, 'oficial', targetDate) || {
      fuente: 'oficial',
      promedio: 0,
      fecha: targetDate,
    };

    const usdParalelo = findRate(dolares, 'paralelo', targetDate);

    const eurOficial = findRate(euros, 'oficial', targetDate) || {
      fuente: 'oficial',
      promedio: 0,
      fecha: targetDate,
      moneda: 'EUR',
    };

    const eurParalelo = findRate(euros, 'paralelo', targetDate);

    // Check if BCV official date is earlier than requested date (e.g. weekend or holiday)
    const isWeekendOrHoliday = Boolean(usdOficial.fecha && usdOficial.fecha !== targetDate);

    // Calculate spreads
    const bcvUsdRate = usdOficial.promedio || 0;
    const paraleloUsdRate = usdParalelo?.promedio || 0;
    const paraleloUsdVsBcvPct =
      bcvUsdRate > 0 && paraleloUsdRate > 0
        ? ((paraleloUsdRate - bcvUsdRate) / bcvUsdRate) * 100
        : 0;

    const bcvEurRate = eurOficial.promedio || 0;
    const paraleloEurRate = eurParalelo?.promedio || 0;
    const paraleloEurVsBcvPct =
      bcvEurRate > 0 && paraleloEurRate > 0
        ? ((paraleloEurRate - bcvEurRate) / bcvEurRate) * 100
        : 0;

    // Date formatting in Spanish
    let formattedDateText = targetDate;
    try {
      const [y, m, d] = targetDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      formattedDateText = dateObj.toLocaleDateString('es-VE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {}

    const isPre2023 = targetDate < '2023-01-03';
    const isNotFound = usdOficial.promedio === 0;

    const hasParalelo = Boolean(usdParalelo && usdParalelo.promedio > 0);

    const responseData: HistoricalRatesData = {
      requestedDate: targetDate,
      formattedDateText,
      isWeekendOrHoliday,
      isPre2023,
      isNotFound,
      bcv: {
        usd: usdOficial,
        eur: eurOficial,
      },
      paralelo: hasParalelo && usdParalelo ? {
        usd: usdParalelo,
        eur: eurParalelo || undefined,
      } : undefined,
      spreads: {
        paraleloUsdVsBcvPct,
        paraleloEurVsBcvPct,
      },
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error('[Historical Rates API] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al consultar las tasas históricas.',
      },
      { status: 500 }
    );
  }
}

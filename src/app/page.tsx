'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw, ArrowRightLeft, TrendingUp, DollarSign,
  ShieldCheck, ArrowUpRight, ArrowDownLeft, Calculator,
  Building2, Landmark, Clock, Copy, Check, Sparkles,
  ExternalLink, Layers, Share2, HelpCircle
} from 'lucide-react';
import { MarketRatesData } from '@/lib/types/rates';

export default function RatesDashboardPage() {
  const [data, setData] = useState<MarketRatesData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'BUY' | 'SELL'>('BUY');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Calculator state
  const [calcMode, setCalcMode] = useState<'USDT_TO_VES' | 'VES_TO_USDT'>('USDT_TO_VES');
  const [calcAmount, setCalcAmount] = useState<string>('100');

  const fetchRates = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/rates');
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setLastRefreshed(new Date());
      } else {
        throw new Error(json.error || 'Error al obtener las tasas.');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión con los servidores de tasas.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRates(true);

    // Optional auto-refresh every 45 seconds
    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchRates(false);
      }
    }, 45000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const bcvUsdPrice = data?.bcv.usd.promedio || 0;
  const bcvEurPrice = data?.bcv.eur.promedio || 0;

  const currentP2PSummary = activeTab === 'BUY' ? data?.binanceP2P.buy : data?.binanceP2P.sell;
  const currentP2PAvg = currentP2PSummary?.average || 0;

  // Calculator computations
  const numericAmount = parseFloat(calcAmount) || 0;

  const calcResults = useMemo(() => {
    if (numericAmount <= 0) {
      return {
        p2pResult: 0,
        bcvUsdResult: 0,
        bcvEurResult: 0,
        diffUsd: 0,
        diffEur: 0,
      };
    }

    if (calcMode === 'USDT_TO_VES') {
      const p2pRate = data?.binanceP2P.sell.average || bcvUsdPrice;
      const p2pResult = numericAmount * p2pRate;
      const bcvUsdResult = numericAmount * bcvUsdPrice;
      const bcvEurResult = numericAmount * bcvEurPrice;
      return {
        p2pResult,
        bcvUsdResult,
        bcvEurResult,
        diffUsd: p2pResult - bcvUsdResult,
        diffEur: p2pResult - bcvEurResult,
      };
    } else {
      const p2pRate = data?.binanceP2P.buy.average || bcvUsdPrice;
      const p2pResult = p2pRate > 0 ? numericAmount / p2pRate : 0;
      const bcvUsdResult = bcvUsdPrice > 0 ? numericAmount / bcvUsdPrice : 0;
      const bcvEurResult = bcvEurPrice > 0 ? numericAmount / bcvEurPrice : 0;
      return {
        p2pResult,
        bcvUsdResult,
        bcvEurResult,
        diffUsd: bcvUsdResult - p2pResult,
        diffEur: bcvEurResult - p2pResult,
      };
    }
  }, [numericAmount, calcMode, data, bcvUsdPrice, bcvEurPrice]);

  // Copy clean text report for WhatsApp / Telegram
  const handleCopyReport = () => {
    if (!data) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const text = `📊 *MONITOR DE TASAS VENEZUELA* 🇻🇪 (${now})
━━━━━━━━━━━━━━━━━━━━
💵 *Dólar BCV Oficial:* ${bcvUsdPrice.toFixed(2)} Bs.
💶 *Euro BCV Oficial:* ${bcvEurPrice.toFixed(2)} Bs.
━━━━━━━━━━━━━━━━━━━━
🟡 *Binance P2P (USDT/VES):*
🟢 *Comprar USDT:* ${data.binanceP2P.buy.average.toFixed(2)} Bs. (Brecha: +${data.spreads.p2pBuyVsBcvPct.toFixed(2)}%)
🔴 *Vender USDT:* ${data.binanceP2P.sell.average.toFixed(2)} Bs. (Brecha: +${data.spreads.p2pSellVsBcvPct.toFixed(2)}%)
━━━━━━━━━━━━━━━━━━━━
Consulte en vivo en: https://${typeof window !== 'undefined' ? window.location.host : 'tasasp2p.vercel.app'}`;

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-amber-500 selection:text-black">
      
      {/* ── Top Header / Navbar ── */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-gray-800/80 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-500 to-amber-600 flex items-center justify-center text-gray-950 font-black shadow-lg shadow-amber-500/20">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Tasas Venezuela
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  P2P & BCV
                </span>
              </div>
              <p className="text-[11px] text-gray-400">Precios en tiempo real del mercado venezolano</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            
            {/* Copy Report Button */}
            <button
              onClick={handleCopyReport}
              disabled={!data}
              title="Copiar reporte del día para WhatsApp/Telegram"
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition"
            >
              {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
              <span>{copiedReport ? '¡Copiado!' : 'Copiar Reporte'}</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => fetchRates(true)}
              disabled={isLoading}
              title="Actualizar tasas ahora"
              className="p-2 rounded-xl bg-gray-800/90 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>

          </div>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Live Status Pill & Timestamps */}
        <div className="p-3 rounded-2xl bg-gray-900/60 border border-gray-800 flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-emerald-400">Monitor en Vivo</span>
            <span className="text-gray-500 hidden sm:inline">•</span>
            <span className="text-gray-400 hidden sm:inline">
              {lastRefreshed ? `Última consulta: ${lastRefreshed.toLocaleTimeString()}` : 'Cargando...'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyReport}
              className="sm:hidden text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center space-x-1"
            >
              {copiedReport ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedReport ? 'Copiado' : 'Copiar'}</span>
            </button>
            <span className="text-[11px] text-gray-400 font-mono">
              VES (Bs.)
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => fetchRates(true)} className="underline font-bold ml-2">Reintentar</button>
          </div>
        )}

        {/* ── 1. BLOQUE BANCO CENTRAL DE VENEZUELA (BCV OFICIAL) ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
                Banco Central de Venezuela (Tasas Oficiales)
              </h2>
            </div>
            <span className="text-[11px] text-gray-400 font-mono flex items-center space-x-1">
              <Clock className="w-3 h-3 text-blue-400" />
              <span>Fuente Oficial BCV</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Dólar BCV */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-950/40 via-gray-900/90 to-gray-950 border border-blue-500/30 shadow-xl relative overflow-hidden group">
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/20 transition" />
              
              <div className="flex items-center justify-between text-xs text-blue-300 font-medium mb-2">
                <span className="flex items-center space-x-2">
                  <span className="text-lg">💵</span>
                  <span className="text-sm font-bold text-white">Dólar BCV (USD)</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40 tracking-wider">
                  OFICIAL
                </span>
              </div>

              <div className="flex items-baseline space-x-2 my-2">
                <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                  {bcvUsdPrice > 0 ? bcvUsdPrice.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '---'}
                </span>
                <span className="text-sm font-bold text-gray-400">Bs. / USD</span>
              </div>

              <div className="text-xs text-gray-400 flex items-center justify-between pt-3 border-t border-blue-500/20">
                <span>1 Dólar Estadounidense = {bcvUsdPrice.toFixed(2)} VES</span>
                <span className="text-[10px] text-gray-500 font-mono">Tasa de cambio BCV</span>
              </div>
            </div>

            {/* Euro BCV */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-gray-900/90 to-gray-950 border border-indigo-500/30 shadow-xl relative overflow-hidden group">
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/20 transition" />
              
              <div className="flex items-center justify-between text-xs text-indigo-300 font-medium mb-2">
                <span className="flex items-center space-x-2">
                  <span className="text-lg">💶</span>
                  <span className="text-sm font-bold text-white">Euro BCV (EUR)</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 tracking-wider">
                  OFICIAL
                </span>
              </div>

              <div className="flex items-baseline space-x-2 my-2">
                <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                  {bcvEurPrice > 0 ? bcvEurPrice.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '---'}
                </span>
                <span className="text-sm font-bold text-gray-400">Bs. / EUR</span>
              </div>

              <div className="text-xs text-gray-400 flex items-center justify-between pt-3 border-t border-indigo-500/20">
                <span>1 Euro = {bcvEurPrice.toFixed(2)} VES</span>
                <span className="text-[10px] text-gray-500 font-mono">Tasa de cambio BCV</span>
              </div>
            </div>

          </div>
        </section>

        {/* ── 2. BLOQUE BINANCE P2P MERCADO EN VIVO (USDT / BOLÍVARES) ── */}
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                Mercado Binance P2P (USDT / Bolívares)
              </h2>
            </div>

            {/* BUY / SELL Switcher */}
            <div className="flex items-center p-1 bg-gray-900 rounded-2xl border border-gray-800 shadow-lg">
              <button
                type="button"
                onClick={() => setActiveTab('BUY')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                  activeTab === 'BUY'
                    ? 'bg-emerald-500 text-gray-950 shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Comprar USDT</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('SELL')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                  activeTab === 'SELL'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Vender USDT</span>
              </button>
            </div>
          </div>

          {/* P2P Main Stats Cards */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-950/20 via-gray-900 to-gray-950 border border-amber-500/30 shadow-2xl space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Average Price */}
              <div className="p-4 rounded-2xl bg-gray-900/80 border border-gray-800 shadow-md">
                <div className="text-xs text-gray-400 font-medium">Precio Promedio P2P</div>
                <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono my-1">
                  {currentP2PAvg > 0 ? currentP2PAvg.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'} <span className="text-xs font-normal text-gray-400">Bs.</span>
                </div>
                <div className="text-[11px] text-gray-500">Muestra de {currentP2PSummary?.count || 0} órdenes activas</div>
              </div>

              {/* Best Price Available */}
              <div className="p-4 rounded-2xl bg-gray-900/80 border border-gray-800 shadow-md">
                <div className="text-xs text-gray-400 font-medium">
                  {activeTab === 'BUY' ? 'Mejor Precio de Compra' : 'Mejor Precio de Venta'}
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono my-1">
                  {activeTab === 'BUY'
                    ? (currentP2PSummary?.min ? currentP2PSummary.min.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---')
                    : (currentP2PSummary?.max ? currentP2PSummary.max.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---')
                  } <span className="text-xs font-normal text-gray-400">Bs.</span>
                </div>
                <div className="text-[11px] text-emerald-400 font-medium">
                  {activeTab === 'BUY' ? 'Tasa más económica disponible' : 'Tasa más alta que recibes'}
                </div>
              </div>

              {/* Spread / Brecha vs BCV */}
              <div className="p-4 rounded-2xl bg-gray-900/80 border border-gray-800 shadow-md">
                <div className="text-xs text-gray-400 font-medium">Brecha vs Dólar BCV</div>
                <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono my-1 flex items-center space-x-1.5">
                  <span>
                    {data ? (activeTab === 'BUY' ? data.spreads.p2pBuyVsBcvPct : data.spreads.p2pSellVsBcvPct).toFixed(2) : 0}%
                  </span>
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="text-[11px] text-gray-400 font-medium">
                  +{(currentP2PAvg - bcvUsdPrice).toFixed(2)} Bs. por dólar vs tasa oficial
                </div>
              </div>

            </div>

            {/* Top Merchant Offers */}
            {currentP2PSummary && currentP2PSummary.topOffers.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-gray-800/80">
                <div className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>Ofertas destacadas en Binance P2P ({activeTab === 'BUY' ? 'Para Comprar' : 'Para Vender'})</span>
                  <span className="text-[11px] text-amber-400 font-mono">Tasa USDT/VES</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {currentP2PSummary.topOffers.slice(0, 4).map((offer, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-gray-950/80 border border-gray-800/90 hover:border-amber-500/40 transition flex flex-col justify-between text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white truncate max-w-[100px]">{offer.merchantName}</span>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          {offer.monthFinishRate.toFixed(0)}% éxito
                        </span>
                      </div>
                      
                      <div className="text-[11px] text-gray-400 truncate">
                        {offer.payMethods.slice(0, 2).join(', ') || 'Transferencia'}
                      </div>

                      <div className="pt-1 border-t border-gray-800 flex items-baseline justify-between">
                        <span className="text-[10px] text-gray-500 font-mono">Precio:</span>
                        <span className="font-mono font-black text-amber-300 text-sm">
                          {offer.price.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </section>

        {/* ── 3. CALCULADORA RÁPIDA DE CONVERSIÓN P2P VS BCV ── */}
        <section className="p-5 sm:p-6 rounded-3xl bg-gray-900/90 border border-gray-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <Calculator className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
                Calculadora & Conversor Interactivo
              </h2>
            </div>

            {/* Mode Switcher */}
            <button
              type="button"
              onClick={() => setCalcMode(calcMode === 'USDT_TO_VES' ? 'VES_TO_USDT' : 'USDT_TO_VES')}
              className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs text-gray-200 hover:text-white font-bold flex items-center space-x-2 transition"
            >
              <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
              <span>
                {calcMode === 'USDT_TO_VES' ? 'USDT ➔ Bolívares (VES)' : 'Bolívares (VES) ➔ USDT'}
              </span>
            </button>
          </div>

          {/* Input Form & Quick Presets */}
          <div className="space-y-3">
            <div className="relative">
              <input
                type="number"
                min="1"
                step="any"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                placeholder="Ingrese monto a calcular..."
                className="w-full bg-gray-950 border border-gray-800 focus:border-emerald-500 rounded-2xl px-4 py-3.5 text-base sm:text-lg font-mono text-white placeholder-gray-600 focus:outline-none transition shadow-inner"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                {calcMode === 'USDT_TO_VES' ? 'USDT' : 'VES (Bs.)'}
              </span>
            </div>

            {/* Preset Amount Buttons */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 custom-scrollbar">
              <span className="text-[11px] text-gray-500 font-medium shrink-0">Montos rápidos:</span>
              {(calcMode === 'USDT_TO_VES' ? ['10', '50', '100', '250', '500', '1000'] : ['1000', '5000', '10000', '25000', '50000']).map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCalcAmount(amt)}
                  className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs font-mono text-gray-300 hover:text-white transition shrink-0"
                >
                  {calcMode === 'USDT_TO_VES' ? `$${amt}` : `${parseInt(amt).toLocaleString()} Bs.`}
                </button>
              ))}
            </div>
          </div>

          {/* Result Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
            
            {/* Binance P2P Result */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/30 via-gray-900 to-gray-950 border border-amber-500/30 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-amber-300 font-medium">
                <span className="font-bold flex items-center space-x-1">
                  <span>🟡</span>
                  <span>Binance P2P ({calcMode === 'USDT_TO_VES' ? 'Venta' : 'Compra'})</span>
                </span>
                <span className="text-[10px] font-mono bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                  {currentP2PAvg.toFixed(2)} Bs.
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono my-2">
                {calcMode === 'USDT_TO_VES'
                  ? `${calcResults.p2pResult.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`
                  : `${calcResults.p2pResult.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
                }
              </div>
              <div className="text-[11px] text-gray-400">
                {calcMode === 'USDT_TO_VES' ? 'Bolívares que recibes en tu cuenta' : 'Cantidad de USDT que obtienes'}
              </div>
            </div>

            {/* BCV Dólar Oficial Result */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/30 via-gray-900 to-gray-950 border border-blue-500/30 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-blue-300 font-medium">
                <span className="font-bold flex items-center space-x-1">
                  <span>💵</span>
                  <span>Dólar Oficial BCV</span>
                </span>
                <span className="text-[10px] font-mono bg-blue-500/15 px-1.5 py-0.5 rounded border border-blue-500/30">
                  {bcvUsdPrice.toFixed(2)} Bs.
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono my-2">
                {calcMode === 'USDT_TO_VES'
                  ? `${calcResults.bcvUsdResult.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`
                  : `${calcResults.bcvUsdResult.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                }
              </div>
              <div className="text-[11px] text-cyan-400 font-medium">
                Diferencia: {calcMode === 'USDT_TO_VES' ? `+${calcResults.diffUsd.toLocaleString('es-VE', { maximumFractionDigits: 2 })} Bs.` : `-${calcResults.diffUsd.toFixed(2)} USD`}
              </div>
            </div>

            {/* BCV Euro Oficial Result */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/30 via-gray-900 to-gray-950 border border-indigo-500/30 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-indigo-300 font-medium">
                <span className="font-bold flex items-center space-x-1">
                  <span>💶</span>
                  <span>Euro Oficial BCV</span>
                </span>
                <span className="text-[10px] font-mono bg-indigo-500/15 px-1.5 py-0.5 rounded border border-indigo-500/30">
                  {bcvEurPrice.toFixed(2)} Bs.
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono my-2">
                {calcMode === 'USDT_TO_VES'
                  ? `${calcResults.bcvEurResult.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`
                  : `${calcResults.bcvEurResult.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`
                }
              </div>
              <div className="text-[11px] text-indigo-300 font-medium">
                Diferencia: {calcMode === 'USDT_TO_VES' ? `${calcResults.diffEur >= 0 ? '+' : ''}${calcResults.diffEur.toLocaleString('es-VE', { maximumFractionDigits: 2 })} Bs.` : `${calcResults.diffEur.toFixed(2)} EUR`}
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="w-full border-t border-gray-800/80 bg-gray-950/80 px-4 py-5 text-center text-xs text-gray-500 space-y-1.5">
        <p>
          Tasas oficiales obtenidas de fuentes públicas del Banco Central de Venezuela y libro de órdenes de Binance P2P.
        </p>
        <p className="text-[11px] text-gray-600">
          Desarrollado para consulta rápida y transparente de precios de mercado en Venezuela.
        </p>
      </footer>

    </div>
  );
}

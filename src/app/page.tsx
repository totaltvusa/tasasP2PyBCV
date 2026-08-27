'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  RefreshCw, ArrowRightLeft, TrendingUp, DollarSign,
  ShieldCheck, ArrowUpRight, ArrowDownLeft, Calculator,
  Building2, Landmark, Clock, Copy, Check, Sparkles,
  ExternalLink, Layers, Share2, HelpCircle, Filter,
  ChevronDown, ChevronUp, CheckSquare, Square, X, SlidersHorizontal, AlertTriangle,
  CalendarDays, Calendar, History, ArrowLeft, Info
} from 'lucide-react';
import { MarketRatesData, HistoricalRatesData } from '@/lib/types/rates';

const VENEZUELA_PAYMENT_METHODS = [
  { id: 'PagoMovil', name: 'Pago Móvil', shortName: 'Pago Móvil', icon: '📱' },
  { id: 'Banesco', name: 'Banesco', shortName: 'Banesco', icon: '🟢' },
  { id: 'BancoDeVenezuela', name: 'Banco de Venezuela (BDV)', shortName: 'BDV', icon: '🔴' },
  { id: 'Mercantil', name: 'Mercantil', shortName: 'Mercantil', icon: '🔵' },
  { id: 'Provincial', name: 'BBVA Provincial', shortName: 'Provincial', icon: '🔷' },
  { id: 'BNCBancoNacional', name: 'Banco Nacional de Crédito (BNC)', shortName: 'BNC', icon: '🏛️' },
  { id: 'Bancamiga', name: 'Bancamiga', shortName: 'Bancamiga', icon: '💳' },
  { id: 'Bancaribe', name: 'Bancaribe', shortName: 'Bancaribe', icon: '🏦' },
  { id: 'Banplus', name: 'Banplus', shortName: 'Banplus', icon: '💳' },
  { id: 'BancoDelTesoro', name: 'Banco del Tesoro', shortName: 'Tesoro', icon: '🪙' },
  { id: 'BFC', name: 'BFC Fondo Común', shortName: 'BFC', icon: '🏢' },
  { id: 'Zinli', name: 'Zinli', shortName: 'Zinli', icon: '⚡' },
];

export default function RatesDashboardPage() {
  // Main view mode: 'LIVE' or 'HISTORICAL'
  const [viewMode, setViewMode] = useState<'LIVE' | 'HISTORICAL'>('LIVE');

  // Live data state
  const [data, setData] = useState<MarketRatesData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'BUY' | 'SELL'>('BUY');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Payment methods filter state
  const [selectedPayTypes, setSelectedPayTypes] = useState<string[]>([]);
  const [isPayMenuOpen, setIsPayMenuOpen] = useState<boolean>(false);
  const payMenuRef = useRef<HTMLDivElement>(null);

  // Live Calculator state
  const [calcMode, setCalcMode] = useState<'USDT_TO_VES' | 'VES_TO_USDT'>('USDT_TO_VES');
  const [calcAmount, setCalcAmount] = useState<string>('100');
  const [calcBcvSource, setCalcBcvSource] = useState<'AUTO' | 'NEXT_DAY' | 'CURRENT'>('AUTO');

  // ── Historical state ──
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string>(getYesterdayStr());
  const [historyData, setHistoryData] = useState<HistoricalRatesData | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyCalcMode, setHistoryCalcMode] = useState<'USD_TO_VES' | 'VES_TO_USD'>('USD_TO_VES');
  const [historyCalcAmount, setHistoryCalcAmount] = useState<string>('100');
  const dateInputRef = useRef<HTMLInputElement>(null);

  const openCalendarPicker = () => {
    if (dateInputRef.current) {
      if (typeof (dateInputRef.current as any).showPicker === 'function') {
        (dateInputRef.current as any).showPicker();
      } else {
        dateInputRef.current.focus();
      }
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (payMenuRef.current && !payMenuRef.current.contains(e.target as Node)) {
        setIsPayMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchRates = async (showLoading = true, payTypesOverride?: string[]) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const types = payTypesOverride !== undefined ? payTypesOverride : selectedPayTypes;
      const query = types.length > 0 ? `?payTypes=${encodeURIComponent(types.join(','))}` : '';
      const res = await fetch(`/api/v1/rates${query}`);
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

    const interval = setInterval(() => {
      if (autoRefresh && viewMode === 'LIVE') {
        fetchRates(false);
      }
    }, 45000);

    return () => clearInterval(interval);
  }, [autoRefresh, viewMode]);

  // Fetch historical data when date changes
  const fetchHistoricalRates = async (dateStr: string) => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch(`/api/v1/rates/history?date=${dateStr}`);
      const json = await res.json();
      if (json.success && json.data) {
        setHistoryData(json.data);
      } else {
        throw new Error(json.error || 'No se encontraron tasas para la fecha seleccionada.');
      }
    } catch (err: any) {
      setHistoryError(err.message || 'Error al consultar tasas históricas.');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'HISTORICAL') {
      fetchHistoricalRates(selectedHistoryDate);
    }
  }, [viewMode, selectedHistoryDate]);

  // Quick preset helper
  const handleSelectPresetDaysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    const dateStr = d.toISOString().split('T')[0];
    setSelectedHistoryDate(dateStr);
  };

  const handleSelectPresetMonthsAgo = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    const dateStr = d.toISOString().split('T')[0];
    setSelectedHistoryDate(dateStr);
  };

  const togglePayType = (id: string) => {
    const next = selectedPayTypes.includes(id)
      ? selectedPayTypes.filter((t) => t !== id)
      : [...selectedPayTypes, id];
    setSelectedPayTypes(next);
    fetchRates(true, next);
  };

  const clearPayTypes = () => {
    setSelectedPayTypes([]);
    fetchRates(true, []);
  };

  // Base BCV rates
  const currentBcvUsd = data?.bcv.usd.promedio || 0;
  const currentBcvEur = data?.bcv.eur.promedio || 0;
  const nextDayBcv = data?.bcv.nextBusinessDay;

  const todayFormattedText = useMemo(() => {
    if (data?.bcv.usd.fechaActualizacion) {
      try {
        const d = new Date(data.bcv.usd.fechaActualizacion);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        }
      } catch {}
    }
    return new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }, [data]);

  // Decide effective rate for calculations & spread
  const effectiveBcvUsd = useMemo(() => {
    if (calcBcvSource === 'CURRENT') return currentBcvUsd;
    if (calcBcvSource === 'NEXT_DAY' && nextDayBcv?.usd) return nextDayBcv.usd;
    return (nextDayBcv?.isAnnounced && nextDayBcv.usd > 0) ? nextDayBcv.usd : currentBcvUsd;
  }, [calcBcvSource, currentBcvUsd, nextDayBcv]);

  const effectiveBcvEur = useMemo(() => {
    if (calcBcvSource === 'CURRENT') return currentBcvEur;
    if (calcBcvSource === 'NEXT_DAY' && nextDayBcv?.eur) return nextDayBcv.eur;
    return (nextDayBcv?.isAnnounced && nextDayBcv.eur > 0) ? nextDayBcv.eur : currentBcvEur;
  }, [calcBcvSource, currentBcvEur, nextDayBcv]);

  const currentP2PSummary = activeTab === 'BUY' ? data?.binanceP2P.buy : data?.binanceP2P.sell;
  const currentP2PAvg = currentP2PSummary?.average || 0;

  // Live Calculator computations
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
      const p2pRate = data?.binanceP2P.sell.average || effectiveBcvUsd;
      const p2pResult = numericAmount * p2pRate;
      const bcvUsdResult = numericAmount * effectiveBcvUsd;
      const bcvEurResult = numericAmount * effectiveBcvEur;
      return {
        p2pResult,
        bcvUsdResult,
        bcvEurResult,
        diffUsd: p2pResult - bcvUsdResult,
        diffEur: p2pResult - bcvEurResult,
      };
    } else {
      const p2pRate = data?.binanceP2P.buy.average || effectiveBcvUsd;
      const p2pResult = p2pRate > 0 ? numericAmount / p2pRate : 0;
      const bcvUsdResult = effectiveBcvUsd > 0 ? numericAmount / effectiveBcvUsd : 0;
      const bcvEurResult = effectiveBcvEur > 0 ? numericAmount / effectiveBcvEur : 0;
      return {
        p2pResult,
        bcvUsdResult,
        bcvEurResult,
        diffUsd: bcvUsdResult - p2pResult,
        diffEur: bcvEurResult - p2pResult,
      };
    }
  }, [numericAmount, calcMode, data, effectiveBcvUsd, effectiveBcvEur]);

  // Dynamic spread vs effective BCV rate
  const dynamicSpreadPct = useMemo(() => {
    if (effectiveBcvUsd <= 0 || currentP2PAvg <= 0) return 0;
    return ((currentP2PAvg - effectiveBcvUsd) / effectiveBcvUsd) * 100;
  }, [effectiveBcvUsd, currentP2PAvg]);

  // ── Historical Calculator Computations ──
  const histNumericAmount = parseFloat(historyCalcAmount) || 0;
  const histUsdOficialRate = historyData?.bcv.usd.promedio || 0;
  const histEurOficialRate = historyData?.bcv.eur.promedio || 0;
  const histUsdParaleloRate = historyData?.paralelo?.usd?.promedio || 0;

  const historyCalcResults = useMemo(() => {
    if (histNumericAmount <= 0) {
      return { bcvUsdResult: 0, bcvEurResult: 0, paraleloUsdResult: 0, diffParaleloVsBcv: 0 };
    }

    if (historyCalcMode === 'USD_TO_VES') {
      const bcvUsdResult = histNumericAmount * histUsdOficialRate;
      const bcvEurResult = histNumericAmount * histEurOficialRate;
      const paraleloUsdResult = histNumericAmount * (histUsdParaleloRate || histUsdOficialRate);
      return {
        bcvUsdResult,
        bcvEurResult,
        paraleloUsdResult,
        diffParaleloVsBcv: paraleloUsdResult - bcvUsdResult,
      };
    } else {
      const bcvUsdResult = histUsdOficialRate > 0 ? histNumericAmount / histUsdOficialRate : 0;
      const bcvEurResult = histEurOficialRate > 0 ? histNumericAmount / histEurOficialRate : 0;
      const paraleloUsdResult = histUsdParaleloRate > 0 ? histNumericAmount / histUsdParaleloRate : 0;
      return {
        bcvUsdResult,
        bcvEurResult,
        paraleloUsdResult,
        diffParaleloVsBcv: bcvUsdResult - paraleloUsdResult,
      };
    }
  }, [histNumericAmount, historyCalcMode, histUsdOficialRate, histEurOficialRate, histUsdParaleloRate]);

  // Copy live report
  const handleCopyReport = () => {
    if (!data) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const methodsLabel = selectedPayTypes.length > 0
      ? ` (Filtrado: ${selectedPayTypes.map(id => VENEZUELA_PAYMENT_METHODS.find(m => m.id === id)?.shortName || id).join(', ')})`
      : '';

    let nextDaySection = '';
    if (nextDayBcv?.isAnnounced) {
      nextDaySection = `🚀 *ANUNCIADO BCV (${nextDayBcv.fechaValorTexto}):*
💵 *Dólar Próx. Día:* ${nextDayBcv.usd.toFixed(2)} Bs. (${nextDayBcv.diffUsd >= 0 ? '+' : ''}${nextDayBcv.diffUsd.toFixed(2)} Bs.)
💶 *Euro Próx. Día:* ${nextDayBcv.eur.toFixed(2)} Bs. (${nextDayBcv.diffEur >= 0 ? '+' : ''}${nextDayBcv.diffEur.toFixed(2)} Bs.)
━━━━━━━━━━━━━━━━━━━━\n`;
    }

    const text = `📊 *MONITOR DE TASAS VENEZUELA* 🇻🇪 (${now})
━━━━━━━━━━━━━━━━━━━━
💵 *Dólar BCV Hoy:* ${currentBcvUsd.toFixed(2)} Bs.
💶 *Euro BCV Hoy:* ${currentBcvEur.toFixed(2)} Bs.
━━━━━━━━━━━━━━━━━━━━
${nextDaySection}🟡 *Binance P2P (USDT/VES)*${methodsLabel}:
🟢 *Comprar USDT:* ${data.binanceP2P.buy.average.toFixed(2)} Bs. (Brecha: +${dynamicSpreadPct.toFixed(2)}%)
🔴 *Vender USDT:* ${data.binanceP2P.sell.average.toFixed(2)} Bs.
━━━━━━━━━━━━━━━━━━━━
Consulte en vivo en: https://${typeof window !== 'undefined' ? window.location.host : 'tasasp2p.vercel.app'}`;

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  // Copy historical report
  const handleCopyHistoryReport = () => {
    if (!historyData) return;
    const text = `📅 *TASAS HISTÓRICAS VENEZUELA* 🇻🇪 (${historyData.requestedDate})
━━━━━━━━━━━━━━━━━━━━
📅 *Fecha:* ${historyData.formattedDateText}
💵 *Dólar BCV Oficial:* ${historyData.bcv.usd.promedio > 0 ? historyData.bcv.usd.promedio.toFixed(2) + ' Bs.' : 'No disponible'}
💶 *Euro BCV Oficial:* ${historyData.bcv.eur.promedio > 0 ? historyData.bcv.eur.promedio.toFixed(2) + ' Bs.' : 'No disponible'}
${historyData.paralelo?.usd?.promedio ? `📊 *Dólar Paralelo / Libre:* ${historyData.paralelo.usd.promedio.toFixed(2)} Bs. (Brecha: +${historyData.spreads.paraleloUsdVsBcvPct.toFixed(2)}%)\n` : ''}${historyData.paralelo?.eur?.promedio ? `💶 *Euro Paralelo:* ${historyData.paralelo.eur.promedio.toFixed(2)} Bs.\n` : ''}━━━━━━━━━━━━━━━━━━━━
Consulte histórico en: https://${typeof window !== 'undefined' ? window.location.host : 'tasasp2p.vercel.app'}`;

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
              <p className="text-[11px] text-gray-400">Precios en tiempo real e histórico del mercado venezolano</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            
            {/* Copy Report Button */}
            <button
              onClick={viewMode === 'LIVE' ? handleCopyReport : handleCopyHistoryReport}
              disabled={viewMode === 'LIVE' ? !data : !historyData}
              title="Copiar reporte del día para WhatsApp/Telegram"
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition"
            >
              {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
              <span>{copiedReport ? '¡Copiado!' : 'Copiar Reporte'}</span>
            </button>

            {/* Refresh Button (Live Mode only) */}
            {viewMode === 'LIVE' && (
              <button
                onClick={() => fetchRates(true)}
                disabled={isLoading}
                title="Actualizar tasas ahora"
                className="p-2 rounded-xl bg-gray-800/90 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            )}

          </div>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── Navigation Tabs: En Vivo vs Consulta Histórica ── */}
        <div className="flex items-center justify-between p-1.5 bg-gray-900/90 border border-gray-800 rounded-2xl shadow-xl flex-wrap gap-2">
          <div className="flex items-center space-x-1 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setViewMode('LIVE')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                viewMode === 'LIVE'
                  ? 'bg-amber-500 text-gray-950 shadow-md font-black'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Monitor en Vivo (Hoy)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('HISTORICAL')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                viewMode === 'HISTORICAL'
                  ? 'bg-blue-600 text-white shadow-md font-black'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Consulta Histórica (Fechas Anteriores)</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center space-x-2 px-3 text-xs text-gray-400">
            {viewMode === 'LIVE' ? (
              <span>{lastRefreshed ? `Consulta: ${lastRefreshed.toLocaleTimeString()}` : 'Cargando...'}</span>
            ) : (
              <span>Historial oficial disponible desde 2023</span>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* VISTA 1: MONITOR EN VIVO (HOY)                                         */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {viewMode === 'LIVE' && (
          <div className="space-y-6 animate-fadeIn">
            
            {error && (
              <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => fetchRates(true)} className="underline font-bold ml-2">Reintentar</button>
              </div>
            )}

            {/* ── ALERTA DESTACADA: NUEVA TASA ANUNCIADA POR EL BCV PARA EL PRÓXIMO DÍA HÁBIL ── */}
            {nextDayBcv && nextDayBcv.isAnnounced && (
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-950/60 via-indigo-950/50 to-purple-950/60 border border-blue-400/40 shadow-2xl flex items-center justify-between flex-wrap gap-4 animate-fadeIn relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-36 h-36 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex items-center space-x-3.5 min-w-[280px]">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-500/30 to-indigo-500/20 border border-blue-400/40 flex items-center justify-center text-yellow-400 shadow-lg shrink-0">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <span className="text-xs font-black uppercase tracking-wider text-blue-300">
                        Nueva Tasa Oficial Anunciada por el BCV
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/30 text-blue-200 border border-blue-400/50 tracking-wider">
                        PRÓXIMO DÍA HÁBIL 🚀
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Válida a partir de: <strong className="text-white font-bold">{nextDayBcv.fechaValorTexto || 'Próxima jornada'}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0 font-mono text-xs flex-wrap gap-2">
                  <div className="bg-gray-900/90 px-3.5 py-2 rounded-2xl border border-blue-500/40 shadow-inner">
                    <div className="text-[10px] text-blue-300 font-sans font-medium flex items-center space-x-1">
                      <span>💵 Dólar Próx. Día</span>
                    </div>
                    <div className="flex items-baseline space-x-1.5 mt-0.5">
                      <strong className="text-white text-base sm:text-lg font-black">{nextDayBcv.usd.toFixed(2)}</strong>
                      <span className="text-[10px] text-gray-400">Bs.</span>
                      <span className={`text-[10px] font-bold ${nextDayBcv.diffUsd >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        ({nextDayBcv.diffUsd >= 0 ? '+' : ''}{nextDayBcv.diffUsd.toFixed(2)} Bs.)
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-900/90 px-3.5 py-2 rounded-2xl border border-indigo-500/40 shadow-inner">
                    <div className="text-[10px] text-indigo-300 font-sans font-medium flex items-center space-x-1">
                      <span>💶 Euro Próx. Día</span>
                    </div>
                    <div className="flex items-baseline space-x-1.5 mt-0.5">
                      <strong className="text-white text-base sm:text-lg font-black">{nextDayBcv.eur.toFixed(2)}</strong>
                      <span className="text-[10px] text-gray-400">Bs.</span>
                      <span className={`text-[10px] font-bold ${nextDayBcv.diffEur >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        ({nextDayBcv.diffEur >= 0 ? '+' : ''}{nextDayBcv.diffEur.toFixed(2)} Bs.)
                      </span>
                    </div>
                  </div>
                </div>
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
                
                {/* Dólar BCV Hoy */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-950/40 via-gray-900/90 to-gray-950 border border-blue-500/30 shadow-xl relative overflow-hidden group">
                  <div className="absolute -right-8 -top-8 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/20 transition" />
                  
                  <div className="flex items-center justify-between text-xs text-blue-300 font-medium mb-2">
                    <span className="flex items-center space-x-2">
                      <span className="text-lg">💵</span>
                      <span className="text-sm font-bold text-white">Dólar BCV (USD)</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40 tracking-wider">
                      OFICIAL HOY
                    </span>
                  </div>

                  {/* Rate Value Display (Today's rate) */}
                  <div className="flex items-baseline space-x-2 my-2">
                    <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                      {currentBcvUsd > 0
                        ? currentBcvUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                        : '---'}
                    </span>
                    <span className="text-sm font-bold text-gray-400">Bs. / USD</span>
                  </div>

                  {/* Subtitle / Details with Today's Date */}
                  <div className="text-xs text-gray-400 flex items-center justify-between pt-3 border-t border-blue-500/20 flex-wrap gap-1">
                    <span>1 USD = {currentBcvUsd.toFixed(2)} VES</span>
                    <span className="text-[11px] text-blue-300/90 font-mono capitalize">
                      Válido: {todayFormattedText}
                    </span>
                  </div>
                </div>

                {/* Euro BCV Hoy */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-gray-900/90 to-gray-950 border border-indigo-500/30 shadow-xl relative overflow-hidden group">
                  <div className="absolute -right-8 -top-8 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/20 transition" />
                  
                  <div className="flex items-center justify-between text-xs text-indigo-300 font-medium mb-2">
                    <span className="flex items-center space-x-2">
                      <span className="text-lg">💶</span>
                      <span className="text-sm font-bold text-white">Euro BCV (EUR)</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 tracking-wider">
                      OFICIAL HOY
                    </span>
                  </div>

                  {/* Rate Value Display (Today's rate) */}
                  <div className="flex items-baseline space-x-2 my-2">
                    <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                      {currentBcvEur > 0
                        ? currentBcvEur.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                        : '---'}
                    </span>
                    <span className="text-sm font-bold text-gray-400">Bs. / EUR</span>
                  </div>

                  {/* Subtitle / Details with Today's Date */}
                  <div className="text-xs text-gray-400 flex items-center justify-between pt-3 border-t border-indigo-500/20 flex-wrap gap-1">
                    <span>1 EUR = {currentBcvEur.toFixed(2)} VES</span>
                    <span className="text-[11px] text-indigo-300/90 font-mono capitalize">
                      Válido: {todayFormattedText}
                    </span>
                  </div>
                </div>

              </div>
            </section>

            {/* ── 2. BLOQUE BINANCE P2P MERCADO EN VIVO (USDT / BOLÍVARES) ── */}
            <section className="space-y-4 pt-2">
              
              {/* Header Controls: Title + Switcher */}
              <div className="flex items-center justify-between flex-wrap gap-3">
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
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                      activeTab === 'BUY'
                        ? 'bg-emerald-500 text-gray-950 shadow-md font-extrabold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>Comprar USDT</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('SELL')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                      activeTab === 'SELL'
                        ? 'bg-rose-500 text-white shadow-md font-extrabold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Vender USDT</span>
                  </button>
                </div>
              </div>

              {/* Payment Methods Selector Bar */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 custom-scrollbar">
                
                {/* Payment Methods Dropdown Multi-Select */}
                <div className="relative shrink-0" ref={payMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsPayMenuOpen(!isPayMenuOpen)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 border shadow-sm ${
                      selectedPayTypes.length > 0
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-gray-900 border-gray-800 text-gray-300 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {selectedPayTypes.length === 0
                        ? 'Medios de Pago'
                        : `${selectedPayTypes.length} selec.`
                      }
                    </span>
                    {isPayMenuOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {/* Dropdown Menu */}
                  {isPayMenuOpen && (
                    <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl glass-card border border-gray-700 bg-gray-950 p-3 shadow-2xl space-y-2 z-50 animate-fadeIn max-h-80 overflow-y-auto custom-scrollbar">
                      <div className="flex items-center justify-between pb-2 border-b border-gray-800 text-xs">
                        <span className="font-bold text-white">Filtrar por Banco / Medio</span>
                        {selectedPayTypes.length > 0 && (
                          <button
                            onClick={clearPayTypes}
                            className="text-[11px] text-rose-400 hover:underline font-semibold"
                          >
                            Limpiar filtro
                          </button>
                        )}
                      </div>

                      <div className="space-y-1">
                        {VENEZUELA_PAYMENT_METHODS.map((method) => {
                          const isSelected = selectedPayTypes.includes(method.id);
                          return (
                            <button
                              key={method.id}
                              type="button"
                              onClick={() => togglePayType(method.id)}
                              className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition ${
                                isSelected
                              ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                              : 'text-gray-300 hover:bg-gray-800/80 hover:text-white'
                            }`}
                            >
                              <span className="flex items-center space-x-2 truncate">
                                <span>{method.icon}</span>
                                <span className="truncate">{method.name}</span>
                              </span>
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-amber-400 shrink-0 ml-1.5" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-600 shrink-0 ml-1.5" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Filter Chips */}
                <button
                  onClick={clearPayTypes}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition shrink-0 ${
                    selectedPayTypes.length === 0
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-gray-900/80 border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  Todos (Sin filtro)
                </button>
                {VENEZUELA_PAYMENT_METHODS.slice(0, 7).map((method) => {
                  const isSelected = selectedPayTypes.includes(method.id);
                  return (
                    <button
                      key={method.id}
                      onClick={() => togglePayType(method.id)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition flex items-center space-x-1 shrink-0 ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                          : 'bg-gray-900/80 border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <span>{method.icon}</span>
                      <span>{method.shortName}</span>
                      {isSelected && <X className="w-3 h-3 ml-0.5 text-amber-400" />}
                    </button>
                  );
                })}
              </div>

              {/* P2P Main Stats Cards */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-950/20 via-gray-900 to-gray-950 border border-amber-500/30 shadow-2xl space-y-6">
                
                {/* Filter / Fallback Banner */}
                {selectedPayTypes.length > 0 && (
                  currentP2PSummary?.isFallback ? (
                    <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300 gap-2 flex-wrap sm:flex-nowrap">
                      <span className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          Sin órdenes activas para <strong>{selectedPayTypes.map(id => VENEZUELA_PAYMENT_METHODS.find(m => m.id === id)?.shortName || id).join(', ')}</strong> en Binance P2P. Mostrando <strong>promedio general del mercado</strong>.
                        </span>
                      </span>
                      <button onClick={clearPayTypes} className="text-[11px] underline font-bold shrink-0 ml-auto">Ver todos</button>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
                      <span className="flex items-center space-x-1.5">
                        <Filter className="w-3.5 h-3.5" />
                        <span>Filtrando por: <strong>{selectedPayTypes.map(id => VENEZUELA_PAYMENT_METHODS.find(m => m.id === id)?.shortName || id).join(', ')}</strong></span>
                      </span>
                      <button onClick={clearPayTypes} className="text-[11px] underline font-bold">Ver todos</button>
                    </div>
                  )
                )}

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
                    <div className="text-xs text-gray-400 font-medium flex items-center justify-between">
                      <span>Brecha vs Dólar BCV</span>
                      {nextDayBcv?.isAnnounced && (
                        <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono">
                          vs Próx. Día
                        </span>
                      )}
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono my-1 flex items-center space-x-1.5">
                      <span>
                        {dynamicSpreadPct.toFixed(2)}%
                      </span>
                      <TrendingUp className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="text-[11px] text-gray-400 font-medium">
                      +{(currentP2PAvg - effectiveBcvUsd).toFixed(2)} Bs. por dólar vs tasa oficial
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

                <div className="flex items-center space-x-2 flex-wrap gap-2">
                  {/* If Next Day rate is announced, offer toggle */}
                  {nextDayBcv?.isAnnounced && (
                    <div className="flex items-center p-0.5 bg-gray-950 rounded-xl border border-gray-800 text-[10px] font-mono">
                      <button
                        type="button"
                        onClick={() => setCalcBcvSource('NEXT_DAY')}
                        className={`px-2 py-1 rounded-lg transition ${
                          calcBcvSource === 'NEXT_DAY' || calcBcvSource === 'AUTO'
                            ? 'bg-blue-600 text-white font-bold'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Tasa Próx. Día ({nextDayBcv.usd.toFixed(2)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalcBcvSource('CURRENT')}
                        className={`px-2 py-1 rounded-lg transition ${
                          calcBcvSource === 'CURRENT'
                            ? 'bg-blue-600 text-white font-bold'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Tasa Hoy ({currentBcvUsd.toFixed(2)})
                      </button>
                    </div>
                  )}

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
                      <span>Dólar BCV {nextDayBcv?.isAnnounced ? '(Próx. Día)' : ''}</span>
                    </span>
                    <span className="text-[10px] font-mono bg-blue-500/15 px-1.5 py-0.5 rounded border border-blue-500/30">
                      {effectiveBcvUsd.toFixed(2)} Bs.
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
                      <span>Euro BCV {nextDayBcv?.isAnnounced ? '(Próx. Día)' : ''}</span>
                    </span>
                    <span className="text-[10px] font-mono bg-indigo-500/15 px-1.5 py-0.5 rounded border border-indigo-500/30">
                      {effectiveBcvEur.toFixed(2)} Bs.
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

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* VISTA 2: CONSULTA HISTÓRICA (FECHAS ANTERIORES)                        */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {viewMode === 'HISTORICAL' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Calendar Controls & Quick Presets */}
            <div className="p-5 sm:p-6 rounded-3xl bg-gray-900/90 border border-blue-500/30 shadow-2xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <CalendarDays className="w-5 h-5 text-blue-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
                    Seleccionar Fecha Histórica
                  </h2>
                </div>

                <span className="text-xs text-gray-400">
                  Consulta de tasas oficiales y de mercado libre
                </span>
              </div>

              {/* Date Input + Presets */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2.5 flex-wrap sm:flex-nowrap gap-2">
                  <div
                    onClick={openCalendarPicker}
                    onDoubleClick={openCalendarPicker}
                    title="Haz clic o doble clic para abrir el calendario"
                    className="relative flex-1 min-w-[240px] group cursor-pointer"
                  >
                    <input
                      ref={dateInputRef}
                      type="date"
                      max={getTodayStr()}
                      min="2023-01-01"
                      value={selectedHistoryDate}
                      onChange={(e) => setSelectedHistoryDate(e.target.value)}
                      onClick={(e) => {
                        try {
                          (e.target as any).showPicker?.();
                        } catch {}
                      }}
                      className="w-full bg-gray-950 border border-gray-800 group-hover:border-blue-500/80 focus:border-blue-500 rounded-2xl pl-12 pr-4 py-3.5 text-base sm:text-lg font-mono text-white focus:outline-none transition shadow-inner cursor-pointer"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-blue-400 pointer-events-none">
                      <Calendar className="w-5 h-5 group-hover:scale-110 transition" />
                    </div>
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-gray-500 pointer-events-none hidden md:inline">
                      (Doble clic para abrir calendario)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={openCalendarPicker}
                    title="Abrir calendario interactivo"
                    className="p-3.5 rounded-2xl bg-gray-800 hover:bg-gray-700 text-blue-300 hover:text-white border border-gray-700 transition flex items-center space-x-1.5 shrink-0 shadow-sm"
                  >
                    <CalendarDays className="w-5 h-5 text-blue-400" />
                    <span className="text-xs font-bold hidden sm:inline">Calendario</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fetchHistoricalRates(selectedHistoryDate)}
                    disabled={isHistoryLoading}
                    className="px-5 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition flex items-center space-x-2 shrink-0 shadow-lg shadow-blue-600/20 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isHistoryLoading ? 'animate-spin' : ''}`} />
                    <span>Consultar Fecha</span>
                  </button>
                </div>

                {/* Quick Presets Bar */}
                <div className="flex items-center space-x-2 overflow-x-auto pb-1 custom-scrollbar pt-1">
                  <span className="text-[11px] text-gray-500 font-medium shrink-0">Accesos directos:</span>
                  <button
                    type="button"
                    onClick={() => handleSelectPresetDaysAgo(1)}
                    className="px-2.5 py-1 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs font-semibold text-gray-300 hover:text-white transition shrink-0"
                  >
                    Ayer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPresetDaysAgo(7)}
                    className="px-2.5 py-1 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs font-semibold text-gray-300 hover:text-white transition shrink-0"
                  >
                    Hace 7 días
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPresetDaysAgo(15)}
                    className="px-2.5 py-1 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs font-semibold text-gray-300 hover:text-white transition shrink-0"
                  >
                    Hace 15 días
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPresetMonthsAgo(1)}
                    className="px-2.5 py-1 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs font-semibold text-gray-300 hover:text-white transition shrink-0"
                  >
                    Hace 1 mes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPresetMonthsAgo(3)}
                    className="px-2.5 py-1 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs font-semibold text-gray-300 hover:text-white transition shrink-0"
                  >
                    Hace 3 meses
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPresetMonthsAgo(6)}
                    className="px-2.5 py-1 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs font-semibold text-gray-300 hover:text-white transition shrink-0"
                  >
                    Hace 6 meses
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPresetMonthsAgo(12)}
                    className="px-2.5 py-1 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs font-semibold text-gray-300 hover:text-white transition shrink-0"
                  >
                    Hace 1 año
                  </button>
                </div>
              </div>
            </div>

            {historyError && (
              <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
                {historyError}
              </div>
            )}

            {historyData && (
              <div className="space-y-6">
                
                {/* Historical Date Header Pill */}
                <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2.5">
                    <Calendar className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-xs text-gray-400">Tasas registradas para el día:</div>
                      <div className="text-sm sm:text-base font-bold text-white capitalize">
                        {historyData.formattedDateText}
                      </div>
                    </div>
                  </div>

                  {historyData.isWeekendOrHoliday && (
                    <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium">
                      <Info className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span>Fin de semana o feriado (Tasa BCV fijada para la jornada: {historyData.bcv.usd.fecha})</span>
                    </div>
                  )}
                </div>

                {/* Historical Rate Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  
                  {/* 1. Dólar BCV Oficial Histórico */}
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-950/40 via-gray-900 to-gray-950 border border-blue-500/30 shadow-xl">
                    <div className="flex items-center justify-between text-xs text-blue-300 font-medium mb-1">
                      <span className="flex items-center space-x-1.5">
                        <span>💵</span>
                        <span className="font-bold text-white">Dólar BCV (Oficial)</span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300">
                        BCV
                      </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white font-mono my-2">
                      {historyData.bcv.usd.promedio > 0
                        ? historyData.bcv.usd.promedio.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                        : '---'} <span className="text-xs text-gray-400">Bs.</span>
                    </div>
                    <div className="text-[11px] text-gray-400 pt-2 border-t border-blue-500/10">
                      Fecha fijada: {historyData.bcv.usd.fecha || historyData.requestedDate}
                    </div>
                  </div>

                  {/* 2. Euro BCV Oficial Histórico */}
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-gray-900 to-gray-950 border border-indigo-500/30 shadow-xl">
                    <div className="flex items-center justify-between text-xs text-indigo-300 font-medium mb-1">
                      <span className="flex items-center space-x-1.5">
                        <span>💶</span>
                        <span className="font-bold text-white">Euro BCV (Oficial)</span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                        BCV
                      </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white font-mono my-2">
                      {historyData.bcv.eur.promedio > 0
                        ? historyData.bcv.eur.promedio.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                        : '---'} <span className="text-xs text-gray-400">Bs.</span>
                    </div>
                    <div className="text-[11px] text-gray-400 pt-2 border-t border-indigo-500/10">
                      Fecha fijada: {historyData.bcv.eur.fecha || historyData.requestedDate}
                    </div>
                  </div>

                  {/* 3. Dólar Paralelo Histórico */}
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-950/30 via-gray-900 to-gray-950 border border-amber-500/30 shadow-xl">
                    <div className="flex items-center justify-between text-xs text-amber-300 font-medium mb-1">
                      <span className="flex items-center space-x-1.5">
                        <span>📊</span>
                        <span className="font-bold text-white">Dólar Paralelo / Libre</span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                        MERCADO
                      </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono my-2">
                      {historyData.paralelo?.usd?.promedio
                        ? historyData.paralelo.usd.promedio.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : '---'} <span className="text-xs text-gray-400">Bs.</span>
                    </div>
                    <div className="text-[11px] text-cyan-400 pt-2 border-t border-amber-500/10 flex items-center justify-between">
                      <span>Brecha vs BCV:</span>
                      <span className="font-bold font-mono">+{historyData.spreads.paraleloUsdVsBcvPct.toFixed(2)}%</span>
                    </div>
                  </div>

                </div>

                {/* ── CALCULADORA HISTÓRICA ── */}
                <section className="p-5 sm:p-6 rounded-3xl bg-gray-900/90 border border-gray-800 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <Calculator className="w-5 h-5 text-emerald-400" />
                      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
                        Calculadora con Tasas de la Fecha ({historyData.requestedDate})
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => setHistoryCalcMode(historyCalcMode === 'USD_TO_VES' ? 'VES_TO_USD' : 'USD_TO_VES')}
                      className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs text-gray-200 hover:text-white font-bold flex items-center space-x-2 transition"
                    >
                      <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                      <span>
                        {historyCalcMode === 'USD_TO_VES' ? 'Dólares (USD) ➔ Bolívares' : 'Bolívares ➔ Dólares (USD)'}
                      </span>
                    </button>
                  </div>

                  {/* Input Form */}
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={historyCalcAmount}
                        onChange={(e) => setHistoryCalcAmount(e.target.value)}
                        placeholder="Ingrese monto para calcular en esa fecha..."
                        className="w-full bg-gray-950 border border-gray-800 focus:border-emerald-500 rounded-2xl px-4 py-3.5 text-base sm:text-lg font-mono text-white placeholder-gray-600 focus:outline-none transition shadow-inner"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                        {historyCalcMode === 'USD_TO_VES' ? 'USD' : 'VES (Bs.)'}
                      </span>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center space-x-2 overflow-x-auto pb-1 custom-scrollbar">
                      <span className="text-[11px] text-gray-500 font-medium shrink-0">Montos rápidos:</span>
                      {(historyCalcMode === 'USD_TO_VES' ? ['10', '50', '100', '250', '500', '1000'] : ['1000', '5000', '10000', '25000', '50000']).map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setHistoryCalcAmount(amt)}
                          className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs font-mono text-gray-300 hover:text-white transition shrink-0"
                        >
                          {historyCalcMode === 'USD_TO_VES' ? `$${amt}` : `${parseInt(amt).toLocaleString()} Bs.`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Results Comparison Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
                    
                    {/* Dólar BCV Oficial */}
                    <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30">
                      <div className="flex items-center justify-between text-xs text-blue-300 font-medium">
                        <span>💵 Dólar Oficial BCV</span>
                        <span className="text-[10px] font-mono">{histUsdOficialRate.toFixed(2)} Bs.</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-white font-mono my-2">
                        {historyCalcMode === 'USD_TO_VES'
                          ? `${historyCalcResults.bcvUsdResult.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`
                          : `${historyCalcResults.bcvUsdResult.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                        }
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {historyCalcMode === 'USD_TO_VES' ? 'Monto oficial en Bolívares' : 'Dólares oficiales'}
                      </div>
                    </div>

                    {/* Dólar Paralelo / Libre */}
                    <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30">
                      <div className="flex items-center justify-between text-xs text-amber-300 font-medium">
                        <span>📊 Dólar Paralelo</span>
                        <span className="text-[10px] font-mono">{histUsdParaleloRate.toFixed(2)} Bs.</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-white font-mono my-2">
                        {historyCalcMode === 'USD_TO_VES'
                          ? `${historyCalcResults.paraleloUsdResult.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`
                          : `${historyCalcResults.paraleloUsdResult.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                        }
                      </div>
                      <div className="text-[11px] text-cyan-400">
                        Diferencia: {historyCalcMode === 'USD_TO_VES' ? `+${historyCalcResults.diffParaleloVsBcv.toLocaleString('es-VE', { maximumFractionDigits: 2 })} Bs.` : `-${historyCalcResults.diffParaleloVsBcv.toFixed(2)} USD`}
                      </div>
                    </div>

                    {/* Euro BCV Oficial */}
                    <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30">
                      <div className="flex items-center justify-between text-xs text-indigo-300 font-medium">
                        <span>💶 Euro Oficial BCV</span>
                        <span className="text-[10px] font-mono">{histEurOficialRate.toFixed(2)} Bs.</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-white font-mono my-2">
                        {historyCalcMode === 'USD_TO_VES'
                          ? `${historyCalcResults.bcvEurResult.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`
                          : `${historyCalcResults.bcvEurResult.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`
                        }
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {historyCalcMode === 'USD_TO_VES' ? 'Monto oficial en Bolívares' : 'Euros oficiales'}
                      </div>
                    </div>

                  </div>
                </section>

              </div>
            )}

          </div>
        )}

      </main>

      {/* ── Footer ── */}
      <footer className="w-full border-t border-gray-800/80 bg-gray-950/80 px-4 py-5 text-center text-xs text-gray-500 space-y-1.5">
        <p>
          Tasas oficiales del Banco Central de Venezuela (BCV), libro de órdenes en vivo de Binance P2P e histórico diario de mercado.
        </p>
        <p className="text-[11px] text-gray-600">
          Desarrollado para consulta rápida y transparente de precios de mercado en Venezuela.
        </p>
      </footer>

    </div>
  );
}

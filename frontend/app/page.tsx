"use client";

import React, { useState, useEffect } from "react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  RefreshCw, 
  Info, 
  Calendar, 
  ShieldAlert 
} from "lucide-react";
import styles from "./page.module.css";

// Interface for backend response
interface SilverDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SilverResponse {
  symbol: string;
  name: string;
  timeframe: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  isUp: boolean;
  lastUpdated: string;
  history: SilverDataPoint[];
}

export default function Home() {
  const [timeframe, setTimeframe] = useState<string>("1m");
  const [data, setData] = useState<SilverResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSilverPrice = async (tf: string, force = false) => {
    if (!force) setLoading(true);
    setError(null);
    
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiBase}/api/silver-price?timeframe=${tf}`);
      
      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }
      
      const payload: SilverResponse = await response.json();
      setData(payload);
    } catch (err: any) {
      console.error("Error fetching silver price:", err);
      setError(
        err.message || "Failed to connect to the silver price API. Ensure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSilverPrice(timeframe);
    
    // Auto-refresh data every 60 seconds
    const interval = setInterval(() => {
      fetchSilverPrice(timeframe, true);
    }, 60000);
    
    return () => clearInterval(interval);
  }, [timeframe]);

  const formatXAxis = (tickItem: string) => {
    try {
      const date = new Date(tickItem);
      if (isNaN(date.getTime())) return tickItem;
      
      if (timeframe === "1d") {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      if (timeframe === "1w") {
        return date.toLocaleDateString([], { weekday: "short", hour: "2-digit" });
      }
      if (timeframe === "1m" || timeframe === "6m") {
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
      }
      if (timeframe === "1y") {
        return date.toLocaleDateString([], { month: "short", year: "2-digit" });
      }
      return date.toLocaleDateString([], { month: "short", year: "numeric" });
    } catch (e) {
      return tickItem;
    }
  };

  const formatTooltipDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      return date.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: timeframe === "1d" || timeframe === "1w" ? "2-digit" : undefined,
        minute: timeframe === "1d" || timeframe === "1w" ? "2-digit" : undefined,
      });
    } catch (e) {
      return dateStr;
    }
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(2)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
    return vol.toString();
  };

  // Custom tool tip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as SilverDataPoint;
      return (
        <div className={styles.customTooltip}>
          <div className={styles.tooltipDate}>{formatTooltipDate(data.date)}</div>
          <div className={styles.tooltipPrice}>
            Price: <span style={{ color: "#ffffff" }}>${data.close.toFixed(3)}</span>
          </div>
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipLabel}>Open:</span>
            <span className={styles.tooltipValue}>${data.open.toFixed(3)}</span>
          </div>
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipLabel}>High:</span>
            <span className={styles.tooltipValue}>${data.high.toFixed(3)}</span>
          </div>
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipLabel}>Low:</span>
            <span className={styles.tooltipValue}>${data.low.toFixed(3)}</span>
          </div>
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipLabel}>Volume:</span>
            <span className={styles.tooltipValue}>{formatVolume(data.volume)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Extract recent history in descending order
  const getRecentHistory = () => {
    if (!data || !data.history) return [];
    return [...data.history].reverse().slice(0, 6);
  };

  // Calculate contract value (Comex Silver is 5000 ounces)
  const calculateContractValue = () => {
    if (!data) return 0;
    return data.currentPrice * 5000;
  };

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <Coins size={32} color="#cbd5e1" className="animate-pulse-slow" />
          <h1 className={styles.logoText}>SILVERPRICE.AI</h1>
        </div>
        <div className={styles.statusIndicator}>
          <span className={styles.pulseDot}></span>
          <span>{loading ? "Syncing..." : "Synced with Market"}</span>
          <button 
            onClick={() => fetchSilverPrice(timeframe)} 
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex", marginLeft: "0.25rem" }}
            title="Refresh Data"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {error ? (
        <div className={`${styles.errorState} glass-panel`}>
          <ShieldAlert size={48} color="var(--color-down)" />
          <h2 className={styles.errorTitle}>Connection Failed</h2>
          <p className={styles.errorText}>{error}</p>
          <button 
            className={styles.retryBtn} 
            onClick={() => fetchSilverPrice(timeframe)}
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <>
          {/* KPIs Grid */}
          <div className={styles.grid}>
            {/* KPI 1: Current Price */}
            <div className={`${styles.kpiCard} glass-panel`}>
              <div className={styles.kpiLabel}>Silver Spot Price (Oz)</div>
              {loading && !data ? (
                <div className={`${styles.shimmerEffect} ${styles.kpiShimmer}`}></div>
              ) : (
                <>
                  <div className={styles.kpiValue}>
                    ${data?.currentPrice.toFixed(3)}
                  </div>
                  <div className={`${styles.kpiChange} ${data?.isUp ? styles.up : styles.down}`}>
                    {data?.isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    <span>
                      {data?.isUp ? "+" : ""}
                      {data?.change.toFixed(3)} ({data?.isUp ? "+" : ""}
                      {data?.changePercent.toFixed(2)}%)
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* KPI 2: Period High */}
            <div className={`${styles.kpiCard} glass-panel`}>
              <div className={styles.kpiLabel}>Period High</div>
              {loading && !data ? (
                <div className={`${styles.shimmerEffect} ${styles.kpiShimmer}`}></div>
              ) : (
                <>
                  <div className={styles.kpiValue}>
                    ${data?.high.toFixed(3)}
                  </div>
                  <div className={styles.kpiChange} style={{ color: "var(--foreground-muted)" }}>
                    <ArrowUpRight size={16} />
                    <span>Peak valuation in range</span>
                  </div>
                </>
              )}
            </div>

            {/* KPI 3: Period Low */}
            <div className={`${styles.kpiCard} glass-panel`}>
              <div className={styles.kpiLabel}>Period Low</div>
              {loading && !data ? (
                <div className={`${styles.shimmerEffect} ${styles.kpiShimmer}`}></div>
              ) : (
                <>
                  <div className={styles.kpiValue}>
                    ${data?.low.toFixed(3)}
                  </div>
                  <div className={styles.kpiChange} style={{ color: "var(--foreground-muted)" }}>
                    <ArrowDownRight size={16} />
                    <span>Floor valuation in range</span>
                  </div>
                </>
              )}
            </div>

            {/* KPI 4: Contract Value */}
            <div className={`${styles.kpiCard} glass-panel`}>
              <div className={styles.kpiLabel}>Standard Contract Size (5k Oz)</div>
              {loading && !data ? (
                <div className={`${styles.shimmerEffect} ${styles.kpiShimmer}`}></div>
              ) : (
                <>
                  <div className={styles.kpiValue}>
                    ${calculateContractValue().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className={styles.kpiChange} style={{ color: "var(--foreground-muted)" }}>
                    <DollarSign size={16} />
                    <span>COMEX Futures Standard Contract</span>
                  </div>
                </>
              )}
            </div>

            {/* Chart Area */}
            <div className={`${styles.chartContainer} glass-panel`}>
              <div className={styles.chartHeader}>
                <div className={styles.chartTitleContainer}>
                  <h2 className={styles.chartTitle}>Silver Futures Chart (SI=F)</h2>
                  <p className={styles.chartSubtitle}>
                    {data ? `${data.name} price tracking over timeframe` : "Loading market trends..."}
                  </p>
                </div>
                
                {/* Timeframe selector */}
                <div className={styles.timeframeTabs}>
                  {[
                    { id: "1d", label: "1D" },
                    { id: "1w", label: "1W" },
                    { id: "1m", label: "1M" },
                    { id: "6m", label: "6M" },
                    { id: "1y", label: "1Y" },
                    { id: "5y", label: "5Y" },
                    { id: "all", label: "MAX" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      className={`${styles.timeframeBtn} ${
                        timeframe === tab.id ? styles.active : ""
                      }`}
                      onClick={() => setTimeframe(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {loading && !data ? (
                <div className={`${styles.shimmerEffect} ${styles.chartShimmer}`}></div>
              ) : (
                <div className={styles.chartWrapper}>
                  {data && data.history && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart 
                        data={data.history}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop 
                              offset="5%" 
                              stopColor={data.isUp ? "var(--color-up)" : "var(--color-down)"} 
                              stopOpacity={0.2}
                            />
                            <stop 
                              offset="95%" 
                              stopColor={data.isUp ? "var(--color-up)" : "var(--color-down)"} 
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid 
                          strokeDasharray="3 3" 
                          vertical={false} 
                          stroke="rgba(255,255,255,0.04)"
                        />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatXAxis}
                          stroke="rgba(255,255,255,0.3)"
                          fontSize={11}
                          tickLine={false}
                          dy={10}
                        />
                        <YAxis 
                          domain={["auto", "auto"]}
                          tickFormatter={(v) => `$${v.toFixed(1)}`}
                          stroke="rgba(255,255,255,0.3)"
                          fontSize={11}
                          tickLine={false}
                          dx={-5}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey="close" 
                          stroke={data.isUp ? "var(--color-up)" : "var(--color-down)"} 
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorPrice)"
                          activeDot={{ r: 6, strokeWidth: 0, fill: data.isUp ? "var(--color-up)" : "var(--color-down)" }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Details & Specs Section */}
          <div className={styles.detailsGrid}>
            {/* Specs Card */}
            <div className={`${styles.detailsCard} glass-panel`}>
              <h3 className={styles.sectionTitle}>Market Contract Specifications</h3>
              <table className={styles.specsTable}>
                <tbody>
                  <tr className={styles.specsRow}>
                    <th className={styles.specsLabel}>Ticker Symbol</th>
                    <td className={styles.specsValue}>{data?.symbol || "SI=F"}</td>
                  </tr>
                  <tr className={styles.specsRow}>
                    <th className={styles.specsLabel}>Exchange Trade</th>
                    <td className={styles.specsValue}>COMEX (Chicago Mercantile)</td>
                  </tr>
                  <tr className={styles.specsRow}>
                    <th className={styles.specsLabel}>Contract Premium Size</th>
                    <td className={styles.specsValue}>5,000 troy ounces</td>
                  </tr>
                  <tr className={styles.specsRow}>
                    <th className={styles.specsLabel}>Price Quotation</th>
                    <td className={styles.specsValue}>U.S. Dollars & Cents per ounce</td>
                  </tr>
                  <tr className={styles.specsRow}>
                    <th className={styles.specsLabel}>Data Source</th>
                    <td className={styles.specsValue}>Yahoo Finance (Real-Time Delayed)</td>
                  </tr>
                  <tr className={styles.specsRow}>
                    <th className={styles.specsLabel}>Metadata Updated</th>
                    <td className={styles.specsValue}>
                      {data ? new Date(data.lastUpdated).toLocaleTimeString() : "Pending"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Recent Prices Card */}
            <div className={`${styles.detailsCard} glass-panel`}>
              <h3 className={styles.sectionTitle}>Historical Feed (Latest)</h3>
              <div className={styles.recentTableWrapper}>
                <table className={styles.recentTable}>
                  <thead>
                    <tr>
                      <th className={styles.recentTh}>Date</th>
                      <th className={styles.recentTh} style={{ textAlign: "right" }}>Close</th>
                      <th className={styles.recentTh} style={{ textAlign: "right" }}>Chg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getRecentHistory().map((row, idx, arr) => {
                      // Calculate difference with open of the same row
                      const rowDiff = row.close - row.open;
                      const rowIsUp = rowDiff >= 0;
                      
                      let displayDate = "";
                      try {
                        const dateObj = new Date(row.date);
                        if (timeframe === "1d" || timeframe === "1w") {
                          displayDate = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                        } else {
                          displayDate = dateObj.toLocaleDateString([], { month: "short", day: "numeric" });
                        }
                      } catch {
                        displayDate = row.date;
                      }

                      return (
                        <tr key={idx} className={styles.recentTr}>
                          <td className={styles.recentTd}>{displayDate}</td>
                          <td className={styles.recentTd} style={{ textAlign: "right", fontWeight: 600 }}>
                            ${row.close.toFixed(3)}
                          </td>
                          <td 
                            className={styles.recentTd} 
                            style={{ 
                              textAlign: "right", 
                              fontWeight: 600,
                              color: rowIsUp ? "var(--color-up)" : "var(--color-down)" 
                            }}
                          >
                            {rowIsUp ? "+" : ""}
                            {rowDiff.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

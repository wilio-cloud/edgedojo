import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CryptoSymbol,
  HistoricalAssetCandles,
  SWING_UNIVERSE,
  runHistoricalSwingBacktest,
} from '../src/engine/cryptoSwingStrategy';
import { Candle } from '../src/engine/types';
import { BinanceInterval, fetchBinanceKlines } from '../src/services/liveCryptoFeed';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_PATH = path.resolve(__dirname, '../src/data/swingBacktestReport.json');
const CACHE_PATH = path.resolve(__dirname, '../.scanner_state/backtest_klines_cache.json');

async function fetchPaginatedKlines(params: {
  symbol: CryptoSymbol;
  interval: BinanceInterval;
  totalBarsTarget: number;
  endTimeMs: number;
}): Promise<Candle[]> {
  const { symbol, interval, totalBarsTarget, endTimeMs } = params;
  const chunks: Candle[][] = [];
  let cursorEndMs = endTimeMs;
  let collected = 0;

  while (collected < totalBarsTarget) {
    const batchSize = Math.min(1000, totalBarsTarget - collected);
    const batch = await fetchBinanceKlines({
      symbol,
      interval,
      limit: batchSize,
      endTimeMs: cursorEndMs,
    });

    if (batch.length === 0) break;
    chunks.unshift(batch);
    collected += batch.length;

    const earliestTimeMs = batch[0].time * 1000;
    cursorEndMs = earliestTimeMs - 1;
    if (batch.length < batchSize) break;
  }

  // Flatten and deduplicate strictly by ascending timestamp
  const byTime = new Map<number, Candle>();
  for (const chunk of chunks) {
    for (const c of chunk) {
      byTime.set(c.time, c);
    }
  }
  return Array.from(byTime.values()).sort((a, b) => a.time - b.time);
}

async function main() {
  const days = Number(process.env.BACKTEST_DAYS ?? '365');
  const bars1h = days * 24 + 160; // Warm-up buffer included
  const bars4h = Math.ceil(bars1h / 4) + 80;
  const bars1d = days + 75;
  const endTimeMs = Date.now();

  console.log(
    `📊 Descarregant ~${days} dies d'històric real de Binance Vision (1D / 4H / 1H) per a BTC, ETH, SOL i AVAX...`
  );

  const datasets: HistoricalAssetCandles[] = [];
  let loadedFromCache = false;

  if (!process.argv.includes('--refresh')) {
    try {
      const stat = await fs.stat(CACHE_PATH);
      if (Date.now() - stat.mtimeMs < 6 * 3600 * 1000) {
        const cached = JSON.parse(
          await fs.readFile(CACHE_PATH, 'utf-8')
        ) as HistoricalAssetCandles[];
        if (Array.isArray(cached) && cached.length === SWING_UNIVERSE.length) {
          datasets.push(...cached);
          loadedFromCache = true;
          console.log('⚡ Usant cau local recent (.scanner_state/backtest_klines_cache.json)');
        }
      }
    } catch {
      // Cache miss, proceed to fetch
    }
  }

  if (!loadedFromCache) {
    for (const spec of SWING_UNIVERSE) {
      process.stdout.write(`  → ${spec.displaySymbol}... `);
      const [candles1d, candles4h, candles1h] = await Promise.all([
        fetchPaginatedKlines({
          symbol: spec.symbol,
          interval: '1d',
          totalBarsTarget: bars1d,
          endTimeMs,
        }),
        fetchPaginatedKlines({
          symbol: spec.symbol,
          interval: '4h',
          totalBarsTarget: bars4h,
          endTimeMs,
        }),
        fetchPaginatedKlines({
          symbol: spec.symbol,
          interval: '1h',
          totalBarsTarget: bars1h,
          endTimeMs,
        }),
      ]);
      console.log(
        `OK (${candles1d.length} x 1D, ${candles4h.length} x 4H, ${candles1h.length} x 1H)`
      );
      datasets.push({
        spec,
        candles1d,
        candles4h,
        candles1h,
      });
    }
    await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
    await fs.writeFile(CACHE_PATH, JSON.stringify(datasets), 'utf-8');
  }

  console.log('\n⚙️ Executant simulació Walk-Forward (Zero Look-Ahead + SL-First + 0,10% fees)...');
  const t0 = Date.now();
  const report = runHistoricalSwingBacktest(datasets);
  const elapsedMs = Date.now() - t0;

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf-8');

  console.log(`\n✅ Backtest completat en ${(elapsedMs / 1000).toFixed(2)}s!`);
  console.log(
    `📅 Període: ${report.periodStartIso} → ${report.periodEndIso} (${report.daysCovered} dies)`
  );
  console.log(`🔔 Senyals generats: ${report.totalSignalsGenerated} (Limits expirats sense tocar: ${report.limitUnfilledExpired})`);
  console.log(`🎯 Operacions executades: ${report.totalFilledTrades}`);
  console.log(`🏆 Winrate Net (> 0R): ${report.winRatePct}% | Taxa d'encert TP1 (+1.5R): ${report.tp1HitRatePct}%`);
  console.log(`📈 Esperança Matemàtica: ${report.expectancyR >= 0 ? '+' : ''}${report.expectancyR}R / trade`);
  console.log(`⚖️ Profit Factor: ${report.profitFactor} | Guany Acumulat: ${report.netTotalR >= 0 ? '+' : ''}${report.netTotalR}R | Max Drawdown: -${report.maxDrawdownR}R`);
  console.log('\nDesglossament per actiu:');
  for (const a of report.byAsset) {
    console.log(
      `  • ${a.symbol.padEnd(9)} | Trades: ${String(a.trades).padStart(3)} | WR: ${String(a.winRatePct).padStart(5)}% | E[R]: ${(a.expectancyR >= 0 ? '+' : '') + a.expectancyR}R | PF: ${a.profitFactor} | Net: ${(a.netTotalR >= 0 ? '+' : '') + a.netTotalR}R | MaxDD: -${a.maxDrawdownR}R`
    );
  }

  // Diagnostic breakdown by archetype & execution type
  const allRecent = report.recentTrades;
  console.log(`\n📄 Guardat informe auditat a: ${OUTPUT_PATH} (mostra recent: ${allRecent.length} trades)`);
}

main().catch((err) => {
  console.error('❌ Error executant backtest:', err);
  process.exit(1);
});

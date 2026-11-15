import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CryptoSwingScanResult,
  MarketLeaderContext,
} from '../src/engine/cryptoSwingStrategy';
import { calculateCryptoSwingSizing } from '../src/engine/riskMasterEngine';
import { scanAllSwingAssetsLive } from '../src/services/liveCryptoFeed';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_DIR = path.resolve(__dirname, '../.scanner_state');
const STATE_FILE = path.resolve(STATE_DIR, 'sent_alerts.json');
const APP_LIVE_URL = 'https://wilio-cloud.github.io/edgedojo/';

interface ScannerAlertState {
  updatedAtIso: string;
  setups: Record<string, number>;
  preAlerts: Record<string, number>;
}

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbed {
  title: string;
  url?: string;
  description: string;
  color: number;
  fields: DiscordEmbedField[];
  footer: { text: string };
  timestamp: string;
}

async function loadAlertState(): Promise<ScannerAlertState> {
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ScannerAlertState>;
    return {
      updatedAtIso: parsed.updatedAtIso ?? new Date().toISOString(),
      setups: parsed.setups ?? {},
      preAlerts: parsed.preAlerts ?? {},
    };
  } catch {
    return {
      updatedAtIso: new Date().toISOString(),
      setups: {},
      preAlerts: {},
    };
  }
}

async function saveAlertState(state: ScannerAlertState, nowMs: number): Promise<void> {
  const maxAgeMs = 7 * 24 * 3600 * 1000;
  const prunedSetups: Record<string, number> = {};
  const prunedPreAlerts: Record<string, number> = {};

  for (const [k, ts] of Object.entries(state.setups)) {
    if (nowMs - ts <= maxAgeMs) prunedSetups[k] = ts;
  }
  for (const [k, ts] of Object.entries(state.preAlerts)) {
    if (nowMs - ts <= maxAgeMs) prunedPreAlerts[k] = ts;
  }

  await fs.mkdir(STATE_DIR, { recursive: true });
  await fs.writeFile(
    STATE_FILE,
    JSON.stringify(
      {
        updatedAtIso: new Date(nowMs).toISOString(),
        setups: prunedSetups,
        preAlerts: prunedPreAlerts,
      },
      null,
      2
    ) + '\n',
    'utf-8'
  );
}

function formatFundingLabel(rate: number | null): string {
  if (rate === null) return 'N/D';
  const pct = (rate * 100).toFixed(3);
  return `${rate >= 0 ? '+' : ''}${pct}% / 8h`;
}

export function buildSetupDiscordEmbed(params: {
  result: CryptoSwingScanResult;
  leaderContext: MarketLeaderContext;
  capitalUsdt: number;
  riskPct: number;
  concurrentCount: number;
}): DiscordEmbed {
  const { result, leaderContext, capitalUsdt, riskPct, concurrentCount } = params;
  const s = result.setup!;
  const isLong = s.side === 'LONG';

  const sizing = calculateCryptoSwingSizing({
    capitalUsdt,
    riskPct,
    entryPrice: s.entry,
    stopLossPrice: s.stopLoss,
    takeProfitPrice: s.tp2,
  });

  const execBadge =
    s.executionType === 'MARKET'
      ? `⚡ **A MERCAT** (Tancament vela 1H confirmada)`
      : `🎯 **ORDRE LÍMIT** en retrocés a **${s.entry} USDT** *(caduca en ${s.limitValidHours}h si no toca)*`;

  const corrNote =
    concurrentCount >= 2
      ? `\n⚠️ **Control de Correlació (Mòdul 6):** S'han activat ${concurrentCount} setups alhora. No obris més de **2 posicions simultànies** en la mateixa direcció.`
      : '';

  return {
    title: `${isLong ? '🟢' : '🔴'} SETUP ${s.grade} ${s.side} · ${result.spec.displaySymbol} (Score ${s.qualityScore}/100)`,
    url: APP_LIVE_URL,
    description:
      `**Patró:** ${s.archetypeLabelCa}\n` +
      `**Marea BTC:** ${leaderContext.summaryCa}${corrNote}\n` +
      `🔗 [Obrir Gràfic Interactiu al Radar d'EdgeDojo](${APP_LIVE_URL})`,
    color: isLong ? 0x10b981 : 0xf43f5e,
    fields: [
      {
        name: '⚡ Tipus d’Execució',
        value: execBadge,
        inline: false,
      },
      {
        name: '🏦 Mercat & Funding (8h)',
        value: `**${s.venueLabelCa}** · Funding: \`${formatFundingLabel(result.fundingRate8h)}\`\n*${s.venueRationaleCa}*`,
        inline: false,
      },
      {
        name: '📍 Entrada',
        value: `\`${s.entry} USDT\``,
        inline: true,
      },
      {
        name: '🛑 Stop Loss Estructural',
        value: `\`${s.stopLoss} USDT\` (\`-${s.slDistancePct}%\`)`,
        inline: true,
      },
      {
        name: '⚖️ Ràtio Net a TP2',
        value: `\`+${s.netRR}R\` *(després de comissions)*`,
        inline: true,
      },
      {
        name: '💰 TP1 (Parcial 50% + BE)',
        value: `\`${s.tp1} USDT\` (**+${s.tp1RR}R**)\n*Tanca 50% i mou SL a ${s.entry} USDT*`,
        inline: true,
      },
      {
        name: '🚀 TP2 (Runner 50% Final)',
        value: `\`${s.tp2} USDT\` (**+${s.netRR}R net**)\n*Piscina estructural 4H oposada*`,
        inline: true,
      },
      {
        name: `📐 Mida Exacta (${riskPct}% de ${capitalUsdt} USDT)`,
        value:
          `• Posició òptima (Perps <= 2x): **\`${Math.round(sizing.positionSizeUsdt)} USDT\`** (\`${sizing.coinUnits} ${result.spec.shortName}\`) → Risc 1R: \`-${sizing.maxRiskUsdt} USDT\` | TP2: \`+${Math.round(sizing.netProfitAtTpUsdt)} USDT\`\n` +
          (s.side === 'SHORT'
            ? `• Mode **Spot pur**: ometre senyal (mantenir caixa en \`USDT\`) o executar en Perps Aïllat \`2x\`.`
            : sizing.positionSizeUsdt > capitalUsdt
              ? `• Mode **Spot pur (màx 1x = ${capitalUsdt} USDT)**: entra amb \`${capitalUsdt} USDT\` → risc real natural \`-${Math.round(capitalUsdt * (s.slDistancePct / 100) * 100) / 100} USDT (${s.slDistancePct}%)\` i zero liquidació.`
              : `• Mode **Spot pur**: entra directament amb \`${Math.round(sizing.positionSizeUsdt)} USDT\` en Spot (sobra caixa lliure).`),
        inline: false,
      },
      {
        name: '🧠 Confluències Institucionals',
        value: s.rationaleBulletsCa.map((b) => `• ${b}`).join('\n'),
        inline: false,
      },
    ],
    footer: {
      text: 'EdgeDojo Quant Copilot · Senyal educatiu sobre espelma 1H tancada (Zero Repainting)',
    },
    timestamp: new Date().toISOString(),
  };
}

export function buildPreAlertDiscordEmbed(params: {
  result: CryptoSwingScanResult;
  leaderContext: MarketLeaderContext;
}): DiscordEmbed {
  const { result, leaderContext } = params;
  const p = result.preAlert!;

  return {
    title: `🟡 PRE-ALERTA 4H · ${p.headlineCa} (Biaix ${p.bias})`,
    url: APP_LIVE_URL,
    description:
      `El preu actual (**\`${result.currentPrice} USDT\`**) ha entrat a la zona d'interès de \`4H\`, però **encara falta la vela de confirmació en \`1H\`**.\n` +
      `🔗 [Seguir l'estructura en viu a EdgeDojo](${APP_LIVE_URL})`,
    color: 0xf59e0b,
    fields: [
      {
        name: '🎯 Zona Estructural 4H',
        value: `\`${p.targetZoneLow} – ${p.targetZoneHigh} USDT\` (Posició rang 4H: \`${result.pricePositionPct}%\`)`,
        inline: true,
      },
      {
        name: '📊 Funding Rate 8h',
        value: `\`${formatFundingLabel(result.fundingRate8h)}\``,
        inline: true,
      },
      {
        name: '🧭 Instrucció del Gatell 1H',
        value: p.triggerInstructionCa,
        inline: false,
      },
      {
        name: '🌊 Context Líder BTC',
        value: leaderContext.summaryCa,
        inline: false,
      },
    ],
    footer: {
      text: 'EdgeDojo Pre-Alerta · Prepara el nivell sense anticipar l’entrada',
    },
    timestamp: new Date().toISOString(),
  };
}

export function buildTestPingDiscordEmbed(params: {
  results: CryptoSwingScanResult[];
  leaderContext: MarketLeaderContext;
  capitalUsdt: number;
  riskPct: number;
}): DiscordEmbed {
  const { results, leaderContext, capitalUsdt, riskPct } = params;

  const statusLines = results.map((r) => {
    const icon =
      r.status === 'SETUP_ACTIVE'
        ? r.setup?.side === 'LONG'
          ? '🟢 SETUP LONG'
          : '🔴 SETUP SHORT'
        : r.status === 'PRE_ALERT'
          ? '🟡 PRE-ALERTA 4H'
          : '⚪ EN ESPERA';
    return `• **${r.spec.shortName}** (\`${r.currentPrice} USDT\`) — ${icon} · Rang 4H: \`${r.pricePositionPct}%\` · Funding: \`${formatFundingLabel(r.fundingRate8h)}\``;
  });

  return {
    title: '📡 Connexió Verificada · Escàner EdgeDojo Crypto Swing 24/7 Actiu!',
    url: APP_LIVE_URL,
    description:
      `El teu canal privat de Discord està connectat correctament amb l'escàner horari d'**EdgeDojo**.\n\n` +
      `**Marea Actual BTC:** ${leaderContext.summaryCa}\n` +
      `**Paràmetres de Risc Configurats:** Capital \`${capitalUsdt} USDT\` · Risc \`1R = ${riskPct}% (${((capitalUsdt * riskPct) / 100).toFixed(0)} USDT)\``,
    color: 0x06b6d4,
    fields: [
      {
        name: '📊 Estat en Temps Real (BTC · ETH)',
        value: statusLines.join('\n'),
        inline: false,
      },
      {
        name: '⏰ Freqüència d’Escaneig',
        value:
          'Automàtic cada hora (minut `:02` post-tancament d’espelma `1H`). Només rebràs avís quan es formi una **Pre-Alerta 4H** nova o es confirmi un **Setup A+ (`R:R >= 2.0R` net)**.',
        inline: false,
      },
    ],
    footer: {
      text: 'EdgeDojo Quant Copilot · Test de connexió completat',
    },
    timestamp: new Date().toISOString(),
  };
}

async function postDiscordEmbeds(webhookUrl: string, embeds: DiscordEmbed[]): Promise<void> {
  // Discord allows up to 10 embeds per message
  for (let i = 0; i < embeds.length; i += 10) {
    const chunk = embeds.slice(i, i + 10);
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'EdgeDojo Swing Radar',
        embeds: chunk,
      }),
    });
    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      throw new Error(`Discord Webhook HTTP ${res.status}: ${bodyText}`);
    }
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const isDryRun = args.has('--dry-run');
  const isTestPing =
    args.has('--test-ping') || process.env.SEND_TEST_PING === 'true';

  const webhookUrl = (process.env.DISCORD_WEBHOOK_URL ?? '').trim();
  const capitalUsdt = Number(process.env.ALERT_CAPITAL_USDT ?? '1000');
  const riskPct = Number(process.env.ALERT_RISK_PCT ?? '2.0');

  console.log('📡 Escanejant mercat Crypto Swing en viu (BTC i ETH)...');
  const snapshot = await scanAllSwingAssetsLive();
  const nowMs = snapshot.scannedAtMs;

  console.log(`🌊 ${snapshot.leaderContext.summaryCa}`);
  for (const r of snapshot.results) {
    const label =
      r.status === 'SETUP_ACTIVE'
        ? `SETUP ${r.setup!.grade} ${r.setup!.side} (${r.setup!.executionType} @ ${r.setup!.entry}$, SL ${r.setup!.stopLoss}$, TP2 ${r.setup!.tp2}$, +${r.setup!.netRR}R)`
        : r.status === 'PRE_ALERT'
          ? `PRE-ALERTA (${r.preAlert!.headlineCa})`
          : `NEUTRAL (Rang 4H: ${r.pricePositionPct}%)`;
    console.log(
      `  • ${r.spec.displaySymbol.padEnd(9)} | Preu: ${String(r.currentPrice).padStart(9)}$ | Funding: ${formatFundingLabel(r.fundingRate8h).padStart(13)} | ${label}`
    );
  }

  const state = await loadAlertState();
  const setupCooldownMs = 36 * 3600 * 1000;
  const preAlertCooldownMs = 18 * 3600 * 1000;

  const embedsToSend: DiscordEmbed[] = [];
  const activeSetupsCount = snapshot.results.filter(
    (r) => r.status === 'SETUP_ACTIVE'
  ).length;

  if (isTestPing) {
    embedsToSend.push(
      buildTestPingDiscordEmbed({
        results: snapshot.results,
        leaderContext: snapshot.leaderContext,
        capitalUsdt,
        riskPct,
      })
    );
  }

  for (const r of snapshot.results) {
    if (r.status === 'SETUP_ACTIVE' && r.setup) {
      const lastSent = state.setups[r.setup.setupId] ?? 0;
      if (nowMs - lastSent >= setupCooldownMs) {
        embedsToSend.push(
          buildSetupDiscordEmbed({
            result: r,
            leaderContext: snapshot.leaderContext,
            capitalUsdt,
            riskPct,
            concurrentCount: activeSetupsCount,
          })
        );
        state.setups[r.setup.setupId] = nowMs;
      } else {
        console.log(`  ⏭️ Setup duplicat omès (${r.setup.setupId})`);
      }
    } else if (r.status === 'PRE_ALERT' && r.preAlert) {
      const symbolKindKey = `${r.spec.symbol}_${r.preAlert.bias}_${r.preAlert.zoneKind}`;
      const lastSentExact = state.preAlerts[r.preAlert.watchId] ?? 0;
      const lastSentKind = state.preAlerts[symbolKindKey] ?? 0;
      if (
        nowMs - lastSentExact >= preAlertCooldownMs &&
        nowMs - lastSentKind >= 12 * 3600 * 1000
      ) {
        embedsToSend.push(
          buildPreAlertDiscordEmbed({
            result: r,
            leaderContext: snapshot.leaderContext,
          })
        );
        state.preAlerts[r.preAlert.watchId] = nowMs;
        state.preAlerts[symbolKindKey] = nowMs;
      } else {
        console.log(`  ⏭️ Pre-alerta recent omesa (${r.preAlert.watchId})`);
      }
    }
  }

  if (isDryRun) {
    console.log(
      `\n🧪 [DRY-RUN] S'haurien enviat ${embedsToSend.length} embeds a Discord.`
    );
    if (embedsToSend.length > 0) {
      console.log(JSON.stringify(embedsToSend, null, 2));
    }
    return;
  }

  if (embedsToSend.length === 0) {
    console.log('\n✅ Cap alerta nova per enviar en aquesta hora.');
    await saveAlertState(state, nowMs);
    return;
  }

  if (!webhookUrl) {
    if (isTestPing) {
      throw new Error(
        'Falta la variable DISCORD_WEBHOOK_URL! Configura el Secret DISCORD_WEBHOOK_URL a GitHub Actions o passa-la per entorn.'
      );
    }
    console.log(
      '\nℹ️ DISCORD_WEBHOOK_URL no configurada encara: s’omet l’enviament push (configura el Secret a GitHub per activar les alertes mòbils).'
    );
    return;
  }

  await postDiscordEmbeds(webhookUrl, embedsToSend);
  await saveAlertState(state, nowMs);
  console.log(`\n🚀 Enviades ${embedsToSend.length} notificacions a Discord amb èxit!`);
}

// Execute CLI only when invoked directly
const isDirectCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(__filename);
if (isDirectCli) {
  main().catch((err) => {
    console.error('❌ Error a run_swing_scanner:', err);
    process.exit(1);
  });
}

# EdgeDojo — Entrenador Tàctic de Price Action (Scalp & Swing)

PWA Mobile-First d'entrenament cognitiu i tàctic de **Price Action Modern + Liquidesa** (`HH/HL`, `BOS/CHoCH`, *Equal Highs/Lows*, *Liquidity Sweeps*, Zones d'Oferta/Demanda, Asimetria `R:R` i Multi-Timeframe).

## Característiques Principals

- **6 Mons Estructurats (30 Pantalles) + 6 Píndoles Tàctiques Visuals**:
  1. *L'Esquelet del Preu* (Estructura pura i volum)
  2. *Liquidesa i Trampes* (*Sweeps*, *Fakeouts* i zones fresques vs. gastades)
  3. *Execució Asimètrica* (Invalidesa estructural, `R:R >= 2` i botó `NO OPERAR`)
  4. *Arena SCALPING* (`1m`/`5m` sota rellotge + model realista d'spread i comissions)
  5. *Mestria SWING* (Alineació *Top-Down* `HTF ↔ LTF` i gestió de *pullbacks*)
  6. *Prova de Foc PRO* (Sessions *Blind Replay* estil prova de fondeig)
- **24 Sessions Històriques 100% Reals Anonimitzades**: Bitcoin, Ethereum, Solana, Nasdaq 100 (`NQ`), `EUR/USD` i Or (`XAU/USD`) sense *look-ahead bias* entre `HTF` i `LTF`, amb revelació de l'actiu real al final de la partida.
- **Gimnàs Tàctic Infinit**: Escalfament diari filtrable per `Scalp`, `Swing` o rotació mixta.
- **Passaport a Directe + Checklist Pre-Mercat**: Calcula la teva esperança matemàtica $\mathbb{E}[R]$, qualitat d'SL, filtre de trampes, corba d'equitat i inclou el protocol pre-trade de 6 punts per quan operis en viu.

## Ús Local i al Mòbil

```bash
# Iniciar servidor de desenvolupament amb accés per xarxa local (Wi-Fi)
npm run dev -- --host

# Executar bateria de tests matemàtics i d'integritat dels 30 nivells
npm run test

# Compilar versió de producció amb PWA offline
npm run build
```

Per instal·lar-la com a App nativa al mòbil:
1. Obre l'adreça `Network` al navegador del mòbil (Safari a iOS o Chrome a Android) o desplega la carpeta `dist/` a Cloudflare Pages / Vercel (`npx wrangler pages deploy dist`).
2. Prem **Compartir → Afegir a la pantalla d'inici** (iOS) o **Instal·lar aplicació** (Android) per obrir-la a pantalla completa sense barres del navegador i amb suport offline.

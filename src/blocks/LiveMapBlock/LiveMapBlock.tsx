/**
 * LiveMapBlock - Blocks / Application / Live Map
 *
 * A COMPOSITION EXAMPLE, not a configurable component. Copy this folder and edit it: swap `sample.ts` for your own
 * cities, point `onViewCity` at your own routes. Assembled from existing Sakani components, with the Map Globe at the
 * centre; read from the Figma "Live Map" component set (Device x State), 1120 wide on a desktop and 390 on a phone:
 *
 *   header         title + description, and the metric SegmentedControl (Revenue, Payments, Approval rate)
 *   region row     FilterChips (All regions, Americas, EMEA, APAC) and Reset view
 *   map area       the stage: MapGlobe (markers sized by the metric, ranked, a dashed ring for "watch"),
 *                  the "Right now" insight or the "Showing: <city>" chip, the legend, the zoom buttons, and a card on
 *                  the hovered or selected city; below it the playback row (Replay today, Pause, the volume by hour,
 *                  the UTC clock, Live)
 *   cities panel  Tabs (Top cities, Regions) + the ranked list; picking a city turns the panel into that city's detail
 *                  (figures, payment methods, View payments). On a phone the panel becomes a bottom sheet.
 *
 * States (the `state` prop): "default", "loading" (skeletons), "empty" (no payments yet today). Dark mode is the
 * `dark` class on any ancestor, as everywhere else.
 *
 * It is live: `now` left out, the clock ticks and the bars follow the hour; Pause freezes it, Replay today plays the
 * day back. The data is plain props (`cities`, `hourly`, `totals`): feed it from your own stream.
 */

import React from 'react';
import { IconArrowLeft } from '../../icons/outline/arrow-left';
import { IconCurrentLocation } from '../../icons/outline/current-location';
import { IconInfoCircle } from '../../icons/outline/info-circle';
import { IconMinus } from '../../icons/outline/minus';
import { IconPlayerPause } from '../../icons/outline/player-pause';
import { IconPlayerPlay } from '../../icons/outline/player-play';
import { IconPlus } from '../../icons/outline/plus';
import { IconRefresh } from '../../icons/outline/refresh';
import { IconSparkles } from '../../icons/outline/sparkles';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ChatOrb } from '../../components/ChatOrb';
import { FilterChip } from '../../components/FilterChip';
import { IconButton } from '../../components/IconButton';
import { SegmentedControl } from '../../components/SegmentedControl';
import { Tabs } from '../../components/Tabs';
import { MapControlButton } from '../../components/Map/MapControls';
import { MapGlobe, type MapGlobeArc, type MapGlobeMarker, type MapGlobeMarkerSize } from '../../components/Map/MapGlobe';
import type { LatLng } from '../../components/Map/geo';
import { LocationDot } from '../../components/MarketingComponents/LocationDot';
import { SAMPLE_CITIES, SAMPLE_HOURLY, SAMPLE_INSIGHT, SAMPLE_REGIONS, SAMPLE_TOTALS } from './sample';
import type { LiveMapCity, LiveMapInsight, LiveMapMetric, LiveMapRegion, LiveMapState, LiveMapTotals } from './types';
import styles from './LiveMapBlock.module.css';

export interface LiveMapBlockProps {
  /** The cities: dots on the globe and rows in the list. */
  cities?: LiveMapCity[];
  /** The region filters after "All regions". */
  regions?: LiveMapRegion[];
  /** Payment volume for each hour of today (24 numbers, UTC). Hours after the current one are not drawn. */
  hourly?: number[];
  /** Figures across every city, for the headline and "Top 5 of 40 cities". */
  totals?: LiveMapTotals;
  /** The "Right now" card (and the phone's pill). */
  insight?: LiveMapInsight;
  /** The id of the city the arcs settle to. Defaults to the first city named "Singapore", else the first city. */
  hubId?: string;
  /** "default", "loading" (skeletons) or "empty" (no payments yet today). */
  state?: LiveMapState;
  title?: string;
  /** The title on a phone, which has less room. */
  mobileTitle?: string;
  /** The line under the title on a desktop. */
  description?: string;
  /** The line under the title on a phone. */
  mobileDescription?: string;
  /** The selected city's id, or null for none (controlled). */
  selectedId?: string | null;
  /** The city selected first (uncontrolled). Picking it in the list or on the globe turns the globe to it. */
  defaultSelectedId?: string | null;
  onSelectedChange?: (id: string | null) => void;
  /** Pins the hover look (and the card) on one city without a pointer: documentation and visual tests. */
  hoveredId?: string;
  /** The metric shown first. */
  defaultMetric?: LiveMapMetric;
  /** The moment to show. Left out, the clock runs on real time and ticks. Given, it is frozen there. */
  now?: Date;
  /** Spin the globe slowly. Defaults to false, so the markers stay where the list says they are. */
  autoRotate?: boolean;
  /** Show the atmosphere glow around the globe. Defaults to true. */
  atmosphere?: boolean;
  /** "View <city> payments" in the city detail. */
  onViewCity?: (city: LiveMapCity) => void;
  /** "View all cities" under the list. */
  onViewAll?: () => void;
  className?: string;
}

/* ------------------------------------------------------------------ *
 * Metrics and formatting
 * ------------------------------------------------------------------ */
const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const int = new Intl.NumberFormat('en-US');
const pct1 = (n: number) => `${n.toFixed(1)}%`;
const vsForecast = (n: number) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${Math.abs(n)}% vs forecast`;
const pad2 = (n: number) => String(n).padStart(2, '0');
const utcClock = (d: Date) => `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())} UTC`;
const localTime = (d: Date, timeZone: string) => {
  try {
    return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(d);
  } catch {
    return utcClock(d).slice(0, 5);
  }
};

interface MetricSpec {
  id: LiveMapMetric;
  label: string;
  /** The phone's segmented control has less room. */
  short: string;
  value: (c: LiveMapCity) => number;
  format: (n: number) => string;
  /** The value the dot-size and bar scales start from (an approval rate never goes near 0). */
  floor: number;
}
const METRICS: MetricSpec[] = [
  { id: 'revenue', label: 'Revenue', short: 'Revenue', value: (c) => c.revenue, format: (n) => usd0.format(n), floor: 0 },
  { id: 'payments', label: 'Payments', short: 'Payments', value: (c) => c.payments, format: (n) => int.format(n), floor: 0 },
  { id: 'approval', label: 'Approval rate', short: 'Approval', value: (c) => c.approvalRate, format: pct1, floor: 90 },
];

/** Dot size: the top value is large, the middle medium, the rest small. */
const sizeFor = (t: number): MapGlobeMarkerSize => (t >= 0.7 ? 'lg' : t >= 0.4 ? 'md' : 'sm');

const DEFAULT_CENTER: LatLng = [16, 96];
const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

/* ------------------------------------------------------------------ *
 * Small hooks
 * ------------------------------------------------------------------ */
/** True when the block's own width is a phone's: the layout switches in CSS, the shorter labels here. */
function useCompact(ref: React.RefObject<HTMLElement | null>, breakpoint = 720) {
  const [compact, setCompact] = React.useState(false);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = (w: number) => setCompact(w < breakpoint);
    read(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => read(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, breakpoint]);
  return compact;
}

/** The clock: real time ticking each second, or frozen at `fixed`. */
function useNow(fixed: Date | undefined, paused: boolean) {
  const [now, setNow] = React.useState(() => fixed ?? new Date());
  React.useEffect(() => {
    if (fixed) { setNow(fixed); return; }
    if (paused) return;
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, [fixed, paused]);
  return now;
}

/* ------------------------------------------------------------------ *
 * Block
 * ------------------------------------------------------------------ */
export const LiveMapBlock: React.FC<LiveMapBlockProps> = ({
  cities = SAMPLE_CITIES,
  regions = SAMPLE_REGIONS,
  hourly = SAMPLE_HOURLY,
  totals = SAMPLE_TOTALS,
  insight = SAMPLE_INSIGHT,
  hubId,
  state = 'default',
  title = 'Where your payments are coming from',
  mobileTitle = 'Where payments come from',
  description = 'Bigger dots mean more revenue today. Pick a city to see what is driving it.',
  mobileDescription = 'Bigger dots mean more revenue. Tap a city for details.',
  selectedId: selectedIdProp,
  defaultSelectedId = null,
  onSelectedChange,
  hoveredId,
  defaultMetric = 'revenue',
  now: nowProp,
  autoRotate = false,
  atmosphere = true,
  onViewCity,
  onViewAll,
  className,
}) => {
  const root = React.useRef<HTMLDivElement>(null);
  const compact = useCompact(root);

  const [metricId, setMetricId] = React.useState<LiveMapMetric>(defaultMetric);
  const [selectedInternal, setSelectedInternal] = React.useState<string | null>(defaultSelectedId);
  const selectedId = selectedIdProp !== undefined ? selectedIdProp : selectedInternal;
  const [region, setRegion] = React.useState<string>(() => cities.find((c) => c.id === defaultSelectedId)?.region ?? 'all');
  const [tab, setTab] = React.useState<'cities' | 'regions'>('cities');
  const [hoverState, setHoverState] = React.useState<string | null>(null);
  const [focus, setFocus] = React.useState<LatLng | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [paused, setPaused] = React.useState(false);
  const [replayHour, setReplayHour] = React.useState<number | null>(null);
  const [legendOpen, setLegendOpen] = React.useState(false);

  const now = useNow(nowProp, paused);
  const hour = now.getUTCHours();
  const loading = state === 'loading';
  const empty = state === 'empty';
  const hoverId = hoveredId ?? hoverState;

  const metric = METRICS.find((m) => m.id === metricId) ?? METRICS[0];
  const ranked = React.useMemo(() => [...cities].sort((a, b) => metric.value(b) - metric.value(a)), [cities, metric]);
  const rankOf = (id: string) => ranked.findIndex((c) => c.id === id) + 1;
  const top = ranked.length ? metric.value(ranked[0]) : 0;
  const scale = (v: number) => (top - metric.floor > 0 ? (v - metric.floor) / (top - metric.floor) : 0);
  const inRegion = region === 'all' ? ranked : ranked.filter((c) => c.region === region);
  const regionLabel = (id: string) => regions.find((r) => r.id === id)?.label ?? id;
  const selected = cities.find((c) => c.id === selectedId) ?? null;
  const hub = cities.find((c) => c.id === hubId) ?? cities.find((c) => c.name === 'Singapore') ?? cities[0];

  /* ---- actions ---- */
  const select = (id: string | null, fromUser = true) => {
    if (selectedIdProp === undefined) setSelectedInternal(id);
    onSelectedChange?.(id);
    const city = cities.find((c) => c.id === id);
    if (city && fromUser) { setFocus(city.position); setRegion(city.region); }
    if (!city) setRegion('all');
  };
  const toggleCity = (id: string) => select(id === selectedId ? null : id);
  const chooseRegion = (id: string) => {
    setRegion(id);
    setTab('cities');
    setFocus(id === 'all' ? null : regions.find((r) => r.id === id)?.center ?? null);
    if (selected && id !== selected.region) select(null);
  };
  const reset = () => {
    setRegion('all'); setFocus(null); setZoom(1); setMetricId(defaultMetric); setTab('cities'); setLegendOpen(false);
    if (selectedId !== null) { if (selectedIdProp === undefined) setSelectedInternal(null); onSelectedChange?.(null); }
  };
  const recenter = () => { setFocus(null); setZoom(1); };

  /* ---- replay: the day plays back hour by hour, then live again ---- */
  React.useEffect(() => {
    if (replayHour === null) return;
    if (replayHour > hour) { setReplayHour(null); return; }
    const t = window.setTimeout(() => setReplayHour(replayHour + 1), 170);
    return () => window.clearTimeout(t);
  }, [replayHour, hour]);

  /* ---- the globe ---- */
  const markers: MapGlobeMarker[] = ranked.map((c, i) => ({
    position: c.position,
    label: c.name,
    rank: i + 1,
    size: sizeFor(scale(metric.value(c))),
    status: c.status === 'watch' ? 'watch' : 'healthy',
    selected: c.id === selectedId,
    hovered: c.id === hoverId,
  }));
  const arcs: MapGlobeArc[] = hub ? ranked.filter((c) => c.id !== hub.id).map((c) => ({ from: c.position, to: hub.position })) : [];
  const center = focus ?? DEFAULT_CENTER;

  const card = (i: number) => {
    const c = ranked[i];
    if (!c) return null;
    const share = totals.revenue ? (c.revenue / totals.revenue) * 100 : 0;
    return (
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardName}>{c.name}</span>
          <span className={styles.cardSub}>{regionLabel(c.region)} · {localTime(now, c.timeZone)} local</span>
        </div>
        <div className={styles.cardStats}>
          <span className={styles.cardStat}><span className={styles.cardLabel}>Today</span><span className={styles.cardValue}>{usd0.format(c.revenue)}</span></span>
          <span className={styles.cardStat}><span className={styles.cardLabel}>Payments</span><span className={styles.cardValue}>{int.format(c.payments)}</span></span>
          <span className={styles.cardStat}><span className={styles.cardLabel}>Share</span><span className={styles.cardValue}>{pct1(share)}</span></span>
        </div>
        {c.id !== selectedId && <span className={styles.cardHint}>Click to focus the map on {c.name}</span>}
      </div>
    );
  };

  /* ---- the volume by hour ---- */
  const shownHour = replayHour ?? hour;
  const played = hourly.slice(0, shownHour + 1);
  const peak = Math.max(1, ...played);

  const metricOptions = METRICS.map((m) => ({ value: m.id, label: compact ? m.short : m.label }));
  const headline = metricId === 'revenue' ? usd0.format(totals.revenue) : metricId === 'payments' ? int.format(totals.payments) : pct1(totals.approvalRate);
  const headlineLabel = `${metric.label} today`;
  const forecastTone = (n: number) => (n < 0 ? 'warning' : 'success');

  return (
    <div
      ref={root}
      className={cx(styles.block, className)}
      data-state={state}
      data-selected={selected && !loading ? '' : undefined}
      role="region"
      aria-label={title}
      aria-busy={loading || undefined}
    >
      <span className={styles.srOnly} role="status">
        {loading ? 'Loading payments' : empty ? 'No payments yet today' : selected ? `Showing ${selected.name}` : ''}
      </span>

      {/* header: the title and the metric */}
      <header className={styles.header}>
        <div className={styles.title}>
          <h2 className={styles.heading}>
            <span className={styles.onlyDesktop}>{title}</span>
            <span className={styles.onlyMobile}>{mobileTitle}</span>
          </h2>
          <p className={cx(styles.description, styles.onlyDesktop)}>{description}</p>
          <p className={cx(styles.description, styles.onlyMobile)}>{mobileDescription}</p>
        </div>
        <IconButton
          className={styles.info}
          icon={IconInfoCircle}
          variant="ghost"
          size="md"
          aria-label="How to read this map"
          aria-expanded={legendOpen}
          onClick={() => setLegendOpen((v) => !v)}
        />
        <div className={cx(styles.metric, loading && styles.dim)}>
          <SegmentedControl options={metricOptions} value={metricId} onChange={(v) => !loading && setMetricId(v as LiveMapMetric)} fullWidth={compact} />
        </div>
      </header>

      {/* region filters */}
      <div className={styles.regions}>
        <span className={cx(styles.regionLabel, styles.onlyDesktop)}>Region</span>
        <div className={cx(styles.chips, loading && styles.dim)}>
          <FilterChip type={region === 'all' ? 'active' : 'default'} onClick={() => !loading && chooseRegion('all')} onRemove={() => chooseRegion('all')}>All regions</FilterChip>
          {regions.map((r) => (
            <FilterChip key={r.id} type={region === r.id ? 'active' : 'default'} onClick={() => !loading && chooseRegion(r.id)} onRemove={() => chooseRegion('all')}>{r.label}</FilterChip>
          ))}
        </div>
        <Button
          className={cx(styles.reset, styles.onlyDesktop)}
          variant={selected && !loading ? 'secondary' : 'ghost'}
          size="sm"
          leftIcon={<IconRefresh size={16} />}
          onClick={reset}
        >
          Reset view
        </Button>
      </div>

      <div className={styles.body}>
        <section className={styles.mapArea}>
          <div className={styles.stage}>
            {loading ? (
              <div className={styles.globeSkeleton} aria-hidden="true" />
            ) : (
              <div className={styles.globeBox} data-dim={empty ? '' : undefined}>
                <MapGlobe
                  markers={markers}
                  arcs={arcs}
                  center={center}
                  zoom={zoom}
                  autoRotate={autoRotate}
                  atmosphere={atmosphere}
                  markerScale={1}
                  cardPlacement="side"
                  renderMarkerCard={empty ? undefined : compact ? () => null : card}
                  onMarkerClick={(i) => ranked[i] && toggleCity(ranked[i].id)}
                  onMarkerHover={(i) => setHoverState(i == null ? null : ranked[i]?.id ?? null)}
                  aria-label="Payments by city"
                />
              </div>
            )}

            {/* top-left: the "Right now" insight, or what is selected */}
            {!loading && !empty && (selected ? (
              <div className={styles.selection}>
                <FilterChip type="active" onRemove={() => select(null)}>Showing: {selected.name}, {selected.countryName}</FilterChip>
              </div>
            ) : (
              <>
                <div className={cx(styles.insight, styles.onlyDesktop)}>
                  <div className={styles.insightHead}><ChatOrb size={16} look={false} blink={false} /><span>Right now</span></div>
                  <p className={styles.insightTitle}>{insight.title}</p>
                  <p className={styles.insightBody}>{insight.body}</p>
                </div>
                <div className={cx(styles.pill, styles.onlyMobile)}><IconSparkles size={14} aria-hidden="true" />{insight.short}</div>
              </>
            ))}

            {/* bottom-left: how to read it (a popover on a phone) */}
            {!loading && !empty && (
              <div className={styles.legend} data-open={legendOpen ? '' : undefined}>
                <p className={styles.legendTitle}>How to read this</p>
                <div className={styles.legendRow}>
                  <span className={styles.legendSizes} aria-hidden="true"><i /><i /><i /></span>
                  <span>Dot size: {metric.label.toLowerCase()} today</span>
                </div>
                <div className={styles.legendRow}>
                  <span className={styles.legendLine} aria-hidden="true" />
                  <span>Line: payments settling to {hub?.name}</span>
                </div>
                <div className={styles.legendRow}>
                  <span className={styles.legendRing} aria-hidden="true" />
                  <span>Dashed ring: approvals dipping</span>
                </div>
              </div>
            )}

            {/* bottom-right: zoom and recentre */}
            {!loading && (
              <div className={styles.controls}>
                <MapControlButton className={styles.zoomBtn} icon={IconPlus} aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(1.15, +(z + 0.05).toFixed(2)))} disabled={zoom >= 1.15} />
                <MapControlButton className={styles.zoomBtn} icon={IconMinus} aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.8, +(z - 0.05).toFixed(2)))} disabled={zoom <= 0.8} />
                <MapControlButton icon={IconCurrentLocation} aria-label="Recentre the map" onClick={recenter} />
              </div>
            )}

            {empty && (
              <div className={styles.emptyCard}>
                <p className={styles.emptyTitle}>No payments yet today</p>
                <p className={styles.emptyBody}>Cities appear here as soon as the first payment settles.</p>
              </div>
            )}
          </div>

          <p className={cx(styles.caption, styles.onlyMobile)}>Bigger dots = more revenue ·<br />Lines show payments settling to {hub?.name}</p>

          {/* playback: replay the day, the volume by hour, the clock */}
          <div className={styles.playback}>
            <Button className={styles.replay} variant="outline" size="sm" leftIcon={<IconRefresh size={16} />} onClick={() => setReplayHour(0)} disabled={loading}>Replay today</Button>
            <IconButton
              className={cx(styles.replayIcon, styles.onlyMobile)}
              icon={IconRefresh}
              variant="outline"
              size="sm"
              aria-label="Replay today"
              onClick={() => setReplayHour(0)}
              disabled={loading}
            />
            <IconButton
              className={styles.pause}
              icon={paused ? IconPlayerPlay : IconPlayerPause}
              variant="outline"
              size="sm"
              aria-label={paused ? 'Resume live updates' : 'Pause live updates'}
              aria-pressed={paused}
              onClick={() => setPaused((p) => !p)}
            />
            <div className={styles.volume} data-dim={empty ? '' : undefined}>
              {loading ? (
                <div className={styles.skeletonBars} aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} />)}</div>
              ) : (
                <>
                  <div className={styles.bars} role="img" aria-label={`Payment volume by hour today, peaking at ${pad2(hourly.indexOf(Math.max(...played)))}:00 UTC`}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <span
                        key={h}
                        className={cx(styles.bar, h < shownHour && styles.barPast, h === shownHour && styles.barNow, h > shownHour && styles.barFuture)}
                        style={h <= shownHour ? { height: `${Math.max(3, (hourly[h] / peak) * 100)}%` } : undefined}
                      />
                    ))}
                  </div>
                  <div className={cx(styles.axis, styles.onlyDesktop)} aria-hidden="true">
                    <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
                  </div>
                </>
              )}
            </div>
            <span className={cx(styles.clock, styles.onlyDesktop)}>{replayHour !== null ? `${pad2(shownHour)}:00:00 UTC` : utcClock(now)}</span>
            <LocationDot className={styles.live} location={paused ? 'Paused' : 'Live'} status={paused ? 'remote' : 'active'} />
          </div>
        </section>

        {/* the cities panel; a bottom sheet on a phone */}
        <aside className={styles.panel} aria-label={selected && !loading ? `${selected.name} detail` : 'Top cities'}>
          {loading ? (
            <PanelLoading tab={tab} onTab={setTab} total={totals.cities} onViewAll={onViewAll} />
          ) : selected ? (
            <CityDetail
              city={selected}
              rank={rankOf(selected.id)}
              totals={totals}
              metric={metric}
              regionLabel={regionLabel(selected.region)}
              onBack={() => select(null)}
              onView={() => onViewCity?.(selected)}
            />
          ) : (
            <>
              <div className={styles.grabber} aria-hidden="true"><span /></div>
              <Tabs
                className={cx(styles.tabs, styles.onlyDesktop)}
                items={[{ value: 'cities', label: 'Top cities' }, { value: 'regions', label: 'Regions' }]}
                value={tab}
                onChange={(v) => setTab(v as 'cities' | 'regions')}
              />
              <div className={cx(styles.headline, styles.onlyDesktop)}>
                <div className={styles.headlineValue}>
                  <span className={styles.label}>{headlineLabel}</span>
                  <span className={styles.big}>{empty ? '$0' : headline}</span>
                </div>
                {!empty && metricId === 'revenue' && <Badge variant={forecastTone(totals.vsForecast)}>{vsForecast(totals.vsForecast)}</Badge>}
              </div>
              <div className={cx(styles.sheetHeader, styles.onlyMobile)}>
                <div className={styles.sheetTitle}>
                  <span className={styles.sheetName}>Top cities today</span>
                  <span className={styles.label}>{headline} total</span>
                </div>
                {!empty && metricId === 'revenue' && <Badge variant={forecastTone(totals.vsForecast)}>{vsForecast(totals.vsForecast)}</Badge>}
              </div>

              {empty ? (
                <p className={styles.noCities}>No cities to rank yet.</p>
              ) : tab === 'regions' ? (
                <ul className={styles.list}>
                  {regions.map((r) => {
                    const own = cities.filter((c) => c.region === r.id);
                    const sum = own.reduce((a, c) => a + c.revenue, 0);
                    const sums = regions.map((x) => cities.filter((c) => c.region === x.id).reduce((a, c) => a + c.revenue, 0));
                    const all = totals.revenue || 1;
                    return (
                      <li key={r.id}>
                        <button type="button" className={styles.row} onClick={() => chooseRegion(r.id)}>
                          <span className={styles.rowTop}>
                            <span className={styles.name}>{r.label}</span>
                            <span className={styles.value}>{usd0.format(sum)}</span>
                          </span>
                          <span className={styles.track}><span className={styles.fill} style={{ width: `${(sum / (Math.max(...sums) * 1.2 || 1)) * 100}%` }} /></span>
                          <span className={styles.meta}>
                            <span>{pct1((sum / all) * 100)} of revenue</span>
                            <span>{own.length} {own.length === 1 ? 'city' : 'cities'}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <ul className={styles.list}>
                  {inRegion.slice(0, 5).map((c) => {
                    const v = metric.value(c);
                    const share = metricId === 'revenue' ? (c.revenue / totals.revenue) * 100 : metricId === 'payments' ? (c.payments / totals.payments) * 100 : 0;
                    const frac = metric.floor > 0 ? (v - metric.floor) / (100 - metric.floor) : v / (top * 1.2 || 1);
                    const metaLeft = metricId === 'approval' ? `${int.format(c.payments)} payments` : `${pct1(share)} of ${metricId}`;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          className={styles.row}
                          data-hovered={c.id === hoverId ? '' : undefined}
                          onClick={() => toggleCity(c.id)}
                          onPointerEnter={() => setHoverState(c.id)}
                          onPointerLeave={() => setHoverState(null)}
                          onFocus={() => setHoverState(c.id)}
                          onBlur={() => setHoverState(null)}
                        >
                          <span className={cx(styles.rowTop, styles.onlyDesktop)}>
                            <span className={styles.rank}>{rankOf(c.id)}</span>
                            <span className={styles.name}>{c.name}</span>
                            <span className={styles.country}>{c.country}</span>
                            <span className={styles.value}>{metric.format(v)}</span>
                          </span>
                          <span className={cx(styles.track, styles.onlyDesktop)}><span className={styles.fill} style={{ width: `${Math.max(0, Math.min(1, frac)) * 100}%` }} /></span>
                          <span className={cx(styles.meta, styles.onlyDesktop)}>
                            <span>{metaLeft}</span>
                            <span className={styles[`tone_${forecastTone(c.vsForecast)}`]}>{vsForecast(c.vsForecast)}</span>
                          </span>
                          <span className={cx(styles.rowMobile, styles.onlyMobile)}>
                            <span className={cx(styles.rank, styles.rankLg)}>{rankOf(c.id)}</span>
                            <span className={styles.rowText}>
                              <span className={styles.name}>{c.name}</span>
                              <span className={cx(styles.meta, styles[`tone_${forecastTone(c.vsForecast)}`])}>{c.country} · {vsForecast(c.vsForecast)}</span>
                            </span>
                            <span className={styles.value}>{metric.format(v)}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className={cx(styles.footer, styles.onlyDesktop)}>
                <span className={styles.footnote}>Top {empty ? 5 : Math.min(5, inRegion.length)} of {totals.cities} cities</span>
                <Button variant="ghost" size="sm" onClick={onViewAll}>View all cities</Button>
              </div>
              <Button className={cx(styles.showAll, styles.onlyMobile)} variant="ghost" size="sm" onClick={onViewAll}>Show all {totals.cities} cities</Button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
};
LiveMapBlock.displayName = 'LiveMapBlock';

/* ------------------------------------------------------------------ *
 * City detail (the panel when a city is selected)
 * ------------------------------------------------------------------ */
interface CityDetailProps {
  city: LiveMapCity;
  rank: number;
  totals: LiveMapTotals;
  metric: MetricSpec;
  regionLabel: string;
  onBack: () => void;
  onView: () => void;
}
const CityDetail: React.FC<CityDetailProps> = ({ city, rank, totals, metric, regionLabel, onBack, onView }) => {
  const share = metric.id === 'revenue' ? (city.revenue / totals.revenue) * 100 : metric.id === 'payments' ? (city.payments / totals.payments) * 100 : null;
  const watch = city.status === 'watch';
  return (
    <>
      <Button className={styles.back} variant="ghost" size="sm" leftIcon={<IconArrowLeft size={16} />} onClick={onBack}>All cities</Button>
      <div className={styles.cityHeader}>
        <div className={styles.nameRow}>
          <h3 className={styles.cityName}>{city.name}</h3>
          <Badge variant="neutral">{regionLabel}</Badge>
          <Badge variant={watch ? 'warning' : 'success'}>{watch ? 'Watch' : 'Healthy'}</Badge>
        </div>
        <span className={styles.label}>
          Rank {rank} of {totals.cities} cities{share !== null ? ` · ${pct1(share)} of today’s ${metric.id}` : ''}
        </span>
      </div>
      <div className={styles.revenue}>
        <div className={styles.headlineValue}>
          <span className={styles.label}>{metric.label} today</span>
          <span className={cx(styles.big, styles.bigLg)}>{metric.format(metric.value(city))}</span>
        </div>
        <Badge variant={city.vsForecast < 0 ? 'warning' : 'success'}>{vsForecast(city.vsForecast)}</Badge>
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}><span className={styles.label}>Payments</span><span className={styles.statValue}>{int.format(city.payments)}</span></div>
        <div className={styles.stat}><span className={styles.label}>Approval rate</span><span className={styles.statValue}>{pct1(city.approvalRate)}</span></div>
        <div className={styles.stat}><span className={styles.label}>Avg. payment</span><span className={styles.statValue}>{usd2.format(city.avgPayment)}</span></div>
      </div>
      <hr className={styles.rule} />
      <h4 className={styles.methodsTitle}>Payment methods</h4>
      <div className={styles.methods}>
        {city.methods.map((m) => (
          <div key={m.label} className={styles.method}>
            <div className={styles.methodRow}><span className={styles.methodName}>{m.label}</span><span className={styles.methodShare}>{m.share}%</span></div>
            <div className={styles.methodTrack} role="img" aria-label={`${m.label}: ${m.share}%`}><span style={{ width: `${m.share}%` }} /></div>
          </div>
        ))}
      </div>
      <div className={styles.grow} />
      <Button className={styles.viewCity} variant="primary" size="md" onClick={onView}>View {city.name} payments</Button>
    </>
  );
};

/* ------------------------------------------------------------------ *
 * Loading panel
 * ------------------------------------------------------------------ */
const PanelLoading: React.FC<{ tab: 'cities' | 'regions'; onTab: (t: 'cities' | 'regions') => void; total: number; onViewAll?: () => void }> = ({ tab, onTab, total, onViewAll }) => (
  <>
    <div className={styles.grabber} aria-hidden="true"><span /></div>
    <Tabs
      className={cx(styles.tabs, styles.onlyDesktop)}
      items={[{ value: 'cities', label: 'Top cities' }, { value: 'regions', label: 'Regions' }]}
      value={tab}
      onChange={(v) => onTab(v as 'cities' | 'regions')}
    />
    <div className={cx(styles.skeletonHead, styles.onlyDesktop)} aria-hidden="true"><i className={styles.skLabel} /><i className={styles.skValue} /></div>
    <div className={cx(styles.skeletonRows)} aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ opacity: 0.8 - i * 0.05 }} />)}</div>
    <div className={cx(styles.footer, styles.onlyDesktop)}>
      <span className={styles.footnote}>Top 5 of {total} cities</span>
      <Button variant="ghost" size="sm" onClick={onViewAll}>View all cities</Button>
    </div>
  </>
);

export default LiveMapBlock;

/**
 * RegionMapBlock - Blocks / Application / Region Map
 *
 * A COMPOSITION EXAMPLE, not a configurable component. Copy this folder and edit it: swap `sample.ts` for your own
 * regions and figures, change the metrics. Assembled from existing Sakani components with the Region Map in the middle:
 *
 *   header      title + description
 *   controls    SegmentedControl (the metric: Revenue, Growth, Penetration) and a Combobox to find a region by name
 *   headline    the region name, its figure (counts up when it appears), and "All states" once a region is zoomed
 *   map         RegionMap shaded by the metric; hover gives a card with the rank, click zooms in
 *   legend      RegionMapLegend; hover a band to see which regions are in it, click to hold it
 *   panel       nothing selected: the highest or lowest regions as soft bars behind their names (each bar grows and its
 *               figure counts up as it loads); a region selected: its three figures with rank and how far it is from
 *               the average, then the regions next to it in the ranking (`renderDetail` replaces all of it)
 *
 * The map, the legend and the list are linked: pointing at a region outlines it everywhere and marks its band on the
 * legend; pointing at a legend band fades every region outside it, on the map and in the list.
 *
 * States (the `state` prop): "default", "loading" (skeletons), "empty" (no figures yet). Dark mode is the `dark` class
 * on any ancestor, as everywhere else. The data is plain props: feed it from your own query.
 */

import React from 'react';
import { IconArrowLeft } from '../../icons/outline/arrow-left';
import { Button } from '../../components/Button';
import { Combobox } from '../../components/Combobox';
import { SegmentedControl } from '../../components/SegmentedControl';
import { RegionMap, RegionMapLegend, US_STATES, US_STATES_VIEWBOX, binIndex, type RegionShape } from '../../components/RegionMap';
import { SAMPLE_METRICS, SAMPLE_ROWS } from './sample';
import { useReveal } from './useReveal';
import type { RegionMapMetric, RegionMapRow, RegionMapState } from './types';
import styles from './RegionMapBlock.module.css';

export interface RegionMapBlockProps {
  /** The figures for each region. */
  rows?: RegionMapRow[];
  /** What the map can be shaded by, in tab order. */
  metrics?: RegionMapMetric[];
  /** The shapes and the box they live in. Default: the 50 US states. */
  regions?: RegionShape[];
  viewBox?: [number, number, number, number];
  /** What a region is called in the buttons and the search ("state", "country"). */
  regionNoun?: string;
  /** The word for the whole set ("All states", "of 51 states"). Default: `${regionNoun}s`. */
  regionNounPlural?: string;
  /** The name shown above the headline figure when nothing is zoomed. */
  allLabel?: string;
  title?: string;
  description?: string;
  /** "default", "loading" (skeletons) or "empty" (no figures yet). */
  state?: RegionMapState;
  /** The metric shown first (an id from `metrics`). */
  defaultMetric?: string;
  /** The zoomed region's id, or null for the whole map (controlled). */
  selectedId?: string | null;
  /** The region zoomed first (uncontrolled). */
  defaultSelectedId?: string | null;
  onSelectedChange?: (id: string | null) => void;
  /** Play the load animation: each bar grows from the left while its figure counts up from zero. Default true. */
  animate?: boolean;
  /** Replaces the selected region's panel. */
  renderDetail?: (row: RegionMapRow, ctx: { metric: RegionMapMetric; rank: number; total: number; back: () => void }) => React.ReactNode;
  className?: string;
}

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

/** How a figure compares with the average region, in the metric's own terms. */
function compareText(metric: RegionMapMetric, value: number, average: number): string {
  if (metric.compare) return metric.compare(value, average);
  if (metric.aggregate === 'mean') {
    const d = value - average;
    return `${d < 0 ? '−' : '+'}${Math.abs(d).toFixed(1)} pts vs average`;
  }
  return average > 0 ? `${(value / average).toFixed(1)}× the average` : '';
}

/** A figure that counts up from zero when it appears. */
const Count: React.FC<{ value: number; format: (n: number) => string; animate: boolean; delay?: number }> = ({ value, format, animate, delay = 0 }) => {
  const p = useReveal(delay, 800, animate);
  return <>{format(value * p)}</>;
};

/** One ranked row. It plays its own reveal when it mounts (first load, a new metric, coming back from a zoom). */
const RankRow: React.FC<{
  name: string;
  value: number;
  pct: number;
  index: number;
  format: (n: number) => string;
  animate: boolean;
  disabled?: boolean;
  active?: boolean;
  dim?: boolean;
  current?: boolean;
  onClick: () => void;
  onHover: (on: boolean) => void;
}> = ({ name, value, pct, index, format, animate, disabled, active, dim, current, onClick, onHover }) => {
  const p = useReveal(index * 70, 900, animate);
  return (
    <button
      type="button"
      className={styles.row}
      data-active={active ? '' : undefined}
      data-dim={dim ? '' : undefined}
      data-current={current ? '' : undefined}
      onClick={onClick}
      disabled={disabled}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
    >
      <span className={styles.pillWrap}>
        <span className={styles.bar} style={{ width: `${Math.max(22, pct * 100) * p}%` }} aria-hidden />
        <span className={styles.rowName}>{name}</span>
      </span>
      <span className={styles.rowValue} aria-label={format(value)}>{format(value * p)}</span>
    </button>
  );
};

export const RegionMapBlock: React.FC<RegionMapBlockProps> = ({
  rows = SAMPLE_ROWS,
  metrics = SAMPLE_METRICS,
  regions = US_STATES,
  viewBox = US_STATES_VIEWBOX,
  regionNoun = 'state',
  regionNounPlural,
  allLabel = 'United States',
  title = 'Revenue by state',
  description = 'Twelve months to August 31, 2026',
  state = 'default',
  defaultMetric,
  selectedId,
  defaultSelectedId = null,
  onSelectedChange,
  animate = true,
  renderDetail,
  className,
}) => {
  const plural = regionNounPlural ?? `${regionNoun}s`;
  const [metricId, setMetricId] = React.useState(defaultMetric ?? metrics[0].id);
  const controlled = selectedId !== undefined;
  const [inner, setInner] = React.useState<string | null>(defaultSelectedId);
  const selected = controlled ? selectedId : inner;
  const setSelected = (id: string | null) => {
    if (!controlled) setInner(id);
    onSelectedChange?.(id);
  };

  // linked highlighting: the region under the pointer, the legend band under the pointer, and a band held on
  const [hoverId, setHoverId] = React.useState<string | null>(null);
  const [hoverBin, setHoverBin] = React.useState<number | null>(null);
  const [lockedBin, setLockedBin] = React.useState<number | null>(null);
  const [order, setOrder] = React.useState<'high' | 'low'>('high');
  const [expanded, setExpanded] = React.useState(false);

  const metric = metrics.find((m) => m.id === metricId) ?? metrics[0];
  const loading = state === 'loading';
  const empty = state === 'empty';

  // best first, for the active metric
  const ranked = React.useMemo(
    () => [...rows].sort((a, b) => (b.values[metric.id] ?? -Infinity) - (a.values[metric.id] ?? -Infinity)),
    [rows, metric.id],
  );
  const rankOf = (id: string) => ranked.findIndex((r) => r.id === id) + 1;
  const rankIn = (id: string, metricKey: string) => {
    const v = rows.find((r) => r.id === id)?.values[metricKey];
    return v === undefined ? 0 : 1 + rows.filter((r) => r.values[metricKey] > v).length;
  };
  const average = (metricKey: string) => {
    const v = rows.map((r) => r.values[metricKey]).filter((x): x is number => typeof x === 'number');
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  };

  const values = React.useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const r of rows) out[r.id] = r.values[metric.id] ?? null;
    return out;
  }, [rows, metric.id]);
  const binOf = (id: string): number | null => {
    const v = values[id];
    return typeof v === 'number' ? binIndex(v, metric.scale.breaks) : null;
  };
  const activeBin = hoverBin ?? lockedBin;
  const dimExcept = activeBin === null ? null : rows.filter((r) => binOf(r.id) === activeBin).map((r) => r.id);
  const hasMissing = !empty && !loading && regions.some((r) => typeof values[r.id] !== 'number');

  const selectedRow = selected ? rows.find((r) => r.id === selected) : undefined;
  const aggregate = () => {
    const v = rows.map((r) => r.values[metric.id]).filter((x): x is number => typeof x === 'number');
    if (v.length === 0) return null;
    const sum = v.reduce((a, b) => a + b, 0);
    return metric.aggregate === 'mean' ? sum / v.length : sum;
  };
  const headValue = selectedRow ? selectedRow.values[metric.id] : aggregate();
  const headLabel = selectedRow ? selectedRow.name : allLabel;
  const max = Math.max(...ranked.map((r) => Math.abs(r.values[metric.id] ?? 0)), 1);

  const back = () => setSelected(null);
  const changeMetric = (id: string) => {
    setMetricId(id);
    setLockedBin(null);
    setHoverBin(null);
  };

  const tooltip = (region: RegionShape) => {
    const row = rows.find((r) => r.id === region.id);
    if (!row) return <span className={styles.tipName}>{region.name}</span>;
    return (
      <>
        <div className={styles.tipHead}>
          <span className={styles.tipName}>{region.name}</span>
          <span className={styles.tipRank}>{rankOf(region.id) ? `${ordinal(rankOf(region.id))} of ${ranked.length}` : ''}</span>
        </div>
        <div className={styles.tipRows}>
          {metrics.map((m) => (
            <div key={m.id} className={[styles.tipRow, m.id === metric.id ? styles.tipRowOn : ''].filter(Boolean).join(' ')}>
              <span>{m.label}</span>
              <span>{m.format(row.values[m.id])}</span>
            </div>
          ))}
        </div>
        <div className={styles.tipHint}>{selected === region.id ? 'Select to zoom out' : 'Select to zoom in'}</div>
      </>
    );
  };

  const findOptions = React.useMemo(
    () => [...regions].sort((a, b) => a.name.localeCompare(b.name)).map((r) => ({ value: r.id, label: r.name })),
    [regions],
  );

  const listRow = (r: RegionMapRow, i: number, extra?: { current?: boolean; max?: number }) => {
    const v = r.values[metric.id];
    const b = binOf(r.id);
    return (
      <li key={`${metric.id}-${r.id}`}>
        <RankRow
          name={r.name}
          value={v}
          pct={Math.abs(v) / (extra?.max ?? max)}
          index={i}
          format={metric.format}
          animate={animate}
          disabled={empty}
          active={hoverId === r.id}
          dim={activeBin !== null && b !== activeBin}
          current={extra?.current}
          onClick={() => setSelected(r.id)}
          onHover={(on) => setHoverId((cur) => (on ? r.id : cur === r.id ? null : cur))}
        />
      </li>
    );
  };

  const ordered = order === 'high' ? ranked : [...ranked].reverse();
  const shown = expanded ? ordered : ordered.slice(0, 6);
  const selRank = selectedRow ? rankOf(selectedRow.id) : 0;
  const nearStart = Math.max(0, Math.min(ranked.length - 5, selRank - 1 - 2));
  const nearby = selectedRow ? ranked.slice(nearStart, nearStart + 5) : [];
  // the neighbours are close in value, so their bars are scaled against each other, not against the leader
  const nearMax = Math.max(...nearby.map((r) => Math.abs(r.values[metric.id] ?? 0)), 1);

  return (
    <section className={[styles.block, className].filter(Boolean).join(' ')} aria-label={title}>
      <header className={styles.head}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.subtitle}>{description}</p>
      </header>

      <div className={styles.controls}>
        <div className={styles.metrics}>
          <SegmentedControl fullWidth options={metrics.map((m) => ({ value: m.id, label: m.label }))} value={metric.id} onChange={changeMetric} />
        </div>
        <div className={styles.find}>
          <Combobox
            size="sm"
            options={findOptions}
            value={selected ?? ''}
            placeholder={`Find a ${regionNoun}`}
            onChange={(v) => setSelected(v === '' || Array.isArray(v) ? null : v)}
          />
        </div>
      </div>

      <div className={styles.headline}>
        <div className={styles.headlineText}>
          <span className={styles.headlineLabel}>{headLabel}</span>
          <span className={styles.headlineValue}>
            <span className={styles.big}>
              {loading || empty || headValue == null ? (
                '—'
              ) : (
                <Count key={`${metric.id}-${selected ?? 'all'}`} value={headValue} format={metric.format} animate={animate} />
              )}
            </span>
            <span className={styles.unit}>{metric.unit}</span>
          </span>
        </div>
        {selectedRow && (
          <Button variant="outline" size="sm" leftIcon={<IconArrowLeft size={16} />} onClick={back}>
            All {plural}
          </Button>
        )}
      </div>

      <div className={styles.stage}>
        <RegionMap
          regions={regions}
          viewBox={viewBox}
          values={empty ? {} : values}
          scale={metric.scale}
          selected={selected}
          onSelectedChange={setSelected}
          renderTooltip={tooltip}
          formatValue={metric.format}
          onHoverChange={setHoverId}
          hovered={hoverId}
          dimExcept={dimExcept}
          loading={loading}
          aria-label={`${title}, by ${regionNoun}`}
        />
        {empty && <div className={styles.empty}>No figures yet for this period.</div>}
      </div>

      <RegionMapLegend
        scale={metric.scale}
        formatValue={metric.format}
        activeBin={activeBin}
        lockedBin={lockedBin}
        markBin={hoverId ? binOf(hoverId) : null}
        onBinHover={setHoverBin}
        onBinClick={(i) => setLockedBin((l) => (l === i ? null : i))}
        noData={hasMissing}
      />

      <hr className={styles.divider} />

      {loading ? (
        <div className={styles.skeleton} aria-hidden>
          {[88, 72, 80, 64, 76].map((w, i) => (
            <i key={i} style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : selectedRow ? (
        renderDetail ? (
          renderDetail(selectedRow, { metric, rank: selRank, total: ranked.length, back })
        ) : (
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <h4 className={styles.panelTitle}>{selectedRow.name}</h4>
              <span className={styles.panelHint}>{ordinal(selRank)} of {ranked.length} by {metric.label.toLowerCase()}</span>
            </div>
            <dl className={styles.figures}>
              {metrics.map((m, i) => {
                const v = selectedRow.values[m.id];
                return (
                  <div key={`${m.id}-${selectedRow.id}`} className={styles.figure} data-on={m.id === metric.id ? '' : undefined}>
                    <dt>{m.label}</dt>
                    <dd>
                      <Count value={v} format={m.format} animate={animate} delay={i * 70} />
                    </dd>
                    <small>{ordinal(rankIn(selectedRow.id, m.id))} of {rows.length}</small>
                    <small className={styles.compare}>{compareText(m, v, average(m.id))}</small>
                  </div>
                );
              })}
            </dl>
            <h5 className={styles.subhead}>Nearby in the ranking</h5>
            <ul className={styles.list}>{nearby.map((r, i) => listRow(r, i, { current: r.id === selectedRow.id, max: nearMax }))}</ul>
          </div>
        )
      ) : (
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <h4 className={styles.panelTitle}>{plural.charAt(0).toUpperCase() + plural.slice(1)}</h4>
            <div className={styles.toggle} role="group" aria-label="Order">
              {([['high', 'Highest'], ['low', 'Lowest']] as const).map(([k, label]) => (
                <button key={k} type="button" aria-pressed={order === k} onClick={() => setOrder(k)}>{label}</button>
              ))}
            </div>
          </div>
          <div className={expanded ? styles.listScroll : undefined} data-lenis-prevent={expanded ? '' : undefined}>
            <ul className={styles.list}>{shown.map((r, i) => listRow(r, i))}</ul>
          </div>
          {ranked.length > 6 && (
            <Button variant="ghost" size="sm" onClick={() => setExpanded((e) => !e)} disabled={empty}>
              {expanded ? 'Show fewer' : `Show all ${ranked.length} ${plural}`}
            </Button>
          )}
        </div>
      )}
    </section>
  );
};

export default RegionMapBlock;

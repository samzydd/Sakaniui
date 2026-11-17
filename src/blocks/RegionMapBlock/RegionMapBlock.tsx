/**
 * RegionMapBlock - Blocks / Application / Region Map
 *
 * A COMPOSITION EXAMPLE, not a configurable component. Copy this folder and edit it: swap `sample.ts` for your own
 * regions and figures, change the metrics. Assembled from existing Sakani components with the Region Map in the middle:
 *
 *   header      title + description
 *   controls    SegmentedControl (the metric: Revenue, Growth, Penetration) and a Select for the area
 *   headline    the area or region name, its figure, and "All states" (a Button) once a region is zoomed
 *   map         RegionMap shaded by the metric; hover gives a card with the rank, click zooms in
 *   legend      RegionMapLegend + "Shaded by ..."
 *   panel       nothing selected: the ranked list (a soft bar behind each name, as long as its value, and the figure at the right; click to zoom);
 *               a region selected: its figures, its rank and a note (`renderDetail` replaces it)
 *
 * States (the `state` prop): "default", "loading" (skeletons), "empty" (no figures yet). Dark mode is the `dark` class
 * on any ancestor, as everywhere else. The data is plain props: feed it from your own query.
 */

import React from 'react';
import { IconArrowLeft } from '../../icons/outline/arrow-left';
import { Button } from '../../components/Button';
import { SegmentedControl } from '../../components/SegmentedControl';
import { Select } from '../../components/Select';
import { RegionMap, RegionMapLegend, US_STATES, US_STATES_VIEWBOX, type RegionShape } from '../../components/RegionMap';
import { SAMPLE_METRICS, SAMPLE_ROWS } from './sample';
import type { RegionMapMetric, RegionMapRow, RegionMapState } from './types';
import styles from './RegionMapBlock.module.css';

export interface RegionMapArea {
  value: string;
  label: string;
  /** The region ids inside the area. Left out: every region ("United States"). */
  ids?: string[];
}

export interface RegionMapBlockProps {
  /** The figures for each region. */
  rows?: RegionMapRow[];
  /** What the map can be shaded by, in tab order. */
  metrics?: RegionMapMetric[];
  /** The shapes and the box they live in. Default: the 50 US states. */
  regions?: RegionShape[];
  viewBox?: [number, number, number, number];
  /** The area dropdown. Left out: one area, everything. */
  areas?: RegionMapArea[];
  /** What a region is called in the buttons and the empty text ("state", "country"). */
  regionNoun?: string;
  /** The word for the whole set ("All states" back button, "of 51 states"). Default: `${regionNoun}s`. */
  regionNounPlural?: string;
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
  /** Replaces the selected region's panel. */
  renderDetail?: (row: RegionMapRow, ctx: { metric: RegionMapMetric; rank: number; total: number; back: () => void }) => React.ReactNode;
  /** Pins the hover card on one region without a pointer: documentation and visual tests. */
  className?: string;
}

const DEFAULT_AREAS: RegionMapArea[] = [{ value: 'all', label: 'United States' }];

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

export const RegionMapBlock: React.FC<RegionMapBlockProps> = ({
  rows = SAMPLE_ROWS,
  metrics = SAMPLE_METRICS,
  regions = US_STATES,
  viewBox = US_STATES_VIEWBOX,
  areas = DEFAULT_AREAS,
  regionNoun = 'state',
  regionNounPlural,
  title = 'Revenue by state',
  description = 'Twelve months to August 31, 2026',
  state = 'default',
  defaultMetric,
  selectedId,
  defaultSelectedId = null,
  onSelectedChange,
  renderDetail,
  className,
}) => {
  const plural = regionNounPlural ?? `${regionNoun}s`;
  const [metricId, setMetricId] = React.useState(defaultMetric ?? metrics[0].id);
  const [areaId, setAreaId] = React.useState(areas[0].value);
  const controlled = selectedId !== undefined;
  const [inner, setInner] = React.useState<string | null>(defaultSelectedId);
  const selected = controlled ? selectedId : inner;
  const setSelected = (id: string | null) => {
    if (!controlled) setInner(id);
    onSelectedChange?.(id);
  };

  const metric = metrics.find((m) => m.id === metricId) ?? metrics[0];
  const area = areas.find((a) => a.value === areaId) ?? areas[0];
  const loading = state === 'loading';
  const empty = state === 'empty';

  const inArea = React.useMemo(() => {
    const ids = area.ids ? new Set(area.ids) : null;
    return rows.filter((r) => !ids || ids.has(r.id));
  }, [rows, area]);

  // rank within the area, best first, for the active metric
  const ranked = React.useMemo(
    () => [...inArea].sort((a, b) => (b.values[metric.id] ?? -Infinity) - (a.values[metric.id] ?? -Infinity)),
    [inArea, metric.id],
  );
  const rankOf = (id: string) => ranked.findIndex((r) => r.id === id) + 1;

  const values = React.useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const r of inArea) out[r.id] = r.values[metric.id] ?? null;
    return out;
  }, [inArea, metric.id]);

  const selectedRow = selected ? rows.find((r) => r.id === selected) : undefined;
  const aggregate = () => {
    const v = inArea.map((r) => r.values[metric.id]).filter((x): x is number => typeof x === 'number');
    if (v.length === 0) return null;
    const sum = v.reduce((a, b) => a + b, 0);
    return metric.aggregate === 'mean' ? sum / v.length : sum;
  };
  const headValue = selectedRow ? selectedRow.values[metric.id] : aggregate();
  const headLabel = selectedRow ? selectedRow.name : area.label;
  const max = Math.max(...ranked.map((r) => Math.abs(r.values[metric.id] ?? 0)), 1);

  const back = () => setSelected(null);

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
        <div className={styles.tipHint}>{selected === region.id ? `Select to zoom out` : `Select to zoom in`}</div>
      </>
    );
  };

  return (
    <section className={[styles.block, className].filter(Boolean).join(' ')} aria-label={title}>
      <header className={styles.head}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.subtitle}>{description}</p>
      </header>

      <div className={styles.controls}>
        <div className={styles.metrics}>
          <SegmentedControl
            fullWidth
            options={metrics.map((m) => ({ value: m.id, label: m.label }))}
            value={metric.id}
            onChange={setMetricId}
          />
        </div>
        {areas.length > 1 && (
          <div className={styles.area}>
            <Select
              size="sm"
              options={areas.map((a) => ({ value: a.value, label: a.label }))}
              value={area.value}
              onChange={(v) => {
                setAreaId(v);
                setSelected(null);
              }}
            />
          </div>
        )}
      </div>

      <div className={styles.headline}>
        <div className={styles.headlineText}>
          <span className={styles.headlineLabel}>{headLabel}</span>
          <span className={styles.headlineValue}>
            <span className={styles.big}>{loading || empty || headValue == null ? '—' : metric.format(headValue)}</span>
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
          loading={loading}
          aria-label={`${title}, by ${regionNoun}`}
        />
        {empty && <div className={styles.empty}>No figures yet for this period.</div>}
      </div>

      <RegionMapLegend scale={metric.scale} formatValue={metric.format} caption={metric.caption} />

      <hr className={styles.divider} />

      {loading ? (
        <div className={styles.skeleton} aria-hidden>
          {[88, 72, 80, 64, 76].map((w, i) => (
            <i key={i} style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : selectedRow ? (
        renderDetail ? (
          renderDetail(selectedRow, { metric, rank: rankOf(selectedRow.id), total: ranked.length, back })
        ) : (
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <h4 className={styles.panelTitle}>{selectedRow.name}</h4>
              <span className={styles.panelHint}>{metric.rankedBy}</span>
            </div>
            <dl className={styles.figures}>
              {metrics.map((m) => (
                <div key={m.id} className={styles.figure}>
                  <dt>{m.label}</dt>
                  <dd>{m.format(selectedRow.values[m.id])}</dd>
                  <small>{ordinal(1 + [...inArea].filter((r) => r.values[m.id] > selectedRow.values[m.id]).length)} of {inArea.length}</small>
                </div>
              ))}
            </dl>
            <div className={styles.note}>
              <p className={styles.noteTitle}>No detail below {regionNoun} level for {selectedRow.name}</p>
              <p className={styles.noteBody}>
                {selectedRow.name} has {metric.format(selectedRow.values[metric.id])} in {metric.label.toLowerCase()}, {ordinal(rankOf(selectedRow.id))} of {ranked.length} {plural}.
              </p>
              <Button variant="ghost" size="sm" leftIcon={<IconArrowLeft size={16} />} onClick={back}>
                Back to all {plural}
              </Button>
            </div>
          </div>
        )
      ) : (
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <h4 className={styles.panelTitle}>Top {plural}</h4>
            <span className={styles.panelHint}>{metric.rankedBy}</span>
          </div>
          <ul className={styles.list}>
            {ranked.slice(0, 6).map((r) => {
              const v = r.values[metric.id];
              return (
                <li key={r.id}>
                  <button type="button" className={styles.row} onClick={() => setSelected(r.id)} disabled={empty}>
                    <span className={styles.pillWrap}>
                      <span className={styles.bar} style={{ width: `${Math.max(22, (Math.abs(v) / max) * 100)}%` }} aria-hidden />
                      <span className={styles.rowName}>{r.name}</span>
                    </span>
                    <span className={styles.rowValue}>{metric.format(v)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
};

export default RegionMapBlock;

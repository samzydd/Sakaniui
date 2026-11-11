/**
 * ToolCall
 *
 * The row an agent leaves when it calls a tool. Matches Figma "Tool Call": Status Running | Done | Error x Open | Closed.
 *
 *   header   a status mark (a turning ray spinner, a green check, a red cross), the call as code ("search_crm" then its
 *            arguments, muted), the duration, and a chevron
 *   details  when open: an Input and an Output panel on bg/subtle. While running the output reads "Waiting for the result…";
 *            on error it is tinted danger.
 *
 * `input` and `output` take a string, or any value (it is shown as formatted JSON). `open` / `defaultOpen` / `onOpenChange`
 * control the panel. It is presentational: you set `status` and `duration` as the call progresses.
 */

import React from 'react';
import { IconCircleCheck } from '../../icons/outline/circle-check';
import { IconCircleX } from '../../icons/outline/circle-x';
import { IconChevronRight } from '../../icons/outline/chevron-right';
import { iconStrokeWidth } from '../../lib/iconStrokeWidth';
import { RayLoader } from '../../lib/RayLoader';
import styles from './ToolCall.module.css';

export type ToolCallStatus = 'running' | 'done' | 'error';

export interface ToolCallProps {
  status?: ToolCallStatus;
  /** The tool's name, in code: "search_crm". */
  name: string;
  /** The arguments, in code, muted: `(query="Acme Corp")`. */
  args?: string;
  /** "1.2s". */
  duration?: string;
  /** The call's input: a string, or any value (shown as JSON). */
  input?: unknown;
  /** The call's output: a string, or any value (shown as JSON). */
  output?: unknown;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

const show = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v, null, 2));

export const ToolCall: React.FC<ToolCallProps> = ({
  status = 'done', name, args, duration, input, output, open, defaultOpen = false, onOpenChange, className,
}) => {
  const [inner, setInner] = React.useState(defaultOpen);
  const isOpen = open !== undefined ? open : inner;
  const toggle = () => { const next = !isOpen; if (open === undefined) setInner(next); onOpenChange?.(next); };
  const id = React.useId();
  const hasDetails = input !== undefined || output !== undefined || status === 'running';
  const label = status === 'running' ? 'running' : status === 'error' ? 'failed' : 'done';
  return (
    <div className={[styles.root, styles[`root--${status}`], className ?? ''].filter(Boolean).join(' ')} data-open={isOpen || undefined}>
      <button type="button" className={styles.header} onClick={toggle} aria-expanded={isOpen} aria-controls={id} disabled={!hasDetails}>
        <span className={styles.call}>
          <span className={styles.status} role="img" aria-label={label}>
            {status === 'running' ? <RayLoader size={16} />
              : status === 'error' ? <IconCircleX size={16} strokeWidth={iconStrokeWidth(16)} />
              : <IconCircleCheck size={16} strokeWidth={iconStrokeWidth(16)} />}
          </span>
          <span className={styles.signature}>
            <span className={styles.name}>{name}</span>
            {args && <span className={styles.args}>{args}</span>}
          </span>
        </span>
        <span className={styles.meta}>
          {duration && <span className={styles.duration}>{duration}</span>}
          {hasDetails && <span className={styles.chevron} aria-hidden="true"><IconChevronRight size={16} strokeWidth={iconStrokeWidth(16)} /></span>}
        </span>
      </button>
      {hasDetails && (
        <div id={id} className={styles.panel} role="region" aria-label={`${name} details`}>
          <div className={styles.panel__inner}>
            <div className={styles.details}>
              {input !== undefined && (
                <div className={styles.section}>
                  <span className={styles.overline}>Input</span>
                  <pre className={styles.code}>{show(input)}</pre>
                </div>
              )}
              <div className={styles.section}>
                <span className={styles.overline}>Output</span>
                <pre className={[styles.code, status === 'error' ? styles['code--error'] : '', output === undefined ? styles['code--wait'] : ''].filter(Boolean).join(' ')}>
                  {output !== undefined ? show(output) : status === 'running' ? 'Waiting for the result…' : 'No output'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolCall;

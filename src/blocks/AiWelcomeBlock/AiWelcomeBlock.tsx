/**
 * AiWelcomeBlock - Blocks / AI / AI Welcome
 *
 * A COMPOSITION EXAMPLE, not a configurable component. Copy this file and edit it: change the greeting, the recent work, what
 * submitting does.
 *
 * Architecture (read from the Figma block, 1440x900):
 *
 *   app sidebar (AiSidebar)      main (content centred, a little above the middle)
 *   "New chat" open              ├─ greeting: a metal sparkle and "Good afternoon, Samuel" (40px)
 *                                ├─ PromptComposer, then ComposerOptions under it
 *                                └─ "Recent work": three preview cards (a chart, an email, a forecast)
 */

import React from 'react';
import { IconSparkles } from '../../icons/outline/sparkles';
import { iconStrokeWidth } from '../../lib/iconStrokeWidth';
import { PromptComposer } from '../../components/PromptComposer';
import { AiSidebar } from '../AiChatBlock/parts/AiSidebar';
import { ComposerOptions } from '../AiChatBlock/parts/ComposerOptions';
import styles from './AiWelcomeBlock.module.css';

/* ------------------------------------------------------------------ *
 * Sample data - replace with your own
 * ------------------------------------------------------------------ */
type Art = 'bars' | 'email' | 'ring';
const RECENT: Array<{ title: string; when: string; art: Art }> = [
  { title: 'Pipeline summary', when: 'Updated 6h ago', art: 'bars' },
  { title: 'Renewal email, Acme', when: 'Yesterday', art: 'email' },
  { title: 'Q4 forecast', when: 'Nov 6', art: 'ring' },
];

const BARS = [28, 40, 34, 52, 44, 60, 50, 68, 78];

const Preview: React.FC<{ art: Art }> = ({ art }) => (
  <span className={styles.preview} aria-hidden="true">
    {art === 'bars' && (
      <span className={styles.bars}>
        {BARS.map((h, i) => <span key={i} className={[styles.bar, i === BARS.length - 1 ? styles['bar--accent'] : ''].filter(Boolean).join(' ')} style={{ height: h }} />)}
      </span>
    )}
    {art === 'email' && (
      <span className={styles.email}>
        <span className={styles.emailHead}><span className={styles.dot} /><span className={styles.emailName}><span /><span /></span></span>
        <span className={styles.line} style={{ width: '80%' }} /><span className={styles.line} style={{ width: '68%' }} />
        <span className={styles.line} style={{ width: '76%' }} /><span className={styles.line} style={{ width: '40%' }} />
      </span>
    )}
    {art === 'ring' && (
      <span className={styles.forecast}>
        <span className={styles.ring}><span className={styles.ringArc} /><span className={styles.ringValue}>72%</span></span>
        <span className={styles.forecastLines}><span style={{ width: 70 }} /><span style={{ width: 110 }} /><span style={{ width: 90 }} /></span>
      </span>
    )}
  </span>
);

/* ------------------------------------------------------------------ *
 * The block
 * ------------------------------------------------------------------ */
export interface AiWelcomeBlockProps {
  /** "Good afternoon". */
  greeting?: string;
  /** Who it greets. */
  name?: string;
  /** Called with the prompt when the user sends. */
  onSubmit?: (text: string) => void;
  className?: string;
}

export const AiWelcomeBlock: React.FC<AiWelcomeBlockProps> = ({ greeting = 'Good afternoon', name = 'Samuel', onSubmit, className }) => {
  const [draft, setDraft] = React.useState('');
  return (
    <div className={[styles.block, className ?? ''].filter(Boolean).join(' ')}>
      <AiSidebar activeNav="new" />
      <main className={styles.main}>
        <div className={styles.content}>
          <div className={styles.prompt}>
            <h1 className={styles.greeting}>
              <IconSparkles size={34} strokeWidth={iconStrokeWidth(34)} className={styles.mark} aria-hidden="true" />
              <span>{greeting}, {name}</span>
            </h1>
            <div className={styles.composer}>
              <PromptComposer
                value={draft}
                onValueChange={setDraft}
                onSubmit={(t) => { setDraft(''); onSubmit?.(t); }}
                onAttach={() => {}}
                onVoice={() => {}}
              />
              <ComposerOptions />
            </div>
          </div>
          <section className={styles.recent} aria-label="Recent work">
            <div className={styles.recentHead}>
              <span>Recent work</span>
              <button type="button" className={styles.viewAll}>View all</button>
            </div>
            <div className={styles.cards}>
              {RECENT.map((r) => (
                <button key={r.title} type="button" className={styles.card}>
                  <Preview art={r.art} />
                  <span className={styles.cardText}>
                    <span className={styles.cardTitle}>{r.title}</span>
                    <span className={styles.cardWhen}>{r.when}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default AiWelcomeBlock;

/**
 * AiChatBlock - Blocks / AI / AI Chat
 *
 * A COMPOSITION EXAMPLE, not a configurable component. Copy this file and edit it: swap the sidebar lists, replace
 * `runDemoReply` with a call to your model.
 *
 * Architecture (read from the Figma block, 1440x900):
 *
 *   app sidebar (AiSidebar)      main
 *   ├─ SidebarHeader             ├─ top bar: the chat's title (left), Share and a menu (right)
 *   ├─ nav (SidebarItem x6)      ├─ thread (scrolls, 760 wide, centred, gap 20)
 *   ├─ Pinned + Recents          │   ├─ AiMessage role="user"
 *   │   (GroupLabel + SubItem)   │   ├─ ReasoningTrace
 *   └─ SidebarFooter             │   ├─ ToolCall
 *                                │   ├─ AiMessage (assistant)
 *                                │   └─ SuggestionChip (follow-up) row
 *                                └─ dock: PromptComposer, ComposerOptions, a disclaimer
 *
 * It is live: send a message and it plays a reply (thinking, a tool call, then text arriving, with a ThinkingLoader pill that names the step) so the streaming states
 * show. `runDemoReply` below is that script; replace it with your model's stream.
 */

import React from 'react';
import { IconChevronDown } from '../../icons/outline/chevron-down';
import { IconDots } from '../../icons/outline/dots';
import { iconStrokeWidth } from '../../lib/iconStrokeWidth';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { AiMessage } from '../../components/AiMessage';
import { ReasoningTrace } from '../../components/ReasoningTrace';
import { ToolCall } from '../../components/ToolCall';
import { ThinkingLoader } from '../../components/ThinkingLoader';
import { SuggestionChip } from '../../components/SuggestionChip';
import { PromptComposer } from '../../components/PromptComposer';
import { AiSidebar } from './parts/AiSidebar';
import { ComposerOptions } from './parts/ComposerOptions';
import styles from './AiChatBlock.module.css';

/* ------------------------------------------------------------------ *
 * Sample data - replace with your own
 * ------------------------------------------------------------------ */
interface Turn {
  id: number;
  prompt: string;
  /** thinking: lines arriving; tool: a call running; writing: the reply arriving; done */
  phase: 'thinking' | 'tool' | 'writing' | 'done';
  lines: string[];
  elapsed: number;
  summary: string;
  toolRunning: boolean;
  reply: string[];
  followUps: string[];
}

const SEED: Turn = {
  id: 0,
  prompt: 'Which deals need a follow-up this week?',
  phase: 'done',
  lines: [
    'Looking at which deals changed stage in the last seven days.',
    'Three moved forward. Acme went quiet after the proposal and Globex asked for a quote.',
    'Checking when each of them was last contacted.',
    'Drafting a short follow-up for each one.',
  ],
  elapsed: 6,
  summary: 'Compared deal stages and found two to chase',
  toolRunning: false,
  reply: [
    'Your pipeline looks healthy. Three deals moved forward this week, and two of them are worth a closer look before Friday:',
    '1. Acme Corp, silent since the proposal went out on Monday.',
    '2. Globex, asked for a revised quote on the annual plan.',
    'I can draft a follow-up for each one if you’d like.',
  ],
  followUps: ['Draft the follow-ups', 'Show stalled deals'],
};

const DEMO_THOUGHTS = [
  'They want the Q4 pipeline in a few lines, with the deals at risk called out. I should start from the opportunities closing this quarter, not the whole pipeline.',
  'Acme has a $48,000 renewal and no reply since the proposal went out nine days ago. That silence is the biggest risk. Globex asked for a revised quote, so it is moving, just slowly.',
  'Before I answer I will check the latest activity in the CRM, so the dates are right.',
];
const DEMO_REPLY = 'Here is what I found. Two accounts need attention before Friday, and one renewal is already signed. I can draft the messages or pull the full activity timeline for either account, whichever you would like next.';

/** Demo timing in ms. Real-time feel; shorten to speed the demo up. */
const T = { firstLine: 1200, thinkWord: 60, paragraph: 700, tool: 3200, word: 70 };

const TOOL_INPUT = { query: 'Acme Corp', limit: 5 };
const TOOL_OUTPUT = { results: 3, top: 'Acme Corp (Enterprise, $48,000)', lastContact: '9 days ago' };

/* ------------------------------------------------------------------ *
 * The block
 * ------------------------------------------------------------------ */
export interface AiChatBlockProps {
  className?: string;
}

export const AiChatBlock: React.FC<AiChatBlockProps> = ({ className }) => {
  const [turns, setTurns] = React.useState<Turn[]>([SEED]);
  const [streaming, setStreaming] = React.useState(false);
  const timers = React.useRef<number[]>([]);
  const scroller = React.useRef<HTMLDivElement>(null);
  const seq = React.useRef(1);

  React.useEffect(() => () => timers.current.forEach(window.clearTimeout), []);
  // keep the newest turn in view as it grows
  React.useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  const patch = (id: number, p: Partial<Turn>) => setTurns((t) => t.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const at = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };

  /** The demo reply: lines arrive, a tool runs, then the answer is typed in. Replace with your model's stream. */
  const runDemoReply = (prompt: string) => {
    const id = seq.current++;
    setStreaming(true);
    setTurns((t) => [...t, { id, prompt, phase: 'thinking', lines: [], elapsed: 0, summary: 'Checked the CRM and wrote an answer', toolRunning: false, reply: [], followUps: [] }]);
    const started = performance.now();
    const tick = window.setInterval(() => patch(id, { elapsed: (performance.now() - started) / 1000 }), 100);
    // real-time pacing: the reasoning streams in word by word with a breath between paragraphs, a tool call takes a few
    // seconds, then the answer arrives at reading speed
    let cursor = T.firstLine;
    DEMO_THOUGHTS.forEach((para, p) => {
      const words = para.split(' ');
      words.forEach((_, w) => {
        const lines = [...DEMO_THOUGHTS.slice(0, p), words.slice(0, w + 1).join(' ')];
        at(cursor, () => patch(id, { lines }));
        cursor += T.thinkWord;
      });
      cursor += T.paragraph;
    });
    const toolAt = cursor;
    at(toolAt, () => { window.clearInterval(tick); patch(id, { phase: 'tool', toolRunning: true, elapsed: Math.round((performance.now() - started) / 1000) }); });   // thinking ends here, so the timer stops
    at(toolAt + T.tool, () => patch(id, { toolRunning: false }));
    at(toolAt + T.tool + 300, () => patch(id, { phase: 'writing' }));
    const words = DEMO_REPLY.split(' ');
    const writeAt = toolAt + T.tool + 400;
    words.forEach((_, i) => at(writeAt + i * T.word, () => patch(id, { reply: [words.slice(0, i + 1).join(' ')] })));
    at(writeAt + words.length * T.word + 300, () => {
      window.clearInterval(tick);
      patch(id, { phase: 'done', followUps: ['Draft the messages', 'Show the activity timeline'] });
      setStreaming(false);
    });
  };

  const stop = () => {
    timers.current.forEach(window.clearTimeout); timers.current = [];
    setTurns((t) => t.map((x) => (x.phase === 'done' ? x : { ...x, phase: 'done', toolRunning: false })));
    setStreaming(false);
  };

  const [draft, setDraft] = React.useState('');
  const send = (text: string) => { if (streaming) return; setDraft(''); runDemoReply(text); };
  const last = turns[turns.length - 1];

  return (
    <div className={[styles.block, className ?? ''].filter(Boolean).join(' ')}>
      <AiSidebar activeChat="Pipeline review" />
      <main className={styles.main}>
        <header className={styles.top}>
          <button type="button" className={styles.title} aria-haspopup="menu">
            <span>Pipeline review</span>
            <IconChevronDown size={12} strokeWidth={iconStrokeWidth(12)} aria-hidden="true" />
          </button>
          <div className={styles.actions}>
            <Button variant="ghost" size="sm">Share</Button>
            <IconButton icon={IconDots} variant="ghost" size="sm" aria-label="More" />
          </div>
        </header>

        <div ref={scroller} className={styles.scroll}>
          <div className={styles.thread}>
            {turns.map((t) => {
              const thinking = t.phase === 'thinking';
              const showTool = t.id === 0 || t.phase !== 'thinking';
              return (
                <React.Fragment key={t.id}>
                  <AiMessage role="user">{t.prompt}</AiMessage>
                  <ReasoningTrace status={thinking ? 'streaming' : 'done'} elapsed={t.elapsed} summary={t.summary}>
                    {t.lines.map((l, i) => <p key={i}>{l}</p>)}
                  </ReasoningTrace>
                  {showTool && (
                    <ToolCall
                      status={t.toolRunning ? 'running' : 'done'}
                      name="search_crm"
                      args={'(query="Acme Corp")'}
                      duration={t.toolRunning ? undefined : '1.2s'}
                      input={TOOL_INPUT}
                      output={t.toolRunning ? undefined : TOOL_OUTPUT}
                    />
                  )}
                  {(t.id === 0 || t.phase === 'writing' || t.phase === 'done') && (
                    <AiMessage streaming={t.phase === 'writing'}>
                      {t.reply.map((p, i) => <p key={i}>{p}</p>)}
                    </AiMessage>
                  )}
                  {t.phase === 'done' && t === last && t.followUps.length > 0 && (
                    <div className={styles.followUps}>
                      {t.followUps.map((f) => <SuggestionChip key={f} label={f} onClick={() => send(f)} />)}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
            {streaming && last.phase !== 'thinking' && (
              <div className={styles.status}><ThinkingLoader label={last.phase === 'tool' ? 'Searching the CRM' : 'Writing response'} /></div>
            )}
          </div>
        </div>

        <div className={styles.dock}>
          <div className={styles.composer}>
            <PromptComposer
              value={draft}
              onValueChange={setDraft}
              placeholder="Reply to Sakani…"
              status={streaming ? 'streaming' : 'idle'}
              onSubmit={send}
              onStop={stop}
              onAttach={() => {}}
              onVoice={() => {}}
            />
            <ComposerOptions />
            <p className={styles.disclaimer}>Sakani AI can make mistakes. Check important information.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AiChatBlock;

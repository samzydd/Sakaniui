import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ChatOrb } from './ChatOrb';
import { AiMessage } from '../AiMessage';

const meta = {
  title: 'AI/Chat Orb',
  component: ChatOrb,
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: `The AI's face: a soft white sphere with two black eyes, the assistant avatar in AiMessage.

- **look**: the eyes turn toward the pointer anywhere on the page, a little further the further away it is, and ease rather than snap.
- **thinking**: while the AI works the eyes stop following the pointer and sweep slowly from side to side, looking a little up, pausing at each end.
- **glance**: when the response arrives the eyes turn toward the text (right), hold 1.4s, then look straight and go back to following the pointer.
- **squint**: with the pointer over the orb the eyes narrow; they open when it leaves.
- **blink**: every 3 to 6 seconds the eyes close to a dash for about 140ms (now and then twice).
- Decorative by default; pass \`label\` to expose it as an image. Reduced motion, \`look={false}\` and touch leave the eyes straight ahead.
- \`size\` is the diameter in px; the default 28 is the AiMessage avatar.` } } },
  args: { size: 28 },
  decorators: [(S) => <div style={{ padding: 48, background: '#000', borderRadius: 16 }}><S /></div>],
} satisfies Meta<typeof ChatOrb>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
/** The size used for a launcher or greeting. */
export const Large: Story = { args: { size: 96 } };
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      {[20, 28, 40, 64, 96].map((s) => <ChatOrb key={s} size={s} />)}
    </div>
  ),
};
/** The AI is working: the eyes sweep side to side. */
export const Thinking: Story = { args: { size: 96, thinking: true } };
const GlanceDemo = () => {
  const [on, setOn] = React.useState(false);
  React.useEffect(() => { const i = setInterval(() => setOn((v) => !v), 3200); return () => clearInterval(i); }, []);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#fff', font: '500 14px system-ui' }}>
      <ChatOrb size={56} glance={on} look={false} />
      <span style={{ opacity: on ? 1 : 0.3, transition: 'opacity 300ms' }}>The response arrives</span>
    </div>
  );
};
/** The response turns on and off: the eyes glance right at the text, hold, then look straight. */
export const Glance: Story = { render: () => <GlanceDemo /> };
export const Still: Story = { args: { size: 96, look: false, blink: false } };
/** As the assistant avatar. */
export const InAMessage: Story = {
  decorators: [(S) => <div className="dark" style={{ width: 420, color: '#fff' }}><S /></div>],
  render: () => <AiMessage>Two accounts need attention before Friday.</AiMessage>,
};

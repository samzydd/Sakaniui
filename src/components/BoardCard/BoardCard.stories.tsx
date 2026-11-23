import type { Meta, StoryObj } from '@storybook/react';
import { IconCalendar as Calendar } from '../../icons/outline/calendar';
import { IconMessage as MessageSquare } from '../../icons/outline/message';
import { IconFlag as Flag } from '../../icons/outline/flag';
import { IconBuilding as Building2 } from '../../icons/outline/building';
import { IconAlertCircle as CircleAlert } from '../../icons/outline/alert-circle';
import { BoardCard } from './BoardCard';
import { Badge } from '../Badge';
import { Checkbox } from '../Checkbox';
import { CardMetaItem } from '../CardMetaItem';
import { AvatarGroup } from '../AvatarGroup';
import { Avatar } from '../Avatar';

const meta = {
  title: 'Composite/Board Card',
  component: BoardCard,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `Flexible board/list card. Matches the Figma "Board Card" set:

type (Figma "Type" axis) -> compact | default | cover
state (Figma "State" axis) -> default | hover | selected | dragging | done

Content type is NOT a variant — the leading slot, tags, and meta items are
composed by the caller, so the same card expresses tasks, deals, files,
bugs, or applicants. See the presets in the stories.

Regions (top→bottom): cover (cover type) · header (leading + title +
trailing) · description (non-compact) · tags (non-compact) · footer
(meta items + avatars), separated by a hairline divider.` } } },
  argTypes: {
    type: { control: 'inline-radio', options: ['compact', 'default', 'cover'] },
    state: { control: 'select', options: ['default', 'hover', 'selected', 'dragging', 'done'] },
  },
} satisfies Meta<typeof BoardCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Task: Story = {
  args: {
    type: 'default',
    leading: <Checkbox />,
    title: 'Design system update',
    trailing: <Flag size={14} color="var(--color-warning-fg)" />,
    description: 'Enhance component consistency and usability',
    tags: <><Badge variant="accent">Design</Badge><Badge variant="neutral">Product</Badge></>,
    meta: <><CardMetaItem icon={<Calendar size={13} />}>Jan 25</CardMetaItem><CardMetaItem icon={<MessageSquare size={13} />}>4</CardMetaItem></>,
    assignees: <AvatarGroup size="sm" max={3} avatars={[{ initials: 'AB' }, { initials: 'KO' }, { initials: 'MR' }, { initials: 'JD' }, { initials: 'PT' }]} />,
  },
};
export const Deal: Story = {
  args: {
    leading: <Building2 size={18} color="var(--color-fg-muted)" />,
    title: 'Acme Inc — Enterprise',
    description: 'Annual contract, 120 seats · $48,000',
    tags: <Badge variant="warning">Negotiation</Badge>,
    meta: <CardMetaItem icon={<Calendar size={13} />}>Closes Feb 2</CardMetaItem>,
    assignees: <Avatar size="sm" initials="KO" />,
  },
};
export const Bug: Story = {
  args: {
    leading: <CircleAlert size={18} color="var(--color-danger-fg)" />,
    title: 'Checkout fails on Safari',
    description: 'Payment sheet does not dismiss after success',
    tags: <><Badge variant="danger">Critical</Badge><Badge variant="neutral">Payments</Badge></>,
    assignees: <AvatarGroup size="sm" max={2} avatars={[{ initials: 'AB' }, { initials: 'MR' }]} />,
  },
};
/** With `onMoveNext` / `onMoveBack` the card gets a round button on each edge. Hover or focus the card to see them; hover a
 * button and it opens into a pill that names the stage. Alt + → / Alt + ← do the same from the keyboard. (Figma: State=Move.) */
export const MoveToStage: Story = {
  args: {
    ...Task.args,
    onMoveNext: () => {},
    nextLabel: 'In progress',
    nextColor: 'var(--color-chart-2)',
    onMoveBack: () => {},
    backLabel: 'To-do',
    backColor: 'var(--color-chart-1)',
  },
  decorators: [(S) => (<div style={{ padding: '24px 40px' }}><S /></div>)],
};

export const Done: Story = {
  args: { ...Task.args, state: 'done', leading: <Checkbox defaultChecked /> },
};

export const Cover: Story = {
  args: {
    type: 'cover',
    cover: <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--color-chart-1), var(--color-chart-3))' }} />,
    leading: <Checkbox />,
    title: 'Q3 brand assets',
    tags: <Badge variant="accent">Brand</Badge>,
    meta: <CardMetaItem icon={<Calendar size={13} />}>2d ago</CardMetaItem>,
    assignees: <AvatarGroup size="sm" max={3} avatars={[{ initials: 'AB' }, { initials: 'KO' }, { initials: 'MR' }, { initials: 'JD' }, { initials: 'PT' }]} />,
  },
};

export const DarkMode: Story = {
  args: Task.args,
  decorators: [(S) => (<div className="dark" style={{ background: 'var(--color-bg-canvas)', padding: 24 }}><S /></div>)],
};

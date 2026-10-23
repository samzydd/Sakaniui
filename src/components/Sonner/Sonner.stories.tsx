import React, { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Toaster, type ToasterProps } from './Sonner';
import { toast } from './state';
import { Button } from '../Button';

/* No autodocs page: every story mounts its own fixed Toaster, and a docs page would render them all at once. */
const meta = {
  title: 'Composite/Sonner',
  component: Toaster,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: `An opinionated toast stack: mount one <Toaster /> and call toast() from anywhere.
Matches the Figma ↳ Sonner page (Sonner, Sonner Stack, Sonner Position).` } },
  },
  argTypes: {
    position: { control: 'select', options: ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] },
  },
  args: { position: 'bottom-right', richColors: false, closeButton: false, expand: false, visibleToasts: 3, duration: 4000 },
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

const Stage = ({ children }: { children: React.ReactNode }) => (
  <div style={{ minHeight: '100vh', padding: 40, display: 'flex', flexWrap: 'wrap', gap: 8, alignContent: 'flex-start', background: 'var(--color-bg-canvas)' }}>
    {children}
  </div>
);

const event = { description: 'Monday, January 3rd at 6:00pm' };

/** The reference recording: three toasts arrive and pile up. Hover the pile to spread it, drag the front toast down and let go. */
export const Stack: Story = {
  args: { duration: Infinity },
  render: (args: ToasterProps) => {
    useEffect(() => {
      toast.dismiss();
      const timers = [0, 900, 1800].map((t, i) => window.setTimeout(() => toast('Event has been created', { ...event, id: `stack-${i}` }), 300 + t));
      return () => { timers.forEach(window.clearTimeout); toast.dismiss(); };
    }, []);
    return (
      <Stage>
        <Button variant="secondary" onClick={() => toast('Event has been created', event)}>Add a toast</Button>
        <Button variant="ghost" onClick={() => toast.dismiss()}>Clear</Button>
        <Toaster {...args} />
      </Stage>
    );
  },
};

/** The row of type buttons, plus Expanded (spreads the stack out, adding a few toasts if there are none) and Clear. */
const TypeButtons = (args: ToasterProps) => {
  const [expanded, setExpanded] = React.useState(false);
  const toggleExpanded = () => {
    if (!expanded && document.querySelectorAll('ol[data-y-position] > li').length < 2) {
      ['Event has been created', 'Your changes have been saved', 'Invitation sent'].forEach((title, i) => {
        window.setTimeout(() => toast(title, { ...event, id: `expanded-demo-${i}` }), 80 + i * 150);
      });
    }
    setExpanded((v) => !v);
  };
  return (
    <Stage>
      <Button variant="secondary" onClick={() => toast('Event has been created', event)}>Default</Button>
      <Button variant="secondary" onClick={() => toast.success('Event has been created', event)}>Success</Button>
      <Button variant="secondary" onClick={() => toast.info('Be at the area 10 minutes before the event time')}>Info</Button>
      <Button variant="secondary" onClick={() => toast.warning('Event start time cannot be earlier than 8am')}>Warning</Button>
      <Button variant="secondary" onClick={() => toast.error('Event has not been created')}>Error</Button>
      <Button variant="secondary" onClick={() => toast.loading('Uploading file…', { description: 'report-q3.pdf' })}>Loading</Button>
      <Button variant={expanded ? 'primary' : 'secondary'} onClick={toggleExpanded}>Expanded</Button>
      <Button variant="ghost" onClick={() => toast.dismiss()}>Clear</Button>
      <Toaster {...args} expand={expanded || args.expand} duration={expanded ? Infinity : args.duration} />
    </Stage>
  );
};

/** Every type. Turn on richColors in the controls to tint them. */
export const Types: Story = {
  render: (args: ToasterProps) => <TypeButtons {...args} />,
};

export const RichColors: Story = { ...Types, args: { richColors: true } };

/** Action, cancel and the close button. */
export const Buttons: Story = {
  args: { closeButton: true },
  render: (args: ToasterProps) => (
    <Stage>
      <Button variant="secondary" onClick={() => toast('Event has been created', { ...event, action: { label: 'Undo', onClick: () => toast('Undone') } })}>Action</Button>
      <Button variant="secondary" onClick={() => toast.info('Delete 3 files?', { description: 'Today at 6:00pm', cancel: { label: 'Cancel' }, action: { label: 'Confirm', onClick: () => toast.success('Deleted') } })}>Action and cancel</Button>
      <Button variant="secondary" onClick={() => toast.error('Upload failed', { description: 'The file is larger than 10 MB', action: { label: 'Retry', onClick: () => {} }, richColors: true })}>Rich error</Button>
      <Toaster {...args} />
    </Stage>
  ),
};

/** toast.promise: loading, then success or error from the same toast. */
export const Promise_: Story = {
  name: 'Promise',
  render: (args: ToasterProps) => (
    <Stage>
      <Button variant="secondary" onClick={() => toast.promise(new Promise<{ name: string }>((r) => setTimeout(() => r({ name: 'Sonner' }), 2000)), {
        loading: 'Loading…', success: (d) => `${d.name} has been added`, error: 'Error',
      })}>Resolves</Button>
      <Button variant="secondary" onClick={() => toast.promise(new Promise((_, reject) => setTimeout(() => reject(new Error('Network')), 2000)), {
        loading: 'Saving…', success: 'Saved', error: (e) => `Could not save: ${(e as Error).message}`,
      })}>Rejects</Button>
      <Toaster {...args} />
    </Stage>
  ),
};

/** Six positions. Change `position` in the controls, then add toasts. */
export const Positions: Story = {
  args: { position: 'top-center' },
  render: (args: ToasterProps) => (
    <Stage>
      <Button variant="secondary" onClick={() => toast('Event has been created', event)}>Add a toast</Button>
      <Toaster {...args} />
    </Stage>
  ),
};

export const Expanded: Story = { ...Stack, args: { expand: true, duration: Infinity } };

/** Dark mode: the .dark class flips the semantic tokens; nothing in the component changes. Same buttons as Types, including Expanded. */
export const DarkMode: Story = {
  decorators: [(S) => <div className="dark"><S /></div>],
  render: (args: ToasterProps) => <TypeButtons {...args} />,
};

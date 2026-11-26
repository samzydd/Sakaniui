import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ShareBlock } from './ShareBlock';
import { SAMPLE_DIRECTORY, SAMPLE_OWNER } from './sample';

const meta = {
  title: 'Blocks/Collaboration/Share',
  component: ShareBlock,
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: `A Share panel for a document, note or board: the access row (anyone with the link, or invited people only), an invite field that turns e-mail addresses into people, the people who have access with Remove, and the link with Copy link. Every part opens and closes by height. Use it where a dialog or popover would go; it is a 420px card.

Type an address and press comma or Enter to add a person (try \`chloe.wu@acme.com\` or \`marco.diaz@acme.com\`, which the sample directory knows), then Invite.` } } },
  args: {
    subtitle: 'Enterprise roadmap · Note 453',
    owner: SAMPLE_OWNER,
    link: 'https://acme.com/enterprise/note/453',
    directory: SAMPLE_DIRECTORY,
  },
} satisfies Meta<typeof ShareBlock>;

export default meta;

// Stories frame the card themselves (decorators stack rather than replace, so the meta can not do it for them all).
const framed = [(S: React.ComponentType) => <div style={{ width: 420, maxWidth: '100%' }}><S /></div>];
type Story = StoryObj<typeof meta>;

export const Default: Story = { decorators: framed };
export const InvitedOnly: Story = { decorators: framed, args: { defaultAccess: 'invited' } };
export const WithPeople: Story = { decorators: framed, args: { defaultAccess: 'invited', defaultPeople: [...SAMPLE_DIRECTORY].reverse() } };

/** `onInvite` returns a promise: the button says "Sending" until it settles; if it rejects the people stay in the field. */
export const FailingInvite: Story = {
  decorators: framed,
  args: { defaultAccess: 'invited', onInvite: () => new Promise((_, reject) => setTimeout(reject, 900)) },
};

export const DarkMode: Story = {
  args: { defaultAccess: 'invited', defaultPeople: [...SAMPLE_DIRECTORY].reverse() },
  decorators: [(S) => <div className="dark" style={{ padding: 20, background: 'var(--color-bg-canvas)' }}><div style={{ width: 420, maxWidth: '100%' }}><S /></div></div>],
};

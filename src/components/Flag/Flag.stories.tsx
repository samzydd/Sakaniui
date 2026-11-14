import type { Meta, StoryObj } from '@storybook/react';
import { Flag } from './Flag';

const meta = {
  title: 'Core/Flag',
  component: Flag,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A country flag from the Figma "Flags" set. Pick the country by its ISO 3166-1 alpha-2 code (\`country="JP"\`). 16px beside text, 32px beside a heading. Decorative unless you pass \`label\`; put the country's name in text beside it.

Flags the library uses are imported (GB, SG, JP, IN, AU); one that is not yet draws a neutral placeholder of the same shape, so nothing shifts. The Figma set has 254, and each is added by dropping its exported SVG markup into \`flags.ts\`.`,
      },
    },
  },
  args: { country: 'GB', size: 16 },
} satisfies Meta<typeof Flag>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Large: Story = { args: { country: 'JP', size: 32 } };

/** Beside text, the way the Live Map block uses it: the flag, then the name. */
export const BesideText: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, font: '500 14px/20px var(--font-sans)', color: 'var(--color-fg-default)' }}>
      {([['GB', 'London'], ['SG', 'Singapore'], ['JP', 'Tokyo'], ['IN', 'Mumbai'], ['AU', 'Sydney']] as const).map(([c, n]) => (
        <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Flag country={c} />{n}</span>
      ))}
    </div>
  ),
};

/** A country whose artwork is not imported yet. */
export const Placeholder: Story = { args: { country: 'ZZ', size: 32 } };

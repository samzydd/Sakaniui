import type { Meta, StoryObj } from '@storybook/react';
import { CheckoutFlowBlock } from './CheckoutFlowBlock';
import mug from '../../assets/products/card-mug.jpg';

const items = [
  { image: mug, name: 'Ceramic Pour-Over Mug', variant: 'Color: Sand', price: 28, quantity: 1 },
];

const meta = {
  title: 'Blocks/E-commerce/Checkout Flow',
  component: CheckoutFlowBlock,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `A COMPOSITION EXAMPLE, not a configurable component. Copy this file into
your project and edit it directly: wire the form submissions to your
real shipping/payment APIs in place of the simulated flow here.

Matches Figma "Checkout Flow" (2 states: Shipping, Payment) -- both are
really just this block's own \`step\` state at different values, not a
manual style prop, same "derive from data" pattern used throughout this
library. Composed entirely from components already in this library:
CheckoutSteps (E-commerce), Input, Button, Divider, and CartItem
(E-commerce, already wired to the real QuantitySelector) for the order
summary's line item.

CheckoutSteps' own 4 fixed steps (Cart/Shipping/Payment/Confirmation)
cover more ground than this block owns -- Cart and Confirmation are
separate blocks in this same set -- so this block's \`step\` maps onto
CheckoutSteps' \`currentStep\` at index 1 (Shipping) or 2 (Payment) only.

The order summary reflects real, live cart state (quantity changes on
the CartItem actually recompute the subtotal/total below it), not
static numbers -- same reasoning as every other block's demo state
being genuinely wired rather than decorative.` } } },
  args: { items },
  // The block is a size container (it lays itself out by its own width), so it needs a definite width from its
  // parent; the centered canvas only shrink-wraps. Its Figma width on a desktop; on a phone the canvas caps it to the screen.
  decorators: [(S) => <div style={{ width: 960, maxWidth: '100%' }}><S /></div>],
} satisfies Meta<typeof CheckoutFlowBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Shipping: Story = {};
export const Payment: Story = { args: { initialStep: 'payment' } };

export const DarkMode: Story = {
  decorators: [(S) => <div className="dark"><S /></div>],
};

import type { Meta, StoryObj } from '@storybook/react';
import { ProductDetailBlock } from './ProductDetailBlock';
import mug from '../../assets/products/card-mug.jpg';

const images = [
  { src: mug, alt: 'Ceramic Pour-Over Mug' },
  { src: mug, alt: 'Ceramic Pour-Over Mug, angle 2' },
  { src: mug, alt: 'Ceramic Pour-Over Mug, angle 3' },
  { src: mug, alt: 'Ceramic Pour-Over Mug, angle 4' },
];

const colors = [
  { label: 'Navy', color: '#1B284D' },
  { label: 'Brown', color: '#6F4E37' },
  { label: 'Grey', color: '#9CA3AF' },
];

const sizes = [
  { size: 'S' },
  { size: 'M' },
  { size: 'L' },
];

const meta = {
  title: 'Blocks/E-commerce/Product Detail',
  component: ProductDetailBlock,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `A COMPOSITION EXAMPLE, not a configurable component. Copy this file into
your project and edit it directly: wire "Add to cart" to your real cart
state/API in place of the callback here.

Matches Figma "Product Detail". Composed entirely from
components already in this library: ProductGallery, WishlistButton,
StarRating, StockStatus, PriceDisplay, ColorSwatch, SizeSelector,
QuantitySelector, Button, and Divider -- this block is purely layout +
wiring, no new visual primitives of its own (StarRating was the one
piece genuinely missing from the library, since Figma's Star Rating had
no matching component yet -- built alongside this block, not invented
ad hoc inside it, so it's reusable everywhere else a rating shows up).

Color/size selection and quantity are genuinely live, wired state (not
decorative) -- picking a color updates the "Color: {label}" text above
the swatches, same for size, matching Figma's own labeled-row behavior
where the label reflects whatever's currently selected.` } } },
  args: {
    name: 'Ceramic Pour-Over Mug',
    images,
    rating: 4.9,
    reviewCount: 2300,
    stockQuantity: 24,
    price: 28,
    description: "A hand-thrown ceramic mug designed for slow mornings. Wide mouth for easy pouring, comfortable handle, dishwasher safe.",
    colors,
    sizes,
    defaultColor: 'Navy',
    defaultSize: 'M',
  },
  // The block is a size container (it lays itself out by its own width), so it needs a definite width from its
  // parent; the centered canvas only shrink-wraps. Its Figma width on a desktop; on a phone the canvas caps it to the screen.
  decorators: [(S) => <div style={{ width: 1100, maxWidth: '100%' }}><S /></div>],
} satisfies Meta<typeof ProductDetailBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OnSale: Story = {
  args: { price: 22, compareAtPrice: 28 },
};

export const LowStock: Story = {
  args: { stockQuantity: 3 },
};

export const DarkMode: Story = {
  decorators: [(S) => <div className="dark"><S /></div>],
};

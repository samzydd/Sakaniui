import type { Meta, StoryObj } from '@storybook/react';
import { ProductGridBlock } from './ProductGridBlock';
import mug from '../../assets/products/card-mug.jpg';
import tableRunner from '../../assets/products/card-table-runner.jpg';
import servingBoard from '../../assets/products/card-serving-board.jpg';

const mugColors = [
  { label: 'Navy', color: '#1B284D' },
  { label: 'Bone', color: '#F5F4F2', selected: true },
  { label: 'Periwinkle', color: '#8E9FE8' },
  { label: 'Magenta', color: '#C6197A' },
];

const boardColors = [
  { label: 'Natural', color: '#DDD0BC' },
  { label: 'Amber', color: '#D2691E', selected: true },
  { label: 'Lilac', color: '#D9CBE8' },
  { label: 'Rose', color: '#E5A0B8' },
];

const products = [
  {
    id: 'mug',
    image: mug,
    name: 'Ceramic Pour-Over Mug',
    description: 'Handcrafted from natural stoneware clay, this minimal pour-over mug features a built-in ceramic dripper for slow, single-cup brewing. Dishwasher safe and made to last.',
    price: 28,
    rating: 5,
    colors: mugColors,
  },
  {
    id: 'runner',
    image: tableRunner,
    name: 'Linen Table Runner',
    description: 'Woven from 100% European flax linen, this table runner adds effortless texture to any setting. Pre-washed for a soft, lived-in drape. Machine washable and naturally durable.',
    price: 34,
    compareAtPrice: 48,
    rating: 5,
    colors: mugColors,
  },
  {
    id: 'board',
    image: servingBoard,
    name: 'Oak Serving Board',
    description: 'A brief description of an oak serving board for an e-commerce store',
    price: 56,
    rating: 5,
    inStock: false,
    colors: boardColors,
  },
  {
    id: 'mug-2',
    image: mug,
    name: 'Ceramic Pour-Over Mug',
    description: 'Handcrafted from natural stoneware clay, this minimal pour-over mug features a built-in ceramic dripper for slow, single-cup brewing. Dishwasher safe and made to last.',
    price: 28,
    rating: 5,
    colors: mugColors,
  },
];

const meta = {
  title: 'Blocks/E-commerce/Product Grid',
  component: ProductGridBlock,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `A COMPOSITION EXAMPLE, not a configurable component. Copy this file into
your project and edit it directly: wire "Add Item"/wishlist/sort to your
real cart/catalog state in place of the callbacks here.

Matches Figma "Product Grid" (node 1658:29889, 2 states: Default, With
Filters). Composed entirely from existing library components --
SectionHeading (Marketing, the "Shop" eyebrow + title + subtitle --
this block used to build that shape inline before SectionHeading
existed as its own component; now reuses it instead of keeping a
second copy to drift out of sync), Button (the "Sort" control), and
ProductCard (E-commerce set, already covering the card's own image/
rating/price/sale-badge/out-of-stock/swatches/button treatment) -- no
new visual primitives, this block is purely heading + filter bar +
grid layout.

Whether the filter bar (product count + Sort button) renders is a real
layout choice (Figma's "With Filters" style), not something derivable
from the product data -- \`showFilterBar\` stays an explicit prop. The
product COUNT itself, though, is derived from \`products.length\` rather
than a separate manual prop, same "derive from data" reasoning used
throughout this library.

Figma's own two states actually disagree on the grid's gap (8px in
Default, 24px in With Filters) -- a real inconsistency between two
separately-authored example states, not an intentional feature (a
grid's spacing can't sensibly depend on whether a filter bar happens to
render above it). This block uses 8px everywhere, matching Default.

Wishlist and color-swatch selection are real wired state, per card, not
decorative -- ProductCard's \`wishlisted\`/\`colors[].selected\` are
controlled props, so without this the heart and swatches would render
but visibly do nothing when clicked. Keyed by each product's id/name
rather than one shared piece of state, since selecting a color on one
card must never affect another card's own selection.` } } },
  args: {
    title: 'New arrivals',
    subtitle: 'Thoughtfully made home goods, restocked every week.',
    products,
  },
  // The block is a size container (it lays itself out by its own width), so it needs a definite width from its
  // parent; the centered canvas only shrink-wraps. Its Figma width on a desktop; on a phone the canvas caps it to the screen.
  decorators: [(S) => <div style={{ width: 1280, maxWidth: '100%' }}><S /></div>],
} satisfies Meta<typeof ProductGridBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithFilters: Story = {
  args: { showFilterBar: true },
};

export const DarkMode: Story = {
  args: { showFilterBar: true },
  decorators: [(S) => <div className="dark"><S /></div>],
};

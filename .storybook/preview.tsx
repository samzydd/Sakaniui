import "@fontsource-variable/geist";
import "../src/styles/tokens.css";
import "./preview.css";
import type { Preview } from '@storybook/react-vite'

const preview: Preview = {
  parameters: {
    // Centre every story in the canvas. Stories that need the full width
    // (blocks, Top Bar) override this with `layout: 'fullscreen'`.
    layout: 'centered',

    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;
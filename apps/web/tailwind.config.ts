import { mapeandoPreset } from '@mapeando/design-tokens/tailwind-preset';
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  presets: [mapeandoPreset as Config],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;

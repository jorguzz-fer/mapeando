import type { Config } from 'tailwindcss';
import { tokens } from './index.js';

/** Preset Tailwind compartilhável — encapsula os tokens da marca. */
export const mapeandoPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        brand: tokens.colors.brand,
        cobertura: tokens.colors.cobertura,
        score: tokens.colors.score,
      },
      fontFamily: {
        sans: [...tokens.fontFamily.sans],
      },
      borderRadius: {
        card: tokens.radius.card,
      },
    },
  },
};

export default mapeandoPreset;

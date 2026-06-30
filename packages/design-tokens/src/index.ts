/** Tokens de design do Mapeando (cor/tipografia/espaçamento). */
export const tokens = {
  colors: {
    // Marca: azul "mapa" + verde "rota/oportunidade"
    brand: {
      50: '#eef6ff',
      100: '#d9ecff',
      200: '#bcddff',
      300: '#8ec6ff',
      400: '#59a6ff',
      500: '#2f84f5',
      600: '#1b66db',
      700: '#1751b1',
      800: '#18458c',
      900: '#193c73',
    },
    // Cobertura comercial (heat map): verde=atendido, amarelo=pouco, vermelho=abandonado
    cobertura: {
      alta: '#16a34a',
      media: '#f59e0b',
      baixa: '#dc2626',
    },
    score: {
      alto: '#16a34a',
      medio: '#f59e0b',
      baixo: '#9ca3af',
    },
  },
  fontFamily: {
    sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
  },
  radius: {
    card: '0.875rem',
  },
} as const;

export type Tokens = typeof tokens;

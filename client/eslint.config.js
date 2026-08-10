import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Carregar dados da API no mount é um padrão válido em providers/páginas.
      'react-hooks/set-state-in-effect': 'off',
      // Alguns módulos públicos agrupam componente e helpers usados pelo app.
      // O Vite recarrega o módulo inteiro nesses casos; mantenha o aviso sem
      // bloquear lint, build ou CI por uma limitação exclusiva do HMR.
      'react-refresh/only-export-components': 'warn',
    },
  },
]);

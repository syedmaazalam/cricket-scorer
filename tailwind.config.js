/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        serif: ['"Fraunces"', 'Georgia', 'serif'],
      },
      colors: {
        canvas: 'var(--bg)',
        canvas2: 'var(--bg2)',
        card: 'var(--card)',
        well: 'var(--well)',
        pri: 'var(--pri)',
        sec: 'var(--sec)',
        gold: 'var(--gold)',
        t1: 'var(--t1)',
        t2: 'var(--t2)',
        t3: 'var(--t3)',
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        bad: 'var(--bad)',
        bd: 'var(--bd)',
        bdin: 'var(--bdin)',
        cricket: {
          pitch: '#f59e0b',
          grass: '#15803d',
          wicket: '#dc2626',
          boundary: '#2563eb',
          gold: '#eab308'
        }
      }
    },
  },
  plugins: [],
}

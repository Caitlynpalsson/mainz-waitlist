import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

const css = `
@font-face { font-family: Inter; src: url('/fonts/Inter.ttf') format('truetype'); font-weight: 100 900; font-display: swap; }
@font-face { font-family: Scr; src: url('/fonts/MonsieurLaDoulaise-Regular.ttf') format('truetype'); font-display: swap; }
html, body, #root { height: 100%; background: #fff; }
body { margin: 0; font-family: Inter, sans-serif; color: #14213D; }
`;

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>mainz. real food from people with names.</title>
        <ScrollViewStyleReset />
        <style id="mainz" dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

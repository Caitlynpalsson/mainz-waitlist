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
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#14213D" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <title>the main course. real food from people with names.</title>
        <meta name="description" content="the main course. farms near you, with the price the farmer set." />
        <meta property="og:title" content="the main course" />
        <meta property="og:description" content="real food from people with names." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="the main course" />
        <meta name="twitter:description" content="real food from people with names." />
        <meta name="apple-mobile-web-app-title" content="main" />
        <link rel="canonical" href="https://themaincoursemarket.com/" />
        <meta property="og:url" content="https://themaincoursemarket.com/" />
        <meta property="og:site_name" content="the main course" />
        <script dangerouslySetInnerHTML={{ __html: "if(location.hostname==='www.themaincoursemarket.com')location.replace('https://themaincoursemarket.com'+location.pathname+location.search+location.hash);" }} />
        <ScrollViewStyleReset />
        <style id="mainz" dangerouslySetInnerHTML={{ __html: css }} />
        <script dangerouslySetInnerHTML={{ __html: "if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

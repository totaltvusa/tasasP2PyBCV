import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Tasas Venezuela P2P & BCV | Dólar, Euro y Binance USDT en Tiempo Real',
  description: 'Monitor en vivo de precios promedio de Binance P2P (USDT/VES) y tasas oficiales del Banco Central de Venezuela (Dólar y Euro BCV) con calculadora de conversión instantánea.',
  keywords: ['Tasa BCV', 'Dolar BCV', 'Euro BCV', 'Binance P2P Venezuela', 'USDT a Bolivares', 'Calculadora USDT', 'Precio Dolar Venezuela'],
  authors: [{ name: 'TasaP2P-BCV' }],
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#090d16',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-background text-slate-100 antialiased selection:bg-amber-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}

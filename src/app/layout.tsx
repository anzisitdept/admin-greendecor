import type { Metadata } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans, Alex_Brush } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/admin/Toast';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

const scriptFont = Alex_Brush({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-script',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Green Decor Admin — Content & Order Management',
  description: 'Admin panel for the Green Decor botanical lifestyle studio.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${jakarta.variable} ${scriptFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f4f7f2] text-[#172b21] selection:bg-[#14402a] selection:text-white">
        <ToastProvider>
          <div className="flex-1">{children}</div>
        </ToastProvider>
      </body>
    </html>
  );
}
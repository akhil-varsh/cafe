import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Savour — See it. Savour it.', description: 'Explore your next favourite dish in 3D. A more transparent cafe menu.' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}

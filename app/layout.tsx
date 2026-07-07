import './globals.css';
import React from 'react';

export const metadata = {
  title: 'KruPortfolio AI — Teacher Portfolio OS (วPA)',
  description: 'ระบบหลังบ้านและบริหารจัดการแฟ้มสะสมผลงานครูอัจฉริยะตามเกณฑ์ วPA',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen bg-[#FCFBF9] text-slate-900">
        {children}
      </body>
    </html>
  );
}

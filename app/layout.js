import './globals.css';

export const metadata = {
  title: 'カヤジュッドサイト',
  description: 'カヤジュッドサイト',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

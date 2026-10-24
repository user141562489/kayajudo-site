import './globals.css';
import AppShell from '../components/AppShell';

export const metadata = {
  title: 'カヤジュッドサイト',
  description: 'カヤジュッドサイト',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

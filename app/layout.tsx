import "./globals.css";

export const metadata = {
  title: "Biedronka Salary",
  description: "Персональный трекер зарплаты",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

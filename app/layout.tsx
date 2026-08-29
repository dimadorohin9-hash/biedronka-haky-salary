import "./globals.css";

export const metadata = {
  title: "Biedronka HAKY Salary",
  description: "Персональный трекер зарплаты",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

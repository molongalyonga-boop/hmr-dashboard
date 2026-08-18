import "./globals.css";

export const metadata = {
  title: "HMR Production Dashboard",
  description: "Live production metrics",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

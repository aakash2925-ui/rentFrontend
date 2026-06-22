import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { CartProvider } from "@/context/CartContext";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";

export const metadata = {
  title: "Zasoota Rentals",
  description: "Rent projectors, speakers, cameras, luggage, fashion and more.",
  icons: {
    icon: "/zasoota-logo.svg",
    shortcut: "/zasoota-logo.svg",
    apple: "/zasoota-logo.svg"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <CartProvider>
                <Navbar />
                <main className="min-h-screen">{children}</main>
                <Footer />
              </CartProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

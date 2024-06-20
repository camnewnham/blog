import { Inter } from "next/font/google";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Hello World",
  description: "Nothing to see here...",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex justify-center`}>
        <div className={`max-w-[1024px] m-4 sm:m-8`}>{children}</div>
      </body>
    </html>
  );
}

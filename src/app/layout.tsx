import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export const metadata: Metadata = {
  title: "Priorix | Smart Study Planner",
  description:
    "Organize your tasks, manage deadlines, and prioritize your studies with Priorix.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <Sidebar />

          <main className="main-content">
            <Topbar />
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
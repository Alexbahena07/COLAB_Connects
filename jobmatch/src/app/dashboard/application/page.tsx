"use client";

import Header from "@/components/ui/Header_with_Icons";
import Footer from "@/components/ui/Footer";

export default function DashboardEventApplicationPage() {
  return (
    <>
      <Header />
      <main className="flex min-h-screen flex-col bg-background text-foreground">
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
          <h1 className="text-3xl font-bold">Application</h1>
        </div>
      </main>
      <Footer />
    </>
  );
}

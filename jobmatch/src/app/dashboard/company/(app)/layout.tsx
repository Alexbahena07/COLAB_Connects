import Header from "@/components/ui/HeaderWithIcons";

export default function CompanyAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:h-screen md:overflow-hidden">
      <Header />
      {children}
    </div>
  );
}

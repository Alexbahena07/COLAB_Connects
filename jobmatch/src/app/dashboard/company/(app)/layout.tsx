import Header from "@/components/ui/HeaderWithIcons";

export default function CompanyAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      {children}
    </div>
  );
}

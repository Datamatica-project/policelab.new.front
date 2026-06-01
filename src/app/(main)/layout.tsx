import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="flex flex-col min-h-full">
          <div className="max-w-[1200px] w-full mx-auto px-8 pt-[60px] flex-1">
            {children}
          </div>
          <Footer />
        </div>
      </main>
    </div>
  );
}

import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex flex-col flex-1 max-w-2xl mx-auto w-full pb-20">
        {children}
      </main>
      <BottomNav />
    </>
  );
}

import SideNav from '@/components/dashboard/sidenav';
export const experimental_ppr = true;
 
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col lg:flex-row lg:overflow-hidden">
      <div className="w-full flex-none lg:w-64">
        <SideNav />
      </div>
      <div className="flex-grow p-6 lg:overflow-y-auto lg:p-12">{children}</div>
    </div>
  );
}
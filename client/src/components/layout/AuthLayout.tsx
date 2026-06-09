import { Outlet } from 'react-router-dom';
import { facultyName, systemTitle } from '../../utils/constants';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-yellow-300 bg-university-gold">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-bold text-university-maroon">UoR</div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-university-ink">{systemTitle}</h1>
            <p className="text-sm font-medium text-university-maroon">{facultyName}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-bold text-university-maroon">FoE</div>
        </div>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-81px)] max-w-6xl items-center justify-center px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

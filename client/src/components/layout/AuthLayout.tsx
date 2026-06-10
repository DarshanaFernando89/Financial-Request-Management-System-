import { Outlet } from 'react-router-dom';
import facultyLogo from '../../assets/logos/faculty-logo.png';
import universityLogo from '../../assets/logos/university-logo.png';
import { facultyName, systemTitle } from '../../utils/constants';

export function AuthLayout() {
  const displayFacultyName = facultyName.replace(', ', ',');

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-[#d7a41b] bg-[#f6c235]">
        <div className="relative flex min-h-[120px] items-center justify-center px-20 py-3 sm:min-h-[154px] sm:px-32 md:px-40">
          <img
            src={universityLogo}
            alt="University of Ruhuna logo"
            className="absolute left-3 h-20 w-auto object-contain sm:left-8 sm:h-[132px]"
          />
          <div className="min-w-0 text-center text-black">
            <h1 className="text-xl font-normal leading-tight sm:text-[34px]">{systemTitle}</h1>
            <p className="mt-1 text-sm font-normal leading-tight sm:text-[22px]">{displayFacultyName}</p>
          </div>
          <img
            src={facultyLogo}
            alt="Faculty of Engineering logo"
            className="absolute right-3 h-20 w-auto object-contain sm:right-8 sm:h-[132px]"
          />
        </div>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-120px)] max-w-6xl items-center justify-center px-4 py-8 sm:min-h-[calc(100vh-154px)]">
        <Outlet />
      </main>
    </div>
  );
}

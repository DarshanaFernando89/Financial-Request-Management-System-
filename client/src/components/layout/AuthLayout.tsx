import { Outlet } from 'react-router-dom';
import facultyLogo from '../../assets/images/faculty-logo.png';
import universityLogo from '../../assets/images/university-logo.png';
import { facultyName, systemTitle } from '../../utils/constants';

export function AuthLayout() {
  const displayFacultyName = facultyName.replace(', ', ',');

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-[#d7a41b] bg-[#f6c235]">
        <div className="relative flex min-h-[88px] items-center justify-center px-16 py-2 lg:min-h-[104px] sm:px-28">
          <img
            src={universityLogo}
            alt="University of Ruhuna logo"
            className="absolute left-3 h-14 w-auto object-contain sm:left-8 lg:h-[80px]"
          />
          <div className="min-w-0 text-center text-black">
            <h1 className="text-lg font-semibold leading-tight sm:text-2xl xl:text-[28px]">{systemTitle}</h1>
            <p className="mt-1 text-xs font-normal leading-tight sm:text-base xl:text-lg">{displayFacultyName}</p>
          </div>
          <img
            src={facultyLogo}
            alt="Faculty of Engineering logo"
            className="absolute right-3 h-14 w-auto object-contain sm:right-8 lg:h-[80px]"
          />
        </div>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-88px)] max-w-6xl items-center justify-center px-4 py-8 lg:min-h-[calc(100vh-104px)]">
        <Outlet />
      </main>
    </div>
  );
}

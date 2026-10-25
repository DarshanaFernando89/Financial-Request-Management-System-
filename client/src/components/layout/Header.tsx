import { Menu } from 'lucide-react';
import { Button } from '../ui/Button';
import { facultyName, systemTitle } from '../../utils/constants';
import facultyLogo from '../../assets/images/faculty-logo.png';
import universityLogo from '../../assets/images/university-logo.png';

export function Header({ onMenu }: { onMenu: () => void }) {
  const displayFacultyName = facultyName.replace(', ', ',');

  return (
    <header className="sticky top-0 z-30 border-b border-[#d7a41b] bg-[#f6c235] shadow-sm">
      <div className="grid min-h-[88px] grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-3 py-2 lg:min-h-[104px] lg:grid-cols-[80px_minmax(0,1fr)_80px] md:gap-6 md:px-8">
        <div className="flex items-center gap-2">
          <Button aria-label="Open menu" variant="ghost" className="h-11 min-h-11 w-11 px-0 lg:hidden" icon={<Menu size={23} />} onClick={onMenu} />
          <img src={universityLogo} alt="University of Ruhuna logo" className="hidden h-[80px] w-auto object-contain lg:block" />
        </div>
        <div className="min-w-0 text-center text-black">
          <h1 className="text-lg font-semibold leading-tight sm:text-2xl xl:text-[28px]">{systemTitle}</h1>
          <p className="mt-1 text-xs font-normal leading-tight sm:text-base xl:text-lg">{displayFacultyName}</p>
        </div>
        <img src={facultyLogo} alt="Faculty of Engineering logo" className="hidden h-[80px] w-auto justify-self-end object-contain lg:block" />
      </div>
    </header>
  );
}

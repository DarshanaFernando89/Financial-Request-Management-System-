import { Menu } from 'lucide-react';
import { Button } from '../ui/Button';
import { facultyName, systemTitle } from '../../utils/constants';
import facultyLogo from '../../assets/images/faculty-logo.png';
import universityLogo from '../../assets/images/university-logo.png';

export function Header({ onMenu }: { onMenu: () => void }) {
  const displayFacultyName = facultyName.replace(', ', ',');

  return (
    <header className="sticky top-0 z-30 border-b border-[#d7a41b] bg-[#f6c235] shadow-sm">
      <div className="grid min-h-[120px] grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-3 py-3 md:min-h-[154px] md:grid-cols-[120px_minmax(0,1fr)_120px] md:gap-6 md:px-8">
        <div className="flex items-center gap-2">
          <Button aria-label="Open menu" variant="ghost" className="h-11 min-h-11 w-11 px-0 lg:hidden" icon={<Menu size={23} />} onClick={onMenu} />
          <img src={universityLogo} alt="University of Ruhuna logo" className="hidden h-[132px] w-auto object-contain lg:block" />
        </div>
        <div className="min-w-0 text-center text-black">
          <h1 className="text-xl font-normal leading-tight sm:text-[28px] xl:text-[34px]">{systemTitle}</h1>
          <p className="mt-1 text-sm font-normal leading-tight sm:text-lg xl:text-[22px]">{displayFacultyName}</p>
        </div>
        <img src={facultyLogo} alt="Faculty of Engineering logo" className="hidden h-[132px] w-auto justify-self-end object-contain lg:block" />
      </div>
    </header>
  );
}

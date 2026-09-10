'use client';

import {ThemeProvider,useTheme} from 'next-themes';
import {Moon,Sun,Monitor} from 'lucide-react';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuLabel,DropdownMenuRadioGroup,DropdownMenuRadioItem,DropdownMenuSeparator} from '@/components/ui/dropdown-menu';

export function StoreTheme({children}:{children:React.ReactNode}) {
  return <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="jedis-store-theme" disableTransitionOnChange>{children}</ThemeProvider>;
}

export function ThemeMenu() {
  const {theme,setTheme}=useTheme();
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button type="button" className="icon-button theme-button" aria-label="Change colour theme" title="Change colour theme">
        <Sun className="theme-sun" aria-hidden="true"/>
        <Moon className="theme-moon" aria-hidden="true"/>
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" sideOffset={12} className="theme-menu">
      <DropdownMenuLabel>Appearance</DropdownMenuLabel>
      <DropdownMenuSeparator/>
      <DropdownMenuRadioGroup value={theme??'system'} onValueChange={setTheme}>
        <DropdownMenuRadioItem value="light"><Sun aria-hidden="true"/>Light</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="dark"><Moon aria-hidden="true"/>Dark</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="system"><Monitor aria-hidden="true"/>Use device setting</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>;
}

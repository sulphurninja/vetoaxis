'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  LogOut, 
  Settings, 
  User as UserIcon, 
  Bell, 
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion } from 'framer-motion';

export default function DashboardHeader() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (logout) {
      logout();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6 lg:px-10">
        
        {/* Left Side: Contextual Indicator (Visible only on desktop usually) */}
        <div className="hidden lg:flex items-center gap-2">
           <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
             System Encrypted & Active
           </span>
        </div>

        {/* Right Side Actions */}
        <div className="ml-auto flex items-center space-x-5">
          
          {/* Activity/Notification Placeholder */}
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary rounded-xl">
            <Bell className="h-5 w-5" />
          </Button>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative flex items-center gap-3 pl-2 pr-1 h-10 rounded-2xl hover:bg-accent transition-all">
                <div className="flex flex-col items-end text-right hidden sm:flex">
                  <span className="text-xs font-black tracking-tight text-foreground">
                    {user?.name || 'Tejas Dhamankar'}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-primary">
                    {user?.role === 'super_admin' ? 'Super Systems Admin' : 'Lead Agent'}
                  </span>
                </div>
                <Avatar className="h-8 w-8 rounded-xl border-2 border-background shadow-sm">
                  <AvatarFallback className="bg-primary text-[10px] font-black text-primary-foreground uppercase">
                    {user?.name ? user.name.substring(0, 2) : 'TD'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="px-3 py-4">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black tracking-tight text-foreground">
                      Account Identity
                    </p>
                    <div className="p-0.5 bg-primary/10 rounded">
                      <Zap className="h-3 w-3 text-primary fill-primary" />
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground truncate">
                    {user?.email || 'dhamankartejas14@gmail.com'}
                  </p>
                </div>
              </DropdownMenuLabel>
              
              <DropdownMenuSeparator className="bg-border" />
              
              <div className="py-1">
                <DropdownMenuItem className="rounded-xl px-3 py-2.5 cursor-pointer text-xs font-bold text-muted-foreground focus:bg-accent focus:text-accent-foreground">
                  <UserIcon className="mr-3 h-4 w-4" />
                  Security Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-xl px-3 py-2.5 cursor-pointer text-xs font-bold text-muted-foreground focus:bg-accent focus:text-accent-foreground">
                  <Settings className="mr-3 h-4 w-4" />
                  System Preferences
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator className="bg-border" />
              
              <DropdownMenuItem 
                onClick={handleLogout}
                className="rounded-xl px-3 py-2.5 cursor-pointer text-xs font-black uppercase tracking-widest text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Kill Session
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
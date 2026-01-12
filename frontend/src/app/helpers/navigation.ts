import { MessageSquare, Settings } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path: string;
}

export const navItems: NavItem[] = [
  {
    id: 'chats',
    label: 'Chats',
    icon: MessageSquare,
    path: '/',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/settings',
  },
];

export interface MenuItemProps {
  label: string;
  icon: React.ReactNode;
  badge?: string;
  subMenu?: SubMenuItemProps[];
  isActive: boolean;
  onMenuClick: () => void;
  onSubMenuClick: (label: string) => void;
  activeSubMenu: string | null;
  link?: string;
}

export interface SubMenuProps {
  subMenu: SubMenuItemProps[];
  activeSubMenu: string | null;
  onSubMenuClick: (label: string) => void;
}

export interface MenuSectionProps {
  title: string;
  items: MenuItemProps[];
}

export interface SubMenuItemProps {
  label: string;
  link: string;
}

//
export interface SubMenuItem {
  label: string;
  link: string;
}

export interface MenuItem {
  label: string;
  icon: React.ReactNode;
  badge?: string;
  subMenu?: SubMenuItem[];
  link?: string;
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}
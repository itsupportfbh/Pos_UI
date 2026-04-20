export interface MenuChildItem {
  key: string;
  label: string;
  description: string;
  route: string;
}

export interface MenuGroup {
  key: string;
  label: string;
  icon: string;
  items: MenuChildItem[];
}

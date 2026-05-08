export interface MenuChildItem {
  key: string;
  label: string;
  description: string;
  route: string;
  entityNo: number;
}

export interface MenuGroup {
  key: string;
  label: string;
  icon: string;
  items: MenuChildItem[];
}

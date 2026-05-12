import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuChildItem, MenuGroup, MenuOfficeOption } from './menu.model';

const COMMON_MENU_SCOPE = 0;

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
})
export class MenuComponent {
  @Input() appName = '';
  @Input() appLogoUrl = '';
  @Input() sidebarOpen = false;
  @Input() activeMenuKey = '';
  @Input() menuItems: MenuGroup[] = [];
  @Input() currentOfficeScope = 2;
  @Input() officeOptions: MenuOfficeOption[] = [];
  @Output() menuSelect = new EventEmitter<MenuChildItem | string>();
  @Output() officeScopeChange = new EventEmitter<number>();

  menuSearchText = '';
  filteredMenuItems: MenuGroup[] = [];
  expandedGroupKeys = new Set<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['menuItems'] || changes['currentOfficeScope']) {
      this.applyMenuSearch();
    }
  }

  toggleGroup(groupKey: string): void {
    if (this.menuSearchText.trim()) {
      return;
    }

    if (this.expandedGroupKeys.has(groupKey)) {
      this.expandedGroupKeys.delete(groupKey);
      return;
    }

    this.expandedGroupKeys.add(groupKey);
  }

  isGroupExpanded(groupKey: string): boolean {
    if (this.menuSearchText.trim()) {
      return true;
    }

    return this.expandedGroupKeys.has(groupKey);
  }

  onMenuSearchChange(value: string): void {
    this.menuSearchText = value;
    this.applyMenuSearch();
  }

  onSelect(item: MenuChildItem | string): void {
    this.menuSelect.emit(item);
  }

  onOfficeScopeSelect(scope: number): void {
    if (this.currentOfficeScope === scope) {
      return;
    }

    this.currentOfficeScope = scope;
    this.applyMenuSearch();
    this.officeScopeChange.emit(scope);
  }

  private applyMenuSearch(): void {
    const searchText = this.menuSearchText.trim().toLowerCase();

    if (!searchText) {
      this.filteredMenuItems = this.menuItems.filter((group) => {
        return Number(group.sectionScope ?? COMMON_MENU_SCOPE) === COMMON_MENU_SCOPE
          || Number(group.sectionScope ?? COMMON_MENU_SCOPE) === this.currentOfficeScope;
      });
      return;
    }

    this.filteredMenuItems = this.menuItems
      .filter((group) => {
        return Number(group.sectionScope ?? COMMON_MENU_SCOPE) === COMMON_MENU_SCOPE
          || Number(group.sectionScope ?? COMMON_MENU_SCOPE) === this.currentOfficeScope;
      })
      .map((group) => {
        const matchedItems = group.items.filter((item) => {
          return item.label.toLowerCase().includes(searchText)
            || item.description.toLowerCase().includes(searchText)
            || group.label.toLowerCase().includes(searchText);
        });

        return {
          ...group,
          items: matchedItems
        };
      })
      .filter((group) => group.items.length > 0);
  }
}

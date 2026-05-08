import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuChildItem, MenuGroup } from './menu.model';

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
  @Output() menuSelect = new EventEmitter<MenuChildItem | string>();

  menuSearchText = '';
  filteredMenuItems: MenuGroup[] = [];
  expandedGroupKeys = new Set<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['menuItems']) {
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

  private applyMenuSearch(): void {
    const searchText = this.menuSearchText.trim().toLowerCase();

    if (!searchText) {
      this.filteredMenuItems = [...this.menuItems];
      return;
    }

    this.filteredMenuItems = this.menuItems
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

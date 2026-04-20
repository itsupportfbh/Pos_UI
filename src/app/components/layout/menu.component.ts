import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuGroup } from './menu.model';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
})
export class MenuComponent {
  @Input() sidebarOpen = false;
  @Input() activeMenuKey = '';
  @Input() menuItems: MenuGroup[] = [];
  @Output() menuSelect = new EventEmitter<string>();

  expandedGroupKeys = new Set<string>();

  toggleGroup(groupKey: string): void {
    if (this.expandedGroupKeys.has(groupKey)) {
      this.expandedGroupKeys.delete(groupKey);
      return;
    }

    this.expandedGroupKeys.add(groupKey);
  }

  isGroupExpanded(groupKey: string): boolean {
    return this.expandedGroupKeys.has(groupKey);
  }

  onSelect(menuKey: string): void {
    this.menuSelect.emit(menuKey);
  }
}

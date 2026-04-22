import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { SelectFieldComponent } from '../../../components/form/select-field.component';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';
import { AppToastService } from '../../../services/app-toast.service';

const ROLE_OPTIONS: { label: string | number; value: string | number }[] = [];
const BRANCH_OPTIONS: { label: string | number; value: string | number }[] = [];
const ROLE_FIELDS: any[] = [
  { key: 'role', label: 'Role', type: 'select', placeholder: 'Choose role', options: ROLE_OPTIONS },
  { key: 'branch', label: 'Branch', type: 'select', placeholder: 'Choose branch', options: BRANCH_OPTIONS }
];
const CODE_NAME_COLUMNS: SharedTableColumn<Record<string, unknown>>[] = [
  { field: 'code', header: 'Code', sortable: true, width: '10rem' },
  { field: 'name', header: 'Name', sortable: true, width: '18rem' },
  { field: 'status', header: 'Status', type: 'tag' as const, sortable: true, width: '9rem', tagSeverityMap: { Active: 'success', Draft: 'info', Low: 'warn', Out: 'danger', Printed: 'success', Posted: 'success', Pending: 'warn', Partial: 'warn', Open: 'info', Critical: 'danger', Sent: 'success', Review: 'contrast' } }
];

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, DialogModule, SelectFieldComponent, ActionButtonsComponent, MenuModule, SharedTableComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent {
  private readonly toast = inject(AppToastService);  showAddDialog = false;
  showFilterSidebar = false;
  filterRole: string | null = null;
  filterBranch: string | null = null;
  dialogRole: string | null = null;
  dialogBranch: string | null = null;
  selectedRow: Record<string, unknown> | null = null;
  readonly pageEyebrow = 'Users & Roles';
  readonly pageTitle = 'Users';
  readonly pageSubtitle = 'Manage admin users.';
  readonly roleOptions = ROLE_OPTIONS;
  readonly branchOptions = BRANCH_OPTIONS;
  
  readonly filterTitle = `${'Users'} Filters`;
  readonly filterDescription = `API data will be loaded for ${'Users'.toLowerCase()}.`;
  readonly fields: any[] = ROLE_FIELDS;
  readonly primaryActionLabel = `Search ${'Users'}`;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  readonly dialogTitle = 'Create User';
  readonly dialogSubtitle = 'Create a new user account.';
  readonly dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Users';
  readonly tableCaption = 'Users';
  readonly tableColumns = CODE_NAME_COLUMNS;
  tableRows: Record<string, unknown>[] = [];
    readonly showAddNewButton = true;
    readonly addNewButtonLabel = this.showAddNewButton ? 'Add New' : '';
    readonly showFilterButton = true;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';
  readonly rowActionItems: MenuItem[] = [
    { label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') },
    { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') },
    { label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') },
    { label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') }
  ];

  resetForm(): void {
    this.filterRole = null;
    this.filterBranch = null;
  }

  openFilterSidebar(): void {
    this.showFilterSidebar = true;
  }

  closeFilterSidebar(): void {
    this.showFilterSidebar = false;
  }
  openAddDialog(): void {
        this.resetDialogForm();
    this.showAddDialog = true;
  }

  closeAddDialog(): void {
    this.showAddDialog = false;
  }

  submitAddDialog(): void {
    this.toast.success('Saved', `${this.dialogTitle || this.pageTitle} saved successfully.`);
    this.closeAddDialog();
  }

  editRow(row: Record<string, unknown>): void {
        this.dialogRole = typeof row['role'] === 'string' ? row['role'] : null;
    this.dialogBranch = typeof row['branch'] === 'string' ? row['branch'] : null;
    this.showAddDialog = true;
    this.toast.info('Edit Mode', `Editing ${String(row['name'] ?? row['code'] ?? this.pageTitle)}.`);
  }

  deleteRow(row: Record<string, unknown>): void {
    const rowIndex = this.tableRows.indexOf(row);

    if (rowIndex >= 0) {
      this.tableRows.splice(rowIndex, 1);
    }

    this.toast.warn('Deleted', `${String(row['name'] ?? row['code'] ?? 'Record')} removed successfully.`);
  }

  activateRow(row: Record<string, unknown>): void {
    row['status'] = 'Active';
    this.toast.success('Status Updated', `${String(row['name'] ?? row['code'] ?? 'Record')} marked as active.`);
  }

  deactivateRow(row: Record<string, unknown>): void {
    row['status'] = 'Inactive';
    this.toast.info('Status Updated', `${String(row['name'] ?? row['code'] ?? 'Record')} marked as inactive.`);
  }

  openRowActions(menu: any, event: Event, row: Record<string, unknown>): void {
    this.selectedRow = row;
    menu.toggle(event);
  }

  private handleRowAction(action: 'edit' | 'delete' | 'activate' | 'deactivate'): void {
    if (!this.selectedRow) {
      return;
    }

    if (action === 'edit') {
      this.editRow(this.selectedRow);
    } else if (action === 'delete') {
      this.deleteRow(this.selectedRow);
    } else if (action === 'activate') {
      this.activateRow(this.selectedRow);
    } else {
      this.deactivateRow(this.selectedRow);
    }
  }

  private resetDialogForm(): void {
    this.dialogRole = null;
    this.dialogBranch = null;
  }
}















import { CommonModule } from '@angular/common';
import { Component, QueryList, ViewChildren, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MenuItem, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';

import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';


import { AppToastService } from '../../../services/app-toast.service';


import { SharedTableCellTemplateDirective, SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';
import { EntityMasterService } from '../../../services/entitymaster.service';

type CashDrawerRow = {
  Id: number;
  DrawerCode: string;
  DrawerName: string;
  CounterName: string;
  OpeningBalance: number;
  ClosingBalance: number;
  Variance: number;
  Notes: string;
  IsActive: boolean;
  Status: string;
  RowNumber: number;
};

const CASH_DRAWER_COLUMNS: SharedTableColumn<CashDrawerRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'DrawerCode', header: 'Drawer Code', sortable: true, width: '10rem' },
  { field: 'DrawerName', header: 'Drawer Name', sortable: true, width: '14rem' },
  { field: 'CounterName', header: 'Counter', sortable: true, width: '12rem' },
  { field: 'OpeningBalance', header: 'Opening', sortable: true, width: '9rem' },
  { field: 'ClosingBalance', header: 'Closing', sortable: true, width: '9rem' },
  { field: 'Variance', header: 'Variance', sortable: true, width: '9rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '8rem' }
];

@Component({
  selector: 'app-cash-drawer',
  standalone: true,
  imports: [
    CommonModule,
    ConfirmDialogModule,
    ButtonModule,
    CardModule,
    DialogModule,
    TextFieldComponent,
    ActionButtonsComponent,
    MenuModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective
  ],
  providers: [ConfirmationService],
  templateUrl: './cash-drawer.component.html',
  styleUrl: './cash-drawer.component.css'
})
export class CashDrawerComponent {
  
  
  private readonly toast = inject(AppToastService);
  
  
  private readonly confirmationService = inject(ConfirmationService);
  private readonly entityMasterService = inject(EntityMasterService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  selectedRow: CashDrawerRow | null = null;
  rowActionItems: MenuItem[] = [];
  allRows: CashDrawerRow[] = [];
  tableRows: CashDrawerRow[] = [];

  filterSearchText = '';

  dialogId = 0;
  dialogDrawerCode = '';
  dialogDrawerName = '';
  dialogCounterName = '';
  dialogOpeningBalance = '';
  dialogClosingBalance = '';
  dialogNotes = '';

  totalDrawers = 0;
  activeDrawers = 0;
  totalOpeningBalance = 0;
  totalClosingBalance = 0;

  readonly pageEyebrow = 'Payments';
  readonly pageTitle = 'Cash Drawer';
  readonly pageSubtitle = 'Track drawer openings, drops, and balance checks across service shifts.';
  readonly filterTitle = this.pageTitle + ' Filters';
  readonly primaryActionLabel = 'Search ' + this.pageTitle;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Open Cash Drawer';
  dialogSubtitle = 'Capture the drawer opening and closing details for the shift.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Drawer Sessions';
  readonly tableCaption = 'Drawer Sessions';
  tableColumns = CASH_DRAWER_COLUMNS;
  cashDrawerRights = { View: true, Create: true, Edit: true, Delete: true, ActiveInActive: true, Print: true, Download: true };
  showAddNewButton = true;
  readonly addNewButtonLabel = 'Open Drawer';
  readonly showFilterButton = true;
  showRowActions = true;
  readonly rowActionHeader = 'Actions';
  userDetails: any = {};
  cashDrawerEntityNo = Number(sessionStorage.getItem("currentMenuEntityNo") || 0);

  async ngOnInit(): Promise<void> {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    await this.loadCashDrawerRights();
    this.loadRows();
  }

  async loadCashDrawerRights(): Promise<void> {
    const orgId = Number(this.userDetails?.OrganizationId || this.userDetails?.OrgId || 0);
    const roleId = Number(this.userDetails?.RoleId || 0);
    const entityNo = Number(this.cashDrawerEntityNo || 0);

    if (!orgId || !roleId || !entityNo) {
      return;
    }

    try {
      const response: any = await firstValueFrom(this.entityMasterService.GetRoleRightsByRoleId(orgId, roleId, entityNo));
      const rights = response?.result?.[0];

      if (rights) {
        this.cashDrawerRights = {
          View: rights.View === true,
          Create: rights.Create === true,
          Edit: rights.Edit === true,
          Delete: rights.Delete === true,
          ActiveInActive: rights.ActiveInActive === true,
          Print: rights.Print === true,
          Download: rights.Download === true
        };
      }

      this.showAddNewButton = this.cashDrawerRights.Create;
      this.showRowActions = this.cashDrawerRights.Edit || this.cashDrawerRights.Delete || this.cashDrawerRights.ActiveInActive || this.cashDrawerRights.Print;
    } catch {
      this.cashDrawerRights = { View: true, Create: false, Edit: false, Delete: false, ActiveInActive: false, Print: false, Download: false };
      this.showAddNewButton = false;
      this.showRowActions = false;
      this.toast.error('Rights Load Failed', 'Unable to load cash drawer rights for this role.');
    }
  }

  loadRows(): void {
    this.allRows = [];
    this.tableRows = [];
    this.updateSummary();
  }

  searchRows(): void {
    const searchText = this.filterSearchText.trim().toLowerCase();

    if (!searchText) {
      this.tableRows = [...this.allRows];
      return;
    }

    this.tableRows = this.allRows.filter((row) =>
      row.DrawerCode.toLowerCase().includes(searchText) ||
      row.DrawerName.toLowerCase().includes(searchText) ||
      row.CounterName.toLowerCase().includes(searchText) ||
      row.Notes.toLowerCase().includes(searchText)
    );
  }

  resetForm(): void {
    this.filterSearchText = '';
    this.tableRows = [...this.allRows];
  }

  openFilterSidebar(): void {
    this.resetForm();
    this.showFilterSidebar = true;
  }

  closeFilterSidebar(): void {
    this.showFilterSidebar = false;
  }

  openAddDialog(): void {
    this.resetDialogForm();
    this.isEditMode = false;
    this.dialogTitle = 'Open Cash Drawer';
    this.dialogSubtitle = 'Capture the drawer opening and closing details for the shift.';
    this.dialogPrimaryActionLabel = 'Save';
    this.showAddDialog = true;
  }

  closeAddDialog(): void {
    this.resetDialogForm();
    this.isEditMode = false;
    this.dialogSubmitted = false;
    this.showAddDialog = false;
  }

  submitAddDialog(): void {
    this.dialogSubmitted = true;

    if (!this.isDialogFormValid()) {
      return;
    }

    if (this.isEditMode && this.dialogId) {
      this.allRows = this.allRows.map((row) => {
        if (row.Id === this.dialogId) {
          row.DrawerCode = this.dialogDrawerCode;
          row.DrawerName = this.dialogDrawerName;
          row.CounterName = this.dialogCounterName;
          row.OpeningBalance = Number(this.dialogOpeningBalance || 0);
          row.ClosingBalance = Number(this.dialogClosingBalance || 0);
          row.Notes = this.dialogNotes;
        }

        return row;
      });

      this.toast.success('Updated', this.pageTitle + ' updated successfully.');
    } else {
      this.allRows.unshift({
        Id: Date.now(),
        DrawerCode: this.dialogDrawerCode,
        DrawerName: this.dialogDrawerName,
        CounterName: this.dialogCounterName,
        OpeningBalance: Number(this.dialogOpeningBalance || 0),
        ClosingBalance: Number(this.dialogClosingBalance || 0),
        Variance: 0,
        Notes: this.dialogNotes,
        IsActive: true,
        Status: 'Active',
        RowNumber: 0
      });

      this.toast.success('Saved', this.pageTitle + ' saved successfully.');
    }

    this.refreshRows();
    this.closeAddDialog();
  }

  editRow(row: CashDrawerRow): void {
    this.isEditMode = true;
    this.dialogId = row.Id;
    this.dialogDrawerCode = row.DrawerCode;
    this.dialogDrawerName = row.DrawerName;
    this.dialogCounterName = row.CounterName;
    this.dialogOpeningBalance = String(row.OpeningBalance);
    this.dialogClosingBalance = String(row.ClosingBalance);
    this.dialogNotes = row.Notes;
    this.dialogTitle = 'Edit Cash Drawer';
    this.dialogSubtitle = 'Update the selected drawer session details.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;
  }

  deleteRow(row: CashDrawerRow): void {
    this.allRows = this.allRows.filter((item) => item.Id !== row.Id);
    this.refreshRows();
    this.toast.success('Deleted', row.DrawerName + ' deleted successfully.');
  }

  activateRow(row: CashDrawerRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = true;
        item.Status = 'Active';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Activated', row.DrawerName + ' activated successfully.');
  }

  deactivateRow(row: CashDrawerRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = false;
        item.Status = 'Inactive';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Deactivated', row.DrawerName + ' deactivated successfully.');
  }

  openRowActions(menu: any, event: Event, row: CashDrawerRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: CashDrawerRow): void {
    this.confirmationService.confirm({
      header: 'Delete Confirmation',
      message: 'Are you sure you want to delete ' + row.DrawerName + '?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.deleteRow(row);
      }
    });
  }

  confirmActivateRow(row: CashDrawerRow): void {
    this.confirmationService.confirm({
      header: 'Activate Confirmation',
      message: 'Are you sure you want to activate ' + row.DrawerName + '?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.activateRow(row);
      }
    });
  }

  confirmDeactivateRow(row: CashDrawerRow): void {
    this.confirmationService.confirm({
      header: 'Deactivate Confirmation',
      message: 'Are you sure you want to deactivate ' + row.DrawerName + '?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-warn',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.deactivateRow(row);
      }
    });
  }

  resetDialogForm(): void {
    this.dialogSubmitted = false;
    this.dialogId = 0;
    this.dialogDrawerCode = '';
    this.dialogDrawerName = '';
    this.dialogCounterName = '';
    this.dialogOpeningBalance = '';
    this.dialogClosingBalance = '';
    this.dialogNotes = '';
  }

  private refreshRows(): void {
    this.allRows = this.allRows.map((row, index) => {
      row.RowNumber = index + 1;
      row.Variance = row.ClosingBalance - row.OpeningBalance;
      row.Status = row.IsActive ? 'Active' : 'Inactive';
      return row;
    });

    this.searchRows();
    this.updateSummary();
  }

  private updateSummary(): void {
    this.totalDrawers = this.allRows.length;
    this.activeDrawers = this.allRows.filter((row) => row.IsActive).length;
    this.totalOpeningBalance = this.allRows.reduce((total, row) => total + row.OpeningBalance, 0);
    this.totalClosingBalance = this.allRows.reduce((total, row) => total + row.ClosingBalance, 0);
  }

  private isDialogFormValid(): boolean {
    return this.textFields?.toArray().every((field) => field.isValid) ?? true;
  }

  private getRowActionItems(row: CashDrawerRow): MenuItem[] {
    const items: MenuItem[] = [];

    if (this.cashDrawerRights.Edit && row.IsActive) {
      items.push({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
    }

    if (this.cashDrawerRights.Delete) {
      items.push({ label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') });
    }

    if (this.cashDrawerRights.ActiveInActive) {
      if (row.IsActive) {
        items.push({ label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
      } else {
        items.push({ label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
      }
    }

    if (this.cashDrawerRights.Print) {
      items.push({ label: 'Print', icon: 'pi pi-print', styleClass: 'row-action-print', command: () => this.handleRowAction('print') });
    }

    return items;
  }

  private handleRowAction(action: 'edit' | 'delete' | 'activate' | 'deactivate' | 'print'): void {
    if (!this.selectedRow) {
      return;
    }

    if (action === 'edit') {
      this.editRow(this.selectedRow);
    } else if (action === 'delete') {
      this.confirmDeleteRow(this.selectedRow);
    } else if (action === 'activate') {
      this.confirmActivateRow(this.selectedRow);
    } else if (action === 'print') {
      this.printRow(this.selectedRow);
    } else {
      this.confirmDeactivateRow(this.selectedRow);
    }
  }

  printRow(row: CashDrawerRow): void {
    const name = String(row.DrawerName ?? row.DrawerCode ?? 'this cash drawer');
    this.toast.info('Print Pending', `Print functionality for ${name} will be added soon.`);
  }
}


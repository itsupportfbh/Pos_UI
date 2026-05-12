import { CommonModule } from '@angular/common';
import { Component, QueryList, ViewChildren, inject } from '@angular/core';
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

type CashierOutRow = {
  Id: number;
  CashierCode: string;
  CashierName: string;
  CounterName: string;
  ShiftName: string;
  ClosingCash: number;
  Notes: string;
  IsActive: boolean;
  Status: string;
  RowNumber: number;
};

const CASHIER_OUT_COLUMNS: SharedTableColumn<CashierOutRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'CashierCode', header: 'Cashier Code', sortable: true, width: '10rem' },
  { field: 'CashierName', header: 'Cashier', sortable: true, width: '14rem' },
  { field: 'CounterName', header: 'Counter', sortable: true, width: '12rem' },
  { field: 'ShiftName', header: 'Shift', sortable: true, width: '10rem' },
  { field: 'ClosingCash', header: 'Closing Cash', sortable: true, width: '10rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '8rem' }
];

@Component({
  selector: 'app-cashier-out',
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
  templateUrl: './cashier-out.component.html',
  styleUrl: './cashier-out.component.css'
})
export class CashierOutComponent {
  private readonly toast = inject(AppToastService);
  private readonly confirmationService = inject(ConfirmationService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  selectedRow: CashierOutRow | null = null;
  rowActionItems: MenuItem[] = [];
  allRows: CashierOutRow[] = [];
  tableRows: CashierOutRow[] = [];

  filterSearchText = '';

  dialogId = 0;
  dialogCashierCode = '';
  dialogCashierName = '';
  dialogCounterName = '';
  dialogShiftName = '';
  dialogClosingCash = '';
  dialogNotes = '';

  totalSessions = 0;
  activeSessions = 0;
  totalClosingCash = 0;

  readonly pageEyebrow = 'Payments';
  readonly pageTitle = 'Cashier Out';
  readonly pageSubtitle = 'Close cashier sessions with totals, variances, and handover readiness.';
  readonly filterTitle = this.pageTitle + ' Filters';
  readonly primaryActionLabel = 'Search ' + this.pageTitle;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Close Cashier Session';
  dialogSubtitle = 'Capture cashier, counter, shift, and final cash details.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Cashier Closing Sessions';
  readonly tableCaption = 'Cashier Closing Sessions';
  tableColumns = CASHIER_OUT_COLUMNS;
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = 'Cashier Out';
  readonly showFilterButton = true;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';

  ngOnInit(): void {
    this.loadRows();
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
      row.CashierCode.toLowerCase().includes(searchText) ||
      row.CashierName.toLowerCase().includes(searchText) ||
      row.CounterName.toLowerCase().includes(searchText) ||
      row.ShiftName.toLowerCase().includes(searchText) ||
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
    this.dialogTitle = 'Close Cashier Session';
    this.dialogSubtitle = 'Capture cashier, counter, shift, and final cash details.';
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
          row.CashierCode = this.dialogCashierCode;
          row.CashierName = this.dialogCashierName;
          row.CounterName = this.dialogCounterName;
          row.ShiftName = this.dialogShiftName;
          row.ClosingCash = Number(this.dialogClosingCash || 0);
          row.Notes = this.dialogNotes;
        }

        return row;
      });

      this.toast.success('Updated', this.pageTitle + ' updated successfully.');
    } else {
      this.allRows.unshift({
        Id: Date.now(),
        CashierCode: this.dialogCashierCode,
        CashierName: this.dialogCashierName,
        CounterName: this.dialogCounterName,
        ShiftName: this.dialogShiftName,
        ClosingCash: Number(this.dialogClosingCash || 0),
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

  editRow(row: CashierOutRow): void {
    this.isEditMode = true;
    this.dialogId = row.Id;
    this.dialogCashierCode = row.CashierCode;
    this.dialogCashierName = row.CashierName;
    this.dialogCounterName = row.CounterName;
    this.dialogShiftName = row.ShiftName;
    this.dialogClosingCash = String(row.ClosingCash);
    this.dialogNotes = row.Notes;
    this.dialogTitle = 'Edit Cashier Out';
    this.dialogSubtitle = 'Update the selected cashier closing session.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;
  }

  deleteRow(row: CashierOutRow): void {
    this.allRows = this.allRows.filter((item) => item.Id !== row.Id);
    this.refreshRows();
    this.toast.success('Deleted', row.CashierName + ' deleted successfully.');
  }

  activateRow(row: CashierOutRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = true;
        item.Status = 'Active';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Activated', row.CashierName + ' activated successfully.');
  }

  deactivateRow(row: CashierOutRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = false;
        item.Status = 'Inactive';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Deactivated', row.CashierName + ' deactivated successfully.');
  }

  openRowActions(menu: any, event: Event, row: CashierOutRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: CashierOutRow): void {
    this.confirmationService.confirm({
      header: 'Delete Confirmation',
      message: 'Are you sure you want to delete ' + row.CashierName + '?',
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

  confirmActivateRow(row: CashierOutRow): void {
    this.confirmationService.confirm({
      header: 'Activate Confirmation',
      message: 'Are you sure you want to activate ' + row.CashierName + '?',
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

  confirmDeactivateRow(row: CashierOutRow): void {
    this.confirmationService.confirm({
      header: 'Deactivate Confirmation',
      message: 'Are you sure you want to deactivate ' + row.CashierName + '?',
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
    this.dialogCashierCode = '';
    this.dialogCashierName = '';
    this.dialogCounterName = '';
    this.dialogShiftName = '';
    this.dialogClosingCash = '';
    this.dialogNotes = '';
  }

  private refreshRows(): void {
    this.allRows = this.allRows.map((row, index) => {
      row.RowNumber = index + 1;
      row.Status = row.IsActive ? 'Active' : 'Inactive';
      return row;
    });

    this.searchRows();
    this.updateSummary();
  }

  private updateSummary(): void {
    this.totalSessions = this.allRows.length;
    this.activeSessions = this.allRows.filter((row) => row.IsActive).length;
    this.totalClosingCash = this.allRows.reduce((total, row) => total + row.ClosingCash, 0);
  }

  private isDialogFormValid(): boolean {
    return this.textFields?.toArray().every((field) => field.isValid) ?? true;
  }

  private getRowActionItems(row: CashierOutRow): MenuItem[] {
    const items: MenuItem[] = [
      { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') }
    ];

    if (row.IsActive) {
      items.unshift({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
      items.push({ label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
    } else {
      items.push({ label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
    }

    return items;
  }

  private handleRowAction(action: 'edit' | 'delete' | 'activate' | 'deactivate'): void {
    if (!this.selectedRow) {
      return;
    }

    if (action === 'edit') {
      this.editRow(this.selectedRow);
    } else if (action === 'delete') {
      this.confirmDeleteRow(this.selectedRow);
    } else if (action === 'activate') {
      this.confirmActivateRow(this.selectedRow);
    } else {
      this.confirmDeactivateRow(this.selectedRow);
    }
  }
}


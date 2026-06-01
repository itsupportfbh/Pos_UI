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

type QuickServeRow = {
  Id: number;
  TicketNo: string;
  CounterName: string;
  OrderMode: string;
  ItemCount: number;
  TotalAmount: number;
  PickupLabel: string;
  IsActive: boolean;
  Status: string;
  RowNumber: number;
};

const QUICK_SERVE_COLUMNS: SharedTableColumn<QuickServeRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'TicketNo', header: 'Ticket No', sortable: true, width: '11rem' },
  { field: 'CounterName', header: 'Counter', sortable: true, width: '11rem' },
  { field: 'OrderMode', header: 'Mode', sortable: true, width: '9rem' },
  { field: 'ItemCount', header: 'Items', sortable: true, width: '7rem' },
  { field: 'TotalAmount', header: 'Total', sortable: true, width: '10rem' },
  { field: 'PickupLabel', header: 'Pickup', sortable: true, width: '11rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '8rem' }
];

@Component({
  selector: 'app-quick-serve',
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
  templateUrl: './quick-serve.component.html',
  styleUrl: './quick-serve.component.css'
})
export class QuickServeComponent {
  
  
  private readonly toast = inject(AppToastService);
  
  
  private readonly confirmationService = inject(ConfirmationService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  selectedRow: QuickServeRow | null = null;
  rowActionItems: MenuItem[] = [];
  allRows: QuickServeRow[] = [];
  tableRows: QuickServeRow[] = [];

  filterSearchText = '';

  dialogId = 0;
  dialogTicketNo = '';
  dialogCounterName = '';
  dialogOrderMode = '';
  dialogItemCount = '';
  dialogTotalAmount = '';
  dialogPickupLabel = '';

  activeTickets = 0;
  totalItems = 0;
  totalSales = 0;
  previewCounterName = 'Counter 2';
  previewOrderMode = 'Take Away';
  previewPickupLabel = 'Pickup Slip 14';

  readonly pageEyebrow = 'Orders';
  readonly pageTitle = 'Quick Serve';
  readonly pageSubtitle = 'Handle high-speed counter tickets with short queues and fast pickup handoff.';
  readonly filterTitle = this.pageTitle + ' Filters';
  readonly primaryActionLabel = 'Search ' + this.pageTitle;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Quick Serve Ticket';
  dialogSubtitle = 'Capture a fast-service ticket for counter billing and pickup.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Quick Serve Queue';
  readonly tableCaption = 'Quick Serve';
  tableColumns = QUICK_SERVE_COLUMNS;
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = 'Add Quick Ticket';
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
    this.updatePreview();
  }

  searchRows(): void {
    const searchText = this.filterSearchText.trim().toLowerCase();

    if (!searchText) {
      this.tableRows = [...this.allRows];
      return;
    }

    this.tableRows = this.allRows.filter((row) =>
      row.TicketNo.toLowerCase().includes(searchText) ||
      row.CounterName.toLowerCase().includes(searchText) ||
      row.OrderMode.toLowerCase().includes(searchText) ||
      row.PickupLabel.toLowerCase().includes(searchText)
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
    this.dialogTitle = 'Create Quick Serve Ticket';
    this.dialogSubtitle = 'Capture a fast-service ticket for counter billing and pickup.';
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
          row.TicketNo = this.dialogTicketNo;
          row.CounterName = this.dialogCounterName;
          row.OrderMode = this.dialogOrderMode;
          row.ItemCount = Number(this.dialogItemCount || 0);
          row.TotalAmount = Number(this.dialogTotalAmount || 0);
          row.PickupLabel = this.dialogPickupLabel;
        }

        return row;
      });

      this.toast.success('Updated', 'Quick serve ticket updated successfully.');
    } else {
      this.allRows.unshift({
        Id: Date.now(),
        TicketNo: this.dialogTicketNo,
        CounterName: this.dialogCounterName,
        OrderMode: this.dialogOrderMode,
        ItemCount: Number(this.dialogItemCount || 0),
        TotalAmount: Number(this.dialogTotalAmount || 0),
        PickupLabel: this.dialogPickupLabel,
        IsActive: true,
        Status: 'Queued',
        RowNumber: 0
      });

      this.toast.success('Saved', 'Quick serve ticket saved successfully.');
    }

    this.refreshRows();
    this.closeAddDialog();
  }

  editRow(row: QuickServeRow): void {
    this.isEditMode = true;
    this.dialogId = row.Id;
    this.dialogTicketNo = row.TicketNo;
    this.dialogCounterName = row.CounterName;
    this.dialogOrderMode = row.OrderMode;
    this.dialogItemCount = String(row.ItemCount);
    this.dialogTotalAmount = String(row.TotalAmount);
    this.dialogPickupLabel = row.PickupLabel;
    this.dialogTitle = 'Edit Quick Serve Ticket';
    this.dialogSubtitle = 'Update the selected quick-service ticket before it is handed over.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;
  }

  deleteRow(row: QuickServeRow): void {
    this.allRows = this.allRows.filter((item) => item.Id !== row.Id);
    this.refreshRows();
    this.toast.success('Deleted', row.TicketNo + ' removed successfully.');
  }

  activateRow(row: QuickServeRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = true;
        item.Status = 'Queued';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Reopened', row.TicketNo + ' reopened successfully.');
  }

  deactivateRow(row: QuickServeRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = false;
        item.Status = 'Served';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Served', row.TicketNo + ' marked as served.');
  }

  openRowActions(menu: any, event: Event, row: QuickServeRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: QuickServeRow): void {
    this.confirmationService.confirm({
      header: 'Delete Confirmation',
      message: 'Are you sure you want to delete ' + row.TicketNo + '?',
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

  confirmActivateRow(row: QuickServeRow): void {
    this.confirmationService.confirm({
      header: 'Reopen Confirmation',
      message: 'Are you sure you want to reopen ' + row.TicketNo + '?',
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

  confirmDeactivateRow(row: QuickServeRow): void {
    this.confirmationService.confirm({
      header: 'Serve Confirmation',
      message: 'Are you sure you want to mark ' + row.TicketNo + ' as served?',
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
    this.dialogTicketNo = '';
    this.dialogCounterName = '';
    this.dialogOrderMode = '';
    this.dialogItemCount = '';
    this.dialogTotalAmount = '';
    this.dialogPickupLabel = '';
  }

  private refreshRows(): void {
    this.allRows = this.allRows.map((row, index) => {
      row.RowNumber = index + 1;
      return row;
    });

    this.searchRows();
    this.updateSummary();
    this.updatePreview();
  }

  private updateSummary(): void {
    this.activeTickets = this.allRows.filter((row) => row.IsActive).length;
    this.totalItems = this.allRows.reduce((total, row) => total + row.ItemCount, 0);
    this.totalSales = this.allRows.reduce((total, row) => total + row.TotalAmount, 0);
  }

  private updatePreview(): void {
    const activeRow = this.allRows.find((row) => row.IsActive) ?? null;

    this.previewCounterName = activeRow?.CounterName ?? 'Counter 2';
    this.previewOrderMode = activeRow?.OrderMode ?? 'Take Away';
    this.previewPickupLabel = activeRow?.PickupLabel ?? 'Pickup Slip 14';
  }

  private isDialogFormValid(): boolean {
    return this.textFields?.toArray().every((field) => field.isValid) ?? true;
  }

  private getRowActionItems(row: QuickServeRow): MenuItem[] {
    const items: MenuItem[] = [
      { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') }
    ];

    if (row.IsActive) {
      items.unshift({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
      items.push({ label: 'Served', icon: 'pi pi-check-circle', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
    } else {
      items.push({ label: 'Reopen', icon: 'pi pi-refresh', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
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

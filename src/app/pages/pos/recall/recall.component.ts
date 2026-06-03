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

type RecallRow = {
  Id: number;
  RecallNo: string;
  BillNo: string;
  CustomerName: string;
  PhoneNo: string;
  OrderMode: string;
  OrderTotal: number;
  RecallReason: string;
  IsActive: boolean;
  Status: string;
  RowNumber: number;
};

const RECALL_COLUMNS: SharedTableColumn<RecallRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'RecallNo', header: 'Recall No', sortable: true, width: '11rem' },
  { field: 'BillNo', header: 'Bill No', sortable: true, width: '10rem' },
  { field: 'CustomerName', header: 'Customer', sortable: true, width: '14rem' },
  { field: 'PhoneNo', header: 'Phone', sortable: true, width: '11rem' },
  { field: 'OrderMode', header: 'Mode', sortable: true, width: '9rem' },
  { field: 'OrderTotal', header: 'Amount', sortable: true, width: '10rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '8rem' }
];

@Component({
  selector: 'app-recall',
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
  templateUrl: './recall.component.html',
  styleUrl: './recall.component.css'
})
export class RecallComponent {
  
  
  private readonly toast = inject(AppToastService);
  
  
  private readonly confirmationService = inject(ConfirmationService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  selectedRow: RecallRow | null = null;
  rowActionItems: MenuItem[] = [];
  allRows: RecallRow[] = [];
  tableRows: RecallRow[] = [];

  filterSearchText = '';

  dialogId = 0;
  dialogRecallNo = '';
  dialogBillNo = '';
  dialogCustomerName = '';
  dialogPhoneNo = '';
  dialogOrderMode = '';
  dialogOrderTotal = '';
  dialogRecallReason = '';

  totalRecalls = 0;
  activeRecalls = 0;
  totalAmount = 0;
  previewBillNo = 'BILL-2084';
  previewCustomerName = 'Asha Family';
  previewRecallReason = 'Guest asked for a copy and item review';

  readonly pageEyebrow = 'Orders';
  readonly pageTitle = 'Recall Orders';
  readonly pageSubtitle = 'Bring recent tickets back on screen for follow-up, review, or repeat service.';
  readonly filterTitle = this.pageTitle + ' Filters';
  readonly primaryActionLabel = 'Search ' + this.pageTitle;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Recall Ticket';
  dialogSubtitle = 'Capture the bill details that need to be recalled at the counter.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Recall Queue';
  readonly tableCaption = 'Recall Orders';
  tableColumns = RECALL_COLUMNS;
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = 'Add Recall';
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
      row.RecallNo.toLowerCase().includes(searchText) ||
      row.BillNo.toLowerCase().includes(searchText) ||
      row.CustomerName.toLowerCase().includes(searchText) ||
      row.PhoneNo.toLowerCase().includes(searchText) ||
      row.RecallReason.toLowerCase().includes(searchText)
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
    this.dialogTitle = 'Create Recall Ticket';
    this.dialogSubtitle = 'Capture the bill details that need to be recalled at the counter.';
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
          row.RecallNo = this.dialogRecallNo;
          row.BillNo = this.dialogBillNo;
          row.CustomerName = this.dialogCustomerName;
          row.PhoneNo = this.dialogPhoneNo;
          row.OrderMode = this.dialogOrderMode;
          row.OrderTotal = Number(this.dialogOrderTotal || 0);
          row.RecallReason = this.dialogRecallReason;
        }

        return row;
      });

      this.toast.success('Updated', 'Recall order updated successfully.');
    } else {
      this.allRows.unshift({
        Id: Date.now(),
        RecallNo: this.dialogRecallNo,
        BillNo: this.dialogBillNo,
        CustomerName: this.dialogCustomerName,
        PhoneNo: this.dialogPhoneNo,
        OrderMode: this.dialogOrderMode,
        OrderTotal: Number(this.dialogOrderTotal || 0),
        RecallReason: this.dialogRecallReason,
        IsActive: true,
        Status: 'Pending',
        RowNumber: 0
      });

      this.toast.success('Saved', 'Recall order saved successfully.');
    }

    this.refreshRows();
    this.closeAddDialog();
  }

  editRow(row: RecallRow): void {
    this.isEditMode = true;
    this.dialogId = row.Id;
    this.dialogRecallNo = row.RecallNo;
    this.dialogBillNo = row.BillNo;
    this.dialogCustomerName = row.CustomerName;
    this.dialogPhoneNo = row.PhoneNo;
    this.dialogOrderMode = row.OrderMode;
    this.dialogOrderTotal = String(row.OrderTotal);
    this.dialogRecallReason = row.RecallReason;
    this.dialogTitle = 'Edit Recall Ticket';
    this.dialogSubtitle = 'Update the selected recall request before the bill is reopened.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;
  }

  deleteRow(row: RecallRow): void {
    this.allRows = this.allRows.filter((item) => item.Id !== row.Id);
    this.refreshRows();
    this.toast.success('Deleted', row.RecallNo + ' removed successfully.');
  }

  activateRow(row: RecallRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = true;
        item.Status = 'Pending';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Activated', row.RecallNo + ' reopened successfully.');
  }

  deactivateRow(row: RecallRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = false;
        item.Status = 'Completed';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Completed', row.RecallNo + ' marked as completed.');
  }

  openRowActions(menu: any, event: Event, row: RecallRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: RecallRow): void {
    this.confirmationService.confirm({
      header: 'Delete Confirmation',
      message: 'Are you sure you want to delete ' + row.RecallNo + '?',
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

  confirmActivateRow(row: RecallRow): void {
    this.confirmationService.confirm({
      header: 'Reopen Confirmation',
      message: 'Are you sure you want to reopen ' + row.RecallNo + '?',
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

  confirmDeactivateRow(row: RecallRow): void {
    this.confirmationService.confirm({
      header: 'Complete Confirmation',
      message: 'Are you sure you want to complete ' + row.RecallNo + '?',
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
    this.dialogRecallNo = '';
    this.dialogBillNo = '';
    this.dialogCustomerName = '';
    this.dialogPhoneNo = '';
    this.dialogOrderMode = '';
    this.dialogOrderTotal = '';
    this.dialogRecallReason = '';
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
    this.totalRecalls = this.allRows.length;
    this.activeRecalls = this.allRows.filter((row) => row.IsActive).length;
    this.totalAmount = this.allRows.reduce((total, row) => total + row.OrderTotal, 0);
  }

  private updatePreview(): void {
    const activeRow = this.allRows.find((row) => row.IsActive) ?? null;

    this.previewBillNo = activeRow?.BillNo ?? 'BILL-2084';
    this.previewCustomerName = activeRow?.CustomerName ?? 'Asha Family';
    this.previewRecallReason = activeRow?.RecallReason ?? 'Guest asked for a copy and item review';
  }

  private isDialogFormValid(): boolean {
    return this.textFields?.toArray().every((field) => field.isValid) ?? true;
  }

  private getRowActionItems(row: RecallRow): MenuItem[] {
    const items: MenuItem[] = [
      { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') }
    ];

    if (row.IsActive) {
      items.unshift({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
      items.push({ label: 'Completed', icon: 'pi pi-check-circle', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
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

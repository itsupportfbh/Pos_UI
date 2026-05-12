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

type OrderEditRow = {
  Id: number;
  OrderNo: string;
  TableName: string;
  GuestName: string;
  ItemCount: number;
  OrderTotal: number;
  UpdatedBy: string;
  Notes: string;
  IsActive: boolean;
  Status: string;
  RowNumber: number;
};

const ORDER_EDIT_COLUMNS: SharedTableColumn<OrderEditRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'OrderNo', header: 'Order No', sortable: true, width: '11rem' },
  { field: 'TableName', header: 'Table', sortable: true, width: '9rem' },
  { field: 'GuestName', header: 'Guest', sortable: true, width: '14rem' },
  { field: 'ItemCount', header: 'Items', sortable: true, width: '7rem' },
  { field: 'OrderTotal', header: 'Total', sortable: true, width: '10rem' },
  { field: 'UpdatedBy', header: 'Updated By', sortable: true, width: '12rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '8rem' }
];

@Component({
  selector: 'app-order-edit',
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
  templateUrl: './order-edit.component.html',
  styleUrl: './order-edit.component.css'
})
export class OrderEditComponent {
  private readonly toast = inject(AppToastService);
  private readonly confirmationService = inject(ConfirmationService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  selectedRow: OrderEditRow | null = null;
  rowActionItems: MenuItem[] = [];
  allRows: OrderEditRow[] = [];
  tableRows: OrderEditRow[] = [];

  filterSearchText = '';

  dialogId = 0;
  dialogOrderNo = '';
  dialogTableName = '';
  dialogGuestName = '';
  dialogItemCount = '';
  dialogOrderTotal = '';
  dialogUpdatedBy = '';
  dialogNotes = '';

  totalTickets = 0;
  totalItems = 0;
  totalAmount = 0;
  previewOrderNo = 'ORD-EDIT-01';
  previewTableName = 'Table 6';
  previewGuestName = 'Walk-in Guest';
  previewNotes = 'Guest changed one item before billing';

  readonly pageEyebrow = 'Orders';
  readonly pageTitle = 'Edit Orders';
  readonly pageSubtitle = 'Reopen active tickets and update items, guests, or notes without slowing service.';
  readonly filterTitle = this.pageTitle + ' Filters';
  readonly primaryActionLabel = 'Search ' + this.pageTitle;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Edit Order';
  dialogSubtitle = 'Capture ticket details that need a menu or guest update.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Edit Queue';
  readonly tableCaption = 'Edit Orders';
  tableColumns = ORDER_EDIT_COLUMNS;
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = 'Add Edit Request';
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
      row.OrderNo.toLowerCase().includes(searchText) ||
      row.TableName.toLowerCase().includes(searchText) ||
      row.GuestName.toLowerCase().includes(searchText) ||
      row.UpdatedBy.toLowerCase().includes(searchText) ||
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
    this.dialogTitle = 'Create Edit Order';
    this.dialogSubtitle = 'Capture ticket details that need a menu or guest update.';
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
          row.OrderNo = this.dialogOrderNo;
          row.TableName = this.dialogTableName;
          row.GuestName = this.dialogGuestName;
          row.ItemCount = Number(this.dialogItemCount || 0);
          row.OrderTotal = Number(this.dialogOrderTotal || 0);
          row.UpdatedBy = this.dialogUpdatedBy;
          row.Notes = this.dialogNotes;
        }

        return row;
      });

      this.toast.success('Updated', 'Edit order updated successfully.');
    } else {
      this.allRows.unshift({
        Id: Date.now(),
        OrderNo: this.dialogOrderNo,
        TableName: this.dialogTableName,
        GuestName: this.dialogGuestName,
        ItemCount: Number(this.dialogItemCount || 0),
        OrderTotal: Number(this.dialogOrderTotal || 0),
        UpdatedBy: this.dialogUpdatedBy,
        Notes: this.dialogNotes,
        IsActive: true,
        Status: 'Open',
        RowNumber: 0
      });

      this.toast.success('Saved', 'Edit order saved successfully.');
    }

    this.refreshRows();
    this.closeAddDialog();
  }

  editRow(row: OrderEditRow): void {
    this.isEditMode = true;
    this.dialogId = row.Id;
    this.dialogOrderNo = row.OrderNo;
    this.dialogTableName = row.TableName;
    this.dialogGuestName = row.GuestName;
    this.dialogItemCount = String(row.ItemCount);
    this.dialogOrderTotal = String(row.OrderTotal);
    this.dialogUpdatedBy = row.UpdatedBy;
    this.dialogNotes = row.Notes;
    this.dialogTitle = 'Edit Order Ticket';
    this.dialogSubtitle = 'Update the selected edit request before service continues.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;
  }

  deleteRow(row: OrderEditRow): void {
    this.allRows = this.allRows.filter((item) => item.Id !== row.Id);
    this.refreshRows();
    this.toast.success('Deleted', row.OrderNo + ' removed successfully.');
  }

  activateRow(row: OrderEditRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = true;
        item.Status = 'Open';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Activated', row.OrderNo + ' reopened successfully.');
  }

  deactivateRow(row: OrderEditRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = false;
        item.Status = 'Closed';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Closed', row.OrderNo + ' closed successfully.');
  }

  openRowActions(menu: any, event: Event, row: OrderEditRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: OrderEditRow): void {
    this.confirmationService.confirm({
      header: 'Delete Confirmation',
      message: 'Are you sure you want to delete ' + row.OrderNo + '?',
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

  confirmActivateRow(row: OrderEditRow): void {
    this.confirmationService.confirm({
      header: 'Reopen Confirmation',
      message: 'Are you sure you want to reopen ' + row.OrderNo + '?',
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

  confirmDeactivateRow(row: OrderEditRow): void {
    this.confirmationService.confirm({
      header: 'Close Confirmation',
      message: 'Are you sure you want to close ' + row.OrderNo + '?',
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
    this.dialogOrderNo = '';
    this.dialogTableName = '';
    this.dialogGuestName = '';
    this.dialogItemCount = '';
    this.dialogOrderTotal = '';
    this.dialogUpdatedBy = '';
    this.dialogNotes = '';
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
    this.totalTickets = this.allRows.length;
    this.totalItems = this.allRows.reduce((total, row) => total + row.ItemCount, 0);
    this.totalAmount = this.allRows.reduce((total, row) => total + row.OrderTotal, 0);
  }

  private updatePreview(): void {
    const activeRow = this.allRows.find((row) => row.IsActive) ?? null;

    this.previewOrderNo = activeRow?.OrderNo ?? 'ORD-EDIT-01';
    this.previewTableName = activeRow?.TableName ?? 'Table 6';
    this.previewGuestName = activeRow?.GuestName ?? 'Walk-in Guest';
    this.previewNotes = activeRow?.Notes ?? 'Guest changed one item before billing';
  }

  private isDialogFormValid(): boolean {
    return this.textFields?.toArray().every((field) => field.isValid) ?? true;
  }

  private getRowActionItems(row: OrderEditRow): MenuItem[] {
    const items: MenuItem[] = [
      { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') }
    ];

    if (row.IsActive) {
      items.unshift({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
      items.push({ label: 'Close', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
    } else {
      items.push({ label: 'Reopen', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
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

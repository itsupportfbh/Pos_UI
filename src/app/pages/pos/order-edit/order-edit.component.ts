import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, QueryList, ViewChildren, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';

import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';


import { AppToastService } from '../../../services/app-toast.service';


import { DisplayMenuItemsService } from '../../../services/display-menu-items.service';
import { SharedTableCellTemplateDirective, SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';

const ACTIVE_HELD_ORDER_STORAGE_KEY = 'activeHeldOrder';

const ORDER_STATUS = {
  Hold: 0,
  InKitchen: 1,
  Preparing: 2,
  Ready: 3,
  Served: 4,
  Cancelled: 5,
  Completed: 6
} as const;

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
  RawOrder?: any;
};

const ORDER_EDIT_COLUMNS: SharedTableColumn<OrderEditRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'OrderNo', header: 'Order No', sortable: true, width: '11rem' },
  { field: 'TableName', header: 'Table', sortable: true, width: '9rem' },
  { field: 'GuestName', header: 'Guest', sortable: true, width: '14rem' },
  { field: 'ItemCount', header: 'Items', sortable: true, width: '7rem' },
  { field: 'OrderTotal', header: 'Total', sortable: true, width: '10rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '8rem' },
  { field: 'Notes', header: 'Notes', sortable: true, width: '14rem' }
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
  
  
  private readonly displayMenuItemsService = inject(DisplayMenuItemsService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly cdr = inject(ChangeDetectorRef);
  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  selectedRow: OrderEditRow | null = null;
  rowActionItems: MenuItem[] = [];
  allRows: OrderEditRow[] = [];
  tableRows: OrderEditRow[] = [];
  userDetails: any = {};
  isLoading = false;

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
  readonly showAddNewButton = false;
  readonly addNewButtonLabel = 'Add Edit Request';
  readonly showFilterButton = true;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';
  viewReady = false;
  ngOnInit(): void {

    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    setTimeout(() => {
    this.viewReady = true;
    this.loadRows();
    this.cdr.detectChanges();
  });
    
  }

  loadRows(): void {
    this.isLoading = true;

    this.displayMenuItemsService.getAll(this.getUserOrgId(), this.getUserBranchId()).subscribe({
      next: (response: any) => {
        const orders = this.getResponseList(response)
          .filter((order: any) => !this.getBooleanValue(order, 'IsDeleted', 'isDeleted'));

        this.allRows = orders.map((order: any, index: number) => this.mapOrderToRow(order, index));
        this.tableRows = [...this.allRows];
        this.updateSummary();
        this.updatePreview();
      },
      error: () => {
        this.allRows = [];
        this.tableRows = [];
        this.updateSummary();
        this.updatePreview();
        this.toast.error('Load Failed', 'Unable to load edit orders.');
      },
      complete: () => {
         setTimeout(() => {
    this.isLoading = false;
    this.cdr.detectChanges();
  });
      }
    });
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
    this.openOrderForEdit(row);
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

  private openOrderForEdit(row: OrderEditRow): void {
    const orderId = row.Id;

    if (!orderId) {
      this.toast.error('Invalid Order', 'Unable to open this order for edit.');
      return;
    }

    this.displayMenuItemsService.getById(orderId).subscribe({
      next: (response: any) => {
        const orderDetails = this.buildOpenOrderDetails(row.RawOrder ?? row, response);
        this.openOrderScreen(orderDetails);
      },
      error: () => {
        const orderDetails = this.buildOpenOrderDetails(row.RawOrder ?? row, null);
        this.openOrderScreen(orderDetails);
      }
    });
  }

  private openOrderScreen(orderDetails: any): void {
    try {
      localStorage.setItem(ACTIVE_HELD_ORDER_STORAGE_KEY, JSON.stringify(this.toSerializableOrder(orderDetails)));
      this.router.navigate(['/pos/order-screen']);
    } catch {
      this.toast.error('Open Failed', 'Unable to open this order.');
    }
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

    this.previewOrderNo = activeRow?.OrderNo ?? '0';
    this.previewTableName = activeRow?.TableName ?? '0';
    this.previewGuestName = activeRow?.GuestName ?? 'Walk-in Guest';
    this.previewNotes = activeRow?.Notes ?? 'Guest changed one item before billing';
  }

  private isDialogFormValid(): boolean {
    return this.textFields?.toArray().every((field) => field.isValid) ?? true;
  }

  private getRowActionItems(row: OrderEditRow): MenuItem[] {
    return [
      { label: 'Edit Order', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') }
    ];
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

  private mapOrderToRow(order: any, index: number): OrderEditRow {
    const rawStatus = this.getRawValue(order, 'OrderStatus', 'Orderstatus', 'orderStatus', 'orderstatus', 'Status', 'status');
    const status = this.getStatusLabel(rawStatus);

    return {
      Id: this.getNumberValue(order,  'OrderId'),
      OrderNo: this.getOrderNumber(order) || '-',
      TableName: this.getStringValue(order, 'TableName') || 'Counter',
      GuestName: this.getStringValue(order, 'CustomerName') || 'Walk-in Guest',
      ItemCount: this.getNumberValue(order, 'ItemCount') || this.getOrderItems(order).length,
      OrderTotal: this.getNumberValue(order, 'TotalAmount'),
      UpdatedBy: this.getStringValue(order, 'UpdatedBy', 'updatedBy', 'CreatedBy', 'createdBy') || '-',
      Notes: this.getStringValue(order, 'Notes' ) ,
      IsActive: status.trim().toLowerCase() !== 'completed' && !this.getBooleanValue(order, 'IsDeleted', 'isDeleted'),
      Status: status,
      RowNumber: index + 1,
      RawOrder: order
    };
  }

  private buildOpenOrderDetails(listOrder: any, response: any): any {
    const apiResult = response?.result ?? response?.Result ?? response ?? null;
    const apiOrderDetails = this.extractOrderHeader(apiResult) ?? listOrder;
    const detailItems = this.extractOrderItems(apiResult, apiOrderDetails, listOrder);

    return {
      ...listOrder,
      ...apiOrderDetails,
      Items: detailItems,
      items: detailItems,
      OrderHoldItems: detailItems,
      orderHoldItems: detailItems
    };
  }

  private toSerializableOrder(order: any): any {
    const source = order as any;
    const orderId = this.getOrderId(order);
    const items = this.getOrderItems(order).map((item: any) => {
      const itemId = this.getNumberValue(item, 'itemid', 'Itemid', 'ItemId', 'itemId', 'Id', 'id');

      return {
        Id: itemId,
        id: itemId,
        Itemid: itemId,
        itemid: itemId,
        ItemId: itemId,
        itemId,
        Orderid: this.getNumberValue(item, 'Orderid', 'orderid', 'OrderId', 'orderId') || orderId,
        Menuitemid: this.getStringValue(item, 'Menuitemid', 'menuitemid', 'MenuItemId', 'menuItemId'),
        ComboMenuId: this.getNumberValue(item, 'ComboMenuId', 'comboMenuId', 'Combomenuid', 'combomenuid'),
        ComboMenuItemId: this.getNumberValue(item, 'ComboMenuItemId', 'comboMenuItemId', 'Combomenuitemid', 'combomenuitemid'),
        Itemname: this.getStringValue(item, 'Itemname', 'itemname', 'ItemName', 'itemName', 'Name', 'name'),
        Quantity: this.getNumberValue(item, 'Quantity', 'quantity', 'Qty', 'qty') || 1,
        Unitprice: this.getNumberValue(item, 'Unitprice', 'unitprice', 'UnitPrice', 'unitPrice', 'Price', 'price'),
        Totalprice: this.getNumberValue(item, 'Totalprice', 'totalprice', 'TotalPrice', 'totalPrice'),
        DiscountAmount: this.getNumberValue(item, 'DiscountAmount', 'discountAmount'),
        TaxAmount: this.getNumberValue(item, 'TaxAmount', 'taxAmount'),
        Modifierdetails: this.getStringValue(item, 'Modifierdetails', 'modifierdetails') || null,
        Itemstatus: this.getStringValue(item, 'Itemstatus', 'itemstatus') || this.getOrderStatus(order),
        Notes: this.getStringValue(item, 'Notes', 'notes') || null,
        OrgId: this.getNumberValue(item, 'OrgId', 'orgId') || this.getUserOrgId(),
        BranchId: this.getNumberValue(item, 'BranchId', 'branchId') || this.getUserBranchId()
      };
    });

    return {
      ...source,
      Id: orderId,
      id: orderId,
      SavedOrderId: orderId,
      Orderid: orderId,
      orderId,
      OrderNumber: this.getOrderNumber(order),
      TableId: this.getNumberValue(source,  'TableId'),
      OrderType: this.getStringValue(source,  'OrderType', ),
      OrderStatus: this.getOrderStatus(order),
      CustomerName: this.getStringValue(source, 'CustomerName'),
      CustomerPhone: this.getStringValue(source, 'CustomerPhone' ),
      Itemcount: this.getNumberValue(source, 'ItemCount',) || items.length,
      SubtotalAmount: this.getNumberValue(source, 'SubtotalAmount', 'subtotalAmount', 'Subtotal', 'subtotal'),
      TaxAmount: this.getNumberValue(source, 'TaxAmount'),
      DiscountAmount: this.getNumberValue(source, 'DiscountAmount'),
      TotalAmount: this.getNumberValue(source, 'TotalAmount'),
      Shiftid: this.getNumberValue(source, 'Shiftid', 'shiftid', 'ShiftId', 'shiftId'),
      OrgId: this.getNumberValue(source, 'OrgId') || this.getUserOrgId(),
      BranchId: this.getNumberValue(source, 'BranchId') || this.getUserBranchId(),
      orderNo: this.getOrderNumber(order),
      table: this.getStringValue(source, 'TableName'),
      customerName: this.getStringValue(source, 'CustomerName', ),
      Items: items,
      items,
      OrderHoldItems: items,
     // orderHoldItems: items
    };
  }

  private extractOrderHeader(apiResult: any): any | null {
    if (!apiResult) {
      return null;
    }

    if (Array.isArray(apiResult)) {
      return apiResult.find((row: any) => this.isOrderLikeObject(row)) ?? apiResult[0] ?? null;
    }

    const source = apiResult as any;
    const nestedHeader = source.Order ??
      source.order ??
      source.OrderHeader ??
      source.orderHeader ??
      source.Header ??
      source.header ??
      source.Master ??
      source.master;

    if (Array.isArray(nestedHeader)) {
      return nestedHeader.find((row: any) => this.isOrderLikeObject(row)) ?? nestedHeader[0] ?? null;
    }

    return nestedHeader && typeof nestedHeader === 'object' ? nestedHeader : apiResult;
  }

  private extractOrderItems(apiResult: any, apiOrderDetails: any, listOrder: any): any[] {
    const resultItems = this.getOrderItems(apiResult);
    const detailItems = this.getOrderItems(apiOrderDetails);
    const listItems = this.getOrderItems(listOrder);

    if (resultItems.length) {
      return resultItems;
    }

    if (detailItems.length) {
      return detailItems;
    }

    if (Array.isArray(apiResult)) {
      const itemRows = apiResult.filter((item: any) => this.isOrderItemLikeObject(item));

      if (itemRows.length) {
        return itemRows;
      }
    }

    return listItems;
  }

  private getOrderItems(order: any): any[] {
    const items = order?.Items ??
      
      [];

    return Array.isArray(items) ? items : [];
  }

  private getResponseList(response: any): any[] {
    const result = response?.result ?? response?.Result ?? response;

    if (Array.isArray(result)) {
      return result;
    }

    const nestedList = result?.data ??
      result?.Data ??
      result?.items ??
      result?.Items ??
      result?.orders ??
      result?.Orders ??
      result?.list ??
      result?.List;

    if (Array.isArray(nestedList)) {
      return nestedList;
    }

    return result && typeof result === 'object' ? [result] : [];
  }

  private getOrderId(order: any): number {
    return this.getNumberValue(order,  'OrderId');
  }

  private getOrderNumber(order: any): string {
    return this.getStringValue(order, 'OrderNumber');
  }

  private getOrderStatus(order: any): string {
    return this.getStatusLabel(this.getRawValue(order, 'OrderStatus', 'Orderstatus', 'orderStatus', 'orderstatus', 'Status', 'status'));
  }

  private isOrderLikeObject(value: any): boolean {
    return Boolean(value && typeof value === 'object' && (
      value.Orderid !== undefined ||
     
      value.OrderNumber !== undefined 
     
    ));
  }

  private isOrderItemLikeObject(value: any): boolean {
    return Boolean(value && typeof value === 'object' && (
      value.Menuitemid !== undefined ||
      value.ComboMenuItemId !== undefined ||
      value.Itemname !== undefined ||
      value.Quantity !== undefined 
      
    ));
  }

  private getUserOrgId(): number {
    return Number(this.userDetails.RoleId || 0) === 1
      ? 0
      : this.getNumberValue(this.userDetails, 'OrgId');
  }

  private getUserBranchId(): number {
    return Number(this.userDetails.IsAdmin || 0) === 1 || Number(this.userDetails.RoleId || 0) === 1
      ? 0
      : this.getNumberValue(this.userDetails, 'BranchId');
  }

  private getStringValue(source: any, ...keys: string[]): string {
    const value = keys.map((key) => source?.[key]).find((item) => item !== undefined && item !== null);
    return value?.toString() ?? '';
  }

  private getRawValue(source: any, ...keys: string[]): unknown {
    return keys.map((key) => source?.[key]).find((item) => item !== undefined && item !== null);
  }

  private getStatusCode(status: unknown): number | null {
    if (typeof status === 'number' && Number.isFinite(status)) {
      return status;
    }

    const normalizedStatus = String(status ?? '').trim().toLowerCase().replace(/\s+/g, '');

    switch (normalizedStatus) {
      case '0':
      case 'hold':
        return ORDER_STATUS.Hold;
      case '1':
      case 'inkitchen':
        return ORDER_STATUS.InKitchen;
      case '2':
      case 'inprocess':
      case 'preparing':
        return ORDER_STATUS.Preparing;
      case '3':
      case 'ready':
      case 'readytoserve':
        return ORDER_STATUS.Ready;
      case '4':
      case 'served':
        return ORDER_STATUS.Served;
      case '5':
      case 'cancelled':
      case 'canceled':
        return ORDER_STATUS.Cancelled;
      case '6':
      case 'completed':
        return ORDER_STATUS.Completed;
      default:
        return null;
    }
  }

  private getStatusLabel(status: unknown): string {
    switch (this.getStatusCode(status)) {
      case ORDER_STATUS.Hold:
        return 'Hold';
      case ORDER_STATUS.InKitchen:
        return 'In Kitchen';
      case ORDER_STATUS.Preparing:
        return 'Preparing';
      case ORDER_STATUS.Ready:
        return 'Ready';
      case ORDER_STATUS.Served:
        return 'Served';
      case ORDER_STATUS.Cancelled:
        return 'Cancelled';
      case ORDER_STATUS.Completed:
        return 'Completed';
      default:
        return this.getStringValue({ status }, 'status') || 'Open';
    }
  }

  private getNumberValue(source: any, ...keys: string[]): number {
    const value = keys.map((key) => source?.[key]).find((item) => item !== undefined && item !== null);
    return Number(value ?? 0);
  }

  private getBooleanValue(source: any, ...keys: string[]): boolean {
    const value = keys.map((key) => source?.[key]).find((item) => item !== undefined && item !== null);

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value === 1;
    }

    return String(value ?? '').toLowerCase() === 'true' || String(value ?? '') === '1';
  }
}

import { CommonModule } from '@angular/common';
import { ChangeDetectorRef,Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MenuModule } from 'primeng/menu';

import { SharedTableCellTemplateDirective, SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';
import { AppToastService } from '../../../services/app-toast.service';
import { OrderHoldService } from '../../../services/order-hold.service';

type HeldOrderItem = {
  itemid?: number;
  Itemid?: number;
  itemId?: number;
  orderid?: number;
  Orderid?: number;
  orderId?: number;
  OrderId?: number;
  menuitemid?: string | number;
  Menuitemid?: string | number;
  menuItemId?: string | number;
  MenuItemId?: string | number;
  comboMenuItemId?: number;
  ComboMenuItemId?: number;
  itemname?: string;
  Itemname?: string;
  Quantity?: number;
  unitprice?: number;
  Unitprice?: number;
  totalprice?: number;
  Totalprice?: number;
  id: number;
  name: string;
  category: string;
  subCategory: string;
  price: number;
  quantity: number;
  lineTotal: number;
};

type HeldOrder = {
  Id?: number;
  orderId?: number;
  OrderId?: number;
  Orderid?: number;
  orderid?: number;
  ordernumber?: string;
  Ordernumber?: string;
  tableid?: string | number;
  Tableid?: string | number;
  TableName?: string;
  tableName?: string;
  ordertype?: string;
  Ordertype?: string;
  orderstatus?: string;
  Orderstatus?: string;
  CustomerName?: string;
  GuestName?: string;
  guestName?: string;
  ContactNumber?: string;
  contactNumber?: string;
  CustomerPhone?: string;
  customerPhone?: string;
  Phone?: string;
  phone?: string;
  itemcount?: number;
  Itemcount?: number;
  itemCount?: number;
  ItemCount?: number;
  guestcount?: number;
  Guestcount?: number;
  subtotalAmount?: number;
  SubtotalAmount?: number;
  TaxAmount?: number;
  DiscountAmount?: number;
  totalAmount?: number;
  TotalAmount?: number;
  shiftid?: string | number;
  Shiftid?: string | number;
  orgId?: number;
  OrgId?: number;
  IsDeleted?: boolean;
  CreatedBy?: string;
  CreatedDate?: string;
  UpdatedBy?: string | null;
  UpdatedDate?: string | null;
  id: number;
  orderNo: string;
  orderType: string;
  table: string;
  customerName: string;
  heldAt: string;
  Items?: HeldOrderItem[];
  items?: HeldOrderItem[];
  OrderHoldItems?: HeldOrderItem[];
  orderHoldItems?: HeldOrderItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
};

type HeldOrderRow = Omit<HeldOrder, 'Items'> & {
  HoldId: number;
  RowNumber: number;
  OrderNo: string;
  Type: string;
  Table: string;
  Status: string;
  Items: number;
  Subtotal: number;
  Tax: number;
  Discount: number;
  Total: number;
  HeldTime: string;
};

const ACTIVE_HELD_ORDER_STORAGE_KEY = 'activeHeldOrder';
const HELD_TIME_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

const ORDER_HOLD_COLUMNS: SharedTableColumn<HeldOrderRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'OrderNo', header: 'Order No', sortable: true, width: '13rem' },
  { field: 'Type', header: 'Type', sortable: true, width: '10rem' },
  { field: 'TableName', header: 'Table', sortable: true, width: '8rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '8rem' },
  { field: 'Items', header: 'NOofItems', sortable: true, width: '7rem' },
  { field: 'Subtotal', header: 'Subtotal', sortable: true, width: '10rem' },
  { field: 'Tax', header: 'Tax', sortable: true, width: '9rem' },
  { field: 'Discount', header: 'Discount', sortable: true, width: '10rem' },
  { field: 'Total', header: 'Total', sortable: true, width: '10rem' },
 // { field: 'HeldTime', header: 'Held Time', sortable: true, width: '14rem' }
];

@Component({
  selector: 'app-order-hold',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    MenuModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective
  ],
  templateUrl: './order-hold.component.html',
  styleUrl: './order-hold.component.css'
})
export class OrderHoldComponent implements OnInit {
  heldOrders: HeldOrder[] = [];
  tableRows: HeldOrderRow[] = [];
  selectedRow: HeldOrderRow | null = null;
  rowActionItems: MenuItem[] = [];
  isLoading = false;
  userDetails: any = {};
  orgId = 0;
  totalHeldOrdersCount = 0;
  totalHeldItemsCount = 0;
  totalHeldAmountValue = 0;

  readonly pageEyebrow = 'Orders';
  readonly pageTitle = 'Hold Orders';
  readonly pageSubtitle = 'Review held tickets, tables, and totals before sending them back to service.';
  readonly tableTitle = 'Hold Orders';
  readonly tableCaption = 'Hold Orders';
  readonly tableColumns = ORDER_HOLD_COLUMNS;
  readonly showFilterButton = false;
  readonly showAddNewButton = false;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';
  readonly tableDataKey = 'HoldId';
viewReady = false;
 constructor(
  private readonly toast: AppToastService,
  private readonly orderHoldService: OrderHoldService,
  private readonly router: Router,
  private readonly cdr: ChangeDetectorRef
) {}

ngOnInit(): void {
  this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
  this.orgId = this.getUserOrgId();

  setTimeout(() => {
    this.viewReady = true;
    this.loadHeldOrders();
    this.cdr.detectChanges();
  });
}

  get totalHeldOrders(): number {
    return this.totalHeldOrdersCount;
  }

  get totalHeldItems(): number {
    return this.totalHeldItemsCount;
  }

  get totalHeldAmount(): number {
    return this.totalHeldAmountValue;
  }

  loadHeldOrders(): void {
    this.isLoading = true;

    this.orderHoldService.getAll(this.orgId).subscribe({
      next: (response: any) => {
        this.heldOrders = this.getResultArray(response);
        this.rebuildViewModel();
      },
      error: () => {
        this.heldOrders = [];
        this.tableRows = [];
        this.totalHeldOrdersCount = 0;
        this.totalHeldItemsCount = 0;
        this.totalHeldAmountValue = 0;
        this.toast.error('Load Failed', 'Unable to load held orders from API.');
      },
     complete: () => {
  setTimeout(() => {
    this.isLoading = false;
    this.cdr.detectChanges();
  });
}
    });
  }

  removeHeldOrder(orderId: number): void {
    const order = this.heldOrders.find((item) => this.getOrderId(item) === orderId);

    this.orderHoldService.delete(orderId).subscribe({
      next: () => {
        this.heldOrders = this.heldOrders.filter((item) => this.getOrderId(item) !== orderId);
        this.refreshTableRows();
        this.toast.success('Removed', `${this.getOrderNumber(order)} removed from hold list.`);
      },
      error: () => {
        this.toast.error('Remove Failed', 'Unable to remove held order from API.');
      }
    });
  }

  clearHeldOrders(): void {
    if (!this.heldOrders.length) {
      return;
    }

    const deleteCalls = this.heldOrders.map((order) => this.orderHoldService.delete(this.getOrderId(order)));

    forkJoin(deleteCalls).subscribe({
      next: () => {
        this.heldOrders = [];
        this.refreshTableRows();
        this.toast.success('Cleared', 'All held orders cleared.');
      },
      error: () => {
        this.toast.error('Clear Failed', 'Unable to clear held orders from API.');
      }
    });
  }

  backToOrderScreen(): void {
    this.router.navigate(['/pos/order-screen']);
  }

  openHeldOrder(order: HeldOrder | HeldOrderRow): void {
    const orderId = this.getOrderDetailId(order);

    if (!orderId) {
      const orderDetails = this.buildOpenOrderDetails(order, null);
      this.openOrderScreen(orderDetails);
      return;
    }

    forkJoin({
      header: this.orderHoldService.getById(orderId).pipe(catchError(() => of(null))),
      details: this.orderHoldService.getAllHoldorderDetails(orderId).pipe(catchError(() => of(null)))
    }).subscribe({
      next: ({ header, details }: any) => {
        const headerDetails = this.getResultObject(header) ?? {};
        const orderDetails = this.buildOpenOrderDetails({ ...order, ...headerDetails } as HeldOrder, details);
        this.openOrderScreen(orderDetails);
      }
    });
  }

  openRowActions(menu: any, event: Event, row: HeldOrderRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems();
    menu.toggle(event);
  }

  getItemCount(order: HeldOrder): number {
    const source = order as any;
    const items = this.getOrderItems(order);
    return this.toNumber(source.Itemcount ?? source.itemcount ?? source.ItemCount ?? source.itemCount ?? source.Guestcount ?? source.guestcount ?? source.guestCount) ||
      items.reduce((total, item: any) => total + this.toNumber(item.quantity ?? item.Quantity), 0);
  }

  getOrderId(order: HeldOrder | HeldOrderRow): number {
    const source = order as any;
    return this.firstPositiveNumber(source.Id, source.id, source.HoldId, source.OrderHoldId, source.orderHoldId, source.Orderid, source.OrderId, source.orderid, source.orderId);
  }

  getOrderDetailId(order: HeldOrder | HeldOrderRow): number {
    const source = order as any;
    return this.firstPositiveNumber(source.orderId, source.OrderId, source.Orderid, source.orderid, source.Id, source.id, source.HoldId);
  }

  getOrderNumber(order?: HeldOrder | HeldOrderRow): string {
    const source = order as any;
    return source?.Ordernumber ?? source?.ordernumber ?? source?.orderNumber ?? source?.OrderNo ?? source?.orderno ?? source?.orderNo ?? 'Held order';
  }

  getOrderType(order: HeldOrder): string {
    const source = order as any;
    return source.Ordertype ?? source.ordertype ?? source.orderType ?? source.OrderType ?? 'Dine In';
  }

  getOrderStatus(order: HeldOrder): string {
    const source = order as any;
    return source.Orderstatus ?? source.orderstatus ?? source.orderStatus ?? source.OrderStatus ?? 'Hold';
  }

  getOrderTable(order: HeldOrder): string {
    const source = order as any;
    return source.Tableid ?? source.tableid ?? source.tableId ?? source.TableId ?? source.table ?? '-';
  }

  getOrderTableName(order: HeldOrder): string {
    const source = order as any;
    return source.TableName ?? source.tableName ?? source.TableCode ?? source.tableCode ?? source.Table ?? source.table ?? this.getOrderTable(order);
  }

  getOrderHeldDate(order: HeldOrder): string {
    const source = order as any;
    return source.CreatedDate ?? source.createdDate ?? source.heldAt ?? '';
  }

  getOrderSubtotal(order: HeldOrder): number {
    const source = order as any;
    return this.toNumber(source.SubtotalAmount ?? source.subtotalAmount ?? source.subtotal);
  }

  getOrderDiscount(order: HeldOrder): number {
    const source = order as any;
    return this.toNumber(source.DiscountAmount ?? source.discountAmount);
  }

  getOrderTax(order: HeldOrder): number {
    const source = order as any;
    return this.toNumber(source.TaxAmount ?? source.taxAmount);
  }

  getOrderTotal(order: HeldOrder): number {
    const source = order as any;
    return this.toNumber(source.TotalAmount ?? source.totalAmount ?? source.grandTotal);
  }

  formatHeldTime(value: string): string {
    if (!value) {
      return '';
    }

    return HELD_TIME_FORMATTER.format(new Date(value));
  }

  private refreshTableRows(): void {
    this.rebuildViewModel();
  }

  private rebuildViewModel(): void {
    let totalItems = 0;
    let totalAmount = 0;

    this.tableRows = this.heldOrders.map((order, index) => {
      const itemCount = this.getItemCount(order);
      const orderTotal = this.getOrderTotal(order);

      totalItems += itemCount;
      totalAmount += orderTotal;

      return this.toTableRow(order, index, itemCount, orderTotal);
    });

    this.totalHeldOrdersCount = this.heldOrders.length;
    this.totalHeldItemsCount = totalItems;
    this.totalHeldAmountValue = totalAmount;
  }

  private toTableRow(order: HeldOrder, index: number, itemCount = this.getItemCount(order), orderTotal = this.getOrderTotal(order)): HeldOrderRow {
    return {
      ...order,
      HoldId: this.getOrderId(order),
      RowNumber: index + 1,
      OrderNo: this.getOrderNumber(order),
      Type: this.getOrderType(order),
      Table: this.getOrderTableName(order),
      Status: this.getOrderStatus(order),
      Items: itemCount,
      Subtotal: this.getOrderSubtotal(order),
      Tax: this.getOrderTax(order),
      Discount: this.getOrderDiscount(order),
      Total: orderTotal,
      HeldTime: this.formatHeldTime(this.getOrderHeldDate(order))
    };
  }

  private getRowActionItems(): MenuItem[] {
    return [
      {
        label: 'Open Order',
        icon: 'pi pi-arrow-right',
        styleClass: 'row-action-open',
        command: () => {
          if (this.selectedRow) {
            this.openHeldOrder(this.selectedRow);
          }
        }
      },
      {
        label: 'Remove Hold',
        icon: 'pi pi-trash',
        styleClass: 'row-action-delete',
        command: () => {
          if (this.selectedRow) {
            this.removeHeldOrder(this.getOrderId(this.selectedRow));
          }
        }
      }
    ];
  }

  private getOrderItems(order: any): any[] {
    const source = order as any;
    const items = source.items ??
      source.Items ??
      source.orderHoldItems ??
      source.OrderHoldItems ??
      source.OrderholdItems ??
      source.Orderholditems ??
      source.orderholdItems ??
      source.orderholditems ??
      source.orderHoldItem ??
      source.OrderHoldItem ??
      source.orderHoldDetails ??
      source.OrderHoldDetails ??
      source.Orderholddetails ??
      source.orderholddetails ??
      source.orderHoldDetail ??
      source.OrderHoldDetail ??
      source.orderItems ??
      source.OrderItems ??
      source.orderItem ??
      source.OrderItem ??
      source.orderDetails ??
      source.OrderDetails ??
      source.details ??
      source.Details ??
      [];
    return Array.isArray(items) ? items : [];
  }

  private openOrderScreen(orderDetails: HeldOrder): void {
    try {
      localStorage.setItem(ACTIVE_HELD_ORDER_STORAGE_KEY, JSON.stringify(this.toSerializableHeldOrder(orderDetails)));
      this.router.navigate(['/pos/order-screen']);
    } catch {
      this.toast.error('Open Failed', 'Unable to open this held order.');
    }
  }

  private toSerializableHeldOrder(order: HeldOrder): HeldOrder {
    const source = order as any;
    const customerName = this.getCustomerName(source);
    const contactNumber = this.getContactNumber(source);
    const orderId = this.getOrderDetailId(order);
    const tableName = this.getOrderTableName(order);
    const items = this.getOrderItems(order).map((item: any) => ({
      Id: item.Id ?? item.id ?? item.itemid ?? item.Itemid ?? 0,
      itemid: item.itemid ?? item.Itemid ?? item.Id ?? item.id ?? 0,
      Orderid: item.Orderid ?? item.orderid ?? item.OrderId ?? item.orderId ?? orderId,
      orderid: item.orderid ?? item.Orderid ?? item.orderId ?? item.OrderId ?? orderId,
      Menuitemid: item.Menuitemid ?? item.menuitemid ?? item.MenuItemId ?? item.menuItemId ?? item.FoodMenuId ?? item.foodMenuId ?? '',
      menuitemid: item.menuitemid ?? item.Menuitemid ?? item.menuItemId ?? item.MenuItemId ?? item.FoodMenuId ?? item.foodMenuId ?? '',
      ComboMenuId: item.ComboMenuId ?? item.comboMenuId ?? item.Combomenuid ?? item.combomenuid ?? 0,
      ComboMenuItemId: item.ComboMenuItemId ?? item.comboMenuItemId ?? item.Combomenuitemid ?? item.combomenuitemid ?? 0,
      comboMenuItemId: item.comboMenuItemId ?? item.ComboMenuItemId ?? item.combomenuitemid ?? item.Combomenuitemid ?? 0,
      Itemname: item.Itemname ?? item.itemname ?? item.ItemName ?? item.itemName ?? item.name ?? '',
      itemname: item.itemname ?? item.Itemname ?? item.itemName ?? item.ItemName ?? item.name ?? '',
      Quantity: item.Quantity ?? item.quantity ?? item.Qty ?? item.qty ?? 1,
      quantity: item.quantity ?? item.Quantity ?? item.Qty ?? item.qty ?? 1,
      Unitprice: item.Unitprice ?? item.unitprice ?? item.UnitPrice ?? item.unitPrice ?? item.price ?? 0,
      unitprice: item.unitprice ?? item.Unitprice ?? item.unitPrice ?? item.UnitPrice ?? item.price ?? 0,
      Totalprice: item.Totalprice ?? item.totalprice ?? item.TotalPrice ?? item.totalPrice ?? item.lineTotal ?? 0,
      totalprice: item.totalprice ?? item.Totalprice ?? item.totalPrice ?? item.TotalPrice ?? item.lineTotal ?? 0,
      DiscountAmount: item.DiscountAmount ?? item.discountAmount ?? 0,
      discountAmount: item.discountAmount ?? item.DiscountAmount ?? 0,
      TaxAmount: item.TaxAmount ?? item.taxAmount ?? 0,
      taxAmount: item.taxAmount ?? item.TaxAmount ?? 0,
      Modifierdetails: item.Modifierdetails ?? item.modifierdetails ?? null,
      modifierdetails: item.modifierdetails ?? item.Modifierdetails ?? null,
      Itemstatus: item.Itemstatus ?? item.itemstatus ?? source.Orderstatus ?? source.orderstatus ?? 'Hold',
      itemstatus: item.itemstatus ?? item.Itemstatus ?? source.orderstatus ?? source.Orderstatus ?? 'Hold',
      Notes: item.Notes ?? item.notes ?? null,
      notes: item.notes ?? item.Notes ?? null,
      OrgId: item.OrgId ?? item.orgId ?? source.OrgId ?? source.orgId ?? 0,
      orgId: item.orgId ?? item.OrgId ?? source.orgId ?? source.OrgId ?? 0,
      BranchId: item.BranchId ?? item.branchId ?? source.BranchId ?? source.branchId ?? 0,
      branchId: item.branchId ?? item.BranchId ?? source.branchId ?? source.BranchId ?? 0
    }));

    return ({
      Id: this.getOrderId(order),
      id: this.getOrderId(order),
      Orderid: orderId,
      orderId,
      Ordernumber: this.getOrderNumber(order),
      ordernumber: this.getOrderNumber(order),
      Tableid: source.Tableid ?? source.tableid ?? source.tableId ?? source.TableId ?? 0,
      tableid: source.tableid ?? source.Tableid ?? source.tableId ?? source.TableId ?? 0,
      TableName: tableName,
      tableName,
      Ordertype: this.getOrderType(order),
      ordertype: this.getOrderType(order),
      Orderstatus: this.getOrderStatus(order),
      orderstatus: this.getOrderStatus(order),
      CustomerName: customerName,
      customerName,
      ContactNumber: contactNumber,
      contactNumber,
      CustomerPhone: contactNumber,
      customerPhone: contactNumber,
      Itemcount: this.getItemCount(order),
      itemcount: this.getItemCount(order),
      Guestcount: source.Guestcount ?? source.guestcount ?? this.getItemCount(order),
      SubtotalAmount: this.getOrderSubtotal(order),
      subtotalAmount: this.getOrderSubtotal(order),
      TaxAmount: this.getOrderTax(order),
      taxAmount: this.getOrderTax(order),
      DiscountAmount: this.getOrderDiscount(order),
      discountAmount: this.getOrderDiscount(order),
      TotalAmount: this.getOrderTotal(order),
      totalAmount: this.getOrderTotal(order),
      Shiftid: source.Shiftid ?? source.shiftid ?? source.ShiftId ?? source.shiftId ?? 0,
      shiftid: source.shiftid ?? source.Shiftid ?? source.shiftId ?? source.ShiftId ?? 0,
      OrgId: source.OrgId ?? source.orgId ?? this.orgId,
      orgId: source.orgId ?? source.OrgId ?? this.orgId,
      IsDeleted: source.IsDeleted ?? source.isDeleted ?? false,
      isDeleted: source.isDeleted ?? source.IsDeleted ?? false,
      CreatedBy: source.CreatedBy ?? source.createdBy ?? '',
      createdBy: source.createdBy ?? source.CreatedBy ?? '',
      CreatedDate: source.CreatedDate ?? source.createdDate ?? source.heldAt ?? '',
      createdDate: source.createdDate ?? source.CreatedDate ?? source.heldAt ?? '',
      UpdatedBy: source.UpdatedBy ?? source.updatedBy ?? null,
      updatedBy: source.updatedBy ?? source.UpdatedBy ?? null,
      UpdatedDate: source.UpdatedDate ?? source.updatedDate ?? null,
      updatedDate: source.updatedDate ?? source.UpdatedDate ?? null,
      branchId: source.branchId ?? source.BranchId ?? 0,
      orderNo: this.getOrderNumber(order),
      orderType: this.getOrderType(order),
      table: tableName,
      heldAt: source.CreatedDate ?? source.createdDate ?? source.heldAt ?? '',
      Items: items,
      items,
      OrderHoldItems: items,
      orderHoldItems: items,
      subtotal: this.getOrderSubtotal(order),
      discountPercent: 0,
      grandTotal: this.getOrderTotal(order)
    } as unknown) as HeldOrder;
  }

  private buildOpenOrderDetails(listOrder: HeldOrder | HeldOrderRow, response: any): HeldOrder {
    const apiResult = response?.result ?? response?.Result ?? response ?? null;
    const apiOrderDetails = (this.extractOrderHeader(apiResult) ?? listOrder) as HeldOrder;
    const detailItems = this.extractOrderItems(apiResult, apiOrderDetails, listOrder);
    const customerName = this.getCustomerName(apiOrderDetails) || this.getCustomerName(listOrder);
    const contactNumber = this.getContactNumber(apiOrderDetails) || this.getContactNumber(listOrder);

    return {
      ...listOrder,
      ...apiOrderDetails,
      CustomerName: customerName,
      customerName,
      ContactNumber: contactNumber,
      contactNumber,
      CustomerPhone: contactNumber,
      customerPhone: contactNumber,
      Items: detailItems,
      items: detailItems,
      OrderHoldItems: detailItems,
      orderHoldItems: detailItems
    };
  }

  private extractOrderHeader(apiResult: any): HeldOrder | null {
    if (!apiResult) {
      return null;
    }

    if (Array.isArray(apiResult)) {
      return this.findOrderLikeObject(apiResult);
    }

    const source = apiResult as any;
    const nestedHeader = source.OrderHold ??
      source.orderHold ??
      source.Orderhold ??
      source.orderhold ??
      source.Order ??
      source.order ??
      source.Header ??
      source.header ??
      source.Master ??
      source.master;

    if (Array.isArray(nestedHeader)) {
      return this.findOrderLikeObject(nestedHeader);
    }

    if (nestedHeader && typeof nestedHeader === 'object') {
      return nestedHeader;
    }

    return this.isOrderLikeObject(source) ? source : null;
  }

  private extractOrderItems(apiResult: any, apiOrderDetails: HeldOrder, listOrder: HeldOrder | HeldOrderRow): any[] {
    const resultItems = this.getOrderItems(apiResult as HeldOrder);
    const detailItems = this.getOrderItems(apiOrderDetails);
    const listItems = this.getOrderItems(listOrder);

    if (resultItems.length) {
      return resultItems;
    }

    if (detailItems.length) {
      return detailItems;
    }

    if (Array.isArray(apiResult)) {
      const itemRows = apiResult.filter((item) => this.isOrderItemLikeObject(item));

      if (itemRows.length) {
        return itemRows;
      }
    }

    return listItems;
  }

  private getCustomerName(source: any): string {
    return this.normalizeText(source?.CustomerName ?? source?.customerName ?? source?.GuestName ?? source?.guestName);
  }

  private getContactNumber(source: any): string {
    return this.normalizeText(
      source?.ContactNumber ??
      source?.contactNumber ??
      source?.CustomerPhone ??
      source?.customerPhone ??
      source?.Phone ??
      source?.phone
    );
  }

  private normalizeText(value: unknown): string {
    const normalizedValue = String(value ?? '').trim();
    return normalizedValue.toLowerCase() === 'undefined' || normalizedValue.toLowerCase() === 'null'
      ? ''
      : normalizedValue;
  }

  private findOrderLikeObject(rows: any[]): HeldOrder | null {
    return rows.find((row) => this.isOrderLikeObject(row)) ?? rows[0] ?? null;
  }

  private isOrderLikeObject(value: any): boolean {
    return Boolean(value && typeof value === 'object' && (
      value.Id !== undefined ||
      value.id !== undefined ||
      value.orderId !== undefined ||
      value.OrderId !== undefined ||
      value.Orderid !== undefined ||
      value.orderid !== undefined ||
      value.Ordernumber !== undefined ||
      value.ordernumber !== undefined ||
      value.OrderNo !== undefined ||
      value.orderNo !== undefined
    ));
  }

  private isOrderItemLikeObject(value: any): boolean {
    return Boolean(value && typeof value === 'object' && (
      value.Menuitemid !== undefined ||
      value.menuitemid !== undefined ||
      value.MenuItemId !== undefined ||
      value.Itemname !== undefined ||
      value.itemname !== undefined ||
      value.ItemName !== undefined ||
      value.MenuName !== undefined ||
      value.Quantity !== undefined ||
      value.quantity !== undefined ||
      value.qty !== undefined ||
      value.Unitprice !== undefined ||
      value.unitprice !== undefined ||
      value.UnitPrice !== undefined
    ));
  }

  private getResultArray(response: any): HeldOrder[] {
    const result = response?.result ?? response?.Result ?? response ?? [];
    return Array.isArray(result) ? result : [];
  }

  private getResultObject(response: any): HeldOrder | null {
    const result = response?.result ?? response?.Result ?? response ?? null;

    if (Array.isArray(result)) {
      return result[0] ?? null;
    }

    return result;
  }

  private getUserOrgId(): number {
    return this.toNumber(
      this.userDetails?.OrgId ??
      this.userDetails?.orgId ??
      this.userDetails?.orgid ??
      this.userDetails?.OrganizationId ??
      this.userDetails?.organizationId
    );
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private firstPositiveNumber(...values: unknown[]): number {
    
    for (const value of values) {
      const parsed = this.toNumber(value);

      if (parsed > 0) {
        return parsed;
      }
    }

    return 0;
  }
}



import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
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
  menuitemid?: string;
  Menuitemid?: string;
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
  tableid?: string;
  Tableid?: string;
  ordertype?: string;
  Ordertype?: string;
  orderstatus?: string;
  Orderstatus?: string;
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
  shiftid?: string;
  Shiftid?: string;
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
  { field: 'Table', header: 'Table', sortable: true, width: '8rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '8rem' },
  { field: 'Items', header: 'NOofItems', sortable: true, width: '7rem' },
  { field: 'Subtotal', header: 'Subtotal', sortable: true, width: '10rem' },
  { field: 'Tax', header: 'Tax', sortable: true, width: '9rem' },
  { field: 'Discount', header: 'Discount', sortable: true, width: '10rem' },
  { field: 'Total', header: 'Total', sortable: true, width: '10rem' },
  { field: 'HeldTime', header: 'Held Time', sortable: true, width: '14rem' }
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

  constructor(
    private readonly toast: AppToastService,
    private readonly orderHoldService: OrderHoldService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.orgId = this.getUserOrgId();
    this.loadHeldOrders();
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
        this.isLoading = false;
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
      localStorage.setItem(ACTIVE_HELD_ORDER_STORAGE_KEY, JSON.stringify(orderDetails));
      this.router.navigate(['/pos/order-screen']);
      return;
    }

    this.orderHoldService.getAllHoldorderDetails(orderId).subscribe({
      next: (response: any) => {
        const orderDetails = this.buildOpenOrderDetails(order, response);
        localStorage.setItem(ACTIVE_HELD_ORDER_STORAGE_KEY, JSON.stringify(orderDetails));
        this.router.navigate(['/pos/order-screen']);
      },
      error: () => {
        const orderDetails = this.buildOpenOrderDetails(order, null);
        localStorage.setItem(ACTIVE_HELD_ORDER_STORAGE_KEY, JSON.stringify(orderDetails));
        this.router.navigate(['/pos/order-screen']);
        this.toast.warn('Details Not Loaded', 'Opened the held order from list data. Item details may be incomplete.');
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
      Table: this.getOrderTable(order),
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
      source.orderDetails ??
      source.OrderDetails ??
      source.details ??
      source.Details ??
      [];
    return Array.isArray(items) ? items : [];
  }

  private buildOpenOrderDetails(listOrder: HeldOrder | HeldOrderRow, response: any): HeldOrder {
    const apiResult = response?.result ?? response?.Result ?? response ?? null;
    const apiOrderDetails = (this.extractOrderHeader(apiResult) ?? listOrder) as HeldOrder;
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



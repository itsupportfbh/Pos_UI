import { CommonModule } from '@angular/common';
import {ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { catchError, forkJoin, map, of } from 'rxjs';

import { AppToastService } from '../../../services/app-toast.service';
import { DisplayMenuItemsService } from '../../../services/display-menu-items.service';

type KitchenOrderItem = {
  id: number;
  cartKey: string;
  itemType: string;
  name: string;
  quantity: number;
  price: number;
  lineTotal: number;
  status: string;
  category?: string;
  subCategory?: string;
  comboItems?: any[];
  rawItem?: any;
};

type KitchenOrder = {
  id: number;
  orderNo: string;
  orderType: string;
  table: string;
  customerName: string;
  customerPhone?: string;
  status: string;
  sentAt: string;
  itemCount: number;
  grandTotal: number;
  items: KitchenOrderItem[];
  rawOrder?: any;
};

type KitchenOrderStatus = 'In Process' | 'Ready';

@Component({
  selector: 'app-display-menu-items',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule
  ],
  templateUrl: './display-menu-items.component.html',
  styleUrls: ['./display-menu-items.component.css']
})
export class DisplayMenuItemsComponent implements OnInit, OnDestroy {
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  userDetails: any = {};
  kitchenOrders: KitchenOrder[] = [];
  searchTicketText = '';
  selectedKitchenOrderId: number | null = null;
  totalKitchenOrders = 0;
  totalKitchenItems = 0;
  isLoadingOrders = false;
viewReady = false;
  constructor(
    private readonly toast: AppToastService,
    private readonly displayMenuItemsService: DisplayMenuItemsService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');

    setTimeout(() => {
    this.viewReady = true;
     this.loadKitchenOrders();
    this.cdr.detectChanges();
  });
   
   
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  get filteredKitchenOrders(): KitchenOrder[] {
    const searchText = this.searchTicketText.trim().toLowerCase();

    if (!searchText) {
      return this.kitchenOrders;
    }

    return this.kitchenOrders.filter((order) =>
      String(order.orderNo ?? '').toLowerCase().includes(searchText) ||
      String(order.table ?? '').toLowerCase().includes(searchText) ||
      String(order.orderType ?? '').toLowerCase().includes(searchText) ||
      String(order.customerName ?? '').toLowerCase().includes(searchText)
    );
  }

  get selectedKitchenOrder(): KitchenOrder | null {
    if (!this.selectedKitchenOrderId) {
      return null;
    }

    return this.kitchenOrders.find((order) => order.id === this.selectedKitchenOrderId) ?? null;
  }

  loadKitchenOrders(): void {
    this.isLoadingOrders = true;
    const OrgId = this.getUserOrgId();
    const BranchId = this.getUserBranchId();

    this.displayMenuItemsService.getAll(OrgId, BranchId).subscribe({
      next: (response: any) => {
        const kitchenOrderRows = this.getResponseList(response)
          .filter((order: any) => this.isKitchenOrder(order));

        this.loadKitchenOrderDetails(kitchenOrderRows);
      },
      error: () => {
        this.isLoadingOrders = false;
        this.toast.error('Load Failed', 'Unable to load kitchen orders.');
      },
       complete: () => {
       setTimeout(() => {
          this.isLoadingOrders = false;
          this.cdr.detectChanges();
        });
}
    });
  }

  updateSearchTicket(event: Event): void {
    this.searchTicketText = (event.target as HTMLInputElement).value;
  }

  clearKitchenOrders(): void {
    this.toast.info('API Required', 'Clear kitchen orders from the saved order list.');
  }

  openKitchenOrderDetails(order: KitchenOrder): void {
    this.selectedKitchenOrderId = order.id;
  }

  closeKitchenOrderDetails(): void {
    this.selectedKitchenOrderId = null;
  }

  markKitchenOrderPreparing(order: KitchenOrder): void {
    this.updateKitchenOrderStatus(order, 'In Process');
  }

  markKitchenOrderReady(order: KitchenOrder): void {
    this.updateKitchenOrderStatus(order, 'Ready');
  }

  markKitchenOrderItemPreparing(order: KitchenOrder, item: KitchenOrderItem): void {
    this.updateKitchenOrderItemStatus(order, item, 'In Process');
  }

  markKitchenOrderItemReady(order: KitchenOrder, item: KitchenOrderItem): void {
    this.updateKitchenOrderItemStatus(order, item, 'Ready');
  }

  private updateKitchenOrderStatus(order: KitchenOrder, status: KitchenOrderStatus): void {
    const payload = this.buildKitchenStatusPayload(order, status);

    this.displayMenuItemsService.KitchenStatusChange(payload).subscribe({
      next: () => {
        this.setLocalKitchenOrderStatus(order, status);
        this.toast.success('Updated', `${order.orderNo} marked ${status.toLowerCase()}.`);
      },
      error: (err: any) => {
        const message = err?.error?.message
          || err?.error?.Message
          || err?.message
          || `Unable to mark ${order.orderNo} as ${status.toLowerCase()}.`;

        this.toast.error('Update Failed', message);
      }
    });
  }

  private updateKitchenOrderItemStatus(order: KitchenOrder, item: KitchenOrderItem, status: KitchenOrderStatus): void {
    const payload = this.buildKitchenItemStatusPayload(order, item, status);

    this.displayMenuItemsService.KitchenItemStatusChange(payload).subscribe({
      next: () => {
        this.setLocalKitchenOrderItemStatus(order, item, status);
        this.toast.success('Updated', `${item.name} marked ${status.toLowerCase()}.`);
      },
      error: (err: any) => {
        const message = err?.error?.message
          || err?.error?.Message
          || err?.message
          || `Unable to mark ${item.name} as ${status.toLowerCase()}.`;

        this.toast.error('Update Failed', message);
      }
    });
  }

  private setLocalKitchenOrderStatus(order: KitchenOrder, status: string): void {
    if (this.isReadyStatus(status)) {
      this.kitchenOrders = this.kitchenOrders.filter((item) => item.id !== order.id);
      this.closeKitchenOrderDetails();
    } else {
      this.kitchenOrders = this.kitchenOrders.map((item) =>
        item.id === order.id
          ? { ...item, status, items: item.items.map((orderItem) => ({ ...orderItem, status })) }
          : item
      );
    }

    this.updateKitchenTotals();
  }

  private setLocalKitchenOrderItemStatus(order: KitchenOrder, updatedItem: KitchenOrderItem, status: string): void {
    this.kitchenOrders = this.kitchenOrders
      .map((ticket) => {
        if (ticket.id !== order.id) {
          return ticket;
        }

        const items = ticket.items.map((item) =>
          item.cartKey === updatedItem.cartKey ? { ...item, status } : item
        );

        return {
          ...ticket,
          status: this.getOrderStatusFromItems(items, ticket.status),
          items
        };
      })
      .filter((ticket) => this.hasVisibleKitchenItems(ticket));

    if (!this.selectedKitchenOrder) {
      this.closeKitchenOrderDetails();
    }

    this.updateKitchenTotals();
  }

  getTicketNumber(order: KitchenOrder): string {
    const digits = String(order.orderNo ?? '').match(/\d+/g)?.join('') ?? '';
    return digits ? digits.slice(-3) : String(order.id).slice(-3);
  }

  getTicketTitle(order: KitchenOrder): string {
    if (order.table && order.table !== 'Counter') {
      return `Table No. ${order.table}`;
    }

    return order.orderType?.toLowerCase().includes('take') ? 'Take Out' : order.orderType || 'Take Out';
  }

  isReady(order: KitchenOrder): boolean {
    return this.isReadyStatus(order.status);
  }

  isPreparing(order: KitchenOrder): boolean {
    return this.isInProcessStatus(order.status);
  }

  isItemReady(item: KitchenOrderItem): boolean {
    return this.isReadyStatus(item.status);
  }

  isItemPreparing(item: KitchenOrderItem): boolean {
    return this.isInProcessStatus(item.status);
  }

  getVisibleItemCount(order: KitchenOrder): number {
    return order.items.filter((item) => this.isVisibleKitchenStatus(item.status)).length;
  }

  private mapApiOrderToKitchenOrder(order: any): KitchenOrder {
    const orderStatus = this.getStringValue(order, 'OrderStatus') || 'In Kitchen';
    const items = this.getOrderItems(order).map((item: any, index: number) => this.mapApiOrderItem(item, index, orderStatus));

    return {
      id: this.getNumberValue(order,  'OrderId'),
      orderNo: this.getStringValue(order, 'OrderNumber'),
      orderType: this.getStringValue(order, 'OrderType'),
      table: this.getStringValue(order,  'TableId') || 'Counter',
      customerName: this.getStringValue(order, 'CustomerName') || 'Walk-in Guest',
      customerPhone: this.getStringValue(order, 'ContactNumber'),
      status: this.getOrderStatusFromItems(items, orderStatus),
      sentAt: this.getStringValue(order, 'CreatedDate', 'createdDate', 'UpdatedDate', 'updatedDate') || new Date().toISOString(),
      itemCount: this.getNumberValue(order, 'ItemCount') || items.length,
      grandTotal: this.getNumberValue(order, 'TotalAmount'),
      items,
      rawOrder: order
    };
  }

  private buildKitchenStatusPayload(order: KitchenOrder, status: KitchenOrderStatus): any {
    const rawOrder = order.rawOrder ?? {};
    const userId = this.getNumberValue(this.userDetails, 'UserId', 'userId', 'Id', 'id');
    const now = new Date().toISOString();

    return {
      ...rawOrder,
      orderid: this.getNumberValue(rawOrder, 'orderid', 'Orderid', 'OrderId', 'Id') || order.id,
      orderNumber: this.getStringValue(rawOrder, 'orderNumber', 'OrderNumber') || order.orderNo,
      orderType: this.getStringValue(rawOrder, 'orderType', 'OrderType') || order.orderType,
      orderStatus: status,
      itemCount: this.getNumberValue(rawOrder, 'itemCount', 'ItemCount') || order.itemCount,
      subtotalAmount: this.getNumberValue(rawOrder, 'subtotalAmount', 'SubtotalAmount'),
      taxAmount: this.getNumberValue(rawOrder, 'taxAmount', 'TaxAmount'),
      discountAmount: this.getNumberValue(rawOrder, 'discountAmount', 'DiscountAmount'),
      totalAmount: this.getNumberValue(rawOrder, 'totalAmount', 'TotalAmount') || order.grandTotal,
      customerName: this.getStringValue(rawOrder, 'customerName', 'CustomerName') || order.customerName,
      contactNumber: this.getStringValue(rawOrder, 'contactNumber', 'ContactNumber', 'CustomerPhone') || order.customerPhone,
      tableId: this.getNumberValue(rawOrder, 'tableId', 'TableId') || Number(order.table || 0),
      shiftId: this.getNumberValue(rawOrder, 'shiftId', 'ShiftId', 'Shiftid'),
      orgId: this.getNumberValue(rawOrder, 'orgId', 'OrgId') || this.getUserOrgId(),
      branchId: this.getNumberValue(rawOrder, 'branchId', 'BranchId') || this.getUserBranchId(),
      createdBy: this.getNumberValue(rawOrder, 'createdBy', 'CreatedBy') || userId || 0,
      createdDate: this.getStringValue(rawOrder, 'createdDate', 'CreatedDate') || now,
      updatedBy: userId || this.getNumberValue(rawOrder, 'updatedBy', 'UpdatedBy') || 0,
      updatedDate: now,
      isDeleted: this.getBooleanValue(rawOrder, 'isDeleted', 'IsDeleted') ?? false,
      items: this.getOrderItems(rawOrder).map((item: any) => ({
        ...item,
        itemstatus: status,
        Itemstatus: status,
        updatedBy: userId || this.getNumberValue(item, 'updatedBy', 'UpdatedBy') || 0,
        UpdatedBy: userId || this.getNumberValue(item, 'updatedBy', 'UpdatedBy') || 0,
        updatedDate: now,
        UpdatedDate: now
      }))
    };
  }

  private buildKitchenItemStatusPayload(order: KitchenOrder, item: KitchenOrderItem, status: KitchenOrderStatus): any {
    const rawOrder = order.rawOrder ?? {};
    const rawItem = item.rawItem ?? {};
    const userId = this.getNumberValue(this.userDetails, 'UserId', 'userId', 'Id', 'id');
    const now = new Date().toISOString();
    const orderId = this.getNumberValue(rawOrder, 'orderid', 'Orderid', 'OrderId', 'Id') || order.id;
    const itemId = this.getNumberValue(rawItem, 'itemid', 'Itemid', 'ItemId', 'id', 'Id') || item.id;

    return {
      orderid: orderId,
      orderId,
      itemid: itemId,
      itemId,
      orderStatus: status,
      itemstatus: status,
      Itemstatus: status,
      updatedBy: userId || this.getNumberValue(rawItem, 'updatedBy', 'UpdatedBy') || 0,
      UpdatedBy: userId || this.getNumberValue(rawItem, 'updatedBy', 'UpdatedBy') || 0,
      updatedDate: now,
      UpdatedDate: now
    };
  }

  private mapApiOrderItem(item: any, index: number, orderStatus: string): KitchenOrderItem {
    const menuItemId = this.getNumberValue(item, 'Menuitemid');
    const comboMenuItemId = this.getNumberValue(item, 'ComboMenuItemId');
    const quantity = this.getNumberValue(item, 'Quantity') || 1;
    const price = this.getNumberValue(item, 'Unitprice');
    const itemId = this.getNumberValue(item, 'Itemid') || index + 1;

    return {
      id: itemId,
      cartKey: `${itemId}-${comboMenuItemId ? 'combo' : 'menu'}-${comboMenuItemId || menuItemId || index}`,
      itemType: comboMenuItemId ? 'Combo' : 'Menu',
      name: this.getStringValue(item, 'Itemname') || 'Order item',
      quantity,
      price,
      lineTotal: this.getNumberValue(item, 'Totalprice') || quantity * price,
      status: this.getStringValue(item, 'Itemstatus', 'itemstatus') || orderStatus,
      comboItems: this.parseComboDetails(this.getStringValue(item, 'Modifierdetails', 'modifierdetails')),
      rawItem: item
    };
  }

  private updateKitchenTotals(): void {
    this.totalKitchenOrders = this.kitchenOrders.length;
    this.totalKitchenItems = this.kitchenOrders.reduce((total, order) => total + Number(order.itemCount || 0), 0);
  }

  private loadKitchenOrderDetails(orderRows: any[]): void {
    if (!orderRows.length) {
      this.kitchenOrders = [];
      this.updateKitchenTotals();
      this.isLoadingOrders = false;
      return;
    }

    const requests = orderRows.map((order: any) => {
      if (this.getOrderItems(order).length) {
        return of(order);
      }

      const orderId = this.getNumberValue(order, 'OrderId');

      if (!orderId) {
        return of(order);
      }

      return this.displayMenuItemsService.getById(orderId).pipe(
        map((response: any) => this.mergeOrderWithDetails(order, response)),
        catchError(() => of(order))
      );
    });

    forkJoin(requests).subscribe({
      next: (orders: any[]) => {
        this.kitchenOrders = orders
          .map((order: any) => this.mapApiOrderToKitchenOrder(order))
          .filter((order: KitchenOrder) => this.hasVisibleKitchenItems(order));
        this.updateKitchenTotals();
      },
      error: () => {
        this.toast.error('Load Failed', 'Unable to load kitchen order details.');
      },
      complete: () => {
        this.isLoadingOrders = false;
      }
    });
  }

  private getOrderItems(order: any): any[] {
    const items = order?.Items ??
      order?.items ??
      order?.OrderItems ??
      order?.orderItems ??
      [];
    return Array.isArray(items) ? items : [];
  }

  private mergeOrderWithDetails(listOrder: any, response: any): any {
    const result = response?.result ?? response?.Result ?? response ?? null;
    const detailHeader = this.extractOrderHeader(result) ?? {};
    const detailItems = this.extractOrderItems(result, detailHeader);

    return {
      ...listOrder,
      ...detailHeader,
      Items: detailItems.length ? detailItems : this.getOrderItems(listOrder)
      
    };
  }

  private extractOrderHeader(result: any): any {
    if (!result) {
      return null;
    }

    if (Array.isArray(result)) {
      return result.find((item: any) => this.isOrderHeaderLike(item)) ?? result[0] ?? null;
    }

    const nestedHeader = result.Order ??
      result.order ??
      result.OrderHeader ??
      result.orderHeader ??
      result.Header ??
      result.header ??
      result.Master ??
      result.master;

    if (Array.isArray(nestedHeader)) {
      return nestedHeader.find((item: any) => this.isOrderHeaderLike(item)) ?? nestedHeader[0] ?? null;
    }

    return nestedHeader && typeof nestedHeader === 'object' ? nestedHeader : result;
  }

  private extractOrderItems(result: any, header: any): any[] {
    const resultItems = this.getOrderItems(result);
    const headerItems = this.getOrderItems(header);

    if (resultItems.length) {
      return resultItems;
    }

    if (headerItems.length) {
      return headerItems;
    }

    if (Array.isArray(result)) {
      return result.filter((item: any) => this.isOrderItemLike(item));
    }

    return [];
  }

  private isKitchenOrder(order: any): boolean {
    const items = this.getOrderItems(order);

    if (items.length) {
      return items.some((item: any) => this.isVisibleKitchenStatus(
        this.getStringValue(item, 'Itemstatus', 'itemstatus') ||
        this.getStringValue(order, 'OrderStatus', 'orderStatus', 'Orderstatus', 'orderstatus')
      ));
    }

    return this.isVisibleKitchenStatus(this.getStringValue(order, 'OrderStatus', 'orderStatus', 'Orderstatus', 'orderstatus'));
  }

  private isVisibleKitchenStatus(status: string): boolean {
    const normalizedStatus = String(status || '').trim().toLowerCase();
    return normalizedStatus === 'in kitchen' || this.isInProcessStatus(status);
  }

  private isInProcessStatus(status: string): boolean {
    const normalizedStatus = String(status || '').trim().toLowerCase();
    return normalizedStatus === 'in process' || normalizedStatus === 'preparing';
  }

  private isReadyStatus(status: string): boolean {
    const normalizedStatus = String(status || '').trim().toLowerCase();
    return normalizedStatus === 'ready' || normalizedStatus === 'ready to serve';
  }

  private hasVisibleKitchenItems(order: KitchenOrder): boolean {
    return order.items.some((item) => this.isVisibleKitchenStatus(item.status));
  }

  private getOrderStatusFromItems(items: KitchenOrderItem[], fallbackStatus: string): string {
    if (!items.length) {
      return fallbackStatus;
    }

    if (items.every((item) => this.isReadyStatus(item.status))) {
      return 'Ready';
    }

    if (items.some((item) => this.isInProcessStatus(item.status))) {
      return 'In Process';
    }

    return 'In Kitchen';
  }

  private isOrderHeaderLike(value: any): boolean {
    return Boolean(value && typeof value === 'object' && (
      value.OrderId !== undefined 
      
    ));
  }

  private isOrderItemLike(value: any): boolean {
    return Boolean(value && typeof value === 'object' && (
      value.Menuitemid !== undefined ||
      value.ComboMenuItemId !== undefined ||
      value.Itemname !== undefined ||
      value.Quantity !== undefined 
      
    ));
  }

  private getResponseList(response: any): any[] {
    const result = response?.result ?? response?.Result ?? response;
    return Array.isArray(result) ? result : [];
  }

  private parseComboDetails(value: string): any[] {
    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private getStringValue(source: any, ...keys: string[]): string {
    const value = keys.map((key) => source?.[key]).find((item) => item !== undefined && item !== null);
    return value?.toString() ?? '';
  }

  private getNumberValue(source: any, ...keys: string[]): number {
    const value = keys.map((key) => source?.[key]).find((item) => item !== undefined && item !== null);
    return Number(value ?? 0);
  }

  private getBooleanValue(source: any, ...keys: string[]): boolean | null {
    const value = keys.map((key) => source?.[key]).find((item) => item !== undefined && item !== null);

    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    const normalizedValue = String(value).trim().toLowerCase();

    if (normalizedValue === 'true' || normalizedValue === '1') {
      return true;
    }

    if (normalizedValue === 'false' || normalizedValue === '0') {
      return false;
    }

    return null;
  }

  private getUserOrgId(): number {
    return Number(this.userDetails.RoleId || 0) === 1
      ? 0
      : this.getNumberValue(this.userDetails, 'OrgId', 'orgId', 'orgid', 'OrganizationId', 'organizationId');
  }

  private getUserBranchId(): number {
    return Number(this.userDetails.IsAdmin || 0) === 1 || Number(this.userDetails.RoleId || 0) === 1
      ? 0
      : this.getNumberValue(this.userDetails, 'BranchId', 'branchId', 'branchid');
  }

}

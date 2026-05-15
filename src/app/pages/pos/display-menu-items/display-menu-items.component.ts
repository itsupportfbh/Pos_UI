import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
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
  category?: string;
  subCategory?: string;
  comboItems?: any[];
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
};

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
  totalKitchenOrders = 0;
  totalKitchenItems = 0;
  isLoadingOrders = false;

  constructor(
    private readonly toast: AppToastService,
    private readonly displayMenuItemsService: DisplayMenuItemsService
  ) {}

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.loadKitchenOrders();
   // this.refreshTimer = setInterval(() => this.loadKitchenOrders(), 5000);
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
      }
    });
  }

  updateSearchTicket(event: Event): void {
    this.searchTicketText = (event.target as HTMLInputElement).value;
  }

  clearKitchenOrders(): void {
    this.toast.info('API Required', 'Clear kitchen orders from the saved order list.');
  }

  markKitchenOrderReady(order: KitchenOrder): void {
    this.kitchenOrders = this.kitchenOrders.map((item) =>
      item.id === order.id ? { ...item, status: 'Ready' } : item
    );
    this.updateKitchenTotals();
    this.toast.success('Ready', `${order.orderNo} marked ready.`);
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
    return String(order.status ?? '').trim().toLowerCase() === 'ready';
  }

  private mapApiOrderToKitchenOrder(order: any): KitchenOrder {
    const items = this.getOrderItems(order).map((item: any, index: number) => this.mapApiOrderItem(item, index));

    return {
      id: this.getNumberValue(order, 'Orderid', 'orderid', 'OrderId', 'orderId', 'Id', 'id'),
      orderNo: this.getStringValue(order, 'OrderNumber', 'orderNumber', 'Ordernumber', 'ordernumber'),
      orderType: this.getStringValue(order, 'OrderType', 'orderType', 'Ordertype', 'ordertype'),
      table: this.getStringValue(order, 'TableName', 'tableName', 'TableCode', 'tableCode', 'TableId', 'tableId') || 'Counter',
      customerName: this.getStringValue(order, 'CustomerName', 'customerName') || 'Walk-in Guest',
      customerPhone: this.getStringValue(order, 'CustomerPhone', 'customerPhone'),
      status: this.getStringValue(order, 'OrderStatus', 'orderStatus', 'Orderstatus', 'orderstatus') || 'In Kitchen',
      sentAt: this.getStringValue(order, 'CreatedDate', 'createdDate', 'UpdatedDate', 'updatedDate') || new Date().toISOString(),
      itemCount: this.getNumberValue(order, 'ItemCount', 'itemCount') || items.length,
      grandTotal: this.getNumberValue(order, 'TotalAmount', 'totalAmount', 'GrandTotal', 'grandTotal'),
      items
    };
  }

  private mapApiOrderItem(item: any, index: number): KitchenOrderItem {
    const menuItemId = this.getNumberValue(item, 'Menuitemid', 'menuitemid', 'MenuItemId', 'menuItemId');
    const comboMenuItemId = this.getNumberValue(item, 'ComboMenuItemId', 'comboMenuItemId');
    const quantity = this.getNumberValue(item, 'Quantity', 'quantity') || 1;
    const price = this.getNumberValue(item, 'Unitprice', 'unitprice', 'UnitPrice', 'unitPrice');

    return {
      id: this.getNumberValue(item, 'Itemid', 'itemid', 'Id', 'id') || index + 1,
      cartKey: `${comboMenuItemId ? 'combo' : 'menu'}-${comboMenuItemId || menuItemId || index}`,
      itemType: comboMenuItemId ? 'Combo' : 'Menu',
      name: this.getStringValue(item, 'Itemname', 'itemname', 'ItemName', 'itemName') || 'Order item',
      quantity,
      price,
      lineTotal: this.getNumberValue(item, 'Totalprice', 'totalprice', 'TotalPrice', 'totalPrice') || quantity * price,
      comboItems: this.parseComboDetails(this.getStringValue(item, 'Modifierdetails', 'modifierdetails'))
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

      const orderId = this.getNumberValue(order, 'Orderid', 'orderid', 'OrderId', 'orderId', 'Id', 'id');

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
          .filter((order: KitchenOrder) => this.isVisibleKitchenStatus(order.status));
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
      order?.Orderitems ??
      order?.orderitems ??
      order?.OrderItems ??
      order?.orderItems ??
      order?.OrderDetails ??
      order?.orderDetails ??
      order?.Details ??
      order?.details ??
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
      Items: detailItems.length ? detailItems : this.getOrderItems(listOrder),
      items: detailItems.length ? detailItems : this.getOrderItems(listOrder)
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
    return this.isVisibleKitchenStatus(this.getStringValue(order, 'OrderStatus', 'orderStatus', 'Orderstatus', 'orderstatus'));
  }

  private isVisibleKitchenStatus(status: string): boolean {
    const normalizedStatus = String(status || '').trim().toLowerCase();
    return normalizedStatus === 'in kitchen' || normalizedStatus === 'ready';
  }

  private isOrderHeaderLike(value: any): boolean {
    return Boolean(value && typeof value === 'object' && (
      value.Orderid !== undefined ||
      value.orderid !== undefined ||
      value.OrderId !== undefined ||
      value.orderId !== undefined ||
      value.OrderNumber !== undefined ||
      value.orderNumber !== undefined ||
      value.Ordernumber !== undefined ||
      value.ordernumber !== undefined
    ));
  }

  private isOrderItemLike(value: any): boolean {
    return Boolean(value && typeof value === 'object' && (
      value.Menuitemid !== undefined ||
      value.menuitemid !== undefined ||
      value.ComboMenuItemId !== undefined ||
      value.comboMenuItemId !== undefined ||
      value.Itemname !== undefined ||
      value.itemname !== undefined ||
      value.Quantity !== undefined ||
      value.quantity !== undefined
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

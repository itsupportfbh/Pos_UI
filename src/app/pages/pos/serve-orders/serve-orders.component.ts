import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { catchError, forkJoin, map, of } from 'rxjs';

import { AppToastService } from '../../../services/app-toast.service';
import { DisplayMenuItemsService } from '../../../services/display-menu-items.service';

type ServeOrder = {
  id: number;
  orderNo: string;
  orderType: string;
  servingType: string;
  tableName: string;
  customerName: string;
  contactNumber: string;
  notes: string;
  sentAt: string;
  itemCount: number;
  totalAmount: number;
  rawOrder: any;
};

const ORDER_STATUS = {
  InKitchen: 1,
  Preparing: 2,
  Ready: 3,
  Served: 4
} as const;

@Component({
  selector: 'app-serve-orders',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, ProgressSpinnerModule],
  templateUrl: './serve-orders.component.html',
  styleUrl: './serve-orders.component.css'
})
export class ServeOrdersComponent implements OnInit {
  userDetails: any = {};
  readyOrders: ServeOrder[] = [];
  isLoading = false;
  pageLoading = false;
  servingOrderId: number | null = null;
   OrgId=0;
   BranchId=0;
  readonly pageLoadingTitle = 'Unity work POS';
  readonly pageLoadingSubtitle = 'Loading serve orders workspace.';

  constructor(
    private readonly toast: AppToastService,
    private readonly displayMenuItemsService: DisplayMenuItemsService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.pageLoading = true;
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.OrgId = this.getNumberValue(this.userDetails, 'OrgId'    );
    this.BranchId = this.getNumberValue(this.userDetails, 'BranchId', 'branchId', 'branchid');
    this.loadReadyOrders();
    this.cdr.detectChanges();
  }

  get selfServiceOrders(): ServeOrder[] {
    return this.readyOrders.filter((order) => this.isSelfService(order));
  }

  get serverDeliveryOrders(): ServeOrder[] {
    return this.readyOrders.filter((order) => !this.isSelfService(order));
  }

  loadReadyOrders(): void {
    this.isLoading = true;

    this.displayMenuItemsService.getAll(this.OrgId, this.BranchId).subscribe({
      next: (response: any) => {
        const orderRows = this.getResponseList(response)
          .filter((order: any) => this.isReadyOrderHeader(order));

        this.loadReadyOrderDetails(orderRows);
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.pageLoading = false;
        this.readyOrders = [];
        this.toast.error('Load Failed', 'Unable to load ready orders.');
      }
    });
  }

  private loadReadyOrderDetails(orderRows: any[]): void {
    if (!orderRows.length) {
      this.readyOrders = [];
      this.isLoading = false;
      this.pageLoading = false;
      return;
    }

    const requests = orderRows.map((order: any) => {
      if (this.getOrderItems(order).length) {
        return of(order);
      }

      const orderId = this.getOrderId(order);

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
        this.readyOrders = orders
          .filter((order: any) => this.isReadyOrder(order))
          .map((order: any) => this.mapApiOrder(order));
      },
      error: () => {
        this.readyOrders = [];
        this.toast.error('Load Failed', 'Unable to load ready order details.');
      },
      complete: () => {
        this.isLoading = false;
        this.pageLoading = false;
      }
    });
  }

  markServed(order: ServeOrder): void {
    if (this.servingOrderId) {
      return;
    }

    this.servingOrderId = order.id;
    const payload = this.buildServedPayload(order);

    this.displayMenuItemsService.KitchenStatusChange(payload).subscribe({
      next: () => {
        this.readyOrders = this.readyOrders.filter((item) => item.id !== order.id);
        this.toast.success('Served', `${order.orderNo} marked as served.`);
      },
      error: (err: any) => {
        const message = err?.error?.message
          || err?.error?.Message
          || err?.message
          || `Unable to mark ${order.orderNo} as served.`;

        this.toast.error('Update Failed', message);
      },
      complete: () => {
        this.servingOrderId = null;
      }
    });
  }

  isSelfService(order: ServeOrder): boolean {
    const servingType = String(order.servingType || '').replace(/[\s_-]+/g, '').toLowerCase();
    const orderType = String(order.orderType || '').replace(/[\s_-]+/g, '').toLowerCase();

    if (servingType) {
      return servingType.includes('self') || servingType.includes('counter');
    }

    return orderType.includes('takeaway');
  }

  getHandoffLabel(order: ServeOrder): string {
    return this.isSelfService(order) ? 'Counter pickup' : 'Server delivery';
  }

  getServeButtonLabel(order: ServeOrder): string {
    return `${order.orderNo} - ${order.customerName}`;
  }

  private mapApiOrder(order: any): ServeOrder {
    const id = this.getOrderId(order);
    const tableName = this.getStringValue(order, 'TableName', 'tableName', 'TableCode', 'tableCode', 'TableNo', 'tableNo');

    return {
      id,
      orderNo: this.getStringValue(order, 'OrderNumber', 'orderNumber', 'Ordernumber', 'ordernumber', 'OrderNo', 'orderNo') || String(id),
      orderType: this.getStringValue(order, 'OrderType', 'orderType', 'Ordertype', 'ordertype') || 'Order',
      servingType: this.getStringValue(order, 'ServingType', 'servingType', 'ServiceType', 'serviceType'),
      tableName: tableName || this.getTableFallback(order),
      customerName: this.getStringValue(order, 'CustomerName', 'customerName', 'GuestName', 'guestName') || 'Walk-in Guest',
      contactNumber: this.getStringValue(order, 'ContactNumber', 'contactNumber'),
      notes: this.getStringValue(order, 'Notes', 'notes', 'Remarks', 'remarks'),
      sentAt: this.getStringValue(order, 'UpdatedDate', 'updatedDate', 'CreatedDate', 'createdDate'),
      itemCount: this.getNumberValue(order, 'ItemCount', 'itemCount', 'Itemcount') || this.getOrderItems(order).length,
      totalAmount: this.getNumberValue(order, 'TotalAmount', 'totalAmount'),
      rawOrder: order
    };
  }

  private buildServedPayload(order: ServeOrder): any {
    const rawOrder = order.rawOrder ?? {};
    const userId = this.getNumberValue(this.userDetails, 'UserId', 'userId', 'Id', 'id');
    const now = new Date().toISOString();

    return {
      ...rawOrder,
      orderid: this.getNumberValue(rawOrder, 'Orderid', 'OrderId') || order.id,
      OrderId: this.getNumberValue(rawOrder, 'OrderId', 'Orderid') || order.id,
      OrderStatus: ORDER_STATUS.Served,
      Orderstatus: ORDER_STATUS.Served,
      orderStatus: ORDER_STATUS.Served,
      orderstatus: ORDER_STATUS.Served,
      ServingType: order.servingType,
      servingType: order.servingType,
      ServiceType: order.servingType,
      serviceType: order.servingType,
      updatedBy: userId || this.getNumberValue(rawOrder, 'UpdatedBy') || 0,
      UpdatedBy: userId || this.getNumberValue(rawOrder, 'UpdatedBy') || 0,
      updatedDate: now,
      UpdatedDate: now,
      items: this.getOrderItems(rawOrder).map((item: any) => ({
        ...item,
        Itemstatus: ORDER_STATUS.Served,
        itemstatus: ORDER_STATUS.Served,
        UpdatedBy: userId || this.getNumberValue(item, 'UpdatedBy') || 0,
        updatedDate: now,
        UpdatedDate: now
      }))
    };
  }

  private isReadyOrder(order: any): boolean {
    const orderStatus = this.getRawValue(order, 'OrderStatus', 'Orderstatus', 'orderStatus', 'orderstatus', 'Status', 'status');
    const items = this.getOrderItems(order);

    if (this.isReadyStatus(orderStatus)) {
      return true;
    }

    if (items.length) {
      return items.every((item: any) => this.isReadyStatus(this.getRawValue(item, 'Itemstatus', 'itemstatus', 'ItemStatus', 'itemStatus') ?? orderStatus));
    }

    return this.isReadyStatus(orderStatus);
  }

  private isReadyOrderHeader(order: any): boolean {
    const orderNo = this.getStringValue(order, 'OrderNumber', 'orderNumber', 'Ordernumber', 'ordernumber', 'OrderNo', 'orderNo');
    const isDeleted = this.getBooleanValue(order, 'IsDeleted', 'isDeleted');
    const isActive = this.getBooleanValue(order, 'IsActive', 'isActive');
    const orderStatus = this.getRawValue(order, 'OrderStatus', 'Orderstatus', 'orderStatus', 'orderstatus', 'Status', 'status');

    return Boolean(orderNo)
      && !isDeleted
      && isActive !== false
      && this.isReadyStatus(orderStatus);
  }

  private mergeOrderWithDetails(listOrder: any, response: any): any {
    const result = response?.result ?? response?.Result ?? response ?? null;
    const detailHeader = this.extractOrderHeader(result) ?? {};
    const detailItems = this.extractOrderItems(result, detailHeader, listOrder);

    return {
      ...listOrder,
      ...detailHeader,
      Items: detailItems,
      items: detailItems
    };
  }

  private extractOrderHeader(result: any): any | null {
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

  private extractOrderItems(result: any, header: any, listOrder: any): any[] {
    const resultItems = this.getOrderItems(result);
    const headerItems = this.getOrderItems(header);
    const listItems = this.getOrderItems(listOrder);

    if (resultItems.length) {
      return resultItems;
    }

    if (headerItems.length) {
      return headerItems;
    }

    if (Array.isArray(result)) {
      const itemRows = result.filter((item: any) => this.isOrderItemLike(item));

      if (itemRows.length) {
        return itemRows;
      }
    }

    return listItems;
  }

  private isOrderHeaderLike(value: any): boolean {
    return Boolean(value && typeof value === 'object' && (
      value.OrderId !== undefined ||
      value.Orderid !== undefined ||
      value.orderId !== undefined ||
      value.orderid !== undefined ||
      value.OrderNumber !== undefined ||
      value.orderNumber !== undefined
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

  private isReadyStatus(status: unknown): boolean {
    return this.getStatusCode(status) === ORDER_STATUS.Ready;
  }

  private getStatusCode(status: unknown): number {
    if (typeof status === 'number' && Number.isFinite(status)) {
      return status;
    }

    const normalizedStatus = String(status ?? '').trim().toLowerCase().replace(/\s+/g, '');

    switch (normalizedStatus) {
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
      default:
        return ORDER_STATUS.InKitchen;
    }
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

  private getOrderItems(order: any): any[] {
    const items = order?.Items ?? order?.items ?? order?.OrderItems ?? order?.orderItems ?? [];
    return Array.isArray(items) ? items : [];
  }

  private getOrderId(order: any): number {
    return this.getNumberValue(order, 'OrderId', 'Orderid', 'orderId', 'orderid', 'Id', 'id');
  }

  private getTableFallback(order: any): string {
    const tableId = this.getNumberValue(order, 'TableId');
    return tableId > 0 ? `Table ${tableId}` : 'Counter';
  }

  private getStringValue(source: any, ...keys: string[]): string {
    const value = keys.map((key) => source?.[key]).find((item) => item !== undefined && item !== null);
    return value?.toString() ?? '';
  }

  private getRawValue(source: any, ...keys: string[]): unknown {
    return keys.map((key) => source?.[key]).find((item) => item !== undefined && item !== null);
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

 
}

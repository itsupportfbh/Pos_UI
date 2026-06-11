import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { catchError, firstValueFrom, forkJoin, map, of } from 'rxjs';

import { AppToastService } from '../../../services/app-toast.service';
import { AppShellService } from '../../../services/app-shell.service';
import { DiningTableService } from '../../../services/diningtable.service';
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
  tableId: number;
  TableName: string;
  customerName: string;
  customerPhone?: string;
  status: string;
  notes: string;
  sentAt: string;
  itemCount: number;
  grandTotal: number;
  items: KitchenOrderItem[];
  rawOrder?: any;
};

const ORDER_STATUS = {
  Hold: 0,
  InKitchen: 1,
  Preparing: 2,
  Ready: 3,
  Served: 4,
  Cancelled: 5
} as const;

type KitchenOrderStatus = 'Preparing' | 'Ready';

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
  private readonly handleFullscreenChange = () => {
    if (!document.fullscreenElement && this.isTvMode) {
      this.isTvMode = false;
      this.appShellService.setChromeHidden(false);
      this.cdr.detectChanges();
    }
  };

  userDetails: any = {};
  kitchenOrders: KitchenOrder[] = [];
  searchTicketText = '';
  selectedKitchenOrderId: number | null = null;
  totalKitchenOrders = 0;
  totalKitchenItems = 0;
  isLoadingOrders = false;
  private tableNameById: Record<number, string> = {};
  viewReady = false;
  isTvMode = false;
  currentTime = new Date();
  counterName = '';
  constructor(
    private readonly route: ActivatedRoute,
    private readonly toast: AppToastService,
    private readonly appShellService: AppShellService,
    private readonly displayMenuItemsService: DisplayMenuItemsService,
    private readonly diningTableService: DiningTableService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.appShellService.setChromeHidden(false);
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    const autoLaunchTvMode = this.shouldLaunchTvModeFromRoute();

    if (autoLaunchTvMode) {
      this.isTvMode = true;
      this.appShellService.setChromeHidden(true);
    }

    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    this.refreshTimer = setInterval(() => {
      this.currentTime = new Date();
      this.cdr.detectChanges();
    }, 1000);

    setTimeout(async () => {
      this.viewReady = true;
      this.counterName = this.getRuntimeCounterName();
      await this.loadDiningTableNames();
      this.loadKitchenOrders();
      if (autoLaunchTvMode) {
        void this.enterFullscreen();
      }
      this.cdr.detectChanges();
    });
   
   
  }

  ngOnDestroy(): void {
    this.appShellService.setChromeHidden(false);
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
  }

  get filteredKitchenOrders(): KitchenOrder[] {
    const searchText = this.searchTicketText.trim().toLowerCase();

    if (!searchText) {
      return this.kitchenOrders;
    }

    return this.kitchenOrders.filter((order) =>
      String(order.orderNo ?? '').toLowerCase().includes(searchText) ||
      String(order.TableName ?? '').toLowerCase().includes(searchText) ||
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

  get preparingOrders(): KitchenOrder[] {
    return this.filteredKitchenOrders.filter((order) => !this.isReady(order));
  }

  get readyOrders(): KitchenOrder[] {
    return this.filteredKitchenOrders.filter((order) => this.isReady(order));
  }

  get kitchenDisplayName(): string {
    return String(this.route.snapshot.queryParamMap.get('branchName') || this.userDetails?.BranchName || this.userDetails?.OrgName || 'Kitchen Display').trim() || 'Kitchen Display';
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

  private async loadDiningTableNames(): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.diningTableService.getAll(this.getUserOrgId(), this.getUserBranchId()));
      const tables = this.getResponseList(response);

      this.tableNameById = tables.reduce((lookup: Record<number, string>, table: any) => {
        const tableId = this.getNumberValue(table, 'Id', 'id', 'TableId', 'tableId');
        const tableName = this.getStringValue(table, 'Name', 'name', 'Code', 'code', 'TableName', 'tableName');

        if (tableId > 0 && tableName) {
          lookup[tableId] = tableName;
        }

        return lookup;
      }, {});
    } catch {
      this.tableNameById = {};
    }
  }

  updateSearchTicket(event: Event): void {
    this.searchTicketText = (event.target as HTMLInputElement).value;
  }

  clearKitchenOrders(): void {
    this.toast.info('API Required', 'Clear kitchen orders from the saved order list.');
  }

  openTvMode(): void {
    this.selectedKitchenOrderId = null;
    this.isTvMode = true;
    this.appShellService.setChromeHidden(true);
    void this.enterFullscreen();
    this.cdr.detectChanges();
  }

  closeTvMode(): void {
    this.isTvMode = false;
    this.appShellService.setChromeHidden(false);
    void this.exitFullscreen();
    this.cdr.detectChanges();
  }

  openKitchenOrderDetails(order: KitchenOrder): void {
    this.selectedKitchenOrderId = order.id;
  }

  closeKitchenOrderDetails(): void {
    this.selectedKitchenOrderId = null;
  }

  markKitchenOrderPreparing(order: KitchenOrder): void {
    this.updateKitchenOrderStatus(order, 'Preparing');
  }

  markKitchenOrderReady(order: KitchenOrder): void {
    this.updateKitchenOrderStatus(order, 'Ready');
  }

  markKitchenOrderItemPreparing(order: KitchenOrder, item: KitchenOrderItem): void {
    if (this.isItemLocked(item)) {
      return;
    }

    this.updateKitchenOrderItemStatus(order, item, 'Preparing');
  }

  markKitchenOrderItemReady(order: KitchenOrder, item: KitchenOrderItem): void {
    if (this.isItemLocked(item)) {
      return;
    }

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
          ? {
              ...item,
              status,
              items: item.items.map((orderItem) => this.isItemLocked(orderItem) ? orderItem : { ...orderItem, status })
            }
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
    if (order.TableName && order.TableName !== 'Counter') {
      return order.TableName;
    }

    return order.orderType?.toLowerCase().includes('take') ? 'Take Out' : order.orderType || 'Take Out';
  }

  getDisplayCustomerName(order: KitchenOrder): string {
    return String(order.customerName || '').trim() || 'Walk-in Guest';
  }

  getOrderTypeToneClass(order: KitchenOrder): string {
    const orderType = String(order.orderType || '').replace(/[\s_-]+/g, '').toLowerCase();

    if (orderType.includes('dinein') || orderType.includes('dinin') || orderType.includes('table')) {
      return 'tv-type-dinein';
    }

    if (orderType.includes('take')) {
      return 'tv-type-takeaway';
    }

    if (orderType.includes('delivery')) {
      return 'tv-type-delivery';
    }

    return 'tv-type-default';
  }

  getOrderStatusToneClass(order: KitchenOrder): string {
    if (this.isReady(order)) {
      return 'tv-status-ready';
    }

    if (this.isPreparing(order)) {
      return 'tv-status-preparing';
    }

    return 'tv-status-kitchen';
  }

  getVisibleTicketItems(order: KitchenOrder): KitchenOrderItem[] {
    return order.items.filter((item) => this.isVisibleKitchenStatus(item.status));
  }

  getVisiblePreviewItems(order: KitchenOrder): KitchenOrderItem[] {
    return this.getVisibleTicketItems(order).slice(0, 4);
  }

  getRemainingPreviewItemCount(order: KitchenOrder): number {
    return Math.max(this.getVisibleTicketItems(order).length - 4, 0);
  }

  getElapsedMinutes(order: KitchenOrder): string {
    if (!order.sentAt) {
      return 'Now';
    }

    const sentAt = new Date(order.sentAt).getTime();

    if (Number.isNaN(sentAt)) {
      return 'Now';
    }

    const elapsed = Math.max(Math.floor((this.currentTime.getTime() - sentAt) / 60000), 0);
    return `${elapsed} min`;
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

  isItemLocked(item: KitchenOrderItem): boolean {
    return this.isLockedKitchenStatus(item.status);
  }

  getVisibleItemCount(order: KitchenOrder): number {
    return order.items.filter((item) => this.isVisibleKitchenStatus(item.status)).length;
  }

  getComboItemTrackKey(comboItem: any, index: number): string {
    return `${this.getNumberValue(comboItem,  'MenuItemId') || index}-${this.getComboItemName(comboItem)}`;
  }

  getComboItemName(comboItem: any): string {
    return this.getStringValue(comboItem, 'Name', 'name',  'Itemname', 'itemname', 'ItemName', 'itemName') || 'Combo item';
  }

  getComboItemQuantity(comboItem: any): number {
    return this.getNumberValue(comboItem, 'Quantity') || 1;
  }

  private getTableName(order: any, tableId: number): string {
    const tableName = this.getStringValue(order, 'TableName', 'tableName', 'TableCode', 'tableCode', 'TableNo', 'tableNo');

    if (tableName && tableName !== '0') {
      return tableName;
    }

    if (tableId > 0 && this.tableNameById[tableId]) {
      return this.tableNameById[tableId];
    }

    return tableId > 0 ? `Table ${tableId}` : 'Counter';
  }

  private mapApiOrderToKitchenOrder(order: any): KitchenOrder {
    const orderStatus = this.getRawValue(order, 'OrderStatus', 'Orderstatus', 'orderStatus', 'orderstatus') ?? ORDER_STATUS.InKitchen;
    const items = this.getOrderItems(order).map((item: any, index: number) => this.mapApiOrderItem(item, index, orderStatus));
    const tableId = this.getNumberValue(order, 'TableId', 'tableId', 'Tableid', 'tableid');

    return {
      id: this.getNumberValue(order,  'OrderId'),
      orderNo: this.getStringValue(order, 'OrderNumber'),
      orderType: this.getStringValue(order, 'OrderType'),
      tableId,
      TableName: this.getTableName(order, tableId),
      customerName: this.getStringValue(order, 'CustomerName') || 'Walk-in Guest',
      customerPhone: this.getStringValue(order, 'ContactNumber'),
      status: this.getOrderStatusFromItems(items, this.getStatusLabel(orderStatus)),
      notes: this.getStringValue(order, 'Notes'),
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
    const statusCode = this.getStatusCode(status);

    return {
      ...rawOrder,
      orderid: this.getNumberValue(rawOrder,  'Orderid', 'OrderId') || order.id,
      orderNumber: this.getStringValue(rawOrder,  'OrderNumber') || order.orderNo,
      orderType: this.getStringValue(rawOrder,  'OrderType') || order.orderType,
      OrderStatus: statusCode,
      Orderstatus: statusCode,
      
      itemCount: this.getNumberValue(rawOrder, 'itemCount', 'ItemCount') || order.itemCount,
      subtotalAmount: this.getNumberValue(rawOrder,  'SubtotalAmount'),
      taxAmount: this.getNumberValue(rawOrder,  'TaxAmount'),
      discountAmount: this.getNumberValue(rawOrder,  'DiscountAmount'),
      totalAmount: this.getNumberValue(rawOrder,  'TotalAmount') || order.grandTotal,
      customerName: this.getStringValue(rawOrder,  'CustomerName') || order.customerName,
      contactNumber: this.getStringValue(rawOrder, 'ContactNumber'),
      tableId: this.getNumberValue(rawOrder, 'TableId') || order.tableId,
      shiftId: this.getNumberValue(rawOrder,  'ShiftId', 'Shiftid'),
      orgId: this.getNumberValue(rawOrder, 'orgId', 'OrgId') || this.getUserOrgId(),
      branchId: this.getNumberValue(rawOrder, 'BranchId') || this.getUserBranchId(),
      createdBy: this.getNumberValue(rawOrder,  'CreatedBy') || userId || 0,
      createdDate: this.getStringValue(rawOrder,  'CreatedDate') || now,
      updatedBy: userId || this.getNumberValue(rawOrder,  'UpdatedBy') || 0,
      updatedDate: now,
      isDeleted: this.getBooleanValue(rawOrder, 'isDeleted', 'IsDeleted') ?? false,
      items: this.getOrderItems(rawOrder).map((item: any) => ({
        ...item,
       
        Itemstatus: this.isLockedKitchenStatus(this.getRawValue(item, 'Itemstatus'))
          ? this.getStatusCode(this.getRawValue(item, 'Itemstatus', ))
          : statusCode,
        
        UpdatedBy: userId || this.getNumberValue(item,  'UpdatedBy') || 0,
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
    const orderId = this.getNumberValue(rawOrder,  'Orderid', 'OrderId') || order.id;
    const itemId = this.getNumberValue(rawItem, 'Itemid') || item.id;
    const statusCode = this.getStatusCode(status);

    return {
     
            OrderId: orderId,
            Itemid: itemId,
            Orderstatus: statusCode,
            Itemstatus: statusCode,
            UpdatedBy: userId || this.getNumberValue(rawItem, 'UpdatedBy') || 0,
            UpdatedDate: now
    };
  }

  private mapApiOrderItem(item: any, index: number, orderStatus: unknown): KitchenOrderItem {
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
      status: this.getStatusLabel(this.getRawValue(item, 'Itemstatus') ?? orderStatus),
      comboItems: this.parseComboDetails(this.getStringValue(item, 'Modifierdetails')),
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
        this.getRawValue(item, 'Itemstatus', 'itemstatus') ??
        this.getRawValue(order, 'OrderStatus', 'Orderstatus', 'orderStatus', 'orderstatus')
      ));
    }

    return this.isVisibleKitchenStatus(this.getRawValue(order, 'OrderStatus', 'Orderstatus', 'orderStatus', 'orderstatus'));
  }

  private isVisibleKitchenStatus(status: unknown): boolean {
    const normalizedStatus = String(status || '').trim().toLowerCase();
    return normalizedStatus === '1' || normalizedStatus === 'in kitchen' || this.isInProcessStatus(status);
  }

  private isInProcessStatus(status: unknown): boolean {
    const normalizedStatus = String(status || '').trim().toLowerCase();
    return normalizedStatus === '2' || normalizedStatus === 'in process' || normalizedStatus === 'preparing';
  }

  private isReadyStatus(status: unknown): boolean {
    const normalizedStatus = String(status || '').trim().toLowerCase();
    return normalizedStatus === '3' || normalizedStatus === 'ready' || normalizedStatus === 'ready to serve';
  }

  private isServedStatus(status: unknown): boolean {
    const normalizedStatus = String(status || '').trim().toLowerCase();
    return normalizedStatus === '4' || normalizedStatus === 'served';
  }

  private isCancelledStatus(status: unknown): boolean {
    const normalizedStatus = String(status || '').trim().toLowerCase();
    return normalizedStatus === '5' || normalizedStatus === 'cancelled' || normalizedStatus === 'canceled';
  }

  private isLockedKitchenStatus(status: unknown): boolean {
    return this.isServedStatus(status) || this.isCancelledStatus(status);
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
      return 'Preparing';
    }

    return 'In Kitchen';
  }

  private getStatusCode(status: unknown): number {
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
      default:
        return ORDER_STATUS.InKitchen;
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
      default:
        return String(status ?? '');
    }
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

  private shouldLaunchTvModeFromRoute(): boolean {
    return this.route.snapshot.queryParamMap.get('tv') === '1';
  }

  private getRuntimeCounterName(): string {
    const routeCounterName = String(this.route.snapshot.queryParamMap.get('counterName') || '').trim();

    if (routeCounterName) {
      return routeCounterName;
    }

    const userCounterName = this.getStringValue(this.userDetails, 'CounterName', 'counterName');

    if (userCounterName) {
      return userCounterName;
    }

    try {
      const shiftAssignment = JSON.parse(localStorage.getItem('shiftAssignment') ?? '{}');
      return this.getStringValue(shiftAssignment, 'CounterName', 'counterName');
    } catch {
      return '';
    }
  }

  private async enterFullscreen(): Promise<void> {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Ignore fullscreen errors and keep TV mode inside the page.
    }
  }

  private async exitFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen exit errors.
    }
  }

}

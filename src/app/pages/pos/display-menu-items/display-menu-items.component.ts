import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { catchError, forkJoin, map, of } from 'rxjs';

import { AppToastService } from '../../../services/app-toast.service';
import { BranchService } from '../../../services/branch.service';
import { DisplayMenuItemsService } from '../../../services/display-menu-items.service';
import { OrganizationService } from '../../../services/organization.service';
import { RuntimeConfigService } from '../../../services/runtime-config.service';

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
  readyKitchenOrders: KitchenOrder[] = [];
  inKitchenOrders: KitchenOrder[] = [];
  readyKitchenOrderCount = 0;
  inKitchenOrderCount = 0;
  currentTime = new Date();
  organizationName = 'Unity work POS';
  branchName = '';
  organizationLogoUrl = '';

  constructor(
    private readonly toast: AppToastService,
    private readonly displayMenuItemsService: DisplayMenuItemsService,
    private readonly organizationService: OrganizationService,
    private readonly branchService: BranchService,
    private readonly runtimeConfig: RuntimeConfigService
  ) {}

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.organizationName = this.getStringValue(this.userDetails, 'OrganizationName', 'organizationName', 'OrgName', 'orgName') || 'Unity work POS';
    this.branchName = this.getStringValue(this.userDetails, 'BranchName', 'branchName') || '';
    this.loadDisplayHeaderDetails();
    this.loadKitchenOrders();
    this.refreshTimer = setInterval(() => {
      this.currentTime = new Date();
      this.loadKitchenOrders();
    }, 5000);
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

  get filteredInKitchenOrders(): KitchenOrder[] {
    return this.filteredKitchenOrders.filter((order) => !this.isReady(order));
  }

  get filteredReadyKitchenOrders(): KitchenOrder[] {
    return this.filteredKitchenOrders.filter((order) => this.isReady(order));
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

  getTableDisplay(order: KitchenOrder): string {
    const table = String(order.table || '').trim();

    if (!table || table === '0') {
      return 'Counter';
    }

    return table.toLowerCase().includes('table') ? table : `Table ${table}`;
  }

  getOrderNumberDisplay(order: KitchenOrder): string {
    return order.orderNo.startsWith('#') ? order.orderNo : `#${order.orderNo}`;
  }

  getElapsedMinutes(order: KitchenOrder): string {
    const sentTime = new Date(order.sentAt).getTime();

    if (Number.isNaN(sentTime)) {
      return '';
    }

    const elapsedMinutes = Math.max(Math.floor((this.currentTime.getTime() - sentTime) / 60000), 0);
    return `${elapsedMinutes} min`;
  }

  getOrderIcon(order: KitchenOrder): string {
    const orderType = String(order.orderType || '').toLowerCase();

    if (orderType.includes('take')) {
      return 'pi pi-shopping-bag';
    }

    if (orderType.includes('delivery')) {
      return 'pi pi-truck';
    }

    return 'pi pi-utensils';
  }

  getOrderToneClass(order: KitchenOrder, index: number): string {
    const orderType = String(order.orderType || '').toLowerCase();

    if (orderType.includes('take')) {
      return 'tone-teal';
    }

    if (orderType.includes('delivery')) {
      return 'tone-orange';
    }

    if (this.isReady(order)) {
      return index % 5 === 0 ? 'tone-black' : 'tone-green';
    }

    return ['tone-teal', 'tone-orange', 'tone-green', 'tone-red', 'tone-black'][index % 5];
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
    this.readyKitchenOrders = this.kitchenOrders.filter((order) => this.isReady(order));
    this.inKitchenOrders = this.kitchenOrders.filter((order) => !this.isReady(order));
    this.readyKitchenOrderCount = this.readyKitchenOrders.length;
    this.inKitchenOrderCount = this.inKitchenOrders.length;
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

  private loadDisplayHeaderDetails(): void {
    const orgId = this.getSessionOrgId();
    const branchId = this.getSessionBranchId();

    forkJoin({
      organization: orgId ? this.organizationService.getById(orgId).pipe(catchError(() => of(null))) : of(null),
      branch: branchId ? this.branchService.getById(branchId).pipe(catchError(() => of(null))) : of(null),
      config: orgId ? this.organizationService.GetOrganizationConfigByOrgId(orgId).pipe(catchError(() => of(null))) : of(null)
    }).subscribe(({ organization, branch, config }) => {
      const organizationRow = this.getResponseObject(organization);
      const branchRow = this.getResponseObject(branch);
      const configRow = this.getResponseObject(config);

      this.organizationName = this.getStringValue(organizationRow, 'Name', 'name', 'OrganizationName', 'organizationName') ||
        this.organizationName;
      this.branchName = this.getStringValue(branchRow, 'Name', 'name', 'BranchName', 'branchName') ||
        this.branchName;
      this.organizationLogoUrl = this.getOrganizationLogoUrl(
        this.getStringValue(configRow, 'Image', 'image') ||
        this.getStringValue(organizationRow, 'Image', 'image', 'Logo', 'logo')
      );
    });
  }

  private getResponseObject(response: any): any {
    const result = response?.result ?? response?.Result ?? response;

    if (Array.isArray(result)) {
      return result[0] ?? {};
    }

    return result && typeof result === 'object' ? result : {};
  }

  private getOrganizationLogoUrl(image: string): string {
    const imagePath = this.normalizeOrganizationImageValue(image);

    if (!imagePath) {
      return '';
    }

    if (/^https?:\/\//i.test(imagePath) || imagePath.startsWith('data:')) {
      return imagePath;
    }

    if (imagePath.startsWith('Organization/')) {
      return `${this.runtimeConfig.apiBaseUrl}/FileUpload/${imagePath}`;
    }

    if (imagePath.includes('/')) {
      return `${this.runtimeConfig.apiBaseUrl}/FileUpload/${imagePath}`;
    }

    return `${this.runtimeConfig.apiBaseUrl}/FileUpload/Organization/${imagePath}`;
  }

  private normalizeOrganizationImageValue(image: string): string {
    let imagePath = image.trim();

    if (!imagePath || imagePath.startsWith('data:')) {
      return imagePath;
    }

    const fileUploadMarker = '/FileUpload/';
    const markerIndex = imagePath.indexOf(fileUploadMarker);

    if (markerIndex >= 0) {
      imagePath = imagePath.substring(markerIndex + fileUploadMarker.length);
    }

    imagePath = imagePath.replace(/^\/+/, '');

    while (imagePath.startsWith('FileUpload/')) {
      imagePath = imagePath.substring('FileUpload/'.length);
    }

    if (imagePath.startsWith('Organization/Organization/')) {
      imagePath = imagePath.substring('Organization/'.length);
    }

    return imagePath;
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

  private getSessionOrgId(): number {
    return this.getNumberValue(this.userDetails, 'OrgId', 'orgId', 'orgid', 'OrganizationId', 'organizationId');
  }

  private getSessionBranchId(): number {
    return this.getNumberValue(this.userDetails, 'BranchId', 'branchId', 'branchid');
  }
}

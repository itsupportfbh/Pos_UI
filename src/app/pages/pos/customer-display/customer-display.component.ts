import { CommonModule } from '@angular/common';
import {ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';

import { AppToastService } from '../../../services/app-toast.service';
import { BranchService } from '../../../services/branch.service';
import { DisplayMenuItemsService } from '../../../services/display-menu-items.service';
import { OrganizationService } from '../../../services/organization.service';
import { RuntimeConfigService } from '../../../services/runtime-config.service';

type CustomerDisplayOrder = {
  trackKey: string;
  orderNo: string;
  status: string;
  table?: string;
  orderType?: string;
  customerName?: string;
  sentAt?: string;
};

@Component({
  selector: 'app-customer-display',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './customer-display.component.html',
  styleUrl: './customer-display.component.css'
})
export class CustomerDisplayComponent implements OnInit, OnDestroy {
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  userDetails: any = {};
  customerOrders: CustomerDisplayOrder[] = [];
  readyOrders: CustomerDisplayOrder[] = [];
  inProgressOrders: CustomerDisplayOrder[] = [];

  readyOrderCount = 0;
  inProgressOrderCount = 0;
  currentTime = new Date();
  organizationName = 'Unity work POS';
  branchName = '';
  organizationLogoUrl = '';
viewReady = false;
  constructor(
    private readonly toast: AppToastService,
    private readonly displayMenuItemsService: DisplayMenuItemsService,
    private readonly organizationService: OrganizationService,
    private readonly branchService: BranchService,
    private readonly runtimeConfig: RuntimeConfigService,
     private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.organizationName = this.getStringValue(this.userDetails,  'OrgName') || 'Unity work POS';
    this.branchName = this.getStringValue(this.userDetails, 'BranchName') || '';



    setTimeout(() => {
    this.viewReady = true;
    this.loadDisplayHeaderDetails();
    this.loadCustomerOrders();
    this.cdr.detectChanges();
  });
    
    
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  loadCustomerOrders(): void {
    this.displayMenuItemsService.getAll(this.getUserOrgId(), this.getUserBranchId()).subscribe({
      next: (response: any) => {
        const orders = this.getResponseList(response)
          .filter((order: any) => this.isCustomerDisplayOrder(order));

        this.customerOrders = orders.map((order: any) => this.mapApiOrderToCustomerOrder(order));
        this.rebuildStatusBuckets();
      },
      error: () => {
        this.customerOrders = [];
        this.rebuildStatusBuckets();
        this.toast.error('Load Failed', 'Unable to load customer display orders.');
      },
       complete: () => {
  setTimeout(() => {
    
    this.cdr.detectChanges();
  });
}
    });
  }

  private rebuildStatusBuckets(): void {
    this.readyOrders = this.customerOrders.filter((order) => this.isReadyStatus(order.status));
    this.inProgressOrders = this.customerOrders.filter((order) => !this.isReadyStatus(order.status));
    this.readyOrderCount = this.readyOrders.length;
    this.inProgressOrderCount = this.inProgressOrders.length;
  }

  private mapApiOrderToCustomerOrder(order: any): CustomerDisplayOrder {
    const id = this.getNumberValue(order, 'Orderid', 'orderid', 'OrderId', 'orderId', 'Id', 'id');
    const orderNo = this.getStringValue(order, 'OrderNumber', 'orderNumber', 'Ordernumber', 'ordernumber', 'OrderNo', 'orderNo');

    return {
      trackKey: `${id || orderNo || 'order'}-${this.getStringValue(order, 'UpdatedDate', 'updatedDate', 'CreatedDate', 'createdDate')}`,
      orderNo,
      status: this.getOrderStatus(order),
      table: this.getStringValue(order, 'TableName', 'tableName', 'TableCode', 'tableCode', 'TableNo', 'tableNo', 'Tableid', 'tableid', 'TableId', 'tableId', 'TableID', 'tableID') || 'Counter',
      orderType: this.getStringValue(order, 'OrderType', 'orderType', 'Ordertype', 'ordertype'),
      customerName: this.getStringValue(order, 'CustomerName', 'customerName', 'GuestName', 'guestName') || 'Walk-in Guest',
      sentAt: this.getStringValue(order, 'CreatedDate', 'createdDate', 'UpdatedDate', 'updatedDate')
    };
  }

  getCustomerName(order: CustomerDisplayOrder): string {
    const customerName = String(order.customerName || '').trim();
    return customerName || 'Walk-in Guest';
  }

  getTableDisplay(order: CustomerDisplayOrder): string {
    const table = String(order.table || '').trim();

    if (!table || table === '0') {
      return 'Counter';
    }

    return table.toLowerCase().includes('table') ? table : `Table ${table}`;
  }

  getOrderNumberDisplay(order: CustomerDisplayOrder): string {
    return order.orderNo.startsWith('#') ? order.orderNo : `#${order.orderNo}`;
  }

  getOrderTypeDisplay(order: CustomerDisplayOrder): string {
    return String(order.orderType || '').trim() || 'Order';
  }

  getOrderStatusDisplay(order: CustomerDisplayOrder): string {
    return String(order.status || '').trim() || 'In Progress';
  }

  getOrderTypeClass(order: CustomerDisplayOrder): string {
    const orderType = this.getOrderTypeDisplay(order).toLowerCase();

    if (orderType.includes('take')) {
      return 'order-type-take-away';
    }

    if (orderType.includes('delivery')) {
      return 'order-type-delivery';
    }

    if (this.isDineInOrderType(orderType)) {
      return 'order-type-dine-in';
    }

    return 'order-type-default';
  }

  getStatusClass(order: CustomerDisplayOrder): string {
    const status = this.getOrderStatusDisplay(order).toLowerCase();

    if (status.includes('ready')) {
      return 'status-ready';
    }

    if (status.includes('process') || status.includes('preparing')) {
      return 'status-in-process';
    }

    if (status.includes('kitchen')) {
      return 'status-in-kitchen';
    }

    if (status.includes('hold')) {
      return 'status-hold';
    }

    if (status.includes('cancel') || status.includes('void')) {
      return 'status-cancelled';
    }

    return 'status-default';
  }

  getElapsedMinutes(order: CustomerDisplayOrder): string {
    if (!order.sentAt) {
      return '';
    }

    const sentTime = new Date(order.sentAt).getTime();

    if (Number.isNaN(sentTime)) {
      return '';
    }

    const elapsedMinutes = Math.max(Math.floor((this.currentTime.getTime() - sentTime) / 60000), 0);
    return `${elapsedMinutes} min`;
  }

  getOrderIcon(order: CustomerDisplayOrder): string {
    const orderType = String(order.orderType || '').toLowerCase();

    if (this.isDineInOrderType(orderType)) {
      return 'pi pi-table';
    }

    if (orderType.includes('take')) {
      return 'pi pi-shopping-bag';
    }

    if (orderType.includes('delivery')) {
      return 'pi pi-truck';
    }

    return 'pi pi-utensils';
  }

  getOrderToneClass(order: CustomerDisplayOrder, index: number): string {
    const orderType = String(order.orderType || '').toLowerCase();

    if (this.isDineInOrderType(orderType)) {
      return 'tone-dine-in';
    }

    if (orderType.includes('take')) {
      return 'tone-teal';
    }

    if (orderType.includes('delivery')) {
      return 'tone-orange';
    }

    if (this.isReadyStatus(order.status)) {
      return index % 5 === 0 ? 'tone-black' : 'tone-green';
    }

    return ['tone-teal', 'tone-orange', 'tone-green', 'tone-red', 'tone-black'][index % 5];
  }

  private isDineInOrderType(orderType: string): boolean {
    const normalizedOrderType = String(orderType || '').replace(/[\s_-]+/g, '').toLowerCase();
    return normalizedOrderType.includes('dinein') || normalizedOrderType.includes('dinin') || normalizedOrderType.includes('table');
  }

  private isReadyStatus(status: string): boolean {
    const normalizedStatus = status.trim().toLowerCase();
    return normalizedStatus === 'ready' || normalizedStatus === 'ready to serve';
  }

  private getResponseList(response: any): any[] {
    const result = response?.result ?? response?.Result ?? response;

    if (Array.isArray(result)) {
      return result;
    }

    return result && typeof result === 'object' ? [result] : [];
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

  private getOrderStatus(order: any): string {
    return this.getStringValue(order, 'OrderStatus', 'orderStatus', 'Orderstatus', 'orderstatus', 'Status', 'status') || 'In Progress';
  }

  private isCustomerDisplayOrder(order: any): boolean {
    const orderNo = this.getStringValue(order, 'OrderNumber');
    const isDeleted = this.getBooleanValue(order, 'IsDeleted', 'isDeleted');
    const isActive = this.getBooleanValue(order, 'IsActive', 'isActive');

    return Boolean(orderNo) && !isDeleted && isActive !== false;
  }

  private getUserOrgId(): number {
    return Number(this.userDetails.RoleId || 0) === 1
      ? 0
      : this.getNumberValue(this.userDetails, 'OrgId');
  }

  private getUserBranchId(): number {
    return Number(this.userDetails.IsAdmin || 0) === 1 || Number(this.userDetails.RoleId || 0) === 1
      ? 0
      : this.getNumberValue(this.userDetails, 'BranchId', 'branchId', 'branchid');
  }

  private getSessionOrgId(): number {
    return this.getNumberValue(this.userDetails, 'OrgId');
  }

  private getSessionBranchId(): number {
    return this.getNumberValue(this.userDetails, 'BranchId');
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

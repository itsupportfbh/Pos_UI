import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { catchError, forkJoin, of } from 'rxjs';

import { AppToastService } from '../../../services/app-toast.service';
import { AppShellService } from '../../../services/app-shell.service';
import { BranchService } from '../../../services/branch.service';
import { DisplayMenuItemsService } from '../../../services/display-menu-items.service';
import { DualDisplayService } from '../../../services/dual-display.service';
import { OrganizationService } from '../../../services/organization.service';
import { RuntimeConfigService } from '../../../services/runtime-config.service';

type CustomerDisplayOrder = {
  id: number;
  trackKey: string;
  orderNo: string;
  status: string;
  table?: string;
  orderType?: string;
  customerName?: string;
  sentAt?: string;
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

@Component({
  selector: 'app-customer-display',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule
  ],
  templateUrl: './customer-display.component.html',
  styleUrl: './customer-display.component.css'
})
export class CustomerDisplayComponent implements OnInit, OnDestroy {
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private readonly handleFullscreenChange = () => {
    this.isFullscreenActive = Boolean(document.fullscreenElement);
    if (!document.fullscreenElement && this.isTvMode) {
      this.isTvMode = false;
      this.appShellService.setChromeHidden(false);
    }
    this.cdr.detectChanges();
  };

  userDetails: any = {};
  customerOrders: CustomerDisplayOrder[] = [];
  readyOrders: CustomerDisplayOrder[] = [];
  inProgressOrders: CustomerDisplayOrder[] = [];

  readyOrderCount = 0;
  inProgressOrderCount = 0;
  currentTime = new Date();
  organizationName = '';
  branchName = '';
  OrgId=0;
  BranchId=0;
  CounterId = 0;
  organizationLogoUrl = '';
  profileTitle = 'Customer Order Board';
  profileWelcomeMessage = '';
  profileIdleMessage = '';
  profileCode = '';
  profileThemeName = '';
  counterName = '';
  viewReady = false;
  isTvMode = false;
  isFullscreenActive = false;
  runtimeProfileId = 0;
  servingOrderKey = '';
  constructor(
    private readonly route: ActivatedRoute,
    private readonly toast: AppToastService,
    private readonly appShellService: AppShellService,
    private readonly displayMenuItemsService: DisplayMenuItemsService,
    private readonly dualDisplayService: DualDisplayService,
    private readonly organizationService: OrganizationService,
    private readonly branchService: BranchService,
    private readonly runtimeConfig: RuntimeConfigService,
     private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.appShellService.setChromeHidden(false);
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.organizationName = this.getStringValue(this.userDetails,  'OrgName') || 'Unity work POS';
    this.branchName = this.getStringValue(this.userDetails, 'BranchName') || '';
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

    this.resolveRuntimeContext();

    setTimeout(() => {
      this.viewReady = true;
      this.loadDisplayHeaderDetails();
      this.loadRuntimeProfile();
      this.loadCustomerOrders();
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

  async openTvMode(): Promise<void> {
    this.isTvMode = true;
    this.appShellService.setChromeHidden(true);
    await this.enterFullscreen();
    this.cdr.detectChanges();
  }

  async closeTvMode(): Promise<void> {
    this.isTvMode = false;
    this.appShellService.setChromeHidden(false);
    await this.exitFullscreen();
    this.cdr.detectChanges();
  }

  loadCustomerOrders(): void {
    this.displayMenuItemsService.getAll(this.OrgId, this.BranchId).subscribe({
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
    const id = this.getNumberValue(order, 'Orderid',  'OrderId');
    const orderNo = this.getStringValue(order, 'OrderNumber');

    return {
      id,
      trackKey: `${id || orderNo || 'order'}-${this.getStringValue(order, 'UpdatedDate', 'updatedDate', 'CreatedDate', 'createdDate')}`,
      orderNo,
      status: this.getOrderStatus(order),
      table: this.getStringValue(order, 'TableName') || 'Counter',
      orderType: this.getStringValue(order, 'OrderType'),
      customerName: this.getStringValue(order, 'CustomerName', ) || 'Walk-in Guest',
      sentAt: this.getStringValue(order, 'CreatedDate'),
      rawOrder: order
    };
  }

  markOrderServed(order: CustomerDisplayOrder): void {
    if (this.servingOrderKey) {
      return;
    }

    this.servingOrderKey = order.trackKey;
    const orderId = order.id || this.getNumberValue(order.rawOrder, 'Orderid', 'OrderId');
    const updateServed = (sourceOrder: any) => {
      const payload = this.buildServedPayload(order, sourceOrder);

      this.displayMenuItemsService.KitchenStatusChange(payload).subscribe({
        next: () => {
          this.customerOrders = this.customerOrders.filter((item) => item.trackKey !== order.trackKey);
          this.rebuildStatusBuckets();
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
          this.servingOrderKey = '';
          this.cdr.detectChanges();
        }
      });
    };

    if (orderId && !this.getOrderItems(order.rawOrder).length) {
      this.displayMenuItemsService.getById(orderId).pipe(
        catchError(() => of(order.rawOrder))
      ).subscribe((response: any) => updateServed(this.mergeOrderWithDetails(order.rawOrder, response)));
      return;
    }

    updateServed(order.rawOrder);
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

  getCustomerDisplayMessage(): string {
    if (String(this.profileWelcomeMessage || '').trim()) {
      return this.profileWelcomeMessage;
    }

    const organizationName = String(this.organizationName || '').trim() || 'Unity work POS';
    return `${organizationName} live progress screen for active orders and ready-to-collect calls.`;
  }

  getQueueEmptyMessage(): string {
    const idleMessage = this.getEffectiveIdleMessage();

    if (idleMessage) {
      return idleMessage;
    }

    return 'Fresh orders from the counter will appear here as soon as they are sent.';
  }

  getReadyEmptyMessage(): string {
    const idleMessage = this.getEffectiveIdleMessage();

    if (idleMessage) {
      return idleMessage;
    }

    return 'Completed tickets will move here when they are ready for guest collection.';
  }

  getOrderStatusDisplay(order: CustomerDisplayOrder): string {
    return this.getStatusLabel(order.status);
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

  getCustomerThemeClass(): string {
    const themeName = String(this.profileThemeName || '').trim().toLowerCase();

    if (themeName.includes('amber')) {
      return 'customer-theme-amber';
    }

    if (themeName.includes('evening') || themeName.includes('luxe')) {
      return 'customer-theme-luxe';
    }

    if (themeName.includes('pastel') || themeName.includes('glow')) {
      return 'customer-theme-pastel';
    }

    return 'customer-theme-default';
  }

  private async enterFullscreen(): Promise<void> {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      this.isFullscreenActive = Boolean(document.fullscreenElement);
      this.cdr.detectChanges();
    }
  }

  private async exitFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      this.isFullscreenActive = Boolean(document.fullscreenElement);
      this.cdr.detectChanges();
    }
  }

  private isDineInOrderType(orderType: string): boolean {
    const normalizedOrderType = String(orderType || '').replace(/[\s_-]+/g, '').toLowerCase();
    return normalizedOrderType.includes('dinein') || normalizedOrderType.includes('dinin') || normalizedOrderType.includes('table');
  }

  private isReadyStatus(status: string): boolean {
    return this.getStatusCode(status) === ORDER_STATUS.Ready;
  }

  private getResponseList(response: any): any[] {
    const result = response?.result ?? response?.Result ?? response;

    if (Array.isArray(result)) {
      return result;
    }

    return result && typeof result === 'object' ? [result] : [];
  }

  private buildServedPayload(order: CustomerDisplayOrder, sourceOrder: any): any {
    const rawOrder = sourceOrder ?? order.rawOrder ?? {};
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

  private getOrderItems(order: any): any[] {
    const items = order?.Items ?? order?.items ?? order?.OrderItems ?? order?.orderItems ?? [];
    return Array.isArray(items) ? items : [];
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

  private loadDisplayHeaderDetails(): void {
    forkJoin({
      organization: this.OrgId ? this.organizationService.getById(this.OrgId).pipe(catchError(() => of(null))) : of(null),
      branch: this.BranchId ? this.branchService.getById(this.BranchId).pipe(catchError(() => of(null))) : of(null),
      config: this.OrgId ? this.organizationService.GetOrganizationConfigByOrgId(this.OrgId).pipe(catchError(() => of(null))) : of(null)
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
      this.cdr.detectChanges();
    });
  }

  private loadRuntimeProfile(): void {
    if (this.runtimeProfileId > 0) {
      this.loadProfileById(this.runtimeProfileId);
      return;
    }

    this.loadActiveProfile();
  }

  private loadActiveProfile(): void {
    if (!this.OrgId) {
      return;
    }

    this.dualDisplayService.getActiveProfile(this.OrgId, this.BranchId, this.CounterId).subscribe({
      next: (response: any) => {
        const profile = this.getResponseObject(response);

        if (!profile || !Object.keys(profile).length) {
          return;
        }

        this.applyProfile(profile);
        this.cdr.detectChanges();
      },
      error: () => {
        this.resetProfileToDefaults();
      }
    });
  }

  private loadProfileById(profileId: number): void {
    this.dualDisplayService.getById(profileId).subscribe({
      next: (response: any) => {
        const profile = this.getResponseObject(response);

        if (!profile || !Object.keys(profile).length) {
          this.loadActiveProfile();
          return;
        }

        this.applyProfile(profile);
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadActiveProfile();
      }
    });
  }

  private getOrderStatus(order: any): string {
    return this.getStatusLabel(this.getRawValue(order, 'OrderStatus'));
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
        return ORDER_STATUS.Preparing;
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
        return 'In Progress';
    }
  }

  private isCustomerDisplayOrder(order: any): boolean {
    const orderNo = this.getStringValue(order, 'OrderNumber');
    const isDeleted = this.getBooleanValue(order, 'IsDeleted', 'isDeleted');
    const isActive = this.getBooleanValue(order, 'IsActive', 'isActive');
    const statusCode = this.getStatusCode(this.getRawValue(order, 'OrderStatus', 'orderStatus', 'Orderstatus', 'orderstatus', 'Status', 'status'));
    const visibleStatuses: number[] = [ORDER_STATUS.InKitchen, ORDER_STATUS.Preparing, ORDER_STATUS.Ready];

    return Boolean(orderNo)
      && !isDeleted
      && isActive !== false
      && visibleStatuses.includes(statusCode);
  }

  

  

  private getSessionOrgId(): number {
    return this.getNumberValue(this.userDetails, 'OrgId');
  }

  private getSessionBranchId(): number {
    return this.getNumberValue(this.userDetails, 'BranchId');
  }

  private getSessionCounterId(): number {
    const userCounterId = this.getNumberValue(this.userDetails, 'CounterId', 'counterId', 'counterid');

    if (userCounterId > 0) {
      return userCounterId;
    }

    try {
      const shiftAssignment = JSON.parse(localStorage.getItem('shiftAssignment') ?? '{}');
      return this.getNumberValue(shiftAssignment, 'CounterId', 'counterId', 'counterid');
    } catch {
      return 0;
    }
  }

  private resolveRuntimeContext(): void {
    const queryParams = this.route.snapshot.queryParamMap;

    this.OrgId = Number(queryParams.get('orgId') || this.userDetails.OrgId || 0);
    this.BranchId = Number(queryParams.get('branchId') || this.userDetails.BranchId || 0);
    this.CounterId = Number(queryParams.get('counterId') || this.getSessionCounterId() || 0);
    this.runtimeProfileId = Number(queryParams.get('profileId') || 0);

    const routeBranchName = queryParams.get('branchName');
    const routeCounterName = queryParams.get('counterName');
    const routeTitle = queryParams.get('headerTitle');

    if (routeBranchName) {
      this.branchName = routeBranchName;
    }

    if (routeCounterName) {
      this.counterName = routeCounterName;
    }

    if (routeTitle) {
      this.profileTitle = routeTitle;
    }
  }

  private shouldLaunchTvModeFromRoute(): boolean {
    return this.route.snapshot.queryParamMap.get('tv') === '1';
  }

  private getEffectiveIdleMessage(): string {
    const idleMessage = String(this.profileIdleMessage || '').trim();
    const welcomeMessage = String(this.profileWelcomeMessage || '').trim();

    if (!idleMessage) {
      return '';
    }

    if (welcomeMessage && idleMessage.toLowerCase() === welcomeMessage.toLowerCase()) {
      return '';
    }

    if (idleMessage.toLowerCase().startsWith('welcome ')) {
      return '';
    }

    return idleMessage;
  }

  private applyProfile(profile: any): void {
    this.profileCode = this.getStringValue(profile, 'ProfileCode');
    this.profileTitle = this.getStringValue(profile, 'HeaderTitle', 'ProfileName') || this.profileTitle || 'Customer Order Board';
    this.profileWelcomeMessage = this.getStringValue(profile, 'WelcomeMessage');
    this.profileIdleMessage = this.getStringValue(profile, 'IdleMessage');
    this.profileThemeName = this.getStringValue(profile, 'ThemeName');
    this.counterName = this.getStringValue(profile, 'CounterName') || this.counterName;
  }

  private resetProfileToDefaults(): void {
    this.profileTitle = 'Customer Order Board';
    this.profileWelcomeMessage = '';
    this.profileIdleMessage = '';
    this.profileThemeName = '';
    this.counterName = '';
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

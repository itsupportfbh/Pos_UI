import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';

import { AppToastService } from '../../../services/app-toast.service';
import { DisplayMenuItemsService } from '../../../services/display-menu-items.service';

type CustomerDisplayOrder = {
  id: number;
  orderNo: string;
  status: string;
  table?: string;
  orderType?: string;
};

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

  userDetails: any = {};
  customerOrders: CustomerDisplayOrder[] = [];
  readyOrders: CustomerDisplayOrder[] = [];
  inProgressOrders: CustomerDisplayOrder[] = [];

  totalCustomerOrders = 0;
  readyOrderCount = 0;
  inProgressOrderCount = 0;

  readonly pageEyebrow = 'Displays';
  readonly pageTitle = 'Customer Display';
  readonly pageSubtitle = 'Guest-facing order status board for pickup and preparation updates.';

  constructor(
    private readonly toast: AppToastService,
    private readonly displayMenuItemsService: DisplayMenuItemsService
  ) {}

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.loadCustomerOrders();
    this.refreshTimer = setInterval(() => this.loadCustomerOrders(), 5000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  loadCustomerOrders(): void {
    this.displayMenuItemsService.getAll(this.getUserOrgId(), this.getUserBranchId()).subscribe({
      next: (response: any) => {
        this.customerOrders = this.getResponseList(response)
          .map((order: any) => this.mapApiOrderToCustomerOrder(order))
          .filter((order: CustomerDisplayOrder) => order.orderNo && this.isCustomerDisplayStatus(order.status));

        this.rebuildStatusBuckets();
      },
      error: () => {
        this.customerOrders = [];
        this.rebuildStatusBuckets();
        this.toast.error('Load Failed', 'Unable to load customer display orders.');
      }
    });
  }

  private rebuildStatusBuckets(): void {
    this.readyOrders = this.customerOrders.filter((order) => this.isReadyStatus(order.status));
    this.inProgressOrders = this.customerOrders.filter((order) => !this.isReadyStatus(order.status));
    this.totalCustomerOrders = this.customerOrders.length;
    this.readyOrderCount = this.readyOrders.length;
    this.inProgressOrderCount = this.inProgressOrders.length;
  }

  private mapApiOrderToCustomerOrder(order: any): CustomerDisplayOrder {
    return {
      id: this.getNumberValue(order, 'Orderid', 'orderid', 'OrderId', 'orderId', 'Id', 'id'),
      orderNo: this.getStringValue(order, 'OrderNumber', 'orderNumber', 'Ordernumber', 'ordernumber', 'OrderNo', 'orderNo'),
      status: this.getStringValue(order, 'OrderStatus', 'orderStatus', 'Orderstatus', 'orderstatus') || 'In Progress',
      table: this.getStringValue(order, 'TableName', 'tableName', 'TableCode', 'tableCode', 'TableId', 'tableId'),
      orderType: this.getStringValue(order, 'OrderType', 'orderType', 'Ordertype', 'ordertype')
    };
  }

  private isReadyStatus(status: string): boolean {
    return status.trim().toLowerCase() === 'ready';
  }

  private isCustomerDisplayStatus(status: string): boolean {
    const normalizedStatus = status.trim().toLowerCase();
    return normalizedStatus === 'ready' || normalizedStatus === 'in kitchen' || normalizedStatus === 'in progress';
  }

  private getResponseList(response: any): any[] {
    const result = response?.result ?? response?.Result ?? response;
    return Array.isArray(result) ? result : [];
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

  private getStringValue(source: any, ...keys: string[]): string {
    const value = keys.map((key) => source?.[key]).find((item) => item !== undefined && item !== null);
    return value?.toString() ?? '';
  }

  private getNumberValue(source: any, ...keys: string[]): number {
    const value = keys.map((key) => source?.[key]).find((item) => item !== undefined && item !== null);
    return Number(value ?? 0);
  }
}

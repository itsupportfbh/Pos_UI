import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AutocompleteFieldComponent } from '../../../components/form/autocomplete-field.component';
import { FieldOption, SelectFieldComponent } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { ShiftAssignmentComponent } from '../components/shift-assignment/shift-assignment.component';
import { ShiftAssignmentService } from '../../../services/shift-assignment.service';
import { AppToastService } from '../../../services/app-toast.service';
import { DisplayMenuItemsService } from '../../../services/display-menu-items.service';
import { OrderScreenService } from '../../../services/order-screen.service';
import { OrganizationService } from '../../../services/organization.service';

type BillingMode = 'search-order' | 'quick-bill';
type ServiceMode = 'Dine In' | 'Take Away' | 'Delivery';
const ORDER_SCREEN_TEMPLATE_NAME = 'Order Screen';
const ORDER_STATUS = {
  Served: 4,
  Paid: 5
} as const;

type BillOrder = {
  id: number;
  orderNo: string;
  table: string;
  customer: string;
  phone: string;
  serviceMode: ServiceMode;
  branch: string;
  status: 'Ready To Bill' | 'Paid' | 'Out For Delivery';
  source: 'Order Screen' | 'Counter' | 'Take Away';
  notes: string;
  items: BillItem[];
  subtotalAmount: number;
  discountAmount: number;
  serviceChargeAmount: number;
  taxAmount: number;
  totalAmount: number;
};

type BillItem = {
  id: number;
  name: string;
  category: string;
  qty: number;
  rate: number;
  taxPercent: number;
  kotNo?: string;
  itemType?: 'Menu' | 'Combo';
  comboMenuId?: number;
};

type QuickMenuItem = {
  id: number;
  name: string;
  category: string;
  price: number;
  taxPercent: number;
  itemType: 'Menu' | 'Combo';
  comboMenuId?: number;
  badge?: string;
};

type BillingCartItem = BillItem & {
  sourceType: 'order' | 'quick';
};

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TextFieldComponent,
    SelectFieldComponent,
    AutocompleteFieldComponent,
    ShiftAssignmentComponent
  ],
  templateUrl: './billing.component.html',
  styleUrl: './billing.component.css'
})
export class BillingComponent implements OnInit {
  private readonly shiftService = inject(ShiftAssignmentService);
  private readonly toast = inject(AppToastService);
  private readonly displayMenuItemsService = inject(DisplayMenuItemsService);
  private readonly orderScreenService = inject(OrderScreenService);
  private readonly organizationService = inject(OrganizationService);
  readonly gstPercent = 9;
  readonly serviceChargePercent = 10;

  showShiftAssignment = false;

  readonly pageTitle = 'Billing';
  readonly pageSubtitle = 'Search order, verify items, collect payment, and close the bill.';

  userDetails: any = {};
  isLoadingOrders = false;
  isLoadingQuickItems = false;
  isGeneratingBill = false;
  private quickBillEntityNo = 0;
  private readonly orderEntityNoCache = new Map<string, number>();

  customers: string[] = ['Walk-in Customer'];

  readonly paymentModes: FieldOption[] = [
    { label: 'Cash', value: 'Cash' },
    { label: 'UPI', value: 'UPI' },
    { label: 'Debit Card', value: 'Debit Card' },
    { label: 'Credit Card', value: 'Credit Card' },
    { label: 'QR Scan', value: 'QR Scan' },
    { label: 'PayNow', value: 'PayNow' }
  ];

  quickMenuItems: QuickMenuItem[] = [];
  openOrders: BillOrder[] = [];

  billingMode: BillingMode = 'search-order';
  serviceFilter: ServiceMode | 'All' = 'All';
  orderSearch = '';
  itemSearch = '';
  barcodeSearch = '';
  cartSearch = '';
  selectedCustomer: string | null = 'Walk-in Customer';
  selectedPaymentMode: string | null = 'Cash';
  discountType: 'Amount' | 'Percent' = 'Amount';
  discountInput = '0';
  receivedAmountInput = '0';
  paymentReference = '';
  approvalCode = '';
  cardLastFour = '';
  notes = '';
  currentOrder: BillOrder | null = null;
  cartItems: BillingCartItem[] = [];
  filteredOrders: BillOrder[] = [];
  filteredQuickItems: QuickMenuItem[] = [];
  filteredCartItems: BillingCartItem[] = [];
  activeServiceModeLabel = 'All';
  orderCount = 0;
  currentCustomerLabel = 'Walk-in Customer';
  currentOrderNumber = 'Direct Billing';
  currentBranchLabel = 'Trichy';
  isDineInBill = false;
  isCashPayment = true;
  isCardPayment = false;
  isDigitalPayment = false;
  paymentReferenceLabel = 'Reference';
  settlementSummaryLabel = 'Received';
  settlementSummaryValue = '0';
  totalItems = 0;
  subtotal = 0;
  discountAmount = 0;
  serviceChargeAmount = 0;
  taxAmount = 0;
  grandTotal = 0;
  balanceAmount = 0;

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');

    if (!this.shiftService.isShiftAssigned()) {
      this.showShiftAssignment = true;
    }

    void this.loadBillingOrders();
    void this.loadQuickMenuItems(true);
    this.filteredCartItems = [];
    this.updateDisplayState();
    this.updatePaymentState();
    this.updateBillingSummary();
  }

  async loadBillingOrders(): Promise<void> {
    this.isLoadingOrders = true;

    try {
      const response: any = await firstValueFrom(this.displayMenuItemsService.getAll(this.getUserOrgId(), this.getUserBranchId()));
      const orders = this.getResponseList(response)
        .filter((order: any) => this.isBillingOrder(order))
        .map((order: any) => this.mapApiOrder(order));

      this.openOrders = orders;
      this.customers = [
        'Walk-in Customer',
        ...Array.from(new Set(orders.map((order: BillOrder) => order.customer).filter(Boolean)))
      ];
      this.updateOrderMatches();
    } catch {
      this.openOrders = [];
      this.filteredOrders = [];
      this.orderCount = 0;
      this.toast.error('Load Failed', 'Unable to load billing orders.');
    } finally {
      this.isLoadingOrders = false;
    }
  }

  async loadQuickMenuItems(loadTopSix = false): Promise<void> {
    this.isLoadingQuickItems = true;

    try {
      const response: any = loadTopSix
        ? await firstValueFrom(this.orderScreenService.getTopSixMenuAndComboMenu(this.getUserOrgId(), this.getUserBranchId()))
        : await firstValueFrom(this.orderScreenService.getAllMenuAndComboMenu(
            this.getUserOrgId(),
            this.getUserBranchId(),
            null,
            null,
            this.getQuickMenuSearchKey()
          ));

      this.quickMenuItems = this.getResponseList(response)
        .filter((item: any) => this.getBooleanValue(item, 'isactive', 'IsActive', 'isActive'))
        .map((item: any) => this.mapApiQuickMenuItem(item));
      this.updateQuickItemMatches();
    } catch {
      this.quickMenuItems = [];
      this.filteredQuickItems = [];
      this.toast.error('Load Failed', 'Unable to load quick bill menu items.');
    } finally {
      this.isLoadingQuickItems = false;
    }
  }

  setBillingMode(mode: BillingMode): void {
    this.billingMode = mode;
    this.currentOrder = null;
    this.orderSearch = '';
    this.notes = '';
    this.updateOrderMatches();
    this.updateDisplayState();

    if (mode === 'quick-bill' && !this.cartItems.length) {
      this.selectedCustomer = 'Walk-in Customer';
    }

    this.updateDisplayState();
    this.updatePaymentState();
    this.updateBillingSummary();
  }

  setServiceFilter(mode: ServiceMode | 'All'): void {
    this.serviceFilter = mode;
    this.updateOrderMatches();
    this.updateDisplayState();
    this.updateBillingSummary();
  }

  onOrderSearchChange(value: string): void {
    this.orderSearch = value;
    this.updateOrderMatches();
  }

  onItemSearchChange(value: string): void {
    this.itemSearch = value;
    void this.loadQuickMenuItems(false);
    this.updateQuickItemMatches();
  }

  onBarcodeSearchChange(value: string): void {
    this.barcodeSearch = value;
    void this.loadQuickMenuItems(false);
    this.updateQuickItemMatches();
  }

  onCartSearchChange(value: string): void {
    this.cartSearch = value;
    this.updateCartMatches();
  }

  selectOrder(order: BillOrder): void {
    const orderId = Number((order as any).id || 0);

    if (!orderId) {
      this.bindSelectedOrder(order);
      return;
    }

    this.displayMenuItemsService.getById(orderId).subscribe({
      next: (response: any) => {
        const detailOrder = this.mapApiOrder(this.getOrderDetailSource(response) ?? order);
        this.bindSelectedOrder(detailOrder);
      },
      error: () => {
        this.bindSelectedOrder(order);
      }
    });
  }

  addQuickItem(item: QuickMenuItem): void {
    this.billingMode = 'quick-bill';
    this.currentOrder = null;
    this.selectedCustomer = this.selectedCustomer || 'Walk-in Customer';

    const existing = this.cartItems.find((x) => x.id === item.id && x.sourceType === 'quick');

    if (existing) {
      existing.qty += 1;
    } else {
      this.cartItems = [
        ...this.cartItems,
        {
          id: item.id,
          name: item.name,
          category: item.category,
          qty: 1,
          rate: item.price,
          taxPercent: item.taxPercent,
          itemType: item.itemType,
          comboMenuId: item.comboMenuId,
          sourceType: 'quick'
        }
      ];
    }

    this.updateCartMatches();
    this.updateDisplayState();
    this.updateBillingSummary();
  }

  increaseQuantity(itemId: number): void {
    this.cartItems = this.cartItems.map((item) =>
      item.id === itemId ? { ...item, qty: item.qty + 1 } : item
    );
    this.updateCartMatches();
    this.updateBillingSummary();
  }

  decreaseQuantity(itemId: number): void {
    this.cartItems = this.cartItems
      .map((item) => item.id === itemId ? { ...item, qty: item.qty - 1 } : item)
      .filter((item) => item.qty > 0);
    this.updateCartMatches();
    this.updateBillingSummary();
  }

  removeCartItem(itemId: number): void {
    this.cartItems = this.cartItems.filter((item) => item.id !== itemId);
    this.updateCartMatches();
    this.updateBillingSummary();
  }

  setDiscountType(type: 'Amount' | 'Percent'): void {
    this.discountType = type;
    this.updateBillingSummary();
  }

  setPaymentMode(mode: string): void {
    this.selectedPaymentMode = mode;

    if (this.isCashPayment) {
      this.paymentReference = '';
      this.approvalCode = '';
      this.cardLastFour = '';
    } else {
      this.receivedAmountInput = '0';
    }

    if (!this.isCardPayment) {
      this.approvalCode = '';
      this.cardLastFour = '';
    }

    if (!this.isDigitalPayment) {
      this.paymentReference = '';
    }

    this.updatePaymentState();
    this.updateBillingSummary();
  }

  onDiscountChange(value: string): void {
    this.discountInput = value;
    this.updateBillingSummary();
  }

  onReceivedAmountChange(value: string): void {
    this.receivedAmountInput = value;
    this.updateBillingSummary();
  }

  onPaymentReferenceChange(value: string): void {
    this.paymentReference = value;
    this.updatePaymentState();
  }

  onApprovalCodeChange(value: string): void {
    this.approvalCode = value;
    this.updatePaymentState();
  }

  onCardLastFourChange(value: string): void {
    this.cardLastFour = value.replace(/\D/g, '').slice(0, 4);
  }

  clearBill(): void {
    this.currentOrder = null;
    this.orderSearch = '';
    this.itemSearch = '';
    this.barcodeSearch = '';
    this.cartSearch = '';
    this.selectedCustomer = 'Walk-in Customer';
    this.selectedPaymentMode = 'Cash';
    this.discountType = 'Amount';
    this.discountInput = '0';
    this.receivedAmountInput = '0';
    this.paymentReference = '';
    this.approvalCode = '';
    this.cardLastFour = '';
    this.notes = '';
    this.cartItems = [];
    this.updateOrderMatches();
    this.updateQuickItemMatches();
    this.updateCartMatches();
    this.updateDisplayState();
    this.updatePaymentState();
    this.updateBillingSummary();
  }

  printBill(): void {
    window.print();
  }

  async generateBill(): Promise<void> {
    if (this.isGeneratingBill) {
      return;
    }

    if (!this.cartItems.length) {
      this.toast.warn('No Items', 'Add at least one item before generating the bill.');
      return;
    }

    if (this.currentOrder) {
      this.toast.success('Bill Ready', `${this.currentOrder.orderNo} is ready for billing.`);
      return;
    }

    this.isGeneratingBill = true;

    try {
      const payload = await this.buildQuickBillOrderPayload();
      const response: any = await firstValueFrom(this.displayMenuItemsService.create(payload));
      const generatedOrderNo = this.getApiOrderNumber(response) || payload.OrderNumber;

      this.currentOrderNumber = generatedOrderNo;
      this.toast.success('Generated', `${generatedOrderNo} generated successfully.`);
      await this.loadBillingOrders();
    } catch (error: any) {
      const message = error?.message || 'Unable to generate quick bill order.';
      this.toast.error('Generate Failed', message);
    } finally {
      this.isGeneratingBill = false;
    }
  }

  markDelivered(): void {
    console.log('Delivery handed over', this.currentOrder?.orderNo);
  }

  private updateOrderMatches(): void {
    const search = this.orderSearch.toLowerCase().trim();

    this.filteredOrders = this.openOrders.filter((order) => {
      const serviceMatches = this.serviceFilter === 'All' || order.serviceMode === this.serviceFilter;
      const searchMatches =
        !search ||
        order.orderNo.toLowerCase().includes(search) ||
        order.customer.toLowerCase().includes(search) ||
        order.phone.includes(search) ||
        order.table.toLowerCase().includes(search);

      return serviceMatches && searchMatches;
    });

    this.orderCount = this.filteredOrders.length;
  }

  private updateQuickItemMatches(): void {
    const search = this.itemSearch.toLowerCase().trim();
    const barcode = this.barcodeSearch.toLowerCase().trim();

    this.filteredQuickItems = this.quickMenuItems.filter((item) =>
      (!search || item.name.toLowerCase().includes(search) || item.category.toLowerCase().includes(search)) &&
      (!barcode || String(item.id).includes(barcode) || item.name.toLowerCase().replaceAll(' ', '').includes(barcode))
    );
  }

  private updateCartMatches(): void {
    const search = this.cartSearch.toLowerCase().trim();

    this.filteredCartItems = this.cartItems.filter((item) =>
      !search
      || item.name.toLowerCase().includes(search)
      || item.category.toLowerCase().includes(search)
      || String(item.id).includes(search)
      || (item.kotNo || '').toLowerCase().includes(search)
    );
  }

  private updateBillingSummary(): void {
    this.totalItems = this.cartItems.reduce((sum, item) => sum + item.qty, 0);

    if (this.currentOrder) {
      this.subtotal = this.currentOrder.subtotalAmount;
      this.discountAmount = this.currentOrder.discountAmount;
      this.serviceChargeAmount = this.currentOrder.serviceChargeAmount;
      this.taxAmount = this.currentOrder.taxAmount;
      this.grandTotal = this.currentOrder.totalAmount;
      this.updatePaymentBalance();
      this.updateDisplayState();
      this.updatePaymentState();
      return;
    }

    this.subtotal = this.cartItems.reduce((sum, item) => sum + (item.qty * item.rate), 0);

    const discountValue = Number(this.discountInput || 0);

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      this.discountAmount = 0;
    } else if (this.discountType === 'Percent') {
      this.discountAmount = (this.subtotal * Math.min(discountValue, 100)) / 100;
    } else {
      this.discountAmount = Math.min(discountValue, this.subtotal);
    }

    const discountedSubtotal = Math.max(this.subtotal - this.discountAmount, 0);
    this.serviceChargeAmount = this.isDineInBill
      ? (discountedSubtotal * this.serviceChargePercent) / 100
      : 0;

    const taxableAmount = discountedSubtotal + this.serviceChargeAmount;
    this.taxAmount = this.cartItems.reduce((sum, item) => {
      const itemBase = item.qty * item.rate;
      const share = this.subtotal > 0 ? itemBase / this.subtotal : 0;
      const itemDiscount = this.discountAmount * share;
      const itemTaxable = Math.max(itemBase - itemDiscount, 0);
      const itemServiceCharge = this.isDineInBill ? (itemTaxable * this.serviceChargePercent) / 100 : 0;
      return sum + (((itemTaxable + itemServiceCharge) * this.gstPercent) / 100);
    }, 0);

    this.grandTotal = taxableAmount + this.taxAmount;

    this.updatePaymentBalance();

    this.updateDisplayState();
    this.updatePaymentState();
  }

  private updatePaymentBalance(): void {
    const receivedAmount = Number(this.receivedAmountInput || 0);
    this.balanceAmount = this.isCashPayment && Number.isFinite(receivedAmount)
      ? receivedAmount - this.grandTotal
      : 0;
  }

  private updateDisplayState(): void {
    this.activeServiceModeLabel = this.currentOrder?.serviceMode || (this.billingMode === 'quick-bill' ? 'Take Away' : this.serviceFilter);
    this.currentCustomerLabel = this.currentOrder?.customer || this.selectedCustomer || 'Walk-in Customer';
    this.currentOrderNumber = this.currentOrder?.orderNo || 'Direct Billing';
    this.currentBranchLabel = this.currentOrder?.branch || 'Trichy';
    this.isDineInBill = this.activeServiceModeLabel === 'Dine In';
  }

  private updatePaymentState(): void {
    this.isCashPayment = this.selectedPaymentMode === 'Cash';
    this.isCardPayment = this.selectedPaymentMode === 'Debit Card' || this.selectedPaymentMode === 'Credit Card';
    this.isDigitalPayment = this.selectedPaymentMode === 'UPI'
      || this.selectedPaymentMode === 'QR Scan'
      || this.selectedPaymentMode === 'PayNow';

    this.paymentReferenceLabel = 'Reference';

    if (this.selectedPaymentMode === 'UPI') {
      this.paymentReferenceLabel = 'UPI Reference';
    }

    if (this.selectedPaymentMode === 'QR Scan') {
      this.paymentReferenceLabel = 'QR Reference';
    }

    if (this.selectedPaymentMode === 'PayNow') {
      this.paymentReferenceLabel = 'PayNow Reference';
    }

    if (this.isCashPayment) {
      this.settlementSummaryLabel = 'Received';
      this.settlementSummaryValue = this.receivedAmountInput || '0';
      return;
    }

    if (this.isCardPayment) {
      this.settlementSummaryLabel = 'Approval';
      this.settlementSummaryValue = this.approvalCode || 'Pending';
      return;
    }

    this.settlementSummaryLabel = 'Reference';
    this.settlementSummaryValue = this.paymentReference || 'Pending';
  }

  private bindSelectedOrder(order: BillOrder): void {
    this.currentOrder = order;
    this.selectedCustomer = order.customer;
    this.notes = order.notes;
    this.cartItems = order.items.map((item) => ({
      ...item,
      sourceType: 'order'
    }));
    this.updateCartMatches();
    this.updateDisplayState();
    this.updateBillingSummary();
  }

  private async buildQuickBillOrderPayload(): Promise<any> {
    const orderCode = await this.loadLatestOrderNumber(ORDER_SCREEN_TEMPLATE_NAME, this.getSessionOrgId());
    this.quickBillEntityNo = orderCode.entityNo;

    const userId = this.getNumberValue(this.userDetails, 'UserId', 'userId', 'Id', 'id');
    const now = new Date().toISOString();
    const orderNumber = orderCode.orderNumber;
    const items = this.cartItems.map((item) => this.buildQuickBillOrderItem(item, userId, now));

    return {
      OrderId: 0,
      Orderid: 0,
      orderid: 0,
      OrderNumber: orderNumber,
      Ordernumber: orderNumber,
      orderNumber,
      TableId: 0,
      Tableid: 0,
      tableId: 0,
      FloorId: 0,
      Floorid: 0,
      floorId: 0,
      TableName: '',
      tableName: '',
      OrderType: 'Take Away',
      Ordertype: 'Take Away',
      orderType: 'Take Away',
      servingType: 'Self Service',
      OrderStatus: ORDER_STATUS.Served,
      Orderstatus: ORDER_STATUS.Served,
      orderStatus: ORDER_STATUS.Served,
      ItemCount: this.totalItems,
      Itemcount: this.totalItems,
      itemCount: this.totalItems,
      SubtotalAmount: this.subtotal,
      subtotalAmount: this.subtotal,
      TaxAmount: this.taxAmount,
      taxAmount: this.taxAmount,
      DiscountAmount: this.discountAmount,
      discountAmount: this.discountAmount,
      TotalAmount: this.grandTotal,
      totalAmount: this.grandTotal,
      CustomerName: this.selectedCustomer || 'Walk-in Customer',
      customerName: this.selectedCustomer || 'Walk-in Customer',
      ContactNumber: '',
      contactNumber: '',
      Notes: this.notes.trim(),
      notes: this.notes.trim(),
      ShiftId: this.getCurrentShiftId(),
      Shiftid: this.getCurrentShiftId(),
      shiftId: this.getCurrentShiftId(),
      CreatedBy: userId || 0,
      createdBy: userId || 0,
      CreatedDate: now,
      createdDate: now,
      UpdatedBy: userId || 0,
      updatedBy: userId || 0,
      UpdatedDate: now,
      updatedDate: now,
      IsDeleted: false,
      isDeleted: false,
      OrgId: this.getSessionOrgId(),
      orgId: this.getSessionOrgId(),
      BranchId: this.getSessionBranchId(),
      branchId: this.getSessionBranchId(),
      Items: items,
      items,
      EntityNo: this.quickBillEntityNo,
      entityNo: this.quickBillEntityNo
    };
  }

  private buildQuickBillOrderItem(item: BillingCartItem, userId: number, timestamp: string): any {
    const isCombo = item.itemType === 'Combo';
    const quantity = Number(item.qty || 0);
    const unitPrice = Number(item.rate || 0);
    const comboMenuItemId = isCombo ? item.comboMenuId || item.id || 0 : 0;

    return {
      Itemid: 0,
      itemid: 0,
      ItemId: 0,
      itemId: 0,
      Orderid: 0,
      orderid: 0,
      Menuitemid: isCombo ? 0 : item.id,
      MenuItemId: isCombo ? 0 : item.id,
      menuitemid: isCombo ? 0 : item.id,
      ComboMenuItemId: comboMenuItemId,
      comboMenuItemId,
      Itemname: item.name,
      itemname: item.name,
      Quantity: quantity,
      quantity,
      Unitprice: unitPrice,
      unitprice: unitPrice,
      Totalprice: quantity * unitPrice,
      totalprice: quantity * unitPrice,
      DiscountAmount: 0,
      discountAmount: 0,
      TaxAmount: 0,
      taxAmount: 0,
      Modifierdetails: '',
      modifierdetails: '',
      Itemstatus: ORDER_STATUS.Served,
      itemstatus: ORDER_STATUS.Served,
      Notes: isCombo ? 'Combo Menu' : '',
      notes: isCombo ? 'Combo Menu' : '',
      OrgId: this.getSessionOrgId(),
      orgId: this.getSessionOrgId(),
      CreatedBy: userId || 0,
      createdBy: userId || 0,
      CreatedDate: timestamp,
      createdDate: timestamp,
      UpdatedBy: userId || 0,
      updatedBy: userId || 0,
      UpdatedDate: timestamp,
      updatedDate: timestamp,
      IsDeleted: false,
      isDeleted: false
    };
  }

  private mapApiOrder(order: any): BillOrder {
    const orderType = this.getStringValue(order, 'OrderType', 'orderType', 'Ordertype', 'ordertype');
    const serviceMode = this.normalizeServiceMode(orderType);
    const branch = this.getStringValue(order, 'BranchName', 'branchName', 'Branch', 'branch')
      || this.getStringValue(this.userDetails, 'BranchName', 'branchName')
      || 'Branch';
    const tableId = this.getNumberValue(order, 'TableId', 'tableId', 'Tableid', 'tableid');
    const items = this.getOrderItems(order).map((item: any) => this.mapApiBillItem(item));
    const itemSubtotal = items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    const subtotalAmount = this.getNumberValue(order, 'SubtotalAmount', 'subtotalAmount', 'SubTotalAmount', 'subTotalAmount', 'Subtotal', 'subtotal') || itemSubtotal;
    const discountAmount = this.getNumberValue(order, 'DiscountAmount', 'discountAmount', 'Discount', 'discount');
    const serviceChargeAmount = this.getNumberValue(order, 'ServiceChargeAmount', 'serviceChargeAmount', 'ServiceCharge', 'serviceCharge');
    const taxAmount = this.getNumberValue(order, 'TaxAmount', 'taxAmount', 'Tax', 'tax');
    const totalAmount = this.getNumberValue(order, 'TotalAmount', 'totalAmount', 'GrandTotal', 'grandTotal', 'Total', 'total')
      || Math.max(subtotalAmount - discountAmount + serviceChargeAmount + taxAmount, 0);

    return {
      id: this.getNumberValue(order, 'OrderId', 'Orderid', 'orderId', 'orderid', 'Id', 'id'),
      orderNo: this.getStringValue(order, 'OrderNumber', 'orderNumber', 'Ordernumber', 'ordernumber', 'OrderNo', 'orderNo') || '-',
      table: this.getStringValue(order, 'TableName', 'tableName', 'TableCode', 'tableCode', 'TableNo', 'tableNo', 'Table', 'table')
        || this.getTableFallback(tableId),
      customer: this.getStringValue(order, 'CustomerName', 'customerName', 'GuestName', 'guestName') || 'Walk-in Customer',
      phone: this.getStringValue(order, 'ContactNumber', 'contactNumber', 'CustomerPhone', 'customerPhone', 'Phone', 'phone'),
      serviceMode,
      branch,
      status: this.mapBillingStatus(order),
      source: serviceMode === 'Dine In' ? 'Order Screen' : serviceMode === 'Take Away' ? 'Take Away' : 'Counter',
      notes: this.getStringValue(order, 'Notes', 'notes', 'Remarks', 'remarks'),
      items,
      subtotalAmount,
      discountAmount,
      serviceChargeAmount,
      taxAmount,
      totalAmount
    };
  }

  private mapApiBillItem(item: any): BillItem {
    const category = this.getStringValue(
      item,
      'categoryDisplay',
      'CategoryDisplay',
      'categoryName',
      'CategoryName',
      'categoryname',
      'Categoryname',
      'Category',
      'category',
      'subCategoryName',
      'SubCategoryName',
      'subcategoryname',
      'Subcategoryname',
      'SubCategory',
      'subCategory'
    );

    return {
      id: this.getNumberValue(item, 'Itemid', 'itemid', 'ItemId', 'itemId', 'Menuitemid', 'menuitemid', 'ComboMenuItemId', 'comboMenuItemId', 'Id', 'id'),
      name: this.getStringValue(item, 'Itemname', 'itemname', 'ItemName', 'itemName', 'Name', 'name') || 'Item',
      category: category || (this.getNumberValue(item, 'ComboMenuItemId', 'comboMenuItemId') ? 'Combo' : 'Menu'),
      qty: this.getNumberValue(item, 'Quantity', 'quantity', 'Qty', 'qty') || 1,
      rate: this.getNumberValue(item, 'Unitprice', 'unitprice', 'UnitPrice', 'unitPrice', 'Price', 'price'),
      taxPercent: this.getNumberValue(item, 'TaxPercent', 'taxPercent') || this.gstPercent,
      itemType: this.getNumberValue(item, 'ComboMenuItemId', 'comboMenuItemId') ? 'Combo' : 'Menu',
      comboMenuId: this.getNumberValue(item, 'ComboMenuItemId', 'comboMenuItemId'),
      kotNo: this.getStringValue(item, 'KotNo', 'KOTNo', 'kotNo', 'kotno')
    };
  }

  private mapApiQuickMenuItem(item: any): QuickMenuItem {
    const type = this.getStringValue(item, 'type', 'Type');
    const isCombo = type.toLowerCase() === 'combomenu' || type.toLowerCase() === 'combo';
    const category = [
      this.getStringValue(item, 'categoryName', 'CategoryName', 'categoryname', 'Categoryname', 'Category', 'category'),
      this.getStringValue(item, 'subCategoryName', 'SubCategoryName', 'subcategoryname', 'Subcategoryname', 'SubCategory', 'subCategory')
    ].filter(Boolean).join(' / ');

    return {
      id: this.getNumberValue(item, 'id', 'Id'),
      name: this.getStringValue(item, 'name', 'Name'),
      category: category || (isCombo ? 'Combo' : 'Menu'),
      price: this.getNumberValue(item, 'price', 'Price'),
      taxPercent: this.gstPercent,
      itemType: isCombo ? 'Combo' : 'Menu',
      comboMenuId: isCombo ? this.getNumberValue(item, 'id', 'Id') : 0,
      badge: isCombo ? 'Combo' : undefined
    };
  }

  private getOrderDetailSource(response: any): any | null {
    const result = response?.result ?? response?.Result ?? response ?? null;

    if (Array.isArray(result)) {
      return result[0] ?? null;
    }

    return result;
  }

  private getOrderItems(source: any): any[] {
    const items = source?.Items
      ?? source?.items
      ?? source?.OrderItems
      ?? source?.orderItems
      ?? source?.Orderitems
      ?? source?.orderitems
      ?? [];

    return Array.isArray(items) ? items : [];
  }

  private mapBillingStatus(order: any): BillOrder['status'] {
    const rawStatus = this.getRawValue(order, 'OrderStatus', 'orderStatus', 'Orderstatus', 'orderstatus', 'Status', 'status');
    const statusCode = this.getStatusCode(rawStatus);
    const status = String(rawStatus ?? '').trim().toLowerCase().replace(/\s+/g, '');

    if (statusCode === 5 || status.includes('paid')) {
      return 'Paid';
    }

    if (statusCode === ORDER_STATUS.Served || status.includes('served')) {
      return 'Ready To Bill';
    }

    if (status.includes('delivery') || this.normalizeServiceMode(this.getStringValue(order, 'OrderType', 'Ordertype', 'orderType')) === 'Delivery') {
      return 'Out For Delivery';
    }

    return 'Ready To Bill';
  }

  private normalizeServiceMode(value: string): ServiceMode {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue.includes('take')) {
      return 'Take Away';
    }

    if (normalizedValue.includes('deliver')) {
      return 'Delivery';
    }

    return 'Dine In';
  }

  private getQuickMenuSearchKey(): string {
    return (this.itemSearch || this.barcodeSearch || '').trim();
  }

  private async loadLatestOrderNumber(templateName: string, orgId: number): Promise<{ orderNumber: string; entityNo: number }> {
    const entityNo = await this.resolveOrderEntityNo(templateName, orgId);

    if (!entityNo || !orgId) {
      throw new Error('Code template context is missing.');
    }

    try {
      const response: any = await firstValueFrom(this.organizationService.GetLatestCode(entityNo, orgId, this.getCodeTemplateBranchId()));
      const orderNumber = String(response?.result ?? '').trim();

      if (!orderNumber) {
        throw new Error('Code template did not return an order number.');
      }

      return { orderNumber, entityNo };
    } catch {
      throw new Error('Unable to load order number. Please check code template setup.');
    }
  }

  private async resolveOrderEntityNo(templateName: string, orgId: number): Promise<number> {
    const branchId = this.getCodeTemplateBranchId();
    const cacheKey = `${orgId}:${branchId}:${this.normalizeTemplateName(templateName)}`;
    const cachedEntityNo = this.orderEntityNoCache.get(cacheKey);

    if (cachedEntityNo) {
      return cachedEntityNo;
    }

    try {
      const response: any = await firstValueFrom(this.organizationService.GetAllCodeTemplate(orgId, branchId, false));
      const templates = response?.result ?? [];
      const template = templates.find((item: any) =>
        this.normalizeTemplateName(item?.Name ?? item?.name) === this.normalizeTemplateName(templateName)
      );
      const entityNo = Number(template?.EntityNo ?? template?.entityNo ?? 0);

      if (!entityNo) {
        throw new Error(`${templateName} code template is missing.`);
      }

      this.orderEntityNoCache.set(cacheKey, entityNo);
      return entityNo;
    } catch {
      throw new Error(`Unable to load ${templateName} code template. Please check organization setup.`);
    }
  }

  private getApiOrderNumber(response: any): string {
    const result = response?.result ?? response?.Result ?? response;

    if (typeof result === 'string') {
      return result.trim();
    }

    return this.getStringValue(result, 'OrderNumber', 'Ordernumber', 'orderNumber', 'ordernumber', 'OrderNo', 'orderNo');
  }

  private getCodeTemplateBranchId(): number {
    return this.getNumberValue(this.userDetails, 'BranchId', 'branchId', 'branchid') || this.getSessionBranchId();
  }

  private normalizeTemplateName(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private getCurrentShiftId(): number {
    return this.getNumberValue(this.userDetails, 'ShiftId', 'shiftId', 'Shiftid', 'shiftid');
  }

  private getResponseList(response: any): any[] {
    const result = response?.result ?? response?.Result ?? response;

    if (Array.isArray(result)) {
      return result;
    }

    const nestedList = result?.data
      ?? result?.Data
      ?? result?.items
      ?? result?.Items
      ?? result?.orders
      ?? result?.Orders
      ?? result?.list
      ?? result?.List;

    if (Array.isArray(nestedList)) {
      return nestedList;
    }

    return result && typeof result === 'object' ? [result] : [];
  }

  private isBillingOrder(order: any): boolean {
    const orderNo = this.getStringValue(order, 'OrderNumber', 'orderNumber', 'Ordernumber', 'ordernumber', 'OrderNo', 'orderNo');
    const isDeleted = this.getBooleanValue(order, 'IsDeleted', 'isDeleted');
    const isActive = this.getBooleanValue(order, 'IsActive', 'isActive');
    const statusCode = this.getStatusCode(this.getRawValue(order, 'OrderStatus', 'orderStatus', 'Orderstatus', 'orderstatus', 'Status', 'status'));

    return Boolean(orderNo)
      && !isDeleted
      && isActive !== false
      && statusCode === ORDER_STATUS.Served;
  }

  private getTableFallback(tableId: number): string {
    return tableId > 0 ? `Table ${tableId}` : 'Counter';
  }

  private getStatusCode(status: unknown): number {
    if (typeof status === 'number' && Number.isFinite(status)) {
      return status;
    }

    const normalizedStatus = String(status ?? '').trim().toLowerCase().replace(/\s+/g, '');

    switch (normalizedStatus) {
      case '0':
      case 'hold':
        return 0;
      case '1':
      case 'inkitchen':
        return 1;
      case '2':
      case 'inprocess':
      case 'preparing':
        return 2;
      case '3':
      case 'ready':
      case 'readytoserve':
      case 'readytobill':
        return 3;
      case '4':
      case 'served':
        return 4;
      case '5':
      case 'paid':
      case 'completed':
        return ORDER_STATUS.Paid;
      default:
        return 3;
    }
  }

  private getRawValue(source: any, ...keys: string[]): unknown {
    return keys.map((key) => source?.[key]).find((item) => item !== undefined && item !== null);
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

  private getStringValue(source: any, ...keys: string[]): string {
    const value = keys.map((key) => source?.[key]).find((item) => item !== undefined && item !== null);
    return String(value ?? '').trim();
  }

  private getNumberValue(source: any, ...keys: string[]): number {
    const value = keys.map((key) => source?.[key]).find((item) => item !== undefined && item !== null);
    return Number(value ?? 0);
  }

  private getBooleanValue(source: any, ...keys: string[]): boolean {
    const value = keys.map((key) => source?.[key]).find((item) => item !== undefined && item !== null);

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value === 1;
    }

    return String(value ?? '').toLowerCase() === 'true' || String(value ?? '') === '1';
  }
}

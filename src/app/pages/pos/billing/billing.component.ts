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
  Hold: 0,
  InKitchen: 1,
  Preparing: 2,
  Ready: 3,
  Served: 4,
  Cancelled: 5,
  Completed: 6
} as const;

type BillOrder = {
  id: number;
  orderNo: string;
  table: string;
  customer: string;
  phone: string;
  serviceMode: ServiceMode;
  branch: string;
  status: 'Ready To Bill' | 'Completed' | 'Out For Delivery';
  source: 'Order Screen' | 'Counter' | 'Take Away';
  notes: string;
  items: BillItem[];
  subtotalAmount: number;
  discountAmount: number;
  serviceChargeAmount: number;
  taxAmount: number;
  totalAmount: number;
  rawOrder?: any;
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
  rawItem?: any;
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
  OrgId = 0;
  BranchId = 0;

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.applyUserScope();

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
    this.applyUserScope();

    try {
      const response: any = await firstValueFrom(this.displayMenuItemsService.getAll(this.OrgId, this.BranchId));
      const orderRows = this.getResponseList(response)
        .filter((order: any) => this.isBillingOrder(order));
      const orderDetails = await Promise.all(orderRows.map((order: any) => this.loadBillingOrderDetail(order)));
      const orders = orderDetails
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
    this.applyUserScope();

    try {
      const response: any = loadTopSix
        ? await firstValueFrom(this.orderScreenService.getTopSixMenuAndComboMenu(this.OrgId, this.BranchId))
        : await firstValueFrom(this.orderScreenService.getAllMenuAndComboMenu(
            this.OrgId,
            this.BranchId,
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

  async selectOrder(order: BillOrder): Promise<void> {
    const orderId = Number((order as any).id || 0);

    if (!orderId) {
      this.toast.error('Invalid Order', 'Unable to load this order from the API.');
      return;
    }

    this.isLoadingOrders = true;

    try {
      const response: any = await firstValueFrom(this.displayMenuItemsService.getById(orderId));
      const detailOrder = this.mapApiOrder(this.mergeOrderWithDetails(order.rawOrder ?? order, response));
      this.bindSelectedOrder(detailOrder);
    } catch {
      this.toast.error('Load Failed', 'Unable to load order details from the API.');
    } finally {
      this.isLoadingOrders = false;
    }
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

    if (!this.isPaymentReady()) {
      return;
    }

    this.isGeneratingBill = true;

    if (this.currentOrder) {
      try {
        const payload = this.buildCompletedOrderPayload(this.currentOrder);
        await firstValueFrom(this.displayMenuItemsService.update(payload));

        this.toast.success('Completed', `${this.currentOrder.orderNo} billed and closed.`);
        this.printBill();
        this.clearBill();
        await this.loadBillingOrders();
      } catch (error: any) {
        const message = error?.error?.message
          || error?.error?.Message
          || error?.message
          || `Unable to complete ${this.currentOrder.orderNo}.`;

        this.toast.error('Billing Failed', message);
      } finally {
        this.isGeneratingBill = false;
      }

      return;
    }

    try {
      const payload = await this.buildQuickBillOrderPayload();
      const response: any = await firstValueFrom(this.displayMenuItemsService.create(payload));
      const generatedOrderNo = this.getApiOrderNumber(response) || payload.OrderNumber;

      this.currentOrderNumber = generatedOrderNo;
      this.toast.success('Completed', `${generatedOrderNo} billed and closed.`);
      this.printBill();
      this.clearBill();
      await this.loadBillingOrders();
    } catch (error: any) {
      const message = error?.message || 'Unable to generate quick bill order.';
      this.toast.error('Generate Failed', message);
    } finally {
      this.isGeneratingBill = false;
    }
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
    const cartSubtotal = this.cartItems.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    this.subtotal = this.currentOrder?.subtotalAmount || cartSubtotal;

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
    this.discountType = 'Amount';
    this.discountInput = String(order.discountAmount || 0);
    this.cartItems = order.items.map((item) => ({
      ...item,
      sourceType: 'order'
    }));
    this.updateCartMatches();
    this.updateDisplayState();
    this.updateBillingSummary();
  }

  private applyUserScope(): void {
    this.OrgId = Number(this.userDetails.RoleId || 0) === 1
      ? 0
      : this.getNumberValue(this.userDetails, 'OrgId', 'orgId', 'orgid', 'OrganizationId', 'organizationId');
    this.BranchId = Number(this.userDetails.IsAdmin || 0) === 1 || Number(this.userDetails.RoleId || 0) === 1
      ? 0
      : this.getNumberValue(this.userDetails, 'BranchId', 'branchId', 'branchid');
  }

  private isPaymentReady(): boolean {
    if (this.grandTotal <= 0) {
      this.toast.warn('Invalid Bill', 'Bill total must be greater than zero.');
      return false;
    }

    if (this.isCashPayment) {
      const receivedAmount = Number(this.receivedAmountInput || 0);

      if (!Number.isFinite(receivedAmount) || receivedAmount < this.grandTotal) {
        this.toast.warn('Payment Pending', 'Enter cash received amount equal to or greater than the bill total.');
        return false;
      }
    }

    if (this.isDigitalPayment && !this.paymentReference.trim()) {
      this.toast.warn('Reference Required', `Enter ${this.paymentReferenceLabel.toLowerCase()} before completing the bill.`);
      return false;
    }

    if (this.isCardPayment && !this.approvalCode.trim()) {
      this.toast.warn('Approval Required', 'Enter card approval code before completing the bill.');
      return false;
    }

    return true;
  }

  private buildCompletedOrderPayload(order: BillOrder): any {
    const rawOrder = order.rawOrder ?? {};
    const userId = this.getNumberValue(this.userDetails, 'UserId', 'userId', 'Id', 'id');
    const now = new Date().toISOString();
    const orderId = this.getNumberValue(rawOrder, 'OrderId', 'Orderid', 'orderId', 'orderid', 'Id', 'id') || order.id;
    const items = this.cartItems.map((item) => this.buildCompletedOrderItem(item, orderId, userId, now));
    const paymentNote = this.getPaymentNote();
    const notes = [this.notes.trim(), paymentNote].filter(Boolean).join(' | ');

    return {
      ...rawOrder,
      OrderId: orderId,
      Orderid: orderId,
      orderid: orderId,
      OrderNumber: this.getStringValue(rawOrder, 'OrderNumber', 'Ordernumber', 'orderNumber', 'ordernumber') || order.orderNo,
      Ordernumber: this.getStringValue(rawOrder, 'Ordernumber', 'OrderNumber', 'orderNumber', 'ordernumber') || order.orderNo,
      orderNumber: this.getStringValue(rawOrder, 'orderNumber', 'OrderNumber', 'Ordernumber', 'ordernumber') || order.orderNo,
      OrderStatus: ORDER_STATUS.Completed,
      Orderstatus: ORDER_STATUS.Completed,
      orderStatus: ORDER_STATUS.Completed,
      ItemCount: this.totalItems,
      Itemcount: this.totalItems,
      itemCount: this.totalItems,
      SubtotalAmount: this.subtotal,
      subtotalAmount: this.subtotal,
      DiscountAmount: this.discountAmount,
      discountAmount: this.discountAmount,
      ServiceChargeAmount: this.serviceChargeAmount,
      serviceChargeAmount: this.serviceChargeAmount,
      TaxAmount: this.taxAmount,
      taxAmount: this.taxAmount,
      TotalAmount: this.grandTotal,
      totalAmount: this.grandTotal,
      CustomerName: this.selectedCustomer || order.customer || 'Walk-in Customer',
      customerName: this.selectedCustomer || order.customer || 'Walk-in Customer',
      Notes: notes,
      notes,
      PaymentMode: this.selectedPaymentMode,
      paymentMode: this.selectedPaymentMode,
      PaymentReference: this.getPaymentReferenceValue(),
      paymentReference: this.getPaymentReferenceValue(),
      ReceivedAmount: this.isCashPayment ? Number(this.receivedAmountInput || 0) : this.grandTotal,
      receivedAmount: this.isCashPayment ? Number(this.receivedAmountInput || 0) : this.grandTotal,
      BalanceAmount: this.balanceAmount,
      balanceAmount: this.balanceAmount,
      OrgId: this.getPayloadOrgId(rawOrder),
      orgId: this.getPayloadOrgId(rawOrder),
      BranchId: this.getPayloadBranchId(rawOrder),
      branchId: this.getPayloadBranchId(rawOrder),
      UpdatedBy: userId || this.getNumberValue(rawOrder, 'UpdatedBy', 'updatedBy') || 0,
      updatedBy: userId || this.getNumberValue(rawOrder, 'UpdatedBy', 'updatedBy') || 0,
      UpdatedDate: now,
      updatedDate: now,
      IsDeleted: false,
      isDeleted: false,
      Items: items,
      items
    };
  }

  private buildCompletedOrderItem(item: BillingCartItem, orderId: number, userId: number, timestamp: string): any {
    const rawItem = item.rawItem ?? {};
    const quantity = Number(item.qty || 0);
    const unitPrice = Number(item.rate || 0);

    return {
      ...rawItem,
      Itemid: this.getNumberValue(rawItem, 'Itemid', 'itemid', 'ItemId', 'itemId', 'Id', 'id') || item.id,
      itemid: this.getNumberValue(rawItem, 'itemid', 'Itemid', 'ItemId', 'itemId', 'Id', 'id') || item.id,
      Orderid: this.getNumberValue(rawItem, 'Orderid', 'orderid', 'OrderId', 'orderId') || orderId,
      orderid: this.getNumberValue(rawItem, 'orderid', 'Orderid', 'OrderId', 'orderId') || orderId,
      Quantity: quantity,
      quantity,
      Unitprice: unitPrice,
      unitprice: unitPrice,
      Totalprice: quantity * unitPrice,
      totalprice: quantity * unitPrice,
      Itemstatus: ORDER_STATUS.Completed,
      itemstatus: ORDER_STATUS.Completed,
      UpdatedBy: userId || this.getNumberValue(rawItem, 'UpdatedBy', 'updatedBy') || 0,
      updatedBy: userId || this.getNumberValue(rawItem, 'UpdatedBy', 'updatedBy') || 0,
      UpdatedDate: timestamp,
      updatedDate: timestamp,
      IsDeleted: false,
      isDeleted: false
    };
  }

  private getPaymentNote(): string {
    const paymentReference = this.getPaymentReferenceValue();
    return [
      `Payment: ${this.selectedPaymentMode || 'Cash'}`,
      paymentReference ? `Ref: ${paymentReference}` : '',
      this.isCashPayment ? `Received: ${Number(this.receivedAmountInput || 0).toFixed(2)}` : ''
    ].filter(Boolean).join(', ');
  }

  private getPaymentReferenceValue(): string {
    if (this.isCardPayment) {
      return [this.approvalCode.trim(), this.cardLastFour.trim() ? `****${this.cardLastFour.trim()}` : '']
        .filter(Boolean)
        .join(' / ');
    }

    return this.paymentReference.trim();
  }

  private async buildQuickBillOrderPayload(): Promise<any> {
    const orderCode = await this.loadLatestOrderNumber(ORDER_SCREEN_TEMPLATE_NAME, this.getCodeTemplateOrgId());
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
      OrderStatus: ORDER_STATUS.Completed,
      Orderstatus: ORDER_STATUS.Completed,
      orderStatus: ORDER_STATUS.Completed,
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
      Notes: [this.notes.trim(), this.getPaymentNote()].filter(Boolean).join(' | '),
      notes: [this.notes.trim(), this.getPaymentNote()].filter(Boolean).join(' | '),
      PaymentMode: this.selectedPaymentMode,
      paymentMode: this.selectedPaymentMode,
      PaymentReference: this.getPaymentReferenceValue(),
      paymentReference: this.getPaymentReferenceValue(),
      ReceivedAmount: this.isCashPayment ? Number(this.receivedAmountInput || 0) : this.grandTotal,
      receivedAmount: this.isCashPayment ? Number(this.receivedAmountInput || 0) : this.grandTotal,
      BalanceAmount: this.balanceAmount,
      balanceAmount: this.balanceAmount,
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
      OrgId: this.getCodeTemplateOrgId(),
      orgId: this.getCodeTemplateOrgId(),
      BranchId: this.getCodeTemplateBranchId(),
      branchId: this.getCodeTemplateBranchId(),
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
      Itemstatus: ORDER_STATUS.Completed,
      itemstatus: ORDER_STATUS.Completed,
      Notes: isCombo ? 'Combo Menu' : '',
      notes: isCombo ? 'Combo Menu' : '',
      OrgId: this.getCodeTemplateOrgId(),
      orgId: this.getCodeTemplateOrgId(),
      BranchId: this.getCodeTemplateBranchId(),
      branchId: this.getCodeTemplateBranchId(),
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
      totalAmount,
      rawOrder: order
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
      kotNo: this.getStringValue(item, 'KotNo', 'KOTNo', 'kotNo', 'kotno'),
      rawItem: item
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

  private async loadBillingOrderDetail(order: any): Promise<any> {
    const orderId = this.getNumberValue(order, 'OrderId', 'Orderid', 'orderId', 'orderid', 'Id', 'id');

    if (!orderId) {
      return order;
    }

    const response: any = await firstValueFrom(this.displayMenuItemsService.getById(orderId));
    return this.mergeOrderWithDetails(order, response);
  }

  private mergeOrderWithDetails(listOrder: any, response: any): any {
    const result = response?.result ?? response?.Result ?? response ?? null;
    const detailHeader = this.extractOrderHeader(result) ?? {};
    const detailItems = this.extractOrderItems(result, detailHeader);
    const items = detailItems.length ? detailItems : this.getOrderItems(listOrder);

    return {
      ...listOrder,
      ...detailHeader,
      Items: items,
      items
    };
  }

  private extractOrderHeader(result: any): any | null {
    if (!result) {
      return null;
    }

    if (Array.isArray(result)) {
      return result.find((item: any) => this.isOrderHeaderLike(item)) ?? result[0] ?? null;
    }

    const nestedHeader = result.Order
      ?? result.order
      ?? result.OrderHeader
      ?? result.orderHeader
      ?? result.Header
      ?? result.header
      ?? result.Master
      ?? result.master;

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

    if (statusCode === ORDER_STATUS.Completed || status.includes('paid') || status.includes('completed')) {
      return 'Completed';
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
    return this.getNumberValue(this.userDetails, 'BranchId', 'branchId', 'branchid') || this.BranchId;
  }

  private getCodeTemplateOrgId(): number {
    return this.getNumberValue(this.userDetails, 'OrgId', 'orgId', 'orgid', 'OrganizationId', 'organizationId') || this.OrgId;
  }

  private getPayloadOrgId(source: any = {}): number {
    return this.getNumberValue(source, 'OrgId', 'orgId', 'orgid', 'OrganizationId', 'organizationId')
      || this.getCodeTemplateOrgId();
  }

  private getPayloadBranchId(source: any = {}): number {
    return this.getNumberValue(source, 'BranchId', 'branchId', 'branchid')
      || this.getCodeTemplateBranchId();
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
    const isDeleted = this.getOptionalBooleanValue(order, 'IsDeleted', 'isDeleted');
    const isActive = this.getOptionalBooleanValue(order, 'IsActive', 'isActive');
    const statusCode = this.getStatusCode(this.getRawValue(order, 'OrderStatus', 'orderStatus', 'Orderstatus', 'orderstatus', 'Status', 'status'));

    return Boolean(orderNo)
      && isDeleted !== true
      && isActive !== false
      && statusCode === ORDER_STATUS.Served;
  }

  private isOrderHeaderLike(value: any): boolean {
    return Boolean(value && typeof value === 'object' && (
      value.OrderId !== undefined ||
      value.Orderid !== undefined ||
      value.orderId !== undefined ||
      value.orderid !== undefined ||
      value.OrderNumber !== undefined ||
      value.Ordernumber !== undefined ||
      value.orderNumber !== undefined
    ));
  }

  private isOrderItemLike(value: any): boolean {
    return Boolean(value && typeof value === 'object' && (
      value.Itemid !== undefined ||
      value.itemid !== undefined ||
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
      case 'cancelled':
      case 'canceled':
        return ORDER_STATUS.Cancelled;
      case '6':
      case 'paid':
      case 'completed':
        return ORDER_STATUS.Completed;
      default:
        return ORDER_STATUS.Ready;
    }
  }

  private getRawValue(source: any, ...keys: string[]): unknown {
    return keys.map((key) => source?.[key]).find((item) => item !== undefined && item !== null);
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

  private getOptionalBooleanValue(source: any, ...keys: string[]): boolean | null {
    const value = keys.map((key) => source?.[key]).find((item) => item !== undefined && item !== null);

    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value === 1;
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

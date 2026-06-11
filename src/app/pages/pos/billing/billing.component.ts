import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AutocompleteFieldComponent } from '../../../components/form/autocomplete-field.component';
import { FieldOption, SelectFieldComponent } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { ShiftAssignmentComponent } from '../components/shift-assignment/shift-assignment.component';
import { ShiftAssignmentService } from '../../../services/shift-assignment.service';
import { AppToastService } from '../../../services/app-toast.service';
import { BillingService } from '../../../services/billing.service';
import { DisplayMenuItemsService } from '../../../services/display-menu-items.service';
import { JoinTableService } from '../../../services/join-table.service';
import { OrderScreenService } from '../../../services/order-screen.service';
import { OrganizationService } from '../../../services/organization.service';
import { PaymodeService } from '../../../services/paymode.service';
import { TaxService } from '../../../services/tax.service';

type BillingMode = 'search-order' | 'quick-bill';
type BillingGroupMode = 'single' | 'joined' | 'manual';
type ServiceMode = 'Dine In' | 'Take Away' | 'Delivery';

const BILLING_TEMPLATE_NAME = 'Billing';
const ORDER_SCREEN_TEMPLATE_NAME = 'Order Screen';
const DEFAULT_BILLING_NOTE = 'Please consume the food within 2 hours of purchase.';
const ORDER_STATUS = {
  Hold: 0,
  InKitchen: 1,
  Preparing: 2,
  Ready: 3,
  Served: 4,
  Cancelled: 5,
  Completed: 6
} as const;
const PAYMENT_STATUS = {
  Pending: 0,
  Paid: 1,
  PartialPaid: 2,
  Cancelled: 3,
  Refunded: 4,
  Failed: 5,
  Voided: 6,
  Overpaid: 7
} as const;

type BillOrder = {
  id: number;
  orderNo: string;
  tableId: number;
  table: string;
  tableFlow: BillTableFlow;
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
  tipAmount: number;
  roundOffAmount: number;
  totalAmount: number;
  rawOrder?: any;
};

type BillTableFlow = {
  mode: 'Move Table' | 'Join Table' | 'No Table Flow';
  reference: string;
  fromTable: string;
  toTable: string;
  primaryTable: string;
  joinedTables: string;
  reason: string;
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
  sourceOrderId?: number;
  sourceOrderNo?: string;
  sourceTable?: string;
};

type PaymentSplit = {
  id: number;
  paymentMode: string;
  amountInput: string;
  referenceNo: string;
  approvalCode: string;
  cardLastFour: string;
};

type ActiveJoinGroup = {
  id: number;
  joinNo: string;
  primaryTableId: number;
  tableIds: number[];
  notes: string;
};

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    ProgressSpinnerModule,
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
  private readonly billingService = inject(BillingService);
  private readonly displayMenuItemsService = inject(DisplayMenuItemsService);
  private readonly joinTableService = inject(JoinTableService);
  private readonly orderScreenService = inject(OrderScreenService);
  private readonly organizationService = inject(OrganizationService);
  private readonly paymodeService = inject(PaymodeService);
  private readonly taxService = inject(TaxService);
  private readonly cdr = inject(ChangeDetectorRef);
  gstPercent = 9;
  taxName = 'GST';
  readonly serviceChargePercent = 10;
  private currentBillingEntityNo = Number(sessionStorage.getItem("currentMenuEntityNo") || 0);
  showShiftAssignment = false;

  readonly pageTitle = 'Billing';
  readonly pageSubtitle = 'Search order, verify items, collect payment, and close the bill.';
  readonly pageLoadingTitle = 'Unity work POS';
  readonly pageLoadingSubtitle = 'Loading billing workspace.';

  userDetails: any = {};
  isLoadingOrders = false;
  isLoadingQuickItems = false;
  pageLoading = false;
  isGeneratingBill = false;
  private currentOrderEntityNo = 0;
  private quickBillEntityNo = 0;
  private readonly orderEntityNoCache = new Map<string, number>();

  customers: string[] = ['Walk-in Customer'];

  paymentModes: FieldOption[] = [];

  quickMenuItems: QuickMenuItem[] = [];
  openOrders: BillOrder[] = [];
  activeJoinGroups: ActiveJoinGroup[] = [];

  billingMode: BillingMode = 'search-order';
  billingGroupMode: BillingGroupMode = 'single';
  serviceFilter: ServiceMode | 'All' = 'All';
  orderSearch = '';
  itemSearch = '';
  barcodeSearch = '';
  cartSearch = '';
  selectedCustomer: string | null = 'Walk-in Customer';
  selectedPaymentMode: string | null = 'Cash';
  discountType: 'Amount' | 'Percent' = 'Amount';
  discountInput = '0';
  serviceChargeInput = '0';
  tipInput = '0';
  roundOffInput = '0';
  private isServiceChargeManual = false;
  private isRoundOffManual = false;
  private paymentSplitSequence = 1;
  paymentSplits: PaymentSplit[] = [this.createPaymentSplit('Cash')];
  notes = '';
  currentOrder: BillOrder | null = null;
  selectedOrders: BillOrder[] = [];
  selectedJoinGroup: ActiveJoinGroup | null = null;
  cartItems: BillingCartItem[] = [];
  filteredOrders: BillOrder[] = [];
  filteredQuickItems: QuickMenuItem[] = [];
  filteredCartItems: BillingCartItem[] = [];
  activeServiceModeLabel = 'All';
  orderCount = 0;
  currentCustomerLabel = 'Walk-in Customer';
  currentOrderNumber = 'Direct Billing';
  currentBranchLabel = '----';
  currentCounterLabel = '---';
  currentTerminalLabel = '---';
  currentCashierLabel = '---';
  isDineInBill = false;
  settlementSummaryLabel = 'Received';
  totalItems = 0;
  subtotal = 0;
  discountAmount = 0;
  serviceChargeAmount = 0;
  taxAmount = 0;
  tipAmount = 0;
  roundOffAmount = 0;
  grandTotal = 0;
  balanceAmount = 0;
  receivedAmount = 0;
  changeAmount = 0;
  OrgId = 0;
  BranchId = 0;
  BranchName='';
  CounterName = '';
  TerminalName = '';
  CashierName = '';

  ngOnInit(): void {
    this.pageLoading = true;
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.OrgId = Number(this.userDetails.OrgId || 0);
    this.BranchId = this.userDetails.IsAdmin === true || Number(this.userDetails.RoleId || 0) === 1
      ? 0
      : Number(this.userDetails.BranchId || 0);
    this.BranchName = this.getStringValue(this.userDetails, 'BranchName', 'branchName', 'Branch', 'branch');
    this.CounterName = this.getStringValue(this.userDetails, 'CounterName', 'counterName', 'Counter', 'counter');
    this.TerminalName = this.getStringValue(this.userDetails, 'TerminalName', 'terminalName', 'Terminal', 'terminal', 'DeviceName', 'deviceName');
    this.CashierName = this.getStringValue(this.userDetails, 'UserName', 'userName', 'Username', 'username', 'CashierName', 'cashierName', 'EmpName', 'empName', 'Name', 'name');
    this.currentBranchLabel = this.BranchName || '---';
    this.currentCounterLabel = this.CounterName || '---';
    this.currentTerminalLabel = this.TerminalName || '---';
    this.currentCashierLabel = this.CashierName || '---';
    this.applyUserScope();

    if (!this.shiftService.isShiftAssigned()) {
      this.showShiftAssignment = true;
    }

    void Promise.all([
      this.runInitialLoadTask(this.loadTaxPercentage()),
      this.runInitialLoadTask(this.loadPaymentModes()),
      this.runInitialLoadTask(this.loadBillingOrders()),
      this.runInitialLoadTask(this.loadQuickMenuItems(true))
    ]).finally(() => {
      this.updateBillingSummary();
      this.pageLoading = false;
      this.cdr.detectChanges();
    });
    this.filteredCartItems = [];
    this.updateDisplayState();
    this.updatePaymentState();
    this.updateBillingSummary();
  }

  private async runInitialLoadTask(task: Promise<void>, timeoutMs = 8000): Promise<void> {
    await Promise.race([
      task.catch(() => undefined),
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))
    ]);
  }

  async loadBillingOrders(): Promise<void> {
    this.isLoadingOrders = true;
    this.applyUserScope();

    try {
      await this.loadActiveJoinGroups();
      const orderRows = await this.loadBillingOrderRows();
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

  private async loadBillingOrderRows(): Promise<any[]> {
    const scopedResponse: any = await firstValueFrom(this.displayMenuItemsService.getAll(this.OrgId, this.BranchId));
    const scopedOrders = this.getResponseList(scopedResponse)
      .filter((order: any) => this.isBillingOrder(order));

    if (scopedOrders.length || !this.BranchId) {
      return scopedOrders;
    }

    const orgResponse: any = await firstValueFrom(this.displayMenuItemsService.getAll(this.OrgId, 0));
    return this.getResponseList(orgResponse)
      .filter((order: any) => this.isBillingOrder(order));
  }

  private async loadActiveJoinGroups(): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.joinTableService.getAll(this.OrgId));
      const rows = this.getResponseList(response).filter((row: any) => {
        const isDeleted = this.getOptionalBooleanValue(row, 'IsDeleted', 'isDeleted');
        const isActive = this.getOptionalBooleanValue(row, 'IsActive', 'isActive');
        const status = this.getStringValue(row, 'Status', 'status').toLowerCase();

        return isDeleted !== true
          && isActive !== false
          && status !== 'released'
          && status !== 'inactive';
      });

      const groups = await Promise.all(rows.map((row: any) => this.loadJoinGroup(row)));
      this.activeJoinGroups = groups.filter((group): group is ActiveJoinGroup => Boolean(group && group.tableIds.length > 1));
    } catch {
      this.activeJoinGroups = [];
    }
  }

  private async loadJoinGroup(row: any): Promise<ActiveJoinGroup | null> {
    const id = this.getNumberValue(row, 'Id', 'id');
    const source = id ? await this.loadJoinGroupDetail(id, row) : row;
    const primaryTableId = this.getNumberValue(source, 'PrimaryTable', 'primaryTable', 'primarytable');
    const tableIds = [
      primaryTableId,
      ...this.getJoinSecondaryTableIds(source)
    ].filter((tableId, index, list) => tableId > 0 && list.indexOf(tableId) === index);

    if (!tableIds.length) {
      return null;
    }

    return {
      id,
      joinNo: this.getStringValue(source, 'JoinNo', 'joinNo', 'joinno') || this.getStringValue(row, 'JoinNo', 'joinNo', 'joinno'),
      primaryTableId,
      tableIds,
      notes: this.getStringValue(source, 'Notes', 'notes')
    };
  }

  private async loadJoinGroupDetail(id: number, fallback: any): Promise<any> {
    try {
      const response: any = await firstValueFrom(this.joinTableService.getById(id));
      const result = response?.result ?? response?.Result ?? response;
      return Array.isArray(result) ? result[0] ?? fallback : result ?? fallback;
    } catch {
      return fallback;
    }
  }

  private getJoinSecondaryTableIds(source: any): number[] {
    const rawTableIds = this.getRawValue(source, 'TableIds', 'tableIds', 'MergedTables', 'mergedTables', 'SecondaryTables', 'secondaryTables');

    if (!Array.isArray(rawTableIds)) {
      return [];
    }

    return rawTableIds
      .map((table: any) => this.getNumberValue(table, 'TableId', 'tableId', 'Id', 'id') || Number(table || 0))
      .filter((tableId) => Number.isFinite(tableId) && tableId > 0);
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
    const hasSelectedOrder = Boolean(this.selectedOrders.length);

    this.billingMode = mode;

    if (!hasSelectedOrder) {
      this.currentOrder = null;
      this.orderSearch = '';
      this.notes = this.getDefaultBillingNoteForMode(mode === 'quick-bill' ? 'Take Away' : this.serviceFilter);
    }

    this.updateOrderMatches();
    this.updateDisplayState();

    if (mode === 'quick-bill' && !this.cartItems.length) {
      this.selectedCustomer = 'Walk-in Customer';
    }

    if (mode === 'quick-bill' && !this.quickMenuItems.length) {
      void this.loadQuickMenuItems(true);
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
    await this.toggleOrderInBill(order);
  }

  async toggleOrderInBill(order: BillOrder, event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();
    const joinGroup = this.getActiveJoinGroupForOrder(order);

    if (joinGroup) {
      await this.toggleJoinGroupInBill(joinGroup);
      return;
    }

    if (this.isOrderSelected(order)) {
      const nextOrders = this.selectedOrders.filter((selectedOrder) => selectedOrder.id !== order.id);
      this.bindSelectedOrders(nextOrders, nextOrders.length > 1 ? 'manual' : 'single');
      return;
    }

    try {
      const detailOrder = await this.loadFreshBillOrder(order);
      this.bindSelectedOrders([...this.selectedOrders, detailOrder], this.selectedOrders.length ? 'manual' : 'single');
    } catch {
      this.toast.error('Load Failed', 'Unable to add this order to the bill.');
    }
  }

  private async toggleJoinGroupInBill(joinGroup: ActiveJoinGroup): Promise<void> {
    const groupOrderRows = this.openOrders.filter((candidate) => joinGroup.tableIds.includes(candidate.tableId));
    const groupOrderIds = groupOrderRows.map((candidate) => candidate.id);
    const isEntireGroupSelected = groupOrderIds.length > 0
      && groupOrderIds.every((orderId) => this.selectedOrders.some((selectedOrder) => selectedOrder.id === orderId));

    if (isEntireGroupSelected) {
      const nextOrders = this.selectedOrders.filter((selectedOrder) => !groupOrderIds.includes(selectedOrder.id));
      this.bindSelectedOrders(nextOrders, nextOrders.length > 1 ? 'manual' : 'single');
      return;
    }

    try {
      const detailOrders = await Promise.all(groupOrderRows.map((candidate) => this.loadFreshBillOrder(candidate)));
      const existingOutsideGroup = this.selectedOrders.filter((selectedOrder) => !groupOrderIds.includes(selectedOrder.id));
      const nextOrders = [...existingOutsideGroup, ...detailOrders];
      const mode: BillingGroupMode = existingOutsideGroup.length ? 'manual' : 'joined';

      this.bindSelectedOrders(nextOrders, mode, mode === 'joined' ? joinGroup : null);

      if (mode === 'joined') {
        this.toast.info('Joined Bill', `${this.currentOrderNumber} loaded for single payment.`);
      }
    } catch {
      this.toast.error('Load Failed', 'Unable to load joined table orders.');
    }
  }

  addQuickItem(item: QuickMenuItem): void {
    if (!this.selectedOrders.length) {
      this.billingMode = 'quick-bill';
      this.notes = this.notes || this.getDefaultBillingNoteForMode('Take Away');
    }

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

  increaseQuantity(targetItem: BillingCartItem): void {
    if (this.isCartItemReadonly(targetItem)) {
      return;
    }

    this.cartItems = this.cartItems.map((item) =>
      this.isSameCartItem(item, targetItem) ? { ...item, qty: item.qty + 1 } : item
    );
    this.updateCartMatches();
    this.updateBillingSummary();
  }

  decreaseQuantity(targetItem: BillingCartItem): void {
    if (this.isCartItemReadonly(targetItem)) {
      return;
    }

    this.cartItems = this.cartItems
      .map((item) => this.isSameCartItem(item, targetItem) ? { ...item, qty: item.qty - 1 } : item)
      .filter((item) => item.qty > 0);
    this.updateCartMatches();
    this.updateBillingSummary();
  }

  removeCartItem(targetItem: BillingCartItem): void {
    if (this.isCartItemReadonly(targetItem)) {
      return;
    }

    this.cartItems = this.cartItems.filter((item) => !this.isSameCartItem(item, targetItem));
    this.updateCartMatches();
    this.updateBillingSummary();
  }

  setDiscountType(type: 'Amount' | 'Percent'): void {
    this.discountType = type;
    this.updateBillingSummary();
  }

  addPaymentSplit(mode = ''): void {
    const defaultMode = mode || String(this.paymentModes[0]?.value || this.selectedPaymentMode || 'Cash');

    this.paymentSplits = [
      ...this.paymentSplits,
      this.createPaymentSplit(defaultMode)
    ];
    this.updatePaymentState();
    this.updateBillingSummary();
  }

  removePaymentSplit(splitId: number): void {
    if (this.paymentSplits.length <= 1) {
      return;
    }

    this.paymentSplits = this.paymentSplits.filter((split) => split.id !== splitId);
    this.selectedPaymentMode = this.paymentSplits[0]?.paymentMode || 'Cash';
    this.updatePaymentState();
    this.updateBillingSummary();
  }

  updatePaymentSplit(splitId: number, field: keyof Omit<PaymentSplit, 'id'>, value: string): void {
    this.paymentSplits = this.paymentSplits.map((split) => {
      if (split.id !== splitId) {
        return split;
      }

      const nextSplit = { ...split, [field]: value };

      if (field === 'paymentMode') {
        const mode = String(value || '');
        nextSplit.referenceNo = this.isDigitalPaymentMode(mode) ? nextSplit.referenceNo : '';
        nextSplit.approvalCode = this.isCardPaymentMode(mode) ? nextSplit.approvalCode : '';
        nextSplit.cardLastFour = this.isCardPaymentMode(mode) ? nextSplit.cardLastFour.replace(/\D/g, '').slice(0, 4) : '';
      }

      if (field === 'amountInput') {
        nextSplit.amountInput = this.normalizeAmountInput(value);
      }

      if (field === 'cardLastFour') {
        nextSplit.cardLastFour = value.replace(/\D/g, '').slice(0, 4);
      }

      return nextSplit;
    });

    this.selectedPaymentMode = this.paymentSplits[0]?.paymentMode || 'Cash';
    this.updatePaymentState();
    this.updateBillingSummary();
  }

  onDiscountChange(value: string): void {
    this.discountInput = value;
    this.updateBillingSummary();
  }

  async loadTaxPercentage(): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.taxService.getAll(this.OrgId));
      const taxes = this.getResponseList(response);
      const activeTax = taxes.find((tax: any) =>
        this.getOptionalBooleanValue(tax, 'IsDeleted', 'isDeleted') !== true
        && this.getOptionalBooleanValue(tax, 'IsActive', 'isActive', 'isactive') !== false
      );
      const percentage = this.getNumberValue(activeTax, 'Percentage', 'percentage');
      const name = this.getStringValue(activeTax, 'Name', 'name');

      if (percentage > 0) {
        this.gstPercent = percentage;
      }

      this.taxName = name || 'GST';
      this.quickMenuItems = this.quickMenuItems.map((item) => ({ ...item, taxPercent: this.gstPercent }));
      this.cartItems = this.cartItems.map((item) => ({ ...item, taxPercent: item.taxPercent || this.gstPercent }));
      this.updateQuickItemMatches();
      this.updateCartMatches();
      this.updateBillingSummary();
    } catch {
      this.taxName = 'GST';
      this.toast.warn('Tax Not Loaded', 'Using default tax percentage for this bill.');
    }
  }

  async loadPaymentModes(): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.paymodeService.getAll(this.getCodeTemplateOrgId()));
      const paymodes: FieldOption[] = this.getResponseList(response)
        .filter((paymode: any) =>
          this.getOptionalBooleanValue(paymode, 'IsDeleted', 'isDeleted') !== true
          && this.getOptionalBooleanValue(paymode, 'IsActive', 'isActive', 'isactive') !== false
        )
        .reduce((options: FieldOption[], paymode: any) => {
          const type = this.getStringValue(paymode, 'Type', 'type', 'Name', 'name');
          return type ? [...options, { label: type, value: type }] : options;
        }, []);

      this.paymentModes = paymodes.length
        ? this.getDistinctPaymentModes(paymodes)
        : this.getFallbackPaymentModes();
      this.syncSelectedPaymentMode();
    } catch {
      this.paymentModes = this.getFallbackPaymentModes();
      this.syncSelectedPaymentMode();
      this.toast.warn('Paymodes Not Loaded', 'Using default cash payment mode for this bill.');
    }
  }

  onServiceChargeChange(value: string): void {
    this.serviceChargeInput = this.normalizeAmountInput(value);
    this.isServiceChargeManual = true;
    this.updateBillingSummary();
  }

  onTipChange(value: string): void {
    this.tipInput = value;
    this.updateBillingSummary();
  }

  onRoundOffChange(value: string): void {
    this.roundOffInput = this.normalizeSignedAmountInput(value);
    this.isRoundOffManual = true;
    this.updateBillingSummary();
  }

  clearBill(): void {
    this.currentOrder = null;
    this.selectedOrders = [];
    this.selectedJoinGroup = null;
    this.billingGroupMode = 'single';
    this.orderSearch = '';
    this.itemSearch = '';
    this.barcodeSearch = '';
    this.cartSearch = '';
    this.selectedCustomer = 'Walk-in Customer';
    this.selectedPaymentMode = 'Cash';
    this.discountType = 'Amount';
    this.discountInput = '0';
    this.serviceChargeInput = '0';
    this.tipInput = '0';
    this.roundOffInput = '0';
    this.isServiceChargeManual = false;
    this.isRoundOffManual = false;
    this.paymentSplits = [this.createPaymentSplit('Cash')];
    this.notes = this.getDefaultBillingNoteForMode(this.billingMode === 'quick-bill' ? 'Take Away' : this.serviceFilter);
    this.cartItems = [];
    this.updateOrderMatches();
    this.updateQuickItemMatches();
    this.updateCartMatches();
    this.updateDisplayState();
    this.updatePaymentState();
    this.updateBillingSummary();
  }

  printBill(): void {
    if (!this.cartItems.length) {
      this.toast.warn('No Items', 'Add at least one item before printing the bill.');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=420,height=800');

    if (!printWindow) {
      this.toast.error('Print Failed', 'Unable to open the print window.');
      return;
    }

    printWindow.document.write(this.buildThermalBillHtml());
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }

  private buildThermalBillHtml(): string {
    const now = new Date();
    const organizationName = this.getStringValue(this.userDetails, 'OrgName', 'orgName', 'OrganizationName', 'organizationName', 'CompanyName', 'companyName')
      || this.BranchName
      || 'Restaurant';
    const phone = this.getStringValue(this.userDetails, 'Phone', 'phone', 'Mobile', 'mobile', 'ContactNumber', 'contactNumber');
    const gstNo = this.getStringValue(this.userDetails, 'GSTNo', 'gstNo', 'GstNo', 'gstno', 'GSTNumber', 'gstNumber');
    const fssaiNo = this.getStringValue(this.userDetails, 'FSSAINo', 'fssaiNo', 'FssaiNo', 'FSSAI', 'fssai');
    const cashierName = this.getStringValue(this.userDetails, 'UserName', 'userName', 'Username', 'username', 'Name', 'name')
      || 'Cashier';
    const tokenNo = this.getReceiptTokenNo();
    const customerName = this.currentCustomerLabel === 'Walk-in Customer' ? '' : this.currentCustomerLabel;
    const paymentLabel = this.paymentSplits.length > 1
      ? 'Paid via Multi Payment'
      : `Paid via ${this.paymentSplits[0]?.paymentMode || this.selectedPaymentMode || 'Cash'}`;
    const cgstAmount = this.taxAmount / 2;
    const sgstAmount = this.taxAmount / 2;
    const cgstPercent = this.gstPercent / 2;
    const sgstPercent = this.gstPercent / 2;
    const itemRows = this.cartItems.map((item) => `
      <tr>
        <td class="item-name">${this.escapeHtml(item.name)}</td>
        <td class="num">${item.qty}</td>
        <td class="num">${this.formatReceiptAmount(item.rate)}</td>
        <td class="num">${this.formatReceiptAmount(item.qty * item.rate)}</td>
      </tr>
    `).join('');

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bill ${this.escapeHtml(this.currentOrderNumber)}</title>
  <style>
    @page { size: 80mm auto; margin: 3mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #111;
      background: #fff;
      font-family: "Courier New", monospace;
      font-size: 12px;
      line-height: 1.22;
    }
    .receipt {
      width: 72mm;
      margin: 0 auto;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .brand {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.04em;
      margin-bottom: 2px;
    }
    .divider {
      border: 0;
      border-top: 1px dashed #111;
      margin: 7px 0;
    }
    .line {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      white-space: nowrap;
    }
    .line span:last-child {
      text-align: right;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      padding: 2px 0 4px;
      border-bottom: 1px dashed #111;
      font-weight: 700;
      text-align: left;
    }
    td {
      padding: 4px 0;
      vertical-align: top;
    }
    .item-name {
      width: 45%;
      word-break: break-word;
      padding-right: 4px;
    }
    .num {
      text-align: right;
      white-space: nowrap;
    }
    .totals {
      margin-top: 3px;
    }
    .grand {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed #111;
      font-size: 16px;
      font-weight: 700;
    }
    .small {
      font-size: 11px;
    }
    .footer {
      margin-top: 8px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="center">
      <div class="brand">${this.escapeHtml(organizationName)}</div>
      <div>${this.escapeHtml(this.BranchName || this.currentBranchLabel)}</div>
      ${phone ? `<div>Phone: ${this.escapeHtml(phone)}</div>` : ''}
      ${gstNo ? `<div>GST No: ${this.escapeHtml(gstNo)}</div>` : ''}
    </div>

    <hr class="divider">

    <div class="line"><span>Name:</span><span>${this.escapeHtml(customerName)}</span></div>
    <div class="line"><span>Date: ${this.formatReceiptDate(now)}</span><span class="bold">${this.escapeHtml(this.activeServiceModeLabel)}</span></div>
    <div class="line"><span>${this.formatReceiptTime(now)}</span><span>Bill No.: ${this.escapeHtml(this.currentOrderNumber)}</span></div>
    <div class="line"><span>Cashier: ${this.escapeHtml(cashierName)}</span><span>Table: ${this.escapeHtml(this.currentTableLabel)}</span></div>
    <div class="line"><span>Counter: ${this.escapeHtml(this.currentCounterLabel)}</span><span>Terminal: ${this.escapeHtml(this.currentTerminalLabel)}</span></div>
    <div class="bold">Token No.: ${this.escapeHtml(tokenNo)}</div>

    <hr class="divider">

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th class="num">Qty.</th>
          <th class="num">Price</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <hr class="divider">

    <div class="totals">
      <div class="line"><span>Total Qty: ${this.totalItems}</span><span>Sub Total ${this.formatReceiptAmount(this.subtotal)}</span></div>
      ${this.discountAmount ? `<div class="line"><span>Discount</span><span>-${this.formatReceiptAmount(this.discountAmount)}</span></div>` : ''}
      ${this.serviceChargeAmount ? `<div class="line"><span>Service Charge</span><span>${this.formatReceiptAmount(this.serviceChargeAmount)}</span></div>` : ''}
      <div class="line"><span>CGST ${this.formatReceiptPercent(cgstPercent)}%</span><span>${this.formatReceiptAmount(cgstAmount)}</span></div>
      <div class="line"><span>SGST ${this.formatReceiptPercent(sgstPercent)}%</span><span>${this.formatReceiptAmount(sgstAmount)}</span></div>
      ${this.tipAmount ? `<div class="line"><span>Tip</span><span>${this.formatReceiptAmount(this.tipAmount)}</span></div>` : ''}
      ${this.roundOffAmount ? `<div class="line"><span>Round Off</span><span>${this.formatReceiptAmount(this.roundOffAmount)}</span></div>` : ''}
      <div class="line grand"><span>Grand Total</span><span>${this.formatReceiptCurrency(this.grandTotal)}</span></div>
    </div>

    <div class="small">${this.escapeHtml(paymentLabel)}</div>

    <hr class="divider">

    <div class="footer">
      ${fssaiNo ? `<div>FSSAI Lic No ${this.escapeHtml(fssaiNo)}</div>` : ''}
      <div>No MSG, No Food Color</div>
      <div>Daily Fresh Oil</div>
      <div>Thank You For Dining With Us.</div>
    </div>

    <hr class="divider">

    <div class="center small">Please consume the food within 2 hours of purchase.</div>
  </div>
</body>
</html>`;
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

    if (this.selectedOrders.length) {
      try {
        const selectedOrders = [...this.selectedOrders];
        const hasBillingAddOns = this.cartItems.some((item) => item.sourceType === 'quick');

        if (hasBillingAddOns) {
          const primaryOrderItems = this.cartItems.filter((item) =>
            item.sourceType === 'order' && item.sourceOrderId === selectedOrders[0].id
            || item.sourceType === 'quick'
          );
          const payload = await this.buildCompletedOrderPayload(selectedOrders[0], primaryOrderItems);
          await firstValueFrom(this.displayMenuItemsService.update(payload));
        }

        const billingPayload = await this.buildBillingCreatePayload(selectedOrders[0]);
        await firstValueFrom(this.billingService.create(billingPayload));

        await this.releaseSelectedJoinGroup();

        this.toast.success('Completed', `${selectedOrders.map((order) => order.orderNo).join(', ')} billed and closed.`);
        this.printBill();
        this.clearBill();
        await this.loadBillingOrders();
      } catch (error: any) {
        const message = error?.error?.message
          || error?.error?.Message
          || error?.message
          || `Unable to complete ${this.currentOrderNumber}.`;

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
      const generatedOrderId = this.getApiOrderId(response);

      const billingPayload = await this.buildBillingCreatePayload(null, generatedOrderId);
      await firstValueFrom(this.billingService.create(billingPayload));

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
    const selectedOrderSubtotal = this.selectedOrders.reduce((sum, order) => sum + (order.subtotalAmount || 0), 0);
    const addOnSubtotal = this.selectedOrders.length
      ? this.cartItems
          .filter((item) => item.sourceType === 'quick')
          .reduce((sum, item) => sum + (item.qty * item.rate), 0)
      : 0;
    this.subtotal = this.selectedOrders.length
      ? selectedOrderSubtotal + addOnSubtotal
      : cartSubtotal;

    const discountValue = Number(this.discountInput || 0);
    const tipValue = Number(this.tipInput || 0);
    const serviceChargeValue = Number(this.serviceChargeInput || 0);
    const roundOffValue = Number(this.roundOffInput || 0);

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      this.discountAmount = 0;
    } else if (this.discountType === 'Percent') {
      this.discountAmount = (this.subtotal * Math.min(discountValue, 100)) / 100;
    } else {
      this.discountAmount = Math.min(discountValue, this.subtotal);
    }

    const discountedSubtotal = Math.max(this.subtotal - this.discountAmount, 0);
    const calculatedServiceCharge = this.isDineInBill
      ? (discountedSubtotal * this.serviceChargePercent) / 100
      : 0;

    if (this.isServiceChargeManual) {
      this.serviceChargeAmount = Number.isFinite(serviceChargeValue) && serviceChargeValue > 0 ? serviceChargeValue : 0;
    } else {
      this.serviceChargeAmount = this.roundAmount(calculatedServiceCharge);
      this.serviceChargeInput = this.formatAmountInput(this.serviceChargeAmount);
    }

    const taxableAmount = discountedSubtotal + this.serviceChargeAmount;
    this.taxAmount = this.cartItems.reduce((sum, item) => {
      const itemBase = item.qty * item.rate;
      const share = this.subtotal > 0 ? itemBase / this.subtotal : 0;
      const itemDiscount = this.discountAmount * share;
      const itemTaxable = Math.max(itemBase - itemDiscount, 0);
      const serviceChargeShare = discountedSubtotal > 0 ? itemTaxable / discountedSubtotal : 0;
      const itemServiceCharge = this.serviceChargeAmount * serviceChargeShare;
      return sum + (((itemTaxable + itemServiceCharge) * this.gstPercent) / 100);
    }, 0);

    this.tipAmount = Number.isFinite(tipValue) && tipValue > 0 ? tipValue : 0;
    const totalBeforeRoundOff = taxableAmount + this.taxAmount + this.tipAmount;
    const calculatedRoundOff = this.roundAmount(Math.round(totalBeforeRoundOff) - totalBeforeRoundOff);

    if (this.isRoundOffManual) {
      this.roundOffAmount = Number.isFinite(roundOffValue) ? roundOffValue : 0;
    } else {
      this.roundOffAmount = calculatedRoundOff;
      this.roundOffInput = this.formatAmountInput(this.roundOffAmount);
    }

    this.grandTotal = Math.max(totalBeforeRoundOff + this.roundOffAmount, 0);

    this.updatePaymentBalance();

    this.updateDisplayState();
    this.updatePaymentState();
  }

  private updatePaymentBalance(): void {
    this.receivedAmount = this.getReceivedAmount();
    this.changeAmount = Math.max(this.receivedAmount - this.grandTotal, 0);
    this.balanceAmount = this.receivedAmount - this.grandTotal;
  }

  private updateDisplayState(): void {
    const selectedServiceModes = Array.from(new Set(this.selectedOrders.map((order) => order.serviceMode)));
    const selectedBranches = Array.from(new Set(this.selectedOrders.map((order) => order.branch).filter(Boolean)));

    this.activeServiceModeLabel = selectedServiceModes.length > 1
      ? 'Mixed'
      : this.currentOrder?.serviceMode || (this.billingMode === 'quick-bill' ? 'Take Away' : this.serviceFilter);
    this.currentCustomerLabel = this.selectedOrders.length
      ? this.getSelectedOrdersCustomerLabel(this.selectedOrders)
      : this.selectedCustomer || 'Walk-in Customer';
    this.currentOrderNumber = this.selectedOrders.length
      ? this.selectedOrders.map((order) => order.orderNo).join(' + ')
      : 'Direct Billing';
    this.currentBranchLabel = selectedBranches.length > 1
      ? 'Multiple Branches'
      : this.currentOrder?.branch || this.BranchName || '---';
    this.currentCounterLabel = this.CounterName || '---';
    this.currentTerminalLabel = this.TerminalName || '---';
    this.currentCashierLabel = this.CashierName || '---';
    this.isDineInBill = this.activeServiceModeLabel === 'Dine In';
  }

  private async releaseSelectedJoinGroup(): Promise<void> {
    if (this.billingGroupMode !== 'joined' || !this.selectedJoinGroup?.id) {
      return;
    }

    try {
      await firstValueFrom(this.joinTableService.activeInActive(this.selectedJoinGroup.id, false));
    } catch {
      this.toast.info('Join Still Active', `${this.selectedJoinGroup.joinNo || 'Joined table'} could not be released automatically.`);
    }
  }

  private updatePaymentState(): void {
    this.settlementSummaryLabel = this.paymentSplits.length > 1 ? 'Split Paid' : 'Received';
  }

  get isSelectedOrderReadonly(): boolean {
    return Boolean(this.selectedOrders.length);
  }

  get billModeLabel(): string {
    if (this.billingGroupMode === 'joined') {
      return 'Joined Table Bill';
    }

    if (this.billingGroupMode === 'manual') {
      return 'Multi Table Bill';
    }

    return this.currentOrder ? 'Order Billing' : 'Quick Bill';
  }

  get currentTableLabel(): string {
    return this.selectedOrders.length
      ? this.selectedOrders.map((order) => order.table).filter(Boolean).join(', ')
      : '-';
  }

  get currentStatusLabel(): string {
    if (this.selectedOrders.length > 1) {
      return 'Ready To Bill';
    }

    return this.currentOrder?.status || 'Draft Bill';
  }

  isCartItemReadonly(item: BillingCartItem): boolean {
    return this.isSelectedOrderReadonly && item.sourceType === 'order';
  }

  private isSameCartItem(item: BillingCartItem, targetItem: BillingCartItem): boolean {
    return item.id === targetItem.id
      && item.sourceType === targetItem.sourceType
      && (item.sourceOrderId || 0) === (targetItem.sourceOrderId || 0)
      && (item.comboMenuId || 0) === (targetItem.comboMenuId || 0);
  }

  isOrderSelected(order: BillOrder): boolean {
    return this.selectedOrders.some((selectedOrder) => selectedOrder.id === order.id);
  }

  isOrderInActiveJoin(order: BillOrder): boolean {
    return Boolean(this.getActiveJoinGroupForOrder(order));
  }

  private bindSelectedOrders(orders: BillOrder[], mode: BillingGroupMode, joinGroup: ActiveJoinGroup | null = null): void {
    const distinctOrders = orders.filter((order, index, list) =>
      order.id > 0 && list.findIndex((candidate) => candidate.id === order.id) === index
    );

    this.currentOrder = distinctOrders[0] ?? null;
    this.selectedOrders = distinctOrders;
    this.selectedJoinGroup = joinGroup;
    this.billingGroupMode = distinctOrders.length > 1 ? mode : 'single';
    this.selectedCustomer = this.getSelectedOrdersCustomerLabel(distinctOrders);
    this.notes = distinctOrders.map((order) => order.notes).filter(Boolean).join(' | ')
      || this.getDefaultBillingNoteForMode(this.getSelectedOrdersServiceMode(distinctOrders));
    this.discountType = 'Amount';
    this.discountInput = String(distinctOrders.reduce((sum, order) => sum + (order.discountAmount || 0), 0));
    this.serviceChargeInput = String(distinctOrders.reduce((sum, order) => sum + (order.serviceChargeAmount || 0), 0));
    this.tipInput = String(distinctOrders.reduce((sum, order) => sum + (order.tipAmount || 0), 0));
    this.roundOffInput = String(distinctOrders.reduce((sum, order) => sum + (order.roundOffAmount || 0), 0));
    this.isServiceChargeManual = distinctOrders.length > 0;
    this.isRoundOffManual = distinctOrders.some((order) => Boolean(order.roundOffAmount));
    this.cartItems = distinctOrders.flatMap((order) => order.items.map((item) => ({
      ...item,
      sourceType: 'order' as const,
      sourceOrderId: order.id,
      sourceOrderNo: order.orderNo,
      sourceTable: order.table
    })));
    this.updateCartMatches();
    this.updateDisplayState();
    this.updateBillingSummary();
  }

  private async loadFreshBillOrder(order: BillOrder): Promise<BillOrder> {
    const orderId = Number((order as any).id || 0);

    if (!orderId) {
      throw new Error('Invalid order.');
    }

    const cachedOrder = this.openOrders.find((candidate) => candidate.id === orderId) ?? order;

    if (cachedOrder.items.length) {
      return cachedOrder;
    }

    const response: any = await firstValueFrom(this.displayMenuItemsService.getById(orderId));
    return this.mapApiOrder(this.mergeOrderWithDetails(order.rawOrder ?? order, response));
  }

  private getActiveJoinGroupForOrder(order: BillOrder): ActiveJoinGroup | null {
    if (!order.tableId) {
      return null;
    }

    return this.activeJoinGroups.find((group) => group.tableIds.includes(order.tableId)) ?? null;
  }

  private getSelectedOrdersCustomerLabel(orders: BillOrder[]): string {
    if (!orders.length) {
      return 'Walk-in Customer';
    }

    const customers = Array.from(new Set(orders.map((order) => order.customer).filter(Boolean)));
    return customers.length === 1 ? customers[0] : 'Multiple Customers';
  }

  private getSelectedOrdersServiceMode(orders: BillOrder[]): ServiceMode | 'All' | 'Mixed' {
    const serviceModes = Array.from(new Set(orders.map((order) => order.serviceMode)));

    if (!serviceModes.length) {
      return 'All';
    }

    return serviceModes.length === 1 ? serviceModes[0] : 'Mixed';
  }

  private getDefaultBillingNoteForMode(mode: ServiceMode | 'All' | 'Mixed'): string {
    return mode === 'Take Away' || mode === 'Delivery' ? DEFAULT_BILLING_NOTE : '';
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

    if (!this.getValidPaymentSplits().length) {
      this.toast.warn('Payment Required', 'Add at least one payment amount before completing the bill.');
      return false;
    }

    const receivedAmount = this.getReceivedAmount();

    if (receivedAmount < this.grandTotal) {
      this.toast.warn('Payment Pending', 'Split payment total must be equal to or greater than the bill total.');
      return false;
    }

    for (const split of this.getValidPaymentSplits()) {
      if (this.isDigitalPaymentMode(split.paymentMode) && !split.referenceNo.trim()) {
        this.toast.warn('Reference Required', `Enter ${split.paymentMode} reference before completing the bill.`);
        return false;
      }

      if (this.isCardPaymentMode(split.paymentMode) && !split.approvalCode.trim()) {
        this.toast.warn('Approval Required', `Enter ${split.paymentMode} approval code before completing the bill.`);
        return false;
      }
    }


    return true;
  }

  private async buildCompletedOrderPayload(order: BillOrder, scopedItems: BillingCartItem[] = this.cartItems): Promise<any> {
    const rawOrder = order.rawOrder ?? {};
    const userId = this.getNumberValue(this.userDetails, 'UserId', 'userId', 'Id', 'id');
    const now = new Date().toISOString();
    const orderId = this.getNumberValue(rawOrder, 'OrderId', 'Orderid', 'orderId', 'orderid', 'Id', 'id') || order.id;
    const tableId = this.getNumberValue(rawOrder, 'TableId', 'Tableid', 'tableId', 'tableid');
    const floorId = this.getNumberValue(rawOrder, 'FloorId', 'Floorid', 'floorId', 'floorid');
    let items = scopedItems.map((item) => this.buildCompletedOrderItem(item, orderId, userId, now));
    const paymentNote = this.getPaymentNote();
    const notes = [this.notes.trim(), paymentNote].filter(Boolean).join(' | ');
    const scopedSubtotal = scopedItems.reduce((sum, item) => sum + (item.qty * item.rate), 0) || order.subtotalAmount;
    const scopedDiscount = Math.min(order.discountAmount || 0, scopedSubtotal);
    const scopedServiceCharge = order.serviceMode === 'Dine In'
      ? Math.max(scopedSubtotal - scopedDiscount, 0) * this.serviceChargePercent / 100
      : 0;
    const scopedTax = scopedItems.reduce((sum, item) => {
      const itemBase = item.qty * item.rate;
      const share = scopedSubtotal > 0 ? itemBase / scopedSubtotal : 0;
      const itemDiscount = scopedDiscount * share;
      const itemTaxable = Math.max(itemBase - itemDiscount, 0);
      const itemServiceCharge = order.serviceMode === 'Dine In' ? itemTaxable * this.serviceChargePercent / 100 : 0;
      return sum + (((itemTaxable + itemServiceCharge) * this.gstPercent) / 100);
    }, 0) || order.taxAmount;
    const scopedTip = order.tipAmount || 0;
    const scopedRoundOff = order.roundOffAmount || 0;
    const scopedTotal = Math.max(scopedSubtotal - scopedDiscount + scopedServiceCharge + scopedTax + scopedTip + scopedRoundOff, 0);
    this.currentOrderEntityNo = await this.resolveOrderEntityNo(
      ORDER_SCREEN_TEMPLATE_NAME,
      Number(this.userDetails.OrgId || this.OrgId || this.getPayloadOrgId(rawOrder) || 0)
    );
    const orderEntityNo = Number(this.currentOrderEntityNo || 0);
    items = items.map((item) => ({
      ...item,
      EntityNo: orderEntityNo,
      entityNo: orderEntityNo
    }));

    return {
      ...rawOrder,
      OrderId: orderId,
      Orderid: orderId,
      orderid: orderId,
      OrderNumber: this.getStringValue(rawOrder, 'OrderNumber', 'Ordernumber', 'orderNumber', 'ordernumber') || order.orderNo,
      Ordernumber: this.getStringValue(rawOrder, 'Ordernumber', 'OrderNumber', 'orderNumber', 'ordernumber') || order.orderNo,
      orderNumber: this.getStringValue(rawOrder, 'orderNumber', 'OrderNumber', 'Ordernumber', 'ordernumber') || order.orderNo,
      TableId: tableId,
      Tableid: tableId,
      tableId,
      tableid: tableId,
      FloorId: floorId,
      Floorid: floorId,
      floorId,
      floorid: floorId,
      OrderStatus: ORDER_STATUS.Completed,
      Orderstatus: ORDER_STATUS.Completed,
      orderStatus: ORDER_STATUS.Completed,
      ItemCount: scopedItems.reduce((sum, item) => sum + item.qty, 0),
      Itemcount: scopedItems.reduce((sum, item) => sum + item.qty, 0),
      itemCount: scopedItems.reduce((sum, item) => sum + item.qty, 0),
      SubtotalAmount: scopedSubtotal,
      subtotalAmount: scopedSubtotal,
      DiscountAmount: scopedDiscount,
      discountAmount: scopedDiscount,
      ServiceChargeAmount: scopedServiceCharge,
      serviceChargeAmount: scopedServiceCharge,
      TaxAmount: scopedTax,
      taxAmount: scopedTax,
      TipAmount: scopedTip,
      tipAmount: scopedTip,
      GratuityAmount: scopedTip,
      gratuityAmount: scopedTip,
      RoundOff: scopedRoundOff,
      roundOff: scopedRoundOff,
      TotalAmount: scopedTotal,
      totalAmount: scopedTotal,
      CustomerName: order.customer || this.selectedCustomer || 'Walk-in Customer',
      customerName: order.customer || this.selectedCustomer || 'Walk-in Customer',
      Notes: notes,
      notes,
      PaymentMode: this.selectedPaymentMode,
      paymentMode: this.selectedPaymentMode,
      PaymentReference: this.getPaymentReferenceValue(),
      paymentReference: this.getPaymentReferenceValue(),
      ReceivedAmount: scopedTotal,
      receivedAmount: scopedTotal,
      BalanceAmount: 0,
      balanceAmount: 0,
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
      EntityNo: orderEntityNo,
      entityNo: orderEntityNo,
      Items: items,
      items
    };
  }

  private async buildBillingCreatePayload(order: BillOrder | null = this.currentOrder, orderIdOverride = 0, billNoOverride = ''): Promise<any> {
    const userId = this.getNumberValue(this.userDetails, 'UserId', 'userId', 'Id', 'id');
    const now = new Date().toISOString();
    const rawOrder = order?.rawOrder ?? {};
    let orderId = orderIdOverride
      || this.getNumberValue(rawOrder, 'OrderId', 'Orderid', 'orderId', 'orderid')
      || order?.id
      || 0;
    const orgId = order ? this.getPayloadOrgId(rawOrder) : this.getCodeTemplateOrgId();
    const branchId = order ? this.getPayloadBranchId(rawOrder) : this.getCodeTemplateBranchId();
    this.currentBillingEntityNo = await this.resolveOrderEntityNo(
      BILLING_TEMPLATE_NAME,
      Number(this.userDetails.OrgId || this.OrgId || orgId || 0)
    );
    const billingEntityNo = Number(this.currentBillingEntityNo || 0);
    const billNo = billNoOverride;
    const paymentSplits = this.getValidPaymentSplits();
    const paymentMode = paymentSplits.length > 1 ? 'Multi Payment' : paymentSplits[0]?.paymentMode || 'Cash';
    const receivedAmount = this.getReceivedAmount();
    const changeAmount = Math.max(receivedAmount - this.grandTotal, 0);
    const balanceAmount = Math.max(this.grandTotal - receivedAmount, 0);
    const paymentStatus = this.getBillingPaymentStatus(receivedAmount);
    const taxableAmount = Math.max(this.subtotal - this.discountAmount + this.serviceChargeAmount, 0);
    const taxPercentage = taxableAmount > 0 ? (this.taxAmount / taxableAmount) * 100 : 0;
    const sgstPercentage = taxPercentage / 2;
    const sgstAmount = this.taxAmount / 2;
    const cgstPercentage = taxPercentage / 2;
    const cgstAmount = this.taxAmount / 2;
    const billingOrders = this.buildBillingOrderDetails(billingEntityNo);
    const orderIds = billingOrders.map((billingOrder) => Number(billingOrder.OrderId || 0)).filter((id) => id > 0);
    orderId = orderId || orderIds[0] || 0;
    const orderIdsCsv = orderIds.join(',');
    const orderNumbersCsv = billingOrders.map((billingOrder) => billingOrder.OrderNo).filter(Boolean).join(',');
    const tablesCsv = billingOrders.map((billingOrder) => billingOrder.Table).filter(Boolean).join(',');
    const multiOrderNote = billingOrders.length > 1
      ? `Orders: ${orderNumbersCsv}; Tables: ${tablesCsv}; OrderIds: ${orderIdsCsv}`
      : '';
    const remarks = [this.notes.trim(), multiOrderNote, this.getPaymentNote()].filter(Boolean).join(' | ');

    return {
      Id: 0,
      BillNo: billNo,
      OrderId: orderId,
      OrderIds: orderIds,
      OrderIdsCsv: orderIdsCsv,
      OrderNumbersCsv: orderNumbersCsv,
      TablesCsv: tablesCsv,
      BillingOrders: billingOrders,
      CustomerId: this.getSelectedCustomerId(rawOrder),
      BillDate: now,
      TokenNo: this.getNumberValue(rawOrder, 'TokenNo', 'tokenNo', 'TokenNumber', 'tokenNumber'),
      GrossAmount: this.roundAmount(this.subtotal),
      DiscountAmount: this.roundAmount(this.discountAmount),
      ServiceCharge: this.roundAmount(this.serviceChargeAmount),
      TaxAmount: this.roundAmount(this.taxAmount),
      TaxPercentage: this.roundAmount(taxPercentage),
      TipAmount: this.roundAmount(this.tipAmount),
      RoundOff: this.roundAmount(this.roundOffAmount),
      TotalAmount: this.roundAmount(this.grandTotal),
      ReceivedAmount: this.roundAmount(receivedAmount),
      BalanceAmount: this.roundAmount(balanceAmount),
      ChangeAmount: this.roundAmount(changeAmount),
      BillMode: this.billModeLabel,
      PaymentStatus: paymentStatus,
      PaymentType: paymentMode,
      Remarks: remarks,
      OrgId: orgId,
      BranchId: branchId,
      IsActive: true,
      IsDeleted: false,
      CreatedBy: userId || 0,
      CreatedDate: now,
      UpdatedBy: userId || 0,
      UpdatedDate: now,
      BillingDetails: paymentSplits.map((split) => this.buildBillingPaymentDetail(
        split,
        userId,
        now,
        taxableAmount,
        taxPercentage,
        sgstPercentage,
        sgstAmount,
        cgstPercentage,
        cgstAmount,
        remarks,
        paymentStatus,
        orgId,
        branchId,
        billingEntityNo
      )),
      EntityNo: billingEntityNo,
      entityNo: billingEntityNo
    };
  }

  private buildBillingOrderDetails(entityNo: number): any[] {
    const sourceOrders = this.selectedOrders.length
      ? this.selectedOrders
      : this.currentOrder
        ? [this.currentOrder]
        : [];

    return sourceOrders.map((order) => {
      const orderItems = this.cartItems.filter((item) =>
        item.sourceType === 'order' && item.sourceOrderId === order.id
      );
      const items = orderItems.length ? orderItems : order.items.map((item) => ({
        ...item,
        sourceOrderId: order.id,
        sourceOrderNo: order.orderNo,
        sourceTable: order.table,
        sourceType: 'order' as const
      }));
      const subtotal = items.reduce((sum, item) => sum + (item.qty * item.rate), 0) || order.subtotalAmount;
      const discount = Math.min(order.discountAmount || 0, subtotal);
      const serviceCharge = order.serviceMode === 'Dine In'
        ? Math.max(subtotal - discount, 0) * this.serviceChargePercent / 100 : 0;
      const tax = items.reduce((sum, item) => {
        const itemBase = item.qty * item.rate;
        const share = subtotal > 0 ? itemBase / subtotal : 0;
        const itemDiscount = discount * share;
        const itemTaxable = Math.max(itemBase - itemDiscount, 0);
        const itemServiceCharge = order.serviceMode === 'Dine In' ? itemTaxable * this.serviceChargePercent / 100 : 0;
        return sum + (((itemTaxable + itemServiceCharge) * this.gstPercent) / 100);
      }, 0) || order.taxAmount;
      const tip = order.tipAmount || 0;
      const roundOff = order.roundOffAmount || 0;
      const total = Math.max(subtotal - discount + serviceCharge + tax + tip + roundOff, 0);

      return {
        OrderId: order.id,
        OrderNo: order.orderNo,
        TableId: order.tableId,
        Table: order.table,
        Customer: order.customer,
        ServiceMode: order.serviceMode,
        Branch: order.branch,
        SubtotalAmount: this.roundAmount(subtotal),
        DiscountAmount: this.roundAmount(discount),
        ServiceChargeAmount: this.roundAmount(serviceCharge),
        TaxAmount: this.roundAmount(tax),
        TipAmount: this.roundAmount(tip),
        RoundOff: this.roundAmount(roundOff),
        TotalAmount: this.roundAmount(total),
        EntityNo: entityNo,
        entityNo: entityNo,
        Items: items.map((item) => ({
          ItemId: item.id,
          ItemName: item.name,
          Category: item.category,
          Quantity: item.qty,
          Rate: item.rate,
          TaxPercent: item.taxPercent,
          KotNo: item.kotNo || '',
          ItemType: item.itemType || 'Menu',
          ComboMenuId: item.comboMenuId || 0,
         
        }))
      };
    });
  }

  private getBillingPaymentStatus(receivedAmount: number): number {
    if (receivedAmount <= 0) {
      return PAYMENT_STATUS.Pending;
    }

    if (receivedAmount < this.grandTotal) {
      return PAYMENT_STATUS.PartialPaid;
    }

    if (receivedAmount > this.grandTotal) {
      return PAYMENT_STATUS.Overpaid;
    }

    return PAYMENT_STATUS.Paid;
  }

  private buildBillingPaymentDetail(
    split: PaymentSplit,
    userId: number,
    timestamp: string,
    taxableAmount: number,
    taxPercentage: number,
    sgstPercentage: number,
    sgstAmount: number,
    cgstPercentage: number,
    cgstAmount: number,
    remarks: string,
    paymentStatus: number,
    orgId: number,
    branchId: number,
    entityNo: number
  ): any {
    const amount = this.getPaymentSplitAmount(split);
    const referenceNo = this.getPaymentSplitReference(split);

    return {
      Id: 0,
      BillingId: 0,
      PaymentMode: split.paymentMode || 'Cash',
      GrossAmount: this.roundAmount(amount),
      ReferenceNo: referenceNo,
      TransactionId: this.isDigitalPaymentMode(split.paymentMode) ? referenceNo : '',
      CardNumber: this.isCardPaymentMode(split.paymentMode) ? split.cardLastFour.trim() : '',
      TaxableAmount: this.roundAmount(taxableAmount),
      TaxPercentage: this.roundAmount(taxPercentage),
      TaxAmount: this.roundAmount(this.taxAmount),
      SGSTPercentage: this.roundAmount(sgstPercentage),
      SGSTAmount: this.roundAmount(sgstAmount),
      CGSTPercentage: this.roundAmount(cgstPercentage),
      CGSTAmount: this.roundAmount(cgstAmount),
      IGSTPercentage: 0,
      IGSTAmount: 0,
      TotalAmount: this.roundAmount(amount),
      Remarks: remarks,
      PaymentStatus: paymentStatus,
      OrgId: orgId,
      BranchId: branchId,
      IsActive: true,
      IsDeleted: false,
      CreatedBy: userId || 0,
      CreatedDate: timestamp,
      UpdatedBy: userId || 0,
      UpdatedDate: timestamp,
      EntityNo: entityNo,
      entityNo: entityNo
    };
  }

  private buildCompletedOrderItem(item: BillingCartItem, orderId: number, userId: number, timestamp: string): any {
    const rawItem = item.rawItem ?? {};
    const quantity = Number(item.qty || 0);
    const unitPrice = Number(item.rate || 0);
    const sourceOrder = this.selectedOrders.find((order) => order.id === item.sourceOrderId) ?? this.currentOrder;
    const scopeSource = Object.keys(rawItem).length ? rawItem : sourceOrder?.rawOrder ?? {};
    const orgId = this.getPayloadOrgId(scopeSource);
    const branchId = this.getPayloadBranchId(scopeSource);
    const isCombo = item.itemType === 'Combo';
    const comboMenuItemId = isCombo
      ? item.comboMenuId || this.getNumberValue(rawItem, 'ComboMenuItemId', 'comboMenuItemId') || item.id || 0
      : 0;

    return {
      ...rawItem,
      Itemid: item.sourceType === 'quick' ? 0 : this.getNumberValue(rawItem, 'Itemid', 'itemid', 'ItemId', 'itemId', 'Id', 'id') || item.id,
      itemid: item.sourceType === 'quick' ? 0 : this.getNumberValue(rawItem, 'itemid', 'Itemid', 'ItemId', 'itemId', 'Id', 'id') || item.id,
      Orderid: this.getNumberValue(rawItem, 'Orderid', 'orderid', 'OrderId', 'orderId') || orderId,
      orderid: this.getNumberValue(rawItem, 'orderid', 'Orderid', 'OrderId', 'orderId') || orderId,
      Menuitemid: isCombo ? 0 : item.id,
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
      Itemstatus: ORDER_STATUS.Completed,
      itemstatus: ORDER_STATUS.Completed,
      OrgId: orgId,
      orgId,
      BranchId: branchId,
      branchId,
      CreatedBy: userId || this.getNumberValue(rawItem, 'CreatedBy', 'createdBy') || 0,
      createdBy: userId || this.getNumberValue(rawItem, 'CreatedBy', 'createdBy') || 0,
      CreatedDate: this.getStringValue(rawItem, 'CreatedDate', 'createdDate') || timestamp,
      createdDate: this.getStringValue(rawItem, 'CreatedDate', 'createdDate') || timestamp,
      UpdatedBy: userId || this.getNumberValue(rawItem, 'UpdatedBy', 'updatedBy') || 0,
      updatedBy: userId || this.getNumberValue(rawItem, 'UpdatedBy', 'updatedBy') || 0,
      UpdatedDate: timestamp,
      updatedDate: timestamp,
      IsDeleted: false,
      isDeleted: false
    };
  }

  private getPaymentNote(): string {
    return this.getValidPaymentSplits()
      .map((split) => {
        const amount = this.getPaymentSplitAmount(split).toFixed(2);
        const reference = this.getPaymentSplitReference(split);
        return [
          `${split.paymentMode || 'Cash'}: ${amount}`,
          reference ? `Ref: ${reference}` : ''
        ].filter(Boolean).join(' ');
      })
      .join(', ');
  }

  private getPaymentReferenceValue(): string {
    return this.getValidPaymentSplits()
      .map((split) => this.getPaymentSplitReference(split))
      .filter(Boolean)
      .join(', ');
  }

  private createPaymentSplit(mode: string): PaymentSplit {
    return {
      id: this.paymentSplitSequence++,
      paymentMode: mode,
      amountInput: '0',
      referenceNo: '',
      approvalCode: '',
      cardLastFour: ''
    };
  }

  private getDistinctPaymentModes(paymodes: FieldOption[]): FieldOption[] {
    const seen = new Set<string>();

    return paymodes.filter((paymode) => {
      const key = this.normalizePaymentMode(paymode.value);

      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  private getFallbackPaymentModes(): FieldOption[] {
    return [{ label: 'Cash', value: 'Cash' }];
  }

  private syncSelectedPaymentMode(): void {
    const defaultMode = String(this.paymentModes[0]?.value || 'Cash');
    const selectedMode = String(this.selectedPaymentMode || '');
    const selectedModeExists = this.paymentModes.some((mode) => String(mode.value) === selectedMode);

    this.selectedPaymentMode = selectedModeExists ? selectedMode : defaultMode;
    this.paymentSplits = this.paymentSplits.map((split, index) => {
      const splitModeExists = this.paymentModes.some((mode) => String(mode.value) === split.paymentMode);

      return {
        ...split,
        paymentMode: splitModeExists ? split.paymentMode : (index === 0 ? this.selectedPaymentMode || defaultMode : defaultMode)
      };
    });

    this.updatePaymentState();
  }

  private getValidPaymentSplits(): PaymentSplit[] {
    return this.paymentSplits.filter((split) => this.getPaymentSplitAmount(split) > 0);
  }

  private getPaymentSplitAmount(split: PaymentSplit): number {
    const amount = Number(split.amountInput || 0);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  }

  private getPaymentSplitReference(split: PaymentSplit): string {
    if (this.isCardPaymentMode(split.paymentMode)) {
      return [split.approvalCode.trim(), split.cardLastFour.trim() ? `****${split.cardLastFour.trim()}` : '']
        .filter(Boolean)
        .join(' / ');
    }

    return split.referenceNo.trim();
  }

  isCardPaymentMode(mode: string): boolean {
    return this.normalizePaymentMode(mode).includes('card');
  }

  isDigitalPaymentMode(mode: string): boolean {
    const normalizedMode = this.normalizePaymentMode(mode);
    return normalizedMode.includes('upi')
      || normalizedMode.includes('qr')
      || normalizedMode.includes('paynow')
      || normalizedMode.includes('online')
      || normalizedMode.includes('wallet')
      || normalizedMode.includes('bank');
  }

  private normalizePaymentMode(mode: unknown): string {
    return String(mode ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  }

  private normalizeAmountInput(value: string): string {
    const normalizedValue = String(value ?? '').replace(/[^\d.]/g, '');
    const [whole, ...decimalParts] = normalizedValue.split('.');
    const decimal = decimalParts.join('').slice(0, 2);
    return decimalParts.length ? `${whole}.${decimal}` : whole;
  }

  private normalizeSignedAmountInput(value: string): string {
    const rawValue = String(value ?? '');
    const sign = rawValue.trim().startsWith('-') ? '-' : '';
    const normalizedValue = rawValue.replace(/[^\d.]/g, '');
    const [whole, ...decimalParts] = normalizedValue.split('.');
    const decimal = decimalParts.join('').slice(0, 2);
    const amount = decimalParts.length ? `${whole}.${decimal}` : whole;
    return amount ? `${sign}${amount}` : sign;
  }

  private formatAmountInput(value: number): string {
    const roundedValue = this.roundAmount(value);
    return Object.is(roundedValue, -0) ? '0' : String(roundedValue);
  }

  private async buildQuickBillOrderPayload(): Promise<any> {
    this.quickBillEntityNo = await this.resolveOrderEntityNo(
      ORDER_SCREEN_TEMPLATE_NAME,
      Number(this.userDetails.OrgId || this.OrgId || this.getCodeTemplateOrgId() || 0)
    );

    const userId = this.getNumberValue(this.userDetails, 'UserId', 'userId', 'Id', 'id');
    const now = new Date().toISOString();
    const orderNumber = '';
    const entityNo = Number(this.quickBillEntityNo || 0);
    const items = this.cartItems.map((item) => ({
      ...this.buildQuickBillOrderItem(item, userId, now),
      EntityNo: entityNo,
      entityNo: entityNo
    }));
    return {
      OrderId: 0,
     
      orderid: 0,
      OrderNumber: orderNumber,
      Ordernumber: orderNumber,
      orderNumber,
      
      tableId: 0,
      
      floorId: 0,
      
      tableName: '',
      
      orderType: 'Take Aways',
      servingType: 'Self Service',
      
      orderStatus: ORDER_STATUS.Completed,
      
      
      itemCount: this.totalItems,
      
      subtotalAmount: this.subtotal,
      
      taxAmount: this.taxAmount,
      
      discountAmount: this.discountAmount,
      
      serviceChargeAmount: this.serviceChargeAmount,
      
      tipAmount: this.tipAmount,
      
      gratuityAmount: this.tipAmount,
      
      roundOff: this.roundOffAmount,
      
      totalAmount: this.grandTotal,
      
      customerName: this.selectedCustomer || 'Walk-in Customer',
      ContactNumber: '',
      contactNumber: '',
      Notes: [this.notes.trim(), this.getPaymentNote()].filter(Boolean).join(' | '),
      notes: [this.notes.trim(), this.getPaymentNote()].filter(Boolean).join(' | '),
      PaymentMode: this.selectedPaymentMode,
      paymentMode: this.selectedPaymentMode,
      PaymentReference: this.getPaymentReferenceValue(),
      paymentReference: this.getPaymentReferenceValue(),
      ReceivedAmount: this.getReceivedAmount(),
      receivedAmount: this.getReceivedAmount(),
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
      EntityNo: entityNo,
      entityNo: entityNo
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
    const tipAmount = this.getNumberValue(order, 'TipAmount', 'tipAmount', 'GratuityAmount', 'gratuityAmount', 'Tip', 'tip');
    const roundOffAmount = this.getNumberValue(order, 'RoundOff', 'roundOff', 'RoundOffAmount', 'roundOffAmount');
    const totalAmount = this.getNumberValue(order, 'TotalAmount', 'totalAmount', 'GrandTotal', 'grandTotal', 'Total', 'total')
      || Math.max(subtotalAmount - discountAmount + serviceChargeAmount + taxAmount + tipAmount + roundOffAmount, 0);

    return {
      id: this.getNumberValue(order, 'OrderId', 'Orderid', 'orderId', 'orderid', 'Id', 'id'),
      orderNo: this.getStringValue(order, 'OrderNumber', 'orderNumber', 'Ordernumber', 'ordernumber', 'OrderNo', 'orderNo') || '-',
      tableId,
      table: this.getStringValue(order, 'TableName', 'tableName', 'TableCode', 'tableCode', 'TableNo', 'tableNo', 'Table', 'table')
        || this.getTableFallback(tableId),
      tableFlow: this.mapTableFlow(order),
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
      tipAmount,
      roundOffAmount,
      totalAmount,
      rawOrder: order
    };
  }

  private mapTableFlow(order: any): BillTableFlow {
    const moveNo = this.getStringValue(order, 'MoveNo', 'moveno', 'MoveNumber', 'moveNumber');
    const joinNo = this.getStringValue(order, 'JoinNo', 'joinno', 'JoinNumber', 'joinNumber');
    const fromTable = this.getTableNameValue(order, 'FromTableName', 'fromTableName', 'FromTable', 'fromTable', 'SourceTableName', 'sourceTableName');
    const toTable = this.getTableNameValue(order, 'ToTableName', 'toTableName', 'ToTable', 'toTable', 'TargetTableName', 'targetTableName');
    const primaryTable = this.getTableNameValue(order, 'PrimaryTableName', 'primaryTableName', 'PrimaryTable', 'primaryTable');
    const joinedTables = this.getJoinedTablesLabel(order);
    const reason = this.getStringValue(order, 'MoveReason', 'movereason', 'Reason', 'reason');

    if (moveNo || fromTable || toTable || reason) {
      return {
        mode: 'Move Table',
        reference: moveNo || '-',
        fromTable: fromTable || '-',
        toTable: toTable || this.getStringValue(order, 'TableName', 'tableName') || '-',
        primaryTable: '-',
        joinedTables: '-',
        reason: reason || '-'
      };
    }

    if (joinNo || primaryTable || joinedTables) {
      return {
        mode: 'Join Table',
        reference: joinNo || '-',
        fromTable: '-',
        toTable: '-',
        primaryTable: primaryTable || this.getStringValue(order, 'TableName', 'tableName') || '-',
        joinedTables: joinedTables || '-',
        reason: this.getStringValue(order, 'Notes', 'notes') || '-'
      };
    }

    return {
      mode: 'No Table Flow',
      reference: '-',
      fromTable: '-',
      toTable: '-',
      primaryTable: '-',
      joinedTables: '-',
      reason: '-'
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

    try {
      const response: any = await firstValueFrom(this.displayMenuItemsService.getById(orderId));
      return this.mergeOrderWithDetails(order, response);
    } catch {
      return order;
    }
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

  private getApiOrderId(response: any): number {
    const result = response?.result ?? response?.Result ?? response;

    if (typeof result === 'string' || typeof result === 'number') {
      const id = Number(result);
      return Number.isFinite(id) ? id : 0;
    }

    return this.getNumberValue(
      result,
      'OrderId',
      'Orderid',
      'orderId',
      'orderid',
      'Id',
      'id'
    ) || this.getNumberValue(
      response,
      'OrderId',
      'Orderid',
      'orderId',
      'orderid',
      'Id',
      'id'
    );
  }

  private getSelectedCustomerId(source: any = {}): number {
    return this.getNumberValue(
      source,
      'CustomerId',
      'customerId',
      'Customerid',
      'customerid'
    );
  }

  private getReceivedAmount(): number {
    return this.paymentSplits.reduce((sum, split) => sum + this.getPaymentSplitAmount(split), 0);
  }

  private getReceiptTokenNo(): string {
    const source = this.currentOrder?.rawOrder ?? this.selectedOrders[0]?.rawOrder ?? {};
    const tokenNo = this.getStringValue(source, 'TokenNo', 'tokenNo', 'TokenNumber', 'tokenNumber');
    return tokenNo || '-';
  }

  private formatReceiptDate(value: Date): string {
    return value.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  }

  private formatReceiptTime(value: Date): string {
    return value.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  private formatReceiptAmount(value: number): string {
    return this.roundAmount(value).toFixed(2);
  }

  private formatReceiptCurrency(value: number): string {
    return `₹${this.formatReceiptAmount(value)}`;
  }

  private formatReceiptPercent(value: number): string {
    const roundedValue = this.roundAmount(value);
    return Number.isInteger(roundedValue) ? String(roundedValue) : roundedValue.toFixed(2);
  }

  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private roundAmount(value: number): number {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
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

  private getTableNameValue(source: any, ...keys: string[]): string {
    const value = this.getRawValue(source, ...keys);

    if (value === undefined || value === null || value === '') {
      return '';
    }

    if (typeof value === 'number' || /^\d+$/.test(String(value).trim())) {
      return this.getTableFallback(Number(value));
    }

    return String(value).trim();
  }

  private getJoinedTablesLabel(order: any): string {
    const rawTables = this.getRawValue(order, 'JoinedTables', 'joinedTables', 'TableIds', 'tableIds', 'MergedTables', 'mergedTables');

    if (!Array.isArray(rawTables)) {
      return this.getStringValue(order, 'JoinedTableNames', 'joinedTableNames', 'SecondaryTables', 'secondaryTables');
    }

    return rawTables
      .map((table: any) =>
        this.getStringValue(table, 'TableName', 'tableName', 'Name', 'name')
        || this.getTableNameValue(table, 'TableId', 'tableId', 'Id', 'id')
      )
      .filter(Boolean)
      .join(', ');
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

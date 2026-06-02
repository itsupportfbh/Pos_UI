import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AutocompleteFieldComponent } from '../../../components/form/autocomplete-field.component';
import { FieldOption, SelectFieldComponent } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { ShiftAssignmentComponent } from '../components/shift-assignment/shift-assignment.component';
import { ShiftAssignmentService } from '../../../services/shift-assignment.service';

type BillingMode = 'search-order' | 'quick-bill';
type ServiceMode = 'Dine In' | 'Take Away' | 'Delivery';

type BillOrder = {
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
};

type BillItem = {
  id: number;
  name: string;
  category: string;
  qty: number;
  rate: number;
  taxPercent: number;
  kotNo?: string;
};

type QuickMenuItem = {
  id: number;
  name: string;
  category: string;
  price: number;
  taxPercent: number;
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
  readonly gstPercent = 9;
  readonly serviceChargePercent = 10;

  showShiftAssignment = false;

  readonly pageTitle = 'Billing';
  readonly pageSubtitle = 'Search order, verify items, collect payment, and close the bill.';

  readonly customers: string[] = [
    'Walk-in Customer',
    'Arun Kumar',
    'Priya Family Table',
    'Online Delivery - Swiggy',
    'Take Away Counter'
  ];

  readonly paymentModes: FieldOption[] = [
    { label: 'Cash', value: 'Cash' },
    { label: 'UPI', value: 'UPI' },
    { label: 'Debit Card', value: 'Debit Card' },
    { label: 'Credit Card', value: 'Credit Card' },
    { label: 'QR Scan', value: 'QR Scan' },
    { label: 'PayNow', value: 'PayNow' }
  ];

  readonly quickMenuItems: QuickMenuItem[] = [
    { id: 1, name: 'Chicken Biriyani', category: 'Lunch / Chinese', price: 220, taxPercent: 5, badge: 'Chef Pick' },
    { id: 2, name: 'Paneer Butter Masala', category: 'Dinner / North Indian', price: 180, taxPercent: 5 },
    { id: 3, name: 'Masala Dosa', category: 'Breakfast / South Indian', price: 95, taxPercent: 5 },
    { id: 4, name: 'Fresh Lime Soda', category: 'Beverages', price: 65, taxPercent: 5 },
    { id: 5, name: 'Family Combo Meal', category: 'Combo', price: 520, taxPercent: 5, badge: 'Combo' },
    { id: 6, name: 'Veg Fried Rice', category: 'Lunch / Chinese', price: 140, taxPercent: 5 }
  ];

  readonly openOrders: BillOrder[] = [
    {
      orderNo: 'ORD-1042',
      table: 'T6',
      customer: 'Raghav Family',
      phone: '9876543210',
      serviceMode: 'Dine In',
      branch: 'Trichy',
      status: 'Ready To Bill',
      source: 'Order Screen',
      notes: 'One soup was served first. Customer asked for split bill summary.',
      items: [
        { id: 101, name: 'Chicken Biriyani', category: 'Main Course', qty: 2, rate: 220, taxPercent: 5, kotNo: 'KOT-202' },
        { id: 102, name: 'Butter Naan', category: 'Bread', qty: 4, rate: 35, taxPercent: 5, kotNo: 'KOT-202' },
        { id: 103, name: 'Fresh Lime Soda', category: 'Beverages', qty: 2, rate: 65, taxPercent: 5, kotNo: 'KOT-204' }
      ]
    },
    {
      orderNo: 'TA-2088',
      table: '-',
      customer: 'Take Away Counter',
      phone: '9000001111',
      serviceMode: 'Take Away',
      branch: 'Trichy',
      status: 'Ready To Bill',
      source: 'Take Away',
      notes: 'Customer waiting near parcel desk.',
      items: [
        { id: 104, name: 'Paneer Butter Masala', category: 'Main Course', qty: 1, rate: 180, taxPercent: 5, kotNo: 'KOT-211' },
        { id: 105, name: 'Veg Fried Rice', category: 'Rice', qty: 1, rate: 140, taxPercent: 5, kotNo: 'KOT-211' }
      ]
    },
    {
      orderNo: 'DL-3055',
      table: '-',
      customer: 'Delivery Boy / Rahul',
      phone: '9555512345',
      serviceMode: 'Delivery',
      branch: 'Chennai',
      status: 'Out For Delivery',
      source: 'Counter',
      notes: 'Delivery rider asked to verify parcel count before handover.',
      items: [
        { id: 106, name: 'Family Combo Meal', category: 'Combo', qty: 1, rate: 520, taxPercent: 5, kotNo: 'KOT-228' },
        { id: 107, name: 'Fresh Lime Soda', category: 'Beverages', qty: 2, rate: 65, taxPercent: 5, kotNo: 'KOT-229' }
      ]
    },
    {
      orderNo: 'ORD-1048',
      table: 'T2',
      customer: 'Meera Guests',
      phone: '9880011223',
      serviceMode: 'Dine In',
      branch: 'Trichy',
      status: 'Ready To Bill',
      source: 'Order Screen',
      notes: 'Guest asked to combine dessert into final bill.',
      items: [
        { id: 108, name: 'Paneer Butter Masala', category: 'Main Course', qty: 1, rate: 180, taxPercent: 5, kotNo: 'KOT-233' },
        { id: 109, name: 'Butter Naan', category: 'Bread', qty: 3, rate: 35, taxPercent: 5, kotNo: 'KOT-233' },
        { id: 110, name: 'Fresh Lime Soda', category: 'Beverages', qty: 1, rate: 65, taxPercent: 5, kotNo: 'KOT-234' }
      ]
    },
    {
      orderNo: 'TA-2094',
      table: '-',
      customer: 'Parcel Counter',
      phone: '9000002233',
      serviceMode: 'Take Away',
      branch: 'Chennai',
      status: 'Ready To Bill',
      source: 'Take Away',
      notes: 'Customer waiting for final packing check.',
      items: [
        { id: 111, name: 'Veg Fried Rice', category: 'Rice', qty: 2, rate: 140, taxPercent: 5, kotNo: 'KOT-236' },
        { id: 112, name: 'Masala Dosa', category: 'Breakfast', qty: 2, rate: 95, taxPercent: 5, kotNo: 'KOT-236' }
      ]
    },
    {
      orderNo: 'DL-3062',
      table: '-',
      customer: 'Rider / Suresh',
      phone: '9555509876',
      serviceMode: 'Delivery',
      branch: 'Trichy',
      status: 'Out For Delivery',
      source: 'Counter',
      notes: 'Rider asked to confirm beverage count before dispatch.',
      items: [
        { id: 113, name: 'Chicken Biriyani', category: 'Main Course', qty: 1, rate: 220, taxPercent: 5, kotNo: 'KOT-240' },
        { id: 114, name: 'Fresh Lime Soda', category: 'Beverages', qty: 3, rate: 65, taxPercent: 5, kotNo: 'KOT-240' }
      ]
    },
  ];

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
    if (!this.shiftService.isShiftAssigned()) {
      this.showShiftAssignment = true;
    }

    this.filteredQuickItems = [...this.quickMenuItems];
    this.filteredCartItems = [];
    this.updateOrderMatches();
    this.updateDisplayState();
    this.updatePaymentState();
    this.updateBillingSummary();
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
    this.updateQuickItemMatches();
  }

  onBarcodeSearchChange(value: string): void {
    this.barcodeSearch = value;
    this.updateQuickItemMatches();
  }

  onCartSearchChange(value: string): void {
    this.cartSearch = value;
    this.updateCartMatches();
  }

  selectOrder(order: BillOrder): void {
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

  addQuickItem(item: QuickMenuItem): void {
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
          sourceType: 'quick'
        }
      ];
    }

    this.updateCartMatches();
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

  generateBill(): void {
    console.log('Generate bill', {
      orderNo: this.currentOrder?.orderNo ?? 'DIRECT',
      customer: this.currentCustomerLabel,
      paymentMode: this.selectedPaymentMode,
      paymentReference: this.paymentReference,
      approvalCode: this.approvalCode,
      cardLastFour: this.cardLastFour,
      total: this.grandTotal
    });
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

    const receivedAmount = Number(this.receivedAmountInput || 0);
    this.balanceAmount = this.isCashPayment && Number.isFinite(receivedAmount)
      ? receivedAmount - this.grandTotal
      : 0;

    this.updateDisplayState();
    this.updatePaymentState();
  }

  private updateDisplayState(): void {
    this.activeServiceModeLabel = this.currentOrder?.serviceMode || this.serviceFilter;
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
}

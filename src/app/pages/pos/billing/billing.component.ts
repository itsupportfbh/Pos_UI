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
    { label: 'QR Scan', value: 'QR Scan' }
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
    }
  ];

  billingMode: BillingMode = 'search-order';
  serviceFilter: ServiceMode | 'All' = 'All';
  orderSearch = '';
  itemSearch = '';
  barcodeSearch = '';
  selectedCustomer: string | null = 'Walk-in Customer';
  selectedPaymentMode: string | null = 'Cash';
  discountType: 'Amount' | 'Percent' = 'Amount';
  discountInput = '0';
  receivedAmountInput = '0';
  notes = '';
  currentOrder: BillOrder | null = null;
  cartItems: BillingCartItem[] = [];
  filteredOrders: BillOrder[] = [];
  filteredQuickItems: QuickMenuItem[] = [];
  totalItems = 0;
  subtotal = 0;
  discountAmount = 0;
  taxAmount = 0;
  grandTotal = 0;
  balanceAmount = 0;

  ngOnInit(): void {
    if (!this.shiftService.isShiftAssigned()) {
      this.showShiftAssignment = true;
    }

    this.filteredQuickItems = [...this.quickMenuItems];
    this.updateOrderMatches();
    this.updateBillingSummary();
  }

  get activeServiceModeLabel(): string {
    return this.currentOrder?.serviceMode ?? this.serviceFilter;
  }

  get orderCount(): number {
    return this.filteredOrders.length;
  }

  get currentCustomerLabel(): string {
    return this.currentOrder?.customer || this.selectedCustomer || 'Walk-in Customer';
  }

  get currentOrderNumber(): string {
    return this.currentOrder?.orderNo || 'Direct Billing';
  }

  get currentBranchLabel(): string {
    return this.currentOrder?.branch || 'Trichy';
  }

  setBillingMode(mode: BillingMode): void {
    this.billingMode = mode;
    this.currentOrder = null;
    this.orderSearch = '';
    this.notes = '';
    this.updateOrderMatches();

    if (mode === 'quick-bill' && !this.cartItems.length) {
      this.selectedCustomer = 'Walk-in Customer';
    }
  }

  setServiceFilter(mode: ServiceMode | 'All'): void {
    this.serviceFilter = mode;
    this.updateOrderMatches();
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

  selectOrder(order: BillOrder): void {
    this.currentOrder = order;
    this.selectedCustomer = order.customer;
    this.notes = order.notes;
    this.cartItems = order.items.map((item) => ({
      ...item,
      sourceType: 'order'
    }));
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

    this.updateBillingSummary();
  }

  increaseQuantity(itemId: number): void {
    this.cartItems = this.cartItems.map((item) =>
      item.id === itemId ? { ...item, qty: item.qty + 1 } : item
    );
    this.updateBillingSummary();
  }

  decreaseQuantity(itemId: number): void {
    this.cartItems = this.cartItems
      .map((item) => item.id === itemId ? { ...item, qty: item.qty - 1 } : item)
      .filter((item) => item.qty > 0);
    this.updateBillingSummary();
  }

  removeCartItem(itemId: number): void {
    this.cartItems = this.cartItems.filter((item) => item.id !== itemId);
    this.updateBillingSummary();
  }

  setDiscountType(type: 'Amount' | 'Percent'): void {
    this.discountType = type;
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

  clearBill(): void {
    this.currentOrder = null;
    this.orderSearch = '';
    this.itemSearch = '';
    this.barcodeSearch = '';
    this.selectedCustomer = 'Walk-in Customer';
    this.selectedPaymentMode = 'Cash';
    this.discountType = 'Amount';
    this.discountInput = '0';
    this.receivedAmountInput = '0';
    this.notes = '';
    this.cartItems = [];
    this.updateOrderMatches();
    this.updateQuickItemMatches();
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
  }

  private updateQuickItemMatches(): void {
    const search = this.itemSearch.toLowerCase().trim();
    const barcode = this.barcodeSearch.toLowerCase().trim();

    this.filteredQuickItems = this.quickMenuItems.filter((item) =>
      (!search || item.name.toLowerCase().includes(search) || item.category.toLowerCase().includes(search)) &&
      (!barcode || String(item.id).includes(barcode) || item.name.toLowerCase().replaceAll(' ', '').includes(barcode))
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

    const taxableAmount = Math.max(this.subtotal - this.discountAmount, 0);
    this.taxAmount = this.cartItems.reduce((sum, item) => {
      const itemBase = item.qty * item.rate;
      const share = this.subtotal > 0 ? itemBase / this.subtotal : 0;
      const itemDiscount = this.discountAmount * share;
      const itemTaxable = Math.max(itemBase - itemDiscount, 0);
      return sum + ((itemTaxable * item.taxPercent) / 100);
    }, 0);

    this.grandTotal = taxableAmount + this.taxAmount;

    const receivedAmount = Number(this.receivedAmountInput || 0);
    this.balanceAmount = Number.isFinite(receivedAmount) ? receivedAmount - this.grandTotal : 0;
  }
}

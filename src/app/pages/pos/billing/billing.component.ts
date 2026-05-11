import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AutocompleteFieldComponent } from '../../../components/form/autocomplete-field.component';
import { FieldOption, SelectFieldComponent } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';

type Product = { id: number; name: string; category: string; price: number; stock: number; barcode: string };
type CartItem = Product & { quantity: number };

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, TextFieldComponent, SelectFieldComponent, AutocompleteFieldComponent],
  templateUrl: './billing.component.html',
  styleUrl: './billing.component.css'
})
export class BillingComponent implements OnInit {
  readonly customers: string[] = [];
  readonly paymentModes: FieldOption[] = [];
  readonly products: Product[] = [];
  readonly pageTitle = 'Billing';
  readonly pageSubtitle = 'Search menus, add them to cart, apply discount, choose customer and payment mode, and generate the bill.';

  productSearch = '';
  barcodeSearch = '';
  selectedCustomer: string | null = null;
  selectedPaymentMode: string | null = null;
  discountInput = '0';
  cartItems: CartItem[] = [];
  filteredProducts: Product[] = [];
  totalItems = 0;
  subtotal = 0;
  discountAmount = 0;
  tax = 0;
  grandTotal = 0;

  ngOnInit(): void {
    this.updateFilteredProducts();
    this.updateBillingSummary();
  }

  addToCart(product: Product): void {
    const existing = this.cartItems.find((item) => item.id === product.id);
    if (existing) {
      existing.quantity += 1;
      this.updateBillingSummary();
      return;
    }
    this.cartItems = [...this.cartItems, { ...product, quantity: 1 }];
    this.updateBillingSummary();
  }

  increaseQuantity(itemId: number): void {
    this.cartItems = this.cartItems.map((item) =>
      item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
    );
    this.updateBillingSummary();
  }

  decreaseQuantity(itemId: number): void {
    this.cartItems = this.cartItems
      .map((item) => item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item)
      .filter((item) => item.quantity > 0);
    this.updateBillingSummary();
  }

  removeCartItem(itemId: number): void {
    this.cartItems = this.cartItems.filter((item) => item.id !== itemId);
    this.updateBillingSummary();
  }

  clearBill(): void {
    this.cartItems = [];
    this.selectedCustomer = null;
    this.selectedPaymentMode = null;
    this.discountInput = '0';
    this.updateBillingSummary();
  }

  printBill(): void { window.print(); }

  onProductSearchChange(value: string): void {
    this.productSearch = value;
    this.updateFilteredProducts();
  }

  onBarcodeSearchChange(value: string): void {
    this.barcodeSearch = value;
    this.updateFilteredProducts();
  }

  onDiscountChange(value: string): void {
    this.discountInput = value;
    this.updateBillingSummary();
  }

  private updateFilteredProducts(): void {
    const search = this.productSearch.toLowerCase().trim();
    const barcode = this.barcodeSearch.toLowerCase().trim();

    this.filteredProducts = this.products.filter((product) =>
      (!search || product.name.toLowerCase().includes(search) || product.category.toLowerCase().includes(search))
      && (!barcode || product.barcode.toLowerCase().includes(barcode))
    );
  }

  private updateBillingSummary(): void {
    this.totalItems = this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
    this.subtotal = this.cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const discountValue = Number(this.discountInput || 0);
    this.discountAmount = Number.isFinite(discountValue) && discountValue > 0 ? discountValue : 0;
    this.tax = Math.max(this.subtotal - this.discountAmount, 0) * 0.05;
    this.grandTotal = Math.max(this.subtotal - this.discountAmount, 0) + this.tax;
  }
}

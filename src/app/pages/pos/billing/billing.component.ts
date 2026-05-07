import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
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
export class BillingComponent {
  readonly customers: string[] = [];
  readonly paymentModes: FieldOption[] = [];
  readonly products: Product[] = [];

  productSearch = '';
  barcodeSearch = '';
  selectedCustomer: string | null = null;
  selectedPaymentMode: string | null = null;
  discountInput = '0';
  cartItems: CartItem[] = [];

  addToCart(product: Product): void {
    const existing = this.cartItems.find((item) => item.id === product.id);
    if (existing) { existing.quantity += 1; return; }
    this.cartItems = [...this.cartItems, { ...product, quantity: 1 }];
  }
  increaseQuantity(itemId: number): void { this.cartItems = this.cartItems.map((item) => item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item); }
  decreaseQuantity(itemId: number): void { this.cartItems = this.cartItems.map((item) => item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item).filter((item) => item.quantity > 0); }
  removeCartItem(itemId: number): void { this.cartItems = this.cartItems.filter((item) => item.id !== itemId); }
  printBill(): void { window.print(); }

  get filteredProducts(): Product[] {
    const search = this.productSearch.toLowerCase().trim();
    const barcode = this.barcodeSearch.toLowerCase().trim();
    return this.products.filter((product) => (!search || product.name.toLowerCase().includes(search) || product.category.toLowerCase().includes(search)) && (!barcode || product.barcode.toLowerCase().includes(barcode)));
  }

  get totalItems(): number { return this.cartItems.reduce((sum, item) => sum + item.quantity, 0); }
  get subtotal(): number { return this.cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0); }
  get discountAmount(): number { const value = Number(this.discountInput); return Number.isFinite(value) && value > 0 ? value : 0; }
  get tax(): number { return Math.max(this.subtotal - this.discountAmount, 0) * 0.05; }
  get grandTotal(): number { return Math.max(this.subtotal - this.discountAmount, 0) + this.tax; }
}

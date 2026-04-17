import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AutocompleteFieldComponent } from '../../../components/form/autocomplete-field.component';
import { SelectFieldComponent } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { Option } from '../config/models';

type Product = { id: number; name: string; category: string; price: number; stock: number; barcode: string };
type CartItem = Product & { quantity: number };

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, TextFieldComponent, SelectFieldComponent, AutocompleteFieldComponent],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.css'
})
export class SalesComponent {
  readonly customers = ['Walk-in Customer', 'Asha Retail', 'Kiran Traders', 'Vijay Kumar'];
  readonly paymentModes: Option[] = [{ label: 'Cash', value: 'Cash' }, { label: 'UPI', value: 'UPI' }, { label: 'Card', value: 'Card' }, { label: 'Credit', value: 'Credit' }];
  readonly products: Product[] = [
    { id: 1, name: 'Arabica Coffee 250g', category: 'Beverages', price: 12.5, stock: 42, barcode: '8901002001010' },
    { id: 2, name: 'Brown Bread Loaf', category: 'Bakery', price: 3.25, stock: 19, barcode: '8901002001011' },
    { id: 3, name: 'Organic Milk 1L', category: 'Dairy', price: 2.75, stock: 28, barcode: '8901002001012' },
    { id: 4, name: 'Chocolate Cookies', category: 'Snacks', price: 4.5, stock: 35, barcode: '8901002001013' }
  ];

  productSearch = '';
  barcodeSearch = '';
  selectedCustomer: string | null = 'Walk-in Customer';
  selectedPaymentMode: string | null = 'Cash';
  discountInput = '0';
  cartItems: CartItem[] = [{ ...this.products[0], quantity: 1 }, { ...this.products[1], quantity: 2 }];

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

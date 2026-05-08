import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

import { AppToastService } from '../../../services/app-toast.service';
import { CategoryService } from '../../../services/Category.service';
import { MenuService } from '../../../services/FoodMenu.service';
import { OrderHoldService } from '../../../services/order-hold.service';
import { subCategoryService } from '../../../services/SubCategory.service';
import { TaxService } from '../../../services/tax.service';

type OrderType = 'Dine In' | 'Take Away' | 'Delivery';

type MenuCategory = {
  id: number;
  name: string;
  icon: string;
};

type MenuSubCategory = {
  id: number;
  name: string;
  categoryId: number;
};

type MenuItem = {
  id: number;
  name: string;
  category: string;
  categoryId: number;
  subCategory: string;
  subCategoryId: number;
  price: number;
  preparationTime: string;
  isPopular?: boolean;
};

type CartItem = MenuItem & {
  quantity: number;
  note?: string;
  holdItemId?: number;
};

type HeldOrderItem = {
  id?: number;
  Id?: number;
  OrderHoldItemId?: number;
  orderHoldItemId?: number;
  MenuId?: number;
  menuId?: number;
  Menuitemid?: string;
  MenuItemId?: string;
  menuitemid?: string;
  menuItemId?: string;
  menuItemID?: string;
  Itemid?: string;
  ItemId?: string;
  itemid?: string;
  itemId?: string;
  name?: string;
  Itemname?: string;
  ItemName?: string;
  itemname?: string;
  itemName?: string;
  MenuName?: string;
  menuname?: string;
  menuName?: string;
  Menuitemname?: string;
  MenuItemName?: string;
  menuitemname?: string;
  menuItemName?: string;
  category?: string;
  Category?: string;
  categoryName?: string;
  CategoryName?: string;
  subCategory?: string;
  SubCategory?: string;
  subcategory?: string;
  subCategoryName?: string;
  SubCategoryName?: string;
  price?: number;
  Price?: number;
  rate?: number;
  Rate?: number;
  Unitprice?: number;
  UnitPrice?: number;
  unitprice?: number;
  unitPrice?: number;
  Totalprice?: number;
  TotalPrice?: number;
  totalprice?: number;
  totalPrice?: number;
  quantity?: number;
  Quantity?: number;
  qty?: number;
  Qty?: number;
  Noofitem?: number;
  NoOfItem?: number;
  noofitem?: number;
  noOfItem?: number;
  Notes?: string | null;
  notes?: string | null;
};

type HeldOrder = {
  Id?: number;
  id?: number;
  Orderid?: number;
  OrderId?: number;
  orderid?: number;
  orderId?: number;
  Tableid?: string;
  TableId?: string;
  tableid?: string;
  tableId?: string;
  Ordertype?: string;
  OrderType?: string;
  ordertype?: string;
  orderType?: string;
  Orderstatus?: string;
  OrderStatus?: string;
  orderstatus?: string;
  orderStatus?: string;
  Customerid?: number;
  CustomerId?: number;
  customerid?: number;
  customerId?: number;
  customerName?: string;
  Customername?: string;
  CustomerName?: string;
  customername?: string;
  Name?: string;
  name?: string;
  MobileNo?: string;
  mobileNo?: string;
  Phone?: string;
  phone?: string;
  EmailId?: string;
  emailId?: string;
  Email?: string;
  email?: string;
  AddressLine1?: string;
  addressLine1?: string;
  Address?: string;
  address?: string;
  Guestcount?: number;
  GuestCount?: number;
  guestcount?: number;
  guestCount?: number;
  Itemcount?: number;
  ItemCount?: number;
  itemcount?: number;
  itemCount?: number;
  SubtotalAmount?: number;
  subtotalAmount?: number;
  TaxAmount?: number;
  taxAmount?: number;
  TotalAmount?: number;
  totalAmount?: number;
  Shiftid?: string;
  ShiftId?: string;
  shiftid?: string;
  shiftId?: string;
  CreatedDate?: string;
  createdDate?: string;
  discountPercent?: number;
  items?: HeldOrderItem[];
  Items?: HeldOrderItem[];
  orderHoldItems?: HeldOrderItem[];
  OrderHoldItems?: HeldOrderItem[];
  Orderholditems?: HeldOrderItem[];
  orderholditems?: HeldOrderItem[];
  orderDetails?: HeldOrderItem[];
  OrderDetails?: HeldOrderItem[];
  orderNo?: string;
  OrderNo?: string;
  orderno?: string;
  Ordernumber?: string;
  OrderNumber?: string;
  ordernumber?: string;
  orderNumber?: string;
  DiscountAmount?: number;
  discountAmount?: number;
};

type CurrentCustomerDetails = {
  orderNumber: string;
  customerId: number;
  customerName: string;
  mobileNo: string;
  emailId: string;
  addressLine1: string;
  orderType: OrderType;
  table: string;
  guestCount: number;
  orderStatus: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  shiftId: string;
  heldAt: string;
};

const ALL_CATEGORY: MenuCategory = { id: 0, name: 'All', icon: 'pi pi-th-large' };
const ALL_SUBCATEGORY: MenuSubCategory = { id: 0, name: 'All', categoryId: 0 };

const CATEGORY_ICON_MAP: Record<string, string> = {
  breakfast: 'pi pi-sun',
  lunch: 'pi pi-objects-column',
  dinner: 'pi pi-shop',
  beverages: 'pi pi-cup',
  desserts: 'pi pi-star'
};

const DEFAULT_CATEGORY_ICON = 'pi pi-shopping-bag';
const ACTIVE_HELD_ORDER_STORAGE_KEY = 'activeHeldOrder';

const FALLBACK_MENU_CATEGORIES: MenuCategory[] = [
  { id: 2, name: 'Breakfast', icon: 'pi pi-sun' },
  { id: 3, name: 'Meals', icon: 'pi pi-objects-column' },
  { id: 4, name: 'Beverages', icon: 'pi pi-cup' },
  { id: 5, name: 'Desserts', icon: 'pi pi-star' }
];

@Component({
  selector: 'app-order-screen',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, TagModule],
  templateUrl: './order-screen.component.html',
  styleUrl: './order-screen.component.css'
})
export class OrderScreenComponent implements OnInit {
  readonly orderTypes: OrderType[] = ['Dine In', 'Take Away', 'Delivery'];
  readonly tables = ['T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06'];

  categories: MenuCategory[] = [ALL_CATEGORY];
  subCategories: MenuSubCategory[] = [ALL_SUBCATEGORY];
  allMenuItems: MenuItem[] = [];
  menuItems: MenuItem[] = [];
  isLoading = false;
  isCategoryLoading = false;
  isSubCategoryLoading = false;
  isMenuLoading = false;
  activeCategory = 'All';
  activeCategoryId = 0;
  activeSubCategory = 'All';
  activeSubCategoryId = 0;
  activeSubCategoryCategoryId = 0;
  hasSelectedSubCategory = true;
  activeOrderType: OrderType = 'Dine In';
  currentHeldOrderId = 0;
  currentOrderNumber = '';
  selectedTable = 'T-03';
  customerName = 'Walk-in Customer';
  currentCustomerDetails: CurrentCustomerDetails = this.getDefaultCustomerDetails();
  searchText = '';
  discountPercent = 5;
  taxPercent = 5;
  cartItems: CartItem[] = [];
  userDetails: any = {};
  orgId = 0;
  isHoldingOrder = false;
  private menuLoadingFallback?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly toast: AppToastService,
    private readonly categoryService: CategoryService,
    private readonly subCategoryService: subCategoryService,
    private readonly foodmenuService: MenuService,
    private readonly orderHoldService: OrderHoldService,
    private readonly taxService: TaxService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.orgId = this.getUserOrgId();
    this.loadOrderScreenData();
    this.loadTaxPercentage();
    this.restoreHeldOrder();
  }

  get filteredMenuItems(): MenuItem[] {
    const search = this.searchText.trim().toLowerCase();

    return this.menuItems.filter((item) => {
      const matchesSearch = !search ||
        item.name.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search) ||
        item.subCategory.toLowerCase().includes(search);

      return matchesSearch;
    });
  }

  get visibleSubCategories(): MenuSubCategory[] {
    const filtered = this.activeCategoryId === 0
      ? this.subCategories.filter((item) => item.id !== 0)
      : this.subCategories.filter((item) => item.categoryId === this.activeCategoryId);

    return [ALL_SUBCATEGORY, ...filtered];
  }

  get menuEmptyMessage(): string {
    return 'No menu items match your selection.';
  }

  get itemCount(): number {
    return this.cartItems.reduce((total, item) => total + item.quantity, 0);
  }

  get subtotal(): number {
    return this.cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  get discountAmount(): number {
    return this.subtotal * (this.discountPercent / 100);
  }

  get taxAmount(): number {
    return Math.max(this.subtotal - this.discountAmount, 0) * (this.taxPercent / 100);
  }

  get grandTotal(): number {
    return this.subtotal - this.discountAmount + this.taxAmount;
  }

  loadOrderScreenData(): void {
    this.loadCategories();
    this.loadSubCategories();
    this.loadMenus();
  }

  loadTaxPercentage(): void {
    this.taxService.getAll(this.orgId).subscribe({
      next: (response: any) => {
        const activeTax = this.getResultArray(response).find((row) => this.isActiveRow(row));
        const percentage = this.toNumber(activeTax?.Percentage);

        if (percentage > 0) {
          this.taxPercent = percentage;
        }
      },
      error: () => {
        this.toast.warn('Tax Not Loaded', 'Using default tax percentage for this order.');
      }
    });
  }

  loadCategories(): void {
    this.isCategoryLoading = true;
    this.updateLoadingState();

    this.categoryService.getAll(this.orgId).subscribe({
      next: (response: any) => {
        const categoryRows = this.getResultArray(response);

        this.categories = [
          ALL_CATEGORY,
          ...categoryRows
            .filter((row) => this.isActiveRow(row))
            .map((row) => ({
              id: this.toNumber(row.id ?? row.Id),
              name: String(row.name ?? row.Name ?? row.code ?? row.Code ?? 'Category'),
              icon: this.getCategoryIcon(String(row.name ?? row.Name ?? row.code ?? row.Code ?? 'Category'))
            }))
        ];

        if (this.categories.length === 1) {
          this.categories = [ALL_CATEGORY, ...FALLBACK_MENU_CATEGORIES];
        }

        this.selectCategory(this.categories[0] ?? ALL_CATEGORY);

        this.allMenuItems = this.allMenuItems.map((item) => ({
          ...item,
          category: this.getCategoryName(item.categoryId)
        }));

        this.applyMenuSelection();
      },
      error: () => {
        this.toast.error('Load Failed', 'Unable to load categories.');
        this.isCategoryLoading = false;
        this.updateLoadingState();
      },
      complete: () => {
        this.isCategoryLoading = false;
        this.updateLoadingState();
      }
    });
  }

  loadSubCategories(): void {
    this.isSubCategoryLoading = true;
    this.updateLoadingState();

    this.subCategoryService.getAll(this.orgId).subscribe({
      next: (response: any) => {
        this.subCategories = [
          ALL_SUBCATEGORY,
          ...this.getResultArray(response)
            .filter((row) => this.isActiveRow(row))
            .map((row) => ({
              id: this.toNumber(row.id ?? row.Id),
              name: String(row.name ?? row.Name ?? row.code ?? row.Code ?? 'Sub Category'),
              categoryId: this.toNumber(row.categoryId ?? row.CategoryId)
            }))
        ];

        this.allMenuItems = this.allMenuItems.map((item) => ({
          ...item,
          subCategory: this.getSubCategoryName(item.subCategoryId)
        }));

        this.applyMenuSelection();
      },
      error: () => {
        this.toast.error('Load Failed', 'Unable to load subcategories.');
        this.isSubCategoryLoading = false;
        this.updateLoadingState();
      },
      complete: () => {
        this.isSubCategoryLoading = false;
        this.updateLoadingState();
      }
    });
  }

  loadMenus(): void {
    this.isMenuLoading = true;
    this.updateLoadingState();
    this.clearMenuLoadingFallback();
    this.menuLoadingFallback = setTimeout(() => {
      if (!this.menuItems.length && this.allMenuItems.length) {
        this.menuItems = [...this.allMenuItems];
      }

      this.finishMenuLoading();
    }, 8000);

    this.foodmenuService.getAll(this.orgId).subscribe({
      next: (response: any) => {
        try {
          this.allMenuItems = this.getUniqueRowsById(this.getResultArray(response))
            .filter((row) => this.isActiveRow(row))
            .map((row) => this.mapMenuItem(row));

          if (this.activeCategoryId === 0 && this.activeSubCategoryId === 0) {
            this.menuItems = [...this.allMenuItems];
          } else {
            this.applyMenuSelection();
          }
        } catch {
          this.toast.error('Load Failed', 'Unable to prepare menu items.');
        }

        this.finishMenuLoading();
      },
      error: () => {
        this.toast.error('Load Failed', 'Unable to load menu items.');
        this.finishMenuLoading();
      },
      complete: () => {
        this.finishMenuLoading();
      }
    });
  }

  selectCategory(category: MenuCategory): void {
    this.activeCategory = category.name;
    this.activeCategoryId = category.id;
    this.activeSubCategory = 'All';
    this.activeSubCategoryId = 0;
    this.activeSubCategoryCategoryId = 0;
    this.hasSelectedSubCategory = true;
    this.applyMenuSelection();
  }

  selectSubCategory(subCategory: MenuSubCategory): void {
    
    this.activeSubCategory = subCategory.name;
    this.activeSubCategoryId = subCategory.id;
    this.activeSubCategoryCategoryId = subCategory.categoryId;
    this.hasSelectedSubCategory = true;
    this.applyMenuSelection();
  }

  selectOrderType(orderType: OrderType): void {
    this.activeOrderType = orderType;
    this.currentCustomerDetails = {
      ...this.currentCustomerDetails,
      orderType
    };
  }

  selectTable(table: string): void {
    this.selectedTable = table;
    this.currentCustomerDetails = {
      ...this.currentCustomerDetails,
      table
    };
  }

  updateSearchText(event: Event): void {
    this.searchText = (event.target as HTMLInputElement).value;
  }

  applyMenuSelection(): void {
    this.menuItems = this.allMenuItems.filter((item) => {
      const matchesCategory = this.activeCategoryId === 0 || item.categoryId === this.activeCategoryId;
      const matchesSubCategory = this.activeSubCategoryId === 0 ||
        item.subCategoryId === this.activeSubCategoryId ||
        (item.subCategoryId === 0 && item.categoryId === this.activeSubCategoryCategoryId);

      return matchesCategory && matchesSubCategory;
    });
  }

  addToCart(menuItem: MenuItem): void {
    const existingItem = this.cartItems.find((item) => item.id === menuItem.id);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      this.cartItems = [{ ...menuItem, quantity: 1 }, ...this.cartItems];
    }
  }

  increaseQuantity(itemId: number): void {
    this.cartItems = this.cartItems.map((item) =>
      item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
    );
  }

  decreaseQuantity(itemId: number): void {
    this.cartItems = this.cartItems
      .map((item) => item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item)
      .filter((item) => item.quantity > 0);
  }

  removeItem(itemId: number): void {
    this.cartItems = this.cartItems.filter((item) => item.id !== itemId);
  }

  clearOrder(): void {
    this.cartItems = [];
    this.discountPercent = 0;
    this.currentHeldOrderId = 0;
    this.currentOrderNumber = '';
    this.customerName = 'Walk-in Customer';
    this.currentCustomerDetails = this.getDefaultCustomerDetails();
  }

  holdOrder(): void {
    if (!this.cartItems.length) {
      this.toast.warn('Empty Order', 'Add at least one item before holding the order.');
      return;
    }

    if (this.isHoldingOrder) {
      return;
    }

    const orderId = this.currentHeldOrderId;
    const orderNo = this.currentOrderNumber || `HOLD-${Date.now()}`;
    const createdDate = new Date().toISOString();
    const createdBy = this.getCurrentUserId();
    const payload = this.buildOrderHoldPayload(orderId, orderNo, createdDate, createdBy);

    this.isHoldingOrder = true;
    const request = orderId
      ? this.orderHoldService.update(payload)
      : this.orderHoldService.create(payload);
    console.log(`OrderHold/${orderId ? 'Update' : 'Create'} payload`, payload);

    request.subscribe({
      next: (response: any) => {
        if (response?.ErrorInfo?.Message === false) {
          this.toast.error('Hold Failed', response?.result || 'Unable to save held order.');
          return;
        }

        this.cartItems = [];
        this.currentHeldOrderId = 0;
        this.currentOrderNumber = '';
        this.currentCustomerDetails = this.getDefaultCustomerDetails();
        this.toast.info(orderId ? 'Order Updated' : 'Order Held', `${orderNo} has been saved to Order Hold.`);
        this.router.navigate(['/pos/order-hold']);
      },
      error: (error) => {
        console.error(`OrderHold/${orderId ? 'Update' : 'Create'} failed`, error);
        this.toast.error('Hold Failed', 'Unable to save held order. Please check API and try again.');
      },
      complete: () => {
        this.isHoldingOrder = false;
      }
    });
  }

  sendToKitchen(): void {
    if (!this.cartItems.length) {
      this.toast.warn('Empty Order', 'Add at least one item before sending to kitchen.');
      return;
    }

    this.toast.success('Sent To Kitchen', `${this.itemCount} item(s) sent to kitchen.`);
  }

  settlePayment(): void {
    if (!this.cartItems.length) {
      this.toast.warn('Empty Order', 'Add items before settling payment.');
      return;
    }

    const paidMessage = `Collect ${this.formatAmount(this.grandTotal)} for this order.`;

    if (!this.currentHeldOrderId) {
      this.toast.success('Payment Ready', paidMessage);
      this.clearOrder();
      return;
    }

    const heldOrderId = this.currentHeldOrderId;

    this.orderHoldService.delete(heldOrderId).subscribe({
      next: () => {
        this.toast.success('Payment Ready', paidMessage);
        this.clearOrder();
      },
      error: () => {
        this.toast.error('Payment Failed', 'Unable to delete the held order from API.');
      }
    });
  }

  private formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  }

  private buildOrderHoldPayload(orderId: number, orderNo: string, createdDate: string, createdBy: number | null): any {
    const updatedDate = new Date().toISOString();
    const orderItems = this.cartItems.map((item) => ({
      id: item.holdItemId || 0,
      orderHoldItemId: item.holdItemId || 0,
      isActive: true,
      createdBy: createdBy,
      createdDate: this.currentCustomerDetails.heldAt || createdDate,
      updatedBy: orderId ? createdBy : null,
      updatedDate: orderId ? updatedDate : null,
      isDeleted: false,
      itemid: item.holdItemId || 0,
      orderid: orderId || 0,
      menuitemid: String(item.id),
      itemname: item.name,
      quantity: item.quantity,
      unitprice: item.price,
      totalprice: item.price * item.quantity,
      discountAmount: 0,
      taxAmount: 0,
      modifierdetails: null,
      itemstatus: 'Hold',
      notes: item.note ?? null,
      orgId: this.orgId,
      orderHold: null
    }));

    return {
      orderId: orderId || 0,
      ordernumber: orderNo,
      tableid: this.selectedTable,
      ordertype: this.activeOrderType,
      orderstatus: 'Hold',
      itemcount: this.itemCount,
      guestcount: this.itemCount,
      subtotalAmount: this.subtotal,
      taxAmount: this.taxAmount,
      discountAmount: this.discountAmount,
      totalAmount: this.grandTotal,
      shiftid: this.getCurrentShiftId(),
      orgId: this.orgId,
      createdBy: createdBy,
      createdDate: this.currentCustomerDetails.heldAt || createdDate,
      updatedBy: orderId ? createdBy : null,
      updatedDate: orderId ? updatedDate : null,
      isDeleted: false,
      items: orderItems
    };
  }

  private mapMenuItem(row: any): MenuItem {
    const categoryId = this.toNumber(row.categoryId ?? row.CategoryId);
    const subCategoryId = this.toNumber(
      row.subCategoryId ??
      row.SubCategoryId ??
      row.subcategoryId ??
      row.SubcategoryId ??
      row.subCategoryid ??
      row.Subcategoryid
    );

    return {
      id: this.toNumber(row.id ?? row.Id),
      name: String(row.name ?? row.Name ?? row.menuName ?? row.MenuName ?? row.code ?? row.Code ?? 'Menu Item'),
      category: String(
        row.categoryname ??
        row.categoryName ??
        row.CategoryName ??
        this.getCategoryName(categoryId)
      ),
      categoryId,
      subCategory: String(
        row.subcategoryname ??
        row.subMenuName ??
        row.SubMenuName ??
        row.subCategoryName ??
        row.SubCategoryName ??
        row.SubcategoryName ??
        this.getSubCategoryName(subCategoryId)
      ),
      subCategoryId,
      price: this.toNumber(
        row.subMenuPrice ??
        row.SubMenuPrice ??
        row.submenuPrice ??
        row.SubmenuPrice ??
        row.price ??
        row.Price ??
        row.PRICE ??
        row.rate ??
        row.Rate ??
        row.salesPrice ??
        row.SalesPrice ??
        row.menuPrice ??
        row.MenuPrice
      ),
      preparationTime: String(row.preparationTime ?? row.PreparationTime ?? row.prepTime ?? row.PrepTime ?? '5 Min'),
      isPopular: Boolean(row.isPopular ?? row.IsPopular ?? row.popular ?? false)
    };
  }

  private getCategoryName(categoryId: number): string {
    return this.categories.find((category) => category.id === categoryId)?.name ?? 'Uncategorized';
  }

  private getCategoryIcon(categoryName: string): string {
    return CATEGORY_ICON_MAP[categoryName.trim().toLowerCase()] ?? DEFAULT_CATEGORY_ICON;
  }

  private getSubCategoryName(subCategoryId: number): string {
    return this.subCategories.find((subCategory) => subCategory.id === subCategoryId)?.name ?? 'General';
  }

  private getResultArray(response: any): any[] {
    const result = response?.result ?? response?.Result ?? response ?? [];
    return Array.isArray(result) ? result : [];
  }

  private getUniqueRowsById(rows: any[]): any[] {
    const uniqueRows = new Map<number, any>();

    rows.forEach((row) => {
      const id = this.toNumber(row.id ?? row.Id);

      if (!uniqueRows.has(id)) {
        uniqueRows.set(id, row);
      }
    });

    return [...uniqueRows.values()];
  }

  private isActiveRow(row: any): boolean {
    const activeValue = row.isactive ?? row.isActive ?? row.IsActive;
    return activeValue === undefined ||
      activeValue === null ||
      activeValue === true ||
      activeValue === 1 ||
      String(activeValue).toLowerCase() === 'true' ||
      String(activeValue) === '1';
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private firstPositiveNumber(...values: unknown[]): number {
    for (const value of values) {
      const parsed = this.toNumber(value);

      if (parsed > 0) {
        return parsed;
      }
    }

    return 0;
  }

  private updateLoadingState(): void {
    this.isLoading = this.isCategoryLoading || this.isSubCategoryLoading || this.isMenuLoading;
  }

  private finishMenuLoading(): void {
    this.clearMenuLoadingFallback();
    this.isMenuLoading = false;
    this.updateLoadingState();
  }

  private clearMenuLoadingFallback(): void {
    if (this.menuLoadingFallback) {
      clearTimeout(this.menuLoadingFallback);
      this.menuLoadingFallback = undefined;
    }
  }

  private getUserOrgId(): number {
    return this.toNumber(
      this.userDetails?.OrgId ??
      this.userDetails?.orgId ??
      this.userDetails?.orgid ??
      this.userDetails?.OrganizationId ??
      this.userDetails?.organizationId
    );
  }

  private getCurrentUserId(): number | null {
    const userId = this.toNumber(
      this.userDetails?.UserId ??
      this.userDetails?.userId ??
      this.userDetails?.CreatedBy
    );

    return userId || null;
  }

  private getCurrentShiftId(): string {
    return String(
      this.userDetails?.Shiftid ??
      this.userDetails?.ShiftId ??
      this.userDetails?.shiftId ??
      ''
    );
  }

  private restoreHeldOrder(): void {

    
    const storedOrder = localStorage.getItem(ACTIVE_HELD_ORDER_STORAGE_KEY);

    if (!storedOrder) {
      return;
    }

    try {
      const heldOrder = JSON.parse(storedOrder) as HeldOrder;
      const source = heldOrder as any;
      const orderType = this.toOrderType(source.Ordertype ?? source.OrderType ?? source.ordertype ?? source.orderType ?? source.Type ?? source.type);
      const table = this.pickString(source.Tableid, source.TableId, source.tableid, source.tableId, source.TableNo, source.tableNo, source.TableName, source.tableName);
      const orderItems = this.getHeldOrderItems(heldOrder);

      this.currentCustomerDetails = this.mapHeldOrderToCustomerDetails(heldOrder);
      this.currentHeldOrderId = this.getHeldOrderId(heldOrder);
      this.currentOrderNumber = this.currentCustomerDetails.orderNumber;
      this.activeOrderType = orderType;
      this.selectedTable = this.tables.includes(table) ? table : this.currentCustomerDetails.table || this.selectedTable;
      this.customerName = this.currentCustomerDetails.customerName || this.customerName;
      this.discountPercent = this.getHeldOrderDiscountPercent(heldOrder);
      this.cartItems = orderItems.map((item) => this.mapHeldItemToCartItem(item));

      localStorage.removeItem(ACTIVE_HELD_ORDER_STORAGE_KEY);
      this.toast.info('Order Opened', `${source.Ordernumber ?? source.OrderNumber ?? source.ordernumber ?? source.orderNumber ?? source.OrderNo ?? source.orderno ?? source.orderNo ?? 'Held order'} loaded on order screen.`);
    } catch {
      localStorage.removeItem(ACTIVE_HELD_ORDER_STORAGE_KEY);
      this.toast.error('Load Failed', 'Unable to open the held order.');
    }
  }

  private toOrderType(value: unknown): OrderType {
    const orderType = String(value ?? 'Dine In');
    return this.orderTypes.includes(orderType as OrderType) ? orderType as OrderType : 'Dine In';
  }

  private getHeldOrderItems(order: HeldOrder): HeldOrderItem[] {
    const source = order as any;
    const items = source.items ??
      source.Items ??
      source.orderHoldItems ??
      source.OrderHoldItems ??
      source.Orderholditems ??
      source.orderholditems ??
      source.orderDetails ??
      source.OrderDetails ??
      [];
    return Array.isArray(items) ? items : [];
  }

  private mapHeldItemToCartItem(item: HeldOrderItem): CartItem {
    return {
      id: this.toNumber(
        item.Menuitemid ??
        item.MenuItemId ??
        item.menuitemid ??
        item.menuItemId ??
        item.menuItemID ??
        item.Itemid ??
        item.ItemId ??
        item.itemid ??
        item.itemId ??
        item.MenuId ??
        item.menuId ??
        item.id ??
        item.Id
      ),
      name: this.pickString(
        item.name,
        item.Itemname,
        item.ItemName,
        item.itemname,
        item.itemName,
        item.MenuName,
        item.menuname,
        item.menuName,
        item.Menuitemname,
        item.MenuItemName,
        item.menuitemname,
        item.menuItemName,
        'Menu Item'
      ),
      category: this.pickString(item.category, item.Category, item.categoryName, item.CategoryName, 'Uncategorized'),
      categoryId: 0,
      subCategory: this.pickString(item.subCategory, item.SubCategory, item.subcategory, item.subCategoryName, item.SubCategoryName, 'General'),
      subCategoryId: 0,
      price: this.toNumber(
        item.price ??
        item.Price ??
        item.Unitprice ??
        item.UnitPrice ??
        item.unitprice ??
        item.unitPrice ??
        item.rate ??
        item.Rate
      ),
      preparationTime: '5 Min',
      quantity: this.toNumber(item.quantity ?? item.Quantity ?? item.qty ?? item.Qty ?? item.Noofitem ?? item.NoOfItem ?? item.noofitem ?? item.noOfItem) || 1,
      note: item.Notes ?? item.notes ?? undefined,
      holdItemId: this.firstPositiveNumber(item.Itemid, item.ItemId, item.itemid, item.itemId, item.OrderHoldItemId, item.orderHoldItemId, item.Id, item.id)
    };
  }

  private getHeldOrderId(order: HeldOrder): number {
    return this.firstPositiveNumber(order.orderId, order.OrderId, order.Orderid, order.orderid, order.Id, order.id);
  }

  private mapHeldOrderToCustomerDetails(order: HeldOrder): CurrentCustomerDetails {
    const orderItems = this.getHeldOrderItems(order);
    const itemSubtotal = orderItems.reduce((total, item) => {
      const lineTotal = this.toNumber(item.Totalprice ?? item.TotalPrice ?? item.totalprice ?? item.totalPrice);
      const calculatedLineTotal = this.mapHeldItemToCartItem(item).price * this.mapHeldItemToCartItem(item).quantity;

      return total + (lineTotal || calculatedLineTotal);
    }, 0);
    const source = order as any;
    const orderNumber = this.pickString(source.Ordernumber, source.OrderNumber, source.ordernumber, source.orderNumber, source.OrderNo, source.orderno, source.orderNo);
    const customerName = this.pickString(
      order.CustomerName,
      order.Customername,
      order.customerName,
      order.customername,
      order.Name,
      order.name,
      'Walk-in Customer'
    );
    const subtotalAmount = this.toNumber(order.SubtotalAmount ?? order.subtotalAmount) || itemSubtotal;
    const discountAmount = this.toNumber(order.DiscountAmount ?? order.discountAmount);
    const taxAmount = this.toNumber(order.TaxAmount ?? order.taxAmount) ||
      (Math.max(subtotalAmount - discountAmount, 0) * (this.taxPercent / 100));
    const totalAmount = this.toNumber(order.TotalAmount ?? order.totalAmount) ||
      (subtotalAmount - discountAmount + taxAmount);

    return {
      orderNumber,
      customerId: this.toNumber(order.Customerid ?? order.CustomerId ?? order.customerid ?? order.customerId),
      customerName,
      mobileNo: this.pickString(order.MobileNo, order.mobileNo, order.Phone, order.phone),
      emailId: this.pickString(order.EmailId, order.emailId, order.Email, order.email),
      addressLine1: this.pickString(order.AddressLine1, order.addressLine1, order.Address, order.address),
      orderType: this.toOrderType(source.Ordertype ?? source.OrderType ?? source.ordertype ?? source.orderType ?? source.Type ?? source.type),
      table: this.pickString(source.Tableid, source.TableId, source.tableid, source.tableId, source.TableNo, source.tableNo, source.TableName, source.tableName, this.selectedTable),
      guestCount: this.toNumber(order.Itemcount ?? order.ItemCount ?? order.itemcount ?? order.itemCount ?? order.Guestcount ?? order.GuestCount ?? order.guestcount ?? order.guestCount) ||
        orderItems.reduce((total, item) => total + (this.toNumber(item.Quantity ?? item.quantity) || 1), 0),
      orderStatus: this.pickString(source.Orderstatus, source.OrderStatus, source.orderstatus, source.orderStatus, source.Status, source.status, 'Hold'),
      subtotalAmount,
      discountAmount,
      taxAmount,
      totalAmount,
      shiftId: this.pickString(order.Shiftid, order.ShiftId, order.shiftid, order.shiftId),
      heldAt: this.pickString(order.CreatedDate, order.createdDate)
    };
  }

  private getDefaultCustomerDetails(): CurrentCustomerDetails {
    return {
      orderNumber: '',
      customerId: 0,
      customerName: 'Walk-in Customer',
      mobileNo: '',
      emailId: '',
      addressLine1: '',
      orderType: this.activeOrderType ?? 'Dine In',
      table: this.selectedTable ?? '',
      guestCount: 0,
      orderStatus: '',
      subtotalAmount: 0,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
      shiftId: '',
      heldAt: ''
    };
  }

  private pickString(...values: unknown[]): string {
    const value = values.find((item) => item !== undefined && item !== null && String(item).trim() !== '');
    return value === undefined ? '' : String(value);
  }

  private getHeldOrderDiscountPercent(order: HeldOrder): number {
    if (order.discountPercent !== undefined && order.discountPercent !== null) {
      return this.toNumber(order.discountPercent);
    }

    const hasDiscountAmount = order.DiscountAmount !== undefined || order.discountAmount !== undefined;

    const discountAmount = this.toNumber(order.DiscountAmount ?? order.discountAmount);
    const itemsSubtotal = this.getHeldOrderItems(order).reduce((total, item) => {
      const lineTotal = this.toNumber(item.Totalprice ?? item.TotalPrice ?? item.totalprice ?? item.totalPrice);
      const cartItem = this.mapHeldItemToCartItem(item);
      const calculatedLineTotal = cartItem.price * cartItem.quantity;

      return total + (lineTotal || calculatedLineTotal);
    }, 0);

    if (hasDiscountAmount) {
      return itemsSubtotal ? (discountAmount / itemsSubtotal) * 100 : 0;
    }

    return this.discountPercent;
  }
}

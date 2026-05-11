import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { firstValueFrom } from 'rxjs';

import { AppToastService } from '../../../services/app-toast.service';
import { CategoryService } from '../../../services/Category.service';
import { DiningTableService } from '../../../services/diningtable.service';
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
const ALL_TABLE = 'All';

const CATEGORY_ICON_MAP: Record<string, string> = {
  breakfast: 'pi pi-sun',
  lunch: 'pi pi-objects-column',
  dinner: 'pi pi-shop',
  beverages: 'pi pi-cup',
  desserts: 'pi pi-star'
};

const DEFAULT_CATEGORY_ICON = 'pi pi-shopping-bag';
const ACTIVE_HELD_ORDER_STORAGE_KEY = 'activeHeldOrder';

@Component({
  selector: 'app-order-screen',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, TagModule],
  templateUrl: './order-screen.component.html',
  styleUrl: './order-screen.component.css'
})
export class OrderScreenComponent implements OnInit {
  private readonly changeDetector = inject(ChangeDetectorRef);
  readonly orderTypes: OrderType[] = ['Dine In', 'Take Away', 'Delivery'];
  tables: string[] = [];

  categories: MenuCategory[] = [ALL_CATEGORY];
  subCategories: MenuSubCategory[] = [ALL_SUBCATEGORY];
  visibleSubCategories: MenuSubCategory[] = [ALL_SUBCATEGORY];
  allMenuItems: MenuItem[] = [];
  menuItems: MenuItem[] = [];
  filteredMenuItems: MenuItem[] = [];
  isLoading = false;
  isCategoryLoading = false;
  isSubCategoryLoading = false;
  isMenuLoading = false;
  isTableLoading = false;
  activeCategory = 'All';
  activeCategoryId = 0;
  activeSubCategory = 'All';
  activeSubCategoryId = 0;
  activeSubCategoryCategoryId = 0;
  hasSelectedSubCategory = true;
  activeOrderType: OrderType = 'Dine In';
  currentHeldOrderId = 0;
  currentOrderNumber = '';
  selectedTable = ALL_TABLE;
  customerName = '';
  currentCustomerDetails: CurrentCustomerDetails = this.getDefaultCustomerDetails();
  searchText = '';
  discountPercent = 5;
  taxPercent = 5;
  cartItems: CartItem[] = [];
  itemCount = 0;
  subtotal = 0;
  discountAmount = 0;
  taxAmount = 0;
  grandTotal = 0;
  userDetails: any = {};
  orgId = 0;
  branchId = 0;
  isHoldingOrder = false;

  constructor(
    private readonly toast: AppToastService,
    private readonly categoryService: CategoryService,
    private readonly diningTableService: DiningTableService,
    private readonly subCategoryService: subCategoryService,
    private readonly foodmenuService: MenuService,
    private readonly orderHoldService: OrderHoldService,
    private readonly taxService: TaxService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.orgId = Number(this.userDetails.OrgId || 0);
    this.branchId = this.userDetails.IsAdmin === true ? 0 : Number(this.userDetails.BranchId || 0);
    
    setTimeout(async () => {
      await this.loadOrderScreenData();
      await this.loadTaxPercentage();
      this.restoreHeldOrder();
      this.updateOrderSummary();
      this.changeDetector.detectChanges();
    });
  }

  async loadOrderScreenData(): Promise<void> {
    await this.loadCategories();
    await this.loadSubCategories();
    await this.loadMenus();
    await this.loadDiningTables();
  }

  async loadDiningTables(): Promise<void> {
    this.isTableLoading = true;
    this.isLoading = this.isCategoryLoading || this.isSubCategoryLoading || this.isMenuLoading || this.isTableLoading;

    try {
      const response: any = await firstValueFrom(this.diningTableService.getAll(this.orgId, this.branchId));
      const diningTables = (response.result ?? [])
        .filter((row: any) => (row.IsActive === true || row.isactive === true))
        .filter((row: any) => {
          if (!this.branchId) {
            return true;
          }

          return Number(row.BranchId ?? row.branchid ?? row.branchId ?? 0) === this.branchId;
        })
        .sort((a: any, b: any) => Number(a.displayorder ?? 0) - Number(b.displayOrder ?? b.DisplayOrder ?? 0))
        .map((row: any) => String(row.Code ?? row.code ?? row.TableNo ?? row.tableNo ?? row.TableName ?? row.tableName ?? row.Name ?? row.name ?? ''))
        .filter((table: string) => table !== '');

      this.tables = [ALL_TABLE, ...diningTables];

      if (!this.tables.includes(this.selectedTable)) {
        this.selectedTable = ALL_TABLE;
        this.currentCustomerDetails = {
          ...this.currentCustomerDetails,
          table: ALL_TABLE
        };
      }
    } catch {
      this.tables = [ALL_TABLE];
      this.selectedTable = ALL_TABLE;
      this.currentCustomerDetails = {
        ...this.currentCustomerDetails,
        table: ALL_TABLE
      };
      this.toast.error('Load Failed', 'Unable to load dining tables.');
    }

    this.isTableLoading = false;
    this.isLoading = this.isCategoryLoading || this.isSubCategoryLoading || this.isMenuLoading || this.isTableLoading;
  }

  async loadTaxPercentage(): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.taxService.getAll(this.orgId));
      const activeTax = (response.result ?? []).find((row: any) => row.IsActive === true);
      const percentage = Number(activeTax?.Percentage ?? 0);

      if (percentage > 0) {
        this.taxPercent = percentage;
        this.updateOrderSummary();
      }
    } catch {
      this.toast.warn('Tax Not Loaded', 'Using default tax percentage for this order.');
    }
  }

  async loadCategories(): Promise<void> {
    this.isCategoryLoading = true;
    this.isLoading = this.isCategoryLoading || this.isSubCategoryLoading || this.isMenuLoading || this.isTableLoading;

    try {
      const response: any = await firstValueFrom(this.categoryService.getAll(this.orgId));
      const categoryRows = response.result ?? [];
      this.categories = [
        ALL_CATEGORY,
        ...categoryRows
          .filter((row: any) => row.IsActive === true || row.isactive === true)
          .map((row: any) => ({
            id: Number(row.id ?? row.Id ?? 0),
            name: String(row.name ?? row.Name ?? row.code ?? row.Code ?? ''),
            icon: this.getCategoryIcon(String(row.name ?? row.Name ?? row.code ?? row.Code ?? ''))
          }))
      ];

      this.selectCategory(this.categories[0] ?? ALL_CATEGORY);

      this.allMenuItems = this.allMenuItems.map((item) => ({
        ...item,
        category: this.getCategoryName(item.categoryId)
      }));

      this.applyMenuSelection();
    } catch {
      this.toast.error('Load Failed', 'Unable to load categories.');
    }

    this.isCategoryLoading = false;
    this.isLoading = this.isCategoryLoading || this.isSubCategoryLoading || this.isMenuLoading || this.isTableLoading;
  }

  async loadSubCategories(): Promise<void> {
    this.isSubCategoryLoading = true;
    this.isLoading = this.isCategoryLoading || this.isSubCategoryLoading || this.isMenuLoading || this.isTableLoading;

    try {
      const response: any = await firstValueFrom(this.subCategoryService.getAll(this.orgId));

      this.subCategories = [
        ALL_SUBCATEGORY,
        ...(response.result ?? [])
          .filter((row: any) => row.IsActive === true || row.isactive === true)
          .map((row: any) => ({
            id: Number(row.id ?? row.Id ?? 0),
            name: String(row.name ?? row.Name ?? row.code ?? row.Code ?? ''),
            categoryId: Number(row.categoryId ?? row.CategoryId ?? 0)
          }))
      ];

      this.allMenuItems = this.allMenuItems.map((item) => ({
        ...item,
        subCategory: this.getSubCategoryName(item.subCategoryId)
      }));

      this.updateVisibleSubCategories();
      this.applyMenuSelection();
    } catch {
      this.toast.error('Load Failed', 'Unable to load subcategories.');
    }

    this.isSubCategoryLoading = false;
    this.isLoading = this.isCategoryLoading || this.isSubCategoryLoading || this.isMenuLoading || this.isTableLoading;
  }

  async loadMenus(): Promise<void> {
    this.isMenuLoading = true;
    this.isLoading = this.isCategoryLoading || this.isSubCategoryLoading || this.isMenuLoading || this.isTableLoading;
    
    try {
      const response: any = await firstValueFrom(this.foodmenuService.getAll(this.orgId));

      this.allMenuItems = this.getUniqueRowsById(response.result ?? [])
        .filter((row) => row.IsActive === true || row.isactive === true)
        .map((row) => this.mapMenuItem(row));

      if (this.activeCategoryId === 0 && this.activeSubCategoryId === 0) {
        this.menuItems = [...this.allMenuItems];
        this.updateFilteredMenuItems();
      } else {
        this.applyMenuSelection();
      }
    } catch {
      this.toast.error('Load Failed', 'Unable to load menu items.');
    }

    this.isMenuLoading = false;
    this.isLoading = this.isCategoryLoading || this.isSubCategoryLoading || this.isMenuLoading || this.isTableLoading;
  }

  selectCategory(category: MenuCategory): void {
    this.activeCategory = category.name;
    this.activeCategoryId = category.id;
    this.activeSubCategory = 'All';
    this.activeSubCategoryId = 0;
    this.activeSubCategoryCategoryId = 0;
    this.hasSelectedSubCategory = true;
    this.updateVisibleSubCategories();
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
    this.updateFilteredMenuItems();
  }

  applyMenuSelection(): void {
    this.menuItems = this.allMenuItems.filter((item) => {
      const matchesCategory = this.activeCategoryId === 0 || item.categoryId === this.activeCategoryId;
      const matchesSubCategory = this.activeSubCategoryId === 0 ||
        item.subCategoryId === this.activeSubCategoryId ||
        (item.subCategoryId === 0 && item.categoryId === this.activeSubCategoryCategoryId);

      return matchesCategory && matchesSubCategory;
    });
    this.updateFilteredMenuItems();
  }

  addToCart(menuItem: MenuItem): void {
    const existingItem = this.cartItems.find((item) => item.id === menuItem.id);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      this.cartItems = [{ ...menuItem, quantity: 1 }, ...this.cartItems];
    }

    this.updateOrderSummary();
  }

  increaseQuantity(itemId: number): void {
    this.cartItems = this.cartItems.map((item) =>
      item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
    );
    this.updateOrderSummary();
  }

  decreaseQuantity(itemId: number): void {
    this.cartItems = this.cartItems
      .map((item) => item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item)
      .filter((item) => item.quantity > 0);
    this.updateOrderSummary();
  }

  removeItem(itemId: number): void {
    this.cartItems = this.cartItems.filter((item) => item.id !== itemId);
    this.updateOrderSummary();
  }

  clearOrder(): void {
    this.cartItems = [];
    this.discountPercent = 0;
    this.currentHeldOrderId = 0;
    this.currentOrderNumber = '';
    this.customerName = '';
    this.currentCustomerDetails = this.getDefaultCustomerDetails();
    this.updateOrderSummary();
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
    const createdBy = Number(this.userDetails.UserId || this.userDetails.userId || this.userDetails.CreatedBy || 0) || null;
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
      tableid: this.selectedTable === ALL_TABLE ? '' : this.selectedTable,
      ordertype: this.activeOrderType,
      orderstatus: 'Hold',
      itemcount: this.itemCount,
      guestcount: this.itemCount,
      subtotalAmount: this.subtotal,
      taxAmount: this.taxAmount,
      discountAmount: this.discountAmount,
      totalAmount: this.grandTotal,
      shiftid: String(this.userDetails.Shiftid || this.userDetails.ShiftId || this.userDetails.shiftId || ''),
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
  const categoryId = Number(row.categoryId ?? 0);
  const subCategoryId = Number(row.subCategoryId ?? 0);

  return {
    id: Number(row.id ?? 0),
    name: String(row.name ?? row.Name ?? ''),

    categoryId: categoryId,
    category: row.categoryName || this.getCategoryName(categoryId),

    subCategoryId: subCategoryId,
    subCategory: row.subCategoryName || this.getSubCategoryName(subCategoryId),

    price: Number(row.price ?? 0),

    preparationTime: String(row.preparationTime ?? row.PreparationTime ?? ''),
    isPopular: row.isPopular || false
  };
}
  private getCategoryName(categoryId: number): string {
    return this.categories.find((category) => category.id === categoryId)?.name ?? '';
  }

  private getCategoryIcon(categoryName: string): string {
    return CATEGORY_ICON_MAP[categoryName.trim().toLowerCase()] ?? DEFAULT_CATEGORY_ICON;
  }

  private getSubCategoryName(subCategoryId: number): string {
    return this.subCategories.find((subCategory) => subCategory.id === subCategoryId)?.name ?? '';
  }

  private getUniqueRowsById(rows: any[]): any[] {
    const uniqueRows = new Map<number, any>();

    rows.forEach((row) => {
      const id = Number(row.id ?? row.Id ?? 0);

      if (!uniqueRows.has(id)) {
        uniqueRows.set(id, row);
      }
    });

    return [...uniqueRows.values()];
  }

  private updateVisibleSubCategories(): void {
    const rows = this.activeCategoryId === 0
      ? this.subCategories.filter((x) => x.id !== 0)
      : this.subCategories.filter((x) => x.categoryId === this.activeCategoryId);

    this.visibleSubCategories = [ALL_SUBCATEGORY, ...rows];
  }

  private updateFilteredMenuItems(): void {
    const search = this.searchText.trim().toLowerCase();

    this.filteredMenuItems = this.menuItems.filter((item) => {
      if (!search) {
        return true;
      }

      return item.name.toLowerCase().includes(search)
        || item.category.toLowerCase().includes(search)
        || item.subCategory.toLowerCase().includes(search);
    });
  }

  private updateOrderSummary(): void {
    this.itemCount = this.cartItems.reduce((total, item) => total + item.quantity, 0);
    this.subtotal = this.cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
    this.discountAmount = this.subtotal * (this.discountPercent / 100);
    this.taxAmount = Math.max(this.subtotal - this.discountAmount, 0) * (this.taxPercent / 100);
    this.grandTotal = this.subtotal - this.discountAmount + this.taxAmount;

    this.currentCustomerDetails = {
      ...this.currentCustomerDetails,
      guestCount: this.itemCount,
      subtotalAmount: this.subtotal,
      discountAmount: this.discountAmount,
      taxAmount: this.taxAmount,
      totalAmount: this.grandTotal
    };
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
      this.updateOrderSummary();

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
      id: Number(
      
      //  item.ItemId ??
      
        item.Id ?? 0
      ),
      name: this.pickString(item.name, item.ItemName, item.itemName, item.MenuName, item.menuName),
      category: this.pickString(item.category, item.Category, item.categoryName, item.CategoryName),
      categoryId: 0,
      subCategory: this.pickString(item.subCategoryName, item.SubCategoryName, item.subCategory, item.SubCategory),
      subCategoryId: 0,
      price: Number(item.price ?? 0),
      preparationTime: '',
      quantity: Number(item.quantity ?? item.Quantity ?? item.qty ?? item.Qty ?? item.Noofitem ?? item.NoOfItem ?? item.noofitem ?? item.noOfItem ?? 0) || 1,
      note: item.Notes ?? item.notes ?? undefined,
      holdItemId: Number(item.Itemid ?? item.ItemId ?? item.itemid ?? item.itemId ?? item.OrderHoldItemId ?? item.orderHoldItemId ?? item.Id ?? item.id ?? 0)
    };
  }

  private getHeldOrderId(order: HeldOrder): number {
    return Number(order.orderId ?? order.OrderId ?? order.Orderid ?? order.orderid ?? order.Id ?? order.id ?? 0);
  }

  private mapHeldOrderToCustomerDetails(order: HeldOrder): CurrentCustomerDetails {
    const orderItems = this.getHeldOrderItems(order);
    const itemSubtotal = orderItems.reduce((total, item) => {
      const lineTotal = Number(item.Totalprice ?? item.TotalPrice ?? item.totalprice ?? item.totalPrice ?? 0);
      const calculatedLineTotal = this.mapHeldItemToCartItem(item).price * this.mapHeldItemToCartItem(item).quantity;

      return total + (lineTotal || calculatedLineTotal);
    }, 0);
    const source = order as any;
    const orderNumber = this.pickString(source.Ordernumber, source.OrderNumber, source.ordernumber, source.orderNumber, source.OrderNo, source.orderno, source.orderNo);
    const customerName = this.pickString(order.customerName, order.CustomerName, order.customername, order.Name, order.name);
    const subtotalAmount = Number(order.SubtotalAmount ?? order.subtotalAmount ?? 0) || itemSubtotal;
    const discountAmount = Number(order.DiscountAmount ?? order.discountAmount ?? 0);
    const taxAmount = Number(order.TaxAmount ?? order.taxAmount ?? 0) ||
      (Math.max(subtotalAmount - discountAmount, 0) * (this.taxPercent / 100));
    const totalAmount = Number(order.TotalAmount ?? order.totalAmount ?? 0) ||
      (subtotalAmount - discountAmount + taxAmount);

    return {
      orderNumber,
      customerId: Number(order.Customerid ?? order.CustomerId ?? order.customerid ?? order.customerId ?? 0),
      customerName,
      mobileNo: this.pickString(order.MobileNo, order.mobileNo, order.Phone, order.phone),
      emailId: this.pickString(order.EmailId, order.emailId, order.Email, order.email),
      addressLine1: this.pickString(order.AddressLine1, order.addressLine1, order.Address, order.address),
      orderType: this.toOrderType(source.Ordertype ?? source.OrderType ?? source.ordertype ?? source.orderType ?? source.Type ?? source.type),
      table: this.pickString(source.Tableid, source.TableId, source.tableid, source.tableId, source.TableNo, source.tableNo, source.TableName, source.tableName, this.selectedTable),
      guestCount: Number(order.Itemcount ?? order.ItemCount ?? order.itemcount ?? order.itemCount ?? order.Guestcount ?? order.GuestCount ?? order.guestcount ?? order.guestCount ?? 0) ||
        orderItems.reduce((total, item) => total + (Number(item.Quantity ?? item.quantity ?? 0) || 1), 0),
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
      customerName: '',
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
      return Number(order.discountPercent);
    }

    const hasDiscountAmount = order.DiscountAmount !== undefined || order.discountAmount !== undefined;

    const discountAmount = Number(order.DiscountAmount ?? order.discountAmount ?? 0);
    const itemsSubtotal = this.getHeldOrderItems(order).reduce((total, item) => {
      const lineTotal = Number(item.Totalprice ?? item.TotalPrice ?? item.totalprice ?? item.totalPrice ?? 0);
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

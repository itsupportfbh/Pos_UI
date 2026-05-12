import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { firstValueFrom } from 'rxjs';

import { AppToastService } from '../../../services/app-toast.service';
import { CategoryService } from '../../../services/Category.service';
import { DiningTableService } from '../../../services/diningtable.service';
import { MenuService } from '../../../services/FoodMenu.service';
import { subCategoryService } from '../../../services/SubCategory.service';
import { TaxService } from '../../../services/tax.service';

const ALL_CATEGORY = { id: 0, name: 'All', icon: 'pi pi-th-large' };
const ALL_SUBCATEGORY = { id: 0, name: 'All', categoryId: 0 };
const ALL_TABLE = 'All';

const CATEGORY_ICON_MAP: Record<string, string> = {
  breakfast: 'pi pi-sun',
  lunch: 'pi pi-objects-column',
  dinner: 'pi pi-shop',
  beverages: 'pi pi-cup',
  desserts: 'pi pi-star'
};

const DEFAULT_CATEGORY_ICON = 'pi pi-shopping-bag';

@Component({
  selector: 'app-order-screen',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, TagModule],
  templateUrl: './order-screen.component.html',
  styleUrl: './order-screen.component.css'
})
export class OrderScreenComponent implements OnInit {
  private readonly changeDetector = inject(ChangeDetectorRef);
  readonly orderTypes = ['Dine In', 'Take Away', 'Delivery'];

  userDetails: any = {};
  orgId = 0;
  branchId = 0;

  categories: any[] = [ALL_CATEGORY];
  subCategories: any[] = [ALL_SUBCATEGORY];
  visibleSubCategories: any[] = [ALL_SUBCATEGORY];
  tables: string[] = [ALL_TABLE];
  allMenuItems: any[] = [];
  menuItems: any[] = [];
  filteredMenuItems: any[] = [];
  cartItems: any[] = [];

  isLoading = false;
  isCategoryLoading = false;
  isSubCategoryLoading = false;
  isMenuLoading = false;
  isTableLoading = false;

  activeCategoryId = 0;
  activeSubCategoryId = 0;
  activeOrderType = 'Dine In';
  selectedTable = ALL_TABLE;
  searchText = '';
  customerName = '';
  customerPhone = '';

  itemCount = 0;
  subtotal = 0;
  discountPercent = 5;
  discountAmount = 0;
  taxPercent = 5;
  taxAmount = 0;
  grandTotal = 0;

  constructor(
    private readonly toast: AppToastService,
    private readonly categoryService: CategoryService,
    private readonly diningTableService: DiningTableService,
    private readonly subCategoryService: subCategoryService,
    private readonly foodmenuService: MenuService,
    private readonly taxService: TaxService
  ) {}

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.orgId = Number(this.userDetails.OrgId || 0);
    this.branchId = this.userDetails.IsAdmin === true ? 0 : Number(this.userDetails.BranchId || 0);

    setTimeout(async () => {
      await this.loadOrderScreenData();
      await this.loadTaxPercentage();
      this.updateBillingSummary();
      this.changeDetector.detectChanges();
    });
  }

  async loadOrderScreenData(): Promise<void> {
    await this.loadCategories();
    await this.loadSubCategories();
    await this.loadMenus();
    await this.loadDiningTables();
  }

  async loadCategories(): Promise<void> {
    this.isCategoryLoading = true;
    this.isLoading = true;

    try {
      const response: any = await firstValueFrom(this.categoryService.getAll(this.orgId));
      const categories = response?.result ?? [];
      const activeCategories = categories.filter((x: any) => x.isactive === true);

      this.categories = [
        ALL_CATEGORY,
        ...activeCategories.map((x: any) => ({
          id: x.id ?? 0,
          name: x.name ?? '',
          icon: this.getCategoryIcon(x.name ?? '')
        }))
      ];

      this.activeCategoryId = 0;
      this.updateVisibleSubCategories();
      this.applyMenuSelection();
    } catch {
      this.toast.error('Load Failed', 'Unable to load categories.');
    }

    this.isCategoryLoading = false;
    this.isLoading = false;
  }

  async loadSubCategories(): Promise<void> {
    this.isSubCategoryLoading = true;
    this.isLoading = true;

    try {
      const response: any = await firstValueFrom(this.subCategoryService.getAll(this.orgId));
      const subCategories = response?.result ?? [];
      const activeSubCategories = subCategories.filter((x: any) => x.isactive === true);

      this.subCategories = [
        ALL_SUBCATEGORY,
        ...activeSubCategories.map((x: any) => ({
          id: x.id ?? 0,
          name: x.name ?? '',
          categoryId: x.categoryId ?? 0
        }))
      ];

      this.updateVisibleSubCategories();
      this.applyMenuSelection();
    } catch {
      this.toast.error('Load Failed', 'Unable to load subcategories.');
    }

    this.isSubCategoryLoading = false;
    this.isLoading = false;
  }

  async loadMenus(): Promise<void> {
    this.isMenuLoading = true;
    this.isLoading = true;

    try {
      const response: any = await firstValueFrom(this.foodmenuService.getAll(this.orgId));
      const menus = response?.result ?? [];
      const activeMenus = menus.filter((x: any) => x.isactive === true);

      this.allMenuItems = activeMenus.map((menu: any) => ({
        id: menu.id ?? 0,
        name: menu.name ?? '',
        categoryId: menu.categoryId ?? 0,
        category: menu.categoryname ?? this.getCategoryName(menu.categoryId ?? 0),
        subCategoryId: menu.subCategoryId ?? 0,
        subCategory: menu.subCategoryName ?? this.getSubCategoryName(menu.subCategoryId ?? 0),
        price: menu.price ?? 0,
        preparationTime: '',
        isPopular: false
      }));

      this.applyMenuSelection();
    } catch {
      this.toast.error('Load Failed', 'Unable to load menu items.');
    }

    this.isMenuLoading = false;
    this.isLoading = false;
  }

  async loadDiningTables(): Promise<void> {
    this.isTableLoading = true;
    this.isLoading = true;

    try {
      const response: any = await firstValueFrom(this.diningTableService.getAll(this.orgId, this.branchId));
      const diningTables = response?.result ?? [];
      const activeDiningTables = diningTables.filter((x: any) => x.isactive === true);
      const currentBranchDiningTables = activeDiningTables.filter((x: any) => !this.branchId || Number(x.branchid || 0) === this.branchId);

      this.tables = [
        ALL_TABLE,
        ...currentBranchDiningTables.map((table: any) => table.code ?? table.name ?? '')
          .filter((x: string) => x !== '')
      ];

      if (!this.tables.includes(this.selectedTable)) {
        this.selectedTable = ALL_TABLE;
      }
    } catch {
      this.tables = [ALL_TABLE];
      this.selectedTable = ALL_TABLE;
      this.toast.error('Load Failed', 'Unable to load dining tables.');
    }

    this.isTableLoading = false;
    this.isLoading = false;
  }

  async loadTaxPercentage(): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.taxService.getAll(this.orgId));
      const taxes = response?.result ?? [];
      const activeTax = taxes.find((x: any) => x.IsActive === true);
      const percentage = Number(activeTax?.Percentage || 0);

      if (percentage > 0) {
        this.taxPercent = percentage;
        this.updateBillingSummary();
      }
    } catch {
      this.toast.warn('Tax Not Loaded', 'Using default tax percentage for this order.');
    }
  }

  selectCategory(category: any): void {
    this.activeCategoryId = category.id ?? 0;
    this.activeSubCategoryId = 0;
    this.updateVisibleSubCategories();
    this.applyMenuSelection();
  }

  selectSubCategory(subCategory: any): void {
    this.activeSubCategoryId = subCategory.id ?? 0;
    this.applyMenuSelection();
  }

  selectOrderType(orderType: string): void {
    this.activeOrderType = orderType;
  }

  selectTable(table: string): void {
    this.selectedTable = table;
  }

  updateSearchText(event: Event): void {
    this.searchText = (event.target as HTMLInputElement).value;
    this.updateFilteredMenuItems();
  }

  updateCustomerName(event: Event): void {
    this.customerName = (event.target as HTMLInputElement).value;
  }

  updateCustomerPhone(event: Event): void {
    this.customerPhone = (event.target as HTMLInputElement).value;
  }

  applyMenuSelection(): void {
    this.menuItems = this.allMenuItems
      .filter((x: any) => this.activeCategoryId === 0 || x.categoryId === this.activeCategoryId)
      .filter((x: any) => this.activeSubCategoryId === 0 || x.subCategoryId === this.activeSubCategoryId);

    this.updateFilteredMenuItems();
  }

  addToCart(item: any): void {
    const existing = this.cartItems.find((x: any) => x.id === item.id);

    if (existing) {
      existing.quantity += 1;
    } else {
      this.cartItems = [{ ...item, quantity: 1 }, ...this.cartItems];
    }

    this.updateBillingSummary();
  }

  increaseQuantity(itemId: number): void {
    this.cartItems = this.cartItems.map((x: any) =>
      x.id === itemId ? { ...x, quantity: x.quantity + 1 } : x
    );
    this.updateBillingSummary();
  }

  decreaseQuantity(itemId: number): void {
    this.cartItems = this.cartItems
      .map((x: any) => x.id === itemId ? { ...x, quantity: x.quantity - 1 } : x)
      .filter((x: any) => x.quantity > 0);

    this.updateBillingSummary();
  }

  removeItem(itemId: number): void {
    this.cartItems = this.cartItems.filter((x: any) => x.id !== itemId);
    this.updateBillingSummary();
  }

  clearOrder(): void {
    this.cartItems = [];
    this.discountPercent = 5;
    this.customerName = '';
    this.customerPhone = '';
    this.updateBillingSummary();
  }

  sendToKitchen(): void {
    this.toast.info('Pending', 'You can add kitchen logic later.');
  }

  settlePayment(): void {
    this.toast.info('Pending', 'You can add payment logic later.');
  }

  holdOrder(): void {
    this.toast.info('Pending', 'You can add hold order logic later.');
  }

  private updateVisibleSubCategories(): void {
    const rows = this.activeCategoryId === 0
      ? this.subCategories.filter((x: any) => x.id !== 0)
      : this.subCategories.filter((x: any) => x.categoryId === this.activeCategoryId);

    this.visibleSubCategories = [ALL_SUBCATEGORY, ...rows.map((subCategory: any) => ({
      id: subCategory.id ?? 0,
      name: subCategory.name ?? '',
      categoryId: subCategory.categoryId ?? 0
    }))];
  }

  private updateFilteredMenuItems(): void {
    const search = this.searchText.trim().toLowerCase();

    this.filteredMenuItems = this.menuItems.filter((x: any) => {
      if (!search) {
        return true;
      }

      return String(x.name ?? '').toLowerCase().includes(search)
        || String(x.category ?? '').toLowerCase().includes(search)
        || String(x.subCategory ?? '').toLowerCase().includes(search);
    });
  }

  private updateBillingSummary(): void {
    this.itemCount = this.cartItems.reduce((total: number, x: any) => total + Number(x.quantity || 0), 0);
    this.subtotal = this.cartItems.reduce((total: number, x: any) => total + (Number(x.price || 0) * Number(x.quantity || 0)), 0);
    this.discountAmount = this.subtotal * (this.discountPercent / 100);
    this.taxAmount = Math.max(this.subtotal - this.discountAmount, 0) * (this.taxPercent / 100);
    this.grandTotal = this.subtotal - this.discountAmount + this.taxAmount;
  }

  private getCategoryName(categoryId: number): string {
    return this.categories.find((x: any) => x.id === categoryId)?.name ?? '';
  }

  private getSubCategoryName(subCategoryId: number): string {
    return this.subCategories.find((x: any) => x.id === subCategoryId)?.name ?? '';
  }

  private getCategoryIcon(categoryName: string): string {
    return CATEGORY_ICON_MAP[categoryName.trim().toLowerCase()] ?? DEFAULT_CATEGORY_ICON;
  }
}

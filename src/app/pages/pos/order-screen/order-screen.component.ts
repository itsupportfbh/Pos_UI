import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { firstValueFrom } from 'rxjs';

import { AppToastService } from '../../../services/app-toast.service';
import { BranchService } from '../../../services/branch.service';
import { CategoryService } from '../../../services/Category.service';
import { ComboMenuService } from '../../../services/combo-menu.service';
import { CounterService } from '../../../services/counter.service';
import { DiningTableService } from '../../../services/diningtable.service';
import { DisplayMenuItemsService } from '../../../services/display-menu-items.service';
import { FloorService } from '../../../services/floor.service';
import { MenuService } from '../../../services/FoodMenu.service';
import { OrderHold, OrderHoldItem, OrderHoldService } from '../../../services/order-hold.service';
import { subCategoryService } from '../../../services/SubCategory.service';
import { TaxService } from '../../../services/tax.service';

const ALL_CATEGORY = { id: 0, name: 'All', icon: 'pi pi-th-large' };
const ALL_SUBCATEGORY = { id: 0, name: 'All', categoryId: 0 };
const ALL_FLOOR = { id: 0, name: 'All' };
const ALL_TABLE = 'All';
const ACTIVE_HELD_ORDER_STORAGE_KEY = 'activeHeldOrder';

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
  private readonly router = inject(Router);
  readonly orderTypes = ['Dine In', 'Take Away', 'Delivery'];

  userDetails: any = {};
  orgId = 0;
  branchId = 0;
  organizationName = '';
  branchName = '';

  categories: any[] = [ALL_CATEGORY];
  subCategories: any[] = [ALL_SUBCATEGORY];
  visibleSubCategories: any[] = [ALL_SUBCATEGORY];
  floors: any[] = [ALL_FLOOR];
  allDiningTables: any[] = [];
  tables: string[] = [ALL_TABLE];
  tableIdByName: Record<string, number> = {};
  allMenuItems: any[] = [];
  menuItems: any[] = [];
  filteredMenuItems: any[] = [];
  cartItems: any[] = [];
  currentHeldOrder: any = null;

  isLoading = false;
  isCategoryLoading = false;
  isSubCategoryLoading = false;
  isMenuLoading = false;
  isFloorLoading = false;
  isTableLoading = false;
  isHoldingOrder = false;
  isSendingToKitchen = false;

  activeCategoryId = 0;
  activeSubCategoryId = 0;
  activeFloorId = 0;
  activeOrderType = 'Dine In';
  selectedTable = ALL_TABLE;
  currentOrderNumber = '';
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
    private readonly branchService: BranchService,
    private readonly categoryService: CategoryService,
    private readonly comboMenuService: ComboMenuService,
    private readonly counterService: CounterService,
    private readonly diningTableService: DiningTableService,
    private readonly floorService: FloorService,
    private readonly subCategoryService: subCategoryService,
    private readonly foodmenuService: MenuService,
    private readonly orderHoldService: OrderHoldService,
    private readonly displayMenuItemsService: DisplayMenuItemsService,
    private readonly taxService: TaxService
  ) {}

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.orgId = Number(this.userDetails.OrgId || 0);
    this.branchId = this.userDetails.IsAdmin === true || Number(this.userDetails.RoleId || 0) === 1
      ? 0
      : Number(this.userDetails.BranchId || 0);
    this.currentOrderNumber = this.generateHoldOrderNumber();

    setTimeout(async () => {
      await this.loadOrderContextNames();
      await this.loadOrderScreenData();
      await this.loadTaxPercentage();
      this.bindActiveHeldOrder();
      this.updateBillingSummary();
      this.changeDetector.detectChanges();
    });
  }

  async loadOrderContextNames(): Promise<void> {
    this.organizationName = this.getStringValue(this.userDetails, 'OrgName', 'OrganizationName', 'organizationName');
    this.branchName = this.getStringValue(this.userDetails, 'BranchName', 'branchName');
    const counterOrgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : this.orgId;
    const counterBranchId = Number(this.userDetails.IsAdmin || 0) === 1
      ? 0
      : Number(this.userDetails.RoleId || 0) === 1
        ? 0
        : Number(this.userDetails.BranchId || 0);

    try {
      const response: any = await firstValueFrom(this.counterService.getAll(counterOrgId, counterBranchId));
      const counterRows = response?.result ?? [];
      const counterRow = counterRows.find((row: any) => Number(row.BranchId || 0) === this.branchId) ?? counterRows[0] ?? null;
      this.organizationName = this.getStringValue(counterRow, 'OrganizationName', 'OrgName', 'organizationName') || this.organizationName;
      this.branchName = this.getStringValue(counterRow, 'BranchName', 'Branch', 'branchName') || this.branchName;
    } catch {
      this.toast.warn('Counter Details Not Loaded', 'Using login organization and branch details for this order.');
    }

    if (!this.branchId || this.branchName) {
      this.branchName = this.branchName || 'All Branches';
      return;
    }

    try {
      const response: any = await firstValueFrom(this.branchService.getAll(this.orgId));
      const branchList = response?.result ?? [];
      const branch = branchList.find((x: any) => Number(x.Id || 0) === this.branchId);
      this.branchName = this.getStringValue(branch, 'Name', 'name', 'BranchName', 'branchName') || this.branchName;
    } catch {
      this.toast.warn('Branch Not Loaded', 'Using login branch details for this order.');
    }
  }

  async loadOrderScreenData(): Promise<void> {
    await this.loadCategories();
    await this.loadSubCategories();
    await this.loadMenus();
    await this.loadComboMenus();
    await this.loadFloors();
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
        id: this.getNumberValue(menu, 'id', 'Id'),
        cartKey: 'menu-' + this.getNumberValue(menu, 'id', 'Id'),
        itemType: 'Menu',
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

  async loadComboMenus(): Promise<void> {
    this.isMenuLoading = true;
    this.isLoading = true;

    try {
      const response: any = await firstValueFrom(this.comboMenuService.getAll(this.orgId));
      const combos = this.getResponseList(response);
      const activeCombos = combos.filter((x: any) => this.getBooleanValue(x, 'isactive', 'IsActive', 'isActive'));
      const comboMenuItems = activeCombos.map((combo: any) => {
        const id = this.getNumberValue(combo, 'id', 'Id');
        const categoryId = this.getNumberValue(combo, 'categoryId', 'CategoryId');
        const subCategoryId = this.getNumberValue(combo, 'subCategoryId', 'SubCategoryId');
        const itemCount = this.getComboItems(combo).length;

        return {
          id,
          comboMenuId: id,
          cartKey: 'combo-' + id,
          itemType: 'Combo',
          name: this.getStringValue(combo, 'name', 'Name'),
          categoryId,
          category: this.getStringValue(combo, 'categoryname', 'CategoryName') || this.getCategoryName(categoryId),
          subCategoryId,
          subCategory: this.getStringValue(combo, 'subcategoryname', 'SubCategoryName') || this.getSubCategoryName(subCategoryId),
          price: this.getNumberValue(combo, 'price', 'Price'),
          preparationTime: itemCount ? itemCount + ' items combo' : 'Combo',
          isPopular: false,
          comboItems: this.getComboItems(combo)
        };
      });

      this.allMenuItems = [...this.allMenuItems, ...comboMenuItems];
      this.applyMenuSelection();
    } catch {
      this.toast.error('Load Failed', 'Unable to load combo menu items.');
    }

    this.isMenuLoading = false;
    this.isLoading = false;
  }

  async loadDiningTables(): Promise<void> {
    this.isTableLoading = true;
    this.isLoading = true;

    try {
      const response: any = await firstValueFrom(this.diningTableService.getAll(this.getScopedOrgId(), this.getScopedBranchId()));
      const diningTables = response?.result ?? [];
      const activeDiningTables = diningTables.filter((x: any) => this.getBooleanValue(x, 'isactive', 'IsActive', 'isActive'));
      const currentBranchDiningTables = activeDiningTables.filter((x: any) =>
        !this.getScopedBranchId() || this.getNumberValue(x, 'branchid', 'branchId', 'BranchId') === this.getScopedBranchId()
      );

      this.allDiningTables = currentBranchDiningTables;
      this.updateVisibleTables();
    } catch {
      this.allDiningTables = [];
      this.tables = [ALL_TABLE];
      this.tableIdByName = {};
      this.selectedTable = ALL_TABLE;
      this.toast.error('Load Failed', 'Unable to load dining tables.');
    }

    this.isTableLoading = false;
    this.isLoading = false;
  }

  async loadFloors(): Promise<void> {
    this.isFloorLoading = true;
    this.isLoading = true;

    try {
      const response: any = await firstValueFrom(this.floorService.getAll(this.getScopedOrgId(), this.getScopedBranchId()));
      const floors = response?.result ?? [];
      const activeFloors = floors
        .filter((x: any) => this.getBooleanValue(x, 'IsActive', 'isActive', 'isactive'))
        .filter((x: any) => !this.getScopedBranchId() || this.getNumberValue(x, 'BranchId', 'branchId', 'branchid') === this.getScopedBranchId());

      this.floors = [
        ALL_FLOOR,
        ...activeFloors
          .map((floor: any) => ({
            id: this.getNumberValue(floor, 'Id', 'id'),
            name: this.getStringValue(floor, 'Name', 'name', 'Code', 'code')
          }))
          .filter((floor: any) => floor.id > 0 && floor.name)
      ];

      if (!this.floors.some((floor: any) => Number(floor.id) === this.activeFloorId)) {
        this.activeFloorId = 0;
      }
    } catch {
      this.floors = [ALL_FLOOR];
      this.activeFloorId = 0;
      this.toast.error('Load Failed', 'Unable to load floors.');
    }

    this.isFloorLoading = false;
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

  selectFloor(floor: any): void {
    this.activeFloorId = Number(floor?.id || 0);
    this.updateVisibleTables();
  }

  selectTable(table: string): void {
    this.selectedTable = table;
  }

  get selectedTableWithFloorName(): string {
    if (this.selectedTable === ALL_TABLE) {
      return ALL_TABLE;
    }

    const floorName = this.getSelectedTableFloorName();
    return floorName ? `${this.selectedTable} - ${floorName}` : this.selectedTable;
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
    const existing = this.cartItems.find((x: any) => x.cartKey === item.cartKey);

    if (existing) {
      existing.quantity += 1;
    } else {
      this.cartItems = [{ ...item, quantity: 1 }, ...this.cartItems];
    }

    this.updateBillingSummary();
  }

  increaseQuantity(itemKey: string): void {
    this.cartItems = this.cartItems.map((x: any) =>
      x.cartKey === itemKey ? { ...x, quantity: x.quantity + 1 } : x
    );
    this.updateBillingSummary();
  }

  decreaseQuantity(itemKey: string): void {
    this.cartItems = this.cartItems
      .map((x: any) => x.cartKey === itemKey ? { ...x, quantity: x.quantity - 1 } : x)
      .filter((x: any) => x.quantity > 0);

    this.updateBillingSummary();
  }

  removeItem(itemKey: string): void {
    this.cartItems = this.cartItems.filter((x: any) => x.cartKey !== itemKey);
    this.updateBillingSummary();
  }

  clearOrder(): void {
    this.cartItems = [];
    this.currentHeldOrder = null;
    this.currentOrderNumber = this.generateHoldOrderNumber();
    this.discountPercent = 5;
    this.customerName = '';
    this.customerPhone = '';
    this.updateBillingSummary();
  }

  sendToKitchen(): void {
    
    if (!this.cartItems.length) {
      this.toast.warn('No Items', 'Add at least one item before sending to kitchen.');
      return;
    }

    if (this.isSendingToKitchen) {
      return;
    }

    this.isSendingToKitchen = true;
    this.updateBillingSummary();

    let orderPayload: any;
    let request: any;

    try {
      orderPayload = this.buildOrderApiPayload('In Kitchen');
      request = Number(orderPayload?.Orderid || 0) > 0
        ? this.displayMenuItemsService.update(orderPayload)
        : this.displayMenuItemsService.create(orderPayload);
    } catch (error) {
      this.isSendingToKitchen = false;
      console.error('Kitchen payload build failed', error);
      this.toast.error('Kitchen Failed', 'Unable to prepare this order for kitchen.');
      return;
    }

    request.subscribe({
      next: () => {
        const orderNumber = orderPayload?.OrderNumber || orderPayload?.orderNumber || this.generateKitchenOrderNumber();
        this.toast.success('Sent to Kitchen', `${orderNumber} sent to kitchen display.`);
        this.clearOrder();
        //this.router.navigate(['/pos/kitchen-display']);
      },
      error: () => {
        this.isSendingToKitchen = false;
        this.toast.error('Kitchen Failed', 'Unable to save order status as In Kitchen.');
      },
      complete: () => {
        this.isSendingToKitchen = false;
      }
    });
  }

  settlePayment(): void {
    this.toast.info('Pending', 'You can add payment logic later.');
  }

  holdOrder(): void {
  debugger;

  if (!this.cartItems.length) {
    this.toast.warn('No Items', 'Add at least one item before holding the order.');
    return;
  }

  if (this.isHoldingOrder) {
    return;
  }

  this.updateBillingSummary();
  this.isHoldingOrder = true;

  const payload = this.buildHoldOrderPayload();

  // ✅ If Orderid exists, update. Otherwise, create.
  const request$ = payload.Orderid && payload.Orderid > 0
    ? this.orderHoldService.update(payload)
    : this.orderHoldService.create(payload);

  request$.subscribe({
    next: () => {
      const msg = payload.Orderid && payload.Orderid > 0
        ? `${payload.Ordernumber} updated in hold orders.`
        : `${payload.Ordernumber} saved to hold orders.`;

      this.toast.success('Order Held', msg);
      this.clearOrder();
    },
    error: () => {
      this.isHoldingOrder = false;
      this.toast.error('Hold Failed', 'Unable to save this order to hold.');
    },
    complete: () => {
      this.isHoldingOrder = false;
    }
  });
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
        || String(x.subCategory ?? '').toLowerCase().includes(search)
        || String(x.itemType ?? '').toLowerCase().includes(search);
    });
  }

  private updateVisibleTables(): void {
    const diningTables = this.allDiningTables.filter((table: any) =>
      this.activeFloorId === 0 || this.getNumberValue(table, 'floorId', 'FloorId', 'floorid') === this.activeFloorId
    );

    this.tables = [
      ALL_TABLE,
      ...diningTables.map((table: any) => this.getStringValue(table, 'code', 'Code', 'name', 'Name'))
        .filter((x: string) => x !== '')
    ];

    this.tableIdByName = diningTables.reduce((lookup: Record<string, number>, table: any) => {
      const tableId = this.getNumberValue(table, 'id', 'Id');
      const code = this.getStringValue(table, 'code', 'Code');
      const name = this.getStringValue(table, 'name', 'Name');

      if (code) {
        lookup[code] = tableId;
      }

      if (name) {
        lookup[name] = tableId;
      }

      return lookup;
    }, {});

    if (!this.tables.includes(this.selectedTable)) {
      this.selectedTable = ALL_TABLE;
    }
  }

  private updateBillingSummary(): void {
    this.itemCount = this.cartItems.reduce((total: number, x: any) => total + Number(x.quantity || 0), 0);
    this.subtotal = this.cartItems.reduce((total: number, x: any) => total + (Number(x.price || 0) * Number(x.quantity || 0)), 0);
    this.discountAmount = this.subtotal * (this.discountPercent / 100);
    this.taxAmount = Math.max(this.subtotal - this.discountAmount, 0) * (this.taxPercent / 100);
    this.grandTotal = this.subtotal - this.discountAmount + this.taxAmount;
  }

  private bindActiveHeldOrder(): void {
    const storedOrder = localStorage.getItem(ACTIVE_HELD_ORDER_STORAGE_KEY);

    if (!storedOrder) {
      return;
    }

    try {
      const heldOrder = JSON.parse(storedOrder);
      this.currentHeldOrder = heldOrder;
      this.currentOrderNumber = this.getOrderNumber(heldOrder) || this.currentOrderNumber;
      this.activeOrderType = this.getStringValue(heldOrder, 'Ordertype', 'ordertype', 'orderType', 'OrderType') || this.activeOrderType;
      this.selectedTable = this.getTableDisplayValue(heldOrder) || ALL_TABLE;
      this.customerName = this.getStringValue(heldOrder, 'customerName', 'CustomerName', 'GuestName', 'guestName');
      this.customerPhone = this.getStringValue(heldOrder, 'customerPhone', 'CustomerPhone', 'Phone', 'phone');

      if (this.selectedTable && !this.tables.includes(this.selectedTable)) {
        this.tables = [...this.tables, this.selectedTable];
      }

      this.cartItems = this.mapHeldOrderItems(heldOrder);
      this.applyHeldOrderTotals(heldOrder);
      localStorage.removeItem(ACTIVE_HELD_ORDER_STORAGE_KEY);
    } catch {
      localStorage.removeItem(ACTIVE_HELD_ORDER_STORAGE_KEY);
      this.toast.warn('Held Order Not Loaded', 'Unable to bind the reopened held order details.');
    }
  }

  private mapHeldOrderItems(heldOrder: any): any[] {
    const items = this.getHeldOrderItems(heldOrder);

    return items.map((item: any, index: number) => {

      const menuItemId = this.getStringValue(item, 'Menuitemid', 'menuitemid', 'MenuItemId', 'menuItemId', 'FoodMenuId', 'foodMenuId');
      const comboMenuId = this.getNumberValue(item, 'ComboMenuId', 'comboMenuId', 'Combomenuid', 'combomenuid');
      const comboMenuItemId = this.getNumberValue(item, 'ComboMenuItemId', 'comboMenuItemId', 'Combomenuitemid', 'combomenuitemid');
      const isCombo = comboMenuId > 0
        || comboMenuItemId > 0
        || menuItemId.startsWith('combo-')
        || this.getStringValue(item, 'Notes', 'notes').toLowerCase().includes('combo');
      const numericId = isCombo
        ? (comboMenuId || comboMenuItemId || this.parseMenuItemId(menuItemId))
        : (this.parseMenuItemId(menuItemId) || this.getNumberValue(item, 'FoodMenuId', 'foodMenuId', 'MenuItemId', 'menuItemId'));
      const quantity = this.getNumberValue(item, 'Quantity', 'quantity', 'Qty', 'qty') || 1;
      const unitPrice = this.getNumberValue(item, 'Unitprice', 'unitprice', 'UnitPrice', 'unitPrice', 'price', 'Price');
      const cartKey = isCombo
        ? (menuItemId.startsWith('combo-') ? menuItemId : 'combo-' + (numericId || index + 1))
        : 'menu-' + numericId;
      const existingMenuItem = this.allMenuItems.find((menuItem: any) =>
        menuItem.cartKey === cartKey ||
        (menuItem.itemType === (isCombo ? 'Combo' : 'Menu') && Number(menuItem.id) === numericId) ||
        (numericId === 0 && menuItem.itemType === (isCombo ? 'Combo' : 'Menu') && menuItem.name === this.getStringValue(item, 'Itemname', 'itemname', 'ItemName', 'itemName', 'name', 'Name'))
      );

      return {
        ...(existingMenuItem ?? {}),
        id: numericId || existingMenuItem?.id || 0,
        cartKey: numericId ? cartKey : existingMenuItem?.cartKey || cartKey,
        itemType: isCombo ? 'Combo' : 'Menu',
        ComboMenuId: isCombo ? comboMenuId || numericId || existingMenuItem?.comboMenuId || 0 : 0,
        Combomenuid: isCombo ? comboMenuId || numericId || existingMenuItem?.comboMenuId || 0 : 0,
        ComboMenuItemId: isCombo ? comboMenuItemId || numericId || existingMenuItem?.comboMenuId || 0 : 0,
        Combomenuitemid: isCombo ? comboMenuItemId || numericId || existingMenuItem?.comboMenuId || 0 : 0,
        name: this.getStringValue(item, 'Itemname', 'itemname', 'ItemName', 'itemName', 'name', 'Name') || existingMenuItem?.name || 'Held item',
        category: existingMenuItem?.category ?? '',
        subCategory: existingMenuItem?.subCategory ?? '',
        price: unitPrice || existingMenuItem?.price || 0,
        quantity,
        comboItems: existingMenuItem?.comboItems ?? this.parseComboDetails(item)
      };
    });
  }

  private getHeldOrderItems(heldOrder: any): any[] {
    const items = heldOrder?.Items ??
      heldOrder?.items ??
      heldOrder?.OrderHoldItems ??
      heldOrder?.orderHoldItems ??
      heldOrder?.OrderholdItems ??
      heldOrder?.orderholdItems ??
      [];

    return Array.isArray(items) ? items : [];
  }

  private applyHeldOrderTotals(heldOrder: any): void {
    const heldSubtotal = this.getNumberValue(heldOrder, 'SubtotalAmount', 'subtotalAmount', 'subtotal');
    const heldDiscountAmount = this.getNumberValue(heldOrder, 'DiscountAmount', 'discountAmount');
    const heldTaxAmount = this.getNumberValue(heldOrder, 'TaxAmount', 'taxAmount');

    if (heldSubtotal > 0) {
      this.discountPercent = heldDiscountAmount > 0 ? (heldDiscountAmount / heldSubtotal) * 100 : 0;
      const taxableAmount = Math.max(heldSubtotal - heldDiscountAmount, 0);
      this.taxPercent = taxableAmount > 0 && heldTaxAmount > 0 ? (heldTaxAmount / taxableAmount) * 100 : this.taxPercent;
    }
  }

  private parseMenuItemId(value: string): number {
    const match = value.match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  private parseComboDetails(item: any): any[] {
    const modifierDetails = this.getStringValue(item, 'Modifierdetails', 'modifierdetails');

    if (!modifierDetails) {
      return [];
    }

    try {
      const parsed = JSON.parse(modifierDetails);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private buildOrderApiPayload(status: 'Hold' | 'In Kitchen' = 'In Kitchen'): any {
    const userId = this.getNumberValue(this.userDetails, 'UserId', 'userId', 'Id', 'id');
    const orderId = this.getCurrentOrderId();
    const orderNumber = this.currentOrderNumber || this.getOrderNumber(this.currentHeldOrder) || this.generateHoldOrderNumber();
    const now = new Date().toISOString();

    return {
      Orderid: orderId || 0,
      OrderNumber: orderNumber,
      TableId: String(this.getSelectedTableId()),
      OrderType: this.activeOrderType,
      OrderStatus: status,
      ItemCount: this.itemCount,
      SubtotalAmount: this.subtotal,
      TaxAmount: this.taxAmount,
      DiscountAmount: this.discountAmount,
      TotalAmount: this.grandTotal,
      ShiftId: String(this.getCurrentShiftId()),
      CreatedBy: userId || 0,
      CreatedDate: now,
      UpdatedBy: userId || 0,
      UpdatedDate: now,
      IsDeleted: false,
      OrgId: this.orgId,
      BranchId: this.branchId,
      Items: this.buildOrderApiItems(userId, status, orderId || 0, now)
    };
  }

  private buildOrderApiItems(userId: number, status: 'Hold' | 'In Kitchen', orderId: number, timestamp: string): any[] {
    return this.cartItems.map((item: any) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.price || 0);
      const isCombo = item.itemType === 'Combo';
      const comboMenuItemId = isCombo
        ? this.getNumberValue(item, 'ComboMenuItemId', 'comboMenuItemId', 'Combomenuitemid', 'combomenuitemid', 'ComboMenuId', 'comboMenuId', 'id', 'Id') || this.parseMenuItemId(item.cartKey ?? '')
        : 0;
      const modifierDetails = isCombo ? this.buildModifierDetailsJson(item) : null;

      return {
        Itemid: 0,
        Orderid: orderId || 0,
        Menuitemid: isCombo ? 0 : this.getNumberValue(item, 'id', 'Id'),
        ComboMenuItemId: comboMenuItemId,
        Itemname: item.name ?? '',
        Quantity: quantity,
        Unitprice: unitPrice,
        Totalprice: quantity * unitPrice,
        DiscountAmount: 0,
        TaxAmount: 0,
        Modifierdetails: modifierDetails,
        Itemstatus: status,
        Notes: isCombo ? 'Combo Menu' : '',
        OrgId: this.orgId,
        CreatedBy: userId || 0,
        CreatedDate: timestamp,
        UpdatedBy: userId || 0,
        UpdatedDate: timestamp,
        IsDeleted: false
      };
    });
  }

  private generateKitchenOrderNumber(): string {
    const timestamp = new Date();
    const datePart = [
      timestamp.getFullYear(),
      String(timestamp.getMonth() + 1).padStart(2, '0'),
      String(timestamp.getDate()).padStart(2, '0')
    ].join('');
    const timePart = [
      String(timestamp.getHours()).padStart(2, '0'),
      String(timestamp.getMinutes()).padStart(2, '0'),
      String(timestamp.getSeconds()).padStart(2, '0')
    ].join('');

    return `KOT-${datePart}-${timePart}`;
  }

  private buildHoldOrderPayload(status: 'Hold' | 'In Kitchen' = 'Hold'): OrderHold {
    const userId = this.getNumberValue(this.userDetails, 'UserId', 'userId', 'Id', 'id');
    const holdOrderId = this.getCurrentHeldOrderId();
    const orderDetailId = this.getCurrentHeldOrderDetailId();
    const orderNumber = this.currentOrderNumber || this.getOrderNumber(this.currentHeldOrder) || this.generateHoldOrderNumber();
    const items = this.buildHoldOrderItems(userId, status, orderDetailId);
    const tableId = this.getSelectedTableId();
    const shiftId = this.getCurrentShiftId();
    const comboMenuId = this.getCurrentComboMenuId();

    return {
      Id: holdOrderId || undefined,
      Orderid: orderDetailId || holdOrderId || 0,
      Ordernumber: orderNumber,
      Tableid: tableId,
      TableId: tableId,
      ComboMenuId: comboMenuId,
      Combomenuid: comboMenuId,
      
      Ordertype: this.activeOrderType,
      Orderstatus: status,
      CustomerName: this.customerName,
      CustomerPhone: this.customerPhone,
      Itemcount: this.itemCount,
      Guestcount: this.itemCount,
      SubtotalAmount: this.subtotal,
      TaxAmount: this.taxAmount,
      DiscountAmount: this.discountAmount,
      TotalAmount: this.grandTotal,
      Shiftid: shiftId,
      ShiftId: shiftId,
      OrgId: this.orgId,
      BranchId: this.branchId,
      IsActive: true,
      IsDeleted: false,
      CreatedBy: userId || null,
      OrderholdItems: items,
      OrderHoldItems: items,
      Items: items
    };
  }

  private buildHoldOrderItems(userId: number, status: 'Hold' | 'In Kitchen', orderId: number): OrderHoldItem[] {
    
    return this.cartItems.map((item: any) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.price || 0);
      const lineTotal = quantity * unitPrice;
      const isCombo = item.itemType === 'Combo';
      const comboMenuId = isCombo
        ? this.getNumberValue(item, 'ComboMenuId', 'comboMenuId', 'Combomenuid', 'combomenuid', 'id', 'Id') || this.parseMenuItemId(item.cartKey ?? '')
        : 0;
      const comboMenuItemId = isCombo
        ? this.getNumberValue(item, 'ComboMenuItemId', 'comboMenuItemId', 'Combomenuitemid', 'combomenuitemid', 'ComboMenuId', 'comboMenuId', 'id', 'Id') || this.parseMenuItemId(item.cartKey ?? '')
        : 0;

      const payloadItem: OrderHoldItem = {
        itemid: 0,
        Orderid: orderId || 0,
        Menuitemid: String(isCombo ? 0 : item.id),
        ComboMenuId: comboMenuId,
        Combomenuid: comboMenuId,
        ComboMenuItemId: comboMenuItemId,
        Combomenuitemid: comboMenuItemId,
        Itemname: item.name ?? '',
        Quantity: quantity,
        Unitprice: unitPrice,
        Totalprice: lineTotal,
        DiscountAmount: 0,
        TaxAmount: 0,
        Modifierdetails: isCombo ? JSON.stringify(this.buildComboModifierDetails(item)) : null,
        Itemstatus: status,
        Notes: isCombo ? 'Combo Menu' : null,
        OrgId: this.orgId,
        BranchId: this.branchId,
        IsActive: true,
        IsDeleted: false,
        CreatedBy: userId || null
      };

      return payloadItem;
    });
  }

  private getCurrentComboMenuId(): number {
    const comboItem = this.cartItems.find((item: any) => item.itemType === 'Combo');

    if (!comboItem) {
      return 0;
    }

    return this.getNumberValue(comboItem, 'ComboMenuId', 'comboMenuId', 'Combomenuid', 'combomenuid', 'id', 'Id')
      || this.parseMenuItemId(comboItem.cartKey ?? '');
  }

  private getSelectedTableId(): number {
    if (this.selectedTable === ALL_TABLE) {
      return 0;
    }

    return this.tableIdByName[this.selectedTable] ?? this.parseMenuItemId(this.selectedTable);
  }

  private getCurrentShiftId(): number {
    return this.getNumberValue(
      this.userDetails,
      'ShiftId',
      'shiftId',
      'Shiftid',
      'shiftid',
      'CurrentShiftId',
      'currentShiftId'
    );
  }

  private getTableDisplayValue(source: any): string {
    const tableDisplay = this.getStringValue(source, 'table', 'Table', 'TableName', 'tableName', 'TableCode', 'tableCode');

    if (tableDisplay) {
      return tableDisplay;
    }

    const tableId = this.getNumberValue(source, 'Tableid', 'tableid', 'tableId', 'TableId');
    const tableName = Object.keys(this.tableIdByName).find((name) => this.tableIdByName[name] === tableId);

    return tableName || (tableId ? String(tableId) : '');
  }

  private getSelectedTableFloorName(): string {
    const selectedTable = this.getDiningTableByDisplayName(this.selectedTable);

    if (!selectedTable) {
      return '';
    }

    const tableFloorName = this.getStringValue(selectedTable, 'floorname', 'FloorName', 'floorName');

    if (tableFloorName) {
      return tableFloorName;
    }

    const floorId = this.getNumberValue(selectedTable, 'floorId', 'FloorId', 'floorid');
    return this.floors.find((floor: any) => Number(floor.id || 0) === floorId)?.name ?? '';
  }

  private getDiningTableByDisplayName(tableName: string): any {
    return this.allDiningTables.find((table: any) =>
      this.getStringValue(table, 'code', 'Code') === tableName ||
      this.getStringValue(table, 'name', 'Name') === tableName
    );
  }

  private getOrderNumber(source: any): string {
    return this.getStringValue(source, 'Ordernumber', 'ordernumber', 'OrderNo', 'orderNo', 'orderNumber', 'OrderNumber');
  }

  private buildComboModifierDetails(item: any): any[] {
    const comboItems = Array.isArray(item.comboItems) ? item.comboItems : [];

    return comboItems.map((comboItem: any) => ({
      Id: this.getNumberValue(comboItem, 'Id', 'id'),
      ComboMenuId: this.getNumberValue(comboItem, 'ComboMenuId', 'comboMenuId') || this.getNumberValue(item, 'comboMenuId', 'ComboMenuId', 'id', 'Id'),
      FoodMenuId: this.getNumberValue(comboItem, 'FoodMenuId', 'foodMenuId', 'MenuItemId', 'menuItemId'),
      Qty: this.getNumberValue(comboItem, 'Qty', 'qty', 'Quantity', 'quantity') || 1,
      Price: this.getNumberValue(comboItem, 'Price', 'price'),
      Name: this.getStringValue(comboItem, 'Name', 'name', 'FoodMenuName', 'foodMenuName')
    }));
  }

  private buildModifierDetailsJson(item: any): string | null {
    const modifierDetails = this.buildComboModifierDetails(item);

    if (!modifierDetails.length) {
      return null;
    }

    return JSON.stringify(modifierDetails);
  }

  private getCurrentHeldOrderId(): number {
    return this.getNumberValue(
      this.currentHeldOrder,
      'Id',
      'id',
      'HoldId',
      'OrderHoldId',
      'orderHoldId'
    );
  }

  private getCurrentHeldOrderDetailId(): number {
    return this.getNumberValue(
      this.currentHeldOrder,
      'Orderid',
      'OrderId',
      'orderid',
      'orderId'
    ) || this.getCurrentHeldOrderId();
  }

  private getCurrentOrderId(): number {
    return this.getNumberValue(
      this.currentHeldOrder,
      'OrdersId',
      'ordersId',
      'SavedOrderId',
      'savedOrderId',
      'KitchenOrderId',
      'kitchenOrderId'
    );
  }

  private getScopedOrgId(): number {
    return Number(this.userDetails.RoleId || 0) === 1 ? 0 : this.orgId;
  }

  private getScopedBranchId(): number {
    return this.userDetails.IsAdmin === true || Number(this.userDetails.RoleId || 0) === 1
      ? 0
      : this.branchId;
  }

  private generateHoldOrderNumber(): string {
    const timestamp = new Date();
    const datePart = [
      timestamp.getFullYear(),
      String(timestamp.getMonth() + 1).padStart(2, '0'),
      String(timestamp.getDate()).padStart(2, '0')
    ].join('');
    const timePart = [
      String(timestamp.getHours()).padStart(2, '0'),
      String(timestamp.getMinutes()).padStart(2, '0'),
      String(timestamp.getSeconds()).padStart(2, '0')
    ].join('');

    return `HOLD-${datePart}-${timePart}`;
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

  private getComboItems(source: any): any[] {
    const items = source?.ComboMenuItems ?? source?.comboMenuItems ?? source?.Items ?? source?.items ?? [];
    return Array.isArray(items) ? items : [];
  }

  private getResponseList(response: any): any[] {
    const result = response?.result ?? response?.Result ?? response;
    return Array.isArray(result) ? result : [];
  }

  private getStringValue(source: any, ...keys: string[]): string {
    const value = keys.map((key) => source?.[key]).find((item) => item !== undefined && item !== null);
    return value?.toString() ?? '';
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
}

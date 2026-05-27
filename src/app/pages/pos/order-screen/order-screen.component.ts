import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
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
import { OrganizationService } from '../../../services/organization.service';
import { subCategoryService } from '../../../services/SubCategory.service';
import { TaxService } from '../../../services/tax.service';
import { FieldOption, SelectFieldComponent } from '../../../components/form/select-field.component';

const ALL_CATEGORY = { id: 0, name: 'All', icon: 'pi pi-th-large' };
const ALL_SUBCATEGORY = { id: 0, name: 'All', categoryId: 0 };
const ALL_FLOOR = { id: 0, name: 'All' };
const ALL_TABLE = 'All';
const ACTIVE_HELD_ORDER_STORAGE_KEY = 'activeHeldOrder';
const ORDER_SCREEN_TEMPLATE_NAME = 'Order Screen';
const ORDER_HOLD_TEMPLATE_NAME = 'Order Hold List';

const CATEGORY_ICON_MAP: Record<string, string> = {
  breakfast: 'pi pi-sun',
  lunch: 'pi pi-objects-column',
  dinner: 'pi pi-shop',
  beverages: 'pi pi-cup',
  desserts: 'pi pi-star'
};

const DEFAULT_CATEGORY_ICON = 'pi pi-shopping-bag';
const SUBCATEGORY_ICON_MAP: Record<string, string> = {
  south: 'pi pi-map-marker',
  chinese: 'pi pi-globe',
  north: 'pi pi-compass',
  grill: 'pi pi-fire',
  starter: 'pi pi-sparkles',
  soup: 'pi pi-filter',
  bread: 'pi pi-stop',
  rice: 'pi pi-th-large',
  curry: 'pi pi-circle-fill'
};

const DEFAULT_SUBCATEGORY_ICON = 'pi pi-tags';

@Component({
  selector: 'app-order-screen',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, DialogModule, TagModule, SelectFieldComponent],
  templateUrl: './order-screen.component.html',
  styleUrl: './order-screen.component.css'
})
export class OrderScreenComponent implements OnInit {
  private readonly changeDetector = inject(ChangeDetectorRef);

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
  orderValidationSubmitted = false;
  showOrderValidationDialog = false;
  orderValidationTitle = 'Complete Order Details';
  orderValidationMessages: string[] = [];
 
  private currentOrderEntityNo = 0;
  private currentHoldOrderEntityNo = 0;
  private readonly orderEntityNoCache = new Map<string, number>();

  activeCategoryId = 0;
  activeSubCategoryId = 0;
  activeFloorId = 0;
  activeOrderType = 'Dine In';
  selectedTable = ALL_TABLE;
  currentOrderNumber = '';
  searchText = '';
  customerName = '';
  ContactNumber = '';
  orderNotes = '';

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
    private readonly organizationService: OrganizationService,
    private readonly displayMenuItemsService: DisplayMenuItemsService,
    private readonly taxService: TaxService
    

  ) {}

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.orgId = Number(this.userDetails.OrgId || 0);
    this.branchId = this.userDetails.IsAdmin === true || Number(this.userDetails.RoleId || 0) === 1
      ? 0
      : Number(this.userDetails.BranchId || 0);

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
    const counterBranchId = Number(this.userDetails.IsAdmin || 0) === 1 || Number(this.userDetails.RoleId || 0) === 1
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
    } finally {
      this.isCategoryLoading = false;
      this.isLoading = false;
    }
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
          id: this.getNumberValue(x, 'id', 'Id'),
          name: this.getStringValue(x, 'name', 'Name'),
          categoryId: this.getNumberValue(x, 'categoryId', 'CategoryId', 'categoryid')
        }))
      ];

      this.updateVisibleSubCategories();
      this.applyMenuSelection();
    } catch {
      this.toast.error('Load Failed', 'Unable to load subcategories.');
    } finally {
      this.isSubCategoryLoading = false;
      this.isLoading = false;
    }
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
        name: this.getStringValue(menu, 'name', 'Name'),
        categoryId: this.getNumberValue(menu, 'categoryId', 'CategoryId', 'categoryid'),
        category: this.getStringValue(menu, 'categoryname', 'CategoryName') || this.getCategoryName(this.getNumberValue(menu, 'categoryId', 'CategoryId', 'categoryid')),
        subCategoryId: this.getNumberValue(menu, 'subCategoryId', 'SubCategoryId', 'subcategoryid'),
        subCategory: this.getStringValue(menu, 'subCategoryName', 'SubCategoryName', 'subcategoryname') || this.getSubCategoryName(this.getNumberValue(menu, 'subCategoryId', 'SubCategoryId', 'subcategoryid')),
        price: this.getNumberValue(menu, 'price', 'Price'),
        preparationTime: '',
        isPopular: false
      }));

      this.applyMenuSelection();
    } catch {
      this.toast.error('Load Failed', 'Unable to load menu items.');
    } finally {
      this.isMenuLoading = false;
      this.isLoading = false;
    }
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
    } finally {
      this.isMenuLoading = false;
      this.isLoading = false;
    }
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
    } finally {
      this.isFloorLoading = false;
      this.isLoading = false;
    }
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
    } finally {
      this.isTableLoading = false;
      this.isLoading = false;
    }
  }

  async loadTaxPercentage(): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.taxService.getAll(this.orgId));
      const taxes = response?.result ?? [];
      const activeTax = taxes.find((x: any) => x.IsActive === true || x.isActive === true || x.isactive === true);
      const percentage = Number(activeTax?.Percentage || activeTax?.percentage || 0);

      if (percentage > 0) {
        this.taxPercent = percentage;
        this.updateBillingSummary();
      }
    } catch {
      this.toast.warn('Tax Not Loaded', 'Using default tax percentage for this order.');
    }
  }

  selectCategory(category: any): void {
    this.activeCategoryId = Number(category?.id || 0);
    this.activeSubCategoryId = 0;
    this.updateVisibleSubCategories();
    this.applyMenuSelection();
  }

  selectSubCategory(subCategory: any): void {
    this.activeSubCategoryId = Number(subCategory?.id || 0);
    this.applyMenuSelection();
  }

  selectCategoryById(categoryId: number | null): void {
    const selectedCategoryId = Number(categoryId || 0);
    const category = this.categories.find((item: any) => Number(item.id || 0) === selectedCategoryId) ?? ALL_CATEGORY;
    this.selectCategory(category);
  }

  selectSubCategoryById(subCategoryId: number | null): void {
    const selectedSubCategoryId = Number(subCategoryId || 0);
    const subCategory = this.visibleSubCategories.find((item: any) => Number(item.id || 0) === selectedSubCategoryId) ?? ALL_SUBCATEGORY;
    this.selectSubCategory(subCategory);
  }

  selectOrderType(orderType: string): void {
    this.activeOrderType = orderType;
  }

  get categoryOptions(): FieldOption[] {
    return this.categories.map((category: any) => ({
      label: category.name || 'All',
      value: Number(category.id || 0)
    }));
  }

  get subCategoryOptions(): FieldOption[] {
    return this.visibleSubCategories.map((subCategory: any) => ({
      label: subCategory.name || 'All',
      value: Number(subCategory.id || 0)
    }));
  }

  get floorOptions(): FieldOption[] {
    return this.floors.map((floor: any) => ({
      label: floor.name || 'All',
      value: Number(floor.id || 0)
    }));
  }

  get tableOptions(): FieldOption[] {
    return this.tables.map((table: string) => ({
      label: table || ALL_TABLE,
      value: table || ALL_TABLE
    }));
  }

  selectFloor(floor: any): void {
    this.activeFloorId = Number(floor?.id || 0);
    this.updateVisibleTables();
  }

  selectTable(table: string): void {
    this.selectedTable = table;
  }

  selectFloorById(floorId: number | null): void {
    const selectedFloorId = Number(floorId || 0);
    const floor = this.floors.find((item: any) => Number(item.id || 0) === selectedFloorId) ?? ALL_FLOOR;
    this.selectFloor(floor);
  }

  selectTableByName(table: string | number | null): void {
    this.selectTable(String(table || ALL_TABLE));
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
    this.customerName = this.normalizeInputText((event.target as HTMLInputElement).value);
  }

  updateCustomerPhone(event: Event): void {
    this.ContactNumber = this.normalizeInputText((event.target as HTMLInputElement).value).replace(/\D/g, '').slice(0, 13);
  }

  updateOrderNotes(event: Event): void {
    this.orderNotes = this.normalizeInputText((event.target as HTMLTextAreaElement).value).slice(0, 500);
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
    this.currentOrderNumber = '';
    this.discountPercent = 5;
    this.customerName = '';
    this.ContactNumber = '';
    this.orderNotes = '';
    this.orderValidationSubmitted = false;
    this.orderValidationMessages = [];
    this.showOrderValidationDialog = false;
    this.updateBillingSummary();
  }

  async sendToKitchen(): Promise<void> {
    if (!this.cartItems.length) {
      this.toast.warn('No Items', 'Add at least one item before sending to kitchen.');
      return;
    }

    if (this.isSendingToKitchen) {
      return;
    }

    this.updateBillingSummary();

    if (!this.validateOrderBeforeSubmit('send to kitchen')) {
      return;
    }

    this.isSendingToKitchen = true;

    let orderPayload: any;

    try {
      await this.ensureKitchenOrderNumber();
      orderPayload = this.buildOrderApiPayload('In Kitchen');

      const request = Number(orderPayload?.orderid || 0) > 0
        ? this.displayMenuItemsService.update(orderPayload)
        : this.displayMenuItemsService.create(orderPayload);

      request.subscribe({
        next: (response: any) => {
          const orderNumber = this.getApiOrderNumber(response) || 'Order';
          this.toast.success('Sent to Kitchen', `${orderNumber} sent to kitchen display.`);
          this.clearOrder();
          setTimeout(() => this.refreshOrderScreenPage(), 1200);
        },
        error: (err: any) => {
          const message = err?.error?.message
            || err?.error?.Message
            || err?.message
            || 'Unable to save order status as In Kitchen.';

          this.toast.error('Kitchen Failed', message);
          
          this.isSendingToKitchen = false;
        },
        complete: () => {
          this.isSendingToKitchen = false;
        }
      });
    } catch {
      this.toast.error('Kitchen Failed', 'Unable to prepare this order for kitchen.');
      this.isSendingToKitchen = false;
    }
  }

  settlePayment(): void {
    this.toast.info('Pending', 'You can add payment logic later.');
  }

  private refreshOrderScreenPage(): void {
    window.location.reload();
  }

  async holdOrder(): Promise<void> {
    
    if (!this.cartItems.length) {
      this.toast.warn('No Items', 'Add at least one item before holding the order.');
      return;
    }

    if (this.isHoldingOrder) {
      return;
    }

    this.updateBillingSummary();

    if (!this.validateOrderBeforeSubmit('hold')) {
      return;
    }

    this.isHoldingOrder = true;

    try {
      await this.ensureHoldOrderNumber();
      const payload = this.buildHoldOrderPayload();
      const existingOrderId = Number(payload?.OrderId || payload?.Orderid || payload?.orderId || 0);
      const request = existingOrderId > 0
        ? this.orderHoldService.update(payload)
        : this.orderHoldService.create(payload);

      request.subscribe({
        next: (response: any) => {
          const orderNumber = this.getApiOrderNumber(response) || (existingOrderId > 0 ? payload.ordernumber : '') || 'Order';
          const msg = existingOrderId > 0
            ? `${orderNumber} updated in hold orders.`
            : `${orderNumber} saved to hold orders.`;

          this.toast.success('Order Held', msg);
          this.clearOrder();
          setTimeout(() => this.refreshOrderScreenPage(), 1200);
        },
        error: (err: any) => {
          const message = err?.error?.message
            || err?.error?.Message
            || err?.message
            || 'Unable to save this order to hold.';

          this.isHoldingOrder = false;
          this.toast.error('Hold Failed', message);
        },
        complete: () => {
          this.isHoldingOrder = false;
        }
      });
    } catch (error) {
      console.error('Hold payload build failed', error);
      this.isHoldingOrder = false;
      this.toast.error('Hold Failed', 'Unable to prepare this order for hold.');
    }
  }

  private buildOrderApiPayload(status: 'Hold' | 'In Kitchen' = 'In Kitchen'): any {
    const userId = this.getNumberValue(this.userDetails, 'UserId', 'userId', 'Id', 'id');
    const existingOrderId = this.getKitchenOrderId();
    const orderNumber = this.currentOrderNumber || this.getOrderNumber(this.currentHeldOrder);
    const requestOrderNumber = orderNumber || `PENDING-${Date.now()}`;
    const now = new Date().toISOString();
    const orderNotes = this.normalizeInputText(this.orderNotes).slice(0, 500);
    const items = this.cartItems.map((item: any) => this.buildKitchenOrderItem(item, existingOrderId, userId, now, status));
    const tableId = this.getSelectedTableId();
    const floorId = this.getSelectedFloorId();
    const tableName = this.selectedTable === ALL_TABLE ? '' : this.selectedTable;
    const shiftId = this.getCurrentShiftId();

    const payload = {
      OrderId: existingOrderId,
      Orderid: existingOrderId,
      orderid: existingOrderId,
      OrderNumber: requestOrderNumber,
      Ordernumber: requestOrderNumber,
      orderNumber: requestOrderNumber,
      HoldOrderId: this.isCurrentHeldOrder() ? this.getCurrentHeldOrderId() : 0,
      holdOrderId: this.isCurrentHeldOrder() ? this.getCurrentHeldOrderId() : 0,
      TableId: tableId,
      Tableid: tableId,
      tableId,
      FloorId: floorId,
      Floorid: floorId,
      floorId,
      floorid: floorId,
      TableName: tableName,
      tableName,
      TableCode: tableName,
      tableCode: tableName,
      OrderType: this.activeOrderType,
      Ordertype: this.activeOrderType,
      orderType: this.activeOrderType,
      OrderStatus: status,
      Orderstatus: status,
      orderStatus: status,
      ItemCount: this.itemCount,
      Itemcount: this.itemCount,
      itemCount: this.itemCount,
      SubtotalAmount: this.subtotal,
      subtotalAmount: this.subtotal,
      TaxAmount: this.taxAmount,
      taxAmount: this.taxAmount,
      DiscountAmount: this.discountAmount,
      discountAmount: this.discountAmount,
      TotalAmount: this.grandTotal,
      totalAmount: this.grandTotal,
      CustomerName: this.customerName,
      customerName: this.customerName,
      ContactNumber: this.ContactNumber,
      contactNumber: this.ContactNumber,
      Notes: orderNotes,
      notes: orderNotes,
      Remarks: orderNotes,
      remarks: orderNotes,
      ShiftId: shiftId,
      Shiftid: shiftId,
      shiftId,
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
      OrgId: this.orgId,
      orgId: this.orgId,
      BranchId: this.branchId,
      branchId: this.branchId,
      Items: items,
      items,
      EntityNo: this.currentOrderEntityNo,
      entityNo: this.currentOrderEntityNo
    };

    return payload;
  }

  closeOrderValidationDialog(): void {
    this.showOrderValidationDialog = false;
  }

 

  get isCustomerNameInvalid(): boolean {
    return this.orderValidationSubmitted && !this.customerName.trim();
  }

  get isPhoneNumberInvalid(): boolean {
    return this.orderValidationSubmitted && !this.isPhoneNumberValid();
  }

  get isTableSelectionInvalid(): boolean {
    return this.orderValidationSubmitted && this.isDineInOrder() && !this.isTableSelected();
  }

  private validateOrderBeforeSubmit(actionLabel: string): boolean {
    const messages: string[] = [];

    this.orderValidationSubmitted = true;
    this.customerName = this.normalizeInputText(this.customerName);
    this.ContactNumber = this.normalizeInputText(this.ContactNumber).replace(/\D/g, '').slice(0, 13);

    if (!this.customerName) {
      messages.push('Enter customer name.');
    }

    if (!this.ContactNumber) {
      messages.push('Enter phone number.');
    } else if (!this.isPhoneNumberValid()) {
      messages.push('Enter a valid phone number with 10 to 13 digits.');
    }

    if (this.isDineInOrder() && !this.isTableSelected()) {
      messages.push('Select a table.');
    }

    if (!this.activeOrderType) {
      messages.push('Select order type.');
    }

    if (!this.cartItems.length) {
      messages.push('Add at least one item.');
    }

    this.orderValidationMessages = messages;

    if (!messages.length) {
      this.showOrderValidationDialog = false;
      return true;
    }

    this.orderValidationTitle = `Before ${actionLabel}`;
    this.showOrderValidationDialog = true;
    return false;
  }

  private isTableSelected(): boolean {
    return Boolean(this.selectedTable && this.selectedTable !== ALL_TABLE && this.getSelectedTableId() > 0);
  }

  isDineInOrder(): boolean {
    return this.normalizeInputText(this.activeOrderType).toLowerCase() === 'dine in';
  }

  private isPhoneNumberValid(): boolean {
    return /^\d{10,13}$/.test(this.ContactNumber);
  }

  private buildKitchenOrderItem(item: any, orderId: number, userId: number, timestamp: string, status: 'Hold' | 'In Kitchen'): any {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.price || 0);
    const isCombo = item.itemType === 'Combo';
    const comboMenuItemId = isCombo
      ? this.getNumberValue(item, 'ComboMenuItemId', 'comboMenuItemId', 'Combomenuitemid', 'combomenuitemid', 'ComboMenuId', 'comboMenuId', 'id', 'Id')
      : 0;

    return {
      Itemid: this.getNumberValue(item, 'heldItemId', 'itemid', 'Itemid', 'ItemId', 'itemId'),
      itemid: this.getNumberValue(item, 'heldItemId', 'itemid', 'Itemid', 'ItemId', 'itemId'),
      Orderid: orderId,
      orderid: orderId,
      Menuitemid: isCombo ? 0 : Number(item.id || 0),
      MenuItemId: isCombo ? 0 : Number(item.id || 0),
      menuitemid: isCombo ? 0 : Number(item.id || 0),
      ComboMenuItemId: comboMenuItemId,
      comboMenuItemId,
      Itemname: item.name || '',
      itemname: item.name || '',
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
      Modifierdetails: isCombo && item.comboItems?.length ? JSON.stringify(item.comboItems) : '',
      modifierdetails: isCombo && item.comboItems?.length ? JSON.stringify(item.comboItems) : '',
      Itemstatus: status,
      itemstatus: status,
      Notes: isCombo ? 'Combo Menu' : '',
      notes: isCombo ? 'Combo Menu' : '',
      OrgId: this.orgId,
      orgId: this.orgId,
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

  private updateVisibleSubCategories(): void {
    const rows = this.activeCategoryId === 0
      ? this.subCategories.filter((x: any) => x.id !== 0)
      : this.subCategories.filter((x: any) => Number(x.categoryId || 0) === this.activeCategoryId);

    this.visibleSubCategories = [
      ALL_SUBCATEGORY,
      ...rows.map((subCategory: any) => ({
        id: subCategory.id ?? 0,
        name: subCategory.name ?? '',
        categoryId: subCategory.categoryId ?? 0
      }))
    ];
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
      ...diningTables
        .map((table: any) => this.getStringValue(table, 'code', 'Code', 'name', 'Name'))
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
    this.subtotal = this.cartItems.reduce((total: number, x: any) => total + Number(x.price || 0) * Number(x.quantity || 0), 0);
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
      this.customerName = this.getStringValue(heldOrder, 'CustomerName', 'customerName', 'GuestName', 'guestName');
      this.ContactNumber = this.getStringValue(heldOrder, 'ContactNumber', 'contactNumber', 'CustomerPhone', 'customerPhone', 'Phone', 'phone');
      this.orderNotes = this.getStringValue(heldOrder, 'Notes', 'notes', 'Remarks', 'remarks');

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
      const menuItemId = this.getStringValue(item, 'Menuitemid', 'menuitemid', 'MenuItemId', 'menuItemId', 'MenuId', 'menuId', 'FoodMenuId', 'foodMenuId', 'Foodmenuid', 'foodmenuid');
      const comboMenuId = this.getNumberValue(item, 'ComboMenuId', 'comboMenuId', 'Combomenuid', 'combomenuid');
      const comboMenuItemId = this.getNumberValue(item, 'ComboMenuItemId', 'comboMenuItemId', 'Combomenuitemid', 'combomenuitemid');
      const itemName = this.getStringValue(item, 'Itemname', 'itemname', 'ItemName', 'itemName', 'name', 'Name');
      const isCombo = comboMenuId > 0
        || comboMenuItemId > 0
        || menuItemId.startsWith('combo-')
        || this.getStringValue(item, 'Notes', 'notes').toLowerCase().includes('combo');
      const numericId = isCombo
        ? comboMenuId || comboMenuItemId || this.parseMenuItemId(menuItemId)
        : this.parseMenuItemId(menuItemId) || this.getNumberValue(item, 'FoodMenuId', 'foodMenuId', 'Foodmenuid', 'foodmenuid', 'MenuItemId', 'menuItemId', 'MenuId', 'menuId');
      const quantity = this.getNumberValue(item, 'Quantity', 'quantity', 'Qty', 'qty') || 1;
      const unitPrice = this.getNumberValue(item, 'Unitprice', 'unitprice', 'UnitPrice', 'unitPrice', 'price', 'Price');
      const heldItemId = this.getNumberValue(item, 'itemid', 'Itemid', 'ItemId', 'itemId', 'Id', 'id');
      const cartKey = isCombo
        ? menuItemId.startsWith('combo-') ? menuItemId : 'combo-' + (numericId || heldItemId || index + 1)
        : 'menu-' + (numericId || heldItemId || index + 1);
      const existingMenuItem = this.allMenuItems.find((menuItem: any) =>
        menuItem.cartKey === cartKey ||
        (menuItem.itemType === (isCombo ? 'Combo' : 'Menu') && Number(menuItem.id) === numericId) ||
        (numericId === 0 && menuItem.itemType === (isCombo ? 'Combo' : 'Menu') && menuItem.name === itemName)
      );

      return {
        ...(existingMenuItem ?? {}),
        heldItemId,
        orderid: this.getNumberValue(item, 'orderid', 'Orderid', 'OrderId', 'orderId'),
        id: numericId || existingMenuItem?.id || 0,
        cartKey: numericId ? cartKey : existingMenuItem?.cartKey || cartKey,
        itemType: isCombo ? 'Combo' : 'Menu',
        ComboMenuId: isCombo ? comboMenuId || numericId || existingMenuItem?.comboMenuId || 0 : 0,
        Combomenuid: isCombo ? comboMenuId || numericId || existingMenuItem?.comboMenuId || 0 : 0,
        ComboMenuItemId: isCombo ? comboMenuItemId || numericId || existingMenuItem?.comboMenuId || 0 : 0,
        Combomenuitemid: isCombo ? comboMenuItemId || numericId || existingMenuItem?.comboMenuId || 0 : 0,
        name: itemName || existingMenuItem?.name || 'Held item',
        category: existingMenuItem?.category ?? '',
        subCategory: existingMenuItem?.subCategory ?? '',
        price: unitPrice || existingMenuItem?.price || 0,
        quantity,
        comboItems: existingMenuItem?.comboItems ?? this.parseComboDetails(item)
      };
    });
  }

  private getHeldOrderItems(heldOrder: any): any[] {
    const items = heldOrder?.Items
      ?? heldOrder?.items
      ?? heldOrder?.OrderHoldItems
      ?? heldOrder?.orderHoldItems
      ?? heldOrder?.OrderholdItems
      ?? heldOrder?.orderholdItems
      ?? heldOrder?.OrderHoldDetails
      ?? heldOrder?.orderHoldDetails
      ?? heldOrder?.Orderholddetails
      ?? heldOrder?.orderholddetails
      ?? heldOrder?.OrderItems
      ?? heldOrder?.orderItems
      ?? heldOrder?.OrderDetails
      ?? heldOrder?.orderDetails
      ?? heldOrder?.Details
      ?? heldOrder?.details
      ?? [];

    return Array.isArray(items) ? items : [];
  }

  private applyHeldOrderTotals(heldOrder: any): void {
    const heldSubtotal = this.getNumberValue(heldOrder, 'SubtotalAmount', 'subtotalAmount', 'subtotal');
    const heldDiscountAmount = this.getNumberValue(heldOrder, 'DiscountAmount', 'discountAmount');
    const heldTaxAmount = this.getNumberValue(heldOrder, 'TaxAmount', 'taxAmount');

    if (heldSubtotal <= 0) {
      return;
    }

    this.discountPercent = heldDiscountAmount > 0 ? Math.round((heldDiscountAmount / heldSubtotal) * 100) : 0;

    const taxableAmount = Math.max(heldSubtotal - heldDiscountAmount, 0);
    this.taxPercent = taxableAmount > 0 && heldTaxAmount > 0
      ? (heldTaxAmount / taxableAmount) * 100
      : this.taxPercent;
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

  private buildHoldOrderPayload(status: 'Hold' | 'In Kitchen' = 'Hold'): OrderHold {
    const userId = this.getNumberValue(this.userDetails, 'UserId', 'userId', 'Id', 'id');
    const holdOrderId = this.getCurrentHeldOrderId();
    const orderDetailId = this.getCurrentHeldOrderDetailId();
    const existingOrderId = orderDetailId || holdOrderId || 0;
    const orderNumber = this.currentOrderNumber || this.getOrderNumber(this.currentHeldOrder);
    const requestOrderNumber = orderNumber || `PENDING-${Date.now()}`;
    const now = new Date().toISOString();
    const orderNotes = this.normalizeInputText(this.orderNotes).slice(0, 500);
    const items = this.buildHoldOrderItems(userId, status, existingOrderId || 0, now);
    const tableId = this.getSelectedTableId();
    const floorId = this.getSelectedFloorId();
    const shiftId = this.getCurrentShiftId();

    const payload: OrderHold = {
      orderId: existingOrderId,
      ordernumber: requestOrderNumber,
      tableid: tableId,
      FloorId: floorId,
      Floorid: floorId,
      floorId,
      floorid: floorId,
      ordertype: this.activeOrderType,
      orderstatus: status,
      itemcount: this.itemCount,
      subtotalAmount: this.subtotal,
      taxAmount: this.taxAmount,
      discountAmount: this.discountAmount,
      totalAmount: this.grandTotal,
      customerName: this.customerName,
      contactNumber: this.ContactNumber,
      Notes: orderNotes,
      notes: orderNotes,
      Remarks: orderNotes,
      remarks: orderNotes,
      shiftid: shiftId,
      orgId: this.orgId,
      createdBy: userId || 0,
      createdDate: now,
      updatedBy: userId || 0,
      updatedDate: now,
      isDeleted: false,
      branchId: this.branchId,
      items,
      EntityNo: this.currentHoldOrderEntityNo,
    
    };

    return payload;
  }

  private async ensureHoldOrderNumber(): Promise<void> {
    this.currentHoldOrderEntityNo = await this.resolveOrderEntityNo(ORDER_HOLD_TEMPLATE_NAME, Number(this.userDetails.OrgId || this.orgId || 0));

    const existingOrderNumber = this.isCurrentHeldOrder()
      ? this.currentOrderNumber || this.getOrderNumber(this.currentHeldOrder)
      : '';

    if (existingOrderNumber) {
      this.currentOrderNumber = existingOrderNumber;
      return;
    }

    const holdCode = await this.loadLatestOrderNumber(ORDER_HOLD_TEMPLATE_NAME, Number(this.userDetails.OrgId || this.orgId || 0));
    this.currentHoldOrderEntityNo = holdCode.entityNo;
    this.currentOrderNumber = holdCode.orderNumber;
  }

  private async ensureKitchenOrderNumber(): Promise<void> {
    
    this.currentOrderEntityNo = await this.resolveOrderEntityNo(ORDER_SCREEN_TEMPLATE_NAME, Number(this.userDetails.OrgId || this.orgId || 0));

    const existingKitchenOrderNumber = this.isCurrentHeldOrder()
      ? ''
      : this.currentOrderNumber || this.getOrderNumber(this.currentHeldOrder);

    if (existingKitchenOrderNumber) {
      this.currentOrderNumber = existingKitchenOrderNumber;
      return;
    }

    const kitchenCode = await this.loadLatestOrderNumber(ORDER_SCREEN_TEMPLATE_NAME, Number(this.userDetails.OrgId || this.orgId || 0));
    this.currentOrderEntityNo = kitchenCode.entityNo;
    this.currentOrderNumber = kitchenCode.orderNumber;
  }

  private async loadLatestOrderNumber(templateName: string, orgId: number): Promise<{ orderNumber: string; entityNo: number }> {
    const entityNo = await this.resolveOrderEntityNo(templateName, orgId);

    if (!entityNo || !orgId) {
      throw new Error('Code template context is missing.');
    }

    try {
      const response: any = await firstValueFrom(this.organizationService.GetLatestCode(entityNo, orgId, this.getCodeTemplateBranchId()));
      const orderNumber = String(response?.result ?? '').trim();

      if (!orderNumber) {
        throw new Error('Code template did not return an order number.');
      }

      return { orderNumber, entityNo };
    } catch {
      this.toast.error('Load Failed', 'Unable to load order number. Please check and try again.');
      throw new Error('Unable to load order number.');
    }
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
      this.toast.error('Load Failed', `Unable to load ${templateName} code template. Please check organization setup.`);
      throw new Error(`Unable to load ${templateName} entity number.`);
    }
  }

  private getCodeTemplateBranchId(): number {
    return Number(this.userDetails.BranchId || this.userDetails.branchId || this.branchId || 0);
  }

  private normalizeTemplateName(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private buildHoldOrderItems(userId: number, status: 'Hold' | 'In Kitchen', orderId: number, timestamp: string): OrderHoldItem[] {
    return this.cartItems.map((item: any) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.price || 0);
      const lineTotal = quantity * unitPrice;
      const isCombo = item.itemType === 'Combo';
      const comboMenuItemId = isCombo
        ? this.getNumberValue(item, 'ComboMenuItemId', 'comboMenuItemId', 'Combomenuitemid', 'combomenuitemid', 'ComboMenuId', 'comboMenuId', 'id', 'Id') || this.parseMenuItemId(item.cartKey ?? '')
        : 0;

      return {
        itemid: this.getNumberValue(item, 'heldItemId', 'itemid', 'Itemid', 'ItemId', 'itemId'),
        orderid: orderId || 0,
        menuitemid: isCombo ? 0 : Number(item.id || 0),
        comboMenuItemId,
        itemname: item.name ?? '',
        quantity,
        unitprice: unitPrice,
        totalprice: lineTotal,
        discountAmount: 0,
        taxAmount: 0,
        modifierdetails: isCombo ? JSON.stringify(this.buildComboModifierDetails(item)) : '',
        itemstatus: status,
        notes: isCombo ? 'Combo Menu' : '',
        orgId: this.orgId,
        createdBy: userId || 0,
        createdDate: timestamp,
        updatedBy: userId || 0,
        updatedDate: timestamp,
        isDeleted: false
      };
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

  private getSelectedFloorId(): number {

    debugger
    const selectedTable = this.getDiningTableByDisplayName(this.selectedTable);
    const tableFloorId = this.getNumberValue(selectedTable,  'floorid');

    return tableFloorId || Number(this.activeFloorId || 0);
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

  private getApiOrderNumber(response: any): string {
    const result = response?.result ?? response?.Result ?? response;
    return this.getOrderNumber(result) || this.getOrderNumber(response);
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

 private getKitchenOrderId(): number {
  if (this.isCurrentHeldOrder()) {
    return 0;
  }

  return this.getNumberValue(
    this.currentHeldOrder,
    'SavedOrderId',
    'savedOrderId',
    'KitchenOrderId',
    'kitchenOrderId',
    'OrdersId',
    'ordersId',
    'Ordersid'
  ) || 0;
}

  private isCurrentHeldOrder(): boolean {
    const status = this.getStringValue(this.currentHeldOrder, 'Orderstatus', 'orderstatus', 'OrderStatus', 'orderStatus');
    return status.trim().toLowerCase() === 'hold';
  }

  private getScopedOrgId(): number {
    return Number(this.userDetails.RoleId || 0) === 1 ? 0 : this.orgId;
  }

  private getScopedBranchId(): number {
    return this.userDetails.IsAdmin === true || Number(this.userDetails.RoleId || 0) === 1
      ? 0
      : this.branchId;
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

  getSubCategoryIcon(subCategory: any): string {
    const subCategoryName = this.getStringValue(subCategory, 'name', 'Name').trim().toLowerCase();

    if (!subCategoryName || subCategoryName === 'all') {
      return 'pi pi-th-large';
    }

    const matchedKey = Object.keys(SUBCATEGORY_ICON_MAP).find((key) => subCategoryName.includes(key));
    return matchedKey ? SUBCATEGORY_ICON_MAP[matchedKey] : DEFAULT_SUBCATEGORY_ICON;
  }

  getFloorIcon(floor: any): string {
    const floorId = this.getNumberValue(floor, 'id', 'Id');
    return floorId ? 'pi pi-building' : 'pi pi-th-large';
  }

  getTableIcon(table: string): string {
    return table === ALL_TABLE ? 'pi pi-th-large' : 'pi pi-table';
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
    return this.normalizeInputText(value?.toString() ?? '');
  }

  private normalizeInputText(value: string): string {
    const normalizedValue = String(value ?? '').trim();
    return normalizedValue.toLowerCase() === 'undefined' || normalizedValue.toLowerCase() === 'null'
      ? ''
      : normalizedValue;
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

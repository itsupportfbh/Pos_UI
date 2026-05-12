import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, QueryList, ViewChildren, inject } from '@angular/core';
import { MenuItem, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { firstValueFrom } from 'rxjs';

import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { MultiSelectFieldComponent, MultiSelectFieldValue } from '../../../components/form/multiselect-field.component';
import { SelectFieldComponent } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { AppToastService } from '../../../services/app-toast.service';
import { SharedTableCellTemplateDirective, SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';
import { ComboMenu, ComboMenuItem, ComboMenuService } from '../../../services/combo-menu.service';
import { CategoryService } from '../../../services/Category.service';
import { subCategory, subCategoryService } from '../../../services/SubCategory.service';
import { MenuService } from '../../../services/FoodMenu.service';

type ComboMenuRow = {
  id: number;
  code: string;
  name: string;
  categoryId: number;
  subCategoryId: number;
  categoryname: string;
  subcategoryname: string;
  price: number;
  orgId: number;
  isactive: boolean;
  Status: string;
  FoodMenuName: string;
  ItemsCount: number;
  comboMenuItems: ComboMenuItemRow[];
  RowNumber: number;
};

type ComboMenuItemRow = {
  Id?: number;
  FoodMenuId: number;
  FoodMenuName: string;
  Qty: number;
  Price: number | null;
};

const COMBOMENU_COLUMNS: SharedTableColumn<ComboMenuRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'Code', header: 'Code', sortable: true, width: '10rem' },
  { field: 'Name', header: 'Combo Name', sortable: true, width: '18rem' },
  { field: 'ItemsCount', header: 'No Of Items', sortable: true, width: '12rem' },
  { field: 'Price', header: 'Price', sortable: true, width: '9rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '8rem' }
];

@Component({
  selector: 'app-combo-menu',
  standalone: true,
  imports: [
    CommonModule,
    ConfirmDialogModule,
    ButtonModule,
    CardModule,
    DialogModule,
    TextFieldComponent,
    MultiSelectFieldComponent,
    SelectFieldComponent,
    ActionButtonsComponent,
    MenuModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective
  ],
  providers: [ConfirmationService],
  templateUrl: './combo-menu.component.html',
  styleUrl: './combo-menu.component.css'
})
export class ComboMenuComponent {
  private readonly toast = inject(AppToastService);
  private readonly comboMenuService = inject(ComboMenuService);
  private readonly categoryService = inject(CategoryService);
  private readonly subCategoryService = inject(subCategoryService);
  private readonly menuService = inject(MenuService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly confirmationService = inject(ConfirmationService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  @ViewChildren(SelectFieldComponent) private readonly selectFields?: QueryList<SelectFieldComponent>;
  @ViewChildren(MultiSelectFieldComponent) private readonly multiSelectFields?: QueryList<MultiSelectFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isLoading = false;
  isEditMode = false;
  dialogSubmitted = false;
  selectedRow: ComboMenuRow | null = null;
  rowActionItems: MenuItem[] = [];
  allRows: ComboMenuRow[] = [];
  tableRows: ComboMenuRow[] = [];

  filterSearchText = '';
  OrgId = 0;
  userDetails: any = {};
  dialogId = 0;
  dialogCode = '';
  dialogName = '';
  dialogCategoryIds: MultiSelectFieldValue = [];
  dialogSubCategoryIds: MultiSelectFieldValue = [];
  dialogPrice = 0;
  dialogItems: ComboMenuItemRow[] = [];
  selectedFoodMenuId: number | null = null;
  selectedFoodMenuQty = 1;
  selectedFoodMenuPrice: number | null = null;

  categoryOptions: any[] = [];
  subCategoryOptions: any[] = [];
  allSubCategoryOptions: (subCategory & { id?: number; categoryId?: number })[] = [];
  allFoodMenuOptions: any[] = [];
  foodMenuOptions: any[] = [];

  readonly pageEyebrow = 'POS';
  readonly pageTitle = 'Combo Menus';
  readonly pageSubtitle = 'Manage combo menus and the food items included in each combo.';
  readonly filterTitle = 'Combo Menus Filters';
  readonly primaryActionLabel = 'Search Combo Menus';
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Combo Menu';
  dialogSubtitle = 'Create a new combo menu.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Combo Menus';
  readonly tableCaption = 'Combo Menus';
  tableColumns = COMBOMENU_COLUMNS;
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = 'Add New';
  readonly showFilterButton = true;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';

  async ngOnInit(): Promise<void> {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.OrgId = Number(this.userDetails.OrgId || 0);
    this.loadRows();
    await this.loadLookupOptions();
  }

  loadRows(): void {
    this.isLoading = true;
     const orgId = Number(this.userDetails.OrgId || 0);

    this.comboMenuService.getAll(orgId).subscribe({
      next: (response: any) => {
        let RowNumber = 1;
        this.allRows = (response.result ?? []).map((x: any) => {
          const comboMenuItems = this.mapComboMenuItems(x);

          x.id = this.getNumberValue(x, 'id', 'Id');
          x.code = this.getStringValue(x, 'code', 'Code');
          x.name = this.getStringValue(x, 'name', 'Name');
          x.categoryId = this.getNumberValue(x, 'categoryId', 'CategoryId');
          x.subCategoryId = this.getNumberValue(x, 'subCategoryId', 'SubCategoryId');
          x.price = this.getNumberValue(x, 'price', 'Price');
          x.orgId = this.getNumberValue(x, 'orgId', 'OrgId');
          x.isactive = this.getBooleanValue(x, 'isactive', 'IsActive', 'isActive');
          x.RowNumber = RowNumber++;
          x.Status = x.isactive ? 'Active' : 'Inactive';
          x.FoodMenuName = this.getComboFoodMenuNames(comboMenuItems);
          x.ItemsCount = comboMenuItems.length;
          x.comboMenuItems = comboMenuItems;

          return x;
        });
        this.tableRows = [...this.allRows];
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.toast.error(
          'Load Failed',
          'Unable to load combo menus. Please check API and try again.'
        );
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }


   private getComboFoodMenuNames(items: ComboMenuItemRow[]): string {
    return items
      .map((item) => item.FoodMenuName)
      .filter((name) => !!name)
      .join(', ');
  }
  searchRows(): void {
    const searchText = this.filterSearchText.trim().toLowerCase();

    if (!searchText) {
      this.tableRows = [...this.allRows];
      return;
    }

    this.tableRows = this.allRows.filter((row) =>
      row.code?.toLowerCase().includes(searchText) ||
      row.name?.toLowerCase().includes(searchText) ||
      row.FoodMenuName?.toLowerCase().includes(searchText) ||
      row.categoryname?.toLowerCase().includes(searchText) ||
      row.subcategoryname?.toLowerCase().includes(searchText)
    );
  }

  resetForm(): void {
    this.filterSearchText = '';
    this.loadRows();
  }

  openFilterSidebar(): void {
    this.resetForm();
    this.showFilterSidebar = true;
  }

  closeFilterSidebar(): void {
    this.showFilterSidebar = false;
  }

  async openAddDialog(): Promise<void> {
    this.resetDialogForm();
    this.isEditMode = false;
    this.dialogTitle = 'Create ' + this.pageTitle;
    this.dialogSubtitle = 'Create a new combo menu.';
    this.dialogPrimaryActionLabel = 'Save';
    this.showAddDialog = true;
    await this.loadLookupOptions();
  }

  closeAddDialog(): void {
    this.resetDialogForm();
    this.loadRows();
    this.isEditMode = false;
    this.dialogSubmitted = false;
    this.showAddDialog = false;
  }

 submitAddDialog(): void {
  this.dialogSubmitted = true;
 

  if (!this.isDialogFormValid()) {
    return;
  }

  if (!this.dialogItems.length) {
    this.toast.warn('Items Required', 'Add at least one food menu item to this combo.');
    return;
  }

  const orgId = Number(this.userDetails.OrgId || 0);

  const userId = Number(this.userDetails.UserId || 0);

  const payload: ComboMenu = {
    Id: this.dialogId || 0,
    Code: this.dialogCode?.trim(),
    Name: this.dialogName?.trim(),
    CategoryId: this.getFirstSelectedId(this.dialogCategoryIds),
    SubCategoryId: this.getFirstSelectedId(this.dialogSubCategoryIds) || null,
    Price: Number(this.dialogPrice || 0),
    OrgId: orgId,
    IsActive: true,
    IsDeleted: false,
    ComboMenuItems: this.dialogItems.map((item: any) => ({
      Id: item.Id || 0,
      ComboMenuId: this.dialogId || 0,
      FoodMenuId: Number(item.FoodMenuId || 0),
      Qty: Number(item.Qty || 1),
      Price:item.Price === null || item.Price === undefined? 0: Number(item.Price),
      OrgId: orgId,
      IsActive: true,
      IsDeleted: false,
    }))
  };

  if (this.isEditMode) {
    payload.UpdatedBy = userId;
    payload.ComboMenuItems?.forEach((item) => item.UpdatedBy = userId);
  } else {
    payload.CreatedBy = userId;
    payload.ComboMenuItems?.forEach((item) => item.CreatedBy = userId);
  }

  const request = this.isEditMode && this.dialogId
    ? this.comboMenuService.update(payload)
    : this.comboMenuService.create(payload);

  request.subscribe({
    next: (response: any) => {

      if (this.isAlreadyExistsResponse(response)) {
        this.toast.warn('Duplicate', 'Combo menu already exists.');
        return;
      }

      this.toast.success(
        this.isEditMode ? 'Updated' : 'Saved',
        `${this.pageTitle} ${this.isEditMode ? 'updated' : 'saved'} successfully.`
      );

      this.closeAddDialog();
      this.loadRows();
    },
    error: (err) => {
      console.log(err);

      this.toast.error(
        this.isEditMode ? 'Update Failed' : 'Save Failed',
        `Unable to ${this.isEditMode ? 'update' : 'save'} combo menu.`
      );
    }
  });
}
  async editRow(row: ComboMenuRow): Promise<void> {
    const rowId = this.getNumberValue(row, 'id', 'Id');

    if (!rowId) {
      this.toast.error('Edit Failed', 'Invalid combo menu id.');
      return;
    }

    this.resetDialogForm();
    this.isEditMode = true;
    this.dialogTitle = 'Edit ' + this.pageTitle;
    this.dialogSubtitle = 'Update the selected combo menu.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;

    try {
      await this.loadLookupOptions();
      const response: any = await firstValueFrom(this.comboMenuService.getById(rowId));
      const result = response?.result ?? response?.Result ?? response;
      const comboMenu = Array.isArray(result) ? (result[0] ?? row) : (result ?? row);

      this.dialogId = this.getNumberValue(comboMenu, 'Id', 'id') || rowId;
      this.dialogCode = this.getStringValue(comboMenu, 'Code', 'code') || row.code;
      this.dialogName = this.getStringValue(comboMenu, 'Name', 'name') || row.name;
      const categoryId = this.getNumberValue(comboMenu, 'CategoryId', 'categoryId') || row.categoryId;
      const subCategoryId = this.getNumberValue(comboMenu, 'SubCategoryId', 'subCategoryId') || row.subCategoryId || null;

      this.dialogCategoryIds = categoryId ? [categoryId] : [];
      this.setSubCategoryOptions(this.dialogCategoryIds, false);
      this.dialogSubCategoryIds = subCategoryId ? [subCategoryId] : [];
      this.setFoodMenuOptions(this.dialogSubCategoryIds);
      this.dialogPrice = this.getNumberValue(comboMenu, 'Price', 'price') || row.price;
      this.dialogItems = this.mapComboMenuItems(comboMenu);
      this.changeDetector.detectChanges();
    } catch {
      this.toast.error('Load Failed', 'Unable to load combo menu details.');
      this.showAddDialog = false;
    }
  }

  deleteRow(row: ComboMenuRow): void {
    const rowId = this.getNumberValue(row, 'id', 'Id');

    if (!rowId) {
      this.toast.error('Delete Failed', 'Invalid combo menu id.');
      return;
    }

    this.comboMenuService.delete(rowId).subscribe({
      next: () => {
        this.toast.warn('Deleted', row.name + ' removed successfully.');
        this.loadRows();
      },
      error: () => {
        this.toast.error('Delete Failed', 'Unable to delete combo menu.');
      }
    });
  }

  activateRow(row: ComboMenuRow): void {
    const rowId = this.getNumberValue(row, 'id', 'Id');

    if (!rowId) {
      this.toast.error('Update Failed', 'Invalid combo menu id.');
      return;
    }

    this.comboMenuService.activeInActive(rowId, true).subscribe({
      next: () => {
        this.toast.success('Status Updated', row.name + ' marked as active.');
        this.loadRows();
      },
      error: () => {
        this.toast.error('Update Failed', 'Unable to activate combo menu.');
      }
    });
  }

  deactivateRow(row: ComboMenuRow): void {
    const rowId = this.getNumberValue(row, 'id', 'Id');

    if (!rowId) {
      this.toast.error('Update Failed', 'Invalid combo menu id.');
      return;
    }

    this.comboMenuService.activeInActive(rowId, false).subscribe({
      next: () => {
        this.toast.info('Status Updated', row.name + ' marked as inactive.');
        this.loadRows();
      },
      error: () => {
        this.toast.error('Update Failed', 'Unable to deactivate combo menu.');
      }
    });
  }

  openRowActions(menu: any, event: Event, row: ComboMenuRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: ComboMenuRow): void {
    this.confirmationService.confirm({
      header: 'Delete Confirmation',
      message: 'Are you sure you want to delete ' + row.name + '?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.deleteRow(row);
      }
    });
  }

  confirmActivateRow(row: ComboMenuRow): void {
    this.confirmationService.confirm({
      header: 'Activate Confirmation',
      message: 'Are you sure you want to activate ' + row.name + '?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.activateRow(row);
      }
    });
  }

  confirmDeactivateRow(row: ComboMenuRow): void {
    this.confirmationService.confirm({
      header: 'Deactivate Confirmation',
      message: 'Are you sure you want to deactivate ' + row.name + '?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-warn',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.deactivateRow(row);
      }
    });
  }

  resetDialogForm(keepCode: boolean = false): void {
    this.dialogSubmitted = false;
    this.dialogId = 0;

    if (!keepCode) {
      this.dialogCode = '';
    }

    this.dialogName = '';
    this.dialogCategoryIds = [];
    this.dialogSubCategoryIds = [];
    this.dialogPrice = 0;
    this.dialogItems = [];
    this.resetItemForm();
    this.setSubCategoryOptions(this.dialogCategoryIds, false);
    this.setFoodMenuOptions(this.dialogSubCategoryIds);
  }

  async loadLookupOptions(): Promise<void> {
    await this.loadCategories();
    await this.loadSubCategories();
    await this.loadFoodMenus();
  }

  async loadCategories(): Promise<void> {
    const orgId = this.getLookupOrgId();

    try {
      const res: any = await firstValueFrom(this.categoryService.getAll(orgId));
      this.categoryOptions = this.getResponseList(res).map((item: any) => ({
        label: this.getStringValue(item, 'name', 'Name'),
        value: this.getNumberValue(item, 'id', 'Id', 'ID')
      }));
    } catch {
      this.categoryOptions = [];
      this.toast.error('Load Failed', 'Unable to load categories.');
    }
  }

  async loadSubCategories(): Promise<void> {
    const orgId = this.getLookupOrgId();

    try {
      const res: any = await firstValueFrom(this.subCategoryService.getAll(orgId));
      this.allSubCategoryOptions = this.getResponseList(res).filter((item: any) => item.isactive === true).map((item: any) => ({
        ...item,
        id: this.getNumberValue(item, 'id', 'Id', 'ID'),
        name: this.getStringValue(item, 'name', 'Name'),
        categoryId: this.getNumberValue(item, 'categoryId', 'CategoryId', 'categoryid', 'categoryID', 'CategoryID', 'Categoryid')
      }));
      this.setSubCategoryOptions(this.dialogCategoryIds, false);
    } catch {
      this.allSubCategoryOptions = [];
      this.subCategoryOptions = [];
      this.toast.error('Load Failed', 'Unable to load subcategories.');
    }
  }

  async loadFoodMenus(): Promise<void> {
    const orgId = this.getLookupOrgId();

    try {
      const res: any = await firstValueFrom(this.menuService.getAll(orgId));
      this.allFoodMenuOptions = this.getResponseList(res).filter((item: any) => item.isactive === true).map((item: any) => ({
        label: this.getStringValue(item, 'name', 'Name'),
        value: this.getNumberValue(item, 'id', 'Id', 'ID'),
        subCategoryId: this.getNumberValue(item, 'subCategoryId', 'SubCategoryId', 'subcategoryid', 'subCategoryID', 'SubcategoryId', 'SubCategoryID'),
        price: this.getNumberValue(item, 'price', 'Price')
      }));
      this.setFoodMenuOptions(this.dialogSubCategoryIds);
    } catch {
      this.allFoodMenuOptions = [];
      this.foodMenuOptions = [];
      this.toast.error('Load Failed', 'Unable to load menu items.');
    }
  }

  onDialogCategoryChange(categoryIds: MultiSelectFieldValue): void {
    this.dialogCategoryIds = this.toSelectedIds(categoryIds);
    this.dialogSubCategoryIds = [];
    this.subCategoryOptions = [];
    this.foodMenuOptions = [];
    this.dialogItems = [];
    this.resetItemForm();

    this.setSubCategoryOptions(this.dialogCategoryIds);
  }

  onDialogSubCategoryChange(subCategoryIds: MultiSelectFieldValue): void {
    this.dialogSubCategoryIds = this.toSelectedIds(subCategoryIds);
    this.foodMenuOptions = [];
    this.dialogItems = [];
    this.resetItemForm();

    this.setFoodMenuOptions(this.dialogSubCategoryIds);
  }

  onFoodMenuChange(foodMenuId: number | null): void {
    this.selectedFoodMenuId = foodMenuId;
    const menu = this.foodMenuOptions.find((option) => Number(option.value) === Number(foodMenuId ?? 0));
    this.selectedFoodMenuPrice = menu ? Number(menu.price ?? 0) : null;
  }

  addComboItem(): void {
    if (!this.selectedFoodMenuId) {
      this.toast.warn('Item Required', 'Choose a food menu item first.');
      return;
    }

    const existingItem = this.dialogItems.find((item) => Number(item.FoodMenuId) === Number(this.selectedFoodMenuId));
    if (existingItem) {
      this.toast.warn('Duplicate Item', 'This food menu item is already added.');
      return;
    }

    const menu = this.foodMenuOptions.find((option) => Number(option.value) === Number(this.selectedFoodMenuId));
    this.dialogItems = [
      ...this.dialogItems,
      {
        FoodMenuId: Number(this.selectedFoodMenuId),
        FoodMenuName: menu?.label ?? '',
        Qty: Number(this.selectedFoodMenuQty || 1),
        Price: this.selectedFoodMenuPrice === null ? null : Number(this.selectedFoodMenuPrice)
      }
    ];
    this.resetItemForm();
  }

  removeComboItem(item: ComboMenuItemRow): void {
    this.dialogItems = this.dialogItems.filter((row) => row.FoodMenuId !== item.FoodMenuId);
  }

  private setSubCategoryOptions(categoryIds: MultiSelectFieldValue, resetInvalidSelection = true): void {
    const selectedCategoryIds = this.toSelectedIds(categoryIds);

    if (!selectedCategoryIds.length) {
      this.subCategoryOptions = [];
      this.dialogSubCategoryIds = [];
      this.foodMenuOptions = [];
      return;
    }

    this.subCategoryOptions = this.allSubCategoryOptions
      .filter((item) => selectedCategoryIds.includes(Number(item.categoryId ?? 0)))
      .map((item: any) => ({
        label: item.name ?? this.getStringValue(item, 'Name'),
        value: Number(item.id ?? item.Id)
      }));

    if (resetInvalidSelection) {
      this.dialogSubCategoryIds = this.toSelectedIds(this.dialogSubCategoryIds)
        .filter((id) => this.subCategoryOptions.some((option) => Number(option.value) === id));
    }

    this.setFoodMenuOptions(this.dialogSubCategoryIds);
  }
  private resetItemForm(): void {
    this.selectedFoodMenuId = null;
    this.selectedFoodMenuQty = 1;
    this.selectedFoodMenuPrice = null;
  }

  private setFoodMenuOptions(subCategoryIds: MultiSelectFieldValue): void {
    const selectedSubCategoryIds = this.toSelectedIds(subCategoryIds);

    this.foodMenuOptions = selectedSubCategoryIds.length
      ? this.allFoodMenuOptions.filter((item) => selectedSubCategoryIds.includes(Number(item.subCategoryId ?? 0)))
      : [];

    if (
      this.selectedFoodMenuId &&
      !this.foodMenuOptions.some((option) => Number(option.value) === Number(this.selectedFoodMenuId))
    ) {
      this.resetItemForm();
    }
  }

  private isDialogFormValid(): boolean {
    const areTextFieldsValid = this.textFields?.toArray().every((field) => field.isValid) ?? true;
    const areSelectFieldsValid = this.selectFields?.toArray().every((field) => field.isValid) ?? true;
    const areMultiSelectFieldsValid = this.multiSelectFields?.toArray().every((field) => field.isValid) ?? true;
    return areTextFieldsValid && areSelectFieldsValid && areMultiSelectFieldsValid;
  }

  private mapComboMenuItems(source: any): ComboMenuItemRow[] {
    const items = source?.ComboMenuItems ?? source?.comboMenuItems ?? source?.Items ?? source?.items ?? [];

    return (Array.isArray(items) ? items : []).map((item: any) => {
      const foodMenuId = this.getNumberValue(item, 'FoodMenuId', 'foodMenuId', 'FoodMenuID', 'foodMenuID');
      const menuPrice = this.getFoodMenuPrice(foodMenuId);

      return {
        Id: this.getNumberValue(item, 'Id', 'id'),
        FoodMenuId: foodMenuId,
        FoodMenuName: this.getStringValue(
          item,
          'FoodMenuName',
          'foodMenuName',
          'FoodMenu',
          'foodMenu',
          'MenuName',
          'menuName',
          'name'
        ) || this.getFoodMenuName(foodMenuId),
        Qty: this.getNumberValue(item, 'Qty', 'qty') || 1,
        Price: menuPrice ?? this.getNumberValue(item, 'Price', 'price')
      };
    });
  }

  private getFoodMenuName(foodMenuId: number): string {
    const menu = [...this.foodMenuOptions, ...this.allFoodMenuOptions]
      .find((option) => Number(option.value) === Number(foodMenuId));

    return menu?.label ?? '';
  }

  private getFoodMenuPrice(foodMenuId: number): number | null {
    const menu = [...this.foodMenuOptions, ...this.allFoodMenuOptions]
      .find((option) => Number(option.value) === Number(foodMenuId));

    return menu ? Number(menu.price ?? 0) : null;
  }

 

  private buildComboMenuItemsPayload(): ComboMenuItem[] {
     const orgId = Number(this.userDetails.OrgId || 0);
    return this.dialogItems.map((item) => ({
      Id: item.Id,
      ComboMenuId: this.dialogId || undefined,
      FoodMenuId: item.FoodMenuId,
      Qty: Number(item.Qty || 1),
      Price: item.Price === null ? null : Number(item.Price),
      OrgId: orgId,
      IsActive: true,
      IsDeleted: false,
      CreatedBy: this.isEditMode ? undefined : Number(this.userDetails.UserId || 0),
      UpdatedBy: this.isEditMode ? Number(this.userDetails.UserId || 0) : undefined
    }));
  }

  private getLookupOrgId(): number {
    return Number(this.userDetails.OrgId || 0);
  }

  private getResponseList(response: any): any[] {
    const result = response?.result ?? response?.Result ?? response;
    return Array.isArray(result) ? result : [];
  }

  private toSelectedIds(value: MultiSelectFieldValue | any[]): number[] {
    return (Array.isArray(value) ? value : [])
      .map((item: any) => Number(typeof item === 'object' ? item?.value ?? item?.id ?? item?.Id : item))
      .filter((id) => !Number.isNaN(id) && id > 0);
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

  private getFirstSelectedId(value: MultiSelectFieldValue): number {
    return Number(value?.[0] ?? 0);
  }

  private isAlreadyExistsResponse(response: any): boolean {
    return response === 'AlreadyExists' ||
      response?.result === 'AlreadyExists' ||
      response?.message === 'AlreadyExists' ||
      response?.ErrorInfo?.Message === 'AlreadyExists';
  }

  private getRowActionItems(row: ComboMenuRow): MenuItem[] {
    const items: MenuItem[] = [
      { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') }
    ];

    const isActive = this.getBooleanValue(row, 'isactive', 'IsActive', 'isActive');

    if (isActive) {
      items.unshift({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
      items.push({ label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
    } else {
      items.push({ label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
    }

    return items;
  }

  private handleRowAction(action: 'edit' | 'delete' | 'activate' | 'deactivate'): void {
    if (!this.selectedRow) {
      return;
    }

    if (action === 'edit') {
      this.editRow(this.selectedRow);
    } else if (action === 'delete') {
      this.confirmDeleteRow(this.selectedRow);
    } else if (action === 'activate') {
      this.confirmActivateRow(this.selectedRow);
    } else {
      this.confirmDeactivateRow(this.selectedRow);
    }
  }
}

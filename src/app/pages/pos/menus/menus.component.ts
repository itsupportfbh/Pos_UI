import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, QueryList, inject, ViewChildren } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { SelectFieldComponent } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { SharedTableCellTemplateDirective, SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';
import { AppToastService } from '../../../services/app-toast.service';
import { Menu, MenuService } from '../../../services/FoodMenu.service';
import { CategoryService } from '../../../services/Category.service';
import { subCategory, subCategoryService } from '../../../services/SubCategory.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MultiSelectFieldComponent, MultiSelectFieldValue } from '../../../components/form/multiselect-field.component';
import { OrganizationService } from '../../../services/organization.service';
import { firstValueFrom } from 'rxjs';
import { EntityMasterService } from '../../../services/entitymaster.service';
import { TableExportService } from '../../../services/table-export.service';

type MenuRow = {
  id: number;
  code: string;
  name: string;
  categoryId: number;
  subCategoryId: number;
  price: number;
  preparationTime: number | null;
  serviceCharge: number | null;
  orgId: number;
  isActive: boolean;
  createdBy?: number | null;
  createdDate?: string;
  updatedBy?: number | null;
  updatedDate?: string | null;
  isDeleted?: boolean;
  status: string;
  rowNumber: number;
};

const MENU_COLUMNS: SharedTableColumn<MenuRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '5rem' },
  { field: 'organizationname', header: 'Organization Name', sortable: true, width: '16rem', hidden: true },
  { field: 'code', header: 'Code', sortable: true, width: '10rem' },
  { field: 'name', header: 'Name', sortable: true, width: '18rem' },
  { field: 'categoryId', header: 'Category ID', sortable: true, width: '10rem', hidden: true },
  { field: 'categoryname', header: 'Category', sortable: true, width: '10rem' },
  { field: 'subCategoryName', header: 'SubCategory', sortable: true, width: '10rem' },
  { field: 'price', header: 'Price', sortable: true, width: '10rem' },
  {
    field: 'Status',
    header: 'Status',
    sortable: true,
    width: '9rem'
  }
];

@Component({
  selector: 'app-menus',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, DialogModule, TextFieldComponent, ActionButtonsComponent, SelectFieldComponent, MenuModule, SharedTableComponent, ConfirmDialogModule, SharedTableCellTemplateDirective, MultiSelectFieldComponent, ProgressSpinnerModule],
  providers: [ConfirmationService],
  templateUrl: './menus.component.html',
  styleUrl: './menus.component.css'
})
export class MenusComponent {
  
  
  private readonly toast = inject(AppToastService);
  
  
  private readonly menuService = inject(MenuService);
  private readonly categoryService = inject(CategoryService);
  private readonly subCategoryService = inject(subCategoryService);
  private readonly entityMasterService = inject(EntityMasterService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly organizationService = inject(OrganizationService);
  private readonly tableExportService = inject(TableExportService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  @ViewChildren(SelectFieldComponent) private readonly selectFields?: QueryList<SelectFieldComponent>;
  @ViewChildren(MultiSelectFieldComponent) private readonly multiSelectFields?: QueryList<MultiSelectFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isLoading = false;
  pageLoading = false;
  isEditMode = false;
  filterMenuName = '';
  dialogMenuCode = '';
  dialogMenuName = '';
  dialogSubmitted = false;
  OrgId = 0;
  BranchId = 0;
  userDetails: any = {};

  tableRows: MenuRow[] = [];
  selectedRow: MenuRow | null = null;
  editingMenuId: number | null = null;

  categoryOptions: any[] = [];
  subCategoryOptions: any[] = [];
  allSubCategoryOptions: (subCategory & { id?: number; categoryId?: number })[] = [];
  categoryfilterOptions: any[] = [];
  dialogCategory: number | null = null;

  allmenus: MenuRow[] = [];
  selectedCategoryIds: MultiSelectFieldValue = [];

  dialogModel: Menu = {
    Id: 0,
    code: '',
    name: '',
    categoryId: 0,
    subCategoryId: 0,
    price: 0,
    preparationTime: 0,
    serviceCharge: 0,
    OrgId: this.OrgId,
    IsActive: true,
    CreatedBy: 1,
    UpdatedBy: 1,
    IsDeleted: false
  };

  readonly pageEyebrow = 'Menu Management';
  readonly pageTitle = 'Menus';
  readonly pageSubtitle = 'Manage your menus here.';
  readonly pageLoadingTitle = 'Please wait';
  readonly pageLoadingSubtitle = 'Loading records...';
  readonly filterTitle = `${'Menus'} Filters`;
  readonly filterDescription = `API data will be loaded for ${'Menus'.toLowerCase()}.`;
  readonly fields: any[] = [{ key: 'MenuName', label: 'Menu Name', type: 'text', placeholder: 'Enter menu name' }];
  readonly primaryActionLabel = `Search ${'Menus'}`;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Menu';
  dialogSubtitle = 'Create a new menu.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Menus';
  readonly tableCaption = 'Menus';
  tableColumns = MENU_COLUMNS;
  menuRights = { View: true, Create: true, Edit: true, Delete: true, ActiveInActive: true, Print: true, Download: true };
  showAddNewButton = true;
  readonly addNewButtonLabel = this.showAddNewButton ? 'Add New' : '';
  showDownloadButton = true;
  readonly showFilterButton = true;
  showRowActions = true;
  readonly rowActionHeader = 'Actions';
  downloadLoading = false;
  downloadLoadingLabel = 'Exporting...';
  rowActionItems: MenuItem[] = [];
  MenuEntityNo = Number(sessionStorage.getItem("currentMenuEntityNo") || 0);

  async ngOnInit(): Promise<void> {
    this.pageLoading = true;
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.OrgId = Number(this.userDetails.OrgId || 0);
    await this.loadMenuRights();
    this.loadMenus();
    this.tableColumns = MENU_COLUMNS.map((x: any) => {
      if (x.field === 'organizationname') {
        x.hidden = this.userDetails.RoleId !== 1;
      }

      return x;
    });

    this.loadCategories();
    this.loadSubCategories();
    this.loadFilterCategories();
  }

  async loadMenuRights(): Promise<void> {
    const orgId = Number(this.userDetails?.OrganizationId || this.userDetails?.OrgId || 0);
    const roleId = Number(this.userDetails?.RoleId || 0);
    const entityNo = Number(this.MenuEntityNo || 0);

    if (!orgId || !roleId || !entityNo) {
      return;
    }

    try {
      const response: any = await firstValueFrom(this.entityMasterService.GetRoleRightsByRoleId(orgId, roleId, entityNo));
      const rights = response?.result?.[0];

      if (rights) {
        this.menuRights = {
          View: rights.View === true,
          Create: rights.Create === true,
          Edit: rights.Edit === true,
          Delete: rights.Delete === true,
          ActiveInActive: rights.ActiveInActive === true,
          Print: rights.Print === true,
          Download: rights.Download === true
        };
      }

      this.showAddNewButton = this.menuRights.Create;
      this.showDownloadButton = this.menuRights.Download;
      this.showRowActions = this.menuRights.Edit || this.menuRights.Delete || this.menuRights.ActiveInActive || this.menuRights.Print;
    } catch {
      this.menuRights = { View: true, Create: false, Edit: false, Delete: false, ActiveInActive: false, Print: false, Download: false };
      this.showAddNewButton = false;
      this.showDownloadButton = false;
      this.showRowActions = false;
      this.toast.error('Rights Load Failed', 'Unable to load menu rights for this role.');
    }
  }

  loadCategories() {
    this.categoryService.getAll(this.OrgId).subscribe((res: any) => {
      this.categoryOptions = (res.result || []).map((item: any) => ({
        label: item.name,
        value: item.id
      }));
    });
  }
  loadSubCategories(): void {
    this.subCategoryService.getAll(this.OrgId).subscribe((res: any) => {
      this.allSubCategoryOptions = (res.result || []).map((item: any) => ({
        ...item,
        id: item.id ?? item.Id,
        categoryId: item.categoryId ?? item.CategoryId
      }));
      this.setSubCategoryOptions(this.dialogModel.categoryId ?? 0, false);
    });
  }

  onDialogCategoryChange(categoryId: number | null): void {
    this.dialogModel.categoryId = categoryId ?? 0;
    this.dialogModel.subCategoryId = 0;
    this.setSubCategoryOptions(this.dialogModel.categoryId);
  }

  private setSubCategoryOptions(categoryId: number | null | undefined, resetInvalidSelection = true): void {
    const selectedCategoryId = Number(categoryId ?? 0);

    this.subCategoryOptions = this.allSubCategoryOptions
      .filter((item) => !selectedCategoryId || Number(item.categoryId ?? 0) === selectedCategoryId)
      .map((item: any) => ({
        label: item.name ?? item.Name,
        value: item.id ?? item.Id
      }));

    if (
      resetInvalidSelection &&
      this.dialogModel.subCategoryId &&
      !this.subCategoryOptions.some((option) => Number(option.value) === Number(this.dialogModel.subCategoryId))
    ) {
      this.dialogModel.subCategoryId = 0;
    }
  }

  loadFilterCategories() {
    this.categoryService.getAll(this.OrgId).subscribe((res: any) => {
      this.categoryfilterOptions = (res.result || []).map((item: any) => ({
        label: item.name,
        value: item.id
      }));
    });
  }

  onfilterCategoryChange(value: MultiSelectFieldValue): void {
    const arr = Array.isArray(value) ? value : value ? [value] : [];
    this.selectedCategoryIds = arr.map(v => Number(v));
  }

  loadMenus(): void {
    this.isLoading = true;
    this.OrgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId);
    this.BranchId = Number(this.userDetails.IsAdmin || 0) === 1 ? 0 : Number(this.userDetails.BranchId);


    this.menuService.getAll(this.OrgId).subscribe({
      next: (response: any) => {
        const result = response?.result ?? response ?? [];
        let RowNumber = 1;
        this.allmenus = (response.result ?? []).map((x: any) => {
          x.RowNumber = RowNumber++;
          x.Status = x.isactive ? 'Active' : 'Inactive';
          return x;
        });
        this.tableRows = [...this.allmenus];
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.pageLoading = false;
        this.toast.error(
          'Load Failed',
          'Unable to load menus. Please check API and try again.'
        );
        this.changeDetector.detectChanges();
      },
      complete: () => {
        this.isLoading = false;
        this.pageLoading = false;
        this.changeDetector.detectChanges();
      }
    });
  }

  async exportMenusAsExcel(): Promise<void> {
    this.downloadLoading = true;
    this.downloadLoadingLabel = 'Excel exporting...';

    try {
      const orgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId);
      const response: any = await firstValueFrom(this.menuService.getAll(orgId));
      let RowNumber = 1;
      let exportRows = (response.result ?? []).map((x: any) => {
        x.RowNumber = RowNumber++;
        x.Status = x.isactive ? 'Active' : 'Inactive';
        return x;
      });
      const orgName = String(this.userDetails.OrgName || 'OrgName').trim();
      const fileName = `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-Menus`;
      const searchText = this.filterMenuName.trim().toLowerCase();
      const CategoryIds = this.selectedCategoryIds.map((id) => Number(id));

      exportRows = exportRows.filter((row: any) => {
        const matchesText = !searchText ||
          row.name?.toLowerCase().includes(searchText) ||
          row.code?.toLowerCase().includes(searchText);

        const matchesCategory = !CategoryIds.length || CategoryIds.includes(Number(row.categoryId ?? 0));
        return matchesText && matchesCategory;
      });

      if (!exportRows.length) {
        this.toast.warn('No Records', 'No menus are available to export.');
        return;
      }

      await this.tableExportService.exportExcel(fileName, this.tableColumns, exportRows, 'Menus');
      this.toast.success('Export Ready', 'Menu Excel export downloaded successfully.');
    } catch {
      this.toast.error('Export Failed', 'Unable to export menus to Excel.');
    } finally {
      this.downloadLoading = false;
      this.downloadLoadingLabel = 'Exporting...';
    }
  }

  async exportMenusAsPdf(): Promise<void> {
    this.downloadLoading = true;
    this.downloadLoadingLabel = 'PDF exporting...';

    try {
      const orgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId);
      const response: any = await firstValueFrom(this.menuService.getAll(orgId));
      let RowNumber = 1;
      let exportRows = (response.result ?? []).map((x: any) => {
        x.RowNumber = RowNumber++;
        x.Status = x.isactive ? 'Active' : 'Inactive';
        return x;
      });
      const orgName = String(this.userDetails.OrgName || 'OrgName').trim();
      const fileName = `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-Menus`;
      const searchText = this.filterMenuName.trim().toLowerCase();
      const CategoryIds = this.selectedCategoryIds.map((id) => Number(id));

      exportRows = exportRows.filter((row: any) => {
        const matchesText = !searchText ||
          row.name?.toLowerCase().includes(searchText) ||
          row.code?.toLowerCase().includes(searchText);

        const matchesCategory = !CategoryIds.length || CategoryIds.includes(Number(row.categoryId ?? 0));
        return matchesText && matchesCategory;
      });

      if (!exportRows.length) {
        this.toast.warn('No Records', 'No menus are available to export.');
        return;
      }

      await this.tableExportService.exportPdf(fileName, 'Menus', this.tableColumns, exportRows);
      this.toast.success('Export Ready', 'Menu PDF export downloaded successfully.');
    } catch {
      this.toast.error('Export Failed', 'Unable to export menus to PDF.');
    } finally {
      this.downloadLoading = false;
      this.downloadLoadingLabel = 'Exporting...';
    }
  }

  searchMenus(): void {
    const searchText = this.filterMenuName.trim().toLowerCase();
    const CategoryIds = this.selectedCategoryIds.map((id) => Number(id));

    this.tableRows = this.allmenus.filter((row) => {
      const matchesText = !searchText ||
        row.name?.toLowerCase().includes(searchText) ||
        row.code?.toLowerCase().includes(searchText);

      const matchesCategory = !CategoryIds.length || CategoryIds.includes(Number(row.categoryId ?? 0));
      return matchesText && matchesCategory;
    });
  }

  resetForm(): void {
    this.filterMenuName = '';
    this.loadMenus();
  }

  openFilterSidebar(): void {
    this.resetForm();
    this.showFilterSidebar = true;
  }

  closeFilterSidebar(): void {
    this.showFilterSidebar = false;
  }
  async openAddDialog(): Promise<void> {
    this.isEditMode = false;
    this.editingMenuId = null;
    this.resetDialogForm();
    this.showAddDialog = true;
    this.dialogTitle = 'Create Menu';
    this.dialogSubtitle = 'Create a new menu.';
    this.dialogPrimaryActionLabel = 'Save';

    await this.loadLatestSubCategoryCode(Number(this.userDetails.OrgId || 0));
    this.changeDetector.detectChanges();
  }

  private async loadLatestSubCategoryCode(orgId: number): Promise<void> {
    if (!this.MenuEntityNo || !orgId) {
      this.dialogModel.code = '';
      return;
    }

    try {
      const response: any = await firstValueFrom(this.organizationService.GetLatestCode(this.MenuEntityNo, orgId, this.BranchId));

      this.dialogModel.code = response?.result ?? '';
    } catch {
      this.dialogModel.code = '';
      this.toast.error('Load Failed', 'Unable to load menu code. Please check and try again.');
    }
  }

  closeAddDialog(): void {
    this.resetDialogForm();
    this.loadMenus();
    this.isEditMode = false;
    this.showAddDialog = false;
    this.dialogSubmitted = false;
  }

  submitAddDialog(): void {
    this.dialogSubmitted = true;

    if (!this.isDialogFormValid()) {
      return;
    }

    const payload: Menu = {
      ...this.dialogModel,
      subCategoryId: Number(this.dialogModel.subCategoryId ?? 0),
      preparationTime: Number(this.dialogModel.preparationTime ?? 0),
      serviceCharge: Number(this.dialogModel.serviceCharge ?? 0),
      OrgId: this.OrgId,
      IsActive: this.dialogModel.IsActive ?? true,
      IsDeleted: false,
      EntityNo: this.MenuEntityNo,
      BranchId: this.BranchId
    };

    if (this.isEditMode && this.editingMenuId) {
      payload.Id = this.editingMenuId;
      payload.UpdatedBy = 1;

      this.menuService.update(payload).subscribe({
        next: (response: any) => {
          if (response === 'AlreadyExists' || response?.message === 'AlreadyExists') {
            this.toast.warn('Duplicate', 'Menu already exists.');
            return;
          }

          this.toast.success('Updated', 'Menu updated successfully.');
          this.closeAddDialog();
          this.loadMenus();
        },
        error: () => {
          this.toast.error('Update Failed', 'Unable to update menu.');
        }
      });

      return;
    }

    payload.CreatedBy = 1;

    this.menuService.create(payload).subscribe({
      next: (response: any) => {
        if (response === 'AlreadyExists' || response?.message === 'AlreadyExists') {
          this.toast.warn('Duplicate', 'Menu already exists.');
          return;
        }

        this.toast.success('Saved', 'Menu saved successfully.');
        this.closeAddDialog();
        this.loadMenus();
      },
      error: () => {
        this.toast.error('Save Failed', 'Unable to save menu.');
      }
    });
  }

  editRow(row: MenuRow): void {
    this.isEditMode = true;
    this.editingMenuId = row.id;
    this.dialogTitle = 'Edit Menu';
    this.dialogSubtitle = 'Update the selected menu details.';
    this.dialogPrimaryActionLabel = 'Update';

    this.menuService.getById(row.id).subscribe({
      next: (response: any) => {
        const menu = response?.result?.[0] ?? response?.result ?? response;

        this.dialogModel = {
          Id: menu?.id ?? menu?.Id ?? row.id,
          code: menu?.code ?? menu?.Code ?? row.code,
          name: menu?.name ?? menu?.Name ?? row.name,
          categoryId: menu?.categoryId ?? menu?.CategoryId ?? row.categoryId,
          subCategoryId: menu?.subCategoryId ?? menu?.SubCategoryId ?? row.subCategoryId,
          price: menu?.price ?? menu?.Price ?? row.price,
          preparationTime: menu?.preparationTime ?? menu?.PreparationTime ?? row.preparationTime,
          serviceCharge: menu?.serviceCharge ?? menu?.ServiceCharge ?? row.serviceCharge,
          OrgId: menu?.orgId ?? menu?.OrgId ?? row.orgId,
          IsActive: menu?.isActive ?? menu?.IsActive ?? row.isActive,
          CreatedBy: menu?.createdBy ?? menu?.CreatedBy ?? 1,
          CreatedDate: menu?.createdDate ?? menu?.CreatedDate,
          UpdatedBy: menu?.updatedBy ?? menu?.UpdatedBy ?? 1,
          UpdatedDate: menu?.updatedDate ?? menu?.UpdatedDate,
          IsDeleted: menu?.isDeleted ?? menu?.IsDeleted ?? false
        };

        this.setSubCategoryOptions(this.dialogModel.categoryId, false);
        this.showAddDialog = true;
        //this.toast.info('Edit Mode', `Editing ${row.name}.`);
      },
      error: () => {
        this.toast.error('Load Failed', 'Unable to load menu details.');
      }
    });
  }

  deleteRow(row: MenuRow): void {
    this.menuService.delete(row.id).subscribe({
      next: () => {
        this.toast.warn('Deleted', `${row.name} removed successfully.`);
        this.loadMenus();
      },
      error: () => {
        this.toast.error('Delete Failed', 'Unable to delete menu.');
      }
    });
  }

  activateRow(row: MenuRow): void {
    this.menuService.activeInActive(row.id, true).subscribe({
      next: () => {
        this.toast.success('Status Updated', `${row.name} marked as active.`);
        this.loadMenus();
      },
      error: () => {
        this.toast.error('Update Failed', 'Unable to activate menu.');
      }
    });
  }

  deactivateRow(row: MenuRow): void {
    this.menuService.activeInActive(row.id, false).subscribe({
      next: () => {
        this.toast.info('Status Updated', `${row.name} marked as inactive.`);
        this.loadMenus();
      },
      error: () => {
        this.toast.error('Update Failed', 'Unable to deactivate menu.');
      }
    });
  }

  confirmDeleteRow(row: MenuRow): void {
    const name = row.name ?? row.code ?? 'this Category';

    this.confirmationService.confirm({
      header: 'Delete Confirmation',
      message: `Are you sure you want to delete ${name}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deleteRow(row);
      }
    });
  }

  confirmActivateRow(row: MenuRow): void {
    const name = row.name ?? row.code ?? 'this Category';

    this.confirmationService.confirm({
      header: 'Activate Confirmation',
      message: `Are you sure you want to activate ${name}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.activateRow(row);
      }
    });
  }

  confirmDeactivateRow(row: MenuRow): void {
    const name = row.name ?? row.code ?? 'this category';

    this.confirmationService.confirm({
      header: 'Inactive Confirmation',
      message: `Are you sure you want to inactive ${name}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-warn',
      accept: () => {
        this.deactivateRow(row);
      }
    });
  }

  openRowActions(menu: any, event: Event, row: MenuRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  private getRowActionItems(row: Record<string, unknown>): MenuItem[] {
    const items: MenuItem[] = [];

    if (this.menuRights.Edit && row['isactive'] === true) {
      items.push({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
    }

    if (this.menuRights.Delete) {
      items.push({ label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') });
    }

    if (this.menuRights.ActiveInActive) {
      if (row['isactive'] === true) {
        items.push({ label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
      } else {
        items.push({ label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
      }
    }

    if (this.menuRights.Print) {
      items.push({ label: 'Print', icon: 'pi pi-print', styleClass: 'row-action-print', command: () => this.handleRowAction('print') });
    }

    return items;
  }

  private isDialogFormValid(): boolean {
    const areTextFieldsValid = this.textFields?.toArray().every((field) => field.isValid) ?? true;
    const areSelectFieldsValid = this.selectFields?.toArray().every((field) => field.isValid) ?? true;


    return areTextFieldsValid && areSelectFieldsValid;
  }

  private handleRowAction(action: 'edit' | 'delete' | 'activate' | 'deactivate' | 'print'): void {
    if (!this.selectedRow) {
      return;
    }

    if (action === 'edit') {
      this.editRow(this.selectedRow);
    } else if (action === 'delete') {
      this.confirmDeleteRow(this.selectedRow);
    } else if (action === 'activate') {
      this.confirmActivateRow(this.selectedRow);
    } else if (action === 'print') {
      this.printRow(this.selectedRow);
    } else {
      this.confirmDeactivateRow(this.selectedRow);
    }
  }

  printRow(row: MenuRow): void {
    const name = String(row.name ?? row.code ?? 'this menu');
    this.toast.info('Print Pending', `Print functionality for ${name} will be added soon.`);
  }

  resetDialogForm(keepCode: boolean = false): void {
    const code = keepCode ? this.dialogModel.code ?? '' : '';
    this.dialogModel = {
      Id: 0,
      code,
      name: '',
      categoryId: 0,
      subCategoryId: 0,
      price: 0,
      serviceCharge: 0,
      preparationTime: 0,
      OrgId: this.OrgId,
      IsActive: true,
      CreatedBy: 1,
      UpdatedBy: 1,
      IsDeleted: false
    };
    this.setSubCategoryOptions(this.dialogModel.categoryId, false);
  }
}

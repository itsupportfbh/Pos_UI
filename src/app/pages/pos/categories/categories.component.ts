import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, QueryList, inject, ViewChildren } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { SharedTableCellTemplateDirective, SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';


import { AppToastService } from '../../../services/app-toast.service';


import { Category, CategoryService } from '../../../services/Category.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { EntityMasterService } from '../../../services/entitymaster.service';
import { firstValueFrom } from 'rxjs';
import { OrganizationService } from '../../../services/organization.service';
import { TableExportService } from '../../../services/table-export.service';

type CategoryRow = {
  id: number;
  code: string;
  name: string;
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

const CATEGORY_COLUMNS: SharedTableColumn<CategoryRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '5rem' },
  { field: 'organizationname', header: 'Organization Name', sortable: true, width: '16rem', hidden: true },
  { field: 'code', header: 'Code', sortable: true, width: '10rem' },
  { field: 'name', header: 'Name', sortable: true, width: '18rem' },
  {
    field: 'Status',
    header: 'Status',
    sortable: true,
    width: '9rem'
  }
];

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, DialogModule, TextFieldComponent, ActionButtonsComponent, MenuModule, SharedTableComponent, ConfirmDialogModule, SharedTableCellTemplateDirective],
  providers: [ConfirmationService],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css'
})
export class CategoriesComponent {
  
  
  private readonly toast = inject(AppToastService);
  
  
  private readonly categoryService = inject(CategoryService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly entityMasterService = inject(EntityMasterService);
  private readonly organizationService = inject(OrganizationService);
  private readonly tableExportService = inject(TableExportService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isLoading = false;
  isEditMode = false;
  dialogSubmitted = false;
  filterCategoryName = '';
  dialogCategoryCode = '';
  dialogCategoryName = '';
  OrgId = 0;
  BranchId = 0;
  userDetails: any = {};

  tableRows: CategoryRow[] = [];
  selectedRow: CategoryRow | null = null;
  editingCategoryId: number | null = null;

  dialogModel: Category = {
    Id: 0,
    code: '',
    name: '',
    OrgId: this.OrgId,
    IsActive: true,
    CreatedBy: 1,
    UpdatedBy: 1,
    IsDeleted: false
  };

  readonly pageEyebrow = 'Category Management';
  readonly pageTitle = 'Categories';
  readonly pageSubtitle = 'Manage your categories here.';
  readonly filterTitle = `${'Categories'} Filters`;
  readonly filterDescription = `API data will be loaded for ${'Categories'.toLowerCase()}.`;
  readonly fields: any[] = [{ key: 'categoryName', label: 'Category Name', type: 'text', placeholder: 'Enter category name' }];
  readonly primaryActionLabel = `Search ${'Categories'}`;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Category';
  dialogSubtitle = 'Create a new category.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Categories';
  readonly tableCaption = 'Categories';
  tableColumns = CATEGORY_COLUMNS;
  showAddNewButton = true;
  readonly addNewButtonLabel = this.showAddNewButton ? 'Add New' : '';
  showDownloadButton = true;
  readonly showFilterButton = true;
  showRowActions = true;
  readonly rowActionHeader = 'Actions';
  downloadLoading = false;
  downloadLoadingLabel = 'Exporting...';
  rowActionItems: MenuItem[] = [
    { label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') },
    { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') },
    { label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') },
    { label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') }
  ];

  CategoryEntityNo = Number(sessionStorage.getItem("currentMenuEntityNo") || 0);
  categoryRights = {
    View: true,
    Create: true,
    Edit: true,
    Delete: true,
    ActiveInActive: true,
    Print: true,
    Download: true
  };

  async ngOnInit(): Promise<void> {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.OrgId = Number(this.userDetails.OrgId || 0);
    await this.loadCategoryRights();
    this.tableColumns = CATEGORY_COLUMNS.map((x: any) => {
      if (x.field === 'organizationname') {
        x.hidden = this.userDetails.RoleId !== 1;
      }

      return x;
    });

    this.loadCategories();
  }

  async loadCategoryRights(): Promise<void> {
    try {
      const orgId = Number(this.userDetails?.OrgId || 0);
      const roleId = Number(this.userDetails?.RoleId || 0);
      const entityNo = Number(this.CategoryEntityNo || 0);
      const response: any = await firstValueFrom(this.entityMasterService.GetRoleRightsByRoleId(orgId, roleId, entityNo));
      const rights = response?.result?.[0] ?? {};

      this.categoryRights = {
        View: rights.View,
        Create: rights.Create,
        Edit: rights.Edit,
        Delete: rights.Delete,
        ActiveInActive: rights.ActiveInActive,
        Print: rights.Print,
        Download: rights.Download
      };

      this.showAddNewButton = this.categoryRights.Create;
      this.showDownloadButton = this.categoryRights.Download;
      this.showRowActions = this.categoryRights.Edit || this.categoryRights.Delete || this.categoryRights.ActiveInActive || this.categoryRights.Print;
    } catch {
      this.categoryRights = {
        View: true,
        Create: false,
        Edit: false,
        Delete: false,
        ActiveInActive: false,
        Print: false,
        Download: false
      };
      this.showAddNewButton = false;
      this.showDownloadButton = false;
      this.showRowActions = false;
      this.toast.error('Rights Load Failed', 'Unable to load category rights. Please check and try again.');
    }
  }

  loadCategories(): void {
    this.isLoading = true;
    this.OrgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId);
    this.BranchId = Number(this.userDetails.IsAdmin || 0) === 1 ? 0 : Number(this.userDetails.BranchId);

    this.categoryService.getAll(this.OrgId).subscribe({
      next: (response: any) => {
        let RowNumber = 1;
        this.tableRows = (response.result ?? []).map((x: any) => {
          x.RowNumber = RowNumber++;
          x.Status = x.isactive ? 'Active' : 'Inactive';
          return x;
        });
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.toast.error(
          'Load Failed',
          'Unable to load categories. Please check API and try again.'
        );
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  async exportCategoriesAsExcel(): Promise<void> {
    this.downloadLoading = true;
    this.downloadLoadingLabel = 'Excel exporting...';

    try {
      const orgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId);
      const response: any = await firstValueFrom(this.categoryService.getAll(orgId));
      let RowNumber = 1;
      let exportRows = (response.result ?? []).map((x: any) => {
        x.RowNumber = RowNumber++;
        x.Status = x.isactive ? 'Active' : 'Inactive';
        return x;
      });
      const orgName = String(this.userDetails.OrgName || 'OrgName').trim();
      const fileName = `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-Categories`;
      const searchText = this.filterCategoryName.trim().toLowerCase();

      if (searchText) {
        exportRows = exportRows.filter((row: any) =>
          row.name?.toLowerCase().includes(searchText) ||
          row.code?.toLowerCase().includes(searchText)
        );
      }

      if (!exportRows.length) {
        this.toast.warn('No Records', 'No categories are available to export.');
        return;
      }

      await this.tableExportService.exportExcel(fileName, this.tableColumns, exportRows, 'Categories');
      this.toast.success('Export Ready', 'Category Excel export downloaded successfully.');
    } catch {
      this.toast.error('Export Failed', 'Unable to export categories to Excel.');
    } finally {
      this.downloadLoading = false;
      this.downloadLoadingLabel = 'Exporting...';
    }
  }

  async exportCategoriesAsPdf(): Promise<void> {
    this.downloadLoading = true;
    this.downloadLoadingLabel = 'PDF exporting...';

    try {
      const orgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId);
      const response: any = await firstValueFrom(this.categoryService.getAll(orgId));
      let RowNumber = 1;
      let exportRows = (response.result ?? []).map((x: any) => {
        x.RowNumber = RowNumber++;
        x.Status = x.isactive ? 'Active' : 'Inactive';
        return x;
      });
      const orgName = String(this.userDetails.OrgName || 'OrgName').trim();
      const fileName = `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-Categories`;
      const searchText = this.filterCategoryName.trim().toLowerCase();

      if (searchText) {
        exportRows = exportRows.filter((row: any) =>
          row.name?.toLowerCase().includes(searchText) ||
          row.code?.toLowerCase().includes(searchText)
        );
      }

      if (!exportRows.length) {
        this.toast.warn('No Records', 'No categories are available to export.');
        return;
      }

      await this.tableExportService.exportPdf(fileName, 'Categories', this.tableColumns, exportRows);
      this.toast.success('Export Ready', 'Category PDF export downloaded successfully.');
    } catch {
      this.toast.error('Export Failed', 'Unable to export categories to PDF.');
    } finally {
      this.downloadLoading = false;
      this.downloadLoadingLabel = 'Exporting...';
    }
  }

  searchCategories(): void {
    const searchText = this.filterCategoryName.trim().toLowerCase();

    if (!searchText) {
      this.loadCategories();
      return;
    }

    this.tableRows = this.tableRows.filter((row) =>
      row.name?.toLowerCase().includes(searchText) ||
      row.code?.toLowerCase().includes(searchText)
    );
  }

  resetForm(): void {
    this.filterCategoryName = '';
    this.loadCategories();
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
    this.editingCategoryId = null;
    this.resetDialogForm();
    this.showAddDialog = true;
    this.dialogTitle = 'Create Category';
    this.dialogSubtitle = 'Create a new category.';
    this.dialogPrimaryActionLabel = 'Save';

    await this.loadLatestTableCode(Number(this.userDetails.OrgId || 0));
    this.changeDetector.detectChanges();
  }

  private async loadLatestTableCode(orgId: number): Promise<void> {
    if (!this.CategoryEntityNo || !orgId) {
      this.dialogModel.code = '';
      return;
    }

    try {
      const response: any = await firstValueFrom(this.organizationService.GetLatestCode(this.CategoryEntityNo, orgId, this.BranchId));
      
      this.dialogModel.code = response?.result ?? '';
    } catch {
      this.dialogModel.code = '';
      this.toast.error('Load Failed', 'Unable to load category code. Please check and try again.');
    }
  }

  closeAddDialog(): void {
    this.resetDialogForm();
    this.loadCategories();
    this.isEditMode = false;
    this.showAddDialog = false;
    this.dialogSubmitted = false;
  }

  async submitAddDialog(): Promise<void> {
    this.dialogSubmitted = true;

    if (!this.isDialogFormValid()) {
      return;
    }

    const payload: Category = {
      ...this.dialogModel,
      OrgId: this.OrgId,
      IsActive: this.dialogModel.IsActive ?? true,
      IsDeleted: false,
      EntityNo: this.CategoryEntityNo,
      BranchId: this.BranchId
    };

    if (this.isEditMode && this.editingCategoryId) {
      payload.Id = this.editingCategoryId;
      payload.UpdatedBy = 1;

      this.categoryService.update(payload).subscribe({
        next: (response: any) => {
          if (response === 'AlreadyExists' || response?.message === 'AlreadyExists') {
            this.toast.warn('Duplicate', `${payload.name} already exists.`);
            return;
          }

          this.toast.success('Updated', `${payload.name} updated successfully.`);
          this.closeAddDialog();
          this.loadCategories();
        },
        error: () => {
          this.toast.error('Update Failed', 'Unable to update category.');
        }
      });

      return;
    }

    payload.CreatedBy = 1;

    this.categoryService.create(payload).subscribe({
      next: (response: any) => {
        if (response === 'AlreadyExists' || response?.message === 'AlreadyExists') {
          this.toast.warn('Duplicate', `${payload.name} already exists.`);
          return;
        }

        this.toast.success('Saved', `${payload.name} saved successfully.`);
        this.closeAddDialog();
        this.loadCategories();
      },
      error: () => {
        this.toast.error('Save Failed', 'Unable to save Category.');
      }
    });
  }

  editRow(row: CategoryRow): void {
    this.isEditMode = true;
    this.editingCategoryId = row.id;
    this.dialogTitle = 'Edit Category';
    this.dialogSubtitle = 'Update the selected Category details.';
    this.dialogPrimaryActionLabel = 'Update';

    this.categoryService.getById(row.id).subscribe({
      next: (response: any) => {
        const category = response?.result?.[0] ?? response?.result ?? response;

        this.dialogModel = {
          Id: category?.id ?? category?.Id ?? row.id,
          code: category?.code ?? category?.Code ?? row.code,
          name: category?.name ?? category?.Name ?? row.name,
          OrgId: category?.orgId ?? category?.OrgId ?? row.orgId,
          IsActive: category?.isActive ?? category?.IsActive ?? row.isActive,
          CreatedBy: category?.createdBy ?? category?.CreatedBy ?? 1,
          CreatedDate: category?.createdDate ?? category?.CreatedDate,
          UpdatedBy: category?.createdBy ?? category?.CreatedBy ?? 1,
          UpdatedDate: category?.updatedDate ?? category?.UpdatedDate,
          IsDeleted: category?.isDeleted ?? category?.IsDeleted ?? false
        };

        this.showAddDialog = true;
        //this.toast.info('Edit Mode', `Editing ${row.name}.`);
      },
      error: () => {
        this.toast.error('Load Failed', 'Unable to load category details.');
      }
    });
  }

  confirmDeleteRow(row: CategoryRow): void {
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

  deleteRow(row: CategoryRow): void {
    this.categoryService.delete(row.id).subscribe({
      next: () => {
        this.toast.warn('Deleted', `${row.name} removed successfully.`);
        this.loadCategories();
      },
      error: () => {
        this.toast.error('Delete Failed', 'Unable to delete category.');
      }
    });
  }

  confirmActivateRow(row: CategoryRow): void {
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

  confirmDeactivateRow(row: CategoryRow): void {
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

  activateRow(row: CategoryRow): void {
    this.categoryService.activeInActive(row.id, true).subscribe({
      next: () => {
        this.toast.success('Status Updated', `${row.name} marked as active.`);
        this.loadCategories();
      },
      error: () => {
        this.toast.error('Update Failed', 'Unable to activate category.');
      }
    });
  }

  deactivateRow(row: CategoryRow): void {
    this.categoryService.activeInActive(row.id, false).subscribe({
      next: () => {
        this.toast.info('Status Updated', `${row.name} marked as inactive.`);
        this.loadCategories();
      },
      error: () => {
        this.toast.error('Update Failed', 'Unable to deactivate category.');
      }
    });
  }

  printRow(row: CategoryRow): void {
    this.toast.info('Print Pending', `${String(row.name ?? row.code ?? 'Category')} print will be connected later.`);
  }

  openRowActions(menu: any, event: Event, row: CategoryRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  private getRowActionItems(row: Record<string, unknown>): MenuItem[] {
    const items: MenuItem[] = [];

    if (this.categoryRights.Edit && row['isactive'] === true) {
      items.push({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
    }

    if (this.categoryRights.Delete) {
      items.push({ label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') });
    }

    if (this.categoryRights.ActiveInActive && row['isactive'] === true) {
      items.push({ label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
    }

    if (this.categoryRights.ActiveInActive && row['isactive'] !== true) {
      items.push({ label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
    }

    if (this.categoryRights.Print) {
      items.push({ label: 'Print', icon: 'pi pi-print', styleClass: 'row-action-print', command: () => this.printRow(row as CategoryRow) });
    }

    return items;
  }

  private isDialogFormValid(): boolean {
    const areTextFieldsValid = this.textFields?.toArray().every((field) => field.isValid) ?? true;

    return areTextFieldsValid;
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

  resetDialogForm(keepCode: boolean = false): void {
    this.dialogSubmitted = false;
    const code = keepCode ? this.dialogModel.code ?? '' : '';
    this.dialogModel = {
      Id: 0,
      code,
      name: '',
      OrgId: this.OrgId,
      IsActive: true,
      CreatedBy: 1,
      UpdatedBy: 1,
      IsDeleted: false
    };
  }
}

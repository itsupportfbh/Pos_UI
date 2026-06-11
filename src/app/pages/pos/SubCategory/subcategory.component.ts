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


import { subCategory, subCategoryService } from '../../../services/SubCategory.service';
import { CategoryService } from '../../../services/Category.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { EntityMasterService } from '../../../services/entitymaster.service';
import { MultiSelectFieldComponent, MultiSelectFieldValue } from '../../../components/form/multiselect-field.component';
import { OrganizationService } from '../../../services/organization.service';
import { firstValueFrom } from 'rxjs';
import { TableExportService } from '../../../services/table-export.service';

type SubCategoryRow = {
  id: number;
  code: string;
  name: string;
  categoryId: number;
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

const SUBCATEGORY_COLUMNS: SharedTableColumn<SubCategoryRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '5rem' },
  { field: 'organizationname', header: 'Organization Name', sortable: true, width: '16rem', hidden: true },
  { field: 'code', header: 'Code', sortable: true, width: '10rem' },
  { field: 'name', header: 'Name', sortable: true, width: '18rem' },
  { field: 'categoryId', header: 'Category ID', sortable: true, width: '10rem', hidden: true },
  { field: 'categoryname', header: 'Category', sortable: true, width: '10rem' },
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
  imports: [CommonModule, ButtonModule, CardModule, DialogModule, TextFieldComponent, ActionButtonsComponent, SelectFieldComponent, MenuModule, SharedTableComponent, ConfirmDialogModule, SharedTableCellTemplateDirective, MultiSelectFieldComponent, ProgressSpinnerModule],
  providers: [ConfirmationService],
  templateUrl: './subcategory.component.html',
  styleUrl: './subcategory.component.css'
})
export class SubCategoryComponent {
  
  
  private readonly toast = inject(AppToastService);
  
  
  private readonly SubcategoryService = inject(subCategoryService);
  private readonly categoryService = inject(CategoryService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly entityMasterService = inject(EntityMasterService);
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
  dialogSubmitted = false;
  filterSubCategoryName = '';
  dialogSubCategoryCode = '';
  dialogSubCategoryName = '';
  OrgId = 0;
  BranchId = 0;
  userDetails: any = {};

  tableRows: SubCategoryRow[] = [];
  selectedRow: SubCategoryRow | null = null;
  editingSubCategoryId: number | null = null;
  allSubCategories: SubCategoryRow[] = [];

  categoryOptions: any[] = [];
  categoryfilterOptions: any[] = [];
  dialogCategory: number | null = null;
  selectedCategoryIds: MultiSelectFieldValue = [];

  dialogModel: subCategory = {
    Id: 0,
    code: '',
    name: '',
    categoryId: 0,
    OrgId: this.OrgId,
    IsActive: true,
    CreatedBy: 1,
    UpdatedBy: 1,
    IsDeleted: false
  };

  readonly pageEyebrow = 'SubCategory Management';
  readonly pageTitle = 'SubCategories';
  readonly pageSubtitle = 'Manage your subcategories here.';
  readonly pageLoadingTitle = 'Please wait';
  readonly pageLoadingSubtitle = 'Loading records...';
  readonly filterTitle = `${'SubCategories'} Filters`;
  readonly filterDescription = `API data will be loaded for ${'SubCategories'.toLowerCase()}.`;
  readonly fields: any[] = [{ key: 'SubcategoryName', label: 'SubCategory Name', type: 'text', placeholder: 'Enter subcategory name' }];
  readonly primaryActionLabel = `Search ${'SubCategories'}`;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create SubCategory';
  dialogSubtitle = 'Create a new subcategory.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'SubCategories';
  readonly tableCaption = 'SubCategories';
  tableColumns = SUBCATEGORY_COLUMNS;
  showAddNewButton = true;
  readonly addNewButtonLabel = this.showAddNewButton ? 'Add New' : '';
  showDownloadButton = true;
  readonly showFilterButton = true;
  showRowActions = true;
  readonly rowActionHeader = 'Actions';
  rowActionItems: MenuItem[] = [];
  downloadLoading = false;
  downloadLoadingLabel = 'Exporting...';
  subCategoryEntityNo = Number(sessionStorage.getItem("currentMenuEntityNo") || 0);
  subCategoryRights = {
    View: true,
    Create: true,
    Edit: true,
    Delete: true,
    ActiveInActive: true,
    Print: true,
    Download: true
  };

  async ngOnInit(): Promise<void> {
    this.pageLoading = true;
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.dialogModel.CreatedBy = Number(this.userDetails.UserId || 0);
    this.OrgId = Number(this.userDetails.OrgId || 0);
    await this.loadSubCategoryRights();
    this.tableColumns = SUBCATEGORY_COLUMNS.map((x: any) => {
      if (x.field === 'organizationname') {
        x.hidden = this.userDetails.RoleId !== 1;
      }

      return x;
    });

    this.loadSubCategories();
    this.loadCategories();
    this.loadFilterCategories();
  }

  async loadSubCategoryRights(): Promise<void> {
    try {
      const orgId = Number(this.userDetails?.OrgId || 0);
      const roleId = Number(this.userDetails?.RoleId || 0);
      const entityNo = Number(this.subCategoryEntityNo || 0);
      const response: any = await firstValueFrom(this.entityMasterService.GetRoleRightsByRoleId(orgId, roleId, entityNo));
      const rights = response?.result?.[0] ?? {};

      this.subCategoryRights = {
        View: rights.View,
        Create: rights.Create,
        Edit: rights.Edit,
        Delete: rights.Delete,
        ActiveInActive: rights.ActiveInActive,
        Print: rights.Print,
        Download: rights.Download
      };

      this.showAddNewButton = this.subCategoryRights.Create;
      this.showDownloadButton = this.subCategoryRights.Download;
      this.showRowActions = this.subCategoryRights.Edit || this.subCategoryRights.Delete || this.subCategoryRights.ActiveInActive || this.subCategoryRights.Print;
    } catch {
      this.subCategoryRights = {
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
      this.toast.error('Rights Load Failed', 'Unable to load sub category rights. Please check and try again.');
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

  loadSubCategories(): void {
    this.isLoading = true;

    this.OrgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId);
    this.BranchId = Number(this.userDetails.IsAdmin || 0) === 1 ? 0 : Number(this.userDetails.BranchId);

    this.SubcategoryService.getAll(this.OrgId).subscribe({
      next: (response: any) => {
        const result = response?.result ?? response ?? [];
        let RowNumber = 1;
        this.allSubCategories = (response.result ?? []).map((x: any) => {
          x.RowNumber = RowNumber++;
          x.Status = x.isactive ? 'Active' : 'Inactive';
          return x;
        });
        this.tableRows = [...this.allSubCategories];
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.pageLoading = false;
        this.toast.error(
          'Load Failed',
          'Unable to load categories. Please check API and try again.'
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

  async exportSubCategoriesAsExcel(): Promise<void> {
    this.downloadLoading = true;
    this.downloadLoadingLabel = 'Excel exporting...';

    try {
      const orgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId);
      const response: any = await firstValueFrom(this.SubcategoryService.getAll(orgId));
      let RowNumber = 1;
      let exportRows = (response.result ?? []).map((x: any) => {
        x.RowNumber = RowNumber++;
        x.Status = x.isactive ? 'Active' : 'Inactive';
        return x;
      });
      const orgName = String(this.userDetails.OrgName || 'OrgName').trim();
      const fileName = `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-SubCategories`;
      const searchText = this.filterSubCategoryName.trim().toLowerCase();
      const CategoryIds = this.selectedCategoryIds.map((id) => Number(id));

      exportRows = exportRows.filter((row: any) => {
        const matchesText = !searchText ||
          row.name?.toLowerCase().includes(searchText) ||
          row.code?.toLowerCase().includes(searchText);

        const matchesCategory = !CategoryIds.length || CategoryIds.includes(Number(row.categoryId ?? 0));
        return matchesText && matchesCategory;
      });

      if (!exportRows.length) {
        this.toast.warn('No Records', 'No subcategories are available to export.');
        return;
      }

      await this.tableExportService.exportExcel(fileName, this.tableColumns, exportRows, 'SubCategories');
      this.toast.success('Export Ready', 'SubCategory Excel export downloaded successfully.');
    } catch {
      this.toast.error('Export Failed', 'Unable to export subcategories to Excel.');
    } finally {
      this.downloadLoading = false;
      this.downloadLoadingLabel = 'Exporting...';
    }
  }

  async exportSubCategoriesAsPdf(): Promise<void> {
    this.downloadLoading = true;
    this.downloadLoadingLabel = 'PDF exporting...';

    try {
      const orgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId);
      const response: any = await firstValueFrom(this.SubcategoryService.getAll(orgId));
      let RowNumber = 1;
      let exportRows = (response.result ?? []).map((x: any) => {
        x.RowNumber = RowNumber++;
        x.Status = x.isactive ? 'Active' : 'Inactive';
        return x;
      });
      const orgName = String(this.userDetails.OrgName || 'OrgName').trim();
      const fileName = `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-SubCategories`;
      const searchText = this.filterSubCategoryName.trim().toLowerCase();
      const CategoryIds = this.selectedCategoryIds.map((id) => Number(id));

      exportRows = exportRows.filter((row: any) => {
        const matchesText = !searchText ||
          row.name?.toLowerCase().includes(searchText) ||
          row.code?.toLowerCase().includes(searchText);

        const matchesCategory = !CategoryIds.length || CategoryIds.includes(Number(row.categoryId ?? 0));
        return matchesText && matchesCategory;
      });

      if (!exportRows.length) {
        this.toast.warn('No Records', 'No subcategories are available to export.');
        return;
      }

      await this.tableExportService.exportPdf(fileName, 'SubCategories', this.tableColumns, exportRows);
      this.toast.success('Export Ready', 'SubCategory PDF export downloaded successfully.');
    } catch {
      this.toast.error('Export Failed', 'Unable to export subcategories to PDF.');
    } finally {
      this.downloadLoading = false;
      this.downloadLoadingLabel = 'Exporting...';
    }
  }

  searchSubCategories(): void {
    const searchText = this.filterSubCategoryName.trim().toLowerCase();
    const CategoryIds = this.selectedCategoryIds.map((id) => Number(id));

    this.tableRows = this.allSubCategories.filter((row) => {
      const matchesText = !searchText ||
        row.name?.toLowerCase().includes(searchText) ||
        row.code?.toLowerCase().includes(searchText);

      const matchesCategory = !CategoryIds.length || CategoryIds.includes(Number(row.categoryId ?? 0));
      return matchesText && matchesCategory;
    });
  }

  resetForm(): void {
    this.filterSubCategoryName = '';
    this.loadSubCategories();
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
    this.editingSubCategoryId = null;
    this.resetDialogForm();
    this.showAddDialog = true;
    this.dialogTitle = 'Create SubCategory';
    this.dialogSubtitle = 'Create a new subcategory.';
    this.dialogPrimaryActionLabel = 'Save';

    await this.loadLatestSubCategoryCode(Number(this.userDetails.OrgId || 0));
    this.changeDetector.detectChanges();
  }

  private async loadLatestSubCategoryCode(orgId: number): Promise<void> {
    if (!this.subCategoryEntityNo || !orgId) {
      this.dialogModel.code = '';
      return;
    }

    try {
      const response: any = await firstValueFrom(this.organizationService.GetLatestCode(this.subCategoryEntityNo, orgId, this.BranchId));

      this.dialogModel.code = response?.result ?? '';
    } catch {
      this.dialogModel.code = '';
      this.toast.error('Load Failed', 'Unable to load subcategory code. Please check and try again.');
    }
  }

  closeAddDialog(): void {
    this.resetDialogForm();
    this.loadSubCategories();
    this.isEditMode = false;
    this.showAddDialog = false;
    this.dialogSubmitted = false;
  }

  submitAddDialog(): void {
    this.dialogSubmitted = true;

    if (!this.isDialogFormValid()) {
      return;
    }

    const payload: subCategory = {
      ...this.dialogModel,
      OrgId: this.OrgId,
      IsActive: this.dialogModel.IsActive ?? true,
      IsDeleted: false,
      EntityNo: this.subCategoryEntityNo,
      BranchId: this.BranchId
    };

    if (this.isEditMode && this.editingSubCategoryId) {
      payload.Id = this.editingSubCategoryId;
      payload.UpdatedBy = 1;

      this.SubcategoryService.update(payload).subscribe({
        next: (response: any) => {
          if (response === 'AlreadyExists' || response?.message === 'AlreadyExists') {
            this.toast.warn('Duplicate', 'SubCategory already exists.');
            return;
          }

          this.toast.success('Updated', 'SubCategory updated successfully.');
          this.closeAddDialog();
          this.loadSubCategories();
        },
        error: () => {
          this.toast.error('Update Failed', 'Unable to update subcategory.');
        }
      });

      return;
    }

    payload.CreatedBy = 1;

    this.SubcategoryService.create(payload).subscribe({
      next: (response: any) => {
        if (response === 'AlreadyExists' || response?.message === 'AlreadyExists') {
          this.toast.warn('Duplicate', 'SubCategory already exists.');
          return;
        }

        this.toast.success('Saved', 'SubCategory saved successfully.');
        this.closeAddDialog();
        this.loadSubCategories();
      },
      error: () => {
        this.toast.error('Save Failed', 'Unable to save subcategory.');
      }
    });
  }

  editRow(row: SubCategoryRow): void {
    this.isEditMode = true;
    this.editingSubCategoryId = row.id;
    this.dialogTitle = 'Edit SubCategory';
    this.dialogSubtitle = 'Update the selected SubCategory details.';
    this.dialogPrimaryActionLabel = 'Update';

    this.SubcategoryService.getById(row.id).subscribe({
      next: (response: any) => {
        const subcategory = response?.result?.[0] ?? response?.result ?? response;

        this.dialogModel = {
          Id: subcategory?.id ?? subcategory?.Id ?? row.id,
          code: subcategory?.code ?? subcategory?.Code ?? row.code,
          name: subcategory?.name ?? subcategory?.Name ?? row.name,
          categoryId: subcategory?.categoryId ?? subcategory?.CategoryId ?? row.categoryId,
          OrgId: subcategory?.orgId ?? subcategory?.OrgId ?? row.orgId,
          IsActive: subcategory?.isActive ?? subcategory?.IsActive ?? row.isActive,
          CreatedBy: subcategory?.createdBy ?? subcategory?.CreatedBy ?? 1,
          CreatedDate: subcategory?.createdDate ?? subcategory?.CreatedDate,
          UpdatedBy: subcategory?.updatedBy ?? subcategory?.UpdatedBy ?? 1,
          UpdatedDate: subcategory?.updatedDate ?? subcategory?.UpdatedDate,
          IsDeleted: subcategory?.isDeleted ?? subcategory?.IsDeleted ?? false
        };

        this.showAddDialog = true;
        //this.toast.info('Edit Mode', `Editing ${row.name}.`);
      },
      error: () => {
        this.toast.error('Load Failed', 'Unable to load subcategory details.');
      }
    });
  }

  deleteRow(row: SubCategoryRow): void {
    this.SubcategoryService.delete(row.id).subscribe({
      next: () => {
        this.toast.warn('Deleted', `${row.name} removed successfully.`);
        this.loadSubCategories();
      },
      error: () => {
        this.toast.error('Delete Failed', 'Unable to delete subcategory.');
      }
    });
  }

  activateRow(row: SubCategoryRow): void {
    this.SubcategoryService.activeInActive(row.id, true).subscribe({
      next: () => {
        this.toast.success('Status Updated', `${row.name} marked as active.`);
        this.loadSubCategories();
      },
      error: () => {
        this.toast.error('Update Failed', 'Unable to activate subcategory.');
      }
    });
  }

  deactivateRow(row: SubCategoryRow): void {
    this.SubcategoryService.activeInActive(row.id, false).subscribe({
      next: () => {
        this.toast.info('Status Updated', `${row.name} marked as inactive.`);
        this.loadSubCategories();
      },
      error: () => {
        this.toast.error('Update Failed', 'Unable to deactivate subcategory.');
      }
    });
  }

  confirmDeleteRow(row: SubCategoryRow): void {
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

  confirmActivateRow(row: SubCategoryRow): void {
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

  confirmDeactivateRow(row: SubCategoryRow): void {
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

  printRow(row: SubCategoryRow): void {
    this.toast.info('Print Pending', `${String(row.name ?? row.code ?? 'SubCategory')} print will be connected later.`);
  }

  openRowActions(menu: any, event: Event, row: SubCategoryRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  private isDialogFormValid(): boolean {
    const areTextFieldsValid = this.textFields?.toArray().every((field) => field.isValid) ?? true;
    const areSelectFieldsValid = this.selectFields?.toArray().every((field) => field.isValid) ?? true;

    return areTextFieldsValid && areSelectFieldsValid;
  }

  private getRowActionItems(row: Record<string, unknown>): MenuItem[] {
    const items: MenuItem[] = [];

    if (this.subCategoryRights.Edit && row['isactive'] === true) {
      items.push({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
    }

    if (this.subCategoryRights.Delete) {
      items.push({ label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') });
    }

    if (this.subCategoryRights.ActiveInActive && row['isactive'] === true) {
      items.push({ label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
    }

    if (this.subCategoryRights.ActiveInActive && row['isactive'] !== true) {
      items.push({ label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
    }

    if (this.subCategoryRights.Print) {
      items.push({ label: 'Print', icon: 'pi pi-print', styleClass: 'row-action-print', command: () => this.printRow(row as SubCategoryRow) });
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

  resetDialogForm(keepCode: boolean = false): void {
    this.dialogSubmitted = false;
    const code = keepCode ? this.dialogModel.code ?? '' : '';
    this.dialogModel = {
      Id: 0,
      code,
      name: '',
      categoryId: 0,
      OrgId: this.OrgId,
      IsActive: true,
      CreatedBy: 1,
      UpdatedBy: 1,
      IsDeleted: false
    };
  }
}

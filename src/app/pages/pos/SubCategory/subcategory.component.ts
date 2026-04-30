import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, QueryList, inject, ViewChildren } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
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
import { MultiSelectFieldComponent, MultiSelectFieldValue } from '../../../components/form/multiselect-field.component';

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
  imports: [CommonModule, ButtonModule, CardModule, DialogModule, TextFieldComponent, ActionButtonsComponent, SelectFieldComponent, MenuModule, SharedTableComponent, ConfirmDialogModule, SharedTableCellTemplateDirective, MultiSelectFieldComponent],
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

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  @ViewChildren(SelectFieldComponent) private readonly selectFields?: QueryList<SelectFieldComponent>;
  @ViewChildren(MultiSelectFieldComponent) private readonly multiSelectFields?: QueryList<MultiSelectFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isLoading = false;
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
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = this.showAddNewButton ? 'Add New' : '';
  readonly showFilterButton = true;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';
  rowActionItems: MenuItem[] = [];

  ngOnInit(): void { 
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    const userId = Number(this.userDetails.UserId || 0);
    this.OrgId = Number(this.userDetails.OrgId || 0);
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
    this.showFilterSidebar = true;
  }

  closeFilterSidebar(): void {
    this.showFilterSidebar = false;
  }

  openAddDialog(): void {
    this.isEditMode = false;
    this.editingSubCategoryId = null;
    this.resetDialogForm();
    this.showAddDialog = true;
    this.dialogTitle = 'Create SubCategory';
    this.dialogSubtitle = 'Create a new subcategory.';
    this.dialogPrimaryActionLabel = 'Save';
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
      IsDeleted: false
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
    const items: MenuItem[] = [
      { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') }
    ];

    if (row['isactive'] === true) {
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

  private resetDialogForm(): void {
    this.dialogSubmitted = false;
    this.dialogModel = {
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
  }
}
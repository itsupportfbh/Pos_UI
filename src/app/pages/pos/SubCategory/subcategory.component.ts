import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
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
  { field: 'code', header: 'Code', sortable: true, width: '10rem' },
  { field: 'name', header: 'Name', sortable: true, width: '18rem' },
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
  imports: [CommonModule, ButtonModule, CardModule, DialogModule, TextFieldComponent, ActionButtonsComponent, SelectFieldComponent, MenuModule, SharedTableComponent, ConfirmDialogModule, SharedTableCellTemplateDirective],
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

  showAddDialog = false;
  showFilterSidebar = false;
  isLoading = false;
  isEditMode = false;
  filterSubCategoryName = '';
  dialogSubCategoryCode = '';
  dialogSubCategoryName = '';
  OrgId = 0;

  tableRows: SubCategoryRow[] = [];
  selectedRow: SubCategoryRow | null = null;
  editingSubCategoryId: number | null = null;

  categoryOptions: any[] = [];
  dialogCategory: number | null = null;

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

  readonly filterTitle = `${'SubCategories'} Filters`;
  readonly filterDescription = `API data will be loaded for ${'SubCategories'.toLowerCase()}.`;
  readonly fields: any[] = [{ key: 'SubcategoryName', label: 'SubCategory Name', type: 'text', placeholder: 'Enter subcategory name' }];
  readonly primaryActionLabel = `Search ${'SubCategories'}`;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create SubCategory';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'SubCategories';
  readonly tableCaption = 'SubCategories';
  readonly tableColumns = SUBCATEGORY_COLUMNS;
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = this.showAddNewButton ? 'Add New' : '';
  readonly showFilterButton = true;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';
  rowActionItems: MenuItem[] = [];

  ngOnInit(): void {
    const userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    const userId = Number(userDetails.UserId || 0);
    this.OrgId = Number(userDetails.OrgId || 0);
    this.loadSubCategories();
    this.loadCategories();
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
    this.isLoading = true;

    this.SubcategoryService.getAll(this.OrgId).subscribe({
      next: (response: any) => {
        const result = response?.result ?? response ?? [];
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

  searchSubCategories(): void {
    const searchText = this.filterSubCategoryName.trim().toLowerCase();

    if (!searchText) {
      this.loadSubCategories();
      return;
    }

    this.tableRows = this.tableRows.filter((row) =>
      row.name?.toLowerCase().includes(searchText) ||
      row.code?.toLowerCase().includes(searchText)
    );
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
    this.dialogPrimaryActionLabel = 'Save';
  }

  closeAddDialog(): void {
    this.resetDialogForm();
    this.loadSubCategories();
    this.isEditMode = false;
    this.showAddDialog = false;
  }

  submitAddDialog(): void {
    if (!this.dialogModel.code?.trim()) {
      this.toast.warn('Validation', 'Sub Category code is required.');
      return;
    }

    if (!this.dialogModel.name?.trim()) {
      this.toast.warn('Validation', 'Sub Category name is required.');
      return;
    }

    if (!this.dialogModel.categoryId || this.dialogModel.categoryId <= 0) {
      this.toast.warn('Validation', 'Category is required.');
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
        this.toast.info('Edit Mode', `Editing ${row.name}.`);
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
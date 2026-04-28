import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
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

  showAddDialog = false;
  showFilterSidebar = false;
  isLoading = false;
  isEditMode = false;
  filterCategoryName = '';
  dialogCategoryCode = '';
  dialogCategoryName = '';
  OrgId = 0;

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

  readonly filterTitle = `${'Categories'} Filters`;
  readonly filterDescription = `API data will be loaded for ${'Categories'.toLowerCase()}.`;
  readonly fields: any[] = [{ key: 'categoryName', label: 'Category Name', type: 'text', placeholder: 'Enter category name' }];
  readonly primaryActionLabel = `Search ${'Categories'}`;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Category';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Categories';
  readonly tableCaption = 'Categories';
  readonly tableColumns = CATEGORY_COLUMNS;
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = this.showAddNewButton ? 'Add New' : '';
  readonly showFilterButton = true;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';
  rowActionItems: MenuItem[] = [
    { label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') },
    { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') },
    { label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') },
    { label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') }
  ];

  ngOnInit(): void {
    const userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    const userId = Number(userDetails.UserId || 0);
    this.OrgId = Number(userDetails.OrgId || 0);
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading = true;

    this.categoryService.getAll(this.OrgId).subscribe({
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
    this.showFilterSidebar = true;
  }

  closeFilterSidebar(): void {
    this.showFilterSidebar = false;
  }
  openAddDialog(): void {
    this.isEditMode = false;
    this.editingCategoryId = null;
    this.resetDialogForm();
    this.showAddDialog = true;
    this.dialogTitle = 'Create Category';
    this.dialogPrimaryActionLabel = 'Save';
  }

  closeAddDialog(): void {
    this.resetDialogForm();
    this.loadCategories();
    this.isEditMode = false;
    this.showAddDialog = false;
  }

  submitAddDialog(): void {
    if (!this.dialogModel.code?.trim()) {
      this.toast.warn('Validation', 'Category code is required.');
      return;
    }

    if (!this.dialogModel.name?.trim()) {
      this.toast.warn('Validation', 'Category name is required.');
      return;
    }
    debugger;

    const payload: Category = {
      ...this.dialogModel,
      OrgId: this.OrgId,
      IsActive: this.dialogModel.IsActive ?? true,
      IsDeleted: false
    };

    console.log('Submitting category:', payload);

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
        this.toast.info('Edit Mode', `Editing ${row.name}.`);
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

  openRowActions(menu: any, event: Event, row: CategoryRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  private getRowActionItems(row: Record<string, unknown>): MenuItem[] {
    const items: MenuItem[] = [
      { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') }
    ];
    debugger;
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
      OrgId: this.OrgId,
      IsActive: true,
      CreatedBy: 1,
      UpdatedBy: 1,
      IsDeleted: false
    };
  }
}
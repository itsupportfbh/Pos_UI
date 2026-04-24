import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { SelectFieldComponent } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';
import { AppToastService } from '../../../services/app-toast.service';
import { Menu, MenuService } from '../../../services/FoodMenu.service';
import { Category, CategoryService } from '../../../services/Category.service';

type MenuRow = {
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

const MENU_COLUMNS: SharedTableColumn<MenuRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '5rem' },
  { field: 'code', header: 'Code', sortable: true, width: '10rem' },
  { field: 'name', header: 'Name', sortable: true, width: '18rem' },
  { field: 'categoryId', header: 'Category ID', sortable: true, width: '10rem' },
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
  imports: [CommonModule, ButtonModule, CardModule, DialogModule, TextFieldComponent, ActionButtonsComponent, SelectFieldComponent, MenuModule, SharedTableComponent],
  templateUrl: './menus.component.html',
  styleUrl: './menus.component.css'
})
export class MenusComponent {
  private readonly toast = inject(AppToastService);
  private readonly menuService = inject(MenuService);
  private readonly categoryService = inject(CategoryService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  showAddDialog = false;
  showFilterSidebar = false;
  isLoading = false;
  isEditMode = false;
  filterMenuName = '';
  dialogMenuCode = '';
  dialogMenuName = '';
  OrgId = 0;

  tableRows: MenuRow[] = [];
  selectedRow: MenuRow | null = null;
  editingMenuId: number | null = null;

  categoryOptions: any[] = [];
  dialogCategory: number | null = null;

  dialogModel: Menu = {
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

  readonly filterTitle = `${'Menus'} Filters`;
  readonly filterDescription = `API data will be loaded for ${'Menus'.toLowerCase()}.`;
  readonly fields: any[] = [{ key: 'MenuName', label: 'Menu Name', type: 'text', placeholder: 'Enter menu name' }];
  readonly primaryActionLabel = `Search ${'Menus'}`;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  readonly dialogTitle = 'Create Menu';
  readonly dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Menus';
  readonly tableCaption = 'Menus';
  readonly tableColumns = MENU_COLUMNS;
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = this.showAddNewButton ? 'Add New' : '';
  readonly showFilterButton = true;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';
  readonly rowActionItems: MenuItem[] = [
    { label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') },
    { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') },
    { label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') },
    { label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') }
  ];

  ngOnInit(): void {
    const userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    const userId = Number(userDetails.UserId || 0);
    this.OrgId = Number(userDetails.OrgId || 0);
    this.loadMenus();
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

  loadMenus(): void {
    this.isLoading = true;

    this.menuService.getAll(this.OrgId).subscribe({
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
          'Unable to load menus. Please check API and try again.'
        );
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  searchMenus(): void {
    const searchText = this.filterMenuName.trim().toLowerCase();

    if (!searchText) {
      this.loadMenus();
      return;
    }

    this.tableRows = this.tableRows.filter((row) =>
      row.name?.toLowerCase().includes(searchText) ||
      row.code?.toLowerCase().includes(searchText)
    );
  }

  resetForm(): void {
    this.filterMenuName = '';
    this.loadMenus();
  }

  openFilterSidebar(): void {
    this.showFilterSidebar = true;
  }

  closeFilterSidebar(): void {
    this.showFilterSidebar = false;
  }
  openAddDialog(): void {
    this.isEditMode = false;
    this.editingMenuId = null;
    this.resetDialogForm();
    this.showAddDialog = true;
  }

  closeAddDialog(): void {
    this.resetDialogForm();
    //this.showAddDialog = false;
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
    

    const payload: Menu = {
      ...this.dialogModel,
      OrgId: this.OrgId,
      IsActive: this.dialogModel.IsActive ?? true,
      IsDeleted: false
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

    this.menuService.getById(row.id).subscribe({
      next: (response: any) => {
        const menu = response?.result?.[0] ?? response?.result ?? response;

        this.dialogModel = {
          Id: menu?.id ?? menu?.Id ?? row.id,
          code: menu?.code ?? menu?.Code ?? row.code,
          name: menu?.name ?? menu?.Name ?? row.name,
          categoryId: menu?.categoryId ?? menu?.CategoryId ?? row.categoryId,
          OrgId: menu?.orgId ?? menu?.OrgId ?? row.orgId,
          IsActive: menu?.isActive ?? menu?.IsActive ?? row.isActive,
          CreatedBy: menu?.createdBy ?? menu?.CreatedBy ?? 1,
          CreatedDate: menu?.createdDate ?? menu?.CreatedDate,
          UpdatedBy: menu?.updatedBy ?? menu?.UpdatedBy ?? 1,
          UpdatedDate: menu?.updatedDate ?? menu?.UpdatedDate,
          IsDeleted: menu?.isDeleted ?? menu?.IsDeleted ?? false
        };

        this.showAddDialog = true;
        this.toast.info('Edit Mode', `Editing ${row.name}.`);
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

  openRowActions(menu: any, event: Event, row: MenuRow): void {
    this.selectedRow = row;
    menu.toggle(event);
  }

  private handleRowAction(action: 'edit' | 'delete' | 'activate' | 'deactivate'): void {
    if (!this.selectedRow) {
      return;
    }

    if (action === 'edit') {
      this.editRow(this.selectedRow);
    } else if (action === 'delete') {
      this.deleteRow(this.selectedRow);
    } else if (action === 'activate') {
      this.activateRow(this.selectedRow);
    } else {
      this.deactivateRow(this.selectedRow);
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
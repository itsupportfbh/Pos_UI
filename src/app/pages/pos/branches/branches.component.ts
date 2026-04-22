import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';

import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { AutocompleteFieldComponent } from '../../../components/form/autocomplete-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import {
  SharedTableColumn,
  SharedTableComponent
} from '../../../components/table/shared-table.component';

import { AppToastService } from '../../../services/app-toast.service';
import { Branch, BranchService } from '../../../services/branch.service';

type BranchRow = {
  id: number;
  code: string;
  name: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  contactMobileNo?: string;
  contactEmail?: string;
  address1?: string;
  address2?: string;
  city?: number;
  state?: number;
  postalCode?: number;
  country?: number;
  remarks?: string;
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

const BRANCH_COLUMNS: SharedTableColumn<BranchRow>[] = [
  { field: 'RowNumber', header: '#', sortable: false, width: '5rem' },
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
  selector: 'app-branches',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    DialogModule,
    TextFieldComponent,
    AutocompleteFieldComponent,
    ActionButtonsComponent,
    MenuModule,
    SharedTableComponent
  ],
  templateUrl: './branches.component.html',
  styleUrl: './branches.component.css'
})
export class BranchesComponent implements OnInit {
  private readonly toast = inject(AppToastService);
  private readonly branchService = inject(BranchService);
 private readonly changeDetector = inject(ChangeDetectorRef);
  // Replace this with logged-in user org id
   //orgId = this.userDetails.orgId;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  isLoading = false;

  filterBranchName = '';

  selectedRow: BranchRow | null = null;
  editingBranchId: number | null = null;

  dialogModel: Branch = {
    Id: 0,
    Code: '',
    Name: '',
    Phone: '',
    Email: '',
    ContactPerson: '',
    ContactMobileNo: '',
    ContactEmail: '',
    Address1: '',
    Address2: '',
    City: undefined,
    State: undefined,
    PostalCode: undefined,
    Country: undefined,
    Remarks: '',
    OrgId: undefined,
    IsActive: true,
    CreatedBy: 1,
    UpdatedBy: 1,
    IsDeleted: false
  };

  readonly pageEyebrow = 'Organization';
  readonly pageTitle = 'Branches';
  readonly pageSubtitle = 'Maintain store branches.';
  readonly filterTitle = 'Branch Filters';
  readonly filterDescription = 'Filter and manage branch records.';
  readonly primaryActionLabel = 'Search Branches';
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  readonly tableTitle = 'Branches';
  readonly tableCaption = 'Branches';
  readonly tableColumns = BRANCH_COLUMNS;
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = 'Add New';
  readonly showFilterButton = true;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';
userDetails: any = {};
  tableRows: BranchRow[] = [];

  readonly rowActionItems: MenuItem[] = [
    {
      label: 'Edit',
      icon: 'pi pi-pencil',
      styleClass: 'row-action-edit',
      command: () => this.handleRowAction('edit')
    },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      styleClass: 'row-action-delete',
      command: () => this.handleRowAction('delete')
    },
    {
      label: 'Active',
      icon: 'pi pi-check-circle',
      styleClass: 'row-action-active',
      command: () => this.handleRowAction('activate')
    },
    {
      label: 'Inactive',
      icon: 'pi pi-ban',
      styleClass: 'row-action-inactive',
      command: () => this.handleRowAction('deactivate')
    }
  ];

  get dialogTitle(): string {
    return this.isEditMode ? 'Edit Branch' : 'Create Branch';
  }

  get dialogSubtitle(): string {
    return this.isEditMode
      ? 'Update the selected branch details.'
      : 'Create a new branch for the organization.';
  }

  get dialogPrimaryActionLabel(): string {
    return this.isEditMode ? 'Update' : 'Save';
  }

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.loadBranches();
  }

  loadBranches(): void {
    this.isLoading = true;

    this.branchService.getAll(this.userDetails.orgId).subscribe({
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
          'Unable to load branches. Please check API and try again.'
        );
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  searchBranches(): void {
    const searchText = this.filterBranchName.trim().toLowerCase();

    if (!searchText) {
      this.loadBranches();
      return;
    }

    this.tableRows = this.tableRows.filter((row) =>
      row.name?.toLowerCase().includes(searchText) ||
      row.code?.toLowerCase().includes(searchText)
    );
  }

  resetForm(): void {
    this.filterBranchName = '';
    this.loadBranches();
  }

  openFilterSidebar(): void {
    this.showFilterSidebar = true;
  }

  closeFilterSidebar(): void {
    this.showFilterSidebar = false;
  }

  openAddDialog(): void {
    this.isEditMode = false;
    this.editingBranchId = null;
    this.resetDialogForm();
    this.showAddDialog = true;
  }

  closeAddDialog(): void {
    this.showAddDialog = false;
  }

  submitAddDialog(): void {
    if (!this.dialogModel.Code?.trim()) {
      this.toast.warn('Validation', 'Branch code is required.');
      return;
    }

    if (!this.dialogModel.Name?.trim()) {
      this.toast.warn('Validation', 'Branch name is required.');
      return;
    }

    const payload: Branch = {
      ...this.dialogModel,
      OrgId: this.userDetails.orgId,
      IsActive: this.dialogModel.IsActive ?? true,
      IsDeleted: false
    };

    if (this.isEditMode && this.editingBranchId) {
      payload.Id = this.editingBranchId;
      payload.UpdatedBy = 1;

      this.branchService.update(payload).subscribe({
        next: (response: any) => {
          if (response === 'AlreadyExists' || response?.message === 'AlreadyExists') {
            this.toast.warn('Duplicate', 'Branch already exists.');
            return;
          }

          this.toast.success('Updated', 'Branch updated successfully.');
          this.closeAddDialog();
          this.loadBranches();
        },
        error: () => {
          this.toast.error('Update Failed', 'Unable to update branch.');
        }
      });

      return;
    }

    payload.CreatedBy = this.userDetails.UserId;

    this.branchService.create(payload).subscribe({
      next: (response: any) => {
        if (response === 'AlreadyExists' || response?.message === 'AlreadyExists') {
          this.toast.warn('Duplicate', 'Branch already exists.');
          return;
        }

        this.toast.success('Saved', 'Branch saved successfully.');
        this.closeAddDialog();
        this.loadBranches();
      },
      error: () => {
        this.toast.error('Save Failed', 'Unable to save branch.');
      }
    });
  }

  editRow(row: BranchRow): void {
    this.isEditMode = true;
    this.editingBranchId = row.id;

    this.branchService.getById(row.id).subscribe({
      next: (response: any) => {
        const branch = response?.result?.[0] ?? response?.result ?? response;

        this.dialogModel = {
          Id: branch?.id ?? branch?.Id ?? row.id,
          Code: branch?.code ?? branch?.Code ?? row.code,
          Name: branch?.name ?? branch?.Name ?? row.name,
          Phone: branch?.phone ?? branch?.Phone ?? row.phone ?? '',
          Email: branch?.email ?? branch?.Email ?? row.email ?? '',
          ContactPerson: branch?.contactPerson ?? branch?.ContactPerson ?? row.contactPerson ?? '',
          ContactMobileNo: branch?.contactMobileNo ?? branch?.ContactMobileNo ?? row.contactMobileNo ?? '',
          ContactEmail: branch?.contactEmail ?? branch?.ContactEmail ?? row.contactEmail ?? '',
          Address1: branch?.address1 ?? branch?.Address1 ?? row.address1 ?? '',
          Address2: branch?.address2 ?? branch?.Address2 ?? row.address2 ?? '',
          City: branch?.city ?? branch?.City ?? row.city,
          State: branch?.state ?? branch?.State ?? row.state,
          PostalCode: branch?.postalCode ?? branch?.PostalCode ?? row.postalCode,
          Country: branch?.country ?? branch?.Country ?? row.country,
          Remarks: branch?.remarks ?? branch?.Remarks ?? row.remarks ?? '',
          OrgId: branch?.orgId ?? branch?.OrgId ?? row.orgId,
          IsActive: branch?.isActive ?? branch?.IsActive ?? row.isActive,
          CreatedBy: branch?.createdBy ?? branch?.CreatedBy ?? 1,
          CreatedDate: branch?.createdDate ?? branch?.CreatedDate,
          UpdatedBy: 1,
          UpdatedDate: branch?.updatedDate ?? branch?.UpdatedDate,
          IsDeleted: branch?.isDeleted ?? branch?.IsDeleted ?? false
        };

        this.showAddDialog = true;
        this.toast.info('Edit Mode', `Editing ${row.name}.`);
      },
      error: () => {
        this.toast.error('Load Failed', 'Unable to load branch details.');
      }
    });
  }

  deleteRow(row: BranchRow): void {
    this.branchService.delete(row.id).subscribe({
      next: () => {
        this.toast.warn('Deleted', `${row.name} removed successfully.`);
        this.loadBranches();
      },
      error: () => {
        this.toast.error('Delete Failed', 'Unable to delete branch.');
      }
    });
  }

  activateRow(row: BranchRow): void {
    this.branchService.activeInActive(row.id, true).subscribe({
      next: () => {
        this.toast.success('Status Updated', `${row.name} marked as active.`);
        this.loadBranches();
      },
      error: () => {
        this.toast.error('Update Failed', 'Unable to activate branch.');
      }
    });
  }

  deactivateRow(row: BranchRow): void {
    this.branchService.activeInActive(row.id, false).subscribe({
      next: () => {
        this.toast.info('Status Updated', `${row.name} marked as inactive.`);
        this.loadBranches();
      },
      error: () => {
        this.toast.error('Update Failed', 'Unable to deactivate branch.');
      }
    });
  }

  openRowActions(menu: any, event: Event, row: BranchRow): void {
    this.selectedRow = row;
    menu.toggle(event);
  }

  private resetDialogForm(): void {
    this.dialogModel = {
      Id: 0,
      Code: '',
      Name: '',
      Phone: '',
      Email: '',
      ContactPerson: '',
      ContactMobileNo: '',
      ContactEmail: '',
      Address1: '',
      Address2: '',
      City: undefined,
      State: undefined,
      PostalCode: undefined,
      Country: undefined,
      Remarks: '',
      OrgId: this.userDetails.orgId,
      IsActive: true,
      CreatedBy: 1,
      UpdatedBy: 1,
      IsDeleted: false
    };
  }

  private handleRowAction(action: 'edit' | 'delete' | 'activate' | 'deactivate'): void {
    if (!this.selectedRow) {
      return;
    }

    switch (action) {
      case 'edit':
        this.editRow(this.selectedRow);
        break;
      case 'delete':
        this.deleteRow(this.selectedRow);
        break;
      case 'activate':
        this.activateRow(this.selectedRow);
        break;
      case 'deactivate':
        this.deactivateRow(this.selectedRow);
        break;
    }
  }
}
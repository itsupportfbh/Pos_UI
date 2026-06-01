import { CommonModule } from '@angular/common';
import { Component, QueryList, ViewChildren, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MenuItem, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';

import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';


import { AppToastService } from '../../../services/app-toast.service';


import { SharedTableCellTemplateDirective, SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';
import { EntityMasterService } from '../../../services/entitymaster.service';

type DeliveryRow = {
  Id: number;
  Code: string;
  Name: string;
  Remarks: string;
  IsActive: boolean;
  Status: string;
  RowNumber: number;
};

const DELIVERY_COLUMNS: SharedTableColumn<DeliveryRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'Code', header: 'Code', sortable: true, width: '10rem' },
  { field: 'Name', header: 'Name', sortable: true, width: '18rem' },
  { field: 'Remarks', header: 'Remarks', sortable: true, width: '20rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '8rem' }
];

@Component({
  selector: 'app-delivery',
  standalone: true,
  imports: [
    CommonModule,
    ConfirmDialogModule,
    ButtonModule,
    CardModule,
    DialogModule,
    TextFieldComponent,
    ActionButtonsComponent,
    MenuModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective
  ],
  providers: [ConfirmationService],
  templateUrl: './delivery.component.html',
  styleUrl: './delivery.component.css'
})
export class DeliveryComponent {
  
  
  private readonly toast = inject(AppToastService);
  
  
  private readonly confirmationService = inject(ConfirmationService);
  private readonly entityMasterService = inject(EntityMasterService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  selectedRow: DeliveryRow | null = null;
  rowActionItems: MenuItem[] = [];
  allRows: DeliveryRow[] = [];
  tableRows: DeliveryRow[] = [];

  filterSearchText = '';
  dialogId = 0;
  dialogCode = '';
  dialogName = '';
  dialogRemarks = '';

  readonly pageEyebrow = 'POS';
  readonly pageTitle = 'Delivery';
  readonly pageSubtitle = 'Manage delivery records here.';
  readonly filterTitle = 'Delivery Filters';
  readonly primaryActionLabel = 'Search Delivery';
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Delivery';
  dialogSubtitle = 'Create a new delivery record.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Delivery';
  readonly tableCaption = 'Delivery';
  tableColumns = DELIVERY_COLUMNS;
  deliveryRights = { View: true, Create: true, Edit: true, Delete: true, ActiveInActive: true, Print: true, Download: true };
  showAddNewButton = true;
  readonly addNewButtonLabel = 'Add New';
  readonly showFilterButton = true;
  showRowActions = true;
  readonly rowActionHeader = 'Actions';
  userDetails: any = {};
  deliveryEntityNo = Number(sessionStorage.getItem("currentMenuEntityNo") || 0);

  async ngOnInit(): Promise<void> {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    await this.loadDeliveryRights();
    this.loadRows();
  }

  async loadDeliveryRights(): Promise<void> {
    const orgId = Number(this.userDetails?.OrganizationId || this.userDetails?.OrgId || 0);
    const roleId = Number(this.userDetails?.RoleId || 0);
    const entityNo = Number(this.deliveryEntityNo || 0);

    if (!orgId || !roleId || !entityNo) {
      return;
    }

    try {
      const response: any = await firstValueFrom(this.entityMasterService.GetRoleRightsByRoleId(orgId, roleId, entityNo));
      const rights = response?.result?.[0];

      if (rights) {
        this.deliveryRights = {
          View: rights.View === true,
          Create: rights.Create === true,
          Edit: rights.Edit === true,
          Delete: rights.Delete === true,
          ActiveInActive: rights.ActiveInActive === true,
          Print: rights.Print === true,
          Download: rights.Download === true
        };
      }

      this.showAddNewButton = this.deliveryRights.Create;
      this.showRowActions = this.deliveryRights.Edit || this.deliveryRights.Delete || this.deliveryRights.ActiveInActive || this.deliveryRights.Print;
    } catch {
      this.deliveryRights = { View: true, Create: false, Edit: false, Delete: false, ActiveInActive: false, Print: false, Download: false };
      this.showAddNewButton = false;
      this.showRowActions = false;
      this.toast.error('Rights Load Failed', 'Unable to load delivery rights for this role.');
    }
  }
  loadRows(): void {
    this.allRows = [];
    this.tableRows = [];
  }

  searchRows(): void {
    const searchText = this.filterSearchText.trim().toLowerCase();

    if (!searchText) {
      this.tableRows = [...this.allRows];
      return;
    }

    this.tableRows = this.allRows.filter((row) =>
      row.Code.toLowerCase().includes(searchText) ||
      row.Name.toLowerCase().includes(searchText) ||
      row.Remarks.toLowerCase().includes(searchText)
    );
  }

  resetForm(): void {
    this.filterSearchText = '';
    this.tableRows = [...this.allRows];
  }

  openFilterSidebar(): void {
    this.resetForm();
    this.showFilterSidebar = true;
  }

  closeFilterSidebar(): void {
    this.showFilterSidebar = false;
  }

  openAddDialog(): void {
    this.resetDialogForm();
    this.isEditMode = false;
    this.dialogTitle = 'Create ' + this.pageTitle;
    this.dialogSubtitle = 'Create a new ' + this.pageTitle.toLowerCase() + ' record.';
    this.dialogPrimaryActionLabel = 'Save';
    this.showAddDialog = true;
  }

  closeAddDialog(): void {
    this.resetDialogForm();
    this.isEditMode = false;
    this.dialogSubmitted = false;
    this.showAddDialog = false;
  }

  submitAddDialog(): void {
    this.dialogSubmitted = true;

    if (!this.isDialogFormValid()) {
      return;
    }

    if (this.isEditMode && this.dialogId) {
      this.allRows = this.allRows.map((row) => {
        if (row.Id === this.dialogId) {
          row.Code = this.dialogCode;
          row.Name = this.dialogName;
          row.Remarks = this.dialogRemarks;
        }

        return row;
      });

      this.toast.success('Updated', this.pageTitle + ' updated successfully.');
    } else {
      this.allRows.unshift({
        Id: Date.now(),
        Code: this.dialogCode,
        Name: this.dialogName,
        Remarks: this.dialogRemarks,
        IsActive: true,
        Status: 'Active',
        RowNumber: 0
      });

      this.toast.success('Saved', this.pageTitle + ' saved successfully.');
    }

    this.refreshRows();
    this.closeAddDialog();
  }

  editRow(row: DeliveryRow): void {
    this.isEditMode = true;
    this.dialogId = row.Id;
    this.dialogCode = row.Code;
    this.dialogName = row.Name;
    this.dialogRemarks = row.Remarks;
    this.dialogTitle = 'Edit ' + this.pageTitle;
    this.dialogSubtitle = 'Update the selected ' + this.pageTitle.toLowerCase() + ' record.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;
  }

  deleteRow(row: DeliveryRow): void {
    this.allRows = this.allRows.filter((item) => item.Id !== row.Id);
    this.refreshRows();
    this.toast.success('Deleted', row.Name + ' deleted successfully.');
  }

  activateRow(row: DeliveryRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = true;
        item.Status = 'Active';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Activated', row.Name + ' activated successfully.');
  }

  deactivateRow(row: DeliveryRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = false;
        item.Status = 'Inactive';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Deactivated', row.Name + ' deactivated successfully.');
  }

  openRowActions(menu: any, event: Event, row: DeliveryRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: DeliveryRow): void {
    this.confirmationService.confirm({
      header: 'Delete Confirmation',
      message: 'Are you sure you want to delete ' + row.Name + '?',
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

  confirmActivateRow(row: DeliveryRow): void {
    this.confirmationService.confirm({
      header: 'Activate Confirmation',
      message: 'Are you sure you want to activate ' + row.Name + '?',
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

  confirmDeactivateRow(row: DeliveryRow): void {
    this.confirmationService.confirm({
      header: 'Deactivate Confirmation',
      message: 'Are you sure you want to deactivate ' + row.Name + '?',
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
    this.dialogRemarks = '';
  }

  private refreshRows(): void {
    this.allRows = this.allRows.map((row, index) => {
      row.RowNumber = index + 1;
      row.Status = row.IsActive ? 'Active' : 'Inactive';
      return row;
    });

    this.searchRows();
  }

  private isDialogFormValid(): boolean {
    return this.textFields?.toArray().every((field) => field.isValid) ?? true;
  }

  private getRowActionItems(row: DeliveryRow): MenuItem[] {
    const items: MenuItem[] = [];

    if (this.deliveryRights.Edit && row.IsActive) {
      items.push({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
    }

    if (this.deliveryRights.Delete) {
      items.push({ label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') });
    }

    if (this.deliveryRights.ActiveInActive) {
      if (row.IsActive) {
        items.push({ label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
      } else {
        items.push({ label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
      }
    }

    if (this.deliveryRights.Print) {
      items.push({ label: 'Print', icon: 'pi pi-print', styleClass: 'row-action-print', command: () => this.handleRowAction('print') });
    }

    return items;
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

  printRow(row: DeliveryRow): void {
    const name = String(row.Name ?? row.Code ?? 'this delivery record');
    this.toast.info('Print Pending', `Print functionality for ${name} will be added soon.`);
  }
}



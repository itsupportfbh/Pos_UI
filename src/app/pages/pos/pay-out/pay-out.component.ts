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

type PayOutRow = {
  Id: number;
  ReferenceNo: string;
  Reason: string;
  DrawerName: string;
  ApprovedBy: string;
  Amount: number;
  Notes: string;
  IsActive: boolean;
  Status: string;
  RowNumber: number;
};

const PAY_OUT_COLUMNS: SharedTableColumn<PayOutRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'ReferenceNo', header: 'Reference', sortable: true, width: '11rem' },
  { field: 'Reason', header: 'Reason', sortable: true, width: '15rem' },
  { field: 'DrawerName', header: 'Drawer', sortable: true, width: '12rem' },
  { field: 'ApprovedBy', header: 'Approved By', sortable: true, width: '12rem' },
  { field: 'Amount', header: 'Amount', sortable: true, width: '10rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '8rem' }
];

@Component({
  selector: 'app-pay-out',
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
  templateUrl: './pay-out.component.html',
  styleUrl: './pay-out.component.css'
})
export class PayOutComponent {
  
  
  private readonly toast = inject(AppToastService);
  
  
  private readonly confirmationService = inject(ConfirmationService);
  private readonly entityMasterService = inject(EntityMasterService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  selectedRow: PayOutRow | null = null;
  rowActionItems: MenuItem[] = [];
  allRows: PayOutRow[] = [];
  tableRows: PayOutRow[] = [];

  filterSearchText = '';

  dialogId = 0;
  dialogReferenceNo = '';
  dialogReason = '';
  dialogDrawerName = '';
  dialogApprovedBy = '';
  dialogAmount = '';
  dialogNotes = '';

  totalEntries = 0;
  activeEntries = 0;
  totalAmount = 0;

  readonly pageEyebrow = 'Payments';
  readonly pageTitle = 'Pay Out';
  readonly pageSubtitle = 'Record cash removed from the drawer for expenses or transfers.';
  readonly filterTitle = this.pageTitle + ' Filters';
  readonly primaryActionLabel = 'Search ' + this.pageTitle;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Record Pay Out';
  dialogSubtitle = 'Capture outgoing cash with drawer and approval details.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Pay Out Entries';
  readonly tableCaption = 'Pay Out Entries';
  tableColumns = PAY_OUT_COLUMNS;
  payOutRights = { View: true, Create: true, Edit: true, Delete: true, ActiveInActive: true, Print: true, Download: true };
  showAddNewButton = true;
  readonly addNewButtonLabel = 'Record Pay Out';
  readonly showFilterButton = true;
  showRowActions = true;
  readonly rowActionHeader = 'Actions';
  userDetails: any = {};
  payOutEntityNo = Number(sessionStorage.getItem("currentMenuEntityNo") || 0);

  async ngOnInit(): Promise<void> {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    await this.loadPayOutRights();
    this.loadRows();
  }

  async loadPayOutRights(): Promise<void> {
    const orgId = Number(this.userDetails?.OrganizationId || this.userDetails?.OrgId || 0);
    const roleId = Number(this.userDetails?.RoleId || 0);
    const entityNo = Number(this.payOutEntityNo || 0);

    if (!orgId || !roleId || !entityNo) {
      return;
    }

    try {
      const response: any = await firstValueFrom(this.entityMasterService.GetRoleRightsByRoleId(orgId, roleId, entityNo));
      const rights = response?.result?.[0];

      if (rights) {
        this.payOutRights = {
          View: rights.View === true,
          Create: rights.Create === true,
          Edit: rights.Edit === true,
          Delete: rights.Delete === true,
          ActiveInActive: rights.ActiveInActive === true,
          Print: rights.Print === true,
          Download: rights.Download === true
        };
      }

      this.showAddNewButton = this.payOutRights.Create;
      this.showRowActions = this.payOutRights.Edit || this.payOutRights.Delete || this.payOutRights.ActiveInActive || this.payOutRights.Print;
    } catch {
      this.payOutRights = { View: true, Create: false, Edit: false, Delete: false, ActiveInActive: false, Print: false, Download: false };
      this.showAddNewButton = false;
      this.showRowActions = false;
      this.toast.error('Rights Load Failed', 'Unable to load pay out rights for this role.');
    }
  }

  loadRows(): void {
    this.allRows = [];
    this.tableRows = [];
    this.updateSummary();
  }

  searchRows(): void {
    const searchText = this.filterSearchText.trim().toLowerCase();

    if (!searchText) {
      this.tableRows = [...this.allRows];
      return;
    }

    this.tableRows = this.allRows.filter((row) =>
      row.ReferenceNo.toLowerCase().includes(searchText) ||
      row.Reason.toLowerCase().includes(searchText) ||
      row.DrawerName.toLowerCase().includes(searchText) ||
      row.ApprovedBy.toLowerCase().includes(searchText) ||
      row.Notes.toLowerCase().includes(searchText)
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
    this.dialogTitle = 'Record Pay Out';
    this.dialogSubtitle = 'Capture outgoing cash with drawer and approval details.';
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
          row.ReferenceNo = this.dialogReferenceNo;
          row.Reason = this.dialogReason;
          row.DrawerName = this.dialogDrawerName;
          row.ApprovedBy = this.dialogApprovedBy;
          row.Amount = Number(this.dialogAmount || 0);
          row.Notes = this.dialogNotes;
        }

        return row;
      });

      this.toast.success('Updated', this.pageTitle + ' updated successfully.');
    } else {
      this.allRows.unshift({
        Id: Date.now(),
        ReferenceNo: this.dialogReferenceNo,
        Reason: this.dialogReason,
        DrawerName: this.dialogDrawerName,
        ApprovedBy: this.dialogApprovedBy,
        Amount: Number(this.dialogAmount || 0),
        Notes: this.dialogNotes,
        IsActive: true,
        Status: 'Active',
        RowNumber: 0
      });

      this.toast.success('Saved', this.pageTitle + ' saved successfully.');
    }

    this.refreshRows();
    this.closeAddDialog();
  }

  editRow(row: PayOutRow): void {
    this.isEditMode = true;
    this.dialogId = row.Id;
    this.dialogReferenceNo = row.ReferenceNo;
    this.dialogReason = row.Reason;
    this.dialogDrawerName = row.DrawerName;
    this.dialogApprovedBy = row.ApprovedBy;
    this.dialogAmount = String(row.Amount);
    this.dialogNotes = row.Notes;
    this.dialogTitle = 'Edit Pay Out';
    this.dialogSubtitle = 'Update the selected pay out entry.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;
  }

  deleteRow(row: PayOutRow): void {
    this.allRows = this.allRows.filter((item) => item.Id !== row.Id);
    this.refreshRows();
    this.toast.success('Deleted', row.ReferenceNo + ' deleted successfully.');
  }

  activateRow(row: PayOutRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = true;
        item.Status = 'Active';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Activated', row.ReferenceNo + ' activated successfully.');
  }

  deactivateRow(row: PayOutRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = false;
        item.Status = 'Inactive';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Deactivated', row.ReferenceNo + ' deactivated successfully.');
  }

  openRowActions(menu: any, event: Event, row: PayOutRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: PayOutRow): void {
    this.confirmationService.confirm({
      header: 'Delete Confirmation',
      message: 'Are you sure you want to delete ' + row.ReferenceNo + '?',
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

  confirmActivateRow(row: PayOutRow): void {
    this.confirmationService.confirm({
      header: 'Activate Confirmation',
      message: 'Are you sure you want to activate ' + row.ReferenceNo + '?',
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

  confirmDeactivateRow(row: PayOutRow): void {
    this.confirmationService.confirm({
      header: 'Deactivate Confirmation',
      message: 'Are you sure you want to deactivate ' + row.ReferenceNo + '?',
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

  resetDialogForm(): void {
    this.dialogSubmitted = false;
    this.dialogId = 0;
    this.dialogReferenceNo = '';
    this.dialogReason = '';
    this.dialogDrawerName = '';
    this.dialogApprovedBy = '';
    this.dialogAmount = '';
    this.dialogNotes = '';
  }

  private refreshRows(): void {
    this.allRows = this.allRows.map((row, index) => {
      row.RowNumber = index + 1;
      row.Status = row.IsActive ? 'Active' : 'Inactive';
      return row;
    });

    this.searchRows();
    this.updateSummary();
  }

  private updateSummary(): void {
    this.totalEntries = this.allRows.length;
    this.activeEntries = this.allRows.filter((row) => row.IsActive).length;
    this.totalAmount = this.allRows.reduce((total, row) => total + row.Amount, 0);
  }

  private isDialogFormValid(): boolean {
    return this.textFields?.toArray().every((field) => field.isValid) ?? true;
  }

  private getRowActionItems(row: PayOutRow): MenuItem[] {
    const items: MenuItem[] = [];

    if (this.payOutRights.Edit && row.IsActive) {
      items.push({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
    }

    if (this.payOutRights.Delete) {
      items.push({ label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') });
    }

    if (this.payOutRights.ActiveInActive) {
      if (row.IsActive) {
        items.push({ label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
      } else {
        items.push({ label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
      }
    }

    if (this.payOutRights.Print) {
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

  printRow(row: PayOutRow): void {
    const name = String(row.ReferenceNo ?? 'this pay out entry');
    this.toast.info('Print Pending', `Print functionality for ${name} will be added soon.`);
  }
}


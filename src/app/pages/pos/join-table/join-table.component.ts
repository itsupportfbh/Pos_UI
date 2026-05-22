import { CommonModule } from '@angular/common';
import { Component, QueryList, ViewChildren, inject } from '@angular/core';
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

type JoinTableRow = {
  Id: number;
  JoinNo: string;
  PrimaryTable: string;
  SecondaryTables: string;
  GuestCount: number;
  StewardName: string;
  Notes: string;
  IsActive: boolean;
  Status: string;
  RowNumber: number;
};

const JOIN_TABLE_COLUMNS: SharedTableColumn<JoinTableRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'JoinNo', header: 'Join No', sortable: true, width: '11rem' },
  { field: 'PrimaryTable', header: 'Primary Table', sortable: true, width: '11rem' },
  { field: 'SecondaryTables', header: 'Merged Tables', sortable: true, width: '14rem' },
  { field: 'GuestCount', header: 'Guests', sortable: true, width: '7rem' },
  { field: 'StewardName', header: 'Steward', sortable: true, width: '12rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '8rem' }
];

@Component({
  selector: 'app-join-table',
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
  templateUrl: './join-table.component.html',
  styleUrl: './join-table.component.css'
})
export class JoinTableComponent {
  private readonly toast = inject(AppToastService);
  private readonly confirmationService = inject(ConfirmationService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  selectedRow: JoinTableRow | null = null;
  rowActionItems: MenuItem[] = [];
  allRows: JoinTableRow[] = [];
  tableRows: JoinTableRow[] = [];

  filterSearchText = '';

  dialogId = 0;
  dialogJoinNo = '';
  dialogPrimaryTable = '';
  dialogSecondaryTables = '';
  dialogGuestCount = '';
  dialogStewardName = '';
  dialogNotes = '';

  totalJoins = 0;
  activeJoins = 0;
  totalGuests = 0;
  previewPrimaryTable = 'T-10';
  previewSecondaryTables = 'T-11, T-12';
  previewNotes = 'Birthday group moved under one bill';

  readonly pageEyebrow = 'Dining';
  readonly pageTitle = 'Join Table';
  readonly pageSubtitle = 'Combine tables for larger groups and keep one coordinated guest and billing flow.';
  readonly filterTitle = this.pageTitle + ' Filters';
  readonly primaryActionLabel = 'Search ' + this.pageTitle;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Table Join';
  dialogSubtitle = 'Capture the tables that are being merged into one service group.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Joined Tables';
  readonly tableCaption = 'Join Table';
  tableColumns = JOIN_TABLE_COLUMNS;
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = 'Add Join';
  readonly showFilterButton = true;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';

  ngOnInit(): void {
    this.loadRows();
  }

  loadRows(): void {
    this.allRows = [];
    this.tableRows = [];
    this.updateSummary();
    this.updatePreview();
  }

  searchRows(): void {
    const searchText = this.filterSearchText.trim().toLowerCase();

    if (!searchText) {
      this.tableRows = [...this.allRows];
      return;
    }

    this.tableRows = this.allRows.filter((row) =>
      row.JoinNo.toLowerCase().includes(searchText) ||
      row.PrimaryTable.toLowerCase().includes(searchText) ||
      row.SecondaryTables.toLowerCase().includes(searchText) ||
      row.StewardName.toLowerCase().includes(searchText) ||
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
    this.dialogTitle = 'Create Table Join';
    this.dialogSubtitle = 'Capture the tables that are being merged into one service group.';
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
          row.JoinNo = this.dialogJoinNo;
          row.PrimaryTable = this.dialogPrimaryTable;
          row.SecondaryTables = this.dialogSecondaryTables;
          row.GuestCount = Number(this.dialogGuestCount || 0);
          row.StewardName = this.dialogStewardName;
          row.Notes = this.dialogNotes;
        }

        return row;
      });

      this.toast.success('Updated', 'Table join updated successfully.');
    } else {
      this.allRows.unshift({
        Id: Date.now(),
        JoinNo: this.dialogJoinNo,
        PrimaryTable: this.dialogPrimaryTable,
        SecondaryTables: this.dialogSecondaryTables,
        GuestCount: Number(this.dialogGuestCount || 0),
        StewardName: this.dialogStewardName,
        Notes: this.dialogNotes,
        IsActive: true,
        Status: 'Joined',
        RowNumber: 0
      });

      this.toast.success('Saved', 'Table join saved successfully.');
    }

    this.refreshRows();
    this.closeAddDialog();
  }

  editRow(row: JoinTableRow): void {
    this.isEditMode = true;
    this.dialogId = row.Id;
    this.dialogJoinNo = row.JoinNo;
    this.dialogPrimaryTable = row.PrimaryTable;
    this.dialogSecondaryTables = row.SecondaryTables;
    this.dialogGuestCount = String(row.GuestCount);
    this.dialogStewardName = row.StewardName;
    this.dialogNotes = row.Notes;
    this.dialogTitle = 'Edit Table Join';
    this.dialogSubtitle = 'Update the selected table merge before the floor is reset.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;
  }

  deleteRow(row: JoinTableRow): void {
    this.allRows = this.allRows.filter((item) => item.Id !== row.Id);
    this.refreshRows();
    this.toast.success('Deleted', row.JoinNo + ' removed successfully.');
  }

  activateRow(row: JoinTableRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = true;
        item.Status = 'Joined';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Activated', row.JoinNo + ' reopened successfully.');
  }

  deactivateRow(row: JoinTableRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = false;
        item.Status = 'Released';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Released', row.JoinNo + ' marked as released.');
  }

  openRowActions(menu: any, event: Event, row: JoinTableRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: JoinTableRow): void {
    this.confirmationService.confirm({
      header: 'Delete Confirmation',
      message: 'Are you sure you want to delete ' + row.JoinNo + '?',
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

  confirmActivateRow(row: JoinTableRow): void {
    this.confirmationService.confirm({
      header: 'Reopen Confirmation',
      message: 'Are you sure you want to reopen ' + row.JoinNo + '?',
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

  confirmDeactivateRow(row: JoinTableRow): void {
    this.confirmationService.confirm({
      header: 'Release Confirmation',
      message: 'Are you sure you want to release ' + row.JoinNo + '?',
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
    this.dialogJoinNo = '';
    this.dialogPrimaryTable = '';
    this.dialogSecondaryTables = '';
    this.dialogGuestCount = '';
    this.dialogStewardName = '';
    this.dialogNotes = '';
  }

  private refreshRows(): void {
    this.allRows = this.allRows.map((row, index) => {
      row.RowNumber = index + 1;
      return row;
    });

    this.searchRows();
    this.updateSummary();
    this.updatePreview();
  }

  private updateSummary(): void {
    this.totalJoins = this.allRows.length;
    this.activeJoins = this.allRows.filter((row) => row.IsActive).length;
    this.totalGuests = this.allRows.reduce((total, row) => total + row.GuestCount, 0);
  }

  private updatePreview(): void {
    const activeRow = this.allRows.find((row) => row.IsActive) ?? null;

    this.previewPrimaryTable = activeRow?.PrimaryTable ?? 'T-10';
    this.previewSecondaryTables = activeRow?.SecondaryTables ?? 'T-11, T-12';
    this.previewNotes = activeRow?.Notes ?? 'Birthday group moved under one bill';
  }

  private isDialogFormValid(): boolean {
    return this.textFields?.toArray().every((field) => field.isValid) ?? true;
  }

  private getRowActionItems(row: JoinTableRow): MenuItem[] {
    const items: MenuItem[] = [
      { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') }
    ];

    if (row.IsActive) {
      items.unshift({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
      items.push({ label: 'Release', icon: 'pi pi-check-circle', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
    } else {
      items.push({ label: 'Reopen', icon: 'pi pi-refresh', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
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
}

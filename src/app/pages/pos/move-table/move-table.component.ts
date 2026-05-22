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

type MoveTableRow = {
  Id: number;
  MoveNo: string;
  FromTable: string;
  ToTable: string;
  GuestCount: number;
  StewardName: string;
  MoveReason: string;
  IsActive: boolean;
  Status: string;
  RowNumber: number;
};

const MOVE_TABLE_COLUMNS: SharedTableColumn<MoveTableRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'MoveNo', header: 'Move No', sortable: true, width: '11rem' },
  { field: 'FromTable', header: 'From', sortable: true, width: '9rem' },
  { field: 'ToTable', header: 'To', sortable: true, width: '9rem' },
  { field: 'GuestCount', header: 'Guests', sortable: true, width: '7rem' },
  { field: 'StewardName', header: 'Steward', sortable: true, width: '12rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '8rem' }
];

@Component({
  selector: 'app-move-table',
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
  templateUrl: './move-table.component.html',
  styleUrl: './move-table.component.css'
})
export class MoveTableComponent {
  private readonly toast = inject(AppToastService);
  private readonly confirmationService = inject(ConfirmationService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  selectedRow: MoveTableRow | null = null;
  rowActionItems: MenuItem[] = [];
  allRows: MoveTableRow[] = [];
  tableRows: MoveTableRow[] = [];

  filterSearchText = '';

  dialogId = 0;
  dialogMoveNo = '';
  dialogFromTable = '';
  dialogToTable = '';
  dialogGuestCount = '';
  dialogStewardName = '';
  dialogMoveReason = '';

  totalMoves = 0;
  activeMoves = 0;
  totalGuests = 0;
  previewFromTable = 'T-04';
  previewToTable = 'T-12';
  previewMoveReason = 'Guest count increased after starters';

  readonly pageEyebrow = 'Dining';
  readonly pageTitle = 'Move Table';
  readonly pageSubtitle = 'Transfer active dine-in orders between tables without losing seat or bill context.';
  readonly filterTitle = this.pageTitle + ' Filters';
  readonly primaryActionLabel = 'Search ' + this.pageTitle;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Table Move';
  dialogSubtitle = 'Capture the table transfer details before the service team shifts the ticket.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Table Transfer Queue';
  readonly tableCaption = 'Move Table';
  tableColumns = MOVE_TABLE_COLUMNS;
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = 'Add Move';
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
      row.MoveNo.toLowerCase().includes(searchText) ||
      row.FromTable.toLowerCase().includes(searchText) ||
      row.ToTable.toLowerCase().includes(searchText) ||
      row.StewardName.toLowerCase().includes(searchText) ||
      row.MoveReason.toLowerCase().includes(searchText)
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
    this.dialogTitle = 'Create Table Move';
    this.dialogSubtitle = 'Capture the table transfer details before the service team shifts the ticket.';
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
          row.MoveNo = this.dialogMoveNo;
          row.FromTable = this.dialogFromTable;
          row.ToTable = this.dialogToTable;
          row.GuestCount = Number(this.dialogGuestCount || 0);
          row.StewardName = this.dialogStewardName;
          row.MoveReason = this.dialogMoveReason;
        }

        return row;
      });

      this.toast.success('Updated', 'Table move updated successfully.');
    } else {
      this.allRows.unshift({
        Id: Date.now(),
        MoveNo: this.dialogMoveNo,
        FromTable: this.dialogFromTable,
        ToTable: this.dialogToTable,
        GuestCount: Number(this.dialogGuestCount || 0),
        StewardName: this.dialogStewardName,
        MoveReason: this.dialogMoveReason,
        IsActive: true,
        Status: 'Pending',
        RowNumber: 0
      });

      this.toast.success('Saved', 'Table move saved successfully.');
    }

    this.refreshRows();
    this.closeAddDialog();
  }

  editRow(row: MoveTableRow): void {
    this.isEditMode = true;
    this.dialogId = row.Id;
    this.dialogMoveNo = row.MoveNo;
    this.dialogFromTable = row.FromTable;
    this.dialogToTable = row.ToTable;
    this.dialogGuestCount = String(row.GuestCount);
    this.dialogStewardName = row.StewardName;
    this.dialogMoveReason = row.MoveReason;
    this.dialogTitle = 'Edit Table Move';
    this.dialogSubtitle = 'Update the selected table transfer before the floor team acts on it.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;
  }

  deleteRow(row: MoveTableRow): void {
    this.allRows = this.allRows.filter((item) => item.Id !== row.Id);
    this.refreshRows();
    this.toast.success('Deleted', row.MoveNo + ' removed successfully.');
  }

  activateRow(row: MoveTableRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = true;
        item.Status = 'Pending';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Reopened', row.MoveNo + ' reopened successfully.');
  }

  deactivateRow(row: MoveTableRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = false;
        item.Status = 'Moved';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Completed', row.MoveNo + ' marked as moved.');
  }

  openRowActions(menu: any, event: Event, row: MoveTableRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: MoveTableRow): void {
    this.confirmationService.confirm({
      header: 'Delete Confirmation',
      message: 'Are you sure you want to delete ' + row.MoveNo + '?',
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

  confirmActivateRow(row: MoveTableRow): void {
    this.confirmationService.confirm({
      header: 'Reopen Confirmation',
      message: 'Are you sure you want to reopen ' + row.MoveNo + '?',
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

  confirmDeactivateRow(row: MoveTableRow): void {
    this.confirmationService.confirm({
      header: 'Move Confirmation',
      message: 'Are you sure you want to mark ' + row.MoveNo + ' as moved?',
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
    this.dialogMoveNo = '';
    this.dialogFromTable = '';
    this.dialogToTable = '';
    this.dialogGuestCount = '';
    this.dialogStewardName = '';
    this.dialogMoveReason = '';
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
    this.totalMoves = this.allRows.length;
    this.activeMoves = this.allRows.filter((row) => row.IsActive).length;
    this.totalGuests = this.allRows.reduce((total, row) => total + row.GuestCount, 0);
  }

  private updatePreview(): void {
    const activeRow = this.allRows.find((row) => row.IsActive) ?? null;

    this.previewFromTable = activeRow?.FromTable ?? 'T-04';
    this.previewToTable = activeRow?.ToTable ?? 'T-12';
    this.previewMoveReason = activeRow?.MoveReason ?? 'Guest count increased after starters';
  }

  private isDialogFormValid(): boolean {
    return this.textFields?.toArray().every((field) => field.isValid) ?? true;
  }

  private getRowActionItems(row: MoveTableRow): MenuItem[] {
    const items: MenuItem[] = [
      { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') }
    ];

    if (row.IsActive) {
      items.unshift({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
      items.push({ label: 'Moved', icon: 'pi pi-check-circle', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
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

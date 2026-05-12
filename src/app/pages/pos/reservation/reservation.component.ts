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

type ReservationRow = {
  Id: number;
  ReservationNo: string;
  GuestName: string;
  ContactNo: string;
  VisitDate: string;
  VisitTime: string;
  TableName: string;
  GuestCount: number;
  Notes: string;
  IsActive: boolean;
  Status: string;
  RowNumber: number;
};

const RESERVATION_COLUMNS: SharedTableColumn<ReservationRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'ReservationNo', header: 'Reservation No', sortable: true, width: '13rem' },
  { field: 'GuestName', header: 'Guest', sortable: true, width: '14rem' },
  { field: 'ContactNo', header: 'Phone', sortable: true, width: '11rem' },
  { field: 'VisitDate', header: 'Date', sortable: true, width: '10rem' },
  { field: 'VisitTime', header: 'Time', sortable: true, width: '9rem' },
  { field: 'TableName', header: 'Table', sortable: true, width: '9rem' },
  { field: 'GuestCount', header: 'Guests', sortable: true, width: '7rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '8rem' }
];

@Component({
  selector: 'app-reservation',
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
  templateUrl: './reservation.component.html',
  styleUrl: './reservation.component.css'
})
export class ReservationComponent {
  private readonly toast = inject(AppToastService);
  private readonly confirmationService = inject(ConfirmationService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  selectedRow: ReservationRow | null = null;
  rowActionItems: MenuItem[] = [];
  allRows: ReservationRow[] = [];
  tableRows: ReservationRow[] = [];

  filterSearchText = '';

  dialogId = 0;
  dialogReservationNo = '';
  dialogGuestName = '';
  dialogContactNo = '';
  dialogVisitDate = '';
  dialogVisitTime = '';
  dialogTableName = '';
  dialogGuestCount = '';
  dialogNotes = '';

  totalReservations = 0;
  upcomingReservations = 0;
  totalGuests = 0;
  previewGuestName = 'Rahul Family';
  previewVisitSlot = '19 May, 8:00 PM';
  previewTableName = 'Garden 3';

  readonly pageEyebrow = 'Dining';
  readonly pageTitle = 'Reservation';
  readonly pageSubtitle = 'Manage guest bookings, visit timing, and table readiness before the party arrives.';
  readonly filterTitle = this.pageTitle + ' Filters';
  readonly primaryActionLabel = 'Search ' + this.pageTitle;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Reservation';
  dialogSubtitle = 'Capture guest booking details and reserve the right table in advance.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Reservation List';
  readonly tableCaption = 'Reservation';
  tableColumns = RESERVATION_COLUMNS;
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = 'Add Reservation';
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
      row.ReservationNo.toLowerCase().includes(searchText) ||
      row.GuestName.toLowerCase().includes(searchText) ||
      row.ContactNo.toLowerCase().includes(searchText) ||
      row.TableName.toLowerCase().includes(searchText) ||
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
    this.dialogTitle = 'Create Reservation';
    this.dialogSubtitle = 'Capture guest booking details and reserve the right table in advance.';
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
          row.ReservationNo = this.dialogReservationNo;
          row.GuestName = this.dialogGuestName;
          row.ContactNo = this.dialogContactNo;
          row.VisitDate = this.dialogVisitDate;
          row.VisitTime = this.dialogVisitTime;
          row.TableName = this.dialogTableName;
          row.GuestCount = Number(this.dialogGuestCount || 0);
          row.Notes = this.dialogNotes;
        }

        return row;
      });

      this.toast.success('Updated', 'Reservation updated successfully.');
    } else {
      this.allRows.unshift({
        Id: Date.now(),
        ReservationNo: this.dialogReservationNo,
        GuestName: this.dialogGuestName,
        ContactNo: this.dialogContactNo,
        VisitDate: this.dialogVisitDate,
        VisitTime: this.dialogVisitTime,
        TableName: this.dialogTableName,
        GuestCount: Number(this.dialogGuestCount || 0),
        Notes: this.dialogNotes,
        IsActive: true,
        Status: 'Upcoming',
        RowNumber: 0
      });

      this.toast.success('Saved', 'Reservation saved successfully.');
    }

    this.refreshRows();
    this.closeAddDialog();
  }

  editRow(row: ReservationRow): void {
    this.isEditMode = true;
    this.dialogId = row.Id;
    this.dialogReservationNo = row.ReservationNo;
    this.dialogGuestName = row.GuestName;
    this.dialogContactNo = row.ContactNo;
    this.dialogVisitDate = row.VisitDate;
    this.dialogVisitTime = row.VisitTime;
    this.dialogTableName = row.TableName;
    this.dialogGuestCount = String(row.GuestCount);
    this.dialogNotes = row.Notes;
    this.dialogTitle = 'Edit Reservation';
    this.dialogSubtitle = 'Update the selected guest booking before arrival.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;
  }

  deleteRow(row: ReservationRow): void {
    this.allRows = this.allRows.filter((item) => item.Id !== row.Id);
    this.refreshRows();
    this.toast.success('Deleted', row.ReservationNo + ' removed successfully.');
  }

  activateRow(row: ReservationRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = true;
        item.Status = 'Upcoming';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Activated', row.ReservationNo + ' reopened successfully.');
  }

  deactivateRow(row: ReservationRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = false;
        item.Status = 'Seated';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Seated', row.ReservationNo + ' marked as seated.');
  }

  openRowActions(menu: any, event: Event, row: ReservationRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: ReservationRow): void {
    this.confirmationService.confirm({
      header: 'Delete Confirmation',
      message: 'Are you sure you want to delete ' + row.ReservationNo + '?',
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

  confirmActivateRow(row: ReservationRow): void {
    this.confirmationService.confirm({
      header: 'Reopen Confirmation',
      message: 'Are you sure you want to reopen ' + row.ReservationNo + '?',
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

  confirmDeactivateRow(row: ReservationRow): void {
    this.confirmationService.confirm({
      header: 'Seat Confirmation',
      message: 'Are you sure you want to mark ' + row.ReservationNo + ' as seated?',
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
    this.dialogReservationNo = '';
    this.dialogGuestName = '';
    this.dialogContactNo = '';
    this.dialogVisitDate = '';
    this.dialogVisitTime = '';
    this.dialogTableName = '';
    this.dialogGuestCount = '';
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
    this.totalReservations = this.allRows.length;
    this.upcomingReservations = this.allRows.filter((row) => row.IsActive).length;
    this.totalGuests = this.allRows.reduce((total, row) => total + row.GuestCount, 0);
  }

  private updatePreview(): void {
    const activeRow = this.allRows.find((row) => row.IsActive) ?? null;

    this.previewGuestName = activeRow?.GuestName ?? 'Rahul Family';
    this.previewVisitSlot = activeRow ? activeRow.VisitDate + ' ' + activeRow.VisitTime : '19 May, 8:00 PM';
    this.previewTableName = activeRow?.TableName ?? 'Garden 3';
  }

  private isDialogFormValid(): boolean {
    return this.textFields?.toArray().every((field) => field.isValid) ?? true;
  }

  private getRowActionItems(row: ReservationRow): MenuItem[] {
    const items: MenuItem[] = [
      { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') }
    ];

    if (row.IsActive) {
      items.unshift({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
      items.push({ label: 'Seated', icon: 'pi pi-check-circle', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
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

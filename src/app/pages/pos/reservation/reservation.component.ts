import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, QueryList, ViewChildren, inject } from '@angular/core';
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
import { Reservation, ReservationService } from '../../../services/reservation.service';
import { firstValueFrom } from 'rxjs';
import { OrganizationService } from '../../../services/organization.service';
import { DiningTableService } from '../../../services/diningtable.service';
import { MultiSelectFieldComponent, MultiSelectFieldValue } from '../../../components/form/multiselect-field.component';

type ReservationRow = {
  Id: number;
  ReservationNo: string;
  CustomerName: string;
  CustomerMobile: string;
  ReservationDate: string;
  ReservationFromtime: string;
  ReservationTotime: string;
  TableName: string;
  CustomerEmail: string;
  Guestcount: number;
  Specialrequests: string;
  RowNumber: number;
  OrgId: number;
  createdBy?: number | null;
  createdDate?: string;
  updatedBy?: number | null;
  updatedDate?: string | null;
  isDeleted?: boolean;
};

const RESERVATION_COLUMNS: SharedTableColumn<ReservationRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'organizationname', header: 'Organization Name', sortable: true, width: '16rem', hidden: true },
  { field: 'ReservationNo', header: 'Reservation No', sortable: true, width: '13rem' },
  { field: 'CustomerName', header: 'Customer', sortable: true, width: '14rem' },
  { field: 'CustomerMobile', header: 'Phone', sortable: true, width: '11rem' },
  { field: 'ReservationDate', header: 'Date', sortable: true, width: '10rem' },
  { field: 'ReservationFromtime', header: 'From Time', sortable: true, width: '9rem' },
  { field: 'ReservationTotime', header: 'To Time', sortable: true, width: '9rem' },
  { field: 'Guestcount', header: 'Guests', sortable: true, width: '7rem' }
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
    SharedTableCellTemplateDirective,
    MultiSelectFieldComponent
  ],
  providers: [ConfirmationService],
  templateUrl: './reservation.component.html',
  styleUrl: './reservation.component.css'
})
export class ReservationComponent {
  
  
  private readonly toast = inject(AppToastService);
  
  
  private readonly confirmationService = inject(ConfirmationService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly reservationService = inject(ReservationService);
  private readonly organizationService = inject(OrganizationService);
  private readonly diningTableService = inject(DiningTableService);
  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  @ViewChildren(MultiSelectFieldComponent) private readonly multiSelectFields?: QueryList<MultiSelectFieldComponent>;

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
  dialogVisitFromTime = '';
  dialogVisitToTime = '';
  dialogTableName = '';
  dialogGuestCount = '';
  dialogNotes = '';
  dialogEmail = '';
  dialogCreatedBy = 0;
  dialogCreatedDate = '';
  dialogUpdatedBy = 0;
  dialogUpdatedDate = '';
  dialogIsDeleted = false;

  isLoading = false;
  OrgId = 0;
  BranchId = 0;
  userDetails: any = {};
  allReservations: ReservationRow[] = [];
  tablesOptions: any[] = [];
  selectedTables: MultiSelectFieldValue = [];
  editingReservation: number | null = null;

  dialogModel: Reservation = {
    Id: 0,
    ReservationNo: '',
    CustomerName: '',
    CustomerMobile: '',
    ReservationDate: '',
    ReservationFromtime: '',
    ReservationTotime: '',
    TableName: '',
    CustomerEmail: '',
    Guestcount: 0,
    Specialrequests: '',
    TableIds: [],
    OrgId: this.OrgId,
    CreatedBy: this.dialogCreatedBy,
    CreatedDate: new Date().toISOString(),
    UpdatedBy: this.dialogCreatedBy,
    UpdatedDate: new Date().toISOString(),
    IsDeleted: false
  };

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
  reservationEntityNo = Number(sessionStorage.getItem("currentMenuEntityNo") || 0);

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.dialogCreatedBy = Number(this.userDetails.UserId || 0);
    this.OrgId = Number(this.userDetails.OrgId || 0);
    this.tableColumns = RESERVATION_COLUMNS.map((x: any) => {
      if (x.field === 'organizationname') {
        x.hidden = this.userDetails.RoleId !== 1;
      }

      return x;
    });

    this.loadRows();
  }

  loadRows(): void {
    this.loadReservations();
    this.loadDiningTables();
  }

  loadReservations(): void {
    this.isLoading = true;

    this.OrgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId);
    this.BranchId = Number(this.userDetails.IsAdmin || 0) === 1 ? 0 : Number(this.userDetails.BranchId);

    this.reservationService.getAll(this.OrgId).subscribe({
      next: (response: any) => {
        let RowNumber = 1;
        this.allReservations = (response.result ?? []).map((x: any) => {
          const isActive = x.Status ?? x.isactive ?? false;
          return {
            ...x,
            RowNumber: RowNumber++
          } as ReservationRow;
        });
        this.tableRows = [...this.allReservations];
        this.updateSummary();
        this.updatePreview();
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.toast.error(
          'Load Failed',
          'Unable to load reservations. Please check API and try again.'
        );
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  loadDiningTables() {
    this.diningTableService.getAll(this.OrgId).subscribe((res: any) => {
      this.tablesOptions = (res.result || []).map((item: any) => ({
        label: item.name,
        value: item.id
      }));
    });
  }

  onfiltertableChange(value: MultiSelectFieldValue): void {
    const arr = Array.isArray(value) ? value : value ? [value] : [];
    this.selectedTables = arr.map(v => Number(v));
  }

  private async loadLatestReservationNo(orgId: number): Promise<void> {
    if (!this.reservationEntityNo || !orgId) {
      this.dialogReservationNo = '';
      return;
    }

    try {
      const response: any = await firstValueFrom(this.organizationService.GetLatestCode(this.reservationEntityNo, orgId, this.BranchId));

      this.dialogReservationNo = response?.result ?? '';
    } catch {
      this.dialogReservationNo = '';
      this.toast.error('Load Failed', 'Unable to load branch code. Please check and try again.');
    }
  }

  searchReservations(): void {
    const searchText = this.filterSearchText.trim().toLowerCase();

    if (!searchText) {
      this.tableRows = [...this.allReservations];
      return;
    }

    this.tableRows = this.allReservations.filter((row) =>
      row.ReservationNo.toLowerCase().includes(searchText) ||
      row.CustomerName.toLowerCase().includes(searchText) ||
      row.CustomerMobile.toLowerCase().includes(searchText) ||
      row.TableName.toLowerCase().includes(searchText) ||
      row.Specialrequests.toLowerCase().includes(searchText)
    );
  }

  resetForm(): void {
    this.filterSearchText = '';
    this.tableRows = [...this.allReservations];
  }

  openFilterSidebar(): void {
    this.resetForm();
    this.showFilterSidebar = true;
  }

  closeFilterSidebar(): void {
    this.showFilterSidebar = false;
  }

  async openAddDialog(): Promise<void> {
    this.resetDialogForm();
    this.isEditMode = false;
    this.dialogTitle = 'Create Reservation';
    this.dialogSubtitle = 'Capture guest booking details and reserve the right table in advance.';
    this.dialogPrimaryActionLabel = 'Save';
    this.showAddDialog = true;

    await this.loadLatestReservationNo(Number(this.userDetails.OrgId || 0));
    this.changeDetector.detectChanges();
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

    const payload: Reservation = {
      ReservationNo: this.dialogReservationNo,
      CustomerName: this.dialogGuestName,
      CustomerMobile: this.dialogContactNo,
      ReservationDate: this.dialogVisitDate,
      ReservationFromtime: this.dialogVisitFromTime + ":00",
      ReservationTotime: this.dialogVisitToTime + ":00",
      TableName: this.dialogTableName,
      CustomerEmail: this.dialogEmail,
      Guestcount: Number(this.dialogGuestCount),
      Specialrequests: this.dialogNotes,
      Bookingsource: this.dialogModel.Bookingsource ?? '',
      OrgId: this.OrgId,
      TableIds: this.selectedTables.map((tableId) => ({ TableId: Number(tableId) })),
      IsActive: this.dialogModel.IsActive ?? true,
      IsDeleted: false,
      EntityNo: this.reservationEntityNo,
      BranchId: this.BranchId
    };
    if (this.isEditMode && this.editingReservation) {
      payload.Id = this.editingReservation;
      payload.UpdatedBy = 1;

      this.reservationService.update(payload).subscribe({
        next: (response: any) => {
          if (response === 'AlreadyExists' || response?.message === 'AlreadyExists') {
            this.toast.warn('Duplicate', 'Reservation already exists.');
            return;
          }

          this.toast.success('Updated', 'Reservation updated successfully.');
          this.closeAddDialog();
          this.loadReservations();
        },
        error: () => {
          this.toast.error('Update Failed', 'Unable to update reservation.');
        }
      });

      return;
    }

    payload.CreatedBy = 1;

    this.reservationService.create(payload).subscribe({
      next: (response: any) => {
        if (response === 'AlreadyExists' || response?.message === 'AlreadyExists') {
          this.toast.warn('Duplicate', 'Reservation already exists.');
          return;
        }

        this.toast.success('Saved', 'Reservation saved successfully.');
        this.closeAddDialog();
        this.loadReservations();
      },
      error: () => {
        this.toast.error('Save Failed', 'Unable to save reservation.');
      }
    });
  }

  editRow(row: ReservationRow): void {
    this.isEditMode = true;
    this.dialogTitle = 'Edit Reservation';
    this.dialogSubtitle = 'Update the selected guest booking before arrival.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;
    this.editingReservation = row.Id;

    this.reservationService.getById(row.Id).subscribe({
      next: (response: any) => {
        const reservation = response?.result?.[0] ?? response?.result ?? response;
        const rawTableIds = reservation?.tableIds ?? reservation?.TableIds ?? [];
        debugger;

        const toDateInput = (val: any): string => {
          if (val == null || val === '') return '';
          if (val instanceof Date) return val.toISOString().slice(0, 10);
          if (typeof val === 'string') {
            const isoMatch = val.match(/^(\d{4}-\d{2}-\d{2})/);
            if (isoMatch) return isoMatch[1];
          }
          return '';
        };

        const toTimeInput = (val: any): string => {
          if (val == null || val === '') return '';
          if (typeof val === 'string') {
            const m = val.match(/^(\d{2}:\d{2})/);
            if (m) return m[1];
          }
          return '';
        };

        this.dialogReservationNo = reservation?.code ?? reservation?.Code ?? row.ReservationNo;
        this.dialogGuestName = String(reservation?.customerName ?? reservation?.CustomerName ?? row.CustomerName);
        this.dialogContactNo = String(reservation?.customerMobile ?? reservation?.CustomerMobile ?? row.CustomerMobile);
        this.dialogVisitDate = toDateInput(reservation?.reservationDate ?? reservation?.ReservationDate ?? row.ReservationDate);
        this.dialogVisitFromTime = toTimeInput(reservation?.reservationFromtime ?? reservation?.ReservationFromtime ?? row.ReservationFromtime);
        this.dialogVisitToTime = toTimeInput(reservation?.reservationTotime ?? reservation?.ReservationTotime ?? row.ReservationTotime);
        this.dialogTableName = reservation?.tableName ?? reservation?.TableName ?? row.TableName;
        this.dialogEmail = reservation?.customerEmail ?? reservation?.CustomerEmail ?? row.CustomerEmail;
        this.dialogGuestCount = String(reservation?.guestCount ?? reservation?.GuestCount ?? row.Guestcount);
        this.dialogNotes = reservation?.specialrequests ?? reservation?.Specialrequests ?? row.Specialrequests;
        // Normalize selected table ids to an array of numeric ids so the multiselect
        // can match against the `tablesOptions` values (which are numbers).
        this.selectedTables = (Array.isArray(rawTableIds) ? rawTableIds : []).map((t: any) => {
          if (t == null) return t;
          if (typeof t === 'number' || typeof t === 'string') return Number(t);
          return Number(t.TableId ?? t.tableId ?? t.id ?? t.Id ?? NaN);
        }).filter((x: number) => !Number.isNaN(x));
        //this.OrgId = reservation?.orgId ?? reservation?.OrgId ?? row.OrgId;
        this.dialogCreatedBy = reservation?.createdBy ?? reservation?.CreatedBy ?? 1;
        this.dialogCreatedDate = reservation?.createdDate ?? reservation?.CreatedDate;
        this.dialogUpdatedBy = reservation?.updatedBy ?? reservation?.UpdatedBy ?? 1;
        this.dialogUpdatedDate = reservation?.updatedDate ?? reservation?.UpdatedDate;
        this.dialogIsDeleted = reservation?.isDeleted ?? reservation?.IsDeleted ?? false;
 
        this.showAddDialog = true;
        //this.toast.info('Edit Mode', `Editing ${row.name}.`);
      },
      error: () => {
        this.toast.error('Load Failed', 'Unable to load reservation details.');
      }
    });
  }

  deleteRow(row: ReservationRow): void {
    this.reservationService.delete(row.Id).subscribe({
      next: () => {
        this.toast.warn('Deleted', `${row.ReservationNo} removed successfully.`);
        this.loadReservations();
      },
      error: () => {
        this.toast.error('Delete Failed', 'Unable to delete reservation.');
      }
    });
  }

  activateRow(row: ReservationRow): void {
    this.reservationService.activeInActive(row.Id, true).subscribe({
      next: () => {
        this.toast.success('Status Updated', `${row.ReservationNo} marked as active.`);
        this.loadReservations();
      },
      error: () => {
        this.toast.error('Update Failed', 'Unable to activate reservation.');
      }
    });
  }

  deactivateRow(row: ReservationRow): void {
    this.reservationService.activeInActive(row.Id, false).subscribe({
      next: () => {
        this.toast.info('Status Updated', `${row.ReservationNo} marked as inactive.`);
        this.loadReservations();
      },
      error: () => {
        this.toast.error('Update Failed', 'Unable to deactivate reservation.');
      }
    });
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
    this.dialogVisitFromTime = '';
    this.dialogVisitToTime = '';
    this.dialogTableName = '';
    this.dialogGuestCount = '';
    this.dialogNotes = '';
    this.dialogEmail = '';
  }

  private refreshRows(): void {
    this.allReservations = this.allReservations.map((row, index) => {
      row.RowNumber = index + 1;
      return row;
    });

    this.searchReservations();
    this.updateSummary();
    this.updatePreview();
  }

  private updateSummary(): void {
    this.totalReservations = this.allReservations.length;
    //this.upcomingReservations = this.allReservations.filter((row) => row.Status).length;
    this.totalGuests = this.allReservations.reduce((total, row) => total + (row.Guestcount ?? 0), 0);
  }

  // private updatePreview(): void {
  //   const today = new Date().toISOString().slice(0, 10);
  //   const todaysReservations = this.allReservations.filter((row) =>
  //     String(row.ReservationDate ?? '').slice(0, 10) === today
  //   );
  //   debugger;
  //   const activeRow = todaysReservations.sort((a, b) =>
  //     String(a.Reservationtime ?? '').localeCompare(String(b.Reservationtime ?? ''))
  //   )[0] ?? null;

  //   const formatDate = (value: string): string => {
  //     const datePart = String(value ?? '').split('T')[0];
  //     const [year, month, day] = datePart.split('-');
  //     return day && month && year ? `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}` : value;
  //   };

  //   const formatTime = (value: string): string => {
  //     return String(value ?? '').split(':').slice(0, 2).join(':');
  //   };

  //   this.previewGuestName = activeRow?.CustomerName ?? 'Rahul Family';
  //   this.previewVisitSlot = activeRow
  //     ? `${formatDate(activeRow.ReservationDate)} ${formatTime(activeRow.Reservationtime)}`
  //     : '19 May, 8:00 PM';
  //   this.previewTableName = activeRow?.TableName ?? 'Garden 3';
  // }

  private updatePreview(): void {
    const now = new Date();

    const upcomingReservations = this.allReservations.filter((row) => {
      const datePart = String(row.ReservationDate ?? '')
        .split('T')[0];

      const timePart = String(row.ReservationFromtime ?? '00:00')
        .split(':')
        .slice(0, 2)
        .join(':');

      if (!datePart) {
        return false;
      }

      const reservationDateTime = new Date(`${datePart}T${timePart}:00`);

      return reservationDateTime >= now;
    });

    const activeRow =
      upcomingReservations.sort((a, b) => {
        const aDate = new Date(
          `${String(a.ReservationDate).split('T')[0]}T${String(a.ReservationFromtime).slice(0, 5)}:00`
        ).getTime();

        const bDate = new Date(
          `${String(b.ReservationDate).split('T')[0]}T${String(b.ReservationFromtime).slice(0, 5)}:00`
        ).getTime();

        return aDate - bDate;
      })[0] ?? null;

    const formatDate = (value: string): string => {
      const datePart = String(value ?? '').split('T')[0];

      const [year, month, day] = datePart.split('-');

      return day && month && year
        ? `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`
        : value;
    };

    const formatTime = (value: string): string => {
      return String(value ?? '')
        .split(':')
        .slice(0, 2)
        .join(':');
    };

    this.previewGuestName = activeRow?.CustomerName ?? 'Rahul Family';

    this.previewVisitSlot = activeRow
      ? `${formatDate(activeRow.ReservationDate)} ${formatTime(activeRow.ReservationFromtime)}`
      : '19 May, 8:00 PM';

    this.previewTableName = activeRow?.TableName ?? 'Garden 3';
  }

  private isDialogFormValid(): boolean {
    return this.textFields?.toArray().every((field) => field.isValid) ?? true;
  }

  private getRowActionItems(row: Record<string, unknown>): MenuItem[] {
    const items: MenuItem[] = [
      { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') }
    ];
    debugger;
    //if (row['Status'] === 'Active') {
    items.unshift({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
    //items.push({ label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
    // } else {
    //   items.push({ label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
    // }

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

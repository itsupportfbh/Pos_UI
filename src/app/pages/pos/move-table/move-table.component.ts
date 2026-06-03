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
import { firstValueFrom } from 'rxjs';
import { OrganizationService } from '../../../services/organization.service';
import { EmployeeService } from '../../../services/employeemasters.service';
import { MoveTable, MoveTableService, MoveTableDetail } from '../../../services/move-table.service';
import { MultiSelectFieldComponent, MultiSelectFieldValue } from '../../../components/form/multiselect-field.component';
import { SelectFieldComponent, SelectFieldValue } from '../../../components/form/select-field.component';
import { DiningTableService } from '../../../services/diningtable.service';

type MoveTableRow = {
  id: number;
  moveno: string;
  FromTable: string;
  ToTable: string;
  GuestCount: number;
  StewardId: string;
  MoveReason: string;
  IsActive: boolean;
  Status: string;
  RowNumber: number;
  OrgId: number;
  createdBy?: number | null;
  createdDate?: string;
  updatedBy?: number | null;
  updatedDate?: string | null;
  isDeleted?: boolean;
};

const MOVE_TABLE_COLUMNS: SharedTableColumn<MoveTableRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'organizationname', header: 'Organization Name', sortable: true, width: '16rem', hidden: true },
  { field: 'moveno', header: 'Move No', sortable: true, width: '11rem' },
  { field: 'guestcount', header: 'Guests', sortable: true, width: '7rem' },
  { field: 'stewardname', header: 'Steward', sortable: true, width: '12rem' },
  { field: 'movereason', header: 'Move Reason', sortable: true, width: '12rem' }
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
    SharedTableCellTemplateDirective,
    SelectFieldComponent,
    MultiSelectFieldComponent
  ],
  providers: [ConfirmationService],
  templateUrl: './move-table.component.html',
  styleUrl: './move-table.component.css'
})
export class MoveTableComponent {
  private readonly organizationService = inject(OrganizationService);
  private readonly employeeService = inject(EmployeeService);
  private readonly toast = inject(AppToastService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly moveService = inject(MoveTableService);
  private readonly diningTableService = inject(DiningTableService);
  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  @ViewChildren(MultiSelectFieldComponent) private readonly multiSelectFields?: QueryList<MultiSelectFieldComponent>;

  isLoading = false;
  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  selectedRow: MoveTableRow | null = null;
  rowActionItems: MenuItem[] = [];
  allmoveTables: MoveTableRow[] = [];
  tableRows: MoveTableRow[] = [];
  fromTableOptions: any[] = [];
  toTableOptions: any[] = [];
  stewardOptions: any[] = [];
  editingMoveTable: number | null = null;

  filterSearchText = '';

  dialogId = 0;
  dialogMoveNo = '';
  dialogFromTables: MultiSelectFieldValue = [];
  dialogToTables: MultiSelectFieldValue = [];
  dialogGuestCount = 0;
  dialogSteward: SelectFieldValue = null;
  dialogMoveReason = '';
  dialogCreatedBy = 0;
  dialogCreatedDate = '';
  dialogUpdatedBy = 0;
  dialogUpdatedDate = '';
  dialogIsDeleted = false;
  dialogIsActive = true;

  OrgId = 0;
  BranchId = 0;
  userDetails: any = {};
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
  movetableEntityNo = Number(sessionStorage.getItem("currentMenuEntityNo") || 0);

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.dialogCreatedBy = Number(this.userDetails.UserId || 0);
    this.OrgId = Number(this.userDetails.OrgId || 0);
    this.tableColumns = MOVE_TABLE_COLUMNS.map((x: any) => {
      if (x.field === 'organizationname') {
        x.hidden = this.userDetails.RoleId !== 1;
      }

      return x;
    });

    this.loadRows();
  }

  loadRows(): void {
    this.loadMoveTables();
    this.loadDiningTables();
    this.loadEmployees();
    this.updateSummary();
    this.updatePreview();
  }

  loadMoveTables(): void {
    this.isLoading = true;

    this.OrgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId);
    this.BranchId = Number(this.userDetails.IsAdmin || 0) === 1 ? 0 : Number(this.userDetails.BranchId);

    this.moveService.getAll(this.OrgId).subscribe({
      next: (response: any) => {
        let RowNumber = 1;
        this.allmoveTables = (response.result ?? []).map((x: any) => {
          const rawStatus = x.Status ?? x.status ?? x.Status;
          const status = typeof rawStatus === 'string' ? rawStatus : rawStatus ? String(rawStatus) : '';
          const isActive = /^joined$/i.test(status) || /^active$/i.test(status) || x.isactive === true || x.IsActive === true;

          return {
            ...x,
            RowNumber: RowNumber++,
            Status: status || (isActive ? 'Joined' : 'Released'),
            IsActive: isActive,
            GuestCount: Number(x.GuestCount ?? x.guestcount ?? 0)
          } as MoveTableRow;
        });
        this.tableRows = [...this.allmoveTables];
        this.updateSummary();
        this.updatePreview();
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.toast.error(
          'Load Failed',
          'Unable to load move tables. Please check API and try again.'
        );
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  loadDiningTables() {
    this.diningTableService.getAll(this.OrgId).subscribe((res: any) => {
      this.fromTableOptions = (res.result || []).map((item: any) => ({
        label: item.name,
        value: item.id
      }));

      this.toTableOptions = (res.result || []).map((item: any) => ({
        label: item.name,
        value: item.id
      }));
    });
  }

  loadEmployees() {
    this.employeeService.getAll(this.OrgId, this.BranchId).subscribe((res: any) => {
      this.stewardOptions = (res.result || []).map((item: any) => ({
        label: item.Name,
        value: item.Id
      }));
    });
  }

  searchRows(): void {
    const searchText = this.filterSearchText.trim().toLowerCase();

    if (!searchText) {
      this.tableRows = [...this.allmoveTables];
      return;
    }

    this.tableRows = this.allmoveTables.filter((row) =>
      row.moveno.toLowerCase().includes(searchText) ||
      row.FromTable.toLowerCase().includes(searchText) ||
      row.ToTable.toLowerCase().includes(searchText) ||
      row.StewardId.toLowerCase().includes(searchText) ||
      row.MoveReason.toLowerCase().includes(searchText)
    );
  }

  private async loadLatestMoveNo(orgId: number): Promise<void> {
    if (!this.movetableEntityNo || !orgId) {
      this.dialogMoveNo = '';
      return;
    }
    try {
      const response: any = await firstValueFrom(this.organizationService.GetLatestCode(this.movetableEntityNo, orgId, this.BranchId));

      this.dialogMoveNo = response?.result ?? '';
    } catch {
      this.dialogMoveNo = '';
      this.toast.error('Load Failed', 'Unable to load branch code. Please check and try again.');
    }
  }

  resetForm(): void {
    this.filterSearchText = '';
    this.tableRows = [...this.allmoveTables];
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
    this.dialogTitle = 'Create Table Move';
    this.dialogSubtitle = 'Capture the table transfer details before the service team shifts the ticket.';
    this.dialogPrimaryActionLabel = 'Save';
    this.showAddDialog = true;

    await this.loadLatestMoveNo(Number(this.userDetails.OrgId || 0));
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

    const fromTableIds = (Array.isArray(this.dialogFromTables) ? this.dialogFromTables : [this.dialogFromTables])
      .map((tableId) => Number(tableId))
      .filter((tableId) => !Number.isNaN(tableId));

    const toTableIds = (Array.isArray(this.dialogToTables) ? this.dialogToTables : [this.dialogToTables])
      .map((tableId) => Number(tableId))
      .filter((tableId) => !Number.isNaN(tableId));

    const hasOverlap = fromTableIds.some((fromTableId) =>
      toTableIds.includes(fromTableId)
    );

    if (hasOverlap) {
      this.toast.warn(
        'Validation',
        'From tables and To tables must be different.'
      );
      return;
    }

    const tableDetails: MoveTableDetail[] = [];

    this.dialogFromTables.forEach((fromTable) => {
      this.dialogToTables.forEach((toTable) => {
        tableDetails.push({
          FromTable: Number(fromTable),
          ToTable: Number(toTable)
        });
      });
    });

    const payload: MoveTable = {
      MoveNo: this.dialogMoveNo,
      TableDetails: tableDetails,
      GuestCount: Number(this.dialogGuestCount),
      StewardId: Number(this.dialogSteward),
      MoveReason: this.dialogMoveReason,
      IsActive: this.dialogIsActive ?? true,
      IsDeleted: false,
      OrgId: this.OrgId,
      EntityNo: this.movetableEntityNo,
      branchId: this.BranchId
    };

    if (this.isEditMode && this.editingMoveTable) {
      payload.Id = this.editingMoveTable;
      payload.UpdatedBy = 1;

      this.moveService.update(payload).subscribe({
        next: (response: any) => {
          if (response === 'AlreadyExists' || response?.message === 'AlreadyExists') {
            this.toast.warn('Duplicate', 'Move table already exists.');
            return;
          }

          this.toast.success('Updated', 'Move table updated successfully.');
          this.closeAddDialog();
          this.loadMoveTables();
        },
        error: () => {
          this.toast.error('Update Failed', 'Unable to update move table.');
        }
      });

      return;
    }

    payload.CreatedBy = 1;

    this.moveService.create(payload).subscribe({
      next: (response: any) => {
        if (response === 'AlreadyExists' || response?.message === 'AlreadyExists') {
          this.toast.warn('Duplicate', 'Move table already exists.');
          return;
        }

        this.toast.success('Saved', 'Move table saved successfully.');
        this.closeAddDialog();
        this.loadMoveTables();
      },
      error: () => {
        this.toast.error('Save Failed', 'Unable to save move table.');
      }
    });
  }

  editRow(row: MoveTableRow): void {
    this.isEditMode = true;
    this.dialogTitle = 'Edit Move Table';
    this.dialogSubtitle = 'update the details of the table move and save to apply changes.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;
    this.editingMoveTable = row.id;

    this.moveService.getById(row.id).subscribe({
      next: (response: any) => {
        const jointable = response?.result?.[0] ?? response?.result ?? response;
        const tableDetails = jointable?.tableIds ?? jointable?.TableIds ?? [];
        debugger;

        this.dialogMoveNo = jointable?.moveno ?? jointable?.moveno ?? row.moveno;
        this.dialogFromTables = Array.from(
          new Set<number>(
            tableDetails
              .map((x: any) => Number(x.fromTable ?? x.FromTable))
              .filter((x: number) => !Number.isNaN(x))
          )
        );
        this.dialogToTables = Array.from(
          new Set<number>(
            tableDetails
              .map((x: any) => Number(x.toTable ?? x.ToTable))
              .filter((x: number) => !Number.isNaN(x))
          )
        );
        this.dialogGuestCount = Number(jointable?.guestcount ?? jointable?.guestcount ?? row.GuestCount);
        this.dialogSteward = Number(jointable?.stewardid ?? jointable?.stewardid ?? row.StewardId);
        this.dialogMoveReason = jointable?.movereason ?? jointable?.movereason ?? row.MoveReason;
        this.OrgId = Number(jointable?.orgId ?? jointable?.OrgId ?? row.OrgId);
        this.dialogCreatedBy = Number(jointable?.createdBy ?? jointable?.CreatedBy ?? 1);
        this.dialogCreatedDate = jointable?.createdDate ?? jointable?.CreatedDate;
        this.dialogUpdatedBy = Number(jointable?.updatedBy ?? jointable?.UpdatedBy ?? 1);
        this.dialogUpdatedDate = jointable?.updatedDate ?? jointable?.UpdatedDate;
        this.dialogIsDeleted = Boolean(jointable?.isDeleted ?? jointable?.IsDeleted ?? false);

        this.showAddDialog = true;
      },
      error: () => {
        this.toast.error('Load Failed', 'Unable to load move table details.');
      }
    });
  }

  onfiltertableChange(value: MultiSelectFieldValue): void {
    const arr = Array.isArray(value) ? value : value ? [value] : [];
    this.dialogFromTables = arr.map(v => Number(v));
  }

  onfiltertoTableChange(value: MultiSelectFieldValue): void {
    const arr = Array.isArray(value) ? value : value ? [value] : [];
    this.dialogToTables = arr.map(v => Number(v));
  }

  deleteRow(row: MoveTableRow): void {
    this.moveService.delete(row.id).subscribe({
      next: () => {
        this.toast.warn('Deleted', `${row.moveno} removed successfully.`);
        this.loadMoveTables();
      },
      error: () => {
        this.toast.error('Delete Failed', 'Unable to delete move table.');
      }
    });
  }

  activateRow(row: MoveTableRow): void {
    this.moveService.activeInActive(row.id, true).subscribe({
      next: () => {
        this.toast.success('Status Updated', `${row.moveno} marked as active.`);
        this.loadMoveTables();
      },
      error: () => {
        this.toast.error('Update Failed', 'Unable to activate move table.');
      }
    });
  }

  deactivateRow(row: MoveTableRow): void {
    this.moveService.activeInActive(row.id, false).subscribe({
      next: () => {
        this.toast.info('Status Updated', `${row.moveno} marked as inactive.`);
        this.loadMoveTables();
      },
      error: () => {
        this.toast.error('Update Failed', 'Unable to deactivate move table.');
      }
    });
  }

  openRowActions(menu: any, event: Event, row: MoveTableRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: MoveTableRow): void {
    this.confirmationService.confirm({
      header: 'Delete Confirmation',
      message: 'Are you sure you want to delete ' + row.moveno + '?',
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
      message: 'Are you sure you want to reopen ' + row.moveno + '?',
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
      message: 'Are you sure you want to mark ' + row.moveno + ' as moved?',
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
    this.dialogFromTables = [];
    this.dialogToTables = [];
    this.dialogGuestCount = 0;
    this.dialogSteward = '';
    this.dialogMoveReason = '';
  }

  private refreshRows(): void {
    this.allmoveTables = this.allmoveTables.map((row, index) => {
      row.RowNumber = index + 1;
      return row;
    });

    this.searchRows();
    this.updateSummary();
    this.updatePreview();
  }

  private updateSummary(): void {
    this.totalMoves = this.allmoveTables.length;
    this.activeMoves = this.allmoveTables.filter((row) => row.IsActive).length;
    this.totalGuests = this.allmoveTables.reduce((total, row) => total + row.GuestCount, 0);
  }

  private updatePreview(): void {
    const activeRow = this.allmoveTables.find((row) => row.IsActive) ?? null;

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

    //if (row.IsActive) {
    items.unshift({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
    //items.push({ label: 'Moved', icon: 'pi pi-check-circle', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
    // } else {
    //   items.push({ label: 'Reopen', icon: 'pi pi-refresh', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
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

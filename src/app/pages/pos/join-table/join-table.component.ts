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
import { MultiSelectFieldComponent, MultiSelectFieldValue } from '../../../components/form/multiselect-field.component';
import { DiningTableService } from '../../../services/diningtable.service';
import { JoinTable, JoinTableService } from '../../../services/join-table.service';
import { SelectFieldComponent, SelectFieldValue } from '../../../components/form/select-field.component';
import { firstValueFrom } from 'rxjs';
import { OrganizationService } from '../../../services/organization.service';
import { EmployeeService } from '../../../services/employeemasters.service';

type JoinTableRow = {
  id: number;
  JoinNo: string;
  PrimaryTable: string;
  SecondaryTables: string;
  GuestCount: number;
  StewardId: string;
  Notes: string;
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

const JOIN_TABLE_COLUMNS: SharedTableColumn<JoinTableRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'organizationname', header: 'Organization Name', sortable: true, width: '16rem', hidden: true },
  { field: 'joinno', header: 'Join No', sortable: true, width: '11rem' },
  { field: 'primaryname', header: 'Primary Table', sortable: true, width: '11rem' },
  { field: 'guestcount', header: 'Guests', sortable: true, width: '7rem' },
  { field: 'stewardname', header: 'Steward', sortable: true, width: '12rem' },
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
    SharedTableCellTemplateDirective,
    SelectFieldComponent,
    MultiSelectFieldComponent
  ],
  providers: [ConfirmationService],
  templateUrl: './join-table.component.html',
  styleUrl: './join-table.component.css'
})
export class JoinTableComponent {
  private readonly toast = inject(AppToastService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly diningTableService = inject(DiningTableService);
  private readonly jointableService = inject(JoinTableService);
  private readonly organizationService = inject(OrganizationService);
  private readonly employeeService = inject(EmployeeService);
  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  @ViewChildren(MultiSelectFieldComponent) private readonly multiSelectFields?: QueryList<MultiSelectFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  selectedRow: JoinTableRow | null = null;
  rowActionItems: MenuItem[] = [];
  alljoinTables: JoinTableRow[] = [];
  tableRows: JoinTableRow[] = [];
  primaryTablesOptions: any[] = [];
  secondaryTablesOptions: any[] = [];
  stewardOptions: any[] = [];
  editingJoinTable: number | null = null;
  filterSearchText = '';

  dialogId = 0;
  dialogJoinNo = '';
  dialogPrimaryTable: SelectFieldValue = null;
  dialogSecondaryTables: MultiSelectFieldValue = [];
  dialogGuestCount = 0;
  dialogSteward: SelectFieldValue = null;
  dialogNotes = '';
  dialogCreatedBy = 0;
  dialogCreatedDate = '';
  dialogUpdatedBy = 0;
  dialogUpdatedDate = '';
  dialogIsDeleted = false;
  dialogIsActive = true;

  isLoading = false;
  BranchId = 0;
  OrgId = 0;
  userDetails: any = {};
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
  jointableEntityNo = Number(sessionStorage.getItem("currentMenuEntityNo") || 0);

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.dialogCreatedBy = Number(this.userDetails.UserId || 0);
    this.OrgId = Number(this.userDetails.OrgId || 0);
    this.tableColumns = JOIN_TABLE_COLUMNS.map((x: any) => {
      if (x.field === 'organizationname') {
        x.hidden = this.userDetails.RoleId !== 1;
      }

      return x;
    });

    this.loadRows();
  }

  loadRows(): void {
    this.loadJoinTables();
    this.loadDiningTables();
    this.loadEmployees();
    this.updateSummary();
    this.updatePreview();
  }

  loadJoinTables(): void {
    this.isLoading = true;

    this.OrgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId);
    this.BranchId = Number(this.userDetails.IsAdmin || 0) === 1 ? 0 : Number(this.userDetails.BranchId);

    this.jointableService.getAll(this.OrgId).subscribe({
      next: (response: any) => {
        let RowNumber = 1;
        this.alljoinTables = (response.result ?? []).map((x: any) => {
          const rawStatus = x.Status ?? x.status ?? x.Status;
          const status = typeof rawStatus === 'string' ? rawStatus : rawStatus ? String(rawStatus) : '';
          const isActive = /^joined$/i.test(status) || /^active$/i.test(status) || x.isactive === true || x.IsActive === true;

          return {
            ...x,
            RowNumber: RowNumber++,
            Status: status || (isActive ? 'Joined' : 'Released'),
            IsActive: isActive,
            GuestCount: Number(x.GuestCount ?? x.guestcount ?? 0)
          } as JoinTableRow;
        });
        this.tableRows = [...this.alljoinTables];
        this.updateSummary();
        this.updatePreview();
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.toast.error(
          'Load Failed',
          'Unable to load join tables. Please check API and try again.'
        );
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  loadDiningTables() {
    this.diningTableService.getAll(this.OrgId).subscribe((res: any) => {
      this.primaryTablesOptions = (res.result || []).map((item: any) => ({
        label: item.name,
        value: item.id
      }));

      this.secondaryTablesOptions = (res.result || []).map((item: any) => ({
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
      this.tableRows = [...this.alljoinTables];
      return;
    }

    this.tableRows = this.alljoinTables.filter((row) =>
      row.JoinNo.toLowerCase().includes(searchText) ||
      row.PrimaryTable.toLowerCase().includes(searchText) ||
      row.StewardId.toLowerCase().includes(searchText) ||
      row.Notes.toLowerCase().includes(searchText)
    );
  }

  onfiltertableChange(value: MultiSelectFieldValue): void {
    const arr = Array.isArray(value) ? value : value ? [value] : [];
    this.dialogSecondaryTables = arr.map(v => Number(v));
  }

  private async loadLatestJoinNo(orgId: number): Promise<void> {
    if (!this.jointableEntityNo || !orgId) {
      this.dialogJoinNo = '';
      return;
    }

    try {
      const response: any = await firstValueFrom(this.organizationService.GetLatestCode(this.jointableEntityNo, orgId, this.BranchId));

      this.dialogJoinNo = response?.result ?? '';
    } catch {
      this.dialogJoinNo = '';
      this.toast.error('Load Failed', 'Unable to load branch code. Please check and try again.');
    }
  }

  resetForm(): void {
    this.filterSearchText = '';
    this.tableRows = [...this.alljoinTables];
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
    this.dialogTitle = 'Create Table Join';
    this.dialogSubtitle = 'Capture the tables that are being merged into one service group.';
    this.dialogPrimaryActionLabel = 'Save';
    this.showAddDialog = true;

    await this.loadLatestJoinNo(Number(this.userDetails.OrgId || 0));
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

    const primaryTableId = Number(this.dialogPrimaryTable);

    const isPrimaryInSecondary = this.dialogSecondaryTables.some(
      tableId => Number(tableId) === primaryTableId
    );

    if (isPrimaryInSecondary) {
      this.toast.warn(
        'Validation',
        'Primary Table and Merged Tables must be different.'
      );
      return;
    }

    const payload: JoinTable = {
      JoinNo: this.dialogJoinNo,
      PrimaryTable: Number(this.dialogPrimaryTable),
      TableIds: this.dialogSecondaryTables.map((tableId) => ({ TableId: Number(tableId) })),
      GuestCount: Number(this.dialogGuestCount),
      StewardId: Number(this.dialogSteward),
      Notes: this.dialogNotes,
      IsActive: this.dialogIsActive ?? true,
      IsDeleted: false,
      OrgId: this.OrgId,
      EntityNo: this.jointableEntityNo,
      branchId: this.BranchId
    };

    if (this.isEditMode && this.editingJoinTable) {
      payload.Id = this.editingJoinTable;
      payload.UpdatedBy = 1;

      this.jointableService.update(payload).subscribe({
        next: (response: any) => {
          if (response === 'AlreadyExists' || response?.message === 'AlreadyExists') {
            this.toast.warn('Duplicate', 'Join table already exists.');
            return;
          }

          this.toast.success('Updated', 'Join table updated successfully.');
          this.closeAddDialog();
          this.loadJoinTables();
        },
        error: () => {
          this.toast.error('Update Failed', 'Unable to update join table.');
        }
      });

      return;
    }

    payload.CreatedBy = 1;

    this.jointableService.create(payload).subscribe({
      next: (response: any) => {
        if (response === 'AlreadyExists' || response?.message === 'AlreadyExists') {
          this.toast.warn('Duplicate', 'Join table already exists.');
          return;
        }

        this.toast.success('Saved', 'Join table saved successfully.');
        this.closeAddDialog();
        this.loadJoinTables();
      },
      error: () => {
        this.toast.error('Save Failed', 'Unable to save join table.');
      }
    });
  }

  editRow(row: JoinTableRow): void {
    this.isEditMode = true;
    this.dialogTitle = 'Edit Join Table';
    this.dialogSubtitle = 'update the details of the table join and save to apply changes.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;
    this.editingJoinTable = row.id;
    debugger;
    this.jointableService.getById(row.id).subscribe({
      next: (response: any) => {
        const jointable = response?.result?.[0] ?? response?.result ?? response;
        const rawTableIds = jointable?.tableIds ?? jointable?.TableIds ?? [];
        debugger;

        this.dialogJoinNo = jointable?.joinno ?? jointable?.joinno ?? row.JoinNo;
        this.dialogPrimaryTable = Number(jointable?.primarytable ?? jointable?.primarytable ?? row.PrimaryTable);
        this.dialogSecondaryTables = (Array.isArray(rawTableIds) ? rawTableIds : []).map((t: any) => {
          if (t == null) return t;
          if (typeof t === 'number' || typeof t === 'string') return Number(t);
          return Number(t.TableId ?? t.tableId ?? t.id ?? t.Id ?? NaN);
        }).filter((x: number) => !Number.isNaN(x));
        this.dialogGuestCount = Number(jointable?.guestcount ?? jointable?.guestcount ?? row.GuestCount);
        this.dialogSteward = Number(jointable?.stewardid ?? jointable?.stewardid ?? row.StewardId);
        this.dialogNotes = jointable?.notes ?? jointable?.notes ?? row.Notes;
        this.OrgId = Number(jointable?.orgId ?? jointable?.OrgId ?? row.OrgId);
        this.dialogCreatedBy = Number(jointable?.createdBy ?? jointable?.CreatedBy ?? 1);
        this.dialogCreatedDate = jointable?.createdDate ?? jointable?.CreatedDate;
        this.dialogUpdatedBy = Number(jointable?.updatedBy ?? jointable?.UpdatedBy ?? 1);
        this.dialogUpdatedDate = jointable?.updatedDate ?? jointable?.UpdatedDate;
        this.dialogIsDeleted = Boolean(jointable?.isDeleted ?? jointable?.IsDeleted ?? false);

        this.showAddDialog = true;
      },
      error: () => {
        this.toast.error('Load Failed', 'Unable to load join table details.');
      }
    });
  }

  deleteRow(row: JoinTableRow): void {
    this.jointableService.delete(row.id).subscribe({
      next: () => {
        this.toast.warn('Deleted', `${row.JoinNo} removed successfully.`);
        this.loadJoinTables();
      },
      error: () => {
        this.toast.error('Delete Failed', 'Unable to delete join table.');
      }
    });
  }

  activateRow(row: JoinTableRow): void {
    this.jointableService.activeInActive(row.id, true).subscribe({
      next: () => {
        this.toast.success('Status Updated', `${row.JoinNo} marked as active.`);
        this.loadJoinTables();
      },
      error: () => {
        this.toast.error('Update Failed', 'Unable to activate join table.');
      }
    });
  }

  deactivateRow(row: JoinTableRow): void {
    this.jointableService.activeInActive(row.id, false).subscribe({
      next: () => {
        this.toast.info('Status Updated', `${row.JoinNo} marked as inactive.`);
        this.loadJoinTables();
      },
      error: () => {
        this.toast.error('Update Failed', 'Unable to deactivate join table.');
      }
    });
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
    this.dialogSecondaryTables = [];
    this.dialogGuestCount = 0;
    this.dialogSteward = '';
    this.dialogNotes = '';
  }

  private refreshRows(): void {
    this.alljoinTables = this.alljoinTables.map((row, index) => {
      row.RowNumber = index + 1;
      return row;
    });

    this.searchRows();
    this.updateSummary();
    this.updatePreview();
  }

  private updateSummary(): void {
    this.totalJoins = this.alljoinTables.length;
    this.activeJoins = this.alljoinTables.filter((row) => row.IsActive || row.Status === 'Joined' || row.Status === 'Active').length;
    this.totalGuests = this.alljoinTables.reduce((total, row) => total + Number(row.GuestCount ?? 0), 0);
  } 

  private updatePreview(): void {
    const activeRow = this.alljoinTables.find((row) => row.IsActive) ?? null;

    this.previewPrimaryTable = activeRow?.PrimaryTable ?? 'T-10';
    this.previewSecondaryTables = activeRow?.SecondaryTables ?? 'T-11, T-12';
    this.previewNotes = activeRow?.Notes ?? 'Birthday group moved under one bill';
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

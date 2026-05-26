import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
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
import { Paymode, PaymodeService } from '../../../services/paymode.service';
import { TableExportService } from '../../../services/table-export.service';

type PaymodeRow = Paymode & {
  Type: string;
  Status: string;
  RowNumber: number;
};

const PAYMODE_COLUMNS: SharedTableColumn<PaymodeRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'Code', header: 'Code', sortable: true, width: '10rem' },
  { field: 'Type', header: 'Type', sortable: true, width: '18rem' },
  { field: 'Organization', header: 'Organization', sortable: true, width: '18rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '8rem' }
];

@Component({
  selector: 'app-paymode',
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
  templateUrl: './paymode.component.html',
  styleUrl: './paymode.component.css'
})
export class PaymodeComponent implements OnInit {
  private readonly toast = inject(AppToastService);
  private readonly paymodeService = inject(PaymodeService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly tableExportService = inject(TableExportService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  dialogSaving = false;
  isLoading = false;
  selectedRow: PaymodeRow | null = null;
  rowActionItems: MenuItem[] = [];
  allRows: PaymodeRow[] = [];
  tableRows: PaymodeRow[] = [];
  userDetails: any = {};

  filterSearchText = '';
  dialogId = 0;
  dialogCode = '';
  dialogType = '';
  dialogRemarks = '';

  readonly pageEyebrow = 'POS';
  readonly pageTitle = 'Paymode';
  readonly pageSubtitle = 'Manage paymode records here.';
  readonly filterTitle = 'Paymode Filters';
  readonly primaryActionLabel = 'Search Paymode';
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Paymode';
  dialogSubtitle = 'Create a new paymode record.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Paymode';
  readonly tableCaption = 'Paymode';
  tableColumns = PAYMODE_COLUMNS;
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = 'Add New';
  readonly showDownloadButton = true;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';
  downloadLoading = false;
  downloadLoadingLabel = 'Exporting...';

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.tableColumns = PAYMODE_COLUMNS.map((x: any) => {
      if (x.field === 'OrganizationName') {
        x.hidden = this.userDetails.RoleId !== 1;
      }

      return x;
    });

    this.loadRows();
  }

  loadRows(): void {
    this.isLoading = true;


     const orgId = Number(this.userDetails?.OrgId || 0);

    this.paymodeService.getAll(orgId).subscribe({
      next: (response: any) => {
        let rowNumber = 1;

        this.allRows = (response.result ?? []).map((paymode: any) => ({
          ...paymode,
          Id: paymode.Id ?? paymode.id ?? 0,
          Code: paymode.Code ?? paymode.code ?? '',
          Type: paymode.Type ?? paymode.type ?? '',
          Organization: paymode.OrganizationName,
          IsActive: paymode.IsActive ?? paymode.isActive ?? paymode.isactive ?? false,
          RowNumber: rowNumber++,
          Status: (paymode.IsActive ?? paymode.isActive ?? paymode.isactive) ? 'Active' : 'Inactive'
        }));

        this.tableRows = [...this.allRows];
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.toast.error('Load Failed', 'Unable to load paymodes. Please check API and try again.');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  async exportPaymodesAsExcel(): Promise<void> {
    this.downloadLoading = true;
    this.downloadLoadingLabel = 'Excel exporting...';

    try {
      const orgId = Number(this.userDetails?.OrgId || 0);
      const response: any = await firstValueFrom(this.paymodeService.getAll(orgId));
      let rowNumber = 1;
      let exportRows = (response.result ?? []).map((paymode: any) => ({
        ...paymode,
        Id: paymode.Id ?? paymode.id ?? 0,
        Code: paymode.Code ?? paymode.code ?? '',
        Type: paymode.Type ?? paymode.type ?? '',
        Organization: paymode.OrganizationName,
        IsActive: paymode.IsActive ?? paymode.isActive ?? paymode.isactive ?? false,
        RowNumber: rowNumber++,
        Status: (paymode.IsActive ?? paymode.isActive ?? paymode.isactive) ? 'Active' : 'Inactive'
      }));
      const orgName = String(this.userDetails.OrgName || 'OrgName').trim();
      const fileName = `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-Paymode`;
      const searchText = this.filterSearchText.trim().toLowerCase();

      if (searchText) {
        exportRows = exportRows.filter((row: any) =>
          String(row.Code ?? '').toLowerCase().includes(searchText) ||
          String(row.Type ?? '').toLowerCase().includes(searchText) ||
          String(row.Remarks ?? '').toLowerCase().includes(searchText) ||
          String(row.Status ?? '').toLowerCase().includes(searchText)
        );
      }

      if (!exportRows.length) {
        this.toast.warn('No Records', 'No paymodes are available to export.');
        return;
      }

      await this.tableExportService.exportExcel(fileName, this.tableColumns, exportRows, 'Paymode');
      this.toast.success('Export Ready', 'Paymode Excel export downloaded successfully.');
    } catch {
      this.toast.error('Export Failed', 'Unable to export paymodes to Excel.');
    } finally {
      this.downloadLoading = false;
      this.downloadLoadingLabel = 'Exporting...';
    }
  }

  async exportPaymodesAsPdf(): Promise<void> {
    this.downloadLoading = true;
    this.downloadLoadingLabel = 'PDF exporting...';

    try {
      const orgId = Number(this.userDetails?.OrgId || 0);
      const response: any = await firstValueFrom(this.paymodeService.getAll(orgId));
      let rowNumber = 1;
      let exportRows = (response.result ?? []).map((paymode: any) => ({
        ...paymode,
        Id: paymode.Id ?? paymode.id ?? 0,
        Code: paymode.Code ?? paymode.code ?? '',
        Type: paymode.Type ?? paymode.type ?? '',
        Organization: paymode.OrganizationName,
        IsActive: paymode.IsActive ?? paymode.isActive ?? paymode.isactive ?? false,
        RowNumber: rowNumber++,
        Status: (paymode.IsActive ?? paymode.isActive ?? paymode.isactive) ? 'Active' : 'Inactive'
      }));
      const orgName = String(this.userDetails.OrgName || 'OrgName').trim();
      const fileName = `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-Paymode`;
      const searchText = this.filterSearchText.trim().toLowerCase();

      if (searchText) {
        exportRows = exportRows.filter((row: any) =>
          String(row.Code ?? '').toLowerCase().includes(searchText) ||
          String(row.Type ?? '').toLowerCase().includes(searchText) ||
          String(row.Remarks ?? '').toLowerCase().includes(searchText) ||
          String(row.Status ?? '').toLowerCase().includes(searchText)
        );
      }

      if (!exportRows.length) {
        this.toast.warn('No Records', 'No paymodes are available to export.');
        return;
      }

      await this.tableExportService.exportPdf(fileName, 'Paymode', this.tableColumns, exportRows);
      this.toast.success('Export Ready', 'Paymode PDF export downloaded successfully.');
    } catch {
      this.toast.error('Export Failed', 'Unable to export paymodes to PDF.');
    } finally {
      this.downloadLoading = false;
      this.downloadLoadingLabel = 'Exporting...';
    }
  }

  searchRows(): void {
    const searchText = this.filterSearchText.trim().toLowerCase();

    if (!searchText) {
      this.tableRows = [...this.allRows];
      return;
    }

    this.tableRows = this.allRows.filter((row) =>
      String(row.Code ?? '').toLowerCase().includes(searchText) ||
      String(row.Type ?? '').toLowerCase().includes(searchText) ||
      String(row.Remarks ?? '').toLowerCase().includes(searchText) ||
      String(row.Status ?? '').toLowerCase().includes(searchText)
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
    this.loadRows();
    this.isEditMode = false;
    this.dialogSubmitted = false;
    this.showAddDialog = false;
  }

  async submitAddDialog(): Promise<void> {
    this.dialogSubmitted = true;

    if (!this.isDialogFormValid()) {
      return;
    }

    const type = this.dialogType.trim();

    if (!type) {
      return;
    }

    this.dialogSaving = true;




    const payload: Paymode = {
      Id: this.dialogId,
      Code: this.dialogCode.trim(),
      Type: type,
      Remarks: this.dialogRemarks.trim(),
      OrgId: Number(this.userDetails?.OrgId || 0),
      IsActive: true,
      CreatedBy: Number(this.userDetails?.UserId || 0),
      CreatedDate: new Date().toISOString(),
      UpdatedBy: Number(this.userDetails?.UserId || 0),
      UpdatedDate: this.dialogId ? new Date().toISOString() : null,
      IsDeleted: false
    };

    try {
      const response: any = payload.Id
        ? await firstValueFrom(this.paymodeService.update(payload))
        : await firstValueFrom(this.paymodeService.create(payload));

      if (this.isAlreadyExistsResponse(response)) {
        this.toast.warn('Already Exists', `${payload.Type || this.pageTitle} already exists. Please use a different name.`);
        this.dialogType = '';
        return;
      }

      if (this.isSuccessResponse(response)) {
        this.toast.success(payload.Id ? 'Updated' : 'Saved', `${payload.Type|| this.pageTitle} ${payload.Id ? 'updated' : 'saved'} successfully.`);
        this.closeAddDialog();
        return;
      }

      this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', this.getResponseMessage(response) || 'Unable to save paymode.');
    } catch {
      this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', 'Unable to save paymode.');
    } finally {
      this.dialogSaving = false;
    }
  }

  async editRow(row: PaymodeRow): Promise<void> {
    this.resetDialogForm();
    this.isEditMode = true;
    this.dialogTitle = 'Edit ' + this.pageTitle;
    this.dialogSubtitle = 'Update the selected ' + this.pageTitle.toLowerCase() + ' record.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;

    try {
      const response: any = await firstValueFrom(this.paymodeService.getById(row.Id ?? 0));
      const result = response.result ?? response;
      const paymode = Array.isArray(result) ? (result[0] ?? {}) : result;

      this.dialogId = paymode.Id ?? paymode.id ?? row.Id ?? 0;
      this.dialogCode = paymode.Code ?? paymode.code ?? row.Code ?? '';
      this.dialogType = paymode.Type ?? paymode.type ?? paymode.Name ?? paymode.name ?? row.Type ?? '';
      this.dialogRemarks = paymode.Remarks ?? paymode.remarks ?? row.Remarks ?? '';
    } catch {
      this.toast.error('Load Failed', 'Unable to load paymode details. Please check and try again.');
    }
  }

  async deleteRow(row: PaymodeRow): Promise<void> {
    const name = this.getRowName(row);

    try {
      const response: any = await firstValueFrom(this.paymodeService.delete(row.Id ?? 0));

      if (this.isSuccessResponse(response)) {
        this.toast.success('Deleted', `${name} deleted successfully.`);
        this.loadRows();
        return;
      }

      this.toast.error('Delete Failed', this.getResponseMessage(response) || `Unable to delete ${name}. Please try again.`);
    } catch {
      this.toast.error('Delete Failed', `Unable to delete ${name}. Please try again.`);
    }
  }

  async activateRow(row: PaymodeRow): Promise<void> {
    const name = this.getRowName(row);

    try {
      const response: any = await firstValueFrom(this.paymodeService.activeInActive(row.Id ?? 0, true));

      if (this.isSuccessResponse(response)) {
        this.toast.success('Activated', `${name} activated successfully.`);
        this.loadRows();
        return;
      }

      this.toast.error('Activation Failed', this.getResponseMessage(response) || `Unable to activate ${name}. Please try again.`);
    } catch {
      this.toast.error('Activation Failed', `Unable to activate ${name}. Please try again.`);
    }
  }

  async deactivateRow(row: PaymodeRow): Promise<void> {
    const name = this.getRowName(row);

    try {
      const response: any = await firstValueFrom(this.paymodeService.activeInActive(row.Id ?? 0, false));

      if (this.isSuccessResponse(response)) {
        this.toast.success('Deactivated', `${name} deactivated successfully.`);
        this.loadRows();
        return;
      }

      this.toast.error('Deactivation Failed', this.getResponseMessage(response) || `Unable to deactivate ${name}. Please try again.`);
    } catch {
      this.toast.error('Deactivation Failed', `Unable to deactivate ${name}. Please try again.`);
    }
  }

  openRowActions(menu: any, event: Event, row: PaymodeRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: PaymodeRow): void {
    const name = this.getRowName(row);

    this.confirmationService.confirm({
      header: 'Delete Confirmation',
      message: `Are you sure you want to delete ${name}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deleteRow(row);
      }
    });
  }

  confirmActivateRow(row: PaymodeRow): void {
    const name = this.getRowName(row);

    this.confirmationService.confirm({
      header: 'Activate Confirmation',
      message: `Are you sure you want to activate ${name}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.activateRow(row);
      }
    });
  }

  confirmDeactivateRow(row: PaymodeRow): void {
    const name = this.getRowName(row);

    this.confirmationService.confirm({
      header: 'Deactivate Confirmation',
      message: `Are you sure you want to deactivate ${name}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-warn',
      accept: () => {
        this.deactivateRow(row);
      }
    });
  }

  resetDialogForm(keepCode: boolean = false): void {
    this.dialogSubmitted = false;
    this.dialogSaving = false;
    this.dialogId = 0;

    if (!keepCode) {
      this.dialogCode = '';
    }

    this.dialogType = '';
    this.dialogRemarks = '';
  }

  private isDialogFormValid(): boolean {
    return this.textFields?.toArray().every((field) => field.isValid) ?? true;
  }

  private getRowName(row: PaymodeRow): string {
    return String(row.Type ?? row.Code ?? 'this paymode');
  }

  private isAlreadyExistsResponse(response: any): boolean {
    return response === 'AlreadyExists' ||
      response?.result === 'AlreadyExists' ||
      response?.message === 'AlreadyExists' ||
      response?.ErrorInfo?.Message === 'AlreadyExists';
  }

  private isSuccessResponse(response: any): boolean {
    return response == null ||
      response?.ErrorInfo?.Message === true ||
      response?.message === true ||
      response === true ||
      response?.success === true;
  }

  private getResponseMessage(response: any): string {
    return typeof response?.ErrorInfo?.Message === 'string'
      ? response.ErrorInfo.Message
      : response?.message ?? '';
  }

  private getRowActionItems(row: PaymodeRow): MenuItem[] {
    const items: MenuItem[] = [
      { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') }
    ];

    if (row.IsActive === true) {
      items.unshift({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
      items.push({ label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
    } else {
      items.push({ label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
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

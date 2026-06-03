import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, QueryList, inject, ViewChildren } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { SelectFieldComponent, SelectFieldValue } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { SharedTableCellTemplateDirective, SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';


import { AppToastService } from '../../../services/app-toast.service';


import { Tax, TaxService } from '../../../services/tax.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { EntityMasterService } from '../../../services/entitymaster.service';
import { OrganizationService } from '../../../services/organization.service';
import { firstValueFrom } from 'rxjs';
import { TableExportService } from '../../../services/table-export.service';

const TAX_COLUMNS: SharedTableColumn<any>[] = [
    { field: 'RowNumber', header: '#', sortable: true, width: '5rem' },
    { field: 'OrganizationName', header: 'Organization Name', sortable: true, width: '16rem', hidden: true },
    { field: 'Code', header: 'Code', sortable: true, width: '10rem' },
    { field: 'Name', header: 'Name', sortable: true, width: '18rem' },
    { field: 'Percentage', header: 'Tax', sortable: true, width: '10rem' },
    {
        field: 'Status',
        header: 'Status',
        sortable: true,
        width: '9rem'
    }
];

@Component({
    selector: 'app-taxes',
    standalone: true,
    imports: [CommonModule, ButtonModule, CardModule, DialogModule, TextFieldComponent, SelectFieldComponent, ActionButtonsComponent, MenuModule, SharedTableComponent, ConfirmDialogModule, SharedTableCellTemplateDirective],
    providers: [ConfirmationService],
    templateUrl: './tax.component.html',
    styleUrl: './tax.component.css'
})
export class TaxComponent implements OnInit {
    
  
  private readonly toast = inject(AppToastService);
  
  
    private readonly TaxService = inject(TaxService);
    private readonly entityMasterService = inject(EntityMasterService);
    private readonly organizationService = inject(OrganizationService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly changeDetector = inject(ChangeDetectorRef);
    private readonly tableExportService = inject(TableExportService);

    @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
    @ViewChildren(SelectFieldComponent) private readonly selectFields?: QueryList<SelectFieldComponent>;

    showAddDialog = false;
    isEditMode = false;
    dialogSubmitted = false;
    dialogSaving = false;
    dialogId = 0;
    dialogOrganization: SelectFieldValue = null;
    dialogTaxCode = '';
    dialogTaxName = '';
    dialogPercentage = '';
    rateErrorMessage = '';
    userDetails: any = {};
    organizationOptions: any[] = [];
    taxEntityNo = Number(sessionStorage.getItem('currentMenuEntityNo') || 0);

    allRows: any[] = [];
    tableRows: any[] = [];
    selectedRow: any = null;

    readonly pageEyebrow = 'Tax Management';
    readonly pageTitle = 'Taxes';
    readonly pageSubtitle = 'Manage your tax rates here.';
    dialogTitle = 'Create Tax';
    dialogSubtitle = 'Create a new tax rate.';
    dialogPrimaryActionLabel = 'Save';
    readonly tableTitle = 'Taxes';
    readonly tableCaption = 'Taxes';
    tableColumns = TAX_COLUMNS;
    showAddNewButton = true;
    readonly addNewButtonLabel = this.showAddNewButton ? 'Add New' : '';
    showDownloadButton = true;
    readonly showFilterButton = true;
    showRowActions = true;
    readonly rowActionHeader = 'Actions';
    rowActionItems: MenuItem[] = [];
    downloadLoading = false;
    downloadLoadingLabel = 'Exporting...';
    taxRights = {
        View: true,
        Create: true,
        Edit: true,
        Delete: true,
        ActiveInActive: true,
        Print: true,
        Download: true
    };

    async ngOnInit(): Promise<void> {
        this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
        await this.loadTaxRights();
        this.tableColumns = TAX_COLUMNS.map((x: any) => {
            if (x.field === 'OrganizationName') {
                x.hidden = this.userDetails.RoleId !== 1;
            }

            return x;
        });

        this.loadTaxes();
    }

    async loadTaxRights(): Promise<void> {
        try {
            const orgId = Number(this.userDetails?.OrgId || 0);
            const roleId = Number(this.userDetails?.RoleId || 0);
            const entityNo = Number(this.taxEntityNo || 0);
            const response: any = await firstValueFrom(this.entityMasterService.GetRoleRightsByRoleId(orgId, roleId, entityNo));
            const rights = response?.result?.[0] ?? {};

            this.taxRights = {
                View: rights.View,
                Create: rights.Create,
                Edit: rights.Edit,
                Delete: rights.Delete,
                ActiveInActive: rights.ActiveInActive,
                Print: rights.Print,
                Download: rights.Download
            };

            this.showAddNewButton = this.taxRights.Create;
            this.showDownloadButton = this.taxRights.Download;
            this.showRowActions = this.taxRights.Edit || this.taxRights.Delete || this.taxRights.ActiveInActive || this.taxRights.Print;
        } catch {
            this.taxRights = {
                View: true,
                Create: false,
                Edit: false,
                Delete: false,
                ActiveInActive: false,
                Print: false,
                Download: false
            };
            this.showAddNewButton = false;
            this.showDownloadButton = false;
            this.showRowActions = false;
            this.toast.error('Rights Load Failed', 'Unable to load tax rights. Please check and try again.');
        }
    }

    loadTaxes(): void {
        const orgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId || 0);

        this.TaxService.getAll(orgId).subscribe({
            next: (response: any) => {
                let RowNumber = 1;

                this.tableRows = (response.result ?? []).map((x: any) => {
                    x.RowNumber = RowNumber++;
                    x.Status = x.IsActive ? 'Active' : 'Inactive';
                    return x;
                });

                this.allRows = [...this.tableRows];
                this.changeDetector.detectChanges();
            },
            error: () => {
                this.toast.error(
                    'Load Failed',
                    'Unable to load taxes. Please check API and try again.'
                );
            }
        });
    }

    async exportTaxesAsExcel(): Promise<void> {
        this.downloadLoading = true;
        this.downloadLoadingLabel = 'Excel exporting...';

        try {
            const orgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId || 0);
            const response: any = await firstValueFrom(this.TaxService.getAll(orgId));
            let RowNumber = 1;
            const exportRows = (response.result ?? []).map((x: any) => {
                x.RowNumber = RowNumber++;
                x.Status = x.IsActive ? 'Active' : 'Inactive';
                return x;
            });
            const orgName = String(this.userDetails.OrgName || 'OrgName').trim();
            const fileName = `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-Taxes`;

            if (!exportRows.length) {
                this.toast.warn('No Records', 'No taxes are available to export.');
                return;
            }

            await this.tableExportService.exportExcel(fileName, this.tableColumns, exportRows, 'Taxes');
            this.toast.success('Export Ready', 'Tax Excel export downloaded successfully.');
        } catch {
            this.toast.error('Export Failed', 'Unable to export taxes to Excel.');
        } finally {
            this.downloadLoading = false;
            this.downloadLoadingLabel = 'Exporting...';
        }
    }

    async exportTaxesAsPdf(): Promise<void> {
        this.downloadLoading = true;
        this.downloadLoadingLabel = 'PDF exporting...';

        try {
            const orgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId || 0);
            const response: any = await firstValueFrom(this.TaxService.getAll(orgId));
            let RowNumber = 1;
            const exportRows = (response.result ?? []).map((x: any) => {
                x.RowNumber = RowNumber++;
                x.Status = x.IsActive ? 'Active' : 'Inactive';
                return x;
            });
            const orgName = String(this.userDetails.OrgName || 'OrgName').trim();
            const fileName = `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-Taxes`;

            if (!exportRows.length) {
                this.toast.warn('No Records', 'No taxes are available to export.');
                return;
            }

            await this.tableExportService.exportPdf(fileName, 'Taxes', this.tableColumns, exportRows);
            this.toast.success('Export Ready', 'Tax PDF export downloaded successfully.');
        } catch {
            this.toast.error('Export Failed', 'Unable to export taxes to PDF.');
        } finally {
            this.downloadLoading = false;
            this.downloadLoadingLabel = 'Exporting...';
        }
    }

    async openAddDialog(): Promise<void> {
        this.isEditMode = false;
        this.resetDialogForm();
        this.dialogTitle = 'Create Tax';
        this.dialogSubtitle = 'Create a new tax rate.';
        this.dialogPrimaryActionLabel = 'Save';
        this.showAddDialog = true;

        if (this.userDetails.RoleId === 1) {
            await this.loadOrganizations();
        } else {
            await this.loadLatestTaxCode(Number(this.userDetails.OrgId || 0));
        }

        this.changeDetector.detectChanges();
    }

    closeAddDialog(): void {
        this.resetDialogForm();
        this.loadTaxes();
        this.isEditMode = false;
        this.showAddDialog = false;
        this.dialogSubmitted = false;
    }

    async loadOrganizations(): Promise<void> {
        try {
            const response: any = await firstValueFrom(this.organizationService.getAll());
            const organizations = response?.result ?? [];

            this.organizationOptions = organizations.filter((org: any) => (org.IsActive ?? org.isActive) === true).map((organization: any) => ({
                label: organization.Name ?? '',
                value: organization.Id ?? 0
            }));
            this.changeDetector.detectChanges();
        } catch {
            this.organizationOptions = [];
            this.toast.error('Load Failed', 'Unable to load organizations. Please check and try again.');
        }
    }

    public async onOrganizationChange(value: SelectFieldValue): Promise<void> {
        this.dialogOrganization = value;

        if (this.isEditMode) {
            return;
        }

        if (!value || Number(value) === 0) {
            this.dialogTaxCode = '';
            return;
        }

        await this.loadLatestTaxCode(Number(value));
    }

    async submitAddDialog(): Promise<void> {
        this.dialogSubmitted = true;

        if (!this.isDialogFormValid()) {
            return;
        }

        this.dialogSaving = true;

        const payload: Tax = {
            Id: this.dialogId,
            Code: this.dialogTaxCode,
            Name: this.dialogTaxName,
            Percentage: Number(this.dialogPercentage || 0),
            OrgId: this.userDetails.RoleId === 1
                ? Number(this.dialogOrganization || 0)
                : Number(this.userDetails.OrgId || 0),
            IsActive: true,
            CreatedBy: Number(this.userDetails.UserId || 0),
            CreatedDate: new Date().toISOString(),
            UpdatedBy: Number(this.userDetails.UserId || 0),
            UpdatedDate: null,
            IsDeleted: false,
            EntityNo: this.taxEntityNo
        };

        try {
            let response: any;

            if (!payload.Id) {
                response = await firstValueFrom(this.TaxService.create(payload));
            } else {
                response = await firstValueFrom(this.TaxService.update(payload));
            }

            if (response === 'AlreadyExists' || response?.result === 'AlreadyExists' || response?.message === 'AlreadyExists') {
                this.toast.warn('Already Exists', `${payload.Name || this.pageTitle} already exists. Please use a different name.`);
                this.dialogTaxName = '';
                return;
            }

            if (!payload.Id) {
                this.toast.success('Saved', `${payload.Name || this.pageTitle} saved successfully.`);
            } else {
                this.toast.success('Updated', `${payload.Name || this.pageTitle} updated successfully.`);
            }

            this.closeAddDialog();
        } catch {
            this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', `Unable to save ${this.pageTitle.toLowerCase()}.`);
        } finally {
            this.dialogSaving = false;
        }
    }

    onRateChange(value: string): void {
        const rate = value ? parseFloat(value) : 0;
        this.dialogPercentage = value;

        if (this.dialogSubmitted && rate <= 0) {
            this.rateErrorMessage = 'Tax Percentage must be greater than zero.';
        } else {
            this.rateErrorMessage = '';
        }
    }

    async editRow(row: any): Promise<void> {
        this.isEditMode = true;
        this.dialogTitle = 'Edit Tax';
        this.dialogSubtitle = 'Update the selected Tax details.';
        this.dialogPrimaryActionLabel = 'Update';

        this.resetDialogForm();

        try {
            const response: any = await firstValueFrom(this.TaxService.getById(row.Id));
            const tax = response?.result?.[0] ?? response?.result ?? response;

            this.dialogId = tax?.Id;
            this.dialogOrganization = tax?.OrgId;
            this.dialogTaxCode = tax?.Code;
            this.dialogTaxName = tax?.Name;
            this.dialogPercentage = row.Percentage;

            if (this.userDetails.RoleId === 1) {
                await this.loadOrganizations();
            }

            this.showAddDialog = true;
            this.changeDetector.detectChanges();
        } catch {
            this.toast.error('Load Failed', 'Unable to load tax details.');
        }
    }

    deleteRow(row: any): void {
        this.TaxService.delete(row.Id).subscribe({
            next: () => {
                this.toast.warn('Deleted', `${row.Name} removed successfully.`);
                this.loadTaxes();
            },
            error: () => {
                this.toast.error('Delete Failed', 'Unable to delete tax.');
            }
        });
    }

    activateRow(row: any): void {
        this.TaxService.activeInActive(row.Id, true).subscribe({
            next: () => {
                this.toast.success('Status Updated', `${row.Name} marked as active.`);
                this.loadTaxes();
            },
            error: () => {
                this.toast.error('Update Failed', 'Unable to activate tax.');
            }
        });
    }

    deactivateRow(row: any): void {
        this.TaxService.activeInActive(row.Id, false).subscribe({
            next: () => {
                this.toast.info('Status Updated', `${row.Name} marked as inactive.`);
                this.loadTaxes();
            },
            error: () => {
                this.toast.error('Update Failed', 'Unable to deactivate tax.');
            }
        });
    }

    confirmDeleteRow(row: any): void {
        const name = row.Name ?? row.Code ?? 'this Category';

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

    confirmActivateRow(row: any): void {
        const name = row.Name ?? row.Code ?? 'this Category';

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

    confirmDeactivateRow(row: any): void {
        const name = row.Name ?? row.Code ?? 'this category';

        this.confirmationService.confirm({
            header: 'Inactive Confirmation',
            message: `Are you sure you want to inactive ${name}?`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Yes',
            rejectLabel: 'No',
            acceptButtonStyleClass: 'p-button-warn',
            accept: () => {
                this.deactivateRow(row);
            }
        });
    }

    printRow(row: any): void {
        this.toast.info('Print Pending', `${String(row.Name ?? row.Code ?? 'Tax')} print will be connected later.`);
    }

    openRowActions(menu: any, event: Event, row: any): void {
        this.selectedRow = row;
        this.rowActionItems = this.getRowActionItems(row);
        menu.toggle(event);
    }

    private isDialogFormValid(): boolean {
        const areTextFieldsValid = this.textFields?.toArray().every((field) => field.isValid) ?? true;
        const areSelectFieldsValid = this.selectFields?.toArray().every((field) => field.isValid) ?? true;
        const isRateValid = Number(this.dialogPercentage || 0) > 0;

        if (!isRateValid) {
            this.rateErrorMessage = 'Tax Percentage must be greater than zero.';
        }

        return areTextFieldsValid && areSelectFieldsValid && isRateValid;
    }

    private getRowActionItems(row: Record<string, unknown>): MenuItem[] {
        const items: MenuItem[] = [];

        if (this.taxRights.Edit && row['IsActive'] === true) {
            items.push({ label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') });
        }

        if (this.taxRights.Delete) {
            items.push({ label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') });
        }

        if (this.taxRights.ActiveInActive && row['IsActive'] === true) {
            items.push({ label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') });
        }

        if (this.taxRights.ActiveInActive && row['IsActive'] !== true) {
            items.push({ label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') });
        }

        if (this.taxRights.Print) {
            items.push({ label: 'Print', icon: 'pi pi-print', styleClass: 'row-action-print', command: () => this.printRow(row) });
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

    resetDialogForm(keepCode: boolean = false): void {
        this.dialogSubmitted = false;
        this.rateErrorMessage = '';
        this.dialogId = 0;
        this.dialogOrganization = null;
        this.dialogTaxCode = keepCode ? this.dialogTaxCode : '';
        this.dialogTaxName = '';
        this.dialogPercentage = '';
    }

    private async loadLatestTaxCode(orgId: number): Promise<void> {
        if (!this.taxEntityNo || !orgId) {
            this.dialogTaxCode = '';
            return;
        }

        try {
            const response: any = await firstValueFrom(this.organizationService.GetLatestCode(this.taxEntityNo, orgId, 0));
            this.dialogTaxCode = response?.result ?? '';
        } catch {
            this.dialogTaxCode = '';
            this.toast.error('Load Failed', 'Unable to load tax code. Please check and try again.');
        }
    }
}

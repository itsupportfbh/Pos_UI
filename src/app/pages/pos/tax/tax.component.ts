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
import { OrganizationService } from '../../../services/organization.service';
import { firstValueFrom } from 'rxjs';

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
    private readonly organizationService = inject(OrganizationService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly changeDetector = inject(ChangeDetectorRef);

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
    readonly showAddNewButton = true;
    readonly addNewButtonLabel = this.showAddNewButton ? 'Add New' : '';
    readonly showFilterButton = true;
    readonly showRowActions = true;
    readonly rowActionHeader = 'Actions';
    rowActionItems: MenuItem[] = [];

    ngOnInit(): void {
        this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
        this.tableColumns = TAX_COLUMNS.map((x: any) => {
            if (x.field === 'OrganizationName') {
                x.hidden = this.userDetails.RoleId !== 1;
            }

            return x;
        });

        this.loadTaxes();
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
        const items: MenuItem[] = [
            { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') }
        ];

        if (row['IsActive'] === true) {
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

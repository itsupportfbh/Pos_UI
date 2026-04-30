import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, QueryList, inject, ViewChildren } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { SharedTableCellTemplateDirective, SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';
import { AppToastService } from '../../../services/app-toast.service';
import { Tax, TaxService } from '../../../services/tax.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectFieldComponent } from '../../../components/form/select-field.component';

type TaxRow = {
    id: number;
    code: string;
    name: string;
    rate: number;
    orgId: number;
    isActive: boolean;
    createdBy?: number | null;
    createdDate?: string;
    updatedBy?: number | null;
    updatedDate?: string | null;
    isDeleted?: boolean;
    status: string;
    rowNumber: number;
};

const TAX_COLUMNS: SharedTableColumn<TaxRow>[] = [
    { field: 'RowNumber', header: '#', sortable: true, width: '5rem' },
    { field: 'organizationname', header: 'Organization Name', sortable: true, width: '16rem', hidden: true },
    { field: 'code', header: 'Code', sortable: true, width: '10rem' },
    { field: 'name', header: 'Name', sortable: true, width: '18rem' },
    { field: 'rate', header: 'Tax', sortable: true, width: '10rem' },
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
    imports: [CommonModule, ButtonModule, CardModule, DialogModule, TextFieldComponent, ActionButtonsComponent, SelectFieldComponent, MenuModule, SharedTableComponent, ConfirmDialogModule, SharedTableCellTemplateDirective],
    providers: [ConfirmationService],
    templateUrl: './tax.component.html',
    styleUrl: './tax.component.css'
})
export class TaxComponent {
    private readonly toast = inject(AppToastService);
    private readonly TaxService = inject(TaxService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly changeDetector = inject(ChangeDetectorRef);

    @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
    @ViewChildren(SelectFieldComponent) private readonly selectFields?: QueryList<SelectFieldComponent>;

    showAddDialog = false;
    showFilterSidebar = false;
    isLoading = false;
    isEditMode = false;
    dialogSubmitted = false;
    filterTaxName = '';
    dialogTaxCode = '';
    dialogTaxName = '';
    rateErrorMessage = '';
    OrgId = 0;
    userDetails: any = {};

    tableRows: TaxRow[] = [];
    selectedRow: TaxRow | null = null;
    editingTaxId: number | null = null;

    dialogCategory: number | null = null;

    dialogModel: Tax = {
        Id: 0,
        code: '',
        name: '',
        percentage: 0,
        OrgId: this.OrgId,
        IsActive: true,
        CreatedBy: 1,
        UpdatedBy: 1,
        IsDeleted: false
    };

    readonly pageEyebrow = 'Tax Management';
    readonly pageTitle = 'Taxes';
    readonly pageSubtitle = 'Manage your tax rates here.';
    readonly filterTitle = `${'Taxes'} Filters`;
    readonly filterDescription = `API data will be loaded for ${'Taxes'.toLowerCase()}.`;
    readonly fields: any[] = [{ key: 'TaxName', label: 'Tax Name', type: 'text', placeholder: 'Enter tax name' }];
    readonly primaryActionLabel = `Search ${'Taxes'}`;
    readonly secondaryActionLabel = 'Clear Filters';
    readonly showSecondaryAction = true;
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
        const userId = Number(this.userDetails.UserId || 0);
        this.tableColumns = TAX_COLUMNS.map((x: any) => {
            if (x.field === 'organizationname') {
                x.hidden = this.userDetails.RoleId !== 1;
            }

            return x;
        });

        this.loadTaxes();
    }

    loadTaxes(): void {
        this.isLoading = true;
        this.OrgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId);

        const BranchId = Number(this.userDetails.IsAdmin || 0) === 1 ? 0 : Number(this.userDetails.BranchId);


        this.TaxService.getAll(this.OrgId).subscribe({
            next: (response: any) => {
                const result = response?.result ?? response ?? [];
                let RowNumber = 1;
                this.tableRows = (response.result ?? []).map((x: any) => {
                    x.RowNumber = RowNumber++;
                    x.Status = x.isactive ? 'Active' : 'Inactive';
                    return x;
                });
                this.changeDetector.detectChanges();
            },
            error: () => {
                this.toast.error(
                    'Load Failed',
                    'Unable to load taxes. Please check API and try again.'
                );
            },
            complete: () => {
                this.isLoading = false;
            }
        });
    }

    searchTaxes(): void {
        const searchText = this.filterTaxName.trim().toLowerCase();

        if (!searchText) {
            this.loadTaxes();
            return;
        }

        this.tableRows = this.tableRows.filter((row) =>
            row.name?.toLowerCase().includes(searchText) ||
            row.code?.toLowerCase().includes(searchText)
        );
    }

    resetForm(): void {
        this.filterTaxName = '';
        this.loadTaxes();
    }

    openFilterSidebar(): void {
        this.showFilterSidebar = true;
    }

    closeFilterSidebar(): void {
        this.showFilterSidebar = false;
    }
    openAddDialog(): void {
        this.isEditMode = false;
        this.editingTaxId = null;
        this.resetDialogForm();
        this.showAddDialog = true;
        this.dialogTitle = 'Create Tax';
        this.dialogSubtitle = 'Create a new tax rate.';
        this.dialogPrimaryActionLabel = 'Save';
    }

    closeAddDialog(): void {
        this.resetDialogForm();
        this.loadTaxes();
        this.isEditMode = false;
        this.showAddDialog = false;
        this.dialogSubmitted = false;
    }

    submitAddDialog(): void {
        this.dialogSubmitted = true;

        if (!this.isDialogFormValid()) {
            return;
        }

        const payload: Tax = {
            ...this.dialogModel,
            OrgId: this.OrgId,
            IsActive: this.dialogModel.IsActive ?? true,
            IsDeleted: false
        };

        console.log(payload);

        if (this.isEditMode && this.editingTaxId) {
            payload.Id = this.editingTaxId;
            payload.UpdatedBy = 1;

            this.TaxService.update(payload).subscribe({
                next: (response: any) => {
                    if (response === 'AlreadyExists' || response?.message === 'AlreadyExists') {
                        this.toast.warn('Duplicate', 'Tax already exists.');
                        return;
                    }

                    this.toast.success('Updated', 'Tax updated successfully.');
                    this.closeAddDialog();
                    this.loadTaxes();
                },
                error: () => {
                    this.toast.error('Update Failed', 'Unable to update tax.');
                }
            });

            return;
        }

        payload.CreatedBy = 1;

        this.TaxService.create(payload).subscribe({
            next: (response: any) => {
                if (response === 'AlreadyExists' || response?.message === 'AlreadyExists') {
                    this.toast.warn('Duplicate', 'Tax already exists.');
                    return;
                }

                this.toast.success('Saved', 'Tax saved successfully.');
                this.closeAddDialog();
                this.loadTaxes();
            },
            error: () => {
                this.toast.error('Save Failed', 'Unable to save tax.');
            }
        });
    }

    onRateChange(value: string): void {
        const rate = value ? parseFloat(value) : 0;
        this.dialogModel.percentage = rate;

        // Validate rate is greater than zero
        if (this.dialogSubmitted && rate <= 0) {
            this.rateErrorMessage = 'Rate must be greater than zero.';
        } else {
            this.rateErrorMessage = '';
        }
    }

    editRow(row: TaxRow): void {
        this.isEditMode = true;
        this.editingTaxId = row.id;
        this.dialogTitle = 'Edit Tax';
        this.dialogSubtitle = 'Update the selected Tax details.';
        this.dialogPrimaryActionLabel = 'Update';

        this.TaxService.getById(row.id).subscribe({
            next: (response: any) => {
                const tax = response?.result?.[0] ?? response?.result ?? response;

                this.dialogModel = {
                    Id: tax?.id ?? tax?.Id ?? row.id,
                    code: tax?.code ?? tax?.Code ?? row.code,
                    name: tax?.name ?? tax?.Name ?? row.name,
                    percentage: tax?.rate ?? tax?.Rate ?? row.rate,
                    OrgId: tax?.orgId ?? tax?.OrgId ?? row.orgId,
                    IsActive: tax?.isActive ?? tax?.IsActive ?? row.isActive,
                    CreatedBy: tax?.createdBy ?? tax?.CreatedBy ?? 1,
                    CreatedDate: tax?.createdDate ?? tax?.CreatedDate,
                    UpdatedBy: tax?.updatedBy ?? tax?.UpdatedBy ?? 1,
                    UpdatedDate: tax?.updatedDate ?? tax?.UpdatedDate,
                    IsDeleted: tax?.isDeleted ?? tax?.IsDeleted ?? false
                };

                this.showAddDialog = true;
                //this.toast.info('Edit Mode', `Editing ${row.name}.`);
            },
            error: () => {
                this.toast.error('Load Failed', 'Unable to load tax details.');
            }
        });
    }

    deleteRow(row: TaxRow): void {
        this.TaxService.delete(row.id).subscribe({
            next: () => {
                this.toast.warn('Deleted', `${row.name} removed successfully.`);
                this.loadTaxes();
            },
            error: () => {
                this.toast.error('Delete Failed', 'Unable to delete tax.');
            }
        });
    }

    activateRow(row: TaxRow): void {
        this.TaxService.activeInActive(row.id, true).subscribe({
            next: () => {
                this.toast.success('Status Updated', `${row.name} marked as active.`);
                this.loadTaxes();
            },
            error: () => {
                this.toast.error('Update Failed', 'Unable to activate tax.');
            }
        });
    }

    deactivateRow(row: TaxRow): void {
        this.TaxService.activeInActive(row.id, false).subscribe({
            next: () => {
                this.toast.info('Status Updated', `${row.name} marked as inactive.`);
                this.loadTaxes();
            },
            error: () => {
                this.toast.error('Update Failed', 'Unable to deactivate tax.');
            }
        });
    }

    confirmDeleteRow(row: TaxRow): void {
        const name = row.name ?? row.code ?? 'this Category';

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

    confirmActivateRow(row: TaxRow): void {
        const name = row.name ?? row.code ?? 'this Category';

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

    confirmDeactivateRow(row: TaxRow): void {
        const name = row.name ?? row.code ?? 'this category';

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

    openRowActions(menu: any, event: Event, row: TaxRow): void {
        this.selectedRow = row;
        this.rowActionItems = this.getRowActionItems(row);
        menu.toggle(event);
    }

    private isDialogFormValid(): boolean {
        const areTextFieldsValid = this.textFields?.toArray().every((field) => field.isValid) ?? true;
        const areSelectFieldsValid = this.selectFields?.toArray().every((field) => field.isValid) ?? true;
        const isRateValid = this.dialogModel.percentage > 0;

        if (!isRateValid) {
            this.rateErrorMessage = 'Rate must be greater than zero.';
        }

        return areTextFieldsValid && areSelectFieldsValid && isRateValid;
    }

    private getRowActionItems(row: Record<string, unknown>): MenuItem[] {
        const items: MenuItem[] = [
            { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') }
        ];

        if (row['isactive'] === true) {
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

    private resetDialogForm(): void {
        this.dialogSubmitted = false;
        this.rateErrorMessage = '';
        this.dialogModel = {
            Id: 0,
            code: '',
            name: '',
            percentage: 0,
            OrgId: this.OrgId,
            IsActive: true,
            CreatedBy: 1,
            UpdatedBy: 1,
            IsDeleted: false
        };
    }
}

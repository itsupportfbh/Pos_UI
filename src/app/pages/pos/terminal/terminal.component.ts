import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { SelectFieldComponent } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';
import { AppToastService } from '../../../services/app-toast.service';
import { Terminal, TerminalService } from '../../../services/terminal.service';
import { BranchService } from '../../../services/branch.service';
import { CounterService } from '../../../services/counter.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

type TerminalRow = {
    id: number;
    code: string;
    name: string;
    branchId: number;
    counterId: number;
    deviceName: string;
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

const TERMINAL_COLUMNS: SharedTableColumn<TerminalRow>[] = [
    { field: 'RowNumber', header: '#', sortable: true, width: '5rem' },
    { field: 'code', header: 'Code', sortable: true, width: '10rem' },
    { field: 'name', header: 'Name', sortable: true, width: '18rem' },
    { field: 'branchname', header: 'Branch', sortable: true, width: '10rem' },
    {
        field: 'Status',
        header: 'Status',
        sortable: true,
        width: '9rem'
    }
];

@Component({
    selector: 'app-terminals',
    standalone: true,
    imports: [CommonModule, ButtonModule, CardModule, DialogModule, TextFieldComponent, ActionButtonsComponent, SelectFieldComponent, MenuModule, SharedTableComponent, ConfirmDialogModule],
    providers: [ConfirmationService],
    templateUrl: './terminal.component.html',
    styleUrl: './terminal.component.css'
})

export class TerminalComponent {
    private readonly toast = inject(AppToastService);
    private readonly TerminalService = inject(TerminalService);
    private readonly branchService = inject(BranchService);
    private readonly counterService = inject(CounterService);
    private readonly changeDetector = inject(ChangeDetectorRef);
    private readonly confirmationService = inject(ConfirmationService);

    showAddDialog = false;
    showFilterSidebar = false;
    isLoading = false;
    isEditMode = false;
    filterTerminalName = '';
    dialogTerminalCode = '';
    dialogTerminalName = '';
    OrgId = 0;
    BranchId = 0;
    counterId = 0;

    tableRows: TerminalRow[] = [];
    selectedRow: TerminalRow | null = null;
    editingTerminalId: number | null = null;

    branchOptions: any[] = [];
    counterOptions: any[] = [];
    dialogCategory: number | null = null;

    dialogModel: Terminal = {
        Id: 0,
        code: '',
        name: '',
        branchId: 0,
        counterId: 0,
        deviceName: '',
        OrgId: this.OrgId,
        IsActive: true,
        CreatedBy: 1,
        UpdatedBy: 1,
        IsDeleted: false
    };

    readonly filterTitle = `${'Terminals'} Filters`;
    readonly filterDescription = `API data will be loaded for ${'Terminals'.toLowerCase()}.`;
    readonly fields: any[] = [{ key: 'TerminalName', label: 'Terminal Name', type: 'text', placeholder: 'Enter terminal name' }];
    readonly primaryActionLabel = `Search ${'Terminals'}`;
    readonly secondaryActionLabel = 'Clear Filters';
    readonly showSecondaryAction = true;
    dialogTitle = 'Create Terminal';
    dialogPrimaryActionLabel = 'Save';
    readonly tableTitle = 'Terminals';
    readonly tableCaption = 'Terminals';
    readonly tableColumns = TERMINAL_COLUMNS;
    readonly showAddNewButton = true;
    readonly addNewButtonLabel = this.showAddNewButton ? 'Add New' : '';
    readonly showFilterButton = true;
    readonly showRowActions = true;
    readonly rowActionHeader = 'Actions';
    rowActionItems: MenuItem[] = [];

    ngOnInit(): void {
        const userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
        console.log('User Details:', userDetails);
        const userId = Number(userDetails.UserId || 0);
        this.OrgId = Number(userDetails.OrgId || 0);
        this.BranchId = Number(userDetails.BranchId || 0);
        this.loadTerminals();
        this.loadBranches();
        this.loadCounters();
    }

    loadBranches() {
        this.branchService.getAll(this.OrgId).subscribe((res: any) => {
            this.branchOptions = (res.result || []).map((item: any) => ({
                label: item.Name,
                value: item.Id
            }));
        });
    }

    loadCounters() {
        this.counterService.getAll(this.OrgId).subscribe((res: any) => {
            this.counterOptions = (res.result || []).map((item: any) => ({
                label: item.Name,
                value: item.Id
            }));
        });
    }

    loadTerminals(): void {
        this.isLoading = true;

        this.TerminalService.getAll(this.OrgId, this.BranchId, this.counterId).subscribe({
            next: (response: any) => {
                const result = response?.result ?? response ?? [];
                console.log('Terminals loaded:', result);
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
                    'Unable to load terminals. Please check API and try again.'
                );
            },
            complete: () => {
                this.isLoading = false;
            }
        });
    }

    searchTerminals(): void {
        const searchText = this.filterTerminalName.trim().toLowerCase();

        if (!searchText) {
            this.loadTerminals();
            return;
        }

        this.tableRows = this.tableRows.filter((row) =>
            row.name?.toLowerCase().includes(searchText) ||
            row.code?.toLowerCase().includes(searchText)
        );
    }

    resetForm(): void {
        this.filterTerminalName = '';
        this.loadTerminals();
    }

    openFilterSidebar(): void {
        this.showFilterSidebar = true;
    }

    closeFilterSidebar(): void {
        this.showFilterSidebar = false;
    }
    openAddDialog(): void {
        this.isEditMode = false;
        this.editingTerminalId = null;
        this.resetDialogForm();
        this.showAddDialog = true;
        this.dialogTitle = 'Create Terminal';
        this.dialogPrimaryActionLabel = 'Save';
    }

    closeAddDialog(): void {
        this.resetDialogForm();
        this.loadCounters();
        this.loadBranches();
        this.loadTerminals();
        this.isEditMode = false;
        this.showAddDialog = false;
    }

    submitAddDialog(): void {
        if (!this.dialogModel.code?.trim()) {
            this.toast.warn('Validation', 'Terminal code is required.');
            return;
        }

        if (!this.dialogModel.name?.trim()) {
            this.toast.warn('Validation', 'Terminal name is required.');
            return;
        }

        if (!this.dialogModel.branchId || this.dialogModel.branchId <= 0) {
            this.toast.warn('Validation', 'Branch is required.');
            return;
        }

        if (!this.dialogModel.counterId || this.dialogModel.counterId <= 0) {
            //this.toast.warn('Validation', 'Counter is required.');
            //return;
            this.dialogModel.counterId = 2;
        }

        if (!this.dialogModel.deviceName?.trim()) {
            this.toast.warn('Validation', 'Device name is required.');
            return;
        }

        const payload: Terminal = {
            ...this.dialogModel,
            OrgId: this.OrgId,
            IsActive: this.dialogModel.IsActive ?? true,
            IsDeleted: false
        };

        console.log(payload);

        if (this.isEditMode && this.editingTerminalId) {
            payload.Id = this.editingTerminalId;
            payload.UpdatedBy = 1;

            this.TerminalService.update(payload).subscribe({
                next: (response: any) => {
                    if (response === 'AlreadyExists' || response?.message === 'AlreadyExists') {
                        this.toast.warn('Duplicate', 'Terminal already exists.');
                        return;
                    }

                    this.toast.success('Updated', 'Terminal updated successfully.');
                    this.closeAddDialog();
                    this.loadTerminals();
                },
                error: () => {
                    this.toast.error('Update Failed', 'Unable to update terminal.');
                }
            });

            return;
        }

        payload.CreatedBy = 1;

        this.TerminalService.create(payload).subscribe({
            next: (response: any) => {
                if (response === 'AlreadyExists' || response?.message === 'AlreadyExists') {
                    this.toast.warn('Duplicate', 'Terminal already exists.');
                    return;
                }

                this.toast.success('Saved', 'Terminal saved successfully.');
                this.closeAddDialog();
                this.loadTerminals();
            },
            error: () => {
                this.toast.error('Save Failed', 'Unable to save terminal.');
            }
        });
    }

    editRow(row: TerminalRow): void {
        this.isEditMode = true;
        this.editingTerminalId = row.id;
        this.dialogTitle = 'Edit Terminal';
        this.dialogPrimaryActionLabel = 'Update';

        this.TerminalService.getById(row.id).subscribe({
            next: (response: any) => {
                const terminal = response?.result?.[0] ?? response?.result ?? response;

                this.dialogModel = {
                    Id: terminal?.id ?? terminal?.Id ?? row.id,
                    code: terminal?.code ?? terminal?.Code ?? row.code,
                    name: terminal?.name ?? terminal?.Name ?? row.name,
                    branchId: terminal?.branchId ?? terminal?.BranchId ?? row.branchId,
                    counterId: terminal?.counterId ?? terminal?.CounterId ?? row.counterId,
                    deviceName: terminal?.deviceName ?? terminal?.DeviceName ?? row.deviceName,
                    OrgId: terminal?.orgId ?? terminal?.OrgId ?? row.orgId,
                    IsActive: terminal?.isActive ?? terminal?.IsActive ?? row.isActive,
                    CreatedBy: terminal?.createdBy ?? terminal?.CreatedBy ?? 1,
                    CreatedDate: terminal?.createdDate ?? terminal?.CreatedDate,
                    UpdatedBy: terminal?.updatedBy ?? terminal?.UpdatedBy ?? 1,
                    UpdatedDate: terminal?.updatedDate ?? terminal?.UpdatedDate,
                    IsDeleted: terminal?.isDeleted ?? terminal?.IsDeleted ?? false
                };

                this.showAddDialog = true;
                this.toast.info('Edit Mode', `Editing ${row.name}.`);
            },
            error: () => {
                this.toast.error('Load Failed', 'Unable to load terminal details.');
            }
        });
    }

    deleteRow(row: TerminalRow): void {
        this.TerminalService.delete(row.id).subscribe({
            next: () => {
                this.toast.warn('Deleted', `${row.name} removed successfully.`);
                this.loadTerminals();
            },
            error: () => {
                this.toast.error('Delete Failed', 'Unable to delete terminal.');
            }
        });
    }

    activateRow(row: TerminalRow): void {
        this.TerminalService.activeInActive(row.id, true).subscribe({
            next: () => {
                this.toast.success('Status Updated', `${row.name} marked as active.`);
                this.loadTerminals();
            },
            error: () => {
                this.toast.error('Update Failed', 'Unable to activate terminal.');
            }
        });
    }

    deactivateRow(row: TerminalRow): void {
        this.TerminalService.activeInActive(row.id, false).subscribe({
            next: () => {
                this.toast.info('Status Updated', `${row.name} marked as inactive.`);
                this.loadTerminals();
            },
            error: () => {
                this.toast.error('Update Failed', 'Unable to deactivate terminal.');
            }
        });
    }

    confirmDeleteRow(row: TerminalRow): void {
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

    confirmActivateRow(row: TerminalRow): void {
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

    confirmDeactivateRow(row: TerminalRow): void {
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

    openRowActions(menu: any, event: Event, row: TerminalRow): void {
        this.selectedRow = row;
        this.rowActionItems = this.getRowActionItems(row);
        menu.toggle(event);
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
        this.dialogModel = {
            Id: 0,
            code: '',
            name: '',
            OrgId: this.OrgId,
            IsActive: true,
            CreatedBy: 1,
            UpdatedBy: 1,
            IsDeleted: false
        };
    }
}
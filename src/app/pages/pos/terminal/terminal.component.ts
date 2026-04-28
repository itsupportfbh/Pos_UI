import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, QueryList, inject, ViewChildren } from '@angular/core';
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
import { Terminal, TerminalService } from '../../../services/terminal.service';
import { BranchService } from '../../../services/branch.service';
import { CounterService } from '../../../services/counter.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MultiSelectFieldComponent, MultiSelectFieldValue } from '../../../components/form/multiselect-field.component';

type TerminalRow = {
    id: number;
    code: string;
    name: string;
    branchid: number;
    counterid: number;
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
    { field: 'name', header: 'Name', sortable: true, width: '10rem' },
    { field: 'branchid', header: 'Branch ID', sortable: true, width: '10rem', hidden: true },
    { field: 'branchname', header: 'Branch', sortable: true, width: '10rem' },
    { field: 'counterid', header: 'Counter ID', sortable: true, width: '10rem', hidden: true },
    { field: 'countername', header: 'Counter', sortable: true, width: '10rem' },
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
    imports: [CommonModule, ButtonModule, CardModule, DialogModule, TextFieldComponent, ActionButtonsComponent, SelectFieldComponent, MenuModule, SharedTableComponent, ConfirmDialogModule, SharedTableCellTemplateDirective, MultiSelectFieldComponent],
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

    @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
    @ViewChildren(SelectFieldComponent) private readonly selectFields?: QueryList<SelectFieldComponent>;
    @ViewChildren(MultiSelectFieldComponent) private readonly multiSelectFields?: QueryList<MultiSelectFieldComponent>;

    showAddDialog = false;
    showFilterSidebar = false;
    isLoading = false;
    isEditMode = false;
    filterTerminalName = '';
    selectedBranchId = 0;
    selectedCounterId = 0;
    selectedBranchIds: MultiSelectFieldValue = [];
    selectedCounterIds: MultiSelectFieldValue = [];
    dialogBranchIds: MultiSelectFieldValue = [];
    dialogCounterIds: MultiSelectFieldValue = [];
    dialogSubmitted = false;
    dialogTerminalCode = '';
    dialogTerminalName = '';
    OrgId = 0;
    BranchId = 0;
    counterId = 0;

    tableRows: TerminalRow[] = [];
    allTerminals: TerminalRow[] = [];
    selectedRow: TerminalRow | null = null;
    editingTerminalId: number | null = null;

    branchOptions: any[] = [];
    counterOptions: any[] = [];
    dialogCategory: number | null = null;
    dialogBranch: SelectFieldValue = null;

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
    }

    loadBranches() {
        this.branchService.getAll(this.OrgId).subscribe((res: any) => {
            this.branchOptions = (res.result || []).map((item: any) => ({
                label: item.Name,
                value: item.Id
            }));
        });
    }

    onBranchChange(value: SelectFieldValue): void {
        this.dialogBranch = value;
        this.dialogModel.branchId = Number(value) || 0;
        this.counterOptions = [];

        if (!value || Number(value) === 0) {
            return;
        }

        void this.loadCounters(Number(value));
    }

    loadCounters(BranchId: number = this.BranchId): void {
        this.counterService.getAll(this.OrgId, BranchId).subscribe((res: any) => {
            this.counterOptions = (res.result || []).map((item: any) => ({
                label: item.Name,
                value: item.Id
            }));
        });
    }

    loadMultiCounters(branchIds: number[] = []): void {
        this.counterService.getMultiAll(this.OrgId, branchIds).subscribe((res: any) => {
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
                this.allTerminals = (response.result ?? []).map((x: any) => {
                    x.RowNumber = RowNumber++;
                    x.Status = x.isactive ? 'Active' : 'Inactive';
                    return x;
                });
                this.tableRows = [...this.allTerminals];
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
        // const branchId = Number(this.selectedBranchId || 0);
        // const counterId = Number(this.selectedCounterId || 0);      

        // this.tableRows = (this.allTerminals || []).filter((row) => {
        //     const matchesText = !searchText ||
        //         row.name?.toLowerCase().includes(searchText) ||
        //         row.code?.toLowerCase().includes(searchText);
        //     const matchesBranch = !branchId || Number(row.branchid ?? 0) === branchId;
        //     const matchesCounter = !counterId || Number(row.counterid ?? 0) === counterId;
        //     return matchesText && matchesBranch && matchesCounter;
        // });
        const branchIds = this.selectedBranchIds.map((id) => Number(id));
        const counterIds = this.selectedCounterIds.map((id) => Number(id));

        this.tableRows = this.allTerminals.filter((row) => {
            const matchesText = !searchText ||
                row.name?.toLowerCase().includes(searchText) ||
                row.code?.toLowerCase().includes(searchText);

            const matchesBranch = !branchIds.length || branchIds.includes(Number(row.branchid ?? 0));
            const matchesCounter = !counterIds.length || counterIds.includes(Number(row.counterid ?? 0));

            return matchesText && matchesBranch && matchesCounter;
        });

    }

    onfilterBranchChange(value: MultiSelectFieldValue): void {
        const arr = Array.isArray(value) ? value : value ? [value] : [];
        this.selectedBranchIds = arr.map(v => Number(v));
        console.log('Selected Branch IDs:', this.selectedBranchIds);
        void this.loadMultiCounters(this.selectedBranchIds.map((id) => Number(id)));
    }

    onfilterCounterChange(counterIds: MultiSelectFieldValue): void {
        this.selectedCounterIds = counterIds.map(id => Number(id));
    }

    resetForm(): void {
        this.filterTerminalName = '';
        this.selectedBranchIds = [];
        this.selectedCounterIds = [];
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
        this.loadBranches();
        this.loadTerminals();
        this.isEditMode = false;
        this.showAddDialog = false;
        this.dialogSubmitted = false;
    }

    submitAddDialog(): void {
        this.dialogSubmitted = true;

        if (!this.isDialogFormValid()) {
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
                    branchId: terminal?.branchId ?? terminal?.BranchId ?? row.branchid,
                    counterId: terminal?.counterId ?? terminal?.CounterId ?? row.counterid,
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

    private isDialogFormValid(): boolean {
        const areTextFieldsValid = this.textFields?.toArray().every((field) => field.isValid) ?? true;
        const areSelectFieldsValid = this.selectFields?.toArray().every((field) => field.isValid) ?? true;
        const areMultiSelectFieldsValid = this.multiSelectFields?.toArray().every((field) => field.isValid) ?? true;

        return areTextFieldsValid && areSelectFieldsValid && areMultiSelectFieldsValid;
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
        this.dialogBranchIds = [];
        this.dialogCounterIds = [];
        this.counterOptions = [];
        this.dialogModel = {
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
    }
}
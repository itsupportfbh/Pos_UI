import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, QueryList, inject, ViewChildren } from '@angular/core';
import { firstValueFrom } from 'rxjs';
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
    { field: 'organizationname', header: 'Organization Name', sortable: true, width: '16rem', hidden: true },
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

export class TerminalComponent implements OnInit {
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
    isEditMode = false;
    selectedBranchIds: MultiSelectFieldValue = [];
    selectedCounterIds: MultiSelectFieldValue = [];
    dialogSubmitted = false;
    OrgId = 0;
    BranchId = 0;
    counterId = 0;
    UserId = 0;
    userDetails: any = {};
    isAdmin = false;
    isBranchSelectionLocked = false;
    tableRows: TerminalRow[] = [];
    allTerminals: TerminalRow[] = [];
    selectedRow: TerminalRow | null = null;
    editingTerminalId: number | null = null;

    branchOptions: any[] = [];
    counterOptions: any[] = [];
    counterfilterOptions: any[] = [];
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
        CreatedBy: 0,
        UpdatedBy: 0,
        IsDeleted: false
    };

    readonly pageEyebrow = 'Terminal Management';
    readonly pageTitle = 'Terminals';
    readonly pageSubtitle = 'Manage your POS terminals here.';
    readonly filterTitle = `${'Terminals'} Filters`;
    readonly primaryActionLabel = `Search ${'Terminals'}`;
    readonly secondaryActionLabel = 'Clear Filters';
    readonly showSecondaryAction = true;
    dialogTitle = 'Create Terminal';
    dialogSubtitle = 'Add a new terminal and assign it to a branch and counter.';
    dialogPrimaryActionLabel = 'Save';
    readonly tableTitle = 'Terminals';
    readonly tableCaption = 'Terminals';
    tableColumns = TERMINAL_COLUMNS;
    readonly showAddNewButton = true;
    readonly addNewButtonLabel = this.showAddNewButton ? 'Add New' : '';
    readonly showFilterButton = true;
    readonly showRowActions = true;
    readonly rowActionHeader = 'Actions';
    rowActionItems: MenuItem[] = [];

    ngOnInit(): void {
        this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
        this.UserId = Number(this.userDetails.UserId || 0);
        this.OrgId = Number(this.userDetails.OrgId || 0);
        this.BranchId = Number(this.userDetails.BranchId || 0);
        this.isAdmin = this.userDetails.IsAdmin == true || this.userDetails.IsAdmin == 1;
        this.isBranchSelectionLocked = this.userDetails.RoleId !== 1 && this.userDetails.IsAdmin !== true && this.userDetails.IsAdmin !== 1;
        
        this.tableColumns = TERMINAL_COLUMNS.map((x: any) => {
            if (x.field === 'organizationname') {
                x.hidden = this.userDetails.RoleId !== 1;
            }

            return x;
        });

        void this.loadTerminals();
    }

    async loadBranches(): Promise<void> {
        try {
            const orgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId || 0);
            const response: any = await firstValueFrom(this.branchService.getAll(orgId));
            const branchList = response?.result ?? [];

            this.branchOptions = branchList.filter((x: any) => x.IsActive === true).map((branch: any) => ({
                label: branch.Name ?? '',
                value: branch.Id ?? 0
            }));
        } catch {
            this.branchOptions = [];
            this.toast.error('Load Failed', 'Unable to load branches. Please check API and try again.');
        }
    }

    onBranchChange(value: SelectFieldValue): void {
        this.dialogBranch = value;
        this.dialogModel.branchId = Number(value) || 0;
        this.dialogModel.counterId = 0;
        this.counterOptions = [];

        if (!value || Number(value) === 0) {
            return;
        }

        void this.loadDialogCounters(Number(value));
    }

    async loadDialogCounters(BranchId: number = this.BranchId): Promise<void> {
        try {
            const response: any = await firstValueFrom(this.counterService.getAll(this.OrgId, BranchId));
            const counterList = response?.result ?? [];

            this.counterOptions = counterList.filter((item: any) => item.IsActive === true).map((item: any) => ({
                label: item.Name ?? '',
                value: item.Id ?? 0
            }));
        } catch {
            this.counterOptions = [];
            this.toast.error('Load Failed', 'Unable to load counters. Please check API and try again.');
        }
    }

    async loadCounters(branchId: number | string = this.BranchId): Promise<void> {
        try {
            const response: any = await firstValueFrom(this.counterService.getAll(this.OrgId, branchId));
            const counterList = response?.result ?? [];

            this.counterfilterOptions = counterList.filter((item: any) => item.IsActive === true).map((item: any) => ({
                label: this.isAdmin
                    ? `${item.Name ?? ''}${item.BranchName ? ` - (Branch: ${item.BranchName})` : ''}`
                    : item.Name ?? '',
                value: item.Id ?? 0
            }));
        } catch {
            this.counterfilterOptions = [];
            this.toast.error('Load Failed', 'Unable to load counters. Please check API and try again.');
        }
    }

    async loadTerminals(): Promise<void> {
        try {
            this.OrgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId);
            this.BranchId = this.isAdmin
                ? 0
                : Number(this.userDetails.RoleId || 0) === 1
                    ? 0
                    : Number(this.userDetails.BranchId);

            const response: any = await firstValueFrom(this.TerminalService.getAll(this.OrgId, this.BranchId, this.counterId));

            let RowNumber = 1;
            this.allTerminals = (response.result ?? []).map((x: any) => {
                x.RowNumber = RowNumber++;
                x.Status = x.isactive ? 'Active' : 'Inactive';
                return x;
            });
            this.tableRows = [...this.allTerminals];
            this.changeDetector.detectChanges();
        } catch {
            this.toast.error('Load Failed', 'Unable to load terminals. Please check API and try again.');
        }
    }

    searchTerminals(): void {
        const branchIds = this.selectedBranchIds.map((id) => Number(id));
        const counterIds = this.selectedCounterIds.map((id) => Number(id));

        this.tableRows = this.allTerminals.filter((row) => {
            const matchesBranch = !branchIds.length || branchIds.includes(Number(row.branchid ?? 0));
            const matchesCounter = !counterIds.length || counterIds.includes(Number(row.counterid ?? 0));

            return matchesBranch && matchesCounter;
        });

    }

    onfilterBranchChange(value: MultiSelectFieldValue): void {
        const arr = Array.isArray(value) ? value : value ? [value] : [];
        this.selectedBranchIds = arr.map(v => Number(v));
        this.selectedCounterIds = [];

        if (!this.selectedBranchIds.length) {
            void this.loadCounters(this.BranchId);
            return;
        }

        void this.loadCounters(this.selectedBranchIds.join(','));
    }

    onfilterCounterChange(counterIds: MultiSelectFieldValue): void {
        this.selectedCounterIds = counterIds.map(id => Number(id));
    }

    resetForm(): void {
        this.selectedBranchIds = this.isBranchSelectionLocked && Number(this.BranchId || 0) > 0
            ? [Number(this.BranchId)]
            : [];
        this.selectedCounterIds = [];
        const branchId = this.selectedBranchIds.length ? this.selectedBranchIds.join(',') : this.BranchId;
        void this.loadCounters(branchId);
        void this.loadTerminals();
    }

    openFilterSidebar(): void {
        this.resetForm();
        if (!this.branchOptions.length) {
            void this.loadBranches();
        }

        if (!this.selectedBranchIds.length) {
            void this.loadCounters(this.BranchId);
        } else {
            void this.loadCounters(this.selectedBranchIds.join(','));
        }

        this.showFilterSidebar = true;
    }

    closeFilterSidebar(): void {
        this.showFilterSidebar = false;
    }
    async openAddDialog(): Promise<void> {
        this.isEditMode = false;
        this.editingTerminalId = null;
        await this.resetDialogForm();
        this.dialogTitle = 'Create Terminal';
        this.dialogSubtitle = 'Add a new terminal and assign it to a branch and counter.';
        this.dialogPrimaryActionLabel = 'Save';

        await this.loadBranches();

        if (this.isBranchSelectionLocked && Number(this.BranchId || 0) > 0) {
            this.dialogBranch = Number(this.BranchId);
            this.dialogModel.branchId = Number(this.BranchId);
            await this.loadDialogCounters(Number(this.BranchId));
        }

        this.showAddDialog = true;
    }

    closeAddDialog(): void {
        void this.resetDialogForm();
        this.isEditMode = false;
        this.showAddDialog = false;
        this.dialogSubmitted = false;
    }

    async submitAddDialog(): Promise<void> {
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

        try {
            let response: any;

            if (this.isEditMode && this.editingTerminalId) {
                payload.Id = this.editingTerminalId;
                payload.UpdatedBy = Number(this.userDetails.UserId || 0);
                response = await firstValueFrom(this.TerminalService.update(payload));
            } else {
                payload.CreatedBy = Number(this.userDetails.UserId || 0);
                response = await firstValueFrom(this.TerminalService.create(payload));
            }

            if (response === 'AlreadyExists' || response?.message === 'AlreadyExists' || response?.result === 'AlreadyExists') {
                this.toast.warn('Duplicate', 'Terminal already exists.');
                return;
            }

            this.toast.success(this.isEditMode ? 'Updated' : 'Saved', this.isEditMode ? 'Terminal updated successfully.' : 'Terminal saved successfully.');
            this.closeAddDialog();
            await this.loadTerminals();
        } catch {
            this.toast.error(this.isEditMode ? 'Update Failed' : 'Save Failed', this.isEditMode ? 'Unable to update terminal.' : 'Unable to save terminal.');
        }
    }

    async editRow(row: TerminalRow): Promise<void> {
        try {
            await this.resetDialogForm();
            this.isEditMode = true;
            this.editingTerminalId = row.id;
            this.dialogTitle = 'Edit Terminal';
            this.dialogSubtitle = 'Update the selected Terminal details.';
            this.dialogPrimaryActionLabel = 'Update';
            await this.loadBranches();

            const response: any = await firstValueFrom(this.TerminalService.getById(row.id));
            const terminal = response?.result?.[0] ?? response?.result ?? response;

            this.dialogModel.branchId = terminal?.branchId ?? terminal?.BranchId ?? row.branchid;
            await this.loadDialogCounters(Number(this.dialogModel.branchId));

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

            this.dialogBranch = this.dialogModel.branchId ?? null;
            this.showAddDialog = true;
        } catch {
            this.toast.error('Load Failed', 'Unable to load terminal details.');
        }
    }

    async deleteRow(row: TerminalRow): Promise<void> {
        try {
            await firstValueFrom(this.TerminalService.delete(row.id));
            this.toast.warn('Deleted', `${row.name} removed successfully.`);
            await this.loadTerminals();
        } catch {
            this.toast.error('Delete Failed', 'Unable to delete terminal.');
        }
    }

    async activateRow(row: TerminalRow): Promise<void> {
        try {
            await firstValueFrom(this.TerminalService.activeInActive(row.id, true));
            this.toast.success('Status Updated', `${row.name} marked as active.`);
            await this.loadTerminals();
        } catch {
            this.toast.error('Update Failed', 'Unable to activate terminal.');
        }
    }

    async deactivateRow(row: TerminalRow): Promise<void> {
        try {
            await firstValueFrom(this.TerminalService.activeInActive(row.id, false));
            this.toast.info('Status Updated', `${row.name} marked as inactive.`);
            await this.loadTerminals();
        } catch {
            this.toast.error('Update Failed', 'Unable to deactivate terminal.');
        }
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

    async resetDialogForm(keepCode: boolean = false): Promise<void> {
        this.dialogSubmitted = false;
        this.counterOptions = [];
        const code = keepCode ? this.dialogModel.code ?? '' : '';
        this.dialogModel = {
            Id: 0,
            code,
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
        this.dialogBranch = this.isBranchSelectionLocked && Number(this.BranchId || 0) > 0 ? Number(this.BranchId) : null;

        if (this.isBranchSelectionLocked && Number(this.BranchId || 0) > 0) {
            await this.loadBranches();
            await this.loadDialogCounters(Number(this.BranchId || 0));
            this.dialogModel.branchId = Number(this.BranchId || 0);
        }
    }
}

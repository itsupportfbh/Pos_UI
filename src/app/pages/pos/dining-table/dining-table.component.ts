import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';

import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { ImageUploadFieldComponent } from '../../../components/form/image-upload-field.component';
import { SelectFieldComponent, SelectFieldValue } from '../../../components/form/select-field.component';
import { SharedTableCellTemplateDirective, SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { AppToastService } from '../../../services/app-toast.service';
import { BranchService } from '../../../services/branch.service';
import { DiningTable, DiningTableService } from '../../../services/diningtable.service';
import { FloorService } from '../../../services/floor.service';
import { OrganizationService } from '../../../services/organization.service';

const DINING_TABLE_COLUMNS: SharedTableColumn<any>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'organizationname', header: 'Organization Name', sortable: true, width: '16rem', hidden: true },
  { field: 'code', header: 'Code', sortable: true, width: '10rem' },
  { field: 'name', header: 'Name', sortable: true, width: '16rem' },
  { field: 'seatingsize', header: 'Capacity', sortable: true, width: '8rem' },
  { field: 'branchname', header: 'Branch', sortable: true, width: '12rem' },
  { field: 'floorname', header: 'Floor', sortable: true, width: '12rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '8rem' }
];

@Component({
  selector: 'app-dining-table',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    DialogModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
    TextFieldComponent,
    SelectFieldComponent,
    ActionButtonsComponent,
    ImageUploadFieldComponent,
    MenuModule,
    ConfirmDialogModule
  ],
  providers: [ConfirmationService],
  templateUrl: './dining-table.component.html',
  styleUrl: './dining-table.component.css'
})
export class DiningTableComponent implements OnInit {
  private readonly toast = inject(AppToastService);
  private readonly branchService = inject(BranchService);
  private readonly floorService = inject(FloorService);
  private readonly diningTableService = inject(DiningTableService);
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
  dialogBranchId: SelectFieldValue = null;
  dialogFloorId: SelectFieldValue = null;
  dialogCode = '';
  dialogName = '';
  dialogSeatingSize = '';
  dialogDisplayOrder = '';
  dialogRemarks = '';
  dialogImage = '';
  dialogImageFile: File | null = null;
  dialogImagePreviewUrl: string | null = null;

  allRows: any[] = [];
  tableRows: any[] = [];
  selectedRow: any = null;
  rowActionItems: MenuItem[] = [];
  organizationOptions: any[] = [];
  branchOptions: any[] = [];
  floorOptions: any[] = [];
  userDetails: any = {};
  OrgId = 0;
  BranchId = 0;

  readonly pageEyebrow = 'Dining';
  readonly pageTitle = 'Dining Tables';
  readonly pageSubtitle = 'Maintain dining table details and seating capacity.';
  readonly tableTitle = 'Dining Tables';
  readonly tableCaption = 'Dining tables';
  dialogTitle = 'Create Dining Table';
  dialogSubtitle = 'Create a new dining table.';
  dialogPrimaryActionLabel = 'Save';
  tableColumns = DINING_TABLE_COLUMNS;
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = 'Add New';
  readonly showFilterButton = false;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';

  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.OrgId = Number(this.userDetails.OrgId || 0);
    this.BranchId = this.userDetails.IsAdmin === true ? 0 : Number(this.userDetails.BranchId || 0);

    this.tableColumns = DINING_TABLE_COLUMNS.map((x: any) => {
      if (x.field === 'organizationname') {
        x.hidden = this.userDetails.RoleId !== 1;
      }

      return x;
    });

    this.loadDiningTables();
  }

  async loadOrganizations(): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.organizationService.getAll());
      const organizations = response?.result ?? [];

      this.organizationOptions = organizations.filter((x: any) => x.IsActive).map((x: any) => ({
        label: x.Name ?? '',
        value: x.Id ?? 0
      }));
    } catch {
      this.organizationOptions = [];
      this.toast.error('Load Failed', 'Unable to load organizations. Please check and try again.');
    }
  }

  async loadBranches(orgId: number): Promise<void> {
    if (!orgId) {
      this.branchOptions = [];
      return;
    }

    try {
      const response: any = await firstValueFrom(this.branchService.getAll(orgId));
      const branches = response?.result ?? [];

      this.branchOptions = branches.filter((x: any) => x.IsActive).map((x: any) => ({
        label: x.Name ?? '',
        value: x.Id ?? 0
      }));
    } catch {
      this.branchOptions = [];
      this.toast.error('Load Failed', 'Unable to load branches. Please check and try again.');
    }
  }

  async loadFloors(orgId: number, branchId: number): Promise<void> {
    if (!orgId || !branchId) {
      this.floorOptions = [];
      return;
    }

    try {
      const response: any = await firstValueFrom(this.floorService.getAll(orgId, branchId));
      const floors = response?.result ?? [];

      this.floorOptions = floors.filter((x: any) => x.IsActive).map((x: any) => ({
        label: x.Name ?? '',
        value: x.Id ?? 0
      }));
    } catch {
      this.floorOptions = [];
      this.toast.error('Load Failed', 'Unable to load floors. Please check and try again.');
    }
  }

  async loadDiningTables(): Promise<void> {
    try {
      const orgId = this.userDetails.RoleId === 1 ? 0 : Number(this.userDetails.OrgId || 0);
      const branchId = this.userDetails.IsAdmin === true ? 0 : Number(this.userDetails.BranchId || 0);
      const response: any = await firstValueFrom(this.diningTableService.getAll(orgId, branchId));
      let RowNumber = 1;

      this.tableRows = (response.result ?? []).map((x: any) => {
        x.RowNumber = RowNumber++;
        x.Status = x.isactive === true ? 'Active' : 'Inactive';
        x.ImagePreviewUrl = this.getImagePreviewUrl(String(x.image ?? ''));
        return x;
      });

      this.allRows = [...this.tableRows];
      this.changeDetector.detectChanges();
    } catch {
      this.toast.error('Load Failed', 'Unable to load dining tables. Please check API and try again.');
    }
  }

  async openAddDialog(): Promise<void> {
    await this.resetDialogForm();
    this.isEditMode = false;
    this.dialogTitle = 'Create Dining Table';
    this.dialogSubtitle = 'Create a new dining table.';
    this.dialogPrimaryActionLabel = 'Save';
    this.showAddDialog = true;

    if (this.userDetails.RoleId === 1) {
      await this.loadOrganizations();
    } else {
      await this.loadBranches(Number(this.userDetails.OrgId || 0));

      if (this.userDetails.IsAdmin !== true) {
        this.dialogBranchId = Number(this.userDetails.BranchId || 0);
        await this.loadFloors(Number(this.userDetails.OrgId || 0), Number(this.dialogBranchId || 0));
      }
    }
  }

  closeAddDialog(): void {
    this.loadDiningTables();
    this.isEditMode = false;
    this.dialogSubmitted = false;
    this.showAddDialog = false;
  }

  async onDialogOrganizationChange(value: SelectFieldValue): Promise<void> {
    this.dialogOrganization = value;
    this.dialogBranchId = null;
    this.dialogFloorId = null;
    this.branchOptions = [];
    this.floorOptions = [];

    if (!value || Number(value) === 0) {
      return;
    }

    await this.loadBranches(Number(value));
  }

  async onDialogBranchChange(value: SelectFieldValue): Promise<void> {
    this.dialogBranchId = value;
    this.dialogFloorId = null;
    this.floorOptions = [];

    const orgId = this.userDetails.RoleId === 1
      ? Number(this.dialogOrganization || 0)
      : Number(this.userDetails.OrgId || 0);

    if (!orgId || !value || Number(value) === 0) {
      return;
    }

    await this.loadFloors(orgId, Number(value));
  }

  async submitAddDialog(): Promise<void> {
    this.dialogSubmitted = true;

    if (!this.isDialogFormValid()) {
      return;
    }

    this.dialogSaving = true;

    const payload: DiningTable = {
      id: this.dialogId,
      code: this.dialogCode,
      name: this.dialogName,
      seatingSize: Number(this.dialogSeatingSize || 0),
      branchId: Number(this.dialogBranchId || 0),
      floorId: Number(this.dialogFloorId || 0),
      image: this.dialogImageFile ? String(this.dialogImagePreviewUrl ?? '') : this.dialogImage,
      remarks: this.dialogRemarks,
      displayOrder: Number(this.dialogDisplayOrder || 0),
      orgId: this.userDetails.RoleId === 1 ? Number(this.dialogOrganization || 0) : Number(this.userDetails.OrgId || 0),
      isActive: true,
      createdBy: Number(this.userDetails.UserId || 0),
      createdDate: new Date().toISOString(),
      updatedBy: Number(this.userDetails.UserId || 0),
      updatedDate: new Date().toISOString(),
      isDeleted: false
    };

    try {
      let response: any;

      if (!payload.id) {
        response = await firstValueFrom(this.diningTableService.create(payload));
      } else {
        response = await firstValueFrom(this.diningTableService.update(payload));
      }

      if (response === 'AlreadyExists' || response?.message === 'AlreadyExists' || response?.result === 'AlreadyExists') {
        this.toast.warn('Already Exists', `${payload.name || this.pageTitle} already exists. Please use a different name.`);
        return;
      }

      if (!payload.id) {
        this.toast.success('Saved', `${payload.name || this.pageTitle} saved successfully.`);
      } else {
        this.toast.success('Updated', `${payload.name || this.pageTitle} updated successfully.`);
      }

      this.closeAddDialog();
    } catch {
      this.toast.error(payload.id ? 'Update Failed' : 'Save Failed', `Unable to save ${this.pageTitle.toLowerCase()}.`);
    } finally {
      this.dialogSaving = false;
    }
  }

  async editRow(row: any): Promise<void> {
    await this.resetDialogForm();
    this.isEditMode = true;
    this.dialogTitle = 'Edit Dining Table';
    this.dialogSubtitle = 'Update the selected dining table details.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;

    try {
      const response: any = await firstValueFrom(this.diningTableService.getById(row.Id || row.id));
      const diningTable = response?.result?.[0] ?? response?.result ?? response ?? {};
      const orgId = this.userDetails.RoleId === 1
        ? Number(diningTable.OrgId ?? diningTable.orgId ?? 0)
        : Number(this.userDetails.OrgId || 0);

      this.dialogId = Number(diningTable.Id ?? diningTable.id ?? 0);
      this.dialogCode = diningTable.Code ?? diningTable.code ?? '';
      this.dialogName = diningTable.Name ?? diningTable.name ?? '';
      this.dialogSeatingSize = String(diningTable.SeatingSize ?? diningTable.seatingsize ?? diningTable.seatingSize ?? '');
      this.dialogDisplayOrder = String(diningTable.DisplayOrder ?? diningTable.displayorder ?? '');
      this.dialogRemarks = diningTable.Remarks ?? diningTable.remarks ?? '';
      this.dialogImage = diningTable.Image ?? diningTable.image ?? '';
      this.dialogImagePreviewUrl = this.getImagePreviewUrl(this.dialogImage);

      if (this.userDetails.RoleId === 1) {
        await this.loadOrganizations();
        this.dialogOrganization = orgId;
      }

      await this.loadBranches(orgId);
      this.dialogBranchId = Number(diningTable.BranchId ?? diningTable.branchId ?? 0);

      if (this.dialogBranchId) {
        await this.loadFloors(orgId, Number(this.dialogBranchId));
      }

      this.dialogFloorId = Number(diningTable.FloorId ?? diningTable.floorId ?? 0);
    } catch {
      this.toast.error('Load Failed', 'Unable to load dining table details. Please check and try again.');
    }
  }

  async deleteRow(row: any): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.diningTableService.delete(row.Id || row.id));

      if (response?.ErrorInfo?.Message === true || response === true || response?.result === true) {
        this.toast.success('Deleted', `${String(row.Name ?? row.Code ?? 'Record')} deleted successfully.`);
        this.loadDiningTables();
        return;
      }

      this.toast.error('Delete Failed', response?.ErrorInfo?.Message || 'Unable to delete dining table.');
    } catch {
      this.toast.error('Delete Failed', 'Unable to delete dining table.');
    }
  }

  async activateRow(row: any): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.diningTableService.activeInActive(row.Id || row.id, true));

      if (response?.ErrorInfo?.Message === true || response === true || response?.result === true) {
        this.toast.success('Activated', `${String(row.Name ?? row.Code ?? 'Record')} activated successfully.`);
        this.loadDiningTables();
        return;
      }

      this.toast.error('Activation Failed', response?.ErrorInfo?.Message || 'Unable to activate dining table.');
    } catch {
      this.toast.error('Activation Failed', 'Unable to activate dining table.');
    }
  }

  async deactivateRow(row: any): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.diningTableService.activeInActive(row.Id || row.id, false));

      if (response?.ErrorInfo?.Message === true || response === true || response?.result === true) {
        this.toast.success('Deactivated', `${String(row.Name ?? row.Code ?? 'Record')} deactivated successfully.`);
        this.loadDiningTables();
        return;
      }

      this.toast.error('Deactivation Failed', response?.ErrorInfo?.Message || 'Unable to deactivate dining table.');
    } catch {
      this.toast.error('Deactivation Failed', 'Unable to deactivate dining table.');
    }
  }

  confirmDeleteRow(row: any): void {
    const name = String(row.Name ?? row.Code ?? 'this dining table');

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
    const name = String(row.Name ?? row.Code ?? 'this dining table');

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
    const name = String(row.Name ?? row.Code ?? 'this dining table');

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

  private getRowActionItems(row: any): MenuItem[] {
    const items: MenuItem[] = [
      { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') }
    ];

    if (row.IsActive === true || row.isactive === true) {
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

  private isDialogFormValid(): boolean {
    const areTextFieldsValid = this.textFields?.toArray().every((field) => field.isValid) ?? true;
    const areSelectFieldsValid = this.selectFields?.toArray().every((field) => field.isValid) ?? true;

    return areTextFieldsValid && areSelectFieldsValid;
  }

  private getImagePreviewUrl(image: string): string | null {
    if (!image) {
      return null;
    }

    if (image.startsWith('data:') || image.startsWith('http://') || image.startsWith('https://')) {
      return image;
    }

    const fileName = this.getImageFileName(image);

    if (!fileName) {
      return null;
    }

    return `/FileUpload/${encodeURIComponent(fileName)}`;
  }

  private getImageFileName(image: string): string {
    if (!image) {
      return '';
    }

    const parts = image.split(/[\\/]/);
    return parts[parts.length - 1] ?? '';
  }

  async resetDialogForm(): Promise<void> {
    this.dialogSubmitted = false;
    this.dialogSaving = false;
    this.dialogId = 0;
    this.dialogCode = '';
    this.dialogName = '';
    this.dialogSeatingSize = '';
    this.dialogDisplayOrder = '';
    this.dialogRemarks = '';
    this.dialogImage = '';
    this.dialogImageFile = null;
    this.dialogImagePreviewUrl = null;
    this.dialogOrganization = null;
    this.dialogBranchId = null;
    this.dialogFloorId = null;
    this.branchOptions = [];
    this.floorOptions = [];

    if (this.userDetails.RoleId !== 1) {
      await this.loadBranches(Number(this.userDetails.OrgId || 0));
    }

    if (this.userDetails.RoleId !== 1 && this.userDetails.IsAdmin !== true) {
      this.dialogBranchId = Number(this.userDetails.BranchId || 0);
      await this.loadFloors(Number(this.userDetails.OrgId || 0), Number(this.dialogBranchId || 0));
    }
  }
}

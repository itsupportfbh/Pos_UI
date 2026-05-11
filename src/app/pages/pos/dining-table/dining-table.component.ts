import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, QueryList, ViewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { SharedTableCellTemplateDirective, SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { SelectFieldComponent, SelectFieldValue } from '../../../components/form/select-field.component';
import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { ImageUploadFieldComponent } from '../../../components/form/image-upload-field.component';
import { AppToastService } from '../../../services/app-toast.service';
import { BranchService } from '../../../services/branch.service';
import { FloorService } from '../../../services/floor.service';
import { DiningTableService } from '../../../services/diningtable.service';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { ConfirmDialogModule } from 'primeng/confirmdialog';


type DiningTableRow = {
  id: number;
  code: string;
  name: string;
  seatingSize: number;
  branchId: number;
  floorId: number;
  image?: string;
  remarks: string;
  displayOrder: number;
  orgId: number;
  isActive: boolean;
  createdBy: number | null;
  createdDate?: string;
  updatedBy: number | null;
  updatedDate?: string;
  isDeleted?: boolean;
};

const DINING_TABLE_COLUMNS: SharedTableColumn<DiningTableRow>[] = [
  { field: 'code', header: 'Code', sortable: true, width: '8rem' },
  { field: 'name', header: 'Name', sortable: true, width: '12rem' },
  { field: 'seatingsize', header: 'Capacity', type: 'number', sortable: true, width: '8rem' },
  { field: 'branchname', header: 'Branch', sortable: true, width: '10rem' },
  { field: 'floorname', header: 'Floor', sortable: true, width: '10rem' },
  { field: 'available', header: 'Available', width: '10rem' },
  { field: 'reservable', header: 'Reservable', width: '10rem' },
  { field: 'remarks', header: 'Notes', width: '15rem' },
  {
    field: 'Status',
    header: 'Status',
    sortable: true,
    width: '9rem'
  }
];

@Component({
  selector: 'app-dining-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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

export class DiningTableComponent {
  private readonly toast = inject(AppToastService);
  private readonly branchService = inject(BranchService);
  private readonly floorService = inject(FloorService);
  private readonly diningTableService = inject(DiningTableService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly confirmationService = inject(ConfirmationService);

  readonly pageEyebrow = 'Dining';
  readonly pageTitle = 'Dining Tables';
  readonly pageSubtitle = 'Manage dining table status and occupancy.';
  readonly tableCaption = 'Dining tables overview';
  dialogTitle = 'Create Dining Table';
  dialogSubtitle = 'Create a new dining table.';
  dialogPrimaryActionLabel = 'Save';
  tableColumns = DINING_TABLE_COLUMNS;
  readonly rowActionHeader = 'Actions';
  readonly showRowActions = true;

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  @ViewChildren(SelectFieldComponent) private readonly selectFields?: QueryList<SelectFieldComponent>;

  // Dialog state
  showAddDialog = false;
  dialogCode = '';
  dialogName = '';
  dialogSeatingSize = 1;
  dialogBranchId: SelectFieldValue | null = null;
  dialogFloorId: SelectFieldValue | null = null;
  dialogImage = '';
  dialogImageFile: File | null = null;
  dialogImagePreviewUrl: string | null = null;
  dialogRemarks = '';
  dialogDisplayOrder = 0;
  dialogIsActive = true;
  dialogcreatedBy = 0;
  allDiningTables: DiningTableRow[] = [];
  tableRows: DiningTableRow[] = [];
  selectedRow: DiningTableRow | null = null;
  isLoading = false;
  branchOptions: any[] = [];
  floorOptions: any[] = [];
  userDetails: any = {};
  dialogSubmitted = false;
  OrgId = 0;
  BranchId = 0;
  isEditMode = false;
  editingdiningtable: number | null = null;

  rowActionItems: MenuItem[] = [
    { label: 'Edit', icon: 'pi pi-pencil', styleClass: 'row-action-edit', command: () => this.handleRowAction('edit') },
    { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') },
    { label: 'Active', icon: 'pi pi-check-circle', styleClass: 'row-action-active', command: () => this.handleRowAction('activate') },
    { label: 'Inactive', icon: 'pi pi-ban', styleClass: 'row-action-inactive', command: () => this.handleRowAction('deactivate') }
  ];


  ngOnInit(): void {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    this.dialogcreatedBy = Number(this.userDetails.UserId || 0);
    this.OrgId = Number(this.userDetails.OrgId || 0);
    console.log('User Details:', this.OrgId);
    this.BranchId = Number(this.userDetails.IsAdmin || 0) === 1 ? 0 : Number(this.userDetails.BranchId);
    this.tableColumns = DINING_TABLE_COLUMNS.map((x: any) => {
      if (x.field === 'organizationname') {
        x.hidden = this.userDetails.RoleId !== 1;
      }
      return x;
    });
    this.loadDiningTables();
    this.loadBranches();
    this.loadFloors();
  }

  loadBranches() {
    this.branchService.getAll(this.OrgId).subscribe((res: any) => {
      this.branchOptions = (res.result || []).map((item: any) => ({
        label: item.Name,
        value: item.Id
      }));
    });
  }

  loadFloors() {
    this.floorService.getAll(this.OrgId, this.BranchId).subscribe((res: any) => {
      this.floorOptions = (res.result || []).map((item: any) => ({
        label: item.Name,
        value: item.Id
      }));
    });
  }

  loadDiningTables(): void {
    this.isLoading = true;

    this.OrgId = Number(this.userDetails.RoleId || 0) === 1 ? 0 : Number(this.userDetails.OrgId);
    this.BranchId = Number(this.userDetails.IsAdmin || 0) === 1 ? 0 : Number(this.userDetails.BranchId);

    this.diningTableService.getAll(this.OrgId).subscribe({
      next: (response: any) => {
        const result = response?.result ?? response ?? [];
        let RowNumber = 1;
        this.allDiningTables = (response.result ?? []).map((x: any) => {
          x.RowNumber = RowNumber++;
          x.Status = x.isactive ? 'Active' : 'Inactive';
          return x;
        });
        this.tableRows = [...this.allDiningTables];
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.toast.error(
          'Load Failed',
          'Unable to load dining tables. Please check API and try again.'
        );
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  refreshTables(): void {
    this.tableRows = [...this.tableRows];
  }

  openAddDialog(): void {
    this.isEditMode = false;
    this.editingdiningtable = null;
    this.resetDialogForm();
    this.showAddDialog = true;
    this.dialogTitle = 'Create Dining Table';
    this.dialogSubtitle = 'Create a new dining table.';
    this.dialogPrimaryActionLabel = 'Save';
  }

  closeAddDialog(): void {
    this.resetDialogForm();
    this.loadDiningTables();
    this.isEditMode = false;
    this.showAddDialog = false;
    this.dialogSubmitted = false;
  }

  submitAddDialog(): void {
    this.dialogSubmitted = true;

    if (!this.isDialogFormValid()) {
      return;
    }

    const imageValue = this.dialogImageFile
      ? this.dialogImagePreviewUrl
      : this.dialogImage?.startsWith('data:') || this.dialogImage?.startsWith('http://') || this.dialogImage?.startsWith('https://')
        ? this.dialogImage
        : this.getImageFileName(this.dialogImage ?? '');

    this.createOrUpdateTable(imageValue ?? '');
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

    // Look for the image in the local project upload folder using the stored filename.
    return `/FileUpload/${encodeURIComponent(fileName)}`;
  }

  private getImageFileName(image: string): string {
    if (!image) {
      return '';
    }

    const parts = image.split(/[\\\/]/);
    return parts[parts.length - 1] ?? '';
  }

  private createOrUpdateTable(imageData: string): void {
    // Create new table
    const payload: DiningTableRow = {
      id: 0,
      code: this.dialogCode,
      name: this.dialogName,
      seatingSize: this.dialogSeatingSize,
      branchId: Number(this.dialogBranchId),
      floorId: Number(this.dialogFloorId),
      image: imageData ?? '',
      remarks: this.dialogRemarks,
      displayOrder: this.dialogDisplayOrder,
      orgId: Number(this.userDetails.OrgId),
      createdBy: this.dialogcreatedBy,
      updatedBy: this.dialogcreatedBy,
      isActive: this.dialogIsActive ?? true,
      isDeleted: false
    };

    console.log('Submitting dining table:', payload);

    if (this.isEditMode && this.editingdiningtable) {
      payload.id = this.editingdiningtable;

      this.diningTableService.update(payload).subscribe({
        next: (response: any) => {
          if (response === 'AlreadyExists' || response?.message === 'AlreadyExists') {
            this.toast.warn('Duplicate', 'Dining table already exists.');
            return;
          }

          this.toast.success('Updated', 'Dining table updated successfully.');
          this.closeAddDialog();
          this.loadDiningTables();
        },
        error: () => {
          this.toast.error('Update Failed', 'Unable to update dining table.');
        }
      });

      return;
    }

    this.diningTableService.create(payload).subscribe({
      next: (response: any) => {
        if (response === 'AlreadyExists' || response?.message === 'AlreadyExists') {
          this.toast.warn('Duplicate', 'Dining table already exists.');
          return;
        }

        this.toast.success('Saved', 'Dining table saved successfully.');
        this.closeAddDialog();
        this.loadDiningTables();
      },
      error: () => {
        this.toast.error('Save Failed', 'Unable to save dining table.');
      }
    });
  }

  editRow(row: DiningTableRow): void {
    this.isEditMode = true;
    this.editingdiningtable = row.id;
    this.dialogTitle = 'Edit Dining Table';
    this.dialogSubtitle = 'Update the selected Dining Table details.';
    this.dialogPrimaryActionLabel = 'Update';
    debugger;
    this.diningTableService.getById(row.id).subscribe({
      next: (response: any) => {
        const category = response?.result?.[0] ?? response?.result ?? response;
        const imageValue = category?.image ?? category?.Image ?? row.image ?? '';

        this.dialogCode = category?.code ?? category?.Code ?? row.code,
          this.dialogName = category?.name ?? category?.Name ?? row.name,
          this.dialogSeatingSize = category?.seatingSize ?? category?.seatingsize ?? row.seatingSize,
          this.dialogIsActive = category?.isActive ?? category?.IsActive ?? row.isActive,
          this.dialogImage = imageValue,
          this.dialogImagePreviewUrl = this.getImagePreviewUrl(imageValue),
          this.dialogBranchId = category?.branchId ?? category?.BranchId ?? row.branchId,
          this.dialogFloorId = category?.floorId ?? category?.FloorId ?? row.floorId,
          this.dialogRemarks = category?.remarks ?? category?.Remarks ?? row.remarks,
          this.dialogDisplayOrder = category?.displayOrder ?? category?.DisplayOrder ?? row.displayOrder,


          this.showAddDialog = true;
        //this.toast.info('Edit Mode', `Editing ${row.name}.`);
      },
      error: () => {
        this.toast.error('Load Failed', 'Unable to load dining table details.');
      }
    });
  }

  onSeatingChange(value: string): void {
    const numericValue = parseInt(value, 10);
    this.dialogSeatingSize = isNaN(numericValue) ? 1 : numericValue;
  }

  onDisplayOrderChange(value: string): void {
    const numericValue = parseInt(value, 10);
    this.dialogDisplayOrder = isNaN(numericValue) ? 0 : numericValue;
  }

  confirmDeleteRow(row: DiningTableRow): void {
    const name = row.name ?? row.code ?? 'this Dining Table';

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

  deleteRow(row: DiningTableRow): void {
    this.diningTableService.delete(row.id).subscribe({
      next: () => {
        this.toast.warn('Deleted', `${row.name} removed successfully.`);
        this.loadDiningTables();
      },
      error: () => {
        this.toast.error('Delete Failed', 'Unable to delete dining table.');
      }
    });
  }

  confirmActivateRow(row: DiningTableRow): void {
    const name = row.name ?? row.code ?? 'this Dining Table';

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

  confirmDeactivateRow(row: DiningTableRow): void {
    const name = row.name ?? row.code ?? 'this dining table';

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

  activateRow(row: DiningTableRow): void {
    this.diningTableService.activeInActive(row.id, true).subscribe({
      next: () => {
        this.toast.success('Status Updated', `${row.name} marked as active.`);
        this.loadDiningTables();
      },
      error: () => {
        this.toast.error('Update Failed', 'Unable to activate dining table.');
      }
    });
  }

  deactivateRow(row: DiningTableRow): void {
    this.diningTableService.activeInActive(row.id, false).subscribe({
      next: () => {
        this.toast.info('Status Updated', `${row.name} marked as inactive.`);
        this.loadDiningTables();
      },
      error: () => {
        this.toast.error('Update Failed', 'Unable to deactivate dining table.');
      }
    });
  }

  openRowActions(menu: any, event: Event, row: DiningTableRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  private getRowActionItems(row: Record<string, unknown>): MenuItem[] {
    debugger;
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

  private isDialogFormValid(): boolean {
    const areTextFieldsValid = this.textFields?.toArray().every((field) => field.isValid) ?? true;
    const areSelectFieldsValid = this.selectFields?.toArray().every((field) => field.isValid) ?? true;

    return areTextFieldsValid && areSelectFieldsValid;
  }

  private handleRowAction(action: 'edit' | 'delete' | 'activate' | 'deactivate'): void {
    if (!this.selectedRow) {
      return;
    }
    console.log(`Action: ${action}, Row:`, this.selectedRow);
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
    this.dialogCode = '';
    this.dialogName = '';
    this.dialogSeatingSize = 1;
    this.dialogBranchId = null;
    this.dialogFloorId = null;
    this.dialogImage = '';
    this.dialogImageFile = null;
    this.dialogImagePreviewUrl = null;
    this.dialogRemarks = '';
    this.dialogDisplayOrder = 0;
  }
}

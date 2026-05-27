import { CommonModule } from '@angular/common';
import { Component, QueryList, ViewChildren, inject } from '@angular/core';
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

type DualDisplayRow = {
  Id: number;
  ScreenCode: string;
  ScreenName: string;
  CounterName: string;
  ThemeName: string;
  WelcomeText: string;
  IsActive: boolean;
  Status: string;
  RowNumber: number;
};

const DUAL_DISPLAY_COLUMNS: SharedTableColumn<DualDisplayRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'ScreenCode', header: 'Screen Code', sortable: true, width: '10rem' },
  { field: 'ScreenName', header: 'Screen Name', sortable: true, width: '14rem' },
  { field: 'CounterName', header: 'Counter', sortable: true, width: '12rem' },
  { field: 'ThemeName', header: 'Theme', sortable: true, width: '10rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '8rem' }
];

@Component({
  selector: 'app-dual-display',
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
  templateUrl: './dual-display.component.html',
  styleUrl: './dual-display.component.css'
})
export class DualDisplayComponent {
  
  
  private readonly toast = inject(AppToastService);
  
  
  private readonly confirmationService = inject(ConfirmationService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  selectedRow: DualDisplayRow | null = null;
  rowActionItems: MenuItem[] = [];
  allRows: DualDisplayRow[] = [];
  tableRows: DualDisplayRow[] = [];

  filterSearchText = '';

  dialogId = 0;
  dialogScreenCode = '';
  dialogScreenName = '';
  dialogCounterName = '';
  dialogThemeName = '';
  dialogWelcomeText = '';

  totalScreens = 0;
  activeScreens = 0;
  previewScreenName = 'Dual Display Screen';
  previewCounterName = 'Counter A';
  previewThemeName = 'Split View';
  previewWelcomeText = 'Operator and guest view are synchronized';

  readonly pageEyebrow = 'Displays';
  readonly pageTitle = 'Dual Display';
  readonly pageSubtitle = 'Configure paired operator and guest displays for smoother checkout.';
  readonly filterTitle = this.pageTitle + ' Filters';
  readonly primaryActionLabel = 'Search ' + this.pageTitle;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Dual Display';
  dialogSubtitle = 'Capture the paired operator and guest display details for checkout.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Dual Display Profiles';
  readonly tableCaption = 'Dual Display Profiles';
  tableColumns = DUAL_DISPLAY_COLUMNS;
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = 'Add Dual Display';
  readonly showFilterButton = true;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';

  ngOnInit(): void {
    this.loadRows();
  }

  loadRows(): void {
    this.allRows = [];
    this.tableRows = [];
    this.updateSummary();
    this.updatePreview();
  }

  searchRows(): void {
    const searchText = this.filterSearchText.trim().toLowerCase();

    if (!searchText) {
      this.tableRows = [...this.allRows];
      return;
    }

    this.tableRows = this.allRows.filter((row) =>
      row.ScreenCode.toLowerCase().includes(searchText) ||
      row.ScreenName.toLowerCase().includes(searchText) ||
      row.CounterName.toLowerCase().includes(searchText) ||
      row.ThemeName.toLowerCase().includes(searchText) ||
      row.WelcomeText.toLowerCase().includes(searchText)
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
    this.dialogTitle = 'Create Dual Display';
    this.dialogSubtitle = 'Capture the paired operator and guest display details for checkout.';
    this.dialogPrimaryActionLabel = 'Save';
    this.showAddDialog = true;
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

    if (this.isEditMode && this.dialogId) {
      this.allRows = this.allRows.map((row) => {
        if (row.Id === this.dialogId) {
          row.ScreenCode = this.dialogScreenCode;
          row.ScreenName = this.dialogScreenName;
          row.CounterName = this.dialogCounterName;
          row.ThemeName = this.dialogThemeName;
          row.WelcomeText = this.dialogWelcomeText;
        }

        return row;
      });

      this.toast.success('Updated', this.pageTitle + ' updated successfully.');
    } else {
      this.allRows.unshift({
        Id: Date.now(),
        ScreenCode: this.dialogScreenCode,
        ScreenName: this.dialogScreenName,
        CounterName: this.dialogCounterName,
        ThemeName: this.dialogThemeName,
        WelcomeText: this.dialogWelcomeText,
        IsActive: true,
        Status: 'Active',
        RowNumber: 0
      });

      this.toast.success('Saved', this.pageTitle + ' saved successfully.');
    }

    this.refreshRows();
    this.closeAddDialog();
  }

  editRow(row: DualDisplayRow): void {
    this.isEditMode = true;
    this.dialogId = row.Id;
    this.dialogScreenCode = row.ScreenCode;
    this.dialogScreenName = row.ScreenName;
    this.dialogCounterName = row.CounterName;
    this.dialogThemeName = row.ThemeName;
    this.dialogWelcomeText = row.WelcomeText;
    this.dialogTitle = 'Edit Dual Display';
    this.dialogSubtitle = 'Update the selected dual display setup.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;
  }

  deleteRow(row: DualDisplayRow): void {
    this.allRows = this.allRows.filter((item) => item.Id !== row.Id);
    this.refreshRows();
    this.toast.success('Deleted', row.ScreenName + ' deleted successfully.');
  }

  activateRow(row: DualDisplayRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = true;
        item.Status = 'Active';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Activated', row.ScreenName + ' activated successfully.');
  }

  deactivateRow(row: DualDisplayRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = false;
        item.Status = 'Inactive';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Deactivated', row.ScreenName + ' deactivated successfully.');
  }

  openRowActions(menu: any, event: Event, row: DualDisplayRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: DualDisplayRow): void {
    this.confirmationService.confirm({
      header: 'Delete Confirmation',
      message: 'Are you sure you want to delete ' + row.ScreenName + '?',
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

  confirmActivateRow(row: DualDisplayRow): void {
    this.confirmationService.confirm({
      header: 'Activate Confirmation',
      message: 'Are you sure you want to activate ' + row.ScreenName + '?',
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

  confirmDeactivateRow(row: DualDisplayRow): void {
    this.confirmationService.confirm({
      header: 'Deactivate Confirmation',
      message: 'Are you sure you want to deactivate ' + row.ScreenName + '?',
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
    this.dialogScreenCode = '';
    this.dialogScreenName = '';
    this.dialogCounterName = '';
    this.dialogThemeName = '';
    this.dialogWelcomeText = '';
  }

  private refreshRows(): void {
    this.allRows = this.allRows.map((row, index) => {
      row.RowNumber = index + 1;
      row.Status = row.IsActive ? 'Active' : 'Inactive';
      return row;
    });

    this.searchRows();
    this.updateSummary();
    this.updatePreview();
  }

  private updateSummary(): void {
    this.totalScreens = this.allRows.length;
    this.activeScreens = this.allRows.filter((row) => row.IsActive).length;
  }

  private updatePreview(): void {
    const activeRow = this.allRows.find((row) => row.IsActive) ?? null;

    this.previewScreenName = activeRow?.ScreenName ?? 'Dual Display Screen';
    this.previewCounterName = activeRow?.CounterName ?? 'Counter A';
    this.previewThemeName = activeRow?.ThemeName ?? 'Split View';
    this.previewWelcomeText = activeRow?.WelcomeText ?? 'Operator and guest view are synchronized';
  }

  private isDialogFormValid(): boolean {
    return this.textFields?.toArray().every((field) => field.isValid) ?? true;
  }

  private getRowActionItems(row: DualDisplayRow): MenuItem[] {
    const items: MenuItem[] = [
      { label: 'Delete', icon: 'pi pi-trash', styleClass: 'row-action-delete', command: () => this.handleRowAction('delete') }
    ];

    if (row.IsActive) {
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


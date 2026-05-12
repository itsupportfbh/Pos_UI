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

type DisplayMenuItemsRow = {
  Id: number;
  ScreenCode: string;
  ScreenName: string;
  StationName: string;
  ThemeName: string;
  KitchenMessage: string;
  IsActive: boolean;
  Status: string;
  RowNumber: number;
};

const DISPLAY_MENU_ITEMS_COLUMNS: SharedTableColumn<DisplayMenuItemsRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'ScreenCode', header: 'Screen Code', sortable: true, width: '10rem' },
  { field: 'ScreenName', header: 'Screen Name', sortable: true, width: '14rem' },
  { field: 'StationName', header: 'Station', sortable: true, width: '12rem' },
  { field: 'ThemeName', header: 'Theme', sortable: true, width: '10rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '8rem' }
];

@Component({
  selector: 'app-display-menu-items',
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
  templateUrl: './display-menu-items.component.html',
  styleUrl: './display-menu-items.component.css'
})
export class DisplayMenuItemsComponent {
  private readonly toast = inject(AppToastService);
  private readonly confirmationService = inject(ConfirmationService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  selectedRow: DisplayMenuItemsRow | null = null;
  rowActionItems: MenuItem[] = [];
  allRows: DisplayMenuItemsRow[] = [];
  tableRows: DisplayMenuItemsRow[] = [];

  filterSearchText = '';

  dialogId = 0;
  dialogScreenCode = '';
  dialogScreenName = '';
  dialogStationName = '';
  dialogThemeName = '';
  dialogKitchenMessage = '';

  totalScreens = 0;
  activeScreens = 0;
  previewScreenName = 'Kitchen Expo Board';
  previewStationName = 'Hot Kitchen';
  previewThemeName = 'Production Mode';
  previewKitchenMessage = '2 tickets waiting for preparation';

  readonly pageEyebrow = 'Displays';
  readonly pageTitle = 'Kitchen Display';
  readonly pageSubtitle = 'Control kitchen-facing menu item visibility and service flow settings.';
  readonly filterTitle = this.pageTitle + ' Filters';
  readonly primaryActionLabel = 'Search ' + this.pageTitle;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Kitchen Display';
  dialogSubtitle = 'Capture kitchen display details for prep flow and station visibility.';
  dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Kitchen Display Profiles';
  readonly tableCaption = 'Kitchen Display Profiles';
  tableColumns = DISPLAY_MENU_ITEMS_COLUMNS;
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = 'Add Kitchen Screen';
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
      row.StationName.toLowerCase().includes(searchText) ||
      row.ThemeName.toLowerCase().includes(searchText) ||
      row.KitchenMessage.toLowerCase().includes(searchText)
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
    this.dialogTitle = 'Create Kitchen Display';
    this.dialogSubtitle = 'Capture kitchen display details for prep flow and station visibility.';
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
          row.StationName = this.dialogStationName;
          row.ThemeName = this.dialogThemeName;
          row.KitchenMessage = this.dialogKitchenMessage;
        }

        return row;
      });

      this.toast.success('Updated', this.pageTitle + ' updated successfully.');
    } else {
      this.allRows.unshift({
        Id: Date.now(),
        ScreenCode: this.dialogScreenCode,
        ScreenName: this.dialogScreenName,
        StationName: this.dialogStationName,
        ThemeName: this.dialogThemeName,
        KitchenMessage: this.dialogKitchenMessage,
        IsActive: true,
        Status: 'Active',
        RowNumber: 0
      });

      this.toast.success('Saved', this.pageTitle + ' saved successfully.');
    }

    this.refreshRows();
    this.closeAddDialog();
  }

  editRow(row: DisplayMenuItemsRow): void {
    this.isEditMode = true;
    this.dialogId = row.Id;
    this.dialogScreenCode = row.ScreenCode;
    this.dialogScreenName = row.ScreenName;
    this.dialogStationName = row.StationName;
    this.dialogThemeName = row.ThemeName;
    this.dialogKitchenMessage = row.KitchenMessage;
    this.dialogTitle = 'Edit Kitchen Display';
    this.dialogSubtitle = 'Update the selected kitchen display setup.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;
  }

  deleteRow(row: DisplayMenuItemsRow): void {
    this.allRows = this.allRows.filter((item) => item.Id !== row.Id);
    this.refreshRows();
    this.toast.success('Deleted', row.ScreenName + ' deleted successfully.');
  }

  activateRow(row: DisplayMenuItemsRow): void {
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

  deactivateRow(row: DisplayMenuItemsRow): void {
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

  openRowActions(menu: any, event: Event, row: DisplayMenuItemsRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }

  confirmDeleteRow(row: DisplayMenuItemsRow): void {
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

  confirmActivateRow(row: DisplayMenuItemsRow): void {
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

  confirmDeactivateRow(row: DisplayMenuItemsRow): void {
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
    this.dialogStationName = '';
    this.dialogThemeName = '';
    this.dialogKitchenMessage = '';
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

    this.previewScreenName = activeRow?.ScreenName ?? 'Kitchen Expo Board';
    this.previewStationName = activeRow?.StationName ?? 'Hot Kitchen';
    this.previewThemeName = activeRow?.ThemeName ?? 'Production Mode';
    this.previewKitchenMessage = activeRow?.KitchenMessage ?? '2 tickets waiting for preparation';
  }

  private isDialogFormValid(): boolean {
    return this.textFields?.toArray().every((field) => field.isValid) ?? true;
  }

  private getRowActionItems(row: DisplayMenuItemsRow): MenuItem[] {
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


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
  OperatorLabel: string;
  GuestLabel: string;
  LayoutName: string;
  Resolution: string;
  LastHeartbeat: string;
  QueueHint: string;
};

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
    MenuModule
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
  inactiveScreens = 0;
  uniqueCounters = 0;
  previewScreenName = 'Dual Display Screen';
  previewCounterName = 'Counter A';
  previewThemeName = 'Split View';
  previewWelcomeText = 'Operator and guest view are synchronized';
  previewOperatorLabel = 'Operator Console';
  previewGuestLabel = 'Customer Display';
  previewLayoutName = 'Mirrored Checkout';
  previewResolution = '1920 x 1080';
  previewQueueHint = 'Ready to greet the next guest';
  selectedPreviewId = 0;

  readonly pageEyebrow = 'Displays';
  readonly pageTitle = 'Dual Display';
  readonly pageSubtitle = 'Design the paired billing counter screen and customer-facing display experience used during checkout.';
  readonly filterTitle = this.pageTitle + ' Filters';
  readonly primaryActionLabel = 'Search ' + this.pageTitle;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Dual Display';
  dialogSubtitle = 'Capture the paired operator and customer display details for checkout.';
  dialogPrimaryActionLabel = 'Save';
  readonly pairingStudioTitle = 'Pairing Studio';
  readonly pairingStudioSubtitle = 'Mock profiles below show how each billing counter can be paired with its own guest-facing screen, theme, and greeting message.';
  readonly addNewButtonLabel = 'Add Display Pairing';

  ngOnInit(): void {
    this.loadRows();
  }

  loadRows(): void {
    this.allRows = [
      {
        Id: 101,
        ScreenCode: 'DD-CTR-01',
        ScreenName: 'Front Counter Welcome Display',
        CounterName: 'Counter A',
        ThemeName: 'Rose Glass',
        WelcomeText: 'Welcome back. Your live bill and queue updates appear here.',
        IsActive: true,
        Status: 'Active',
        RowNumber: 1,
        OperatorLabel: 'Cashier Tablet',
        GuestLabel: '32" Guest Screen',
        LayoutName: 'Mirrored Checkout',
        Resolution: '1920 x 1080',
        LastHeartbeat: 'Synced 8 sec ago',
        QueueHint: 'Main dine-in queue'
      },
      {
        Id: 102,
        ScreenCode: 'DD-CTR-02',
        ScreenName: 'Takeaway Pickup Display',
        CounterName: 'Counter B',
        ThemeName: 'Amber Express',
        WelcomeText: 'Pickup guests can review order totals, offers, and ready-call status.',
        IsActive: true,
        Status: 'Active',
        RowNumber: 2,
        OperatorLabel: 'Billing Desktop',
        GuestLabel: '24" Pickup Panel',
        LayoutName: 'Split Queue View',
        Resolution: '1920 x 1080',
        LastHeartbeat: 'Synced 21 sec ago',
        QueueHint: 'Takeaway and courier handoff'
      },
      {
        Id: 103,
        ScreenCode: 'DD-CTR-03',
        ScreenName: 'Family Dining Queue Board',
        CounterName: 'Counter C',
        ThemeName: 'Evening Luxe',
        WelcomeText: 'Guests see token progress, table updates, and payment confirmation here.',
        IsActive: true,
        Status: 'Active',
        RowNumber: 3,
        OperatorLabel: 'POS Touch Screen',
        GuestLabel: '55" Queue Board',
        LayoutName: 'Queue First Layout',
        Resolution: '3840 x 2160',
        LastHeartbeat: 'Synced 1 min ago',
        QueueHint: 'Family dining queue'
      },
      {
        Id: 104,
        ScreenCode: 'DD-CTR-04',
        ScreenName: 'Dessert Counter Preview',
        CounterName: 'Dessert Bay',
        ThemeName: 'Pastel Glow',
        WelcomeText: 'Temporarily offline while the dessert counter screen is being repositioned.',
        IsActive: false,
        Status: 'Inactive',
        RowNumber: 4,
        OperatorLabel: 'Mini POS',
        GuestLabel: '21" Counter Display',
        LayoutName: 'Compact Counter View',
        Resolution: '1366 x 768',
        LastHeartbeat: 'Last seen 18 min ago',
        QueueHint: 'Dessert handoff station'
      }
    ];

    this.tableRows = [...this.allRows];
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
    this.dialogSubtitle = 'Create a new operator-and-guest screen pairing profile for a billing counter.';
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
          row.OperatorLabel = this.buildOperatorLabel(this.dialogCounterName);
          row.GuestLabel = this.buildGuestLabel(this.dialogThemeName);
          row.LayoutName = this.buildLayoutName(this.dialogThemeName);
          row.QueueHint = this.buildQueueHint(this.dialogCounterName);
          row.LastHeartbeat = 'Updated just now';
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
        RowNumber: 0,
        OperatorLabel: this.buildOperatorLabel(this.dialogCounterName),
        GuestLabel: this.buildGuestLabel(this.dialogThemeName),
        LayoutName: this.buildLayoutName(this.dialogThemeName),
        Resolution: '1920 x 1080',
        LastHeartbeat: 'Created just now',
        QueueHint: this.buildQueueHint(this.dialogCounterName)
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
    this.dialogSubtitle = 'Update the selected operator and customer display pairing.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;
    this.selectedPreviewId = row.Id;
    this.updatePreview();
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
    this.inactiveScreens = this.totalScreens - this.activeScreens;
    this.uniqueCounters = new Set(this.allRows.map((row) => row.CounterName)).size;
  }

  private updatePreview(): void {
    const activeRow =
      this.allRows.find((row) => row.Id === this.selectedPreviewId) ??
      this.allRows.find((row) => row.IsActive) ??
      null;

    this.previewScreenName = activeRow?.ScreenName ?? 'Dual Display Screen';
    this.previewCounterName = activeRow?.CounterName ?? 'Counter A';
    this.previewThemeName = activeRow?.ThemeName ?? 'Split View';
    this.previewWelcomeText = activeRow?.WelcomeText ?? 'Operator and guest view are synchronized';
    this.previewOperatorLabel = activeRow?.OperatorLabel ?? 'Operator Console';
    this.previewGuestLabel = activeRow?.GuestLabel ?? 'Customer Display';
    this.previewLayoutName = activeRow?.LayoutName ?? 'Mirrored Checkout';
    this.previewResolution = activeRow?.Resolution ?? '1920 x 1080';
    this.previewQueueHint = activeRow?.QueueHint ?? 'Ready to greet the next guest';
    this.selectedPreviewId = activeRow?.Id ?? 0;
  }

  private isDialogFormValid(): boolean {
    return this.textFields?.toArray().every((field) => field.isValid) ?? true;
  }

  private getRowActionItems(row: DualDisplayRow): MenuItem[] {
    const items: MenuItem[] = [
      { label: 'Preview', icon: 'pi pi-desktop', styleClass: 'row-action-preview', command: () => this.handleRowAction('preview') },
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

  previewRow(row: DualDisplayRow): void {
    this.selectedPreviewId = row.Id;
    this.updatePreview();
  }

  private handleRowAction(action: 'edit' | 'delete' | 'activate' | 'deactivate' | 'preview'): void {
    if (!this.selectedRow) {
      return;
    }

    if (action === 'preview') {
      this.previewRow(this.selectedRow);
    } else if (action === 'edit') {
      this.editRow(this.selectedRow);
    } else if (action === 'delete') {
      this.confirmDeleteRow(this.selectedRow);
    } else if (action === 'activate') {
      this.confirmActivateRow(this.selectedRow);
    } else {
      this.confirmDeactivateRow(this.selectedRow);
    }
  }

  private buildOperatorLabel(counterName: string): string {
    const normalized = counterName.trim().toLowerCase();

    if (normalized.includes('counter')) {
      return 'Cashier Touch POS';
    }

    if (normalized.includes('dessert')) {
      return 'Mini POS';
    }

    return 'Operator Console';
  }

  private buildGuestLabel(themeName: string): string {
    const normalized = themeName.trim().toLowerCase();

    if (normalized.includes('queue')) {
      return '55" Queue Board';
    }

    if (normalized.includes('compact')) {
      return '21" Counter Display';
    }

    return '32" Guest Screen';
  }

  private buildLayoutName(themeName: string): string {
    const normalized = themeName.trim().toLowerCase();

    if (normalized.includes('amber')) {
      return 'Split Queue View';
    }

    if (normalized.includes('pastel')) {
      return 'Compact Counter View';
    }

    return 'Mirrored Checkout';
  }

  private buildQueueHint(counterName: string): string {
    const normalized = counterName.trim().toLowerCase();

    if (normalized.includes('dessert')) {
      return 'Dessert handoff station';
    }

    if (normalized.includes('b')) {
      return 'Takeaway and courier handoff';
    }

    if (normalized.includes('c')) {
      return 'Family dining queue';
    }

    return 'Main dine-in queue';
  }
}


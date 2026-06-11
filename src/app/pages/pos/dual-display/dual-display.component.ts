import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, QueryList, ViewChildren, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MenuItem, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';

import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { SelectFieldComponent, SelectFieldValue } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { AppToastService } from '../../../services/app-toast.service';
import { CommonService } from '../../../services/common.service';
import { CounterService } from '../../../services/counter.service';
import { DualDisplay, DualDisplayService } from '../../../services/dual-display.service';

type DualDisplayRow = {
  Id: number;
  ScreenCode: string;
  ScreenName: string;
  BranchId: number;
  BranchName: string;
  CounterId: number;
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
    SelectFieldComponent,
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
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly dualDisplayService = inject(DualDisplayService);
  private readonly commonService = inject(CommonService);
  private readonly counterService = inject(CounterService);
  private readonly router = inject(Router);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  @ViewChildren(SelectFieldComponent) private readonly selectFields?: QueryList<SelectFieldComponent>;

  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  dialogSaving = false;
  pageLoading = false;
  selectedRow: DualDisplayRow | null = null;
  rowActionItems: MenuItem[] = [];
  allRows: DualDisplayRow[] = [];
  tableRows: DualDisplayRow[] = [];
  userDetails: any = {};

  filterSearchText = '';

  dialogId = 0;
  dialogScreenCode = '';
  dialogScreenName = '';
  dialogBranchId: SelectFieldValue = null;
  dialogCounterId: SelectFieldValue = null;
  dialogThemeName = '';
  dialogWelcomeText = '';

  branchOptions: any[] = [];
  counterOptions: any[] = [];

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
  isPreviewSpotlightActive = false;

  readonly pageEyebrow = 'Displays';
  readonly pageTitle = 'Dual Display';
  readonly pageSubtitle = 'Create one pairing profile per billing counter so the live customer-facing screen automatically follows the correct branch, counter, message, and theme.';
  readonly filterTitle = this.pageTitle + ' Filters';
  readonly primaryActionLabel = 'Search ' + this.pageTitle;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Dual Display';
  dialogSubtitle = 'Capture the paired operator and customer display details for checkout.';
  dialogPrimaryActionLabel = 'Save';
  readonly pairingStudioTitle = 'Pairing Studio';
  readonly pairingStudioSubtitle = 'Each active profile is selected at runtime by Org, Branch, and Billing Counter. Open any saved profile below to test the real customer display output.';
  readonly addNewButtonLabel = 'Add Display Pairing';

  async ngOnInit(): Promise<void> {
    this.pageLoading = true;
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');

    try {
      await this.loadBranchOptions();
      await this.loadRows();
    } catch {
      this.pageLoading = false;
      this.changeDetector.detectChanges();
    }
  }

  async loadRows(): Promise<void> {
    try {
      const orgId = Number(this.userDetails?.OrgId || 0);
      const response: any = await firstValueFrom(this.dualDisplayService.getAll(orgId));
      let rowNumber = 1;

      this.allRows = (response?.result ?? []).map((item: any) => this.mapRow(item, rowNumber++));
      this.tableRows = [...this.allRows];
      this.updateSummary();
      this.updatePreview();
    } catch {
      this.allRows = [];
      this.tableRows = [];
      this.toast.error('Load Failed', 'Unable to load dual display profiles. Please check and try again.');
    } finally {
      this.pageLoading = false;
      this.changeDetector.detectChanges();
    }
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
      row.BranchName.toLowerCase().includes(searchText) ||
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

  async openAddDialog(): Promise<void> {
    this.resetDialogForm();
    this.isEditMode = false;
    this.dialogTitle = 'Create Dual Display';
    this.dialogSubtitle = 'Create a new operator-and-guest screen pairing profile for a billing counter.';
    this.dialogPrimaryActionLabel = 'Save';
    this.showAddDialog = true;

    if (this.branchOptions.length === 1) {
      this.dialogBranchId = this.branchOptions[0].value;
      await this.onDialogBranchChange(this.dialogBranchId);
    }
  }

  closeAddDialog(): void {
    this.resetDialogForm();
    this.isEditMode = false;
    this.dialogSubmitted = false;
    this.showAddDialog = false;
  }

  async submitAddDialog(): Promise<void> {
    this.dialogSubmitted = true;

    if (!this.isDialogFormValid()) {
      return;
    }

    this.dialogSaving = true;

    const payload: DualDisplay = {
      Id: this.dialogId,
      ProfileCode: this.dialogScreenCode.trim(),
      ProfileName: this.dialogScreenName.trim(),
      OrgId: Number(this.userDetails?.OrgId || 0),
      BranchId: Number(this.dialogBranchId || 0),
      CounterId: Number(this.dialogCounterId || 0),
      ThemeName: this.dialogThemeName.trim(),
      HeaderTitle: this.dialogScreenName.trim(),
      WelcomeMessage: this.dialogWelcomeText.trim(),
      IdleMessage: this.dialogWelcomeText.trim(),
      IsActive: true,
      IsDeleted: false,
      CreatedBy: Number(this.userDetails?.UserId || 0),
      UpdatedBy: Number(this.userDetails?.UserId || 0)
    };

    try {
      const response: any = !payload.Id
        ? await firstValueFrom(this.dualDisplayService.create(payload))
        : await firstValueFrom(this.dualDisplayService.update(payload));

      if (response?.ErrorInfo?.Message === true && response?.result === 'AlreadyExists') {
        this.toast.warn('Already Exists', 'Pairing code already exists. Please use a different code.');
        return;
      }

      if (response?.ErrorInfo?.Message === true && response?.result === 'CounterAlreadyMapped') {
        this.toast.warn('Counter Already Mapped', 'This branch and counter already has a dual display profile.');
        return;
      }

      if (response?.ErrorInfo?.Message === true) {
        this.toast.success(payload.Id ? 'Updated' : 'Saved', `Dual Display ${payload.Id ? 'updated' : 'saved'} successfully.`);
        await this.loadRows();
        this.closeAddDialog();
        return;
      }

      this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', 'Unable to save dual display profile.');
    } catch {
      this.toast.error(payload.Id ? 'Update Failed' : 'Save Failed', 'Unable to save dual display profile.');
    } finally {
      this.dialogSaving = false;
      this.changeDetector.detectChanges();
    }
  }

  async editRow(row: DualDisplayRow): Promise<void> {
    this.resetDialogForm();
    this.isEditMode = true;
    this.dialogTitle = 'Edit Dual Display';
    this.dialogSubtitle = 'Update the selected operator and customer display pairing.';
    this.dialogPrimaryActionLabel = 'Update';
    this.showAddDialog = true;

    try {
      const response: any = await firstValueFrom(this.dualDisplayService.getById(row.Id ?? 0));
      const profile = response?.result ?? {};

      this.dialogId = Number(profile.Id || 0);
      this.dialogScreenCode = profile.ProfileCode ?? '';
      this.dialogScreenName = profile.ProfileName ?? '';
      this.dialogBranchId = Number(profile.BranchId || 0) || null;
      await this.onDialogBranchChange(this.dialogBranchId);
      this.dialogCounterId = Number(profile.CounterId || 0) || null;
      this.dialogThemeName = profile.ThemeName ?? '';
      this.dialogWelcomeText = profile.WelcomeMessage ?? '';
      this.selectedPreviewId = this.dialogId;
      this.updatePreview();
      this.changeDetector.detectChanges();
    } catch {
      this.toast.error('Load Failed', 'Unable to load dual display profile details. Please check and try again.');
    }
  }

  async deleteRow(row: DualDisplayRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.dualDisplayService.delete(row.Id ?? 0));

      if (response?.ErrorInfo?.Message === true) {
        this.toast.success('Deleted', `${row.ScreenName} deleted successfully.`);
        await this.loadRows();
        return;
      }

      this.toast.error('Delete Failed', `Unable to delete ${row.ScreenName}. Please try again.`);
    } catch {
      this.toast.error('Delete Failed', `Unable to delete ${row.ScreenName}. Please try again.`);
    }
  }

  async activateRow(row: DualDisplayRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.dualDisplayService.activeInActive(row.Id ?? 0, true));

      if (response?.ErrorInfo?.Message === true) {
        this.toast.success('Activated', `${row.ScreenName} activated successfully.`);
        await this.loadRows();
        return;
      }

      this.toast.error('Activation Failed', `Unable to activate ${row.ScreenName}. Please try again.`);
    } catch {
      this.toast.error('Activation Failed', `Unable to activate ${row.ScreenName}. Please try again.`);
    }
  }

  async deactivateRow(row: DualDisplayRow): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.dualDisplayService.activeInActive(row.Id ?? 0, false));

      if (response?.ErrorInfo?.Message === true) {
        this.toast.success('Deactivated', `${row.ScreenName} deactivated successfully.`);
        await this.loadRows();
        return;
      }

      this.toast.error('Deactivation Failed', `Unable to deactivate ${row.ScreenName}. Please try again.`);
    } catch {
      this.toast.error('Deactivation Failed', `Unable to deactivate ${row.ScreenName}. Please try again.`);
    }
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

  async onDialogBranchChange(value: SelectFieldValue): Promise<void> {
    this.dialogBranchId = value;
    this.dialogCounterId = null;
    this.counterOptions = [];

    if (!value || Number(value) === 0) {
      this.changeDetector.detectChanges();
      return;
    }

    await this.loadCounterOptions(Number(value));
  }

  resetDialogForm(): void {
    this.dialogSubmitted = false;
    this.dialogSaving = false;
    this.dialogId = 0;
    this.dialogScreenCode = '';
    this.dialogScreenName = '';
    this.dialogBranchId = null;
    this.dialogCounterId = null;
    this.dialogThemeName = '';
    this.dialogWelcomeText = '';
    this.counterOptions = [];
  }

  private async loadBranchOptions(): Promise<void> {
    try {
      const userId = Number(this.userDetails?.UserId || 0);
      const response: any = await firstValueFrom(this.commonService.GetBranchByUserId(userId));
      const rows = response?.result ?? [];

      this.branchOptions = rows
        .filter((item: any) => item.IsActive !== false)
        .map((item: any) => ({
          label: item.BranchName ?? item.Name ?? '',
          value: item.BranchId ?? item.Id ?? 0
        }));
    } catch {
      this.branchOptions = [];
      this.toast.error('Load Failed', 'Unable to load branches. Please check and try again.');
    }
  }

  private async loadCounterOptions(branchId: number): Promise<void> {
    try {
      const orgId = Number(this.userDetails?.OrgId || 0);
      const response: any = await firstValueFrom(this.counterService.getAll(orgId, branchId));
      const rows = response?.result ?? [];

      this.counterOptions = rows
        .filter((item: any) => item.IsActive == true)
        .map((item: any) => ({
          label: item.Name ?? '',
          value: item.Id ?? 0
        }));
      this.changeDetector.detectChanges();
    } catch {
      this.counterOptions = [];
      this.toast.error('Load Failed', 'Unable to load counters. Please check and try again.');
    }
  }

  private mapRow(item: any, rowNumber: number): DualDisplayRow {
    const counterName = String(item.CounterName ?? '');
    const themeName = String(item.ThemeName ?? '');

    return {
      Id: Number(item.Id || 0),
      ScreenCode: String(item.ProfileCode ?? ''),
      ScreenName: String(item.ProfileName ?? ''),
      BranchId: Number(item.BranchId || 0),
      BranchName: String(item.BranchName ?? ''),
      CounterId: Number(item.CounterId || 0),
      CounterName: counterName,
      ThemeName: themeName,
      WelcomeText: String(item.WelcomeMessage ?? ''),
      IsActive: item.IsActive === true,
      Status: item.IsActive === true ? 'Active' : 'Inactive',
      RowNumber: rowNumber,
      OperatorLabel: this.buildOperatorLabel(counterName),
      GuestLabel: this.buildGuestLabel(themeName),
      LayoutName: this.buildLayoutName(themeName),
      Resolution: '1920 x 1080',
      LastHeartbeat: item.IsActive === true ? 'Live profile' : 'Inactive profile',
      QueueHint: this.buildQueueHint(counterName)
    };
  }

  private updateSummary(): void {
    this.totalScreens = this.allRows.length;
    this.activeScreens = this.allRows.filter((row) => row.IsActive).length;
    this.inactiveScreens = this.totalScreens - this.activeScreens;
    this.uniqueCounters = new Set(this.allRows.map((row) => `${row.BranchId}-${row.CounterId}`)).size;
  }

  private updatePreview(): void {
    const activeRow =
      this.allRows.find((row) => row.Id === this.selectedPreviewId) ??
      this.allRows.find((row) => row.IsActive) ??
      this.allRows[0] ??
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
    const areTextFieldsValid = this.textFields?.toArray().every((field) => field.isValid) ?? true;
    const areSelectFieldsValid = this.selectFields?.toArray().every((field) => field.isValid) ?? true;

    return areTextFieldsValid && areSelectFieldsValid;
  }

  private getRowActionItems(row: DualDisplayRow): MenuItem[] {
    const items: MenuItem[] = [
      { label: 'Preview', icon: 'pi pi-desktop', styleClass: 'row-action-preview', command: () => this.handleRowAction('preview') },
      { label: 'Open Customer Screen', icon: 'pi pi-external-link', styleClass: 'row-action-open', command: () => this.handleRowAction('open') },
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
    this.isPreviewSpotlightActive = true;
    this.toast.info('Preview Updated', `${row.ScreenName} is now shown in the live preview.`);

    setTimeout(() => {
      document.querySelector('.display-preview-card')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });

    setTimeout(() => {
      this.isPreviewSpotlightActive = false;
    }, 1400);
  }

  getSelectedBranchLabel(): string {
    return String(this.branchOptions.find((item: any) => item.value === this.dialogBranchId)?.label ?? 'Branch');
  }

  getSelectedCounterLabel(): string {
    return String(this.counterOptions.find((item: any) => item.value === this.dialogCounterId)?.label ?? 'Billing counter');
  }

  openCustomerDisplay(row?: DualDisplayRow, openTvMode = false): void {
    const selectedRow =
      row ??
      this.allRows.find((item) => item.Id === this.selectedPreviewId) ??
      this.allRows.find((item) => item.IsActive) ??
      null;

    if (!selectedRow) {
      this.toast.warn('Profile Required', 'Choose a dual display profile first.');
      return;
    }

    const orgId = Number(this.userDetails?.OrgId || 0);
    const urlTree = this.router.createUrlTree(['/pos/customer-display'], {
      queryParams: {
        orgId,
        branchId: selectedRow.BranchId,
        counterId: selectedRow.CounterId,
        profileId: selectedRow.Id,
        branchName: selectedRow.BranchName,
        counterName: selectedRow.CounterName,
        headerTitle: selectedRow.ScreenName,
        tv: openTvMode ? 1 : 0
      }
    });

    const runtimeUrl = `${window.location.origin}${this.router.serializeUrl(urlTree)}`;
    window.open(runtimeUrl, '_blank', 'noopener');
  }

  private handleRowAction(action: 'edit' | 'delete' | 'activate' | 'deactivate' | 'preview' | 'open'): void {
    if (!this.selectedRow) {
      return;
    }

    if (action === 'preview') {
      this.previewRow(this.selectedRow);
    } else if (action === 'open') {
      this.openCustomerDisplay(this.selectedRow, false);
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

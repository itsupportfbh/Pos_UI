import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { AutocompleteFieldComponent } from '../../../components/form/autocomplete-field.component';
import { DateFieldComponent } from '../../../components/form/date-field.component';
import { SelectFieldComponent } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';
import { AppToastService } from '../../../services/app-toast.service';
import { EntityMasterService } from '../../../services/entitymaster.service';

const STOCK_LOCATION_OPTIONS: { label: string | number; value: string | number }[] = [];
const MOVEMENT_TYPE_OPTIONS: { label: string | number; value: string | number }[] = [];
const CODE_NAME_COLUMNS: SharedTableColumn<Record<string, unknown>>[] = [
  { field: 'code', header: 'Code', sortable: true, width: '10rem' },
  { field: 'name', header: 'Name', sortable: true, width: '18rem' },
  { field: 'status', header: 'Status', type: 'tag' as const, sortable: true, width: '9rem', tagSeverityMap: { Active: 'success', Draft: 'info', Low: 'warn', Out: 'danger', Printed: 'success', Posted: 'success', Pending: 'warn', Partial: 'warn', Open: 'info', Critical: 'danger', Sent: 'success', Review: 'contrast' } }
];

@Component({
  selector: 'app-stock-in',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, DialogModule, TextFieldComponent, SelectFieldComponent, AutocompleteFieldComponent, DateFieldComponent, ActionButtonsComponent, SharedTableComponent],
  templateUrl: './stock-in.component.html',
  styleUrl: './stock-in.component.css'
})
export class StockInComponent {
  private readonly toast = inject(AppToastService);
  private readonly entityMasterService = inject(EntityMasterService);
  readonly formState: Record<string, string | Date | null> = {};
  readonly dialogFormState: Record<string, string | Date | null> = {};
  showAddDialog = false;
  showFilterSidebar = false;
  userDetails: any = {};
  stockInEntityNo = Number(sessionStorage.getItem('currentMenuEntityNo') || 0);
  stockInRights = {
    View: true,
    Create: false,
    Edit: false,
    Delete: false,
    ActiveInActive: false,
    Print: false,
    Download: true
  };
  readonly pageEyebrow = 'Inventory';
  readonly pageTitle = 'Stock In';
  readonly pageSubtitle = 'Record inward stock entries.';
  readonly itemSuggestions: string[] = [];
  readonly stockLocationOptions = STOCK_LOCATION_OPTIONS;
  readonly movementTypeOptions = MOVEMENT_TYPE_OPTIONS;  
  readonly filterTitle = `${'Stock In'} Filters`;
  readonly filterDescription = `API data will be loaded for ${'Stock In'.toLowerCase()}.`;
  readonly fields: any[] = [{ key: 'itemName', label: 'Item', type: 'autocomplete', placeholder: 'Search item', suggestions: ['Arabica Coffee 250g'] }, { key: 'location', label: 'Location', type: 'select', placeholder: 'Choose location', options: STOCK_LOCATION_OPTIONS }, { key: 'movementType', label: 'Type', type: 'select', placeholder: 'Choose type', options: MOVEMENT_TYPE_OPTIONS }];
  readonly primaryActionLabel = `Search ${'Stock In'}`;
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  readonly dialogTitle = '';
  readonly dialogSubtitle = '';
  readonly dialogFields: any[] = [];
  readonly dialogPrimaryActionLabel = 'Save';
  readonly tableTitle = 'Stock In';
  readonly tableCaption = 'Stock In';
  readonly tableColumns = CODE_NAME_COLUMNS;
  tableRows: Record<string, unknown>[] = [];
  showAddNewButton = false;
  readonly addNewButtonLabel = this.showAddNewButton ? 'Add New' : '';
  readonly showFilterButton = true;
  showDownloadButton = true;

  async ngOnInit(): Promise<void> {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails') ?? '{}');
    await this.loadStockInRights();
  }

  async loadStockInRights(): Promise<void> {
    try {
      const orgId = Number(this.userDetails?.OrganizationId || this.userDetails?.OrgId || 0);
      const roleId = Number(this.userDetails?.RoleId || 0);
      const entityNo = Number(this.stockInEntityNo || 0);
      const response: any = await firstValueFrom(this.entityMasterService.GetRoleRightsByRoleId(orgId, roleId, entityNo));
      const rights = response?.result?.[0] ?? {};

      this.stockInRights = {
        View: rights.View,
        Create: rights.Create,
        Edit: rights.Edit,
        Delete: rights.Delete,
        ActiveInActive: rights.ActiveInActive,
        Print: rights.Print,
        Download: rights.Download
      };

      this.showAddNewButton = false;
      this.showDownloadButton = this.stockInRights.Download;
    } catch {
      this.stockInRights = {
        View: true,
        Create: false,
        Edit: false,
        Delete: false,
        ActiveInActive: false,
        Print: false,
        Download: false
      };
      this.showAddNewButton = false;
      this.showDownloadButton = false;
      this.toast.error('Rights Load Failed', 'Unable to load stock in role rights. Please check and try again.');
    }
  }

  getFieldValue(fieldKey: string): string | Date | null {
    return this.formState[fieldKey] ?? null;
  }

  setFieldValue(fieldKey: string, value: string | Date | null): void {
    this.formState[fieldKey] = value;
  }

    get filterItemName(): string | null {
    const value = this.getFieldValue('itemName');
    return typeof value === 'string' ? value : null;
  }
  set filterItemName(value: string | null) {
    this.setFieldValue('itemName', value);
  }
  get filterLocation(): string | null {
    const value = this.getFieldValue('location');
    return typeof value === 'string' ? value : null;
  }
  set filterLocation(value: string | null) {
    this.setFieldValue('location', value);
  }
  get filterMovementType(): string | null {
    const value = this.getFieldValue('movementType');
    return typeof value === 'string' ? value : null;
  }
  set filterMovementType(value: string | null) {
    this.setFieldValue('movementType', value);
  }getDialogFieldValue(fieldKey: string): string | Date | null {
    return this.dialogFormState[fieldKey] ?? null;
  }

  setDialogFieldValue(fieldKey: string, value: string | Date | null): void {
    this.dialogFormState[fieldKey] = value;
  }

  resetForm(): void {
    this.resetState(this.formState, this.fields);
  }

  openFilterSidebar(): void {
    this.resetForm();
    this.showFilterSidebar = true;
  }

  closeFilterSidebar(): void {
    this.showFilterSidebar = false;
  }
  openAddDialog(): void {
    if (!this.showAddNewButton) {
      return;
    }

    this.resetState(this.dialogFormState, this.dialogFields);
    this.showAddDialog = true;
  }

  closeAddDialog(): void {
    this.showAddDialog = false;
  }

  submitAddDialog(): void {
    this.closeAddDialog();
  }

  trackByField(_: number, field: any): string {
    return field.key;
  }

  private resetState(state: Record<string, string | Date | null>, fields: any[]): void {
    for (const key of Object.keys(state)) {
      delete state[key];
    }

    for (const field of fields) {
      state[field.key] = null;
    }
  }
}














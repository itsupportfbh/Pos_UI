import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, QueryList, ViewChildren, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MenuItem, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { MultiSelectFieldComponent, MultiSelectFieldValue } from '../../../components/form/multiselect-field.component';
import { ActionButtonsComponent } from '../../../components/form/action-buttons.component';
import { SelectFieldComponent, SelectFieldValue } from '../../../components/form/select-field.component';
import { TextFieldComponent } from '../../../components/form/text-field.component';
import { AppToastService } from '../../../services/app-toast.service';
import { SharedTableCellTemplateDirective, SharedTableColumn, SharedTableComponent } from '../../../components/table/shared-table.component';
import { employee, EmployeeService } from '../../../services/employeemasters.service';
import { FormsModule } from '@angular/forms';
import{ BranchService } from '../../../services/branch.service';
import { TableExportService } from '../../../services/table-export.service';


type EmployeeRegistrationRow = {

  BranchId: number | null;

  DesignationId: number | null;

  DepartmentId: number | null;

  designationId: 0;

  departmentId: 0;

  branchId: 0;

  IdProofNo: string;    

  Id: number;

  Code: string;

  Name: string;

  Designation: string;

  Department: string;

  BranchName: string;

  MobileNo: string;

  EmailId: string;

  AddressLine1: string;

  Remarks: string;

  IsActive: boolean;

  Status: string;

  RowNumber: number;

  Gender?: string;
};

const EMPLOYEEREGISTRATION_COLUMNS: SharedTableColumn<EmployeeRegistrationRow>[] = [
  { field: 'RowNumber', header: '#', sortable: true, width: '4rem' },
  { field: 'Code', header: 'Code', sortable: true, width: '10rem' },
  { field: 'Name', header: 'Name', sortable: true, width: '18rem' },
  { field: 'Designation', header: 'Designation', sortable: true, width: '8rem' },
  { field: 'Department', header: 'Department', sortable: true, width: '8rem' },
  { field: 'BranchName', header: 'BranchName', sortable: true, width: '8rem' },
  { field: 'EmailId', header: 'EmailID', sortable: true, width: '8rem' },
  { field: 'MobileNo', header: 'MobileNo', sortable: true, width: '8rem' },
  { field: 'Status', header: 'Status', sortable: true, width: '8rem' }
  
  
];

@Component({
  selector: 'app-employee-registration',
  standalone: true,
 imports: [
  CommonModule,
  FormsModule,
  ConfirmDialogModule,
  ButtonModule,
  CardModule,
  DialogModule,
  TextFieldComponent,
  MultiSelectFieldComponent,
  SelectFieldComponent,
  ActionButtonsComponent,
  MenuModule,
  SharedTableComponent,
  SharedTableCellTemplateDirective,
],
  providers: [ConfirmationService],
  templateUrl: './employee-registration.component.html',
  styleUrl: './employee-registration.component.css'
})
export class EmployeeRegistrationComponent {
  private readonly toast = inject(AppToastService);
  private readonly confirmationService = inject(ConfirmationService);

  @ViewChildren(TextFieldComponent) private readonly textFields?: QueryList<TextFieldComponent>;
  @ViewChildren(SelectFieldComponent) private readonly selectFields?: QueryList<SelectFieldComponent>;
  private readonly employeeService = inject(EmployeeService);
  private readonly branchService = inject(BranchService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly tableExportService = inject(TableExportService);
  showAddDialog = false;
  showFilterSidebar = false;
  isEditMode = false;
  dialogSubmitted = false;
  selectedRow: EmployeeRegistrationRow | null = null;
  rowActionItems: MenuItem[] = [];
  allRows: EmployeeRegistrationRow[] = [];
  tableRows: EmployeeRegistrationRow[] = [];
  

  filterSearchText = '';
  dialogId = 0;
  dialogCode = '';
  dialogName = '';
  filterEmployee: MultiSelectFieldValue = [];

dialogDepartment: number | null = 0;

dialogDesignation: number | null = 0;

dialogBranch: number | null = 0;

dialogPhone: string = '';

dialogEmail: string = '';

dialogAddress: string = '';

dialogStatus: boolean = true;

dialogRemarks: string = '';

dialogGender: string = '';


  
  readonly pageEyebrow = 'POS';
  readonly pageTitle = 'Employee Registration';
  readonly pageSubtitle = 'Manage employee registration records here.';
  readonly filterTitle = 'Employee Filters';
  readonly primaryActionLabel = 'Search';
  readonly secondaryActionLabel = 'Clear Filters';
  readonly showSecondaryAction = true;
  dialogTitle = 'Create Employee Registration';
  dialogSubtitle = 'Create a new employee registration record.';
  dialogPrimaryActionLabel = 'Save';  
  readonly tableTitle = 'Employee Registration';
  readonly tableCaption = 'Employee Registration';
  tableColumns = EMPLOYEEREGISTRATION_COLUMNS;
  readonly showAddNewButton = true;
  readonly addNewButtonLabel = 'Add New';
  readonly showDownloadButton = true;
  showFilterButton: boolean = true;
  readonly showRowActions = true;
  readonly rowActionHeader = 'Actions';
  isLoading=false;
  downloadLoading = false;
  downloadLoadingLabel = 'Exporting...';
  userDetails: any = {};
  isBranchSelectionLocked=false;
  CodeOptions: any[] = [];
  selectAll: any;
  model: never[] | undefined;
  modelChange: any;
  options: any;
  DepartmentOptions: any;
  branchOptions: any[] = [];
  dialoggender: any;
  dialogIdProofNo: any;



  ngOnInit(): void {
    //debugger
     this.userDetails = JSON.parse(
    localStorage.getItem('userDetails') ?? '{}'
  );

  this.showFilterButton = true;

  this.loadRows();

  this.loadEmployee();

  this.loadBranches();;
   
    
  }
  loadRows(): void {
    this.allRows = [];
    this.tableRows = [];
  }
  loadEmployee(): void {
    this.changeDetector.detectChanges();

  const orgId = Number(this.userDetails?.OrgId || 0);

  const branchId = Number(this.userDetails?.BranchId || 0);

  this.employeeService
    .getAll(orgId, branchId)
    .subscribe({

      next: (response: any) => {

        const data = response.result || [];

        this.allRows = data.map((item: any) => {

  const department =
    this.departmentOptions.find(
      (x: any) => x.value == item.DepartmentId
    )?.label || '';

  const designation =
    this.designationOptions.find(
      (x: any) => x.value == item.DesignationId
    )?.label || '';

  return {

    ...item,

    Department: department,

    Designation: designation

  };

});

this.refreshRows();

// FIX
this.changeDetector.detectChanges();

      },

      error: (err: any) => {

        console.error(err);

      }

    });

}

  async exportEmployeesAsExcel(): Promise<void> {
    this.downloadLoading = true;
    this.downloadLoadingLabel = 'Excel exporting...';

    try {
      const orgId = Number(this.userDetails?.OrgId || 0);
      const branchId = Number(this.userDetails?.BranchId || 0);
      const response: any = await firstValueFrom(this.employeeService.getAll(orgId, branchId));
      let rowNumber = 1;
      let exportRows = (response.result ?? []).map((item: any) => {
        const department = this.departmentOptions.find((x: any) => x.value == item.DepartmentId)?.label || '';
        const designation = this.designationOptions.find((x: any) => x.value == item.DesignationId)?.label || '';
        return {
          ...item,
          Department: department,
          Designation: designation,
          RowNumber: rowNumber++,
          Status: (item.IsActive ?? item.isActive ?? item.isactive) ? 'Active' : 'Inactive'
        };
      });
      const orgName = String(this.userDetails.OrgName || 'OrgName').trim();
      const fileName = `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-Employee-Registration`;

      if (this.filterEmployee.length) {
        exportRows = exportRows.filter((row: any) =>
          this.filterEmployee.includes(`${row.Department}-${row.BranchName}`)
        );
      }

      if (!exportRows.length) {
        this.toast.warn('No Records', 'No employees are available to export.');
        return;
      }

      await this.tableExportService.exportExcel(fileName, this.tableColumns, exportRows, 'Employee Registration');
      this.toast.success('Export Ready', 'Employee Excel export downloaded successfully.');
    } catch {
      this.toast.error('Export Failed', 'Unable to export employees to Excel.');
    } finally {
      this.downloadLoading = false;
      this.downloadLoadingLabel = 'Exporting...';
    }
  }

  async exportEmployeesAsPdf(): Promise<void> {
    this.downloadLoading = true;
    this.downloadLoadingLabel = 'PDF exporting...';

    try {
      const orgId = Number(this.userDetails?.OrgId || 0);
      const branchId = Number(this.userDetails?.BranchId || 0);
      const response: any = await firstValueFrom(this.employeeService.getAll(orgId, branchId));
      let rowNumber = 1;
      let exportRows = (response.result ?? []).map((item: any) => {
        const department = this.departmentOptions.find((x: any) => x.value == item.DepartmentId)?.label || '';
        const designation = this.designationOptions.find((x: any) => x.value == item.DesignationId)?.label || '';
        return {
          ...item,
          Department: department,
          Designation: designation,
          RowNumber: rowNumber++,
          Status: (item.IsActive ?? item.isActive ?? item.isactive) ? 'Active' : 'Inactive'
        };
      });
      const orgName = String(this.userDetails.OrgName || 'OrgName').trim();
      const fileName = `${orgName.replace(/[\\/:*?"<>|]/g, '-')}-Employee-Registration`;

      if (this.filterEmployee.length) {
        exportRows = exportRows.filter((row: any) =>
          this.filterEmployee.includes(`${row.Department}-${row.BranchName}`)
        );
      }

      if (!exportRows.length) {
        this.toast.warn('No Records', 'No employees are available to export.');
        return;
      }

      await this.tableExportService.exportPdf(fileName, 'Employee Registration', this.tableColumns, exportRows);
      this.toast.success('Export Ready', 'Employee PDF export downloaded successfully.');
    } catch {
      this.toast.error('Export Failed', 'Unable to export employees to PDF.');
    } finally {
      this.downloadLoading = false;
      this.downloadLoadingLabel = 'Exporting...';
    }
  }

  genderOptions = [
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Other', value: 'Other' }
];


  loadBranches(): void {

  const orgId = Number(this.userDetails?.OrgId || 0);

  console.log('ORG ID =>', orgId);

  this.branchService.getAll(orgId)
    .subscribe({

      next: (response: any) => {

        console.log('API RESPONSE =>', response);

        this.branchOptions = response.result.map(
          (branch: any) => {

            return {

              label: branch.Name,

              value: branch.Id

            };

          }
        );

        console.log(
          'BRANCH DROPDOWN =>',
          this.branchOptions
        );

      },

      error: (error: any) => {

        console.error(error);

      }

    });

}

  departmentOptions = [
  { label: 'Admin', value: 1 },
  { label: 'Development', value: 2 },
  { label: 'HR', value: 3 },
  { label: 'Testing', value: 4 }
];

designationOptions = [
  { label: 'Manager', value: 1 },
  { label: 'Supervisor', value: 2 },
  { label: 'Staff', value: 3 },
  { label: 'Admin', value: 4 }
];

  searchRows(): void {
    const searchText = this.filterSearchText.trim().toLowerCase();

    if (!searchText) {
      this.tableRows = [...this.allRows];
      return;
    }

    this.tableRows = this.allRows.filter((row) =>
      row.Code.toLowerCase().includes(searchText) ||
      row.Name.toLowerCase().includes(searchText) ||
      row.Designation.toLowerCase().includes(searchText)
    );
  }

  resetForm(): void {
  this.filterEmployee = [];
  this.tableRows = [...this.allRows];
}

  openFilterSidebar(): void {
    this.resetForm();
    if (!this.CodeOptions.length) {
      this.loadcode();
    }
    this.showFilterSidebar = true;
  }
loadcode(): void {

  const uniqueOptions = new Map();

  this.allRows.forEach((employee: any) => {

    const label =
      `${employee.Department} - ${employee.BranchName}`;

    const value =
      `${employee.Department}-${employee.BranchName}`;

    // DUPLICATE REMOVE
    if (!uniqueOptions.has(value)) {

      uniqueOptions.set(value, {
        label: label,
        value: value
      });

    }

  });

  this.CodeOptions = Array.from(
    uniqueOptions.values()
  );

}
applyFilters(): void {

  if (!this.filterEmployee.length) {
    this.tableRows = [...this.allRows];
    return;
  }

  this.tableRows = this.allRows.filter((row) =>
    this.filterEmployee.includes(
      `${row.Department}-${row.BranchName}`
    )
  );

}

  closeFilterSidebar(): void {
    this.showFilterSidebar = false;
  }

 openAddDialog(): void {

  this.resetDialogForm(true);

  this.isEditMode = false;

  this.dialogTitle = 'Create Employee Registration';

  this.dialogSubtitle =
    'Create a new employee registration record.';

  this.dialogPrimaryActionLabel = 'Save';

  this.dialogStatus = true;

  this.dialogDepartment = null;

  this.dialogDesignation = null;

  this.dialogBranch = null;

  this.dialogPhone = '';

  this.dialogEmail = '';

  this.dialogAddress = '';

  this.showAddDialog = true; // IMPORTANT

  this.dialogRemarks = '';

  this.dialogGender = '';

  this.dialogIdProofNo = '';

  
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

const code = this.dialogCode.trim();
const name = this.dialogName.trim();
const existingEmployee = this.allRows.find((row) =>
  row.Id !== this.dialogId &&
  String(row.Code ?? '').trim().toLowerCase() === code.toLowerCase()
);

if (existingEmployee) {
  this.toast.warn(
    'Already Exists',
    `Employee code ${code} already exists. Please use a different code.`
  );
  return;
}

const payload: employee = {

  Id: this.dialogId || 0,

  Code: code,

  Name: name,

  DepartmentId: Number(this.dialogDepartment),

  DesignationId: Number(this.dialogDesignation),

  BranchId: Number(this.dialogBranch),

  MobileNo: this.dialogPhone,

  EmailId: this.dialogEmail,

  AddressLine1: this.dialogAddress,

  Gender: this.dialogGender,

  Remarks: this.dialogRemarks,

  IdProofNo: this.dialogIdProofNo || '',

  IsActive: this.dialogStatus,

  OrgId: Number(this.userDetails?.OrgId || 0)

};


  // UPDATE
  if (this.isEditMode && this.dialogId) {

    this.employeeService.update(payload)
      .subscribe({

        next: (response: any) => {

          if (this.isAlreadyExistsResponse(response)) {
            this.toast.warn(
              'Already Exists',
              'Employee code or name already exists. Please use different details.'
            );
            return;
          }

          if (!this.isSuccessResponse(response)) {
            this.toast.error(
              'Update Failed',
              this.getResponseMessage(response) || 'Unable to update employee.'
            );
            return;
          }

          this.toast.success(
            'Updated',
            'Employee updated successfully.'
          );
const orgId = Number(this.userDetails?.OrgId || 0);
    const BranchId = Number(this.userDetails?.BranchId || 0);
          this.loadEmployee();

          this.closeAddDialog();

        },

        error: (err: any) => {

          console.error(err);

          this.toast.error(
            'Update Failed',
            err?.error?.message || 'Unable to update employee.'
          );

        }

      });

  }

  // CREATE
  else {

    this.employeeService.create(payload)
      .subscribe({

        next: (response: any) => {

          if (this.isAlreadyExistsResponse(response)) {
            this.toast.warn(
              'Already Exists',
              'Employee code or name already exists. Please use different details.'
            );
            return;
          }

          if (!this.isSuccessResponse(response)) {
            this.toast.error(
              'Save Failed',
              this.getResponseMessage(response) || 'Unable to save employee.'
            );
            return;
          }

          this.toast.success(
            'Saved',
            'Employee saved successfully.'
          );
 const orgId = Number(this.userDetails?.OrgId || 0);
    const BranchId = Number(this.userDetails?.BranchId || 0);
         this.loadEmployee();

          this.closeAddDialog();

        },

        error: (err: any) => {

          console.error(err);

          this.toast.error(
            'Save Failed',
            err?.error?.message || 'Unable to save employee.'
          );

        }

      });

  }

}
  // dialogdesignation(dialogdesignation: any) {
  //   throw new Error('Method not implemented.');
  // }
  // dialogdepartment(dialogdepartment: any) {
  //   throw new Error('Method not implemented.');
  // }

editRow(row: EmployeeRegistrationRow): void {

  this.isEditMode = true;

  this.dialogId = row.Id;

  this.dialogCode = row.Code;

  this.dialogName = row.Name;

  // IMPORTANT
  this.dialogDepartment = row.DepartmentId;

  this.dialogDesignation = row.DesignationId;

  this.dialogBranch = row.BranchId;

  this.dialogPhone = row.MobileNo;

  this.dialogEmail = row.EmailId;

  this.dialogAddress = row.AddressLine1;

  this.dialogRemarks = row.Remarks;

  this.dialogIdProofNo = row.IdProofNo;

  this.dialogStatus = row.IsActive;

  this.dialogTitle = 'Edit ' + this.pageTitle;

  this.dialogSubtitle =
    'Update the selected ' +
    this.pageTitle.toLowerCase() +
    ' record.';

  this.dialogPrimaryActionLabel = 'Update';

  this.showAddDialog = true;
 
  this.dialogRemarks = row.Remarks;
  this.dialogGender = row.Gender || '';
  this.dialogIdProofNo = row.IdProofNo || '';
}
  deleteRow(row: EmployeeRegistrationRow): void {
    this.allRows = this.allRows.filter((item) => item.Id !== row.Id);
    this.refreshRows();
    this.toast.success('Deleted', row.Name + ' deleted successfully.');
  }

  activateRow(row: EmployeeRegistrationRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = true;
        item.Status = 'Active';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Activated', row.Name + ' activated successfully.');
  }

  deactivateRow(row: EmployeeRegistrationRow): void {
    this.allRows = this.allRows.map((item) => {
      if (item.Id === row.Id) {
        item.IsActive = false;
        item.Status = 'InActive';
      }

      return item;
    });

    this.refreshRows();
    this.toast.success('Deactivated', row.Name + ' deactivated successfully.');
  }

  openRowActions(menu: any, event: Event, row: EmployeeRegistrationRow): void {
    this.selectedRow = row;
    this.rowActionItems = this.getRowActionItems(row);
    menu.toggle(event);
  }
  toggleAll(): void {

  if (this.selectAll) {

    this.model = this.options.map((x: any) => x.value);

  } else {

    this.model = [];

  }

  this.modelChange.emit(this.model);

}

  confirmDeleteRow(row: EmployeeRegistrationRow): void {
    this.confirmationService.confirm({
      header: 'Delete Confirmation',
      message: 'Are you sure you want to delete ' + row.Name + '?',
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

  confirmActivateRow(row: EmployeeRegistrationRow): void {
    this.confirmationService.confirm({
      header: 'Activate Confirmation',
      message: 'Are you sure you want to activate ' + row.Name + '?',
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

  confirmDeactivateRow(row: EmployeeRegistrationRow): void {
    this.confirmationService.confirm({
      header: 'Deactivate Confirmation',
      message: 'Are you sure you want to deactivate ' + row.Name + '?',
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

resetDialogForm(clearSubmitted: boolean = false): void {

  this.dialogId = 0;

  this.dialogCode = '';

  this.dialogName = '';

  this.dialogDepartment = null;

  this.dialogDesignation = null;

  this.dialogBranch = null;

  this.dialogPhone = '';

  this.dialogEmail = '';

  this.dialogAddress = '';

  this.dialogStatus = true;

  this.dialogGender = '';

  this.dialogRemarks = '';
  
  this.dialogIdProofNo = '';

  this.dialogStatus = true;

  if (clearSubmitted) {
    this.dialogSubmitted = false;
  }
}
  private refreshRows(): void {
    this.allRows = this.allRows.map((row, index) => {
      row.RowNumber = index + 1;
      row.Status = row.IsActive ? 'Active' : 'Inactive';
      return row;
    });

    this.applyFilters();
  }

  private isDialogFormValid(): boolean {
    const textFieldsValid = this.textFields?.toArray().every((field) => field.isValid) ?? true;
    const selectFieldsValid = this.selectFields?.toArray().every((field) => field.isValid) ?? true;

    return textFieldsValid && selectFieldsValid;
  }

  private isAlreadyExistsResponse(response: any): boolean {
    return response === 'AlreadyExists' ||
      response?.result === 'AlreadyExists' ||
      response?.message === 'AlreadyExists' ||
      response?.ErrorInfo?.Message === 'AlreadyExists';
  }

  private isSuccessResponse(response: any): boolean {
    return response == null ||
      response?.ErrorInfo?.Message === true ||
      response?.message === true ||
      response === true ||
      response?.success === true;
  }

  private getResponseMessage(response: any): string {
    return typeof response?.ErrorInfo?.Message === 'string'
      ? response.ErrorInfo.Message
      : response?.message ?? '';
  }

  private getRowActionItems(row: EmployeeRegistrationRow): MenuItem[] {
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

// function resetDialogForm(clearSubmitted: any, arg1: boolean) {
//   throw new Error('Function not implemented.');
// }

// function editRow(row: any, EmployeeRegistrationRow: any) {
//   throw new Error('Function not implemented.');
// }

// function confirmDeactivateRow(row: any, EmployeeRegistrationRow: any) {
//   throw new Error('Function not implemented.');
// }


import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { AppToastService } from '../../../../services/app-toast.service';
import { TextFieldComponent } from '../../../../components/form/text-field.component';
import { SelectFieldComponent, FieldOption } from '../../../../components/form/select-field.component';
import { ShiftAssignmentService, ShiftAssignment } from '../../../../services/shift-assignment.service';
import { TerminalService } from '../../../../services/terminal.service';

@Component({
  selector: 'app-shift-assignment',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, DialogModule, TextFieldComponent, SelectFieldComponent],
  templateUrl: './shift-assignment.component.html',
  styleUrl: './shift-assignment.component.css'
})
export class ShiftAssignmentComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Input() currentUser: any = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() shiftAssigned = new EventEmitter<ShiftAssignment>();

  private readonly toast = inject(AppToastService);
  private readonly shiftService = inject(ShiftAssignmentService);
  private readonly terminalService = inject(TerminalService);

  currentDateTime = new Date().toLocaleString();

  shifts: FieldOption[] = [
    { label: 'Morning Shift (6 AM - 2 PM)', value: 'morning' },
    { label: 'Afternoon Shift (2 PM - 10 PM)', value: 'afternoon' },
    { label: 'Night Shift (10 PM - 6 AM)', value: 'night' }
  ];

  terminals: FieldOption[] = [];
  users: FieldOption[] = [];

  userId = '';
  userName = '';
  deviceName = '';
  terminal = '';
  terminalId = '';
  selectedShift = '';
  submitted = false;
  branchId = 0;
  OrgId = 0;


  ngOnInit(): void {
    this.deviceName = this.getHostName();
    this.loadTerminals();
    this.loadUsers();
  }

  loadTerminals(): void {

    // this.terminalService.getAll(this.OrgId, this.branchId, 0).subscribe((res: any) => {
    //   this.terminals = (res.result || []).map((item: any) => ({
    //     label: item.name,
    //     value: item.id
    //   }));
    // });
    this.terminals = [
      { label: 'Terminal 1', value: 'T-1' },
      { label: 'Terminal 2', value: 'T-2' },
      { label: 'Terminal 3', value: 'T-3' }
    ];
  }

  loadUsers(): void {
    // TODO: Replace with API call to fetch users
    try {
      this.users = [
        { label: 'User 1', value: 'user-1' },
        { label: 'User 2', value: 'user-2' },
        { label: 'User 3', value: 'user-3' }
      ];

      this.bindCurrentUser();
    } catch {
      // User details not available
    }
  }

  private bindCurrentUser(): void {

    console.log('Current User:', this.currentUser);

    if (!this.currentUser) {
      return;
    }

    this.userId = this.currentUser.UserId?.toString() || '';
    this.userName = this.currentUser.UserName || this.currentUser.EmpName || '';
    this.branchId = this.currentUser.BranchId || 0;
    this.OrgId = this.currentUser.OrgId || 0;

    console.log('Mapped User:', {
      userId: this.userId,
      userName: this.userName,
      branchId: this.branchId,
      OrgId: this.OrgId
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentUser'] && this.currentUser) {
      this.bindCurrentUser();
    }

    if (changes['visible'] && this.visible) {
      this.currentDateTime = new Date().toLocaleString();
    }
  }

  submitShift(): void {
    this.submitted = true;

    // if (!this.selectedShift || !this.terminal || !this.userId) {
    //   this.toast.error('Validation Error', 'Please fill all required fields');
    //   return;
    // }

    const shiftAssignment: ShiftAssignment = {
      shiftId: this.selectedShift,
      shiftName: String(this.shifts.find(s => s.value === this.selectedShift)?.label || this.selectedShift),
      userId: this.userId,
      userName: this.userName || this.userId,
      terminal: this.terminal,
      terminalId: this.terminal,
      deviceName: this.deviceName,
      assignedAt: new Date(),
      isActive: true
    };

    this.shiftService.assignShift(shiftAssignment);
    this.shiftAssigned.emit(shiftAssignment);
    this.closeDialog();
  }

  resetForm(): void {
    this.submitted = false;
    this.selectedShift = '';
    this.terminal = '';
    // Keep user info and device name
  }

  private getHostName(): string {

    const win = window as any;

    // Electron EXE
    //alert('Getting hostname from Electron API');
    if (win.electronAPI?.getHostName) {
      console.log(win.electronAPI.getHostName());
      return win.electronAPI.getHostName();
    }

    // Web App
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;

      if (hostname) {
        return hostname;
      }
    }

    return 'Unknown Device';
  }

  private closeDialog(): void {
    // Dialog can only be closed after successful shift assignment
    this.visible = false;
    this.visibleChange.emit(false);
    this.resetForm();
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ShiftAssignment {
  shiftId: string;
  shiftName: string;
  userId: string;
  userName: string;
  terminal: string;
  terminalId: string;
  deviceName: string;
  assignedAt: Date;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ShiftAssignmentService {
  private readonly SHIFT_KEY = 'currentShiftAssignment';
  private shiftSubject = new BehaviorSubject<ShiftAssignment | null>(this.getStoredShift());
  public shift$ = this.shiftSubject.asObservable();

  constructor() {}

  getShiftAssignment(): ShiftAssignment | null {
    return this.shiftSubject.value;
  }

  isShiftAssigned(): boolean {
    const shift = this.shiftSubject.value;
    return !!shift && shift.isActive;
  }

  assignShift(shift: ShiftAssignment): void {
    const shiftWithTimestamp = {
      ...shift,
      assignedAt: new Date(),
      isActive: true
    };
    localStorage.setItem(this.SHIFT_KEY, JSON.stringify(shiftWithTimestamp));
    this.shiftSubject.next(shiftWithTimestamp);
  }

  clearShift(): void {
    localStorage.removeItem(this.SHIFT_KEY);
    this.shiftSubject.next(null);
  }

  private getStoredShift(): ShiftAssignment | null {
    try {
      const stored = localStorage.getItem(this.SHIFT_KEY);
      if (!stored) return null;
      
      const shift = JSON.parse(stored);
      shift.assignedAt = new Date(shift.assignedAt);
      return shift;
    } catch {
      return null;
    }
  }
}

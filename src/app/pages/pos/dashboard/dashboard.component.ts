import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';

type DashboardStat = { label: string; value: string; caption: string; trend?: string; tone?: 'good' | 'warn' | 'neutral'; icon: string };
type ServiceMode = { label: string; orders: number; sales: string; badge: string };
type ServiceHighlight = { label: string; value: string; detail: string };
type CategoryPulse = { name: string; share: string; orders: string; amount: string };
type TableStatus = { table: string; guests: string; server: string; elapsed: string; status: 'Occupied' | 'Ready To Bill' | 'Reserved' | 'Cleaning'; area: string };
type KitchenTicket = { kotNo: string; table: string; items: string; stage: 'Queued' | 'Cooking' | 'Plating' | 'Ready'; age: string; priority: 'Rush' | 'Normal' | 'Ready' };
type PaymentMode = { label: string; value: string; share: string; width: number };
type CounterSnapshot = { counter: string; cashier: string; bills: string; sales: string; status: string; mode: string };
type AlertItem = { title: string; detail: string; tone: 'warn' | 'info' | 'good'; tag: string };
type QuickAction = { title: string; subtitle: string; route: string; icon: string };
type ShiftTask = { time: string; title: string; detail: string; status: 'Done' | 'In Progress' | 'Pending' };

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, CardModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  readonly pageTitle = 'Restaurant dashboard';
  readonly pageSubtitle = 'Track floor activity, kitchen flow, billing pace, and shift health from one working screen.';

  readonly primaryActions: QuickAction[] = [
    { title: 'Open Billing', subtitle: 'Settle dine-in, takeaway, and delivery bills', route: '/pos/billing', icon: 'pi pi-wallet' },
    { title: 'Order Screen', subtitle: 'Capture new table orders and send to kitchen', route: '/pos/order-screen', icon: 'pi pi-shopping-cart' }
  ];

  readonly headlineStats: DashboardStat[] = [
    { label: 'Net Sales', value: 'Rs 1,48,620', caption: 'Current shift collection', trend: '+8.4% vs yesterday', tone: 'good', icon: 'pi pi-chart-line' },
    { label: 'Active Bills', value: '27', caption: 'Open dine-in and takeaway bills', trend: '9 ready to settle', tone: 'warn', icon: 'pi pi-wallet' },
    { label: 'Kitchen Queue', value: '14', caption: 'KOTs waiting across stations', trend: '3 delayed beyond 12 min', tone: 'warn', icon: 'pi pi-shopping-bag' },
    { label: 'Table Occupancy', value: '22 / 30', caption: 'Dining tables in use right now', trend: '73% live occupancy', tone: 'neutral', icon: 'pi pi-th-large' }
  ];

  readonly serviceModes: ServiceMode[] = [
    { label: 'Dine In', orders: 38, sales: 'Rs 74,280', badge: 'Main floor' },
    { label: 'Take Away', orders: 19, sales: 'Rs 28,640', badge: 'Counter pickup' },
    { label: 'Delivery', orders: 16, sales: 'Rs 31,980', badge: 'Dispatch desk' }
  ];

  readonly serviceHighlights: ServiceHighlight[] = [
    { label: 'Peak Hour', value: '1:00 PM - 2:00 PM', detail: '22 bills closed during lunch rush' },
    { label: 'Average Bill', value: 'Rs 2,034', detail: 'Across dine-in, takeaway, and delivery' },
    { label: 'Dispatch Pace', value: '18 min', detail: 'Average delivery handoff time today' }
  ];

  readonly categoryPulse: CategoryPulse[] = [
    { name: 'South Indian', share: '34%', orders: '26 orders', amount: 'Rs 28,420' },
    { name: 'Chinese', share: '27%', orders: '18 orders', amount: 'Rs 21,860' },
    { name: 'Beverages', share: '16%', orders: '31 cups', amount: 'Rs 9,740' }
  ];

  readonly liveTables: TableStatus[] = [
    { table: 'T2', guests: '4 guests', server: 'Rina', elapsed: '18 min', status: 'Occupied', area: 'Main hall' },
    { table: 'T6', guests: '2 guests', server: 'Kumar', elapsed: 'Ready', status: 'Ready To Bill', area: 'Window side' },
    { table: 'T9', guests: '6 guests', server: 'Asha', elapsed: '20:30', status: 'Occupied', area: 'Family bay' },
    { table: 'Banquet A', guests: 'Reserved 24 pax', server: 'Rahul', elapsed: '19:00', status: 'Reserved', area: 'Event zone' },
    { table: 'T4', guests: 'Cleaning crew', server: 'Steward', elapsed: '4 min', status: 'Cleaning', area: 'Main hall' }
  ];

  readonly kitchenTickets: KitchenTicket[] = [
    { kotNo: 'KOT-2148', table: 'T2', items: 'Paneer Tikka, Butter Naan x4', stage: 'Cooking', age: '08 min', priority: 'Rush' },
    { kotNo: 'KOT-2149', table: 'TA-08', items: 'Chicken Fried Rice, Chilli Chicken', stage: 'Queued', age: '03 min', priority: 'Normal' },
    { kotNo: 'KOT-2150', table: 'DL-11', items: 'Meals Combo x3, Fresh Lime', stage: 'Plating', age: '10 min', priority: 'Rush' },
    { kotNo: 'KOT-2151', table: 'T6', items: 'Filter Coffee x2, Gulab Jamun', stage: 'Ready', age: '12 min', priority: 'Ready' }
  ];

  readonly paymentMix: PaymentMode[] = [
    { label: 'Cash', value: 'Rs 42,560', share: '29%', width: 29 },
    { label: 'UPI', value: 'Rs 54,880', share: '37%', width: 37 },
    { label: 'Card', value: 'Rs 33,420', share: '22%', width: 22 },
    { label: 'QR / PayNow', value: 'Rs 17,760', share: '12%', width: 12 }
  ];

  readonly counters: CounterSnapshot[] = [
    { counter: 'Counter 1', cashier: 'Antony', bills: '32 bills', sales: 'Rs 52,410', status: 'Fast billing', mode: 'Dine In' },
    { counter: 'Counter 2', cashier: 'Meena', bills: '24 bills', sales: 'Rs 41,860', status: 'Take away focus', mode: 'Take Away' },
    { counter: 'Counter 3', cashier: 'Siva', bills: '19 bills', sales: 'Rs 31,550', status: 'Delivery support', mode: 'Delivery' }
  ];

  readonly alerts: AlertItem[] = [
    { title: 'Low stock', detail: 'Fresh cream, brown bread, and mint chutney are below reorder level.', tone: 'warn', tag: 'Stock' },
    { title: 'Pending settlement', detail: 'Table T6 and T11 are marked ready to bill but not yet settled.', tone: 'info', tag: 'Billing' },
    { title: 'Kitchen ready', detail: 'KOT-2151 is ready for service and waiting at pass counter.', tone: 'good', tag: 'Kitchen' }
  ];

  readonly quickActions: QuickAction[] = [
    { title: 'Open Billing', subtitle: 'Settle dine-in, takeaway, and delivery bills', route: '/pos/billing', icon: 'pi pi-wallet' },
    { title: 'Order Screen', subtitle: 'Capture new table orders and send to kitchen', route: '/pos/order-screen', icon: 'pi pi-shopping-cart' },
    { title: 'Dining Tables', subtitle: 'See table occupancy and move guests quickly', route: '/pos/dining-table', icon: 'pi pi-th-large' },
    { title: 'Low Stock', subtitle: 'Check urgent replenishment items', route: '/pos/low-stock', icon: 'pi pi-exclamation-triangle' }
  ];

  readonly shiftChecklist: ShiftTask[] = [
    { time: '09:00 AM', title: 'Open counter float', detail: 'Cash drawer counted and shift float verified.', status: 'Done' },
    { time: '11:30 AM', title: 'Lunch rush prep', detail: 'Table reset, KOT printer check, parcel covers stocked.', status: 'Done' },
    { time: '03:00 PM', title: 'Mid-shift stock check', detail: 'Beverages, chutneys, and takeaway packing review.', status: 'In Progress' },
    { time: '07:00 PM', title: 'Dinner dispatch watch', detail: 'Monitor delivery queue and pending settlements.', status: 'Pending' }
  ];
}

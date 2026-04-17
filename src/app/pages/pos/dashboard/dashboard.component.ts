import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SharedTableColumn, SharedTableComponent, SharedTablePaginationMode } from '../../../components/table/shared-table.component';

type InvoiceRow = { invoiceNo: string; counter: string; cashier: string; payment: string; total: number; status: string };

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, CardModule, ButtonModule, SharedTableComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  readonly paginationMode: SharedTablePaginationMode = 'client';
  readonly quickActions = [
    { title: 'New Sale', route: '/pos/sales', icon: 'pi pi-shopping-cart' },
    { title: 'Products', route: '/pos/products', icon: 'pi pi-box' },
    { title: 'Low Stock', route: '/pos/low-stock', icon: 'pi pi-exclamation-triangle' },
    { title: 'Orders', route: '/pos/transactions', icon: 'pi pi-receipt' }
  ];
  readonly counterCards = [
    { label: 'Today Sales', value: '$8,426', caption: 'Across all active counters' },
    { label: 'Total Orders', value: '98', caption: 'Completed invoices for the day' },
    { label: 'Low Stock Alerts', value: '19', caption: 'Products needing replenishment' },
    { label: 'Top Product', value: 'Arabica Coffee', caption: 'Highest moving item today' }
  ];
  readonly salesGraph = [
    { hour: '09:00', amount: 620, height: 34 },
    { hour: '11:00', amount: 980, height: 56 },
    { hour: '13:00', amount: 1420, height: 82 },
    { hour: '15:00', amount: 1180, height: 68 },
    { hour: '17:00', amount: 1640, height: 94 },
    { hour: '19:00', amount: 1220, height: 70 }
  ];
  readonly topProducts = [
    { name: 'Arabica Coffee 250g', sold: '182 units', trend: '+12%' },
    { name: 'Brown Bread Loaf', sold: '146 units', trend: '+8%' },
    { name: 'Fresh Orange Juice', sold: '119 units', trend: '+5%' }
  ];
  readonly dashboardNotes = [
    'Counter 2 is carrying the highest billing volume today.',
    'Fresh Orange Juice and Brown Bread are below reorder stock.',
    'Two credit invoices still need cashier follow-up before close.'
  ];
  readonly recentInvoices: InvoiceRow[] = [
    { invoiceNo: 'INV-2041', counter: 'Counter 1', cashier: 'Maria', payment: 'Cash', total: 28.5, status: 'Paid' },
    { invoiceNo: 'INV-2040', counter: 'Counter 2', cashier: 'Sahana', payment: 'UPI', total: 63.4, status: 'Paid' },
    { invoiceNo: 'INV-2038', counter: 'Wholesale Desk', cashier: 'Antony', payment: 'Credit', total: 114.2, status: 'Open' }
  ];
  readonly invoiceColumns: SharedTableColumn<InvoiceRow>[] = [
    { field: 'invoiceNo', header: 'Invoice', sortable: true, width: '10rem' },
    { field: 'counter', header: 'Counter', sortable: true, width: '12rem' },
    { field: 'cashier', header: 'Cashier', sortable: true, width: '10rem' },
    { field: 'payment', header: 'Payment', sortable: true, width: '8rem' },
    { field: 'total', header: 'Total', type: 'currency', sortable: true, width: '8rem' },
    { field: 'status', header: 'Status', type: 'tag', sortable: true, width: '8rem', tagSeverityMap: { Paid: 'success', Open: 'warn' } }
  ];
}

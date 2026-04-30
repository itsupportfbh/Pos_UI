import { Routes } from '@angular/router';
import { WorkspaceComponent } from '../workspace/workspace.component';

const dashboardPage = () => import('../dashboard/dashboard.component').then((module) => module.DashboardComponent);
const billingPage = () => import('../billing/billing.component').then((module) => module.BillingComponent);
const printBillsPage = () => import('../print-bills/print-bills.component').then((module) => module.PrintBillsComponent);
const menusPage = () => import('../menus/menus.component').then((module) => module.MenusComponent);
const categoriesPage = () => import('../categories/categories.component').then((module) => module.CategoriesComponent);
const subCategoriesPage = () => import('../SubCategory/subcategory.component').then((module) => module.SubCategoryComponent);
const stockInPage = () => import('../stock-in/stock-in.component').then((module) => module.StockInComponent);
const stockOutPage = () => import('../stock-out/stock-out.component').then((module) => module.StockOutComponent);
const currentStockPage = () => import('../current-stock/current-stock.component').then((module) => module.CurrentStockComponent);
const lowStockPage = () => import('../low-stock/low-stock.component').then((module) => module.LowStockComponent);
const customersPage = () => import('../customers/customers.component').then((module) => module.CustomersComponent);
const customerHistoryPage = () => import('../customer-history/customer-history.component').then((module) => module.CustomerHistoryComponent);
const creditTrackingPage = () => import('../credit-tracking/credit-tracking.component').then((module) => module.CreditTrackingComponent);
const returnRefundPage = () => import('../return-refund/return-refund.component').then((module) => module.ReturnRefundComponent);
const paymentsPage = () => import('../payments/payments.component').then((module) => module.PaymentsComponent);
const pendingPaymentsPage = () => import('../pending-payments/pending-payments.component').then((module) => module.PendingPaymentsComponent);
const dailySalesPage = () => import('../daily-sales/daily-sales.component').then((module) => module.DailySalesComponent);
const monthlySalesPage = () => import('../monthly-sales/monthly-sales.component').then((module) => module.MonthlySalesComponent);
const menuSalesPage = () => import('../menu-sales/menu-sales.component').then((module) => module.MenuSalesComponent);
const organizationPage = () => import('../organization/organization.component').then((module) => module.OrganizationComponent);
const branchesPage = () => import('../branches/branches.component').then((module) => module.BranchesComponent);
const countersPage = () => import('../counters/counters.component').then((module) => module.CountersComponent);
const terminalPage = () => import('../terminal/terminal.component').then((module) => module.TerminalComponent);
const printersPage = () => import('../printers/printers.component').then((module) => module.PrintersComponent);
const TaxPage = () => import('../tax/tax.component').then((module) => module.TaxComponent);
const usersPage = () => import('../users/users.component').then((module) => module.UsersComponent);
const rolesPage = () => import('../roles/roles.component').then((module) => module.RolesComponent);
const floorPage = () => import('../Floor/floor.component').then((module) => module.FloorComponent);

export const POS_ROUTES: Routes = [
  {
    path: '',
    component: WorkspaceComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: dashboardPage },
      { path: 'billing', loadComponent: billingPage },
      { path: 'print-bills', loadComponent: printBillsPage },
      { path: 'menus', loadComponent: menusPage },
      { path: 'categories', loadComponent: categoriesPage },
      { path: 'subcategories', loadComponent: subCategoriesPage },
      { path: 'stock-in', loadComponent: stockInPage },
      { path: 'stock-out', loadComponent: stockOutPage },
      { path: 'current-stock', loadComponent: currentStockPage },
      { path: 'low-stock', loadComponent: lowStockPage },
      { path: 'customers', loadComponent: customersPage },
      { path: 'Floor', loadComponent: floorPage },
      { path: 'customer-history', loadComponent: customerHistoryPage },
      { path: 'credit-tracking', loadComponent: creditTrackingPage },
      { path: 'return-refund', loadComponent: returnRefundPage },
      { path: 'payments', loadComponent: paymentsPage },
      { path: 'pending-payments', loadComponent: pendingPaymentsPage },
      { path: 'daily-sales', loadComponent: dailySalesPage },
      { path: 'monthly-sales', loadComponent: monthlySalesPage },
      { path: 'menu-sales', loadComponent: menuSalesPage },
      { path: 'organization', loadComponent: organizationPage },
      { path: 'branches', loadComponent: branchesPage },
      { path: 'counters', loadComponent: countersPage },
      { path: 'terminal', loadComponent: terminalPage },
      { path: 'printers', loadComponent: printersPage },
      { path: 'Tax', loadComponent: TaxPage },
      { path: 'users', loadComponent: usersPage },
      { path: 'roles', loadComponent: rolesPage }
    ]
  }
];

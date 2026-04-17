import { Routes } from '@angular/router';
import { WorkspaceComponent } from '../workspace/workspace.component';

const dashboardPage = () => import('../dashboard/dashboard.component').then((module) => module.DashboardComponent);
const salesPage = () => import('../sales/sales.component').then((module) => module.SalesComponent);
const printBillsPage = () => import('../print-bills/print-bills.component').then((module) => module.PrintBillsComponent);
const productsPage = () => import('../products/products.component').then((module) => module.ProductsComponent);
const categoriesPage = () => import('../categories/categories.component').then((module) => module.CategoriesComponent);
const stockInPage = () => import('../stock-in/stock-in.component').then((module) => module.StockInComponent);
const stockOutPage = () => import('../stock-out/stock-out.component').then((module) => module.StockOutComponent);
const currentStockPage = () => import('../current-stock/current-stock.component').then((module) => module.CurrentStockComponent);
const lowStockPage = () => import('../low-stock/low-stock.component').then((module) => module.LowStockComponent);
const customersPage = () => import('../customers/customers.component').then((module) => module.CustomersComponent);
const customerHistoryPage = () => import('../customer-history/customer-history.component').then((module) => module.CustomerHistoryComponent);
const creditTrackingPage = () => import('../credit-tracking/credit-tracking.component').then((module) => module.CreditTrackingComponent);
const transactionsPage = () => import('../transactions/transactions.component').then((module) => module.TransactionsComponent);
const invoiceDetailsPage = () => import('../invoice-details/invoice-details.component').then((module) => module.InvoiceDetailsComponent);
const returnsPage = () => import('../returns/returns.component').then((module) => module.ReturnsComponent);
const paymentsPage = () => import('../payments/payments.component').then((module) => module.PaymentsComponent);
const pendingPaymentsPage = () => import('../pending-payments/pending-payments.component').then((module) => module.PendingPaymentsComponent);
const expensesPage = () => import('../expenses/expenses.component').then((module) => module.ExpensesComponent);
const expenseReportPage = () => import('../expense-report/expense-report.component').then((module) => module.ExpenseReportComponent);
const dailySalesPage = () => import('../daily-sales/daily-sales.component').then((module) => module.DailySalesComponent);
const monthlyProfitPage = () => import('../monthly-profit/monthly-profit.component').then((module) => module.MonthlyProfitComponent);
const productSalesPage = () => import('../product-sales/product-sales.component').then((module) => module.ProductSalesComponent);
const inventoryReportPage = () => import('../inventory-report/inventory-report.component').then((module) => module.InventoryReportComponent);
const taxReportPage = () => import('../tax-report/tax-report.component').then((module) => module.TaxReportComponent);
const organizationPage = () => import('../organization/organization.component').then((module) => module.OrganizationComponent);
const branchesPage = () => import('../branches/branches.component').then((module) => module.BranchesComponent);
const departmentsPage = () => import('../departments/departments.component').then((module) => module.DepartmentsComponent);
const subDepartmentsPage = () => import('../sub-departments/sub-departments.component').then((module) => module.SubDepartmentsComponent);
const usersPage = () => import('../users/users.component').then((module) => module.UsersComponent);
const rolesPage = () => import('../roles/roles.component').then((module) => module.RolesComponent);
const permissionsPage = () => import('../permissions/permissions.component').then((module) => module.PermissionsComponent);
const notificationsPage = () => import('../notifications/notifications.component').then((module) => module.NotificationsComponent);
const settingsPage = () => import('../settings/settings.component').then((module) => module.SettingsComponent);

export const POS_ROUTES: Routes = [
  {
    path: '',
    component: WorkspaceComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: dashboardPage },
      { path: 'sales', loadComponent: salesPage },
      { path: 'print-bills', loadComponent: printBillsPage },
      { path: 'products', loadComponent: productsPage },
      { path: 'categories', loadComponent: categoriesPage },
      { path: 'stock-in', loadComponent: stockInPage },
      { path: 'stock-out', loadComponent: stockOutPage },
      { path: 'current-stock', loadComponent: currentStockPage },
      { path: 'low-stock', loadComponent: lowStockPage },
      { path: 'customers', loadComponent: customersPage },
      { path: 'customer-history', loadComponent: customerHistoryPage },
      { path: 'credit-tracking', loadComponent: creditTrackingPage },
      { path: 'transactions', loadComponent: transactionsPage },
      { path: 'invoice-details', loadComponent: invoiceDetailsPage },
      { path: 'returns', loadComponent: returnsPage },
      { path: 'payments', loadComponent: paymentsPage },
      { path: 'pending-payments', loadComponent: pendingPaymentsPage },
      { path: 'expenses', loadComponent: expensesPage },
      { path: 'expense-report', loadComponent: expenseReportPage },
      { path: 'daily-sales', loadComponent: dailySalesPage },
      { path: 'monthly-profit', loadComponent: monthlyProfitPage },
      { path: 'product-sales', loadComponent: productSalesPage },
      { path: 'inventory-report', loadComponent: inventoryReportPage },
      { path: 'tax-report', loadComponent: taxReportPage },
      { path: 'organization', loadComponent: organizationPage },
      { path: 'branches', loadComponent: branchesPage },
      { path: 'departments', loadComponent: departmentsPage },
      { path: 'sub-departments', loadComponent: subDepartmentsPage },
      { path: 'users', loadComponent: usersPage },
      { path: 'roles', loadComponent: rolesPage },
      { path: 'permissions', loadComponent: permissionsPage },
      { path: 'notifications', loadComponent: notificationsPage },
      { path: 'settings', loadComponent: settingsPage }
    ]
  }
];

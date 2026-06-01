import { Routes } from '@angular/router';
import { WorkspaceComponent } from '../workspace/workspace.component';
import { posRouteAccessGuard } from './route-access.guard';
import { shiftAssignmentGuard } from './shift-assignment.guard';

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
const orderScreenPage = () => import('../order-screen/order-screen.component').then((module) => module.OrderScreenComponent);
const orderHoldPage = () => import('../order-hold/order-hold.component').then((module) => module.OrderHoldComponent);
const orderEditPage = () => import('../order-edit/order-edit.component').then((module) => module.OrderEditComponent);
const displayMenuItemsPage = () => import('../display-menu-items/display-menu-items.component').then((module) => module.DisplayMenuItemsComponent);
const serveOrdersPage = () => import('../serve-orders/serve-orders.component').then((module) => module.ServeOrdersComponent);
const menuPriceChangePage = () => import('../menu-price-change/menu-price-change.component').then((module) => module.MenuPriceChangeComponent);
const quickServePage = () => import('../quick-serve/quick-serve.component').then((module) => module.QuickServeComponent);
const recallPage = () => import('../recall/recall.component').then((module) => module.RecallComponent);
const tenderPage = () => import('../tender/tender.component').then((module) => module.TenderComponent);
const shiftClosePage = () => import('../shift-close/shift-close.component').then((module) => module.ShiftCloseComponent);
const registrationPage = () => import('../registration/registration.component').then((module) => module.RegistrationComponent);
const historyPage = () => import('../history/history.component').then((module) => module.HistoryComponent);
const tipAdjustmentPage = () => import('../tip-adjustment/tip-adjustment.component').then((module) => module.TipAdjustmentComponent);
const cashDrawerPage = () => import('../cash-drawer/cash-drawer.component').then((module) => module.CashDrawerComponent);
const cashierInPage = () => import('../cashier-in/cashier-in.component').then((module) => module.CashierInComponent);
const cashierOutPage = () => import('../cashier-out/cashier-out.component').then((module) => module.CashierOutComponent);
const payInPage = () => import('../pay-in/pay-in.component').then((module) => module.PayInComponent);
const payOutPage = () => import('../pay-out/pay-out.component').then((module) => module.PayOutComponent);
const deliveryPage = () => import('../delivery/delivery.component').then((module) => module.DeliveryComponent);
const deliveryOutPage = () => import('../delivery-out/delivery-out.component').then((module) => module.DeliveryOutComponent);
const moveTablePage = () => import('../move-table/move-table.component').then((module) => module.MoveTableComponent);
const joinTablePage = () => import('../join-table/join-table.component').then((module) => module.JoinTableComponent);
const reservationPage = () => import('../reservation/reservation.component').then((module) => module.ReservationComponent);
const membershipManagementPage = () => import('../membership-management/membership-management.component').then((module) => module.MembershipManagementComponent);
const customerDisplayPage = () => import('../customer-display/customer-display.component').then((module) => module.CustomerDisplayComponent);
const dualDisplayPage = () => import('../dual-display/dual-display.component').then((module) => module.DualDisplayComponent);
const menuSettingPage = () => import('../menu-setting/menu-setting.component').then((module) => module.MenuSettingComponent);
const menuRegistrationPage = () => import('../menu-registration/menu-registration.component').then((module) => module.MenuRegistrationComponent);
const menuSelectionPage = () => import('../menu-selection/menu-selection.component').then((module) => module.MenuSelectionComponent);
const comboMenuPage = () => import('../combo-menu/combo-menu.component').then((module) => module.ComboMenuComponent);
const modifierSettingsPage = () => import('../modifier-settings/modifier-settings.component').then((module) => module.ModifierSettingsComponent);
const pricingControlPage = () => import('../pricing-control/pricing-control.component').then((module) => module.PricingControlComponent);
const vendorGroupPage = () => import('../vendor-group/vendor-group.component').then((module) => module.VendorGroupComponent);
const vendorManagerPage = () => import('../vendor-manager/vendor-manager.component').then((module) => module.VendorManagerComponent);
const purchaseOrderPage = () => import('../purchase-order/purchase-order.component').then((module) => module.PurchaseOrderComponent);
const employeeRegistrationPage = () => import('../employee-registration/employee-registration.component').then((module) => module.EmployeeRegistrationComponent);
const dataInitializationPage = () => import('../data-initialization/data-initialization.component').then((module) => module.DataInitializationComponent);
const tarePage = () => import('../tare/tare.component').then((module) => module.TareComponent);
const announcementPage = () => import('../announcement/announcement.component').then((module) => module.AnnouncementComponent);
const weighingScalePage = () => import('../weighing-scale/weighing-scale.component').then((module) => module.WeighingScaleComponent);
const callerIdPage = () => import('../caller-id/caller-id.component').then((module) => module.CallerIdComponent);
const currencyDecimalFormatPage = () => import('../currency-decimal-format/currency-decimal-format.component').then((module) => module.CurrencyDecimalFormatComponent);
const languagePage = () => import('../language/language.component').then((module) => module.LanguageComponent);
const paymodePage = () => import('../paymode/paymode.component').then((module) => module.PaymodeComponent);
const floorPage = () => import('../Floor/floor.component').then((module) => module.FloorComponent);
const diningTablePage = () => import('../dining-table/dining-table.component').then((module) => module.DiningTableComponent);

export const POS_ROUTES: Routes = [
  {
    path: '',
    component: WorkspaceComponent,
    canActivate: [shiftAssignmentGuard],
    canActivateChild: [posRouteAccessGuard],
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
      { path: 'floor', loadComponent: floorPage },
      { path: 'dining-tables', loadComponent: diningTablePage },
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
      { path: 'tax', loadComponent: TaxPage },
      { path: 'users', loadComponent: usersPage },
      { path: 'roles', loadComponent: rolesPage },
      { path: 'order-screen', loadComponent: orderScreenPage },
      { path: 'order-hold', loadComponent: orderHoldPage },
      { path: 'order-edit', loadComponent: orderEditPage },
      { path: 'display-menu-items', loadComponent: displayMenuItemsPage },
      //{ path: 'serve-orders', loadComponent: serveOrdersPage },
      { path: 'menu-price-change', loadComponent: menuPriceChangePage },
      { path: 'quick-serve', loadComponent: serveOrdersPage },
      { path: 'recall', loadComponent: recallPage },
      { path: 'tender', loadComponent: tenderPage },
      { path: 'shift-close', loadComponent: shiftClosePage },
      { path: 'registration', loadComponent: registrationPage },
      { path: 'history', loadComponent: historyPage },
      { path: 'tip-adjustment', loadComponent: tipAdjustmentPage },
      { path: 'cash-drawer', loadComponent: cashDrawerPage },
      { path: 'cashier-in', loadComponent: cashierInPage },
      { path: 'cashier-out', loadComponent: cashierOutPage },
      { path: 'pay-in', loadComponent: payInPage },
      { path: 'pay-out', loadComponent: payOutPage },
      { path: 'delivery', loadComponent: deliveryPage },
      { path: 'delivery-out', loadComponent: deliveryOutPage },
      { path: 'move-table', loadComponent: moveTablePage },
      { path: 'join-table', loadComponent: joinTablePage },
      { path: 'reservation', loadComponent: reservationPage },
      { path: 'reward-point', loadComponent: membershipManagementPage },
      { path: 'customer-display', loadComponent: customerDisplayPage },
      { path: 'dual-display', loadComponent: dualDisplayPage },
      { path: 'menu-setting', loadComponent: menuSettingPage },
      { path: 'menu-registration', loadComponent: menuRegistrationPage },
      { path: 'menu-selection', loadComponent: menuSelectionPage },
      { path: 'combo-menu', loadComponent: comboMenuPage },
      { path: 'modifier-settings', loadComponent: modifierSettingsPage },
      { path: 'pricing-control', loadComponent: pricingControlPage },
      { path: 'vendor-group', loadComponent: vendorGroupPage },
      { path: 'vendor-manager', loadComponent: vendorManagerPage },
      { path: 'purchase-order', loadComponent: purchaseOrderPage },
      { path: 'employee-registration', loadComponent: employeeRegistrationPage },
      { path: 'data-initialization', loadComponent: dataInitializationPage },
      { path: 'tare', loadComponent: tarePage },
      { path: 'announcement', loadComponent: announcementPage },
      { path: 'weighing-scale', loadComponent: weighingScalePage },
      { path: 'caller-id', loadComponent: callerIdPage },
      { path: 'currency-decimal-format', loadComponent: currencyDecimalFormatPage },
      { path: 'language', loadComponent: languagePage },
      { path: 'paymode', loadComponent: paymodePage },
      { path: 'kitchen-display', loadComponent: displayMenuItemsPage },

      { path: 'Tax', redirectTo: 'tax', pathMatch: 'full' },
      { path: 'display-menu-items', redirectTo: 'kitchen-display', pathMatch: 'full' },
      { path: 'membership-management', redirectTo: 'reward-point', pathMatch: 'full' },
      { path: 'reward-points', redirectTo: 'reward-point', pathMatch: 'full' }
    ]
  }
];

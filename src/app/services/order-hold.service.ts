import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiListResponse } from './api-response.model';
import { RuntimeConfigService } from './runtime-config.service';

export interface OrderHold {
  Id?: number;
  OrderId?: number;
  Orderid?: number;
  orderId?: number;
  Ordernumber?: string | null;
  OrderNumber?: string | null;
  ordernumber?: string | null;
  orderNumber?: string | null;
  Tableid?: number;
  tableid?: number;
  TableId?: number;
  tableId?: number;
  ComboMenuId?: number;
  comboMenuId?: number;
  Combomenuid?: number;
  combomenuid?: number;
  Ordertype?: string;
  ordertype?: string;
  Orderstatus?: string;
  orderstatus?: string;
  CustomerName?: string;
  customerName?: string;
  ContactNumber?: string;
  contactNumber?: string;
 
  Itemcount?: number;
  itemcount?: number;
  ItemCount?: number;
  itemCount?: number;
  Guestcount?: number;
  guestcount?: number;
  SubtotalAmount?: number;
  subtotalAmount?: number;
  TaxAmount?: number;
  taxAmount?: number;
  DiscountAmount?: number;
  discountAmount?: number;
  TotalAmount?: number;
  totalAmount?: number;
  Shiftid?: number;
  shiftid?: number;
  ShiftId?: number;
  shiftId?: number;
  OrgId?: number;
  orgId?: number;
  BranchId?: number;
  branchId?: number;
  IsActive?: boolean;
  isActive?: boolean;
  IsDeleted?: boolean;
  isDeleted?: boolean;
  CreatedBy?: number | null;
  createdBy?: number | null;
  CreatedDate?: string;
  createdDate?: string;
  UpdatedBy?: number | null;
  updatedBy?: number | null;
  UpdatedDate?: string | null;
  updatedDate?: string | null;
  Items?: OrderHoldItem[];
  items?: OrderHoldItem[];
  OrderholdItems?: OrderHoldItem[];
  orderHoldItems?: OrderHoldItem[];
  OrderHoldItems?: OrderHoldItem[];
  entityNo?: number;
}

export interface OrderHoldItem {
  Id?: number;
  itemid?: number;
  Orderid?: number;
  orderid?: number;
  Menuitemid?: string | number;
  menuitemid?: string | number;
  MenuItemId?: string | number;
  menuItemId?: string | number;
  ComboMenuId?: number;
  comboMenuId?: number;
  Combomenuid?: number;
  combomenuid?: number;
  ComboMenuItemId?: number;
  comboMenuItemId?: number;
  Combomenuitemid?: number;
  combomenuitemid?: number;
  Itemname?: string;
  itemname?: string;
  Quantity?: number;
  quantity?: number;
  Unitprice?: number;
  unitprice?: number;
  Totalprice?: number;
  totalprice?: number;
  DiscountAmount?: number;
  discountAmount?: number;
  TaxAmount?: number;
  taxAmount?: number;
  Modifierdetails?: string | null;
  modifierdetails?: string | null;
  Itemstatus?: string;
  itemstatus?: string;
  Notes?: string | null;
  notes?: string | null;
  OrgId?: number;
  orgId?: number;
  BranchId?: number;
  branchId?: number;
  IsActive?: boolean;
  isActive?: boolean;
  IsDeleted?: boolean;
  isDeleted?: boolean;
  CreatedBy?: number | null;
  createdBy?: number | null;
  CreatedDate?: string;
  createdDate?: string;
  UpdatedBy?: number | null;
  updatedBy?: number | null;
  UpdatedDate?: string | null;
  updatedDate?: string | null;
  orderHold?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class OrderHoldService {
  private readonly controllerPath = 'OrderHold';

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService
  ) { }

  create(payload: OrderHold): Observable<any> {
  
    return this.http.post<any>(`${this.baseUrl}/${this.controllerPath}/Create`, payload);
  }

  update(payload: OrderHold): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/Update`, payload);
  }

  getAll(orgid: number): Observable<ApiListResponse<OrderHold>> {
    const params = new HttpParams().set('orgid', orgid.toString());
    return this.http.get<ApiListResponse<OrderHold>>(`${this.baseUrl}/${this.controllerPath}/GetAll`, { params });
  }

  getById(id: number | string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${this.controllerPath}/GetById?Id=${id}`);
  }

  getAllHoldorderDetails(id: number | string): Observable<any> {
    const params = new HttpParams().set('orderId', id.toString());
    return this.http.get<any>(`${this.baseUrl}/${this.controllerPath}/GetAllHoldorderDetails`, { params });
  }

  delete(id: number | string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${this.controllerPath}/Delete?Id=${id}`);
  }

  activeInActive(id: number | string, isActive: boolean): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.controllerPath}/ActiveInActive?Id=${id}&IsActive=${isActive}`, {});
  }

  private get baseUrl(): string {
    return this.runtimeConfig.apiBaseUrl;
  }
}

import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { SharedTableColumn } from '../components/table/shared-table.component';

@Injectable({
  providedIn: 'root'
})
export class TableExportService {
  async exportExcel(fileName: string, columns: SharedTableColumn<any>[], rows: any[], sheetName: string = 'Report'): Promise<void> {
    const visibleColumns = columns.filter((column) => !column.hidden);
    const headers = visibleColumns.map((column) => column.header);
    const bodyRows = rows.map((row) => visibleColumns.map((column) => this.getCellText(column, row)));
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...bodyRows]);

    worksheet['!cols'] = headers.map((header, index) => ({
      wch: this.getExcelColumnWidth(header, bodyRows, index)
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }

  async exportPdf(fileName: string, title: string, columns: SharedTableColumn<any>[], rows: any[]): Promise<void> {
    const visibleColumns = columns.filter((column) => !column.hidden);
    const headers = visibleColumns.map((column) => column.header);
    const bodyRows = rows.map((row) => visibleColumns.map((column) => this.getCellText(column, row)));
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
      compress: true
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title, 40, 34);

    autoTable(doc, {
      startY: 48,
      head: [headers],
      body: bodyRows,
      theme: 'grid',
      margin: { top: 48, right: 24, bottom: 24, left: 24 },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 6,
        overflow: 'linebreak',
        textColor: [48, 33, 21],
        lineColor: [214, 193, 173],
        lineWidth: 0.35,
        valign: 'middle'
      },
      headStyles: {
        fillColor: [247, 239, 232],
        textColor: [72, 45, 28],
        fontStyle: 'bold',
        lineColor: [214, 193, 173],
        lineWidth: 0.5
      },
      alternateRowStyles: {
        fillColor: [252, 249, 246]
      },
      bodyStyles: {
        fillColor: [255, 255, 255]
      }
    });

    doc.save(`${fileName}.pdf`);
  }

  private getCellText(column: SharedTableColumn<any>, row: any): string {
    const value = row[column.field];

    if (column.formatter) {
      return String(column.formatter(value, row) ?? '');
    }

    if (value === null || value === undefined) {
      return '';
    }

    return String(value);
  }

  private getExcelColumnWidth(header: string, bodyRows: string[][], index: number): number {
    const bodyWidth = bodyRows.reduce((longest, row) => {
      const value = row[index] ?? '';
      return Math.max(longest, value.length);
    }, 0);

    return Math.min(40, Math.max(12, Math.max(header.length, bodyWidth) + 2));
  }
}

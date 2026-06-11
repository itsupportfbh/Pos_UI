import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SyncService } from './sync.service';

@Injectable({
    providedIn: 'root'
})
export class SyncEngineService {

    private tables = [
        'CustomerMaster',
        'FoodMenu',
        'FoodMenuCategory',
        'FoodMenuSubCategory'
    ];

    constructor(
        private syncService: SyncService
    ) { }

    async query(
        sql: string,
        params: any[] = []
    ): Promise<any> {
        debugger;
        return await window.electronAPI
            .executeQuery(sql, params);

    }

    startSync() {
        setInterval(async () => {
            debugger;
            if (!navigator.onLine)
                return;
            try {
                await this.uploadAll();
                await this.downloadAll();
            }
            catch (error) {
                console.error(
                    'Sync Error',
                    error
                );
            }
        }, 30000);
    }

    async uploadAll() {
        for (const table of this.tables) {
            await this.uploadTable(table);
        }
    }

    async downloadAll() {
        for (const table of this.tables) {
            await this.downloadTable(table);
        }
    }

    async getTracking(
        table: string
    ) {

        const sql = `
    SELECT *
    FROM SyncTracking
    WHERE TableName = ?
  `;

        const result =
            await this.query(
                sql,
                [table]
            );

        return result.values[0];

    }

    async uploadTable(
        table: string
    ) {

        const sql = `
    SELECT *
    FROM ${table}    
  `;

        const result =
            await this.query(sql);

        const rows =
            result.values || [];

        if (!rows.length)
            return;

        await firstValueFrom(
            this.syncService.upload({
                tableName: table,
                data: rows
            })
        );

        await this.query(
            `
      UPDATE ${table}
      SET IsSynced = 1
      WHERE IsSynced = 0
    `
        );

    }

    async downloadTable(
        table: string
    ) {
        const tracking =
            await this.getTracking(
                table
            );
        const payload = {
            tableName: table,
            lastSyncDate:
                tracking?.LastSyncDate,
            lastDownloadId:
                tracking?.LastDownloadId || 0
        };

        const response: any =
            await firstValueFrom(
                this.syncService
                    .download(payload)
            );

        if (
            !response ||
            !response.length
        )
            return;

        console.log(
            table,
            response
        );

    }

}
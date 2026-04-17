import { SharedTableColumn } from '../../../components/table/shared-table.component';

export type MenuChildItem = { key: string; label: string; description: string; route: string };
export type MenuGroup = { key: string; label: string; icon: string; items: MenuChildItem[] };
export type Option = { label: string; value: string };
export type FeatureFieldType = 'text' | 'select' | 'autocomplete' | 'date';
export type FeatureFieldConfig = { key: string; label: string; type: FeatureFieldType; placeholder?: string; helperText?: string; required?: boolean; disabled?: boolean; options?: Option[]; suggestions?: string[]; optionLabel?: string; showClear?: boolean; filter?: boolean; dropdown?: boolean; forceSelection?: boolean; showIcon?: boolean; dateFormat?: string; minDate?: Date; maxDate?: Date };
export type SummaryCard = { label: string; value: string; caption: string };
export type FeaturePageConfig = { eyebrow: string; title: string; subtitle: string; formTitle?: string; formDescription?: string; tableTitle?: string; tableDescription?: string; helperPoints?: string[]; summaryCards: SummaryCard[]; fields: FeatureFieldConfig[]; primaryActionLabel: string; secondaryActionLabel?: string; showAddNewButton?: boolean; addNewLabel?: string; tableCaption: string; emptyMessage?: string; rows: Record<string, unknown>[]; columns: SharedTableColumn<Record<string, unknown>>[] };

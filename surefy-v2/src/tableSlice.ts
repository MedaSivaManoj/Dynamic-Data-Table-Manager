import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type TableColumn = {
  id: string;
  label: string;
  visible: boolean;
  editable?: boolean;
  type?: 'text' | 'number' | 'date' | 'email' | 'select';
  options?: string[]; // For select type
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    custom?: string;
  };
};

export type TableRow = {
  id: string;
  [key: string]: string | number | boolean | null | undefined;
};

export type FilterOperator = 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'isEmpty' | 'isNotEmpty';

export type ColumnFilter = {
  column: string;
  operator: FilterOperator;
  value: string | number;
  value2?: string | number; // For 'between' operator
};

export type ActivityLog = {
  id: string;
  timestamp: string;
  action: 'create' | 'update' | 'delete' | 'import' | 'export';
  rowId?: string;
  details: string;
  user: string;
};

export type SavedView = {
  id: string;
  name: string;
  columns: TableColumn[];
  filters: ColumnFilter[];
  sort: { column: string; direction: 'asc' | 'desc' } | null;
  search: string;
  timestamp: string;
};

export interface TableState {
  columns: TableColumn[];
  rows: TableRow[];
  search: string;
  sort: { column: string; direction: 'asc' | 'desc' } | null;
  page: number;
  pageSize: number;
  editingRows: string[];
  selectedRows: string[];
  filters: ColumnFilter[];
  activityLog: ActivityLog[];
  savedViews: SavedView[];
  validationErrors: { [rowId: string]: { [columnId: string]: string } };
  showAnalytics: boolean;
}

const initialState: TableState = {
  columns: [
    { id: 'name', label: 'Name', visible: true, editable: true, type: 'text', validation: { required: true } },
    { id: 'email', label: 'Email', visible: true, editable: true, type: 'email', validation: { required: true, pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$' } },
    { id: 'age', label: 'Age', visible: true, editable: true, type: 'number', validation: { min: 18, max: 100 } },
    { id: 'role', label: 'Role', visible: true, editable: true, type: 'select', options: ['Admin', 'User', 'Manager', 'Developer'], validation: { required: true } },
  ],
  rows: [],
  search: '',
  sort: null,
  page: 0,
  pageSize: 10,
  editingRows: [],
  selectedRows: [],
  filters: [],
  activityLog: [],
  savedViews: [],
  validationErrors: {},
  showAnalytics: false,
};

const tableSlice = createSlice({
  name: 'table',
  initialState,
  reducers: {
    setColumns(state, action: PayloadAction<TableColumn[]>) {
      state.columns = action.payload;
    },
    setRows(state, action: PayloadAction<TableRow[]>) {
      state.rows = action.payload;
    },
    addRow(state, action: PayloadAction<TableRow>) {
      state.rows.push(action.payload);
    },
    updateRow(state, action: PayloadAction<{ id: string; changes: Partial<TableRow> }>) {
      const { id, changes } = action.payload;
      const rowIndex = state.rows.findIndex(r => r.id === id);
      if (rowIndex !== -1) {
        state.rows[rowIndex] = { ...state.rows[rowIndex], ...changes };
      }
    },
    deleteRow(state, action: PayloadAction<string>) {
      state.rows = state.rows.filter(r => r.id !== action.payload);
    },
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    setSort(state, action: PayloadAction<{ column: string; direction: 'asc' | 'desc' } | null>) {
      state.sort = action.payload;
    },
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    setPageSize(state, action: PayloadAction<number>) {
      state.pageSize = action.payload;
    },
    setEditingRows(state, action: PayloadAction<string[]>) {
      state.editingRows = action.payload;
    },
    setSelectedRows(state, action: PayloadAction<string[]>) {
      state.selectedRows = action.payload;
    },
    toggleRowSelection(state, action: PayloadAction<string>) {
      const rowId = action.payload;
      if (state.selectedRows.includes(rowId)) {
        state.selectedRows = state.selectedRows.filter(id => id !== rowId);
      } else {
        state.selectedRows.push(rowId);
      }
    },
    setFilters(state, action: PayloadAction<ColumnFilter[]>) {
      state.filters = action.payload;
    },
    addFilter(state, action: PayloadAction<ColumnFilter>) {
      state.filters.push(action.payload);
    },
    removeFilter(state, action: PayloadAction<number>) {
      state.filters.splice(action.payload, 1);
    },
    logActivity(state, action: PayloadAction<Omit<ActivityLog, 'id' | 'timestamp' | 'user'>>) {
      const log: ActivityLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        user: 'Current User', // In real app, get from auth
        ...action.payload,
      };
      state.activityLog.unshift(log);
      // Keep only last 1000 entries
      if (state.activityLog.length > 1000) {
        state.activityLog = state.activityLog.slice(0, 1000);
      }
    },
    saveView(state, action: PayloadAction<Omit<SavedView, 'id' | 'timestamp'>>) {
      const view: SavedView = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...action.payload,
      };
      state.savedViews.push(view);
    },
    loadView(state, action: PayloadAction<string>) {
      const view = state.savedViews.find(v => v.id === action.payload);
      if (view) {
        state.columns = view.columns;
        state.filters = view.filters;
        state.sort = view.sort;
        state.search = view.search;
        state.page = 0;
      }
    },
    deleteSavedView(state, action: PayloadAction<string>) {
      state.savedViews = state.savedViews.filter(v => v.id !== action.payload);
    },
    setValidationErrors(state, action: PayloadAction<{ [rowId: string]: { [columnId: string]: string } }>) {
      state.validationErrors = action.payload;
    },
    clearValidationErrors(state, action: PayloadAction<string>) {
      delete state.validationErrors[action.payload];
    },
    toggleAnalytics(state) {
      state.showAnalytics = !state.showAnalytics;
    },
    bulkDeleteRows(state, action: PayloadAction<string[]>) {
      state.rows = state.rows.filter(row => !action.payload.includes(row.id));
      state.selectedRows = [];
    },
    bulkUpdateRows(state, action: PayloadAction<{ ids: string[]; updates: Partial<TableRow> }>) {
      const { ids, updates } = action.payload;
      state.rows = state.rows.map(row => 
        ids.includes(row.id) ? { ...row, ...updates } : row
      );
      state.selectedRows = [];
    },
  },
});

export const {
  setColumns,
  setRows,
  addRow,
  updateRow,
  deleteRow,
  setSearch,
  setSort,
  setPage,
  setPageSize,
  setEditingRows,
  setSelectedRows,
  toggleRowSelection,
  setFilters,
  addFilter,
  removeFilter,
  logActivity,
  saveView,
  loadView,
  deleteSavedView,
  setValidationErrors,
  clearValidationErrors,
  toggleAnalytics,
  bulkDeleteRows,
  bulkUpdateRows,
} = tableSlice.actions;
export default tableSlice.reducer;

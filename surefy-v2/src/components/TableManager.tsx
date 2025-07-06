"use client";
import React, { useRef, useMemo } from 'react';
import { Box, Typography, IconButton, Tooltip, Button, TextField, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, ListItemSecondaryAction, Divider, Chip } from '@mui/material';
import { Edit, Delete, Save, Cancel, Search, LightMode, DarkMode, ViewColumn, UploadFile, Download, Add, FilterAlt, Analytics, Bookmark } from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setColumns, setRows, setSearch, setSort, setPage, setPageSize, setEditingRows, updateRow, deleteRow, addRow, toggleRowSelection, setSelectedRows, logActivity } from '../tableSlice';
import Papa from 'papaparse';

import { useForm, Controller } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';
import { ColorModeContext } from './MUIThemeProvider';
import { useTheme } from '@mui/material/styles';
import type { TableColumn, TableRow as DataTableRow, ColumnFilter } from '../tableSlice';
import AdvancedFilters from './AdvancedFilters';
import AnalyticsDashboard from './AnalyticsDashboard';
import BulkActions from './BulkActions';
import AdvancedExport from './AdvancedExport';
import SavedViews from './SavedViews';

// Helper functions
function filterRows(rows: DataTableRow[], columns: TableColumn[], search: string, filters: ColumnFilter[] = []): DataTableRow[] {
  let filteredRows = rows;

  // Apply search filter
  if (search) {
    const lower = search.toLowerCase();
    filteredRows = filteredRows.filter((row: DataTableRow) =>
      columns.some((col: TableColumn) => col.visible && String(row[col.id] ?? '').toLowerCase().includes(lower))
    );
  }

  // Apply advanced filters (with safety check)
  if (filters && filters.length > 0) {
    filteredRows = filteredRows.filter(row => {
      return filters.every(filter => {
        const value = row[filter.column];
        const filterValue = filter.value;
        
        switch (filter.operator) {
          case 'equals':
            return String(value).toLowerCase() === String(filterValue).toLowerCase();
          case 'contains':
            return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
          case 'startsWith':
            return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
          case 'endsWith':
            return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
          case 'greaterThan':
            return Number(value) > Number(filterValue);
          case 'lessThan':
            return Number(value) < Number(filterValue);
          case 'between':
            return Number(value) >= Number(filterValue) && Number(value) <= Number(filter.value2);
          case 'isEmpty':
            return !value || String(value).trim() === '';
          case 'isNotEmpty':
            return value && String(value).trim() !== '';
          default:
            return true;
        }
      });
    });
  }

  return filteredRows;
}

function sortRows(rows: DataTableRow[], sort: { column: string; direction: 'asc' | 'desc' } | null): DataTableRow[] {
  if (!sort) return rows;
  const { column, direction } = sort;
  return [...rows].sort((a: DataTableRow, b: DataTableRow) => {
    const aValue = a[column] ?? '';
    const bValue = b[column] ?? '';
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

export default function TableManager() {
  const dispatch = useDispatch();
  const theme = useTheme();
  const colorMode = React.useContext(ColorModeContext);
  const tableState = useSelector((state: RootState) => state.table);

  // State selectors with fallbacks
  const columns = useMemo(() => Array.isArray(tableState?.columns) ? tableState.columns : [], [tableState?.columns]);
  const rows = useMemo(() => Array.isArray(tableState?.rows) ? tableState.rows : [], [tableState?.rows]);
  const search = useMemo(() => typeof tableState?.search === 'string' ? tableState.search : '', [tableState?.search]);
  const sort = useMemo(() => tableState?.sort || null, [tableState?.sort]);
  const page = useMemo(() => typeof tableState?.page === 'number' ? tableState.page : 0, [tableState?.page]);
  const pageSize = useMemo(() => typeof tableState?.pageSize === 'number' ? tableState.pageSize : 10, [tableState?.pageSize]);
  const editingRows = useMemo(() => Array.isArray(tableState?.editingRows) ? tableState.editingRows : [], [tableState?.editingRows]);
  const selectedRows = useMemo(() => Array.isArray(tableState?.selectedRows) ? tableState.selectedRows : [], [tableState?.selectedRows]);
  const filters = useMemo(() => Array.isArray(tableState?.filters) ? tableState.filters : [], [tableState?.filters]);

  const [manageColumnsOpen, setManageColumnsOpen] = React.useState(false);
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);
  const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = React.useState(false);
  const [analyticsDashboardOpen, setAnalyticsDashboardOpen] = React.useState(false);
  const [advancedExportOpen, setAdvancedExportOpen] = React.useState(false);
  const [savedViewsOpen, setSavedViewsOpen] = React.useState(false);
  const [addColumnName, setAddColumnName] = React.useState('');
  const [addColumnError, setAddColumnError] = React.useState('');
  const [draggedColumn, setDraggedColumn] = React.useState<string | null>(null);

  const { control, handleSubmit, reset, formState: { errors: formErrors } } = useForm();

  const fileInputRef = useRef<HTMLInputElement>(null);


  // Sync column order with columns
  React.useEffect(() => {
    // Always run the hook, but do nothing if columns is empty
    if (columns.length === 0) return;
    const columnIds = new Set(columns.map(c => c.id));
    const orderedIds = new Set(columnOrder);
    if (columnIds.size !== orderedIds.size || ![...columnIds].every(id => orderedIds.has(id))) {
      setColumnOrder(columns.map(c => c.id));
    }
  }, [columns, columnOrder]);

  // Ensure all columns are editable (for existing columns)
  React.useEffect(() => {
    // Always run the hook, but do nothing if columns is empty
    if (columns.length === 0) return;
    if (columns.some(col => col.editable !== true)) {
      const updatedColumns = columns.map(col => ({ ...col, editable: true }));
      dispatch(setColumns(updatedColumns));
    }
  }, [columns, dispatch]);

  // Filtering, sorting, and pagination
  const visibleColumns = useMemo(() => {
    if (columns.length === 0) return [];
    return columns.filter(c => c.visible);
  }, [columns]);
  const filteredRows = useMemo(() => {
    if (rows.length === 0) return [];
    return filterRows(rows, columns, search, filters);
  }, [rows, columns, search, filters]);
  const sortedRows = useMemo(() => {
    if (filteredRows.length === 0) return [];
    return sortRows(filteredRows, sort);
  }, [filteredRows, sort]);
  const pagedRows = useMemo(() => {
    if (sortedRows.length === 0) return [];
    return sortedRows.slice(page * pageSize, page * pageSize + pageSize);
  }, [sortedRows, page, pageSize]);

  // Handlers
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setSearch(event.target.value));
  };

  const handleSort = (columnId: string) => {
    const isAsc = sort && sort.column === columnId && sort.direction === 'asc';
    dispatch(setSort({ column: columnId, direction: isAsc ? 'desc' : 'asc' }));
  };

  const handleSelectAllRows = (checked: boolean) => {
    if (checked) {
      const newSelecteds = pagedRows.map((n: DataTableRow) => n.id);
      dispatch(setSelectedRows(newSelecteds));
      return;
    }
    dispatch(setSelectedRows([]));
  };

  const handleSelectRow = (id: string) => {
    dispatch(toggleRowSelection(id));
  };

  const handlePageChange = (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    dispatch(setPage(newPage));
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    dispatch(setPageSize(parseInt(event.target.value, 10)));
    dispatch(setPage(0));
  };

  const handleEditRow = (id: string) => {
    const rowData = rows.find((r: DataTableRow) => r.id === id);
    if (rowData) {
      reset(rowData);
      dispatch(setEditingRows([...editingRows, id]));
    }
  };

  const handleSaveRow = (row: DataTableRow) => {
    handleSubmit(async (data: Partial<DataTableRow>) => {
      dispatch(updateRow({ id: row.id, changes: data }));
      dispatch(logActivity({ action: 'update', details: `Updated row ${row.id}` }));
      dispatch(setEditingRows(editingRows.filter((rowId: string) => rowId !== row.id)));
    })();
  };

  const handleCancelEdit = (id: string) => {
    dispatch(setEditingRows(editingRows.filter((rowId: string) => rowId !== id)));
  };

  const handleDeleteRow = (id: string) => {
    setDeleteDialog({ open: true, id });
  };

  const confirmDelete = () => {
    if (deleteDialog.id) {
      dispatch(deleteRow(deleteDialog.id));
      dispatch(logActivity({ action: 'delete', details: `Deleted row ${deleteDialog.id}` }));
      setDeleteDialog({ open: false, id: null });
    }
  };

  const handleToggleColumn = (columnId: string) => {
    const newColumns = columns.map((col: TableColumn) =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    dispatch(setColumns(newColumns));
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse<DataTableRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const importedData = results.data.map(row => ({ ...row, id: uuidv4() }));
          dispatch(setRows(importedData));
          dispatch(logActivity({ action: 'import', details: `Imported ${importedData.length} rows from ${file.name}` }));
          setImportDialogOpen(false);
        },
      });
    }
  };

  const handleAddRow = () => {
    const newRow: Partial<DataTableRow> = visibleColumns.reduce((acc: Partial<DataTableRow>, col: TableColumn) => {
      acc[col.id] = '';
      return acc;
    }, {});
    newRow.id = uuidv4();
    reset(newRow);
    dispatch(addRow(newRow as DataTableRow));
    dispatch(setEditingRows([...editingRows, newRow.id]));
    dispatch(logActivity({ action: 'create', details: `Created new row ${newRow.id}` }));
  };

  const handleAddColumn = () => {
    if (!addColumnName.trim()) {
      setAddColumnError('Column name cannot be empty.');
      return;
    }
    if (columns.some(c => c.label.toLowerCase() === addColumnName.trim().toLowerCase())) {
      setAddColumnError('Column name must be unique.');
      return;
    }

    const newColumn: TableColumn = {
      id: addColumnName.trim().toLowerCase().replace(/\s+/g, '_'),
      label: addColumnName.trim(),
      visible: true,
      editable: true,
    };
    dispatch(setColumns([...columns, newColumn]));
    setAddColumnName('');
    setAddColumnError('');
  };

  const handleDragStart = (id: string) => {
    setDraggedColumn(id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (targetId: string) => {
    if (!draggedColumn || draggedColumn === targetId) return;

    const newOrder = [...columnOrder];
    const dragIndex = newOrder.indexOf(draggedColumn);
    const targetIndex = newOrder.indexOf(targetId);

    newOrder.splice(dragIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);

    setColumnOrder(newOrder);
    const newColumns = newOrder.map(id => columns.find(c => c.id === id)).filter(Boolean) as TableColumn[];
    dispatch(setColumns(newColumns));
    setDraggedColumn(null);
  };

  const renderCell = (row: DataTableRow, column: TableColumn) => {
    if (editingRows.includes(row.id)) {
      return (
        <Controller
          name={column.id}
          control={control}
          defaultValue={row[column.id]}
          render={({ field }) => (
            <TextField
              {...field}
              size="small"
              fullWidth
              variant="standard"
              error={!!(formErrors as Record<string, unknown>)[column.id]}
              helperText={(formErrors as Record<string, { message: string }>)[column.id]?.message}
            />
          )}
        />
      );
    }
    return row[column.id];
  };

  const isIndeterminate = selectedRows.length > 0 && selectedRows.length < pagedRows.length;
  const isAllSelected = pagedRows.length > 0 && selectedRows.length === pagedRows.length;

  const isSelected = (id: string) => selectedRows.indexOf(id) !== -1;

  // Early return for loading state
  if (!tableState) {
    return <Box p={2}><Typography>Loading...</Typography></Box>;
  }

  return (
    <Box p={2}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h4">Dynamic Data Table Manager</Typography>
        <Box>
          <Tooltip title={theme.palette.mode === 'dark' ? 'Light Mode' : 'Dark Mode'}>
            <IconButton onClick={colorMode.toggleColorMode}>
              {theme.palette.mode === 'dark' ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Analytics Dashboard">
            <IconButton onClick={() => setAnalyticsDashboardOpen(true)}>
              <Analytics />
            </IconButton>
          </Tooltip>
          <Tooltip title="Saved Views">
            <IconButton onClick={() => setSavedViewsOpen(true)}>
              <Bookmark />
            </IconButton>
          </Tooltip>
          <Tooltip title="Advanced Filters">
            <IconButton onClick={() => setAdvancedFiltersOpen(true)}>
              <FilterAlt />
              {filters && filters.length > 0 && (
                <Chip
                  label={filters.length}
                  size="small"
                  color="primary"
                  sx={{ position: 'absolute', top: 0, right: 0, fontSize: '0.6rem' }}
                />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip title="Manage Columns">
            <IconButton onClick={() => setManageColumnsOpen(true)}>
              <ViewColumn />
            </IconButton>
          </Tooltip>
          <Tooltip title="Import CSV">
            <IconButton onClick={() => setImportDialogOpen(true)}>
              <UploadFile />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export Options">
            <IconButton onClick={() => setAdvancedExportOpen(true)}>
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box display="flex" alignItems="center" gap={2} mb={2} flexWrap="wrap">
        <TextField
          placeholder="Search..."
          value={search}
          onChange={handleSearch}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />
        <Button onClick={handleAddRow} variant="contained" startIcon={<Add />}>Add Row</Button>
      </Box>

      {/* Bulk Actions Component */}
      <BulkActions selectedCount={selectedRows.length} />

      <TableContainer component={Paper} sx={{ my: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={isIndeterminate}
                  checked={isAllSelected}
                  onChange={(e) => handleSelectAllRows(e.target.checked)}
                />
              </TableCell>
              {columnOrder
                .map(id => columns.find(c => c.id === id))
                .filter((c): c is TableColumn => !!c) // Type guard to filter out undefined
                .map((col: TableColumn) => (
                  col.visible && (
                    <TableCell
                      key={col.id}
                      sortDirection={sort?.column === col.id ? sort.direction : false}
                      style={{ cursor: 'pointer' }}
                      draggable
                      onDragStart={() => handleDragStart(col.id)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(col.id)}
                    >
                      <Box onClick={() => handleSort(col.id)} sx={{ display: 'flex', alignItems: 'center' }}>
                        {col.label}
                        {sort?.column === col.id ? (
                          <Box component="span" sx={{
                            border: 0,
                            clip: 'rect(0 0 0 0)',
                            height: 1,
                            m: -1,
                            overflow: 'hidden',
                            p: 0,
                            position: 'absolute',
                            top: 20,
                            width: 1,
                          }}>
                            {sort.direction === 'desc' ? 'sorted descending' : 'sorted ascending'}
                          </Box>
                        ) : null}
                      </Box>
                    </TableCell>
                  )
              ))}
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedRows.map((row: DataTableRow) => {
              const isItemSelected = isSelected(row.id);
              return (
                <TableRow key={row.id} selected={isItemSelected}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isItemSelected}
                      onClick={() => handleSelectRow(row.id)}
                    />
                  </TableCell>
                  {columnOrder
                    .map(id => columns.find(c => c.id === id))
                    .filter((c): c is TableColumn => !!c)
                    .map((col: TableColumn) => (
                      col.visible && (
                        <TableCell key={col.id}>{renderCell(row, col)}</TableCell>
                      )
                  ))}
                  <TableCell>
                    {editingRows.includes(row.id) ? (
                      <>
                        <IconButton onClick={() => handleSaveRow(row)} size="small"><Save /></IconButton>
                        <IconButton onClick={() => handleCancelEdit(row.id)} size="small"><Cancel /></IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton onClick={() => handleEditRow(row.id)} size="small"><Edit /></IconButton>
                        <IconButton onClick={() => handleDeleteRow(row.id)} size="small"><Delete /></IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredRows.length}
        rowsPerPage={pageSize}
        page={page}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
      />

      {/* Dialogs and Modals */}
      <Dialog open={manageColumnsOpen} onClose={() => setManageColumnsOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Manage Columns</DialogTitle>
        <DialogContent>
          <List>
            {columns.map((col: TableColumn) => (
              <ListItem key={col.id} dense>
                <ListItemText primary={col.label} />
                <ListItemSecondaryAction>
                  <Checkbox
                    edge="end"
                    onChange={() => handleToggleColumn(col.id)}
                    checked={col.visible}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1">Add New Column</Typography>
          <Box display="flex" gap={1} mt={1}>
            <TextField
              label="New Column Name"
              value={addColumnName}
              onChange={(e) => setAddColumnName(e.target.value)}
              size="small"
              fullWidth
              error={!!addColumnError}
              helperText={addColumnError}
            />
            <Button onClick={handleAddColumn} variant="contained" startIcon={<Add />}>Add</Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageColumnsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)}>
        <DialogTitle>Import from CSV</DialogTitle>
        <DialogContent>
          <Button variant="contained" component="label">
            Upload File
            <input type="file" hidden accept=".csv" onChange={handleImportCSV} ref={fileInputRef} />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null })}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this row? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null })}>Cancel</Button>
          <Button onClick={confirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={advancedFiltersOpen} onClose={() => setAdvancedFiltersOpen(false)} fullWidth maxWidth="md">
        <AdvancedFilters open={advancedFiltersOpen} onClose={() => setAdvancedFiltersOpen(false)} />
      </Dialog>

      <Dialog open={analyticsDashboardOpen} onClose={() => setAnalyticsDashboardOpen(false)} fullWidth maxWidth="lg">
        <AnalyticsDashboard open={analyticsDashboardOpen} onClose={() => setAnalyticsDashboardOpen(false)} />
      </Dialog>

      <Dialog open={advancedExportOpen} onClose={() => setAdvancedExportOpen(false)} fullWidth maxWidth="sm">
        <AdvancedExport open={advancedExportOpen} onClose={() => setAdvancedExportOpen(false)} />
      </Dialog>

      <Dialog open={savedViewsOpen} onClose={() => setSavedViewsOpen(false)} fullWidth maxWidth="sm">
        <SavedViews open={savedViewsOpen} onClose={() => setSavedViewsOpen(false)} />
      </Dialog>
    </Box>
  );
}

"use client";
import React from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  Typography,
  Divider,
  Alert,
} from '@mui/material';
import { Download, PictureAsPdf, TableChart } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { TableColumn, TableRow, ColumnFilter } from '../tableSlice';
import Papa from 'papaparse';
import FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SelectChangeEvent } from '@mui/material';

interface AdvancedExportProps {
  open: boolean;
  onClose: () => void;
}

type ExportFormat = 'csv' | 'pdf' | 'json';
type ExportScope = 'all' | 'visible' | 'selected' | 'filtered';

export default function AdvancedExport({ open, onClose }: AdvancedExportProps) {
  const {
    columns = [],
    rows = [],
    selectedRows = [],
    search = '',
    filters = [],
  } = useSelector((state: RootState) => state.table || {});
  const [format, setFormat] = React.useState<ExportFormat>('csv');
  const [scope, setScope] = React.useState<ExportScope>('visible');
  const [fileName, setFileName] = React.useState('table_export');
  const [includeHeaders, setIncludeHeaders] = React.useState(true);
  const [includeMetadata, setIncludeMetadata] = React.useState(false);

  // Filter and prepare data based on scope
  const getExportData = (): { rows: TableRow[]; columns: TableColumn[] } => {
    let exportRows: TableRow[] = rows;
    let exportColumns: TableColumn[] = columns;

    // Apply scope filter
    switch (scope) {
      case 'visible':
        exportColumns = columns.filter((col: TableColumn) => col.visible);
        break;
      case 'selected':
        if (selectedRows.length === 0) {
          return { rows: [], columns: [] };
        }
        exportRows = rows.filter((row: TableRow) => selectedRows.includes(row.id));
        exportColumns = columns.filter((col: TableColumn) => col.visible);
        break;
      case 'filtered':
        // Apply search filter
        if (search) {
          const searchLower = search.toLowerCase();
          exportRows = exportRows.filter((row: TableRow) =>
            columns.some((col: TableColumn) => 
              col.visible && String(row[col.id as keyof TableRow] ?? '').toLowerCase().includes(searchLower)
            )
          );
        }
        // Apply advanced filters
        exportRows = exportRows.filter((row: TableRow) => {
          return filters.every((filter: ColumnFilter) => {
            const value = row[filter.column as keyof TableRow];
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
                return value === null || value === undefined || String(value).trim() === '';
              case 'isNotEmpty':
                return value !== null && value !== undefined && String(value).trim() !== '';
              default:
                return true;
            }
          });
        });
        exportColumns = columns.filter((col: TableColumn) => col.visible);
        break;
      case 'all':
      default:
        // No filtering needed for rows, but filter columns by visibility
        exportColumns = columns.filter((col: TableColumn) => col.visible);
        break;
    }

    return { rows: exportRows, columns: exportColumns };
  };

  const handleExport = () => {
    const { rows: dataToExport, columns: columnsToExport } = getExportData();

    if (dataToExport.length === 0) {
      alert('No data to export.');
      return;
    }

    const headers = columnsToExport.map(col => col.label);
    const data = dataToExport.map(row =>
      columnsToExport.map(col => row[col.id as keyof TableRow])
    );

    let metadata = '';
    if (includeMetadata) {
      metadata += `Export Date: ${new Date().toLocaleString()}\n`;
      metadata += `Export Scope: ${scope}\n`;
      metadata += `Total Rows: ${dataToExport.length}\n`;
      metadata += `Total Columns: ${columnsToExport.length}\n\n`;
    }

    switch (format) {
      case 'csv':
        const csvData = Papa.unparse({
          fields: headers,
          data: data,
        });
        const blob = new Blob([metadata + csvData], { type: 'text/csv;charset=utf-8;' });
        FileSaver.saveAs(blob, `${fileName}.csv`);
        break;

      case 'pdf':
        const doc = new jsPDF();
        if (includeMetadata) {
          doc.text(metadata, 10, 10);
        }
        autoTable(doc, {
          head: [headers],
          body: data.map(row => row.map(cell => String(cell ?? ''))),
          startY: includeMetadata ? 40 : 10,
        });
        doc.save(`${fileName}.pdf`);
        break;

      case 'json':
        const jsonData = dataToExport.map(row => {
          const obj: { [key: string]: unknown } = {};
          columnsToExport.forEach(col => {
            obj[col.id] = row[col.id as keyof TableRow];
          });
          return obj;
        });
        const jsonBlob = new Blob(
          [metadata + JSON.stringify(jsonData, null, 2)],
          { type: 'application/json;charset=utf-8;' }
        );
        FileSaver.saveAs(jsonBlob, `${fileName}.json`);
        break;
    }
    onClose();
  };

  const { rows: previewRows } = getExportData();
  const canExport = previewRows.length > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Download />
          Advanced Export
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={3}>
          {/* Export Format */}
          <FormControl fullWidth>
            <InputLabel>Export Format</InputLabel>
            <Select
              value={format}
              label="Export Format"
              onChange={(e: SelectChangeEvent) => setFormat(e.target.value as ExportFormat)}
              fullWidth
            >
              <MenuItem value="csv">
                <Box display="flex" alignItems="center" gap={1}>
                  <TableChart />
                  CSV (Comma Separated Values)
                </Box>
              </MenuItem>
              <MenuItem value="pdf">
                <Box display="flex" alignItems="center" gap={1}>
                  <PictureAsPdf />
                  PDF (Portable Document Format)
                </Box>
              </MenuItem>
              <MenuItem value="json">
                <Box display="flex" alignItems="center" gap={1}>
                  <Download />
                  JSON (JavaScript Object Notation)
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {/* Export Scope */}
          <FormControl fullWidth>
            <InputLabel>Export Scope</InputLabel>
            <Select
              value={scope}
              label="Export Scope"
              onChange={(e: SelectChangeEvent) => setScope(e.target.value as ExportScope)}
              fullWidth
            >
              <MenuItem value="all">All Data ({rows.length} rows)</MenuItem>
              <MenuItem value="visible">
                Visible Columns Only ({columns.filter((col: TableColumn) => col.visible).length} columns)
              </MenuItem>
              <MenuItem value="selected">
                Selected Rows Only ({selectedRows.length} rows)
              </MenuItem>
              <MenuItem value="filtered">
                Filtered Data ({previewRows.length} rows)
              </MenuItem>
            </Select>
          </FormControl>

          {/* File Name */}
          <TextField
            label="File Name"
            value={fileName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFileName(e.target.value)}
            fullWidth
            margin="dense"
            helperText="File extension will be added automatically"
          />

          <Divider />

          {/* Options */}
          <Typography variant="h6">Export Options</Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={includeHeaders}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIncludeHeaders(e.target.checked)}
                name="includeHeaders"
                color="primary"
              />
            }
            label="Include Column Headers"
          />

          <FormControlLabel
            control={
              <Switch
                checked={includeMetadata}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIncludeMetadata(e.target.checked)}
                name="includeMetadata"
                color="primary"
              />
            }
            label="Include Export Metadata"
          />

          {/* Preview */}
          {!canExport && (
            <Alert severity="warning">
              No data to export with current scope selection.
            </Alert>
          )}

          {canExport && (
            <Alert severity="info">
              Ready to export {previewRows.length} rows in {format.toUpperCase()} format.
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleExport}
          variant="contained"
          disabled={!canExport || !fileName.trim()}
          startIcon={<Download />}
        >
          Export {format.toUpperCase()}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

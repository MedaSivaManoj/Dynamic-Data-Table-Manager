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
  Typography,
  Chip,
  Stack,
} from '@mui/material';
import { Add, FilterAlt, Clear } from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setFilters, addFilter, removeFilter } from '../tableSlice';
import type { ColumnFilter, FilterOperator, TableColumn } from '../tableSlice';
import { SelectChangeEvent } from '@mui/material';

interface AdvancedFiltersProps {
  open: boolean;
  onClose: () => void;
}

const FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith', label: 'Ends With' },
  { value: 'greaterThan', label: 'Greater Than' },
  { value: 'lessThan', label: 'Less Than' },
  { value: 'between', label: 'Between' },
  { value: 'isEmpty', label: 'Is Empty' },
  { value: 'isNotEmpty', label: 'Is Not Empty' },
];

export default function AdvancedFilters({ open, onClose }: AdvancedFiltersProps) {
  const dispatch = useDispatch();
  const { columns = [], filters = [] } = useSelector((state: RootState) => state.table) || {};
  const [currentFilter, setCurrentFilter] = React.useState<Partial<ColumnFilter>>({
    column: '',
    operator: 'equals',
    value: '',
  });

  const visibleColumns: TableColumn[] = Array.isArray(columns) ? columns.filter((col: TableColumn) => col.visible) : [];

  const handleAddFilter = () => {
    if (currentFilter.column && currentFilter.operator && currentFilter.value !== '') {
      dispatch(addFilter(currentFilter as ColumnFilter));
      setCurrentFilter({ column: '', operator: 'equals', value: '' });
    }
  };

  const handleRemoveFilter = (index: number) => {
    dispatch(removeFilter(index));
  };

  const handleClearAllFilters = () => {
    dispatch(setFilters([]));
  };

  const getOperatorsForColumn = (column: TableColumn) => {
    switch (column.type) {
      case 'number':
        return FILTER_OPERATORS.filter(op => 
          ['equals', 'greaterThan', 'lessThan', 'between', 'isEmpty', 'isNotEmpty'].includes(op.value)
        );
      case 'date':
        return FILTER_OPERATORS.filter(op => 
          ['equals', 'greaterThan', 'lessThan', 'between', 'isEmpty', 'isNotEmpty'].includes(op.value)
        );
      case 'select':
        return FILTER_OPERATORS.filter(op => 
          ['equals', 'isEmpty', 'isNotEmpty'].includes(op.value)
        );
      default:
        return FILTER_OPERATORS;
    }
  };

  const selectedColumn = visibleColumns.find((col: TableColumn) => col.id === currentFilter.column);
  const availableOperators = selectedColumn ? getOperatorsForColumn(selectedColumn) : FILTER_OPERATORS;

  const renderFilterValue = () => {
    if (!selectedColumn) return null;

    const needsValue = !['isEmpty', 'isNotEmpty'].includes(currentFilter.operator || '');
    if (!needsValue) return null;

    if (currentFilter.operator === 'between') {
      return (
        <Box display="flex" gap={1} alignItems="center">
          <TextField
            label="Value 1"
            value={currentFilter.value || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentFilter({ ...currentFilter, value: e.target.value })}
            fullWidth
          />
          <Typography>and</Typography>
          <TextField
            label="Value 2"
            value={currentFilter.value2 || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentFilter({ ...currentFilter, value2: e.target.value })}
            fullWidth
          />
        </Box>
      );
    }

    if (selectedColumn.type === 'select' && selectedColumn.options) {
      return (
        <FormControl fullWidth margin="dense">
          <InputLabel>Value</InputLabel>
          <Select
            value={currentFilter.value}
            onChange={(e: SelectChangeEvent<string | number>) => setCurrentFilter({ ...currentFilter, value: e.target.value })}
          >
            {selectedColumn.options.map((option: string) => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    return (
      <TextField
        label="Value"
        type={selectedColumn.type === 'number' ? 'number' : 'text'}
        value={currentFilter.value || ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentFilter({ ...currentFilter, value: e.target.value })}
        fullWidth
        margin="dense"
      />
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <FilterAlt />
          Advanced Filters
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <FormControl fullWidth margin="dense">
            <InputLabel>Column</InputLabel>
            <Select
              value={currentFilter.column}
              onChange={(e: SelectChangeEvent<string>) =>
                setCurrentFilter({ ...currentFilter, column: e.target.value, operator: 'equals', value: '' })
              }
            >
              {visibleColumns.map((col: TableColumn) => (
                <MenuItem key={col.id} value={col.id}>{col.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="dense" disabled={!currentFilter.column}>
            <InputLabel>Operator</InputLabel>
            <Select
              value={currentFilter.operator}
              onChange={(e: SelectChangeEvent<FilterOperator>) =>
                setCurrentFilter({ ...currentFilter, operator: e.target.value as FilterOperator })
              }
            >
              {availableOperators.map((op: { value: FilterOperator; label: string }) => (
                <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {renderFilterValue()}

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddFilter}
            disabled={!currentFilter.column || (!['isEmpty', 'isNotEmpty'].includes(currentFilter.operator || '') && !currentFilter.value)}
          >
            Add Filter
          </Button>
        </Stack>

        {/* Current Filters */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Active Filters {(Array.isArray(filters) && filters.length) || 0}
          </Typography>
          {Array.isArray(filters) && filters.length > 0 ? (
            <Box display="flex" flexWrap="wrap" gap={1}>
              {filters.map((filter: ColumnFilter, index: number) => {
                const column = columns.find((c: TableColumn) => c.id === filter.column);
                return (
                  <Chip
                    key={index}
                    label={`${column?.label || filter.column} ${filter.operator} ${filter.value}${filter.value2 ? ` - ${filter.value2}` : ''}`}
                    onDelete={() => handleRemoveFilter(index)}
                    color="primary"
                    variant="outlined"
                  />
                );
              })}
            </Box>
          ) : (
            <Typography variant="body2" color="textSecondary">
              No active filters.
            </Typography>
          )}
          {filters.length > 0 && (
            <Button
              startIcon={<Clear />}
              onClick={handleClearAllFilters}
              sx={{ mt: 1 }}
            >
              Clear All Filters
            </Button>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

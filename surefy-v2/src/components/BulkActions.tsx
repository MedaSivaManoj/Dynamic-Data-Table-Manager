"use client";
import React from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Typography,
  Alert,
} from '@mui/material';
import {
  Delete,
  Edit,
  ContentCopy,
  KeyboardArrowDown,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { bulkDeleteRows, bulkUpdateRows, addRow, logActivity, setSelectedRows, TableRow, TableColumn } from '../tableSlice';
import { v4 as uuidv4 } from 'uuid';
import { SelectChangeEvent } from '@mui/material';

interface BulkActionsProps {
  selectedCount: number;
}

export default function BulkActions({ selectedCount }: BulkActionsProps) {
  const dispatch = useDispatch();
  const { selectedRows, rows, columns } = useSelector((state: RootState) => state.table);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editField, setEditField] = React.useState('');
  const [editValue, setEditValue] = React.useState('');

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleBulkDelete = () => {
    dispatch(bulkDeleteRows(selectedRows));
    dispatch(logActivity({
      action: 'delete',
      details: `Bulk deleted ${selectedRows.length} rows`,
    }));
    setDeleteDialogOpen(false);
    handleMenuClose();
  };

  const handleBulkEdit = () => {
    if (editField && editValue) {
      dispatch(bulkUpdateRows({
        ids: selectedRows,
        updates: { [editField]: editValue },
      }));
      dispatch(logActivity({
        action: 'update',
        details: `Bulk updated ${selectedRows.length} rows: ${editField} = ${editValue}`,
      }));
      setEditDialogOpen(false);
      setEditField('');
      setEditValue('');
      handleMenuClose();
    }
  };

  const handleBulkDuplicate = () => {
    const selectedRowsData = rows.filter((row: TableRow) => selectedRows.includes(row.id));
    const duplicatedRows = selectedRowsData.map((row: TableRow) => ({
      ...row,
      id: uuidv4(),
      name: `${row.name} (Copy)`,
    }));
    
    duplicatedRows.forEach((row: TableRow) => {
      dispatch(addRow(row));
    });
    
    dispatch(logActivity({
      action: 'create',
      details: `Duplicated ${selectedRows.length} rows`,
    }));
    dispatch(setSelectedRows([]));
    handleMenuClose();
  };

  if (selectedCount === 0) return null;

  return (
    <Box>
      <Button
        variant="contained"
        color="primary"
        onClick={handleMenuOpen}
        endIcon={<KeyboardArrowDown />}
        sx={{ mr: 1 }}
      >
        Bulk Actions ({selectedCount})
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => setEditDialogOpen(true)}>
          <ListItemIcon>
            <Edit />
          </ListItemIcon>
          <ListItemText>Edit Selected</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleBulkDuplicate}>
          <ListItemIcon>
            <ContentCopy />
          </ListItemIcon>
          <ListItemText>Duplicate Selected</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setDeleteDialogOpen(true)}>
          <ListItemIcon>
            <Delete />
          </ListItemIcon>
          <ListItemText>Delete Selected</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Bulk Delete</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography>
              Are you sure you want to delete {selectedCount} selected rows? This action cannot be undone.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleBulkDelete} color="error" variant="contained">
            Delete {selectedCount} Rows
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Bulk Edit Selected Rows</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Select a field and a new value to apply to all {selectedCount} selected rows.
          </Typography>
          <FormControl fullWidth margin="dense">
            <InputLabel>Field to Update</InputLabel>
            <Select
              value={editField}
              onChange={(e: SelectChangeEvent<string>) => setEditField(e.target.value)}
              label="Field to Update"
            >
              {columns
                .filter((col: TableColumn) => col.editable)
                .map((col: TableColumn) => (
                  <MenuItem key={col.id} value={col.id}>{col.label}</MenuItem>
                ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="New Value"
            fullWidth
            value={editValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditValue(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setEditDialogOpen(false);
            setEditField('');
            setEditValue('');
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleBulkEdit} 
            variant="contained"
            disabled={!editField || !editValue}
          >
            Update {selectedCount} Rows
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

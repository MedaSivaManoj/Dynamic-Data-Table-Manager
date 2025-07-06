"use client";
import React from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Typography,
  Chip,
  Divider,
  Alert,
} from '@mui/material';
import {
  Bookmark,
  Delete,
  Restore,
  Save,
  Visibility,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { saveView, loadView, deleteSavedView, logActivity } from '../tableSlice';
import { format } from 'date-fns';

interface SavedViewsProps {
  open: boolean;
  onClose: () => void;
}

export default function SavedViews({ open, onClose }: SavedViewsProps) {
  const dispatch = useDispatch();
  const {
    columns = [],
    filters = [],
    sort = null,
    search = '',
    savedViews = [],
  } = useSelector((state: RootState) => state.table) || {};
  const [viewName, setViewName] = React.useState('');
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);

  const handleSaveCurrentView = () => {
    if (!viewName.trim()) return;
    
    dispatch(saveView({
      name: viewName.trim(),
      columns,
      filters,
      sort,
      search,
    }));
    
    dispatch(logActivity({
      action: 'create',
      details: `Saved view: ${viewName}`,
    }));
    
    setViewName('');
    setSaveDialogOpen(false);
  };

  const handleLoadView = (viewId: string) => {
    const view = savedViews.find(v => v.id === viewId);
    if (view) {
      dispatch(loadView(viewId));
      dispatch(logActivity({
        action: 'update',
        details: `Loaded view: ${view.name}`,
      }));
      onClose();
    }
  };

  const handleDeleteView = (viewId: string) => {
    const view = savedViews.find(v => v.id === viewId);
    if (view) {
      dispatch(deleteSavedView(viewId));
      dispatch(logActivity({
        action: 'delete',
        details: `Deleted view: ${view.name}`,
      }));
    }
  };

  const getCurrentViewSummary = () => {
    const visibleColumns = columns.filter(col => col.visible).length;
    const appliedFilters = filters.length;
    const hasSearch = search.trim().length > 0;
    const hasSort = sort !== null;
    
    return {
      visibleColumns,
      appliedFilters,
      hasSearch,
      hasSort,
    };
  };

  const summary = getCurrentViewSummary();

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Bookmark />
            Saved Views
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3}>
            {/* Current View Summary */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Current View
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                <Chip
                  icon={<Visibility />}
                  label={`${summary.visibleColumns} visible columns`}
                  size="small"
                />
                {summary.appliedFilters > 0 && (
                  <Chip
                    label={`${summary.appliedFilters} filters`}
                    size="small"
                    color="primary"
                  />
                )}
                {summary.hasSearch && (
                  <Chip
                    label="Search active"
                    size="small"
                    color="secondary"
                  />
                )}
                {summary.hasSort && (
                  <Chip
                    label="Sorted"
                    size="small"
                    color="info"
                  />
                )}
              </Box>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={() => setSaveDialogOpen(true)}
              >
                Save Current View
              </Button>
            </Box>

            <Divider />

            {/* Saved Views List */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Saved Views ({savedViews.length})
              </Typography>
              
              {savedViews.length === 0 ? (
                <Alert severity="info">
                  No saved views yet. Save your current table configuration to create your first view.
                </Alert>
              ) : (
                <List>
                  {savedViews.map((view) => (
                    <ListItem key={view.id} divider>
                      <ListItemText
                        primary={view.name}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Saved: {format(new Date(view.timestamp), 'MMM dd, yyyy HH:mm')}
                            </Typography>
                            <Box display="flex" flexWrap="wrap" gap={0.5} mt={1}>
                              <Chip
                                label={`${view.columns.filter(col => col.visible).length} columns`}
                                size="small"
                                variant="outlined"
                              />
                              {view.filters.length > 0 && (
                                <Chip
                                  label={`${view.filters.length} filters`}
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                />
                              )}
                              {view.search && (
                                <Chip
                                  label="search"
                                  size="small"
                                  variant="outlined"
                                  color="secondary"
                                />
                              )}
                              {view.sort && (
                                <Chip
                                  label={`sorted by ${view.sort.column}`}
                                  size="small"
                                  variant="outlined"
                                  color="info"
                                />
                              )}
                            </Box>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleLoadView(view.id)}
                          sx={{ mr: 1 }}
                        >
                          <Restore />
                        </IconButton>
                        <IconButton
                          edge="end"
                          onClick={() => handleDeleteView(view.id)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Save View Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Current View</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="View Name"
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            helperText="Give your view a descriptive name"
            sx={{ mt: 1 }}
          />
          
          <Box mt={2}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              This view will save:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary={`Column visibility (${summary.visibleColumns} visible)`} />
              </ListItem>
              {summary.appliedFilters > 0 && (
                <ListItem>
                  <ListItemText primary={`Applied filters (${summary.appliedFilters})`} />
                </ListItem>
              )}
              {summary.hasSearch && (
                <ListItem>
                  <ListItemText primary="Current search query" />
                </ListItem>
              )}
              {summary.hasSort && (
                <ListItem>
                  <ListItemText primary="Current sort order" />
                </ListItem>
              )}
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveCurrentView}
            variant="contained"
            disabled={!viewName.trim()}
          >
            Save View
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

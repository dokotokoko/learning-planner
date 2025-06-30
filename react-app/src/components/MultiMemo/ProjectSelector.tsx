import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
} from '@mui/material';
import {
  Folder as ProjectIcon,
  FolderOpen as AllIcon,
} from '@mui/icons-material';

import { Project } from './MultiMemoManager';

interface ProjectSelectorProps {
  projects: Project[];
  selectedProject: number | null;
  onProjectChange: (projectId: number | null) => void;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  selectedProject,
  onProjectChange,
}) => {
  return (
    <FormControl fullWidth size="small">
      <InputLabel>プロジェクト</InputLabel>
      <Select
        value={selectedProject || ''}
        label="プロジェクト"
        onChange={(e) => {
          const value = e.target.value;
          onProjectChange(value === '' ? null : Number(value));
        }}
        startAdornment={
          selectedProject ? (
            <ProjectIcon sx={{ mr: 1, color: 'text.secondary' }} />
          ) : (
            <AllIcon sx={{ mr: 1, color: 'text.secondary' }} />
          )
        }
      >
        <MenuItem value="">
          <Box display="flex" alignItems="center">
            <AllIcon sx={{ mr: 1, color: 'text.secondary' }} />
            すべてのメモ
          </Box>
        </MenuItem>
        {projects.map((project) => (
          <MenuItem key={project.id} value={project.id}>
            <Box 
              display="flex" 
              alignItems="center" 
              justifyContent="space-between"
              width="100%"
            >
              <Box display="flex" alignItems="center">
                <ProjectIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="body2">
                    {project.title}
                  </Typography>
                  {project.description && (
                    <Typography variant="caption" color="textSecondary">
                      {project.description.length > 30 
                        ? project.description.substring(0, 30) + '...'
                        : project.description
                      }
                    </Typography>
                  )}
                </Box>
              </Box>
              <Chip
                label={project.memo_count}
                size="small"
                variant="outlined"
                sx={{ ml: 1 }}
              />
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default ProjectSelector; 
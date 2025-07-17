import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import MemoEditor from '../components/MultiMemo/MemoEditor';
import { MultiMemo } from '../components/MultiMemo/MultiMemoManager';

const MemoDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [memo, setMemo] = useState<MultiMemo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  const fetchMemoAndTags = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth-token');
      
      // Fetch memo
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const memoResponse = await fetch(`${apiBaseUrl}/memos/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });
      if (!memoResponse.ok) {
        throw new Error('Failed to fetch memo');
      }
      const memoData = await memoResponse.json();
      setMemo(memoData);

      // Fetch all tags
      const tagsResponse = await fetch(`${apiBaseUrl}/tags`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });
      if (!tagsResponse.ok) {
        throw new Error('Failed to fetch tags');
      }
      const tagsData = await tagsResponse.json();
      setAllTags(tagsData);

    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMemoAndTags();
  }, [fetchMemoAndTags]);

  const handleSave = async (memoData: Partial<MultiMemo>) => {
    if (!id) return;
    try {
      const token = localStorage.getItem('auth-token');
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/memos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(memoData),
      });
      if (!response.ok) {
        throw new Error('Failed to update memo');
      }
      navigate('/memos'); // Navigate back to the memo board after saving
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleCancel = () => {
    navigate('/memos'); // Navigate back to the memo board without saving
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  if (!memo) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>Memo not found.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, height: '100vh', overflow: 'auto' }}>
      <MemoEditor
        memo={memo}
        onSave={handleSave}
        onCancel={handleCancel}
        availableTags={allTags}
      />
    </Box>
  );
};

export default MemoDetailPage;

/**
 * 🔧 Ingestion API Service - 4Cima Complete Rebuild
 * 
 * @description Admin operations for ingestion pipeline management
 * @author 4Cima Team
 * 
 * ⚠️ CRITICAL: Connects to new Express server on Koyeb
 * ⚠️ All ingestion operations use Turso via Express API
 */

import { CONFIG } from '../lib/constants';
import { supabase } from '../lib/supabase';

// API Base URL - points to new Express server
const API_BASE = CONFIG.API_BASE || process.env.NEXT_PUBLIC_API_URL || 'https://api.4cima.com';

// API Key for authentication
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

/**
 * Helper: Get Supabase JWT token for admin authentication
 */
async function getAuthToken(): Promise<string> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[IngestionAPI] Auth error:', error);
      return '';
    }
    return session?.access_token || '';
  } catch (error: any) {
    console.error('[IngestionAPI] Failed to get auth token:', error);
    return '';
  }
}

/**
 * Helper: Fetch with authentication headers
 */
async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Add API Key if available
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }

  // Add Authorization token for admin routes
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || response.statusText);
  }

  return response.json();
}

// ==========================================
// Ingestion Statistics
// ==========================================

export interface IngestionStats {
  total: number;
  pending: number;
  processing: number;
  success: number;
  failed: number;
  skipped: number;
  isProcessing: boolean;
}

/**
 * Get ingestion statistics
 */
export async function getIngestionStats(): Promise<IngestionStats> {
  return fetchWithAuth('/api/admin/ingestion/stats');
}

// ==========================================
// Ingestion Log
// ==========================================

export interface IngestionLogItem {
  id: string;
  external_source: string;
  external_id: string;
  content_type: 'movie' | 'tv_series' | 'game' | 'software' | 'actor';
  status: 'pending' | 'processing' | 'success' | 'failed' | 'skipped';
  retry_count: number;
  last_error: string | null;
  last_attempted_at: string | null;
  next_retry_at: string | null;
  processed_at: string | null;
  result_id: string | null;
  result_slug: string | null;
  requested_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface IngestionLogResponse {
  data: IngestionLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Get ingestion log with filters and pagination
 */
export async function getIngestionLog(params: {
  page?: number;
  limit?: number;
  status?: string;
  contentType?: string;
}): Promise<IngestionLogResponse> {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.status) queryParams.append('status', params.status);
  if (params.contentType) queryParams.append('contentType', params.contentType);

  return fetchWithAuth(`/api/admin/ingestion/log?${queryParams.toString()}`);
}

// ==========================================
// Queue Management
// ==========================================

export interface QueueItem {
  externalSource: 'TMDB' | 'RAWG' | 'IGDB' | 'MANUAL';
  externalId: string;
  contentType: 'movie' | 'tv_series' | 'game' | 'software' | 'actor';
  notes?: string;
}

/**
 * Queue new items for ingestion
 */
export async function queueItems(items: QueueItem[]): Promise<{ success: boolean; queued: number; message: string }> {
  return fetchWithAuth('/api/admin/ingestion/queue', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

/**
 * Re-queue failed items
 */
export async function requeueFailed(): Promise<{ success: boolean; requeued: number; message: string }> {
  return fetchWithAuth('/api/admin/ingestion/requeue-failed', {
    method: 'POST',
  });
}

/**
 * Trigger batch processing
 */
export async function triggerProcessing(maxBatches: number = 1): Promise<{ success: boolean; message: string }> {
  return fetchWithAuth('/api/admin/ingestion/process', {
    method: 'POST',
    body: JSON.stringify({ maxBatches }),
  });
}

// ==========================================
// Bulk Operations
// ==========================================

/**
 * Parse CSV content and queue items
 */
export function parseCSV(csvContent: string): QueueItem[] {
  const lines = csvContent.trim().split('\n');
  const items: QueueItem[] = [];

  // Skip header if exists
  const startIndex = lines[0].toLowerCase().includes('source') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const [source, id, type, notes] = line.split(',').map(s => s.trim());

    if (source && id && type) {
      items.push({
        externalSource: source.toUpperCase() as QueueItem['externalSource'],
        externalId: id,
        contentType: type.toLowerCase() as QueueItem['contentType'],
        notes: notes || undefined,
      });
    }
  }

  return items;
}

/**
 * Queue items from CSV file
 */
export async function queueFromCSV(file: File): Promise<{ success: boolean; queued: number; message: string }> {
  const content = await file.text();
  const items = parseCSV(content);

  if (items.length === 0) {
    throw new Error('No valid items found in CSV file');
  }

  return queueItems(items);
}

// ==========================================
// Export all functions
// ==========================================

export default {
  getIngestionStats,
  getIngestionLog,
  queueItems,
  requeueFailed,
  triggerProcessing,
  parseCSV,
  queueFromCSV,
};

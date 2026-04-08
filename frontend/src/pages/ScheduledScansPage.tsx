/**
 * ScheduledScansPage — Manage recurring and one-time scheduled scans.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { SectionHeader } from '../components/shared';
import { scheduledScanApi } from '../api/index';
import ScheduledScanForm from '../components/ScheduledScanForm';
import ScheduledScanList, { ScheduledScanRecord } from '../components/ScheduledScanList';

export default function ScheduledScansPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<ScheduledScanRecord[]>({
    queryKey: ['scheduled-scans'],
    queryFn: scheduledScanApi.list,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['scheduled-scans'] });
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">

      {/* Header */}
      <SectionHeader
        title="Scheduled Scans"
        subtitle="Automate recurring quantum-exposure scans for your domains"
      />

      {/* Create form */}
      <ScheduledScanForm onSuccess={handleRefresh} />

      {/* Loading state */}
      {isLoading && (
        <div className="glass-card border rounded-xl p-12 flex items-center justify-center gap-3 text-secondary"
          style={{ borderColor: 'var(--glass-border)' }}>
          <RefreshCw size={18} className="animate-spin text-indigo-400" />
          <span className="text-sm">Loading scheduled scans…</span>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          Failed to load scheduled scans. Please try refreshing the page.
        </div>
      )}

      {/* List */}
      {!isLoading && !isError && (
        <ScheduledScanList
          schedules={data ?? []}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}

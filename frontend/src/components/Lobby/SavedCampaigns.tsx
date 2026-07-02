import { useState, useEffect, useCallback } from 'react';
import { Play, Check, Close, Reload, Trash } from 'pixelarticons/react';
import { SavedCampaignInfo } from '../../types/game.types';
import { useSocket } from '../../hooks/useSocket';

interface SavedCampaignsProps {
  onResume: (campaignId: string) => Promise<void>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function SavedCampaigns({ onResume }: SavedCampaignsProps) {
  const { listSavedCampaigns, deleteSavedCampaign } = useSocket();
  const [campaigns, setCampaigns] = useState<SavedCampaignInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listSavedCampaigns().then((data) => {
      setCampaigns(data);
      setLoading(false);
    });
  }, [listSavedCampaigns]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const handleResume = async (campaignId: string) => {
    setResumingId(campaignId);
    try {
      await onResume(campaignId);
    } catch {
      setResumingId(null);
    }
  };

  const handleDelete = async (campaignId: string) => {
    setDeletingId(campaignId);
    const ok = await deleteSavedCampaign(campaignId);
    if (ok) {
      setConfirmingDelete(null);
      refresh();
    }
    setDeletingId(null);
  };

  if (loading) {
    return (
      <div className="pixel-border bg-dungeon-500 p-6 rounded-none">
        <h2 className="text-pixel text-gold text-lg mb-4">RESUME CAMPAIGN</h2>
        <p className="text-mono text-dungeon-100 text-center py-8">Loading saved campaigns...</p>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="pixel-border bg-dungeon-500 p-6 rounded-none">
        <h2 className="text-pixel text-gold text-lg mb-4">RESUME CAMPAIGN</h2>
        <p className="text-mono text-dungeon-100 text-center py-8">No saved campaigns found.</p>
      </div>
    );
  }

  return (
    <div className="pixel-border bg-dungeon-500 p-6 rounded-none">
      <h2 className="text-pixel text-gold text-lg mb-4">RESUME CAMPAIGN</h2>

      <div className="space-y-3">
        {campaigns.map(c => (
          <div key={c.campaignId} className="bg-dungeon-600 p-4 pixel-border">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-mono text-base text-dungeon-100 truncate">
                  {c.campaignName}
                </h3>
                <p className="text-mono text-xs text-dungeon-200 mt-0.5">
                  {c.playersCount} player{c.playersCount !== 1 ? 's' : ''} &middot; {timeAgo(c.lastSavedAt)}
                </p>
              </div>
              {c.isCreator ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleResume(c.campaignId)}
                    disabled={resumingId === c.campaignId || deletingId === c.campaignId}
                    className="w-8 h-8 bg-gold text-dungeon-900 flex items-center justify-center text-mono text-sm pixel-border hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Resume"
                  >
                    {resumingId === c.campaignId ? <Reload width={14} height={14} className="animate-spin" /> : <Play width={14} height={14} />}
                  </button>
                  {confirmingDelete === c.campaignId ? (
                    <>
                      <button
                        onClick={() => handleDelete(c.campaignId)}
                        disabled={deletingId === c.campaignId}
                        className="w-8 h-8 bg-blood text-dungeon-100 flex items-center justify-center text-mono text-sm pixel-border hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Confirm delete"
                      >
                        {deletingId === c.campaignId ? <Reload width={14} height={14} className="animate-spin" /> : <Check width={14} height={14} />}
                      </button>
                      <button
                        onClick={() => setConfirmingDelete(null)}
                        disabled={deletingId === c.campaignId}
                        className="w-8 h-8 bg-dungeon-400 text-dungeon-200 flex items-center justify-center text-mono text-sm pixel-border hover:text-dungeon-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Cancel"
                      >
                        <Close width={14} height={14} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmingDelete(c.campaignId)}
                      disabled={resumingId === c.campaignId || deletingId === c.campaignId}
                      className="w-8 h-8 bg-dungeon-700 text-dungeon-100 flex items-center justify-center text-mono text-sm pixel-border hover:text-blood transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete"
                    >
                      <Trash width={14} height={14} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-mono text-xs text-dungeon-400">
                    Code: <span className="text-gold select-all">{c.campaignId}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

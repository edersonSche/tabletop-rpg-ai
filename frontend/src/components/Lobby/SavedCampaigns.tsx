import { useState, useEffect, useCallback } from 'react';
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
        <p className="text-mono text-dungeon-300 text-center py-8">Loading saved campaigns...</p>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="pixel-border bg-dungeon-500 p-6 rounded-none">
        <h2 className="text-pixel text-gold text-lg mb-4">RESUME CAMPAIGN</h2>
        <p className="text-mono text-dungeon-300 text-center py-8">No saved campaigns found.</p>
      </div>
    );
  }

  return (
    <div className="pixel-border bg-dungeon-500 p-6 rounded-none">
      <h2 className="text-pixel text-gold text-lg mb-4">RESUME CAMPAIGN</h2>

      <div className="space-y-3">
        {campaigns.map(c => (
          <div key={c.campaignId} className="bg-dungeon-600 p-4 pixel-border">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gold text-dungeon-900 flex items-center justify-center text-mono text-lg pixel-border shrink-0">
                {c.campaignName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-mono text-base text-dungeon-100 truncate">
                    {c.campaignName}
                  </h3>
                  <span className={`text-mono text-xs px-2 py-0.5 pixel-border shrink-0 ${
                    c.hasStarted
                      ? 'bg-magic text-dungeon-900'
                      : 'bg-dungeon-400 text-dungeon-200'
                  }`}>
                    {c.hasStarted ? 'In progress' : 'Waiting'}
                  </span>
                </div>
                <p className="text-mono text-xs text-dungeon-300 mt-1">
                  Players: {c.playersCount} &middot; Saved: {timeAgo(c.lastSavedAt)}
                </p>
              </div>
            </div>

            <div className="mt-3 flex gap-1 flex-wrap">
              {c.players.map(p => (
                <span key={p.id} className="text-mono text-xs text-dungeon-300 bg-dungeon-700 px-2 py-0.5 pixel-border">
                  {p.name}
                </span>
              ))}
            </div>

            {c.isCreator ? (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleResume(c.campaignId)}
                  disabled={resumingId === c.campaignId || deletingId === c.campaignId}
                  className="flex-1 bg-gold text-dungeon-900 py-2 px-4 text-mono text-base pixel-border hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resumingId === c.campaignId ? 'RESUMING...' : 'RESUME'}
                </button>
                {confirmingDelete === c.campaignId ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(c.campaignId)}
                      disabled={deletingId === c.campaignId}
                      className="bg-blood text-dungeon-100 py-2 px-3 text-mono text-sm pixel-border hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingId === c.campaignId ? 'DELETING...' : 'CONFIRM'}
                    </button>
                    <button
                      onClick={() => setConfirmingDelete(null)}
                      disabled={deletingId === c.campaignId}
                      className="bg-dungeon-400 text-dungeon-200 py-2 px-3 text-mono text-sm pixel-border hover:text-dungeon-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      CANCEL
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingDelete(c.campaignId)}
                    disabled={resumingId === c.campaignId || deletingId === c.campaignId}
                    className="bg-dungeon-700 text-dungeon-300 py-2 px-3 text-mono text-sm pixel-border hover:text-blood transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    DELETE
                  </button>
                )}
              </div>
            ) : (
              <p className="text-mono text-xs text-dungeon-400 mt-3 text-center">
                Ask the creator to resume this campaign. Code: <span className="text-gold select-all">{c.campaignId}</span>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

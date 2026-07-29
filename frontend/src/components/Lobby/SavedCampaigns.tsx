import { useState, useEffect, useCallback } from 'react';
import { Play, Check, Close, Reload, Trash } from 'pixelarticons/react';
import { SavedCampaignInfo } from '../../types/game.types';
import { usePlayer } from '../../hooks/usePlayer';
import { Card, PanelTitle, IconButton, ThinkingDots } from '../../components/ui';

interface SavedCampaignsProps {
  onResume: (campaignId: string) => Promise<void>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'moments ago';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function SavedCampaigns({ onResume }: SavedCampaignsProps) {
  const { listSavedCampaigns, deleteSavedCampaign } = usePlayer();
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
      <Card padding="md">
        <PanelTitle size="sm" className="mb-4">RESUME CAMPAIGN</PanelTitle>
        <p className="font-pixel text-xs text-stone-500 text-center py-8">
          Consulting the archives<ThinkingDots />
        </p>
      </Card>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card padding="md">
        <PanelTitle size="sm" className="mb-4">RESUME CAMPAIGN</PanelTitle>
        <p className="font-pixel text-xs text-stone-500 text-center py-8">NO SAVED QUESTS FOUND</p>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <PanelTitle size="sm" className="mb-4">RESUME CAMPAIGN</PanelTitle>

      <div className="space-y-2">
        {campaigns.map(c => (
          <div key={c.campaignId} className="bg-zinc-900 border border-zinc-800 p-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-pixel text-xs text-stone-300 truncate">{c.campaignName}</h3>
                <p className="font-pixel text-xs text-stone-600 mt-0.5">
                  {c.playersCount} hero{c.playersCount !== 1 ? 'es' : ''} &middot; {timeAgo(c.lastSavedAt)}
                </p>
              </div>
              {c.isCreator ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <IconButton
                    icon={resumingId === c.campaignId ? <Reload width={12} height={12} className="animate-spin" /> : <Play width={12} height={12} />}
                    onClick={() => handleResume(c.campaignId)}
                    disabled={resumingId === c.campaignId || deletingId === c.campaignId}
                    title="Resume"
                    variant="bronze"
                  />
                  {confirmingDelete === c.campaignId ? (
                    <>
                      <IconButton
                        icon={deletingId === c.campaignId ? <Reload width={12} height={12} className="animate-spin" /> : <Check width={12} height={12} />}
                        onClick={() => handleDelete(c.campaignId)}
                        disabled={deletingId === c.campaignId}
                        title="Confirm delete"
                        variant="blood"
                      />
                      <IconButton
                        icon={<Close width={12} height={12} />}
                        onClick={() => setConfirmingDelete(null)}
                        disabled={deletingId === c.campaignId}
                        title="Cancel"
                        variant="panel"
                      />
                    </>
                  ) : (
                    <IconButton
                      icon={<Trash width={12} height={12} />}
                      onClick={() => setConfirmingDelete(c.campaignId)}
                      disabled={resumingId === c.campaignId || deletingId === c.campaignId}
                      title="Delete"
                      variant="danger"
                    />
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-pixel text-xs text-stone-600">
                    <span className="text-gold-500 select-all">{c.campaignId}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

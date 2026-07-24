import { useState, useEffect, useCallback } from 'react';
import { Play, Check, Close, Reload, Trash } from 'pixelarticons/react';
import { SavedCampaignInfo } from '../../types/game.types';
import { usePlayer } from '../../hooks/usePlayer';

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
      <div className="card-stone p-5">
        <h2 className="font-pixel text-[10px] text-gold-400 mb-4 text-shadow-glow-gold">RESUME CAMPAIGN</h2>
        <p className="font-pixel text-[8px] text-stone-500 text-center py-8">
          Consulting the archives
          <span className="thinking-dot inline-block ml-0.5">.</span>
          <span className="thinking-dot inline-block">.</span>
          <span className="thinking-dot inline-block">.</span>
        </p>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="card-stone p-5">
        <h2 className="font-pixel text-[10px] text-gold-400 mb-4 text-shadow-glow-gold">RESUME CAMPAIGN</h2>
        <p className="font-pixel text-[8px] text-stone-500 text-center py-8">NO SAVED QUESTS FOUND</p>
      </div>
    );
  }

  return (
    <div className="card-stone p-5">
      <h2 className="font-pixel text-[10px] text-gold-400 mb-4 text-shadow-glow-gold">RESUME CAMPAIGN</h2>

      <div className="space-y-2">
        {campaigns.map(c => (
          <div key={c.campaignId} className="bg-navy-800 p-3 pixel-border">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-pixel text-[9px] text-stone-300 truncate">{c.campaignName}</h3>
                <p className="font-pixel text-[6px] text-stone-600 mt-0.5">
                  {c.playersCount} hero{c.playersCount !== 1 ? 'es' : ''} &middot; {timeAgo(c.lastSavedAt)}
                </p>
              </div>
              {c.isCreator ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleResume(c.campaignId)}
                    disabled={resumingId === c.campaignId || deletingId === c.campaignId}
                    className="w-7 h-7 bg-gold-500 text-navy-900 flex items-center justify-center pixel-border hover:bg-gold-400 transition-all disabled:opacity-40"
                    title="Resume"
                  >
                    {resumingId === c.campaignId ? <Reload width={12} height={12} className="animate-spin" /> : <Play width={12} height={12} />}
                  </button>
                  {confirmingDelete === c.campaignId ? (
                    <>
                      <button
                        onClick={() => handleDelete(c.campaignId)}
                        disabled={deletingId === c.campaignId}
                        className="w-7 h-7 bg-blood-700 text-stone-300 flex items-center justify-center pixel-border hover:bg-blood-600 transition-all disabled:opacity-40"
                        title="Confirm delete"
                      >
                        {deletingId === c.campaignId ? <Reload width={12} height={12} className="animate-spin" /> : <Check width={12} height={12} />}
                      </button>
                      <button
                        onClick={() => setConfirmingDelete(null)}
                        disabled={deletingId === c.campaignId}
                        className="w-7 h-7 bg-navy-700 text-stone-500 flex items-center justify-center pixel-border hover:text-stone-300 transition-all disabled:opacity-40"
                        title="Cancel"
                      >
                        <Close width={12} height={12} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmingDelete(c.campaignId)}
                      disabled={resumingId === c.campaignId || deletingId === c.campaignId}
                      className="w-7 h-7 bg-navy-700 text-stone-500 flex items-center justify-center pixel-border hover:text-blood-500 transition-all disabled:opacity-40"
                      title="Delete"
                    >
                      <Trash width={12} height={12} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-pixel text-[7px] text-stone-600">
                    <span className="text-gold-500 select-all">{c.campaignId}</span>
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

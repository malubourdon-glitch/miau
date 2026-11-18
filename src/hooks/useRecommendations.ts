import { useMemo } from 'react';
import { ACCESSIBILITY_PROFILES } from '../data/profiles';
import { recommendSpots } from '../services/recommendation/spotRecommender';
import { useAppStore } from '../store/useAppStore';

export function useRecommendations(limit = 5) {
  const facility = useAppStore((s) => s.facility);
  const profileId = useAppStore((s) => s.user?.profileId ?? 'wheelchair');
  const activeSpotId = useAppStore((s) => s.activeSpotId);
  return useMemo(
    () => recommendSpots(facility, ACCESSIBILITY_PROFILES[profileId], { limit, keepSpotId: activeSpotId ?? undefined }),
    [facility, profileId, limit, activeSpotId],
  );
}

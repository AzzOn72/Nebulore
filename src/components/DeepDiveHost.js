import { useEffect, useRef } from 'react';
import DeepDiveModal from './DeepDiveModal';
import { useStatsStore } from '../store/useStatsStore';
import { useUiStore } from '../store/useUiStore';

/**
 * Single app-wide Deep Dive modal. Driven by useUiStore so a Deep Dive can be
 * opened from the feed, the Saved archive, the Dashboard, or a tapped push
 * notification. Records one "knowledge absorbed" event per opened article.
 */
export default function DeepDiveHost() {
  const fact = useUiStore((state) => state.deepDiveFact);
  const closeDeepDive = useUiStore((state) => state.closeDeepDive);
  const recordDeepDive = useStatsStore((state) => state.recordDeepDive);
  const recordedRef = useRef(null);

  useEffect(() => {
    if (fact && recordedRef.current !== fact.id) {
      recordedRef.current = fact.id;
      recordDeepDive(fact.categoryKey);
    } else if (!fact) {
      recordedRef.current = null;
    }
  }, [fact, recordDeepDive]);

  return <DeepDiveModal visible={!!fact} fact={fact} onClose={closeDeepDive} />;
}

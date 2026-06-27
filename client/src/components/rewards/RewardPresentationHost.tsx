import { SecretRewardReveal } from '@/components/rewards/SecretRewardReveal';
import { RewardSummaryReveal } from '@/components/rewards/RewardSummaryReveal';
import { useRewardPresentation } from '@/context/RewardPresentationContext';

export function RewardPresentationHost() {
  const { state, advanceSecret, dismiss } = useRewardPresentation();

  if (state.phase === 'secret') {
    const item = state.secrets[state.secretIndex];
    if (!item) return null;
    return (
      <SecretRewardReveal
        item={item}
        golden={item.goldenSecret}
        onContinue={advanceSecret}
      />
    );
  }

  if (state.phase === 'summary' && state.summary.length > 0) {
    return <RewardSummaryReveal items={state.summary} onClose={dismiss} />;
  }

  return null;
}

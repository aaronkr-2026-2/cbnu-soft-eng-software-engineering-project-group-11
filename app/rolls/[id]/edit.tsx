import { useEffect } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { getRollById } from '../../../src/features/rolls/store/rollStore';
import { useRoll } from '../../../src/features/rolls/hooks/useRolls';
import { useNewRollDraftStore } from '../../../src/features/rolls/store/newRollDraftStore';
import { RollInformationScreen } from '../../../src/features/rolls/components/RollInformationScreen';

export default function EditRoll() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const roll = useRoll(id);
  const editingId = useNewRollDraftStore((state) => state.editingId);
  useEffect(() => {
    const currentRoll = getRollById(id);
    if (currentRoll) useNewRollDraftStore.getState().beginEdit(currentRoll);
    return () => { useNewRollDraftStore.getState().endEdit(); };
  }, [id]);
  if (!roll) return <Redirect href="/" />;
  if (editingId !== id) return null;
  return <RollInformationScreen editingId={id} />;
}

import { PrimaryButton } from '../../../components/ui/PrimaryButton';

type AddPhotosButtonProps = {
  loading?: boolean;
  onPress: () => void;
};

export function AddPhotosButton({ loading = false, onPress }: AddPhotosButtonProps) {
  return (
    <PrimaryButton
      label={loading ? 'Opening Photos…' : '+ Add Photos'}
      onPress={onPress}
    />
  );
}

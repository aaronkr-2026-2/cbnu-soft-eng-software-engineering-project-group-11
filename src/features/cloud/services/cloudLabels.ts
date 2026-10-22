import type { TranslationKey } from '../../../i18n/translations';
import type { CloudState } from './CloudSyncEngine';
export const cloudLabels: Record<CloudState['status'], TranslationKey> = {
  unavailable: 'cloudUnavailable', off: 'cloudOff', syncing: 'cloudSyncing', pending: 'cloudPendingShort', 'metadata-synced': 'cloudMetadataSynced', error: 'cloudError',
};

export const cloudErrorLabels: Record<NonNullable<CloudState['errorKind']>, TranslationKey> = {
  incomplete: 'cloudIncompleteError', account: 'cloudAccountError', 'account-changed': 'cloudAccountChanged', review: 'cloudReviewError',
  network: 'cloudNetworkError', quota: 'cloudQuotaError', configuration: 'cloudConfigurationError', unknown: 'cloudUnknownError',
};

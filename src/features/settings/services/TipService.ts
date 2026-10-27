import { requireOptionalNativeModule } from 'expo-modules-core';

export type TipProduct = { id: string; title: string; description: string; price: string; value: number };
export type TipResult = 'success' | 'cancelled' | 'pending' | 'unavailable' | 'unverified' | 'unknown';
type NativeTips = { products(ids: string[]): Promise<TipProduct[]>; purchase(id: string): Promise<TipResult> };

/** Consumable products configured in App Store Connect (and ios/FiLog/FiLog.storekit for local testing). */
export const tipIds = {
  coffee: 'com.manhduong2003.filog.tip.coffee',
  lunch: 'com.manhduong2003.filog.tip.lunch',
  dinner: 'com.manhduong2003.filog.tip.dinner',
  sponsor: 'com.manhduong2003.filog.tip.sponsor',
} as const;
export type TipKind = keyof typeof tipIds;
export const tipKinds = Object.keys(tipIds) as TipKind[];

// Builds without the native module keep Settings usable and simply show tips as unavailable.
const native = (() => {
  try { return requireOptionalNativeModule<NativeTips>('FiLogTips'); } catch { return null; }
})();

export const TipService = {
  /** Prices keyed by tip, in the App Store's local currency. Missing entries are not purchasable. */
  async prices(): Promise<Partial<Record<TipKind, string>>> {
    if (!native) return {};
    const products = await native.products(Object.values(tipIds));
    return Object.fromEntries(tipKinds.flatMap(kind => {
      const product = products.find(item => item.id === tipIds[kind]);
      return product ? [[kind, product.price]] : [];
    }));
  },
  purchase(kind: TipKind): Promise<TipResult> {
    return native ? native.purchase(tipIds[kind]) : Promise.resolve('unavailable');
  },
};

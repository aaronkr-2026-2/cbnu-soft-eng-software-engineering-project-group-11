import { canonical, cloudKey, mergeDocument, updateDocument, validateDocument, type CloudDocument, type WireItem } from '../utils/cloudModel';
import { projectCloud, wireItems, type CloudProjection } from '../utils/cloudProjection';

export type Journal = {
  schema: 1; enabled: boolean; n: number; account?: string; token?: string;
  documents: Record<string, CloudDocument>; baseline: Record<string, WireItem>;
  server: Record<string, { tag: string; document: string }>;
  stage?: { before: CloudProjection; projection: CloudProjection };
  lastSync?: number;
};
export type RestoreProgress = { phase: 'downloading' | 'applying' | 'paused'; received: number };
export type CloudUnavailableReason = 'native-build' | 'configuration' | 'signing-unavailable' | 'missing-entitlement' | 'container-mismatch' | 'environment-mismatch';
export type CloudState = { unavailableReason?: CloudUnavailableReason; restore?: RestoreProgress; configured: boolean; enabled: boolean; status: 'unavailable' | 'off' | 'syncing' | 'pending' | 'metadata-synced' | 'error'; pending: number; lastSync?: number; error?: string; errorKind?: 'account' | 'account-changed' | 'review' | 'network' | 'quota' | 'configuration' | 'incomplete' | 'unknown' };
export type ServerItem = { document: string; tag: string };
export type CloudTransport = {
  deviceID: string;
  account(): Promise<{ configured: boolean; available?: boolean; account?: string; reason?: CloudUnavailableReason }>;
  fetch(token: string | undefined, account: string): Promise<{ records: ServerItem[]; token: string; more: boolean }>;
  save(key: string, document: string, tag: string | undefined, account: string): Promise<ServerItem | { conflict: ServerItem }>;
};
export type CloudIO = { read(): Journal | undefined; write(journal: Journal): void; local(): CloudProjection; apply(projection: CloudProjection): void };
export class CloudSyncEngine {
  private journal: Journal;
  private running = false;
  private pending = new Set<string>();
  private applying = false;
  private state: CloudState;
  constructor(private io: CloudIO, private transport: CloudTransport, private publish: (state: CloudState) => void = () => {}) {
    const saved = io.read();
    this.journal = saved ?? { schema: 1, enabled: true, n: 0, documents: {}, baseline: {}, server: {} };
    if (this.journal.schema !== 1 || (!Number.isSafeInteger(this.journal.n) || this.journal.n < 0) || !this.journal.documents || !this.journal.baseline || !this.journal.server || typeof this.journal.enabled !== 'boolean') throw new Error('Cloud journal needs recovery; local archives are unchanged');
    for (const [key, doc] of Object.entries(this.journal.documents)) {
      validateDocument(doc); if (key !== cloudKey(doc)) throw new Error('Invalid cloud journal identity');
      for (const field of Object.values(doc.fields)) this.journal.n = Math.max(this.journal.n, field.stamp.n);
      this.journal.n = Math.max(this.journal.n, doc.deleted?.n ?? 0);
      this.checkPending(key);
    }
    if (this.journal.lastSync !== undefined && (!Number.isFinite(this.journal.lastSync) || this.journal.lastSync < 0)) throw new Error('Invalid cloud timestamp');
    this.state = { configured: false, enabled: this.journal.enabled, status: 'unavailable', pending: this.pending.size, lastSync: this.journal.lastSync };
  }
  get snapshot() { return this.state; }
  private pendingKeys() { return [...this.pending]; }
  private checkPending(key: string) {
    if (canonical(this.journal.documents[key]) !== this.journal.server[key]?.document) this.pending.add(key);
    else this.pending.delete(key);
  }
  private persist() { this.io.write(this.journal); }
  private show(patch: Partial<CloudState>) {
    this.state = { ...this.state, ...patch, enabled: this.journal.enabled, pending: this.pending.size, lastSync: this.journal.lastSync };
    this.publish(this.state);
  }
  setEnabled(enabled: boolean) {
    const previous = this.journal.enabled;
    this.journal.enabled = enabled;
    try { this.persist(); } catch (error) { this.journal.enabled = previous; throw error; }
    this.show({ status: enabled ? 'pending' : 'off', error: undefined, restore: undefined });
  }
  capture() {
    if (this.applying || this.journal.stage) return false;
    let changed = false;
    const current = Object.fromEntries(wireItems(this.io.local()).map(item => [cloudKey(item), item]));
    for (const [key, item] of Object.entries(current)) {
      if (canonical(item.data) === canonical(this.journal.baseline[key]?.data)) continue;
      changed = true;
      const n = ++this.journal.n;
      if (!Number.isSafeInteger(n)) throw new Error('Cloud clock exceeded safe range');
      this.journal.documents[key] = updateDocument(this.journal.documents[key], item, this.journal.baseline[key]?.data, { n, device: this.transport.deviceID });
      this.checkPending(key);
    }
    for (const key of Object.keys(this.journal.baseline)) if (!current[key] && !this.journal.documents[key]?.deleted) {
      changed = true;
      const previous = this.journal.documents[key];
      if (!previous) throw new Error('Missing deletion history');
      this.journal.documents[key] = { ...previous, deleted: { n: ++this.journal.n, device: this.transport.deviceID } };
      this.checkPending(key);
    }
    if (!changed) return false;
    this.journal.baseline = current;
    this.persist(); // If publication crashed after a local save, the next capture rediscovers its delta.
    this.show(this.pending.size && this.state.status === 'metadata-synced' ? { status: 'pending' } : {});
    return true;
  }
  private receive(item: ServerItem) {
    const remote: unknown = JSON.parse(item.document); validateDocument(remote);
    const key = cloudKey(remote);
    this.journal.documents[key] = mergeDocument(this.journal.documents[key], remote);
    this.journal.server[key] = { tag: item.tag, document: canonical(remote) };
    this.checkPending(key);
    for (const field of Object.values(remote.fields)) this.journal.n = Math.max(this.journal.n, field.stamp.n);
    this.journal.n = Math.max(this.journal.n, remote.deleted?.n ?? 0);
  }
  private finishStage() {
    const stage = this.journal.stage;
    if (!stage) return;
    const local = this.io.local();
    for (const key of ['rolls', 'films', 'cameras'] as const) {
      if (canonical(local[key]) !== canonical(stage.before[key]) && canonical(local[key]) !== canonical(stage.projection[key])) throw new Error('Local edits after interrupted merge; review required');
    }
    this.applying = true;
    try {
      this.io.apply(stage.projection);
      this.journal.baseline = Object.fromEntries(wireItems(this.io.local()).map(item => [cloudKey(item), item]));
      delete this.journal.stage;
      this.persist();
    } finally { this.applying = false; }
  }
  async run() {
    if (this.running) return;
    this.running = true;
    let restoring = false;
    let received = 0;
    try {
      const account = await this.transport.account();
      this.show({ configured: account.configured, unavailableReason: account.configured ? undefined : account.reason });
      if (!account.configured) { this.show({ status: 'unavailable', error: undefined, restore: undefined }); return; }
      if (!this.journal.enabled) { this.show({ status: 'off', error: undefined, restore: undefined }); return; }
      const local = this.io.local();
      restoring = !this.journal.lastSync && local.rolls.length === 0 && local.films.length === 0 && local.cameras.length === 0;
      if (!account.available || !account.account) throw new Error('iCloud account unavailable');
      if (this.journal.account && this.journal.account !== account.account) throw new Error('iCloud account changed; return to the original account to sync this library');
      this.journal.account = account.account; this.persist();
      this.show({ status: 'syncing', error: undefined, restore: restoring ? { phase: 'downloading', received } : undefined });
      this.finishStage();
      this.capture();
      let token = this.journal.token;
      let resetToken = false;
      let fullFetch = !token;
      const observed = new Set<string>();
      for (let page = 0; ; page++) {
        if (!this.journal.enabled) { this.show({ status: 'off', restore: undefined }); return; }
        if (page > 10000) throw new Error('Cloud page limit exceeded');
        let response: Awaited<ReturnType<CloudTransport['fetch']>>;
        try { response = await this.transport.fetch(token, account.account); }
        catch (error) {
          if (!resetToken && (error as { code?: string }).code === '21') { token = undefined; resetToken = true; fullFetch = true; observed.clear(); received = 0; continue; }
          throw error;
        }
        const identity = await this.transport.account();
        if (!identity.available || identity.account !== account.account) throw new Error('iCloud account changed during fetch');
        for (const item of response.records) {
          const remote: unknown = JSON.parse(item.document); validateDocument(remote);
          observed.add(cloudKey(remote)); this.receive(item);
        }
        received = observed.size;
        if (restoring) this.show({ restore: { phase: 'downloading', received } });
        this.persist(); // Preserve received records before applying; do not advance checkpoint yet.
        token = response.token;
        if (!response.more) break;
      }
      if (fullFetch && Object.keys(this.journal.server).some(key => !observed.has(key))) throw new Error('Cloud history changed; review required before restoring');
      const freshAccount = await this.transport.account();
      if (!freshAccount.available || freshAccount.account !== account.account) throw new Error('iCloud account changed during fetch');
      if (!this.journal.enabled) { this.show({ status: 'off', restore: undefined }); return; }
      this.capture(); // Local edits made while network work was pending win by their field clock.
      if (restoring) this.show({ restore: { phase: 'applying', received } });
      const before = this.io.local();
      const projection = projectCloud(this.journal.documents, before);
      this.journal.stage = { before, projection }; this.persist();
      this.finishStage();
      this.journal.token = token; this.persist();
      // Bounded conflict retries. Remaining changes stay durable for the next foreground pass.
      let acknowledgments = 0;
      for (let pass = 0; pass < 3; pass++) {
        const keys = this.pendingKeys();
        if (!keys.length) break;
        for (const key of keys) {
          if (!this.journal.enabled) { this.show({ status: 'off', restore: undefined }); return; }
          const document = this.journal.documents[key];
          const result = await this.transport.save(key, canonical(document), this.journal.server[key]?.tag, account.account);
          const identity = await this.transport.account();
          if (!identity.available || identity.account !== account.account) throw new Error('iCloud account changed during save');
          const item = 'conflict' in result ? result.conflict : result;
          const received: unknown = JSON.parse(item.document); validateDocument(received);
          if (cloudKey(received) !== key) throw new Error('Cloud save identity mismatch');
          this.receive(item);
          // Uncheckpointed acknowledgments are safe to refetch after a crash: IDs and field stamps are idempotent.
          if (++acknowledgments % 10 === 0) this.persist();
          this.show({});
        }
      }
      this.persist();
      // Conflict merges can bring newer remote fields; project them through the same guarded stage.
      this.capture();
      if (!this.journal.enabled) { this.show({ status: 'off', restore: undefined }); return; }
      const latest = this.io.local();
      this.journal.stage = { before: latest, projection: projectCloud(this.journal.documents, latest) }; this.persist(); this.finishStage();
      const pending = this.pending.size;
      if (!pending) { this.journal.lastSync = Date.now(); this.persist(); }
      this.show({ status: pending ? 'pending' : 'metadata-synced', restore: undefined });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cloud sync failed';
      const nativeKind = (error as { kind?: string } | null)?.kind;
      const errorKind = message.includes('account changed') ? 'account-changed' : message.includes('account unavailable') ? 'account' : message.includes('review required') ? 'review' : ['network', 'quota', 'configuration', 'account', 'incomplete'].includes(nativeKind ?? '') ? nativeKind as 'network' | 'quota' | 'configuration' | 'account' | 'incomplete' : 'unknown';
      this.show({ status: 'error', error: message, errorKind, restore: restoring ? { phase: 'paused', received } : undefined });
      throw error;
    } finally { this.running = false; }
  }
}

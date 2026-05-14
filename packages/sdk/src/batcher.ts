import type { AnalyticsPayload, SessionProfile } from "@si/shared";

interface BatcherOptions {
  endpoint: string | null;
  flushIntervalMs?: number;
  getProfile: () => SessionProfile;
  isConverted: () => boolean;
  conversionType: () => string | null;
  /** When set, POST /collect includes top-level `site_id` (resolved server-side; optional if snippetKey set). */
  siteId?: string | null;
  /** When set, POST /collect includes top-level `snippet_key` — preferred public install token. */
  snippetKey?: string | null;
}

export class Batcher {
  private timer: number | null = null;
  private lastSent = 0;
  private inFlight: Promise<void> | null = null;
  private opts: BatcherOptions;

  constructor(opts: BatcherOptions) {
    this.opts = { flushIntervalMs: 20000, ...opts };
  }

  start(): void {
    if (this.timer) return;
    this.timer = window.setInterval(() => this.flush("interval"), this.opts.flushIntervalMs);
    window.addEventListener("pagehide", () => this.flush("pagehide", true));
    window.addEventListener("beforeunload", () => this.flush("unload", true));
  }

  stop(): void {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
  }

  buildPayload(): AnalyticsPayload {
    const p = this.opts.getProfile();
    return {
      session_id: p.session_id,
      origin: window.location.origin,
      started_at: p.started_at,
      ended_at: Date.now(),
      summary: {
        pages: p.signals.pages_viewed,
        vdp_views: p.signals.vdp_views,
        pricing_views: p.signals.pricing_views,
        finance_interactions: p.signals.finance_interactions,
        compare_interactions: p.signals.compare_interactions,
        cta_clicks: p.signals.cta_clicks,
        max_scroll_depth: p.signals.max_scroll_depth,
        intent_score: p.intent_score,
        urgency_score: p.urgency_score,
        engagement_score: p.engagement_score,
        journey_stage: p.journey_stage,
        category_affinity: { ...p.category_affinity },
        site_vertical: p.site_context.vertical,
        page_kind: p.site_context.page_kind,
        inferred_site_type: p.site_environment.site.site_type,
        inferred_generic_page: p.site_environment.page.generic_kind,
        personalization_ladder: p.site_environment.ladder.level,
      },
      experiment_assignment: p.experiment_assignment,
      active_treatments: p.active_treatments,
      converted: this.opts.isConverted(),
      conversion_type: this.opts.conversionType(),
    };
  }

  async flush(reason: string, useBeacon = false): Promise<void> {
    if (!this.opts.endpoint) return;
    if (Date.now() - this.lastSent < 1000 && reason === "interval") return;
    const payload = this.buildPayload();
    const envelope: Record<string, unknown> = { reason, payload };
    const sk = this.opts.snippetKey?.trim();
    if (sk) envelope.snippet_key = sk;
    const sid = this.opts.siteId?.trim();
    if (sid) envelope.site_id = sid;
    const body = JSON.stringify(envelope);
    this.lastSent = Date.now();

    if (useBeacon && navigator.sendBeacon) {
      try {
        navigator.sendBeacon(this.opts.endpoint, new Blob([body], { type: "application/json" }));
        return;
      } catch {
        /* fall through */
      }
    }
    try {
      this.inFlight = fetch(this.opts.endpoint, {
        method: "POST",
        body,
        keepalive: true,
        headers: { "content-type": "application/json" },
      }).then(() => undefined);
      await this.inFlight;
    } catch {
      /* swallow */
    } finally {
      this.inFlight = null;
    }
  }
}

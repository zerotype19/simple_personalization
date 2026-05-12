import type { Recommendation, RuleDefinition, SessionProfile } from "@si/shared";

export interface RuleContext {
  intent: number;
  urgency: number;
  engagement: number;
  stage: string;
  persona: string;
  return_visit: boolean;
  pages: number;
  vdp_views: number;
  pricing_views: number;
  finance_interactions: number;
  compare_interactions: number;
  cta_clicks: number;
  scroll_depth: number;
  duration_s: number;
  page_type: string;
  affinity: Record<string, number>;
}

export function buildRuleContext(p: SessionProfile): RuleContext {
  return {
    intent: p.intent_score,
    urgency: p.urgency_score,
    engagement: p.engagement_score,
    stage: p.journey_stage,
    persona: p.persona ?? "",
    return_visit: p.signals.return_visit,
    pages: p.signals.pages_viewed,
    vdp_views: p.signals.vdp_views,
    pricing_views: p.signals.pricing_views,
    finance_interactions: p.signals.finance_interactions,
    compare_interactions: p.signals.compare_interactions,
    cta_clicks: p.signals.cta_clicks,
    scroll_depth: p.signals.max_scroll_depth,
    duration_s: Math.round(p.signals.session_duration_ms / 1000),
    page_type: p.page_type,
    affinity: p.category_affinity,
  };
}

type Tok =
  | { k: "op"; v: string }
  | { k: "num"; v: number }
  | { k: "str"; v: string }
  | { k: "id"; v: keyof RuleContext | `affinity:${string}` }
  | { k: "kw"; v: "true" | "false" };

export function evaluateExpression(expr: string, ctx: RuleContext): boolean {
  if (!expr || !expr.trim()) return true;
  const tokens = tokenize(expr);
  const p = new Parser(tokens, ctx);
  const v = p.parseOr();
  if (p.peek()) throw new Error("Unexpected token");
  return !!v;
}

class Parser {
  private i = 0;
  constructor(
    private tokens: Tok[],
    private ctx: RuleContext,
  ) {}

  peek(): Tok | undefined {
    return this.tokens[this.i];
  }

  consume(expected?: string): Tok {
    const t = this.tokens[this.i++];
    if (!t) throw new Error("Unexpected end");
    if (expected && t.k === "op" && t.v !== expected) {
      throw new Error(`Expected ${expected}`);
    }
    return t;
  }

  parseOr(): any {
    let left = this.parseAnd();
    while (this.peek()?.k === "op" && this.peek()?.v === "||") {
      this.consume("||");
      const right = this.parseAnd();
      left = left || right;
    }
    return left;
  }

  parseAnd(): any {
    let left = this.parseEq();
    while (this.peek()?.k === "op" && this.peek()?.v === "&&") {
      this.consume("&&");
      const right = this.parseEq();
      left = left && right;
    }
    return left;
  }

  parseEq(): any {
    let left = this.parseCmp();
    while (this.peek()?.k === "op" && (this.peek()?.v === "==" || this.peek()?.v === "!=")) {
      const op = this.consume().v;
      const right = this.parseCmp();
      left = op === "==" ? left == right : left != right;
    }
    return left;
  }

  parseCmp(): any {
    let left = this.parseAdd();
    while (true) {
      const t = this.peek();
      if (!t || t.k !== "op") break;
      const op = t.v;
      if (op !== ">" && op !== ">=" && op !== "<" && op !== "<=") break;
      this.consume();
      const right = this.parseAdd();
      left = cmp(op, Number(left), Number(right));
    }
    return left;
  }

  parseAdd(): any {
    let left = this.parseUnary();
    while (this.peek()?.k === "op" && (this.peek()?.v === "+" || this.peek()?.v === "-")) {
      const op = this.consume().v;
      const right = this.parseUnary();
      left = op === "+" ? Number(left) + Number(right) : Number(left) - Number(right);
    }
    return left;
  }

  parseUnary(): any {
    const t = this.peek();
    if (t?.k === "op" && t.v === "!") {
      this.consume("!");
      return !this.parseUnary();
    }
    if (t?.k === "op" && t.v === "(") {
      this.consume("(");
      const inner = this.parseOr();
      this.consume(")");
      return inner;
    }
    return this.parsePrimary();
  }

  parsePrimary(): any {
    const t = this.consume();
    if (t.k === "num") return t.v;
    if (t.k === "str") return t.v;
    if (t.k === "kw") return t.v === "true";
    if (t.k === "id") {
      if (t.v === "return_visit") return this.ctx.return_visit;
      if (t.v.startsWith("affinity:")) {
        const tag = t.v.slice("affinity:".length);
        return this.ctx.affinity[tag] ?? 0;
      }
      return (this.ctx as any)[t.v] as any;
    }
    throw new Error("Unexpected token");
  }
}

function cmp(op: string, a: number, b: number): boolean {
  switch (op) {
    case ">":
      return a > b;
    case ">=":
      return a >= b;
    case "<":
      return a < b;
    case "<=":
      return a <= b;
    default:
      return false;
  }
}

function tokenize(input: string): Tok[] {
  const s = input;
  const out: Tok[] = [];
  let i = 0;

  const isSpace = (c: string) => /\s/.test(c);
  const isDigit = (c: string) => c >= "0" && c <= "9";

  while (i < s.length) {
    const c = s[i];
    if (isSpace(c)) {
      i++;
      continue;
    }

    if (c === "'" || c === '"') {
      const q = c;
      i++;
      let buf = "";
      while (i < s.length && s[i] !== q) {
        buf += s[i++];
      }
      i++; // closing quote
      out.push({ k: "str", v: buf });
      continue;
    }

    if (isDigit(c) || (c === "." && isDigit(s[i + 1] ?? ""))) {
      let buf = "";
      while (i < s.length && (isDigit(s[i]) || s[i] === ".")) buf += s[i++];
      out.push({ k: "num", v: Number(buf) });
      continue;
    }

    const two = s.slice(i, i + 2);
    if (["&&", "||", "==", "!=", ">=", "<="].includes(two)) {
      out.push({ k: "op", v: two });
      i += 2;
      continue;
    }

    if ("()+-*/<>!".includes(c)) {
      out.push({ k: "op", v: c });
      i++;
      continue;
    }

    // identifiers
    let buf = "";
    while (i < s.length && /[A-Za-z0-9_.]/.test(s[i])) buf += s[i++];
    if (!buf) throw new Error(`Bad char at ${i}`);

    if (buf === "true" || buf === "false") out.push({ k: "kw", v: buf });
    else if (buf.startsWith("affinity.")) {
      out.push({ k: "id", v: `affinity:${buf.slice("affinity.".length)}` });
    } else {
      out.push({ k: "id", v: buf as any });
    }
  }

  return out;
}

export interface RuleMatch {
  rule: RuleDefinition;
  recommendation: Recommendation | null;
}

export function runRules(
  rules: RuleDefinition[],
  profile: SessionProfile,
): { profile: SessionProfile; matches: RuleMatch[] } {
  const ctx = buildRuleContext(profile);
  const matches: RuleMatch[] = [];

  for (const rule of rules) {
    let ok = false;
    try {
      ok = evaluateExpression(rule.when, ctx);
    } catch {
      ok = false;
    }
    if (!ok) continue;
    if (rule.set?.journey_stage) profile.journey_stage = rule.set.journey_stage;
    if (rule.set?.persona) profile.persona = rule.set.persona;
    const rec = rule.recommend
      ? ({
          ...rule.recommend,
          confidence: rule.recommend.confidence ?? 0.7,
        } as Recommendation)
      : null;
    matches.push({ rule, recommendation: rec });
  }
  return { profile, matches };
}

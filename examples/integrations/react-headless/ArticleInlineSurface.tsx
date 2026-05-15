import { useOptiviewDecision } from "./useOptiviewDecision";

/** Map `article_inline_mid` to your CMS slice / portable text / commerce card. */
export function ArticleInlineSurface() {
  const d = useOptiviewDecision("article_inline_mid");
  if (!d || d.action !== "show") return null;
  return (
    <aside data-si-surface="article_inline_mid" data-offer-type={d.offer_type}>
      <h3>{d.headline}</h3>
      <p>{d.body}</p>
      {d.cta_label && d.target_url_hint ? (
        <a href={d.target_url_hint}>{d.cta_label}</a>
      ) : null}
    </aside>
  );
}

interface Props {
  /** Show selector chip placeholders (ratio / mode / resolution) */
  withSelectors?: boolean;
}

export default function ComposerSideSettingsSkeleton({ withSelectors = true }: Props) {
  return (
    <div className="composer-side-skeleton" aria-hidden>
      {withSelectors && (
        <div className="composer-side-skeleton-selectors">
          <div className="composer-side-skeleton-chip" />
          <div className="composer-side-skeleton-chip" />
          <div className="composer-side-skeleton-chip composer-side-skeleton-chip--wide" />
        </div>
      )}
      <div className="composer-side-skeleton-field">
        <div className="composer-side-skeleton-line composer-side-skeleton-line--short" />
        <div className="composer-side-skeleton-block composer-side-skeleton-block--media" />
      </div>
    </div>
  );
}

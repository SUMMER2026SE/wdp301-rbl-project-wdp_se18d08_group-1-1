interface PolicyReviewMetrics {
  contentHeight: number;
  viewportHeight: number;
  scrollOffset: number;
}

const END_THRESHOLD = 24;

export const hasReviewedPolicy = ({
  contentHeight,
  viewportHeight,
  scrollOffset,
}: PolicyReviewMetrics) => {
  if (contentHeight <= 0 || viewportHeight <= 0) return false;
  if (contentHeight <= viewportHeight + END_THRESHOLD) return true;
  return scrollOffset + viewportHeight >= contentHeight - END_THRESHOLD;
};

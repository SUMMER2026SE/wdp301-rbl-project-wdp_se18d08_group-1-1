import { hasReviewedPolicy } from '../policyReview';

describe('policy review progress', () => {
  it('unlocks short policies that already fit on screen', () => {
    expect(hasReviewedPolicy({ contentHeight: 420, viewportHeight: 600, scrollOffset: 0 })).toBe(true);
  });

  it('keeps long policies locked before the user reaches the end', () => {
    expect(hasReviewedPolicy({ contentHeight: 1200, viewportHeight: 600, scrollOffset: 200 })).toBe(false);
  });

  it('unlocks long policies near the end of the document', () => {
    expect(hasReviewedPolicy({ contentHeight: 1200, viewportHeight: 600, scrollOffset: 580 })).toBe(true);
  });

  it('waits until layout measurements are available', () => {
    expect(hasReviewedPolicy({ contentHeight: 0, viewportHeight: 600, scrollOffset: 0 })).toBe(false);
  });
});

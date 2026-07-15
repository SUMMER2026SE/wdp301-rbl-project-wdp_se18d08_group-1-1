import {
  getMembershipTierLabel,
  getMembershipVisualTier,
  MEMBERSHIP_TIER_COLORS,
} from '../membershipDisplay';

const activeMembership = {
  isVip: true,
  status: 'active' as const,
  package: {
    id: 'package-id',
    name: 'VALO Membership',
    type: 'monthly' as const,
    price: 100000,
  },
};

describe('membership display tier', () => {
  it('uses gray standard styling for users without an active membership', () => {
    expect(getMembershipVisualTier(null)).toBe('standard');
    expect(getMembershipVisualTier({ ...activeMembership, status: 'expired' })).toBe('standard');
  });

  it('distinguishes monthly and yearly active memberships', () => {
    expect(getMembershipVisualTier(activeMembership)).toBe('monthly');
    expect(getMembershipVisualTier({
      ...activeMembership,
      package: { ...activeMembership.package, type: 'yearly' },
    })).toBe('yearly');
  });

  it('returns clear Vietnamese labels for each tier', () => {
    expect(getMembershipTierLabel('standard')).toBe('Customer');
    expect(getMembershipTierLabel('monthly')).toBe('Monthly member');
    expect(getMembershipTierLabel('yearly')).toBe('Annual member');
  });

  it('shares gray, gold and purple avatar colors across profile and home', () => {
    expect(MEMBERSHIP_TIER_COLORS.standard.accent).toBe('#94A3B8');
    expect(MEMBERSHIP_TIER_COLORS.monthly.accent).toBe('#D4AF37');
    expect(MEMBERSHIP_TIER_COLORS.yearly.accent).toBe('#A855F7');
  });
});

import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import type { StaffManagementStackParamList } from '@/navigation/StaffNavigator';

type Props = NativeStackScreenProps<StaffManagementStackParamList, 'ManagementHome'>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TOOLS: Array<{
  screen: Exclude<keyof StaffManagementStackParamList, 'ManagementHome'>;
  icon: IconName;
  title: string;
  description: string;
}> = [
  { screen: 'Customers', icon: 'people-outline', title: 'Customers', description: 'Profiles, contact details, and account access' },
  { screen: 'Bookings', icon: 'calendar-outline', title: 'Bookings', description: 'Daily reservations, spaces, and payment status' },
  { screen: 'Subscriptions', icon: 'diamond-outline', title: 'Subscriptions', description: 'VIP plans and assigned parking spaces' },
  { screen: 'TicketPackages', icon: 'ticket-outline', title: 'Ticket packages', description: 'Create and maintain parking plans' },
  { screen: 'StaffNotifications', icon: 'notifications-outline', title: 'Notifications', description: 'Send notices and review delivery history' },
];

export function ManagementHubScreen({ navigation }: Props) {
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <Text style={styles.title}>Management</Text>
        <Text style={styles.subtitle}>Staff tools from the web console, adapted for mobile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.callout}>
          <View style={styles.calloutIcon}>
            <Ionicons name="shield-checkmark-outline" size={22} color={COLORS.gold} />
          </View>
          <View style={styles.calloutCopy}>
            <Text style={styles.calloutTitle}>Operations workspace</Text>
            <Text style={styles.calloutText}>Changes here use the same staff APIs as the frontend console.</Text>
          </View>
        </View>

        <View style={styles.list}>
          {TOOLS.map((tool) => (
            <Pressable
              accessibilityRole="button"
              key={tool.screen}
              onPress={() => navigation.navigate(tool.screen)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={tool.icon} size={21} color={COLORS.gold} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.rowTitle}>{tool.title}</Text>
                <Text style={styles.rowDescription}>{tool.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: COLORS.background, flex: 1 },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
  title: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm, lineHeight: 19, marginTop: 4 },
  scroll: { gap: SPACING.lg, padding: SPACING.lg, paddingBottom: 112 },
  callout: {
    alignItems: 'center',
    backgroundColor: 'rgba(226,186,75,0.08)',
    borderColor: 'rgba(226,186,75,0.24)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.md,
  },
  calloutIcon: { alignItems: 'center', backgroundColor: 'rgba(226,186,75,0.12)', borderRadius: RADIUS.md, height: 44, justifyContent: 'center', width: 44 },
  calloutCopy: { flex: 1 },
  calloutTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZES.md, fontWeight: '700' },
  calloutText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, lineHeight: 17, marginTop: 3 },
  list: { borderColor: COLORS.border, borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden' },
  row: { alignItems: 'center', backgroundColor: COLORS.surface, borderBottomColor: COLORS.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: SPACING.md, minHeight: 82, padding: SPACING.md },
  pressed: { backgroundColor: COLORS.surfaceElevated, transform: [{ scale: 0.99 }] },
  iconWrap: { alignItems: 'center', backgroundColor: 'rgba(226,186,75,0.1)', borderRadius: RADIUS.md, height: 44, justifyContent: 'center', width: 44 },
  copy: { flex: 1 },
  rowTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZES.md, fontWeight: '700' },
  rowDescription: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, lineHeight: 17, marginTop: 3 },
});

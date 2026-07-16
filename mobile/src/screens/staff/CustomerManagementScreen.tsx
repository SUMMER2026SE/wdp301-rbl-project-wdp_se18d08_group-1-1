import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, ScreenHeader } from '@/components/common';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import { useAppAlert } from '@/contexts/AppAlertContext';
import { useToast } from '@/hooks/useToast';
import type { StaffManagementStackParamList } from '@/navigation/StaffNavigator';
import { staffService, type StaffCustomer } from '@/services/api/staff';

type Props = NativeStackScreenProps<StaffManagementStackParamList, 'Customers'>;

const customerName = (customer: StaffCustomer) =>
  customer.profile?.fullName ||
  [customer.profile?.firstName, customer.profile?.lastName].filter(Boolean).join(' ') ||
  customer.username ||
  'Customer';

export function CustomerManagementScreen({ navigation }: Props) {
  const { alert } = useAppAlert();
  const toast = useToast();
  const [customers, setCustomers] = useState<StaffCustomer[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<StaffCustomer | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await staffService.getCustomers();
      setCustomers(response.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load customers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return customers;
    return customers.filter((customer) =>
      [customerName(customer), customer.email, customer.profile?.phone]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalized)),
    );
  }, [customers, query]);

  const openEditor = (customer: StaffCustomer) => {
    setEditing(customer);
    setFirstName(customer.profile?.firstName ?? '');
    setLastName(customer.profile?.lastName ?? '');
    setPhone(customer.profile?.phone ?? '');
  };

  const saveCustomer = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const response = await staffService.updateCustomer(editing._id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      });
      const updatedCustomer = response.data;
      if (updatedCustomer) {
        setCustomers((current) => current.map((item) => item._id === editing._id ? updatedCustomer : item));
      } else {
        await load();
      }
      setEditing(null);
      toast.showSuccess('Customer updated');
    } catch (saveError) {
      toast.showError('Update failed', saveError instanceof Error ? saveError.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = (customer: StaffCustomer) => {
    const blocked = customer.status === 'blocked';
    const nextStatus = blocked ? 'active' : 'blocked';
    alert(
      blocked ? 'Restore customer access?' : 'Block customer access?',
      `${customerName(customer)} will be marked as ${nextStatus}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: blocked ? 'Restore' : 'Block',
          style: blocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await staffService.updateCustomerStatus(customer._id, nextStatus);
              setCustomers((current) => current.map((item) => item._id === customer._id ? { ...item, status: nextStatus } : item));
              toast.showSuccess(blocked ? 'Customer restored' : 'Customer blocked');
            } catch (statusError) {
              toast.showError('Status update failed', statusError instanceof Error ? statusError.message : undefined);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScreenHeader title="Customer management" subtitle={`${customers.length} customers`} onBack={navigation.goBack} />

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={19} color={COLORS.textMuted} />
        <TextInput
          accessibilityLabel="Search customers"
          onChangeText={setQuery}
          placeholder="Search name, email, or phone"
          placeholderTextColor={COLORS.textMuted}
          style={styles.searchInput}
          value={query}
        />
        {query ? <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close-circle" size={20} color={COLORS.textMuted} /></TouchableOpacity> : null}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={filtered}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={COLORS.gold} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          renderItem={({ item }) => {
            const blocked = item.status === 'blocked';
            return (
              <Pressable onPress={() => openEditor(item)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{customerName(item).charAt(0).toUpperCase()}</Text></View>
                <View style={styles.cardCopy}>
                  <Text numberOfLines={1} style={styles.name}>{customerName(item)}</Text>
                  <Text numberOfLines={1} style={styles.email}>{item.email}</Text>
                  <Text style={styles.phone}>{item.profile?.phone || 'No phone number'}</Text>
                </View>
                <TouchableOpacity accessibilityRole="button" onPress={() => toggleStatus(item)} style={[styles.status, blocked && styles.statusBlocked]}>
                  <Text style={[styles.statusText, blocked && styles.statusTextBlocked]}>{blocked ? 'Blocked' : 'Active'}</Text>
                </TouchableOpacity>
              </Pressable>
            );
          }}
          ListEmptyComponent={<EmptyState icon="people-outline" title="No customers found" message="Try a different search term." />}
        />
      )}

      <Modal animationType="slide" transparent visible={Boolean(editing)} onRequestClose={() => setEditing(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View><Text style={styles.sheetTitle}>Edit customer</Text><Text style={styles.sheetSubtitle}>{editing?.email}</Text></View>
              <TouchableOpacity onPress={() => setEditing(null)} style={styles.closeButton}><Ionicons name="close" size={22} color={COLORS.textSecondary} /></TouchableOpacity>
            </View>
            <Text style={styles.label}>First name</Text>
            <TextInput value={firstName} onChangeText={setFirstName} style={styles.input} placeholderTextColor={COLORS.textMuted} />
            <Text style={styles.label}>Last name</Text>
            <TextInput value={lastName} onChangeText={setLastName} style={styles.input} placeholderTextColor={COLORS.textMuted} />
            <Text style={styles.label}>Phone number</Text>
            <TextInput value={phone} onChangeText={setPhone} style={styles.input} keyboardType="phone-pad" placeholderTextColor={COLORS.textMuted} />
            <TouchableOpacity disabled={saving} onPress={saveCustomer} style={[styles.saveButton, saving && styles.disabled]}>
              {saving ? <ActivityIndicator color={COLORS.textInverse} /> : <Text style={styles.saveText}>Save changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: COLORS.background, flex: 1 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  searchWrap: { alignItems: 'center', backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: RADIUS.md, borderWidth: 1, flexDirection: 'row', gap: SPACING.sm, marginHorizontal: SPACING.lg, marginVertical: SPACING.sm, minHeight: 48, paddingHorizontal: SPACING.md },
  searchInput: { color: COLORS.textPrimary, flex: 1, fontSize: FONT_SIZES.sm },
  list: { gap: SPACING.sm, padding: SPACING.lg, paddingBottom: SPACING.xxl },
  card: { alignItems: 'center', backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: RADIUS.lg, borderWidth: 1, flexDirection: 'row', gap: SPACING.md, padding: SPACING.md },
  pressed: { backgroundColor: COLORS.surfaceElevated, transform: [{ scale: 0.99 }] },
  avatar: { alignItems: 'center', backgroundColor: 'rgba(226,186,75,0.12)', borderRadius: RADIUS.md, height: 46, justifyContent: 'center', width: 46 },
  avatarText: { color: COLORS.gold, fontSize: FONT_SIZES.lg, fontWeight: '800' },
  cardCopy: { flex: 1, minWidth: 0 },
  name: { color: COLORS.textPrimary, fontSize: FONT_SIZES.md, fontWeight: '700' },
  email: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, marginTop: 2 },
  phone: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: 2 },
  status: { backgroundColor: 'rgba(76,175,80,0.12)', borderRadius: RADIUS.round, paddingHorizontal: SPACING.sm, paddingVertical: 6 },
  statusBlocked: { backgroundColor: 'rgba(255,77,77,0.12)' },
  statusText: { color: COLORS.success, fontSize: 10, fontWeight: '700' },
  statusTextBlocked: { color: COLORS.error },
  overlay: { backgroundColor: 'rgba(0,0,0,0.68)', flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, gap: SPACING.sm, padding: SPACING.lg, paddingBottom: SPACING.xxl },
  sheetHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  sheetTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZES.lg, fontWeight: '800' },
  sheetSubtitle: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: 2 },
  closeButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  label: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, fontWeight: '600', marginTop: SPACING.xs },
  input: { backgroundColor: COLORS.surfaceElevated, borderColor: COLORS.border, borderRadius: RADIUS.md, borderWidth: 1, color: COLORS.textPrimary, minHeight: 48, paddingHorizontal: SPACING.md },
  saveButton: { alignItems: 'center', backgroundColor: COLORS.gold, borderRadius: RADIUS.md, justifyContent: 'center', marginTop: SPACING.md, minHeight: 52 },
  saveText: { color: COLORS.textInverse, fontSize: FONT_SIZES.md, fontWeight: '800' },
  disabled: { opacity: 0.55 },
});

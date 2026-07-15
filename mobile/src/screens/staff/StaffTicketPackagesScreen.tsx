import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, ScreenHeader } from '@/components/common';
import { useAppAlert } from '@/contexts/AppAlertContext';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import { useToast } from '@/hooks/useToast';
import type { StaffManagementStackParamList } from '@/navigation/StaffNavigator';
import { staffService, type TicketPackage, type TicketPackageInput } from '@/services/api/staff';

type Props = NativeStackScreenProps<StaffManagementStackParamList, 'TicketPackages'>;
const TYPES: TicketPackage['type'][] = ['hourly', 'daily', 'monthly', 'yearly'];
const emptyForm: TicketPackageInput = { name: '', type: 'monthly', price: 0, description: '', isActive: true };

export function StaffTicketPackagesScreen({ navigation }: Props) {
  const [items, setItems] = useState<TicketPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<TicketPackage | null>(null);
  const [form, setForm] = useState<TicketPackageInput>(emptyForm);
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const { alert } = useAppAlert();

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await staffService.getTicketPackages();
      setItems(response.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load ticket packages.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const showForm = (item?: TicketPackage) => {
    setEditing(item ?? null);
    setForm(item ? { name: item.name, type: item.type, price: item.price, description: item.description ?? '', isActive: item.isActive } : emptyForm);
    setOpen(true);
  };
  const save = async () => {
    if (!form.name.trim() || !Number.isFinite(form.price) || form.price < 0) {
      toast.showError('Check package details', 'A name and valid price are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim(), description: form.description?.trim() };
      if (editing) await staffService.updateTicketPackage(editing._id, payload);
      else await staffService.createTicketPackage(payload);
      setOpen(false);
      toast.showSuccess(editing ? 'Package updated' : 'Package created');
      await load();
    } catch (saveError) {
      toast.showError('Unable to save package', saveError instanceof Error ? saveError.message : undefined);
    } finally { setSaving(false); }
  };
  const remove = (item: TicketPackage) => alert('Delete package', `Delete ${item.name}? This cannot be undone.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await staffService.deleteTicketPackage(item._id); toast.showSuccess('Package deleted'); await load(); }
      catch (deleteError) { toast.showError('Unable to delete package', deleteError instanceof Error ? deleteError.message : undefined); }
    } },
  ]);

  return <SafeAreaView edges={['top']} style={styles.safe}>
    <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
    <ScreenHeader title="Ticket packages" onBack={navigation.goBack} right={<Pressable accessibilityLabel="Create package" onPress={() => showForm()} style={styles.add}><Ionicons name="add" size={22} color={COLORS.textInverse} /></Pressable>} />
    {loading ? <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View> : error ? <ErrorState message={error} onRetry={load} /> :
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} tintColor={COLORS.gold} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        {items.length === 0 ? <EmptyState icon="ticket-outline" title="No ticket packages" message="Create the first plan available to customers." accentColor={COLORS.gold} /> : items.map(item =>
          <View key={item._id} style={styles.card}>
            <View style={styles.cardTop}><View style={styles.copy}><Text style={styles.name}>{item.name}</Text><Text style={styles.type}>{item.type.toUpperCase()} · {item.isActive ? 'ACTIVE' : 'INACTIVE'}</Text></View><Text style={styles.price}>{item.price.toLocaleString('vi-VN')} ₫</Text></View>
            {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
            <View style={styles.actions}><Pressable onPress={() => showForm(item)} style={styles.secondary}><Ionicons name="create-outline" size={17} color={COLORS.gold} /><Text style={styles.secondaryText}>Edit</Text></Pressable><Pressable onPress={() => remove(item)} style={styles.secondary}><Ionicons name="trash-outline" size={17} color={COLORS.error} /><Text style={[styles.secondaryText, { color: COLORS.error }]}>Delete</Text></Pressable></View>
          </View>)}
      </ScrollView>}
    <Modal animationType="slide" transparent visible={open} onRequestClose={() => setOpen(false)}><View style={styles.overlay}><View style={styles.sheet}>
      <View style={styles.sheetHead}><Text style={styles.sheetTitle}>{editing ? 'Edit package' : 'New package'}</Text><Pressable onPress={() => setOpen(false)} style={styles.close}><Ionicons name="close" size={22} color={COLORS.textSecondary} /></Pressable></View>
      <ScrollView keyboardShouldPersistTaps="handled"><Text style={styles.label}>Package name</Text><TextInput value={form.name} onChangeText={name => setForm(v => ({ ...v, name }))} placeholder="Monthly parking" placeholderTextColor={COLORS.textMuted} style={styles.input} />
      <Text style={styles.label}>Plan type</Text><View style={styles.pills}>{TYPES.map(type => <Pressable key={type} onPress={() => setForm(v => ({ ...v, type }))} style={[styles.pill, form.type === type && styles.pillActive]}><Text style={[styles.pillText, form.type === type && styles.pillTextActive]}>{type}</Text></Pressable>)}</View>
      <Text style={styles.label}>Price (VND)</Text><TextInput value={form.price ? String(form.price) : ''} onChangeText={price => setForm(v => ({ ...v, price: Number(price.replace(/\D/g, '')) }))} keyboardType="number-pad" placeholder="0" placeholderTextColor={COLORS.textMuted} style={styles.input} />
      <Text style={styles.label}>Description</Text><TextInput value={form.description} onChangeText={description => setForm(v => ({ ...v, description }))} multiline placeholder="What does this plan include?" placeholderTextColor={COLORS.textMuted} style={[styles.input, styles.textarea]} />
      <View style={styles.switchRow}><View><Text style={styles.switchTitle}>Available for sale</Text><Text style={styles.hint}>Customers can choose this package.</Text></View><Switch value={form.isActive} onValueChange={isActive => setForm(v => ({ ...v, isActive }))} trackColor={{ false: COLORS.surfaceElevated, true: COLORS.goldDark }} thumbColor={form.isActive ? COLORS.gold : COLORS.textMuted} /></View>
      <Pressable disabled={saving} onPress={save} style={[styles.save, saving && styles.disabled]}>{saving ? <ActivityIndicator color={COLORS.textInverse} /> : <Text style={styles.saveText}>Save package</Text>}</Pressable></ScrollView>
    </View></View></Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:COLORS.background}, center:{flex:1,alignItems:'center',justifyContent:'center'}, scroll:{padding:SPACING.lg,paddingBottom:80,gap:SPACING.md}, add:{width:44,height:44,borderRadius:RADIUS.md,backgroundColor:COLORS.gold,alignItems:'center',justifyContent:'center'}, card:{backgroundColor:COLORS.surface,borderWidth:1,borderColor:COLORS.border,borderRadius:RADIUS.lg,padding:SPACING.md,gap:SPACING.sm}, cardTop:{flexDirection:'row',alignItems:'flex-start',gap:SPACING.md}, copy:{flex:1}, name:{color:COLORS.textPrimary,fontSize:FONT_SIZES.lg,fontWeight:'700'}, type:{color:COLORS.gold,fontSize:FONT_SIZES.xs,fontWeight:'700',marginTop:4}, price:{color:COLORS.textPrimary,fontSize:FONT_SIZES.md,fontWeight:'800'}, description:{color:COLORS.textSecondary,fontSize:FONT_SIZES.sm,lineHeight:20}, actions:{flexDirection:'row',gap:SPACING.sm,marginTop:SPACING.xs}, secondary:{minHeight:44,flex:1,borderWidth:1,borderColor:COLORS.border,borderRadius:RADIUS.md,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6}, secondaryText:{color:COLORS.gold,fontSize:FONT_SIZES.sm,fontWeight:'700'}, overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.72)',justifyContent:'flex-end'}, sheet:{maxHeight:'90%',backgroundColor:COLORS.surface,borderTopLeftRadius:RADIUS.xl,borderTopRightRadius:RADIUS.xl,padding:SPACING.lg,paddingBottom:32}, sheetHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:SPACING.md}, sheetTitle:{color:COLORS.textPrimary,fontSize:FONT_SIZES.xl,fontWeight:'800'}, close:{width:44,height:44,alignItems:'center',justifyContent:'center'}, label:{color:COLORS.textSecondary,fontSize:FONT_SIZES.sm,fontWeight:'600',marginTop:SPACING.md,marginBottom:SPACING.xs}, input:{minHeight:48,color:COLORS.textPrimary,backgroundColor:COLORS.surfaceElevated,borderWidth:1,borderColor:COLORS.border,borderRadius:RADIUS.md,paddingHorizontal:SPACING.md}, textarea:{height:92,paddingTop:SPACING.md,textAlignVertical:'top'}, pills:{flexDirection:'row',flexWrap:'wrap',gap:SPACING.sm}, pill:{minHeight:40,paddingHorizontal:SPACING.md,borderRadius:RADIUS.round,borderWidth:1,borderColor:COLORS.border,alignItems:'center',justifyContent:'center'}, pillActive:{borderColor:COLORS.gold,backgroundColor:'rgba(212,175,55,0.1)'}, pillText:{color:COLORS.textMuted,textTransform:'capitalize'}, pillTextActive:{color:COLORS.gold,fontWeight:'700'}, switchRow:{minHeight:64,marginTop:SPACING.md,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}, switchTitle:{color:COLORS.textPrimary,fontWeight:'700'}, hint:{color:COLORS.textMuted,fontSize:FONT_SIZES.xs,marginTop:3}, save:{height:52,backgroundColor:COLORS.gold,borderRadius:RADIUS.md,alignItems:'center',justifyContent:'center',marginTop:SPACING.lg}, saveText:{color:COLORS.textInverse,fontWeight:'800'}, disabled:{opacity:0.55},
});

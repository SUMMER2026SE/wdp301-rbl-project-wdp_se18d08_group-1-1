import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, ScreenHeader } from '@/components/common';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import { useToast } from '@/hooks/useToast';
import type { StaffManagementStackParamList } from '@/navigation/StaffNavigator';
import { notificationsService, type StaffNotificationInput } from '@/services/api/notifications';
import { staffService, type StaffCustomer } from '@/services/api/staff';
import type { UserNotification } from '@/types/models';

type Props = NativeStackScreenProps<StaffManagementStackParamList, 'StaffNotifications'>;
type Audience = StaffNotificationInput['targetType'];
const priorities: StaffNotificationInput['priority'][] = ['INFO', 'SUCCESS', 'WARNING', 'ERROR'];

export function StaffNotificationManagementScreen({ navigation }: Props) {
  const [tab, setTab] = useState<'history' | 'compose'>('history');
  const [history, setHistory] = useState<UserNotification[]>([]);
  const [customers, setCustomers] = useState<StaffCustomer[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [audience, setAudience] = useState<Audience>('ALL_USERS');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<StaffNotificationInput['priority']>('INFO');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const load = useCallback(async () => {
    setError('');
    try {
      const [historyResponse, customerResponse] = await Promise.all([notificationsService.getStaffHistory(), staffService.getCustomers()]);
      setHistory(historyResponse.data ?? []);
      setCustomers(customerResponse.data ?? []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load notifications.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => customers.filter(customer => `${customer.profile?.fullName ?? ''} ${customer.username ?? ''} ${customer.email}`.toLowerCase().includes(search.toLowerCase())), [customers, search]);
  const chooseAudience = (value: Audience) => { setAudience(value); setSelected([]); };
  const toggleCustomer = (id: string) => setSelected(current => audience === 'SINGLE_USER' ? [id] : current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  const send = async () => {
    if (!title.trim() || !content.trim()) { toast.showError('Complete the message', 'Title and message are required.'); return; }
    if (audience !== 'ALL_USERS' && selected.length === 0) { toast.showError('Choose recipients'); return; }
    setSending(true);
    try {
      await notificationsService.createStaffNotification({ title: title.trim(), content: content.trim(), type: 'SYSTEM', priority, targetType: audience, targetUsers: selected });
      setTitle(''); setContent(''); setSelected([]); setTab('history'); toast.showSuccess('Notification sent'); await load();
    } catch (sendError) { toast.showError('Unable to send notification', sendError instanceof Error ? sendError.message : undefined); }
    finally { setSending(false); }
  };

  return <SafeAreaView edges={['top']} style={styles.safe}><StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
    <ScreenHeader title="Notifications" onBack={navigation.goBack} />
    <View style={styles.tabs}>{(['history','compose'] as const).map(value => <Pressable key={value} onPress={() => setTab(value)} style={[styles.tab,tab===value&&styles.tabActive]}><Text style={[styles.tabText,tab===value&&styles.tabTextActive]}>{value === 'history' ? 'History' : 'Compose'}</Text></Pressable>)}</View>
    {loading ? <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View> : error ? <ErrorState message={error} onRetry={load} /> : tab === 'history' ?
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} tintColor={COLORS.gold} onRefresh={async()=>{setRefreshing(true);await load();setRefreshing(false);}} />}>
        {history.length === 0 ? <EmptyState icon="notifications-outline" title="No notifications sent" message="Messages sent by staff will appear here." accentColor={COLORS.gold} /> : history.map((item,index)=><View key={item._id ?? item.id ?? `${item.createdAt}-${index}`} style={styles.card}><View style={styles.cardHead}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.priority}>{item.priority}</Text></View><Text style={styles.body}>{item.content}</Text><Text style={styles.date}>{new Date(item.createdAt).toLocaleString('en-GB')}</Text></View>)}
      </ScrollView> :
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <Text style={styles.label}>Audience</Text><View style={styles.pills}><AudiencePill label="All customers" active={audience==='ALL_USERS'} onPress={()=>chooseAudience('ALL_USERS')} /><AudiencePill label="One customer" active={audience==='SINGLE_USER'} onPress={()=>chooseAudience('SINGLE_USER')} /><AudiencePill label="Selected customers" active={audience==='MULTI_USER'} onPress={()=>chooseAudience('MULTI_USER')} /></View>
        {audience !== 'ALL_USERS' ? <View><TextInput value={search} onChangeText={setSearch} placeholder="Search customers" placeholderTextColor={COLORS.textMuted} style={styles.input} /><View style={styles.customerList}>{filtered.slice(0,20).map(customer=>{const active=selected.includes(customer._id);return <Pressable key={customer._id} onPress={()=>toggleCustomer(customer._id)} style={[styles.customer,active&&styles.customerActive]}><Ionicons name={active?'checkbox':'square-outline'} size={20} color={active?COLORS.gold:COLORS.textMuted}/><View style={{flex:1}}><Text style={styles.customerName}>{customer.profile?.fullName || customer.username || 'Customer'}</Text><Text style={styles.customerEmail}>{customer.email}</Text></View></Pressable>})}</View></View> : null}
        <Text style={styles.label}>Priority</Text><View style={styles.pills}>{priorities.map(value=><AudiencePill key={value} label={value.toLowerCase()} active={priority===value} onPress={()=>setPriority(value)} />)}</View>
        <Text style={styles.label}>Title</Text><TextInput value={title} onChangeText={setTitle} maxLength={100} placeholder="Short, clear subject" placeholderTextColor={COLORS.textMuted} style={styles.input}/>
        <Text style={styles.label}>Message</Text><TextInput value={content} onChangeText={setContent} maxLength={1000} multiline placeholder="Write the customer-facing message" placeholderTextColor={COLORS.textMuted} style={[styles.input,styles.textarea]}/>
        <Pressable disabled={sending} onPress={send} style={[styles.send,sending&&styles.disabled]}>{sending?<ActivityIndicator color={COLORS.textInverse}/>:<><Ionicons name="send" size={18} color={COLORS.textInverse}/><Text style={styles.sendText}>Send notification</Text></>}</Pressable>
      </ScrollView>}
  </SafeAreaView>;
}

function AudiencePill({label,active,onPress}:{label:string;active:boolean;onPress:()=>void}) { return <Pressable onPress={onPress} style={[styles.pill,active&&styles.pillActive]}><Text style={[styles.pillText,active&&styles.pillTextActive]}>{label}</Text></Pressable>; }
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:COLORS.background},center:{flex:1,alignItems:'center',justifyContent:'center'},tabs:{flexDirection:'row',marginHorizontal:SPACING.lg,backgroundColor:COLORS.surface,borderRadius:RADIUS.md,padding:4},tab:{flex:1,minHeight:40,alignItems:'center',justifyContent:'center',borderRadius:RADIUS.sm},tabActive:{backgroundColor:'rgba(212,175,55,0.14)'},tabText:{color:COLORS.textMuted,fontWeight:'700'},tabTextActive:{color:COLORS.gold},scroll:{padding:SPACING.lg,paddingBottom:80,gap:SPACING.md},card:{backgroundColor:COLORS.surface,borderWidth:1,borderColor:COLORS.border,borderRadius:RADIUS.lg,padding:SPACING.md,gap:8},cardHead:{flexDirection:'row',gap:SPACING.md,alignItems:'flex-start'},cardTitle:{flex:1,color:COLORS.textPrimary,fontSize:FONT_SIZES.md,fontWeight:'700'},priority:{color:COLORS.gold,fontSize:FONT_SIZES.xs,fontWeight:'800'},body:{color:COLORS.textSecondary,fontSize:FONT_SIZES.sm,lineHeight:20},date:{color:COLORS.textMuted,fontSize:FONT_SIZES.xs},label:{color:COLORS.textSecondary,fontSize:FONT_SIZES.sm,fontWeight:'700',marginTop:SPACING.xs},pills:{flexDirection:'row',flexWrap:'wrap',gap:SPACING.sm},pill:{minHeight:40,paddingHorizontal:SPACING.md,borderRadius:RADIUS.round,borderWidth:1,borderColor:COLORS.border,alignItems:'center',justifyContent:'center'},pillActive:{borderColor:COLORS.gold,backgroundColor:'rgba(212,175,55,0.1)'},pillText:{color:COLORS.textMuted,textTransform:'capitalize'},pillTextActive:{color:COLORS.gold,fontWeight:'700'},input:{minHeight:48,color:COLORS.textPrimary,backgroundColor:COLORS.surface,borderWidth:1,borderColor:COLORS.border,borderRadius:RADIUS.md,paddingHorizontal:SPACING.md},textarea:{height:128,paddingTop:SPACING.md,textAlignVertical:'top'},customerList:{borderWidth:1,borderColor:COLORS.border,borderRadius:RADIUS.md,overflow:'hidden',marginTop:SPACING.sm},customer:{minHeight:58,flexDirection:'row',alignItems:'center',gap:SPACING.sm,paddingHorizontal:SPACING.md,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:COLORS.border},customerActive:{backgroundColor:'rgba(212,175,55,0.08)'},customerName:{color:COLORS.textPrimary,fontWeight:'600'},customerEmail:{color:COLORS.textMuted,fontSize:FONT_SIZES.xs,marginTop:2},send:{height:52,borderRadius:RADIUS.md,backgroundColor:COLORS.gold,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8,marginTop:SPACING.sm},sendText:{color:COLORS.textInverse,fontWeight:'800'},disabled:{opacity:.55}});

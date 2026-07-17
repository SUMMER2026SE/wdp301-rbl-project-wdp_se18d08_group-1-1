import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/common';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import type { StaffTabParamList } from '@/navigation/StaffNavigator';
import { staffService, type StaffBooking, type StaffSession } from '@/services/api/staff';
import { parkingFloorService } from '@/services/ParkingFloorService';
import type { ParkingFloor } from '@/types/booking.types';

type Props = BottomTabScreenProps<StaffTabParamList, 'Dashboard'>;
type Snapshot = { floors: ParkingFloor[]; sessions: StaffSession[]; bookings: StaffBooking[] };
const floorCapacity = (floor: ParkingFloor) => floor.slots?.length ?? floor.layout?.elements?.filter(item => item.type === 'slot').length ?? floor.layoutData?.elements?.filter((item: { type?: string }) => item.type === 'slot').length ?? 0;

export default function StaffDashboardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<Snapshot>({ floors: [], sessions: [], bookings: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [floors, sessionResponse, bookingResponse] = await Promise.all([parkingFloorService.getParkingFloors(), staffService.getSessions(), staffService.getBookings({ date: today })]);
      setSnapshot({ floors, sessions: sessionResponse.data ?? [], bookings: bookingResponse.data ?? [] });
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load the operations overview.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const metrics = useMemo(() => {
    const capacity = snapshot.floors.reduce((sum, floor) => sum + floorCapacity(floor), 0);
    const active = snapshot.sessions.filter(item => item.status?.toLowerCase() === 'active').length;
    const completed = snapshot.sessions.filter(item => item.status?.toLowerCase() === 'completed' && item.checkOutTime && new Date(item.checkOutTime).toDateString() === new Date().toDateString());
    const avgMinutes = completed.length ? Math.round(completed.reduce((sum, item) => sum + (new Date(item.checkOutTime!).getTime() - new Date(item.checkInTime).getTime()) / 60000, 0) / completed.length) : 0;
    const cancelled = snapshot.bookings.filter(item => item.status?.toLowerCase() === 'cancelled').length;
    return { capacity, active, available: Math.max(capacity - active, 0), avgMinutes, cancelled, bookings: snapshot.bookings.length };
  }, [snapshot]);
  const displayName = user?.username || 'Staff member';
  const goManage = (screen: 'Customers'|'Bookings'|'StaffNotifications') =>
    navigation.navigate('Manage', { screen, initial: false });

  return <SafeAreaView edges={['top']} style={styles.safe}><StatusBar barStyle="light-content" backgroundColor={COLORS.background}/>
    <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} tintColor={COLORS.gold} onRefresh={async()=>{setRefreshing(true);await load();setRefreshing(false);}} />}>
      <View style={styles.header}><View style={{flex:1}}><Text style={styles.eyebrow}>{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short'})}</Text><Text style={styles.title}>Good {new Date().getHours()<12?'morning':new Date().getHours()<18?'afternoon':'evening'}, {displayName}</Text><Text style={styles.subtitle}>Your live operations snapshot</Text></View><View style={styles.avatar}><Text style={styles.avatarText}>{displayName[0].toUpperCase()}</Text></View></View>
      {loading ? <View style={styles.loading}><ActivityIndicator color={COLORS.gold}/><Text style={styles.muted}>Loading live operations...</Text></View> : error ? <ErrorState message={error} onRetry={load}/> : <>
        <Pressable onPress={()=>navigation.navigate('LiveGrid')} style={styles.hero}><View><Text style={styles.heroLabel}>PARKING AVAILABILITY</Text><Text style={styles.heroValue}>{metrics.available}<Text style={styles.heroUnit}> / {metrics.capacity} spaces</Text></Text><Text style={styles.heroHint}>{metrics.active} vehicles currently parked</Text></View><Ionicons name="arrow-forward-circle" size={34} color={COLORS.gold}/></Pressable>
        <View style={styles.metricRow}><Metric label="Today's bookings" value={String(metrics.bookings)} icon="calendar-outline"/><Metric label="Avg. dwell" value={metrics.avgMinutes ? `${metrics.avgMinutes} min` : 'No data'} icon="time-outline"/><Metric label="Cancelled" value={String(metrics.cancelled)} icon="close-circle-outline" semantic={metrics.cancelled>0}/></View>
        <Text style={styles.section}>Quick actions</Text><View style={styles.actions}>
          <Action icon="map-outline" title="Live grid" detail="Monitor occupied spaces" onPress={()=>navigation.navigate('LiveGrid')}/>
          <Action icon="car-sport-outline" title="Sessions" detail="Review parking activity" onPress={()=>navigation.navigate('Sessions')}/>
          <Action icon="people-outline" title="Customers" detail="Profiles and account access" onPress={()=>goManage('Customers')}/>
          <Action icon="calendar-outline" title="Bookings" detail="Today's reservations" onPress={()=>goManage('Bookings')}/>
          <Action icon="notifications-outline" title="Notify customers" detail="Compose an operational notice" onPress={()=>goManage('StaffNotifications')}/>
        </View>
      </>}
    </ScrollView>
  </SafeAreaView>;
}

function Metric({label,value,icon,semantic=false}:{label:string;value:string;icon:React.ComponentProps<typeof Ionicons>['name'];semantic?:boolean}) { return <View style={styles.metric}><Ionicons name={icon} size={18} color={semantic?COLORS.error:COLORS.gold}/><Text style={[styles.metricValue,semantic&&{color:COLORS.error}]} numberOfLines={1}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }
function Action({icon,title,detail,onPress}:{icon:React.ComponentProps<typeof Ionicons>['name'];title:string;detail:string;onPress:()=>void}) { return <Pressable onPress={onPress} style={({pressed})=>[styles.action,pressed&&styles.pressed]}><View style={styles.actionIcon}><Ionicons name={icon} size={20} color={COLORS.gold}/></View><View style={{flex:1}}><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionDetail}>{detail}</Text></View><Ionicons name="chevron-forward" size={18} color={COLORS.textMuted}/></Pressable>; }
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:COLORS.background},scroll:{padding:SPACING.lg,paddingBottom:96},header:{flexDirection:'row',alignItems:'center',gap:SPACING.md,marginBottom:SPACING.lg},eyebrow:{color:COLORS.gold,fontSize:FONT_SIZES.xs,fontWeight:'800',letterSpacing:1,textTransform:'uppercase'},title:{color:COLORS.textPrimary,fontSize:24,fontWeight:'800',letterSpacing:-.4,marginTop:4},subtitle:{color:COLORS.textMuted,fontSize:FONT_SIZES.sm,marginTop:4},avatar:{width:46,height:46,borderRadius:23,backgroundColor:'rgba(212,175,55,.12)',borderWidth:1,borderColor:COLORS.gold,alignItems:'center',justifyContent:'center'},avatarText:{color:COLORS.gold,fontWeight:'800',fontSize:FONT_SIZES.lg},loading:{minHeight:220,alignItems:'center',justifyContent:'center',gap:SPACING.sm},muted:{color:COLORS.textMuted},hero:{minHeight:150,backgroundColor:COLORS.surface,borderWidth:1,borderColor:'rgba(212,175,55,.3)',borderRadius:RADIUS.xl,padding:SPACING.lg,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},heroLabel:{color:COLORS.gold,fontSize:FONT_SIZES.xs,fontWeight:'800',letterSpacing:1},heroValue:{color:COLORS.textPrimary,fontSize:38,fontWeight:'900',letterSpacing:-1,marginTop:10},heroUnit:{fontSize:FONT_SIZES.sm,color:COLORS.textSecondary,fontWeight:'600'},heroHint:{color:COLORS.textMuted,fontSize:FONT_SIZES.sm,marginTop:4},metricRow:{flexDirection:'row',gap:SPACING.sm,marginTop:SPACING.sm},metric:{flex:1,minHeight:104,backgroundColor:COLORS.surface,borderWidth:1,borderColor:COLORS.border,borderRadius:RADIUS.lg,padding:SPACING.sm,justifyContent:'space-between'},metricValue:{color:COLORS.textPrimary,fontSize:FONT_SIZES.lg,fontWeight:'800'},metricLabel:{color:COLORS.textMuted,fontSize:11,lineHeight:15},section:{color:COLORS.textPrimary,fontSize:FONT_SIZES.lg,fontWeight:'800',marginTop:SPACING.xl,marginBottom:SPACING.sm},actions:{borderWidth:1,borderColor:COLORS.border,borderRadius:RADIUS.xl,overflow:'hidden'},action:{minHeight:72,backgroundColor:COLORS.surface,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:COLORS.border,padding:SPACING.md,flexDirection:'row',alignItems:'center',gap:SPACING.md},pressed:{backgroundColor:COLORS.surfaceElevated},actionIcon:{width:42,height:42,borderRadius:RADIUS.md,backgroundColor:'rgba(212,175,55,.1)',alignItems:'center',justifyContent:'center'},actionTitle:{color:COLORS.textPrimary,fontWeight:'700'},actionDetail:{color:COLORS.textMuted,fontSize:FONT_SIZES.xs,marginTop:3}});

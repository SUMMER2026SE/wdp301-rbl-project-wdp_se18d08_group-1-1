import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ErrorState } from '@/components/common';
import { walletService } from '@/services/api/wallet';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import { formatCurrency } from '@/utils/formatters';
import type { WalletStackParamList } from '@/navigation/types';
import type { Wallet } from '@/types/models';
type Props = NativeStackScreenProps<WalletStackParamList, 'Wallet'>;

function ActionBtn({ icon, label, color, bg, onPress }: { icon: string; label: string; color: string; bg: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.actionIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export const WalletScreen = ({ navigation }: Props) => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try {
      const res = await walletService.getWallet();
      setWallet(res.data || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load wallet.');
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} colors={[COLORS.gold]} />}>
        {error ? (
          <View style={styles.errorWrap}>
            <ErrorState message={error} onRetry={load} />
          </View>
        ) : (
          <>
            <View style={styles.balanceCard}>
              <LinearGradient colors={['#1C1A0F','#0D0D0D']} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={[COLORS.gold,'transparent']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.topLine} />
              <Text style={styles.balanceLabel}>Available balance</Text>
              {loading ? <ActivityIndicator color={COLORS.gold} size="large" style={{marginVertical:SPACING.lg}} /> : <Text style={styles.balanceValue}>{formatCurrency(wallet?.balance ?? 0)}</Text>}
              {wallet?.overdraftLimit !== undefined && wallet.overdraftLimit < 0 && <Text style={styles.overdraftText}>Overdraft: {formatCurrency(wallet.overdraftLimit)}</Text>}
            </View>
            <View style={styles.actionsRow}>
              <ActionBtn icon="add-circle-outline" label="Top up" color={COLORS.gold} bg="rgba(212,175,55,0.12)" onPress={() => navigation.navigate('TopUp')} />
              <ActionBtn icon="time-outline" label="History" color="#60B4FF" bg="rgba(96,180,255,0.12)" onPress={() => navigation.navigate('TransactionHistory')} />
              <ActionBtn icon="ribbon-outline" label="Membership" color="#FFD700" bg="rgba(255,215,0,0.12)" onPress={() => navigation.navigate('Membership')} />
              <ActionBtn icon="cube-outline" label="Plans" color="#E07BE0" bg="rgba(224,123,224,0.12)" onPress={() => navigation.navigate('SubscriptionPackages')} />
            </View>
            {wallet && <>
              <Text style={styles.sectionTitle}>This month</Text>
              <View style={styles.statsRow}>
                <View style={styles.statCard}><Ionicons name="arrow-down-circle-outline" size={20} color="#7EE8A2" /><Text style={[styles.statValue,{color:'#7EE8A2'}]}>{formatCurrency(wallet.monthlyTopUp??0)}</Text><Text style={styles.statLabel}>Added</Text></View>
                <View style={styles.statCard}><Ionicons name="arrow-up-circle-outline" size={20} color="#FF9F43" /><Text style={[styles.statValue,{color:'#FF9F43'}]}>{formatCurrency(wallet.monthlySpent??0)}</Text><Text style={styles.statLabel}>Spent</Text></View>
                <View style={styles.statCard}><Ionicons name="refresh-circle-outline" size={20} color="#60B4FF" /><Text style={[styles.statValue,{color:'#60B4FF'}]}>{formatCurrency(wallet.monthlyRefunded??0)}</Text><Text style={styles.statLabel}>Refunded</Text></View>
              </View>
            </>}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:COLORS.background},
  balanceCard:{marginHorizontal:SPACING.lg,marginTop:SPACING.md,marginBottom:SPACING.md,borderRadius:RADIUS.xl,padding:SPACING.xl,borderWidth:1,borderColor:'rgba(212,175,55,0.25)',overflow:'hidden',alignItems:'center'},
  topLine:{position:'absolute',top:0,left:0,right:0,height:2},
  balanceLabel:{fontSize:FONT_SIZES.sm,color:COLORS.textSecondary,marginBottom:SPACING.sm},
  balanceValue:{fontSize:36,fontWeight:'800',color:COLORS.gold,letterSpacing:1},
  overdraftText:{fontSize:FONT_SIZES.xs,color:COLORS.textMuted,marginTop:SPACING.sm},
  actionsRow:{flexDirection:'row',justifyContent:'space-around',paddingHorizontal:SPACING.lg,marginBottom:SPACING.sm},
  actionBtn:{alignItems:'center',gap:SPACING.xs},
  actionIconWrap:{width:52,height:52,borderRadius:RADIUS.md,justifyContent:'center',alignItems:'center'},
  actionLabel:{fontSize:FONT_SIZES.xs,color:COLORS.textSecondary},
  sectionTitle:{fontSize:FONT_SIZES.sm,fontWeight:'600',color:COLORS.textMuted,textTransform:'uppercase',letterSpacing:0.5,paddingHorizontal:SPACING.lg,paddingTop:SPACING.lg,paddingBottom:SPACING.sm},
  statsRow:{flexDirection:'row',paddingHorizontal:SPACING.lg,gap:SPACING.sm,marginBottom:SPACING.xl},
  statCard:{flex:1,backgroundColor:COLORS.surface,borderRadius:RADIUS.lg,padding:SPACING.md,alignItems:'center',gap:4,borderWidth:1,borderColor:COLORS.border},
  statValue:{fontSize:FONT_SIZES.md,fontWeight:'700'},
  statLabel:{fontSize:FONT_SIZES.xs,color:COLORS.textMuted},
  errorWrap:{paddingHorizontal:SPACING.lg,paddingTop:SPACING.lg},
});

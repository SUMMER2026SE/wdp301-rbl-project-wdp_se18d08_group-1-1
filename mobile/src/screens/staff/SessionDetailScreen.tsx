import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import { formatCurrency } from '@/utils/formatters';
import type { StaffSessionStackParamList } from './SessionListScreen';

// ─── Types ────────────────────────────────────────────────────────────────────
type Props = NativeStackScreenProps<StaffSessionStackParamList, 'SessionDetail'>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, valueColor }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={16} color={COLORS.textMuted} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
      </View>
    </View>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  kiosk:       'Self-service kiosk',
  app_booking: 'App booking',
  booking:     'Booked',
  walk_in:     'Walk-in',
};

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  car:           'Car',
  electric_car:  'Electric car',
  motorcycle:    'Motorcycle',
};

// ─── Screen ───────────────────────────────────────────────────────────────────
function SecurityRecord({
  type,
  time,
  imageUrl,
  camera,
  gate,
  onPreview,
}: {
  type: 'entry' | 'exit';
  time?: string;
  imageUrl?: string;
  camera?: string;
  gate?: string;
  onPreview: (url: string) => void;
}) {
  const [imageLoading, setImageLoading] = useState(Boolean(imageUrl));
  const [imageFailed, setImageFailed] = useState(false);
  const isEntry = type === 'entry';
  const accent = isEntry ? COLORS.staffBlue : '#34D399';

  return (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={[styles.recordIcon, { backgroundColor: `${accent}18` }]}>
          <Ionicons name="camera-outline" size={18} color={accent} />
        </View>
        <View style={styles.recordHeading}>
          <Text style={styles.recordTitle}>
            {isEntry ? 'Entry record' : 'Exit record'}
          </Text>
          <Text style={styles.recordSubtitle}>
            {isEntry ? 'Vehicle arrival evidence' : 'Vehicle departure evidence'}
          </Text>
        </View>
      </View>

      <View style={styles.recordTimeCard}>
        <Text style={styles.recordTimeLabel}>
          {isEntry ? 'Check-in time' : 'Check-out time'}
        </Text>
        <Text style={styles.recordTimeValue}>
          {time ? format(new Date(time), 'HH:mm:ss dd/MM/yyyy') : 'Not recorded yet'}
        </Text>
        {camera || gate ? (
          <Text style={styles.recordMeta}>
            {[camera, gate].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>

      {imageUrl && !imageFailed ? (
        <TouchableOpacity
          accessibilityLabel={`Open ${type} image`}
          accessibilityRole="imagebutton"
          activeOpacity={0.86}
          onPress={() => onPreview(imageUrl)}
          style={styles.imageFrame}
        >
          <Image
            accessibilityLabel={`${type} security image`}
            onError={() => {
              setImageFailed(true);
              setImageLoading(false);
            }}
            onLoadEnd={() => setImageLoading(false)}
            onLoadStart={() => setImageLoading(true)}
            resizeMode="cover"
            source={{ uri: imageUrl }}
            style={styles.securityImage}
          />
          {imageLoading ? (
            <View style={styles.imageLoading}>
              <ActivityIndicator color={accent} />
              <Text style={styles.imageLoadingText}>Loading image...</Text>
            </View>
          ) : null}
          {!imageLoading ? (
            <View style={styles.previewHint}>
              <Ionicons name="expand-outline" size={14} color="#FFFFFF" />
              <Text style={styles.previewHintText}>View full image</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ) : (
        <View style={styles.imagePlaceholder}>
          <View style={[styles.placeholderIcon, { backgroundColor: `${accent}12` }]}>
            <Ionicons
              name={imageFailed ? 'cloud-offline-outline' : 'camera-outline'}
              size={28}
              color={COLORS.textMuted}
            />
          </View>
          <Text style={styles.placeholderTitle}>
            {imageFailed
              ? 'Image could not be loaded'
              : `No ${isEntry ? 'entry' : 'exit'} image`}
          </Text>
          <Text style={styles.placeholderText}>
            {imageFailed
              ? 'Check the image URL or network connection.'
              : 'No security image was recorded for this event.'}
          </Text>
        </View>
      )}
    </View>
  );
}

export const SessionDetailScreen = ({ navigation, route }: Props) => {
  const { session } = route.params;
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const checkIn  = new Date(session.checkInTime);
  const checkOut = session.checkOutTime ? new Date(session.checkOutTime) : null;

  const elapsedMins = checkOut
    ? Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000)
    : Math.floor((Date.now() - checkIn.getTime()) / 60000);
  const hours = Math.floor(elapsedMins / 60);
  const mins  = elapsedMins % 60;

  const isActive = session.status === 'active';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session details</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero card */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={isActive ? [COLORS.gold, 'transparent'] : [COLORS.textMuted, 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.cardTopLine}
          />
          <View style={styles.heroTop}>
            <View style={styles.plateWrap}>
              <Text style={styles.plateText}>{session.licensePlate}</Text>
            </View>
            <View style={[styles.statusBadge, isActive ? styles.statusBadgeActive : styles.statusBadgeDone]}>
              <View style={[styles.statusDot, { backgroundColor: isActive ? '#7EE8A2' : COLORS.textMuted }]} />
              <Text style={[styles.statusText, { color: isActive ? '#7EE8A2' : COLORS.textMuted }]}>
                {isActive ? 'Active' : 'Completed'}
              </Text>
            </View>
          </View>

          <View style={styles.heroSlot}>
            <Ionicons name="location" size={16} color={COLORS.gold} />
            <Text style={styles.heroSlotText}>{session.parkingSlot ?? 'Space not assigned'}</Text>
          </View>

          {/* Time bar */}
          <View style={styles.timeBar}>
            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>Check-in</Text>
              <Text style={styles.timeVal}>{format(checkIn, 'HH:mm')}</Text>
              <Text style={styles.timeDate}>{format(checkIn, 'dd/MM')}</Text>
            </View>
            <View style={styles.timeMid}>
              <Text style={styles.durationText}>
                {hours > 0 ? `${hours}g ` : ''}{mins}ph
              </Text>
              <View style={styles.durationLine} />
              {isActive && <View style={styles.pulsingDot} />}
            </View>
            <View style={[styles.timeBlock, { alignItems: 'flex-end' }]}>
              <Text style={styles.timeLabel}>Check-out</Text>
              {checkOut ? (
                <>
                  <Text style={styles.timeVal}>{format(checkOut, 'HH:mm')}</Text>
                  <Text style={styles.timeDate}>{format(checkOut, 'dd/MM')}</Text>
                </>
              ) : (
                <Text style={[styles.timeVal, { color: COLORS.textMuted }]}>--:--</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitleStrong}>Security records</Text>
              <Text style={styles.sectionDescription}>
                Vehicle entry and exit evidence
              </Text>
            </View>
            <View style={styles.evidenceBadge}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color={COLORS.staffBlue}
              />
              <Text style={styles.evidenceBadgeText}>
                {[session.entryImage_url, session.exitImage_url].filter(Boolean).length}/2 images
              </Text>
            </View>
          </View>
          <SecurityRecord
            type="entry"
            time={session.checkInTime}
            imageUrl={session.entryImage_url}
            camera={session.entryCamera}
            gate={session.entryGate}
            onPreview={setPreviewImage}
          />
          <SecurityRecord
            type="exit"
            time={session.checkOutTime}
            imageUrl={session.exitImage_url}
            camera={session.exitCamera}
            gate={session.exitGate}
            onPreview={setPreviewImage}
          />
        </View>

        {/* Vehicle info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle information</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="car-outline" label="Vehicle type"
              value={VEHICLE_TYPE_LABELS[session.vehicleType ?? ''] ?? session.vehicleType ?? 'Unknown'} />
            {session.source && (
              <>
                <View style={styles.divider} />
                <InfoRow icon="git-branch-outline" label="Entry source" value={SOURCE_LABELS[session.source] ?? session.source} />
              </>
            )}
          </View>
        </View>

        {/* Contact */}
        {session.phone && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer contact</Text>
            <View style={styles.infoCard}>
              <InfoRow icon="call-outline" label="Phone number" value={session.phone} />
            </View>
          </View>
        )}

        {/* Payment */}
        {session.totalPrice !== undefined && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment</Text>
            <View style={styles.infoCard}>
              <InfoRow
                icon="wallet-outline"
                label="Status"
                value={session.paymentStatus ?? 'Pending'}
                valueColor={session.paymentStatus === 'paid' ? '#7EE8A2' : undefined}
              />
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(session.totalPrice ?? 0)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ID reference */}
        <Text style={styles.idRef}>ID: {session._id}</Text>
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
        statusBarTranslucent
        transparent
        visible={Boolean(previewImage)}
      >
        <View style={styles.previewModal}>
          <Pressable
            accessibilityLabel="Close image preview"
            accessibilityRole="button"
            onPress={() => setPreviewImage(null)}
            style={StyleSheet.absoluteFill}
          />
          <TouchableOpacity
            accessibilityLabel="Close image preview"
            accessibilityRole="button"
            onPress={() => setPreviewImage(null)}
            style={styles.previewClose}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {previewImage ? (
            <Image
              accessibilityLabel="Security image preview"
              resizeMode="contain"
              source={{ uri: previewImage }}
              style={styles.previewImage}
            />
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
  },
  backBtn: { width: 32, height: 32, justifyContent: 'center' },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },

  scroll: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },

  heroCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg,
    borderWidth: 1, borderColor: 'rgba(96,180,255,0.2)', overflow: 'hidden', gap: SPACING.sm,
  },
  cardTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plateWrap: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.sm,
    borderWidth: 2, borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
  },
  plateText: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: 3 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.round,
  },
  statusBadgeActive: { backgroundColor: 'rgba(126,232,162,0.12)' },
  statusBadgeDone:   { backgroundColor: COLORS.surfaceElevated },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontSize: FONT_SIZES.xs, fontWeight: '600' },
  heroSlot: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroSlotText: { fontSize: FONT_SIZES.md, color: COLORS.gold, fontWeight: '600' },

  timeBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.sm,
  },
  timeBlock: { flex: 1 },
  timeLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted },
  timeVal:   { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  timeDate:  { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  timeMid: { alignItems: 'center', paddingHorizontal: SPACING.sm },
  durationText: { fontSize: FONT_SIZES.xs, color: COLORS.gold, fontWeight: '600', marginBottom: 4 },
  durationLine: { width: 40, height: 1, backgroundColor: COLORS.border },
  pulsingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7EE8A2', marginTop: 4 },

  section: { gap: SPACING.sm },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitleStrong: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
  },
  sectionDescription: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  evidenceBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(96,180,255,0.1)',
    borderRadius: RADIUS.round,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  evidenceBadgeText: {
    color: COLORS.staffBlue,
    fontSize: 10,
    fontWeight: '700',
  },
  recordCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    padding: SPACING.md,
  },
  recordHeader: { alignItems: 'center', flexDirection: 'row' },
  recordIcon: {
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    height: 38,
    justifyContent: 'center',
    marginRight: SPACING.sm,
    width: 38,
  },
  recordHeading: { flex: 1 },
  recordTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  recordSubtitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  recordTimeCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
    padding: SPACING.sm,
  },
  recordTimeLabel: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs },
  recordTimeValue: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.sm,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    marginTop: 2,
  },
  recordMeta: { color: COLORS.textMuted, fontSize: 10, marginTop: 3 },
  imageFrame: {
    aspectRatio: 16 / 9,
    backgroundColor: '#0A0C0F',
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.sm,
    overflow: 'hidden',
  },
  securityImage: { height: '100%', width: '100%' },
  imageLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  imageLoadingText: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs },
  previewHint: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: RADIUS.sm,
    bottom: SPACING.sm,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    position: 'absolute',
    right: SPACING.sm,
  },
  previewHintText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  imagePlaceholder: {
    alignItems: 'center',
    aspectRatio: 16 / 9,
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: SPACING.sm,
    padding: SPACING.md,
  },
  placeholderIcon: {
    alignItems: 'center',
    borderRadius: RADIUS.round,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  placeholderTitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  placeholderText: {
    color: COLORS.textMuted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
    maxWidth: 230,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xs },
  infoIconWrap: {
    width: 32, height: 32, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceElevated, justifyContent: 'center', alignItems: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted },
  infoValue: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: '500', marginTop: 1 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.xs },
  totalLabel: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  totalValue: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.gold },

  idRef: { textAlign: 'center', color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: SPACING.sm },
  previewModal: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.94)',
    flex: 1,
    justifyContent: 'center',
  },
  previewClose: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.round,
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: SPACING.lg,
    top: 52,
    width: 44,
    zIndex: 2,
  },
  previewImage: { height: '82%', width: '100%' },
});

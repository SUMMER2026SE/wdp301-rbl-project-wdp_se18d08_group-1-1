import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/theme';
import type { AvailableSlot, ParkingFloor } from '@/types/booking.types';

interface ParkingMap2DProps {
  floor: ParkingFloor;
  floorSlots: AvailableSlot[];
  selectedSlot: AvailableSlot | null;
  onSelectSlot: (slot: AvailableSlot | null) => void;
}

const SLOT_STATUS_COLOR: Record<string, string> = {
  available: '#7EE8A2',
  occupied: '#FF6B6B',
  booked: COLORS.staffBlue,
  reserved: COLORS.staffBlue,
  maintenance: '#A0A0A0',
};

export const ParkingMap2D = ({ floor, floorSlots, selectedSlot, onSelectSlot }: ParkingMap2DProps) => {
  // Parse layout data safely
  const layout = useMemo(() => {
    let parsedLayout = { width: 1000, height: 600, elements: [] as any[] };
    try {
      if (typeof floor.layoutData === 'string') {
        parsedLayout = JSON.parse(floor.layoutData);
      } else if (floor.layoutData) {
        parsedLayout = floor.layoutData;
      } else if (floor.layout) {
        parsedLayout = floor.layout as any;
      }
    } catch (e) {
      console.warn('Failed to parse layout data', e);
    }
    return parsedLayout;
  }, [floor.layout, floor.layoutData]);

  // Create lookup for slots by name
  const slotLookup = useMemo(() => {
    const lookup: Record<string, AvailableSlot> = {};
    floorSlots.forEach((slot) => {
      // Assuming slotCode maps to the element name in layout
      if (slot.slotCode) {
        lookup[slot.slotCode.toUpperCase()] = slot;
      }
    });
    return lookup;
  }, [floorSlots]);

  const mapWidth = layout.width || 1000;
  const mapHeight = layout.height || 600;

  const renderElement = (el: any) => {
    const isSlot = el.type && el.type.startsWith('slot');
    const hasName = !!el.name && el.name.trim() !== '';

    const baseStyle = {
      position: 'absolute' as const,
      left: Number(el.x) || 0,
      top: Number(el.y) || 0,
      width: Number(el.w) || 0,
      height: Number(el.h) || 0,
      transform: [{ rotate: `${el.rot || 0}deg` }],
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    };

    if (isSlot) {
      if (!hasName) return null; // Ignore slots without names

      const slotName = el.name.toUpperCase();
      const slotData = slotLookup[slotName];

      const isSelected = selectedSlot?.slotCode?.toUpperCase() === slotName && selectedSlot?.floorId === floor._id;
      const status = slotData ? 'available' : 'occupied'; // We only have available slots in floorSlots
      const isAvailable = status === 'available';

      const color = isSelected ? COLORS.gold : SLOT_STATUS_COLOR[status] || COLORS.textMuted;
      const bgColor = isSelected ? 'rgba(212,175,55,0.2)' : `${color}18`;

      return (
        <Pressable
          key={el.id}
          style={[
            baseStyle,
            styles.slotBox,
            {
              backgroundColor: bgColor,
              borderColor: color,
            },
          ]}
          onPress={() => {
            if (isAvailable || isSelected) {
              onSelectSlot(isSelected ? null : slotData);
            }
          }}
        >
          <Ionicons name={status === 'occupied' ? 'car' : 'car-outline'} size={el.w < 40 ? 14 : 20} color={color} />
          <Text style={[styles.slotBoxText, { color, fontSize: el.w < 40 ? 8 : 10 }]}>{el.name}</Text>
        </Pressable>
      );
    }

    if (el.type === 'zone') {
      const themeColor = el.color || 'purple';
      const borderColors: Record<string, string> = { purple: '#a855f7', emerald: '#10b981', blue: '#3b82f6', amber: '#f59e0b' };
      const bgColors: Record<string, string> = { purple: 'rgba(168,85,247,0.1)', emerald: 'rgba(16,185,129,0.1)', blue: 'rgba(59,130,246,0.1)', amber: 'rgba(245,158,11,0.1)' };
      const color = borderColors[themeColor] || '#a855f7';

      return (
        <View key={el.id} style={[baseStyle, { backgroundColor: bgColors[themeColor] || 'rgba(168,85,247,0.1)', borderColor: color, borderWidth: 2, borderRadius: 12 }]} pointerEvents="none">
          {hasName && (
            <View style={{ position: 'absolute', top: -16, left: 16, backgroundColor: 'white', borderColor: color, borderWidth: 2, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}>{el.name}</Text>
            </View>
          )}
        </View>
      );
    }

    if (el.type === 'wall') {
      return (
        <View
          key={el.id}
          style={[baseStyle, { backgroundColor: '#475569', borderColor: '#334155', borderWidth: 2, borderRadius: 4 }]}
          pointerEvents="none"
        />
      );
    }

    if (el.type === 'door' || el.type === 'entry') {
      return (
        <View key={el.id} style={[baseStyle, { backgroundColor: 'rgba(52,211,153,0.2)', borderColor: 'rgba(52,211,153,0.5)', borderWidth: 1, borderRadius: 2 }]} pointerEvents="none">
          <Text style={{ color: '#34d399', fontSize: 8, fontWeight: 'bold', letterSpacing: 2 }}>ENTRANCE</Text>
        </View>
      );
    }

    if (el.type === 'exit') {
      return (
        <View key={el.id} style={[baseStyle, { backgroundColor: 'rgba(248,113,113,0.2)', borderColor: 'rgba(248,113,113,0.5)', borderWidth: 1, borderRadius: 2 }]} pointerEvents="none">
          <Text style={{ color: '#f87171', fontSize: 8, fontWeight: 'bold', letterSpacing: 2 }}>EXIT</Text>
        </View>
      );
    }

    if (el.type === 'gate') {
      return (
        <View key={el.id} style={[baseStyle, { backgroundColor: '#dcfce7', borderColor: '#22c55e', borderWidth: 2, borderRadius: 4 }]} pointerEvents="none">
          <Text style={{ color: '#15803d', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>{el.name || 'GATE'}</Text>
        </View>
      );
    }

    if (el.type === 'road') {
      return (
        <View key={el.id} style={[baseStyle, { opacity: 0.6, flexDirection: 'row', gap: 8 }]} pointerEvents="none">
          <Ionicons name="arrow-forward" size={24} color="#f59e0b" />
          <Text style={{ color: '#f59e0b', fontSize: 18, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' }}>{el.name}</Text>
        </View>
      );
    }

    if (el.type === 'pillar') {
      return (
        <View key={el.id} style={[baseStyle, { backgroundColor: '#cbd5e1', borderColor: '#94a3b8', borderWidth: 2, borderRadius: 2 }]} pointerEvents="none">
          <Text style={{ color: '#475569', fontSize: 10, fontWeight: 'bold' }}>{el.name}</Text>
        </View>
      );
    }

    if (el.type === 'elevator') {
      return (
        <View key={el.id} style={[baseStyle, { backgroundColor: '#f8fafc', borderColor: '#cbd5e1', borderWidth: 4, borderStyle: 'dotted', borderRadius: 4 }]} pointerEvents="none">
          <Ionicons name="layers-outline" size={20} color="#94a3b8" />
          <Text style={{ color: '#64748b', fontSize: 10, fontWeight: 'bold' }}>{el.name}</Text>
        </View>
      );
    }
    
    if (el.type === 'sign') {
      return (
        <View key={el.id} style={[baseStyle, { justifyContent: 'center', alignItems: 'center' }]} pointerEvents="none">
          <View style={{ backgroundColor: '#ef4444', width: '100%', height: '100%', borderRadius: 100, borderColor: 'white', borderWidth: 3, justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
            <Text style={{ color: 'white', fontWeight: '900', fontSize: el.w < 30 ? 6 : 10, textAlign: 'center' }}>{el.name}</Text>
          </View>
          <View style={{ width: 4, height: 32, backgroundColor: '#94a3b8', position: 'absolute', bottom: -24, zIndex: 0 }} />
        </View>
      );
    }

    if (el.type === 'ramp') {
      return (
        <View key={el.id} style={[baseStyle, { backgroundColor: '#cbd5e1', borderColor: '#64748b', borderWidth: 2, borderRadius: 2 }]} pointerEvents="none">
          <Ionicons name="navigate-outline" size={20} color="#475569" />
          <Text style={{ color: '#334155', fontSize: 10, fontWeight: 'bold' }}>{el.name}</Text>
        </View>
      );
    }

    return null; // Fallback for unsupported types
  };

  return (
    <View style={[styles.container, { width: mapWidth, height: mapHeight }]}>
      {/* Background Grid Pattern (Simulated with absolute views or just plain background for simplicity) */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {/* React Native doesn't have a simple repeating linear gradient background like CSS. 
            We'll stick to a solid color to maintain performance. */}
      </View>
      
      {layout.elements.map((el: any) => renderElement(el))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: COLORS.surface,
  },
  slotBox: {
    borderRadius: 4,
    borderWidth: 1.5,
  },
  slotBoxText: {
    fontWeight: '700',
    marginTop: 2,
  },
});

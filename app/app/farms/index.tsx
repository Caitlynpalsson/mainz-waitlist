import { useState } from 'react';
import { Text, View } from 'react-native';
import { Shell } from '../../src/components/chrome';
import { Cap, FarmTile, Pill, Wrap, useBoxWidth } from '../../src/components/ui';
import { useApi } from '../../src/lib/useApi';
import { originQuery, usePlace } from '../../src/lib/place';
import type { FarmCard } from '../../src/lib/types';
import { colors, useLayout } from '../../src/theme';

export default function Farms() {
  const [mode, setMode] = useState<'all' | 'pickup' | 'delivery'>('all');
  const here = usePlace();
  const filter = mode === 'all' ? '' : `fulfillment=${mode}&`;
  const { data, error, loading } = useApi<{ farms: FarmCard[] }>(
    here.ready ? `/api/farms?${filter}${originQuery(here.place)}` : null,
  );
  const { desktop, farmCols } = useLayout();
  const gap = 18;
  const cell = useBoxWidth(farmCols, gap);
  const farms = data?.farms || [];
  const rows: FarmCard[][] = [];
  farms.forEach((farm, index) => {
    const row = Math.floor(index / farmCols);
    rows[row] = rows[row] || [];
    rows[row].push(farm);
  });

  return (
    <Shell nav="farms" tab="farms" showTabs top="bar" title="farms">
      <Wrap style={{ paddingTop: desktop ? 56 : 12 }}>
        <View style={{ alignItems: desktop ? 'center' : 'flex-start' }}>
          <Cap>farms near you</Cap>
          <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '600', color: colors.navy, marginTop: 12 }}>
            approved farms. nobody else.
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 22, justifyContent: desktop ? 'center' : 'flex-start' }}>
          <Pill label="all" on={mode === 'all'} onPress={() => setMode('all')} />
          <Pill label="pickup" on={mode === 'pickup'} onPress={() => setMode('pickup')} />
          <Pill label="delivery" on={mode === 'delivery'} onPress={() => setMode('delivery')} />
        </View>
        {error ? <Text style={quiet}>{error}</Text> : null}
        {loading && !data ? <Text style={quiet}>loading.</Text> : null}
        <View style={{ gap, marginTop: 28 }}>
          {rows.map((row, index) => (
            <View key={index} style={{ flexDirection: 'row', gap }}>
              {row.map((farm) => (
                <View key={farm.id} style={{ width: cell }}><FarmTile farm={farm} /></View>
              ))}
            </View>
          ))}
        </View>
        {!loading && farms.length === 0 ? <Text style={quiet}>no farms in that filter.</Text> : null}
      </Wrap>
    </Shell>
  );
}

const quiet = { fontFamily: 'Inter' as const, color: colors.gray, marginTop: 24, fontSize: 13 };

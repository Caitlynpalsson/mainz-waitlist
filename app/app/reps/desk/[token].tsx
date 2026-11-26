import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Shell } from '../../../src/components/chrome';
import { Wrap } from '../../../src/components/ui';
import { api } from '../../../src/lib/api';
import { dollars } from '../../../src/lib/money';
import { RATE_COMING } from '../../../../api/src/reps';
import { colors, useLayout } from '../../../src/theme';

type Desk = {
  name: string;
  code: string;
  sample: boolean;
  applyPath: string;
  farms: { name: string; status: string; soldCents: number; commissionCents: number | null }[];
};

export default function RepDesk() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { desktop } = useLayout();
  const [data, setData] = useState<Desk | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api<Desk>(`/api/reps/desk/${token}`)
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [token]);

  const sold = data?.farms.reduce((sum, farm) => sum + farm.soldCents, 0) || 0;
  const share = data?.farms.every((farm) => farm.commissionCents == null)
    ? null
    : data?.farms.reduce((sum, farm) => sum + (farm.commissionCents || 0), 0);

  return (
    <Shell top="bar" title="your farms">
      <Wrap style={{ paddingTop: desktop ? 64 : 24 }}>
        <View style={{ maxWidth: 520, alignSelf: 'center', width: '100%' }}>
          {error ? <Text style={err}>{error}</Text> : null}
          {!data && !error ? <Text style={quiet}>loading.</Text> : null}
          {data ? (
            <>
              <Text style={headline}>{data.name.toLowerCase()}</Text>
              {data.sample ? <Text style={quiet}>sample rep, for a look around.</Text> : null}
              <Text style={body}>farms you sent. each one is reviewed like every other farm.</Text>
              <Text style={quiet}>your link is /apply?rep={data.code}</Text>
              {data.farms.length === 0 ? <Text style={body}>no farms yet.</Text> : null}
              {data.farms.map((farm) => (
                <View key={farm.name} style={card}>
                  <Text style={name}>{farm.name.toLowerCase()}</Text>
                  <Text style={quiet}>{farm.status}</Text>
                  <Text style={quiet}>sold {dollars(farm.soldCents)}</Text>
                  <Text style={quiet}>{farm.commissionCents == null ? RATE_COMING : `your share ${dollars(farm.commissionCents)}`}</Text>
                </View>
              ))}
              <Text style={[body, { marginTop: 28 }]}>sold so far {dollars(sold)}</Text>
              <Text style={body}>{share == null ? RATE_COMING : `your share so far ${dollars(share)}`}</Text>
            </>
          ) : null}
        </View>
      </Wrap>
    </Shell>
  );
}

const headline = { fontFamily: 'Inter' as const, fontSize: 28, fontWeight: '600' as const, letterSpacing: -0.6, color: colors.navy, textAlign: 'center' as const };
const body = { fontFamily: 'Inter' as const, fontSize: 15, lineHeight: 22, color: colors.ink, textAlign: 'center' as const, marginTop: 12 };
const quiet = { fontFamily: 'Inter' as const, fontSize: 13, lineHeight: 18, color: colors.gray, textAlign: 'center' as const, marginTop: 8 };
const err = { fontFamily: 'Inter' as const, color: colors.red, textAlign: 'center' as const };
const name = { fontFamily: 'Inter' as const, fontSize: 16, fontWeight: '600' as const, color: colors.navy };
const card = { marginTop: 18, padding: 18, borderRadius: 18, backgroundColor: colors.cream };

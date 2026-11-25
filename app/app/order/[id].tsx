import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Shell } from '../../src/components/chrome';
import { Cap, Hair, PrimaryButton, Wrap } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { useApi } from '../../src/lib/useApi';
import { useStore } from '../../src/lib/store';
import { dollars } from '../../src/lib/money';
import { colors, useLayout } from '../../src/theme';

type Order = {
  order: {
    publicId: string;
    paymentStatus: string;
    customerName: string;
    deliveryAddress: string;
    merchandiseCents: number;
    deliveryFeeCents: number;
    platformFeeCents: number;
    totalCents: number;
    route?: {
      name: string;
      runDate: string;
      status: string;
      line: string;
      feeState: string;
      notes: string[];
      choiceOpen: boolean;
    };
    groups: {
      farmName: string;
      farmCity: string;
      fulfillment: string;
      windowLabel: string;
      lines: { name: string; optionLabel: string; qty: number; lineCents: number }[];
    }[];
  };
};

export default function OrderPage() {
  const params = useLocalSearchParams<{ id: string; paid?: string }>();
  const id = params.id;
  const paidFlag = params.paid === '1';
  const store = useStore();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (paidFlag && store.ready) store.clearLines();
  }, [paidFlag, store.ready]);
  const [choiceError, setChoiceError] = useState('');
  const { data, error } = useApi<Order>(id ? `/api/orders/${id}?t=${tick}` : null);
  const { desktop } = useLayout();
  const order = data?.order;

  async function choose(choice: 'pickup' | 'next') {
    if (!id) return;
    setChoiceError('');
    try {
      await api(`/api/orders/${id}/choice`, { method: 'POST', body: JSON.stringify({ choice }) });
      setTick((current) => current + 1);
    } catch (err) {
      setChoiceError(err instanceof Error ? err.message : 'try again.');
    }
  }
  return (
    <Shell top="bar" title="order">
      <Wrap style={{ paddingTop: desktop ? 64 : 16 }}>
        <View style={{ maxWidth: 560, alignSelf: 'center', width: '100%' }}>
          {error ? <Text style={{ fontFamily: 'Inter', color: colors.red }}>{error}</Text> : null}
          {order ? (
            <>
              <Cap>order placed</Cap>
              <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '600', color: colors.navy, marginTop: 12 }}>
                {paidFlag || order.paymentStatus === 'paid_test' ? 'test payment received.' : 'waiting on the test payment.'}
              </Text>
              <Text style={{ fontFamily: 'Inter', color: colors.gray, marginTop: 8 }}>{order.publicId}</Text>
              {order.deliveryAddress ? <Text style={{ fontFamily: 'Inter', marginTop: 8, color: colors.ink }}>{order.deliveryAddress}</Text> : null}
              {order.route?.line ? <Text style={quiet}>{order.route.line}</Text> : null}
              {order.route?.status ? <Text style={quiet}>{order.route.status.replace(/_/g, ' ')}</Text> : null}
              {order.route?.notes?.map((note) => <Text key={note} style={quiet}>{note}</Text>)}
              {order.route?.choiceOpen ? (
                <View style={{ marginTop: 16, alignItems: 'center' }}>
                  <Pressable onPress={() => choose('pickup')} style={{ padding: 8 }}>
                    <Text style={choice}>switch to pickup</Text>
                  </Pressable>
                  <Pressable onPress={() => choose('next')} style={{ padding: 8 }}>
                    <Text style={choice}>move to next run</Text>
                  </Pressable>
                  {choiceError ? <Text style={[quiet, { color: colors.red }]}>{choiceError}</Text> : null}
                </View>
              ) : null}
              {order.groups.map((group) => (
                <View key={group.farmName} style={{ marginTop: 28 }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.gray }}>
                    {group.farmName.toLowerCase()} · {group.fulfillment} {group.windowLabel}
                  </Text>
                  {group.lines.map((line) => (
                    <View key={line.name + line.optionLabel} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 }}>
                      <Text style={{ fontFamily: 'Inter', color: colors.navy }}>{line.qty} {line.name}{line.optionLabel ? ` · ${line.optionLabel}` : ''}</Text>
                      <Text style={{ fontFamily: 'Inter', fontWeight: '600', color: colors.navy }}>{dollars(line.lineCents)}</Text>
                    </View>
                  ))}
                </View>
              ))}
              <View style={{ marginTop: 12 }}><Hair /></View>
              <Row k="to the farmers" v={dollars(order.merchandiseCents)} />
              <Row k={feeLabel(order.route?.feeState)} v={dollars(order.deliveryFeeCents)} />
              <Row k="transaction fee" v={dollars(order.platformFeeCents)} />
              <Row k="total" v={dollars(order.totalCents)} />
              <Text style={{ fontFamily: 'Inter', color: colors.gray, marginTop: 18, textAlign: 'center' }}>
                farmers keep their price. we add a small fee. that's it.
              </Text>
              <View style={{ marginTop: 24 }}>
                <PrimaryButton label="back to browse" onPress={() => router.replace('/')} />
              </View>
            </>
          ) : null}
        </View>
      </Wrap>
    </Shell>
  );
}

function feeLabel(state?: string): string {
  if (state === 'waived') return 'delivery fee, not charged';
  if (state === 'held') return 'delivery fee, held';
  if (state === 'not_charged') return 'delivery fee, not charged yet';
  return 'delivery fee';
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
      <Text style={{ fontFamily: 'Inter', color: colors.gray }}>{k}</Text>
      <Text style={{ fontFamily: 'Inter', color: colors.navy }}>{v}</Text>
    </View>
  );
}

const quiet = { fontFamily: 'Inter' as const, fontSize: 13, lineHeight: 18, color: colors.gray, textAlign: 'center' as const, marginTop: 10 };
const choice = { fontFamily: 'Inter' as const, fontSize: 14, fontWeight: '600' as const, color: colors.navy };

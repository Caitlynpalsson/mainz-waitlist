import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Shell } from '../../src/components/chrome';
import { Cap, Hair, PrimaryButton, Wrap } from '../../src/components/ui';
import { useApi } from '../../src/lib/useApi';
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error } = useApi<Order>(id ? `/api/orders/${id}` : null);
  const { desktop } = useLayout();
  const order = data?.order;
  return (
    <Shell top="bar" title="order">
      <Wrap style={{ paddingTop: desktop ? 64 : 16 }}>
        <View style={{ maxWidth: 560, alignSelf: 'center', width: '100%' }}>
          {error ? <Text style={{ fontFamily: 'Inter', color: colors.red }}>{error}</Text> : null}
          {order ? (
            <>
              <Cap>order placed</Cap>
              <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '600', color: colors.navy, marginTop: 12 }}>
                no payment taken. this is a test.
              </Text>
              <Text style={{ fontFamily: 'Inter', color: colors.gray, marginTop: 8 }}>{order.publicId}</Text>
              {order.deliveryAddress ? <Text style={{ fontFamily: 'Inter', marginTop: 8, color: colors.ink }}>{order.deliveryAddress}</Text> : null}
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
              <Row k="delivery fee" v={dollars(order.deliveryFeeCents)} />
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

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
      <Text style={{ fontFamily: 'Inter', color: colors.gray }}>{k}</Text>
      <Text style={{ fontFamily: 'Inter', color: colors.navy }}>{v}</Text>
    </View>
  );
}

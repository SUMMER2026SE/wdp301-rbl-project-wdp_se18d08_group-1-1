import { Card, AppText } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/theme';

export const HomeScreen = () => {
  const { user } = useAuth();

  return (
    <Screen>
      <AppText variant="h1">Home</AppText>
      <Card>
        <AppText variant="h3">Hello, {user?.username || 'Customer'}</AppText>
        <AppText color={colors.light.text.secondary}>Your parking account is ready.</AppText>
      </Card>
    </Screen>
  );
};

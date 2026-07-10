import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ProfileScreen               from '../screens/customer/ProfileScreen';
import { EditProfileScreen }       from '../screens/profile/EditProfileScreen';
import { ChangePasswordScreen }    from '../screens/profile/ChangePasswordScreen';
import { VehicleListScreen }       from '../screens/profile/VehicleListScreen';
import { AddVehicleScreen }        from '../screens/profile/AddVehicleScreen';
import { EditVehicleScreen }       from '../screens/profile/EditVehicleScreen';
import { ServiceListScreen }       from '../screens/profile/ServiceListScreen';
import { PoliciesListScreen }      from '../screens/profile/PoliciesListScreen';
import { PolicyDetailScreen }      from '../screens/profile/PolicyDetailScreen';
import { ParkingHistoryScreen }    from '../screens/customer/ParkingHistoryScreen';
import type { ProfileStackParamList } from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export const ProfileStackNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
      contentStyle: { backgroundColor: '#0D0D0D' },
    }}
  >
    <Stack.Screen name="Profile"         component={ProfileScreen} />
    <Stack.Screen name="EditProfile"     component={EditProfileScreen} />
    <Stack.Screen name="ChangePassword"  component={ChangePasswordScreen} />
    <Stack.Screen name="VehicleList"     component={VehicleListScreen} />
    <Stack.Screen name="AddVehicle"      component={AddVehicleScreen} />
    <Stack.Screen name="EditVehicle"     component={EditVehicleScreen} />
    <Stack.Screen name="Services"        component={ServiceListScreen} />
    <Stack.Screen name="Policies"        component={PoliciesListScreen} />
    <Stack.Screen name="PolicyDetail"    component={PolicyDetailScreen} />
    <Stack.Screen name="ParkingHistory"  component={ParkingHistoryScreen} />
  </Stack.Navigator>
);

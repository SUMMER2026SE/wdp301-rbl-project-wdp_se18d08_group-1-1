import { fireEvent, render } from '@testing-library/react-native';
import { Button } from 'react-native';

import { AppAlertProvider, useAppAlert } from '../AppAlertContext';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const ErrorTrigger = () => {
  const { alert } = useAppAlert();
  return <Button title="Open error" onPress={() => alert('Lỗi', 'Không thể thực hiện thao tác.')} />;
};

const ConfirmTrigger = ({ onConfirm }: { onConfirm: () => void }) => {
  const { alert } = useAppAlert();
  return (
    <Button
      title="Open confirm"
      onPress={() =>
        alert('Xoá xe', 'Bạn có chắc không?', [
          { text: 'Huỷ', style: 'cancel' },
          { text: 'Xoá', style: 'destructive', onPress: onConfirm },
        ])
      }
    />
  );
};

describe('AppAlertProvider', () => {
  it('renders a branded modal for simple alerts', () => {
    const screen = render(
      <AppAlertProvider>
        <ErrorTrigger />
      </AppAlertProvider>,
    );

    fireEvent.press(screen.getByText('Open error'));

    expect(screen.getByText('Lỗi')).toBeTruthy();
    expect(screen.getByText('Không thể thực hiện thao tác.')).toBeTruthy();
    expect(screen.getByText('Đóng')).toBeTruthy();
  });

  it('preserves destructive confirmation callbacks', () => {
    const onConfirm = jest.fn();
    const screen = render(
      <AppAlertProvider>
        <ConfirmTrigger onConfirm={onConfirm} />
      </AppAlertProvider>,
    );

    fireEvent.press(screen.getByText('Open confirm'));
    fireEvent.press(screen.getByText('Xoá'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Bạn có chắc không?')).toBeNull();
  });
});

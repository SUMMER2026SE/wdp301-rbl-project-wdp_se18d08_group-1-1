# Mobile app

Expo + React Native mobile app for testing the backend API connection.

## Run

```bash
cd mobile
npm install
npx expo start
```

Then open the app with Expo Go, an emulator, or a simulator.

## API URL

The API base URL is read from `.env`:

```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

Use the right host for your runtime:

- Web or iOS simulator: `http://localhost:5000/api`
- Android emulator: `http://10.0.2.2:5000/api`
- Real phone: use your computer LAN IP, for example `http://192.168.x.x:5000/api`

After changing `.env`, restart Expo. If the old value is still cached, run:

```bash
npx expo start -c
```

## Test backend connection

1. Start the backend server.
2. Confirm the backend exposes `GET /api/health`.
3. Start the mobile app.
4. Press **Test API** on the first screen.

The app calls `src/api/auth.api.ts`, which uses `src/api/axiosClient.ts`. The screen does not hardcode the API URL.

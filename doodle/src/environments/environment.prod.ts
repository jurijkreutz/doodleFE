export const environment = {
  production: true,
  REST_URL: '/api',
  WEBSOCKET_URL: `${window.location.protocol === 'https:' ? 'wss://' : 'ws://'}${window.location.host}/native-ws`
};

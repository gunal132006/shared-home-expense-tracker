export const triggerHaptic = (type = 'light') => {
  if (!navigator || !navigator.vibrate) return;

  try {
    switch (type) {
      case 'light':
        // A very subtle, short tick
        navigator.vibrate(10);
        break;
      case 'medium':
        // A slightly stronger tap
        navigator.vibrate(20);
        break;
      case 'heavy':
        // A solid confirmation
        navigator.vibrate(40);
        break;
      case 'success':
        // Two quick ascending taps
        navigator.vibrate([10, 30, 20]);
        break;
      case 'error':
        // Three quick buzzes
        navigator.vibrate([20, 40, 20, 40, 20]);
        break;
      default:
        navigator.vibrate(10);
    }
  } catch (error) {
    // Graceful fallback for devices that restrict vibrate without interaction
    console.debug('Haptics not supported or permitted on this device.');
  }
};

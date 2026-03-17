/**
 * Confirmation Dialog Utilities
 * 
 * Reusable alert patterns for common confirmation scenarios.
 * Provides consistent UX for destructive actions and important decisions.
 */

import { Alert, Platform } from 'react-native';

export type ConfirmOptions = {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

/**
 * Confirm deletion of an item
 * 
 * @param {string} itemName - Name of item being deleted (shown in message)
 * @param {function} onConfirm - Callback when user confirms deletion
 * @param {object} options - Optional overrides
 * 
 * @example
 * confirmDelete('Dinner with Sarah', async () => {
 *   await CalendarService.deleteEvent(eventId);
 *   haptics.success();
 * });
 */
export function confirmDelete(itemName: string, onConfirm: () => void, options: ConfirmOptions = {}) {
  const {
    title = 'Delete this item?',
    message = `"${itemName}" will be permanently deleted. This cannot be undone.`,
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
  } = options;

  Alert.alert(
    title,
    message,
    [
      { text: cancelLabel, style: 'cancel' },
      { text: confirmLabel, style: 'destructive', onPress: onConfirm }
    ],
    { cancelable: true }
  );
}

/**
 * Confirm a destructive action (red/warning style)
 * 
 * @param {string} title - Alert title
 * @param {string} message - Alert description
 * @param {string} confirmLabel - Confirm button label
 * @param {function} onConfirm - Callback when confirmed
 * 
 * @example
 * confirmDestructive(
 *   'Remove connection?',
 *   "You'll no longer share calendars with Sarah",
 *   'Remove',
 *   async () => {
 *     await ConnectionsService.removeConnection(connectionId);
 *   }
 * );
 */
export function confirmDestructive(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  Alert.alert(
    title,
    message,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: confirmLabel, style: 'destructive', onPress: onConfirm }
    ],
    { cancelable: true }
  );
}

/**
 * Confirm a regular action (default style)
 * 
 * @param {string} title - Alert title
 * @param {string} message - Alert description
 * @param {string} confirmLabel - Confirm button label
 * @param {function} onConfirm - Callback when confirmed
 * 
 * @example
 * confirmAction(
 *   'Mark as complete?',
 *   'This task will be marked as done',
 *   'Complete',
 *   async () => {
 *     await TasksService.completeTask(taskId);
 *   }
 * );
 */
export function confirmAction(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  Alert.alert(
    title,
    message,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: confirmLabel, style: 'default', onPress: onConfirm }
    ],
    { cancelable: true }
  );
}

/**
 * Show info/success message (single button)
 * 
 * @param {string} title - Alert title
 * @param {string} message - Alert description
 * @param {function} onDismiss - Optional callback when dismissed
 * 
 * @example
 * showInfo(
 *   'Event created!',
 *   'Your event has been added to the calendar',
 *   () => navigation.goBack()
 * );
 */
export function showInfo(title: string, message: string, onDismiss?: () => void) {
  Alert.alert(
    title,
    message,
    [{ text: 'OK', onPress: onDismiss }],
    { cancelable: false }
  );
}

/**
 * Show error message (single button)
 * 
 * @param {string} title - Error title
 * @param {string} message - Error description
 * @param {function} onDismiss - Optional callback when dismissed
 * 
 * @example
 * showError(
 *   'Failed to save',
 *   'Could not connect to the server. Please try again.',
 *   () => {
 *     // optional onDismiss
 *     if (__DEV__)
 *   }
 * );
 */
export function showError(title: string, message: string, onDismiss?: () => void) {
  Alert.alert(
    title || 'Error',
    message || "We couldn't complete that. Check your internet connection and try again.",
    [{ text: 'OK', onPress: onDismiss }],
    { cancelable: false }
  );
}

/**
 * Confirm with three options (e.g., Save/Don't Save/Cancel)
 * 
 * @param {string} title - Alert title
 * @param {string} message - Alert description
 * @param {object} options - Button configuration
 * 
 * @example
 * confirmThreeWay(
 *   'Save changes?',
 *   'You have unsaved changes',
 *   {
 *     primaryLabel: 'Save',
 *     primaryAction: async () => await save(),
 *     secondaryLabel: "Don't Save",
 *     secondaryAction: () => navigation.goBack(),
 *     cancelLabel: 'Cancel'
 *   }
 * );
 */
export function confirmThreeWay(
  title: string,
  message: string,
  options: {
    primaryLabel: string;
    primaryAction: () => void | Promise<void>;
    secondaryLabel: string;
    secondaryAction: () => void | Promise<void>;
    cancelLabel?: string;
  }
) {
  const {
    primaryLabel,
    primaryAction,
    secondaryLabel,
    secondaryAction,
    cancelLabel = 'Cancel',
  } = options;

  const buttons = [
    { text: cancelLabel, style: 'cancel' },
    { text: secondaryLabel, style: 'destructive', onPress: secondaryAction },
    { text: primaryLabel, style: 'default', onPress: primaryAction },
  ];

  // On iOS, show in order: Cancel, Destructive, Default
  // On Android, buttons appear in reverse order
  Alert.alert(
    title,
    message,
    Platform.OS === 'ios' ? buttons : buttons.reverse(),
    { cancelable: true }
  );
}

/**
 * Confirm with custom buttons
 * 
 * @param {string} title - Alert title
 * @param {string} message - Alert description
 * @param {array} buttons - Array of button configurations
 * 
 * @example
 * confirmCustom(
 *   'Choose action',
 *   'What would you like to do?',
 *   [
 *     { text: 'Edit', onPress: () => edit() },
 *     { text: 'Duplicate', onPress: () => duplicate() },
 *     { text: 'Delete', style: 'destructive', onPress: () => deleteItem() },
 *     { text: 'Cancel', style: 'cancel' }
 *   ]
 * );
 */
export function confirmCustom(
  title: string,
  message: string,
  buttons: Array<{ text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void | Promise<void> }>
) {
  Alert.alert(title, message, buttons, { cancelable: true });
}

// Export all functions
export default {
  confirmDelete,
  confirmDestructive,
  confirmAction,
  showInfo,
  showError,
  confirmThreeWay,
  confirmCustom,
};

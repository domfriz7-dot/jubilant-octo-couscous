import { useEffect } from 'react';
import { initTelemetry } from '../../services/Telemetry';

/**
 * Bootstraps telemetry once on app start.
 * Failures are swallowed to avoid blocking the UI.
 */
/**
 * Bootstrap telemetry/analytics setup (safe no-op if disabled).
 *
 * @returns {void}
 */
export default function useBootstrapTelemetry() {
  useEffect(() => {
    initTelemetry().catch(() => {});
  }, []);
}

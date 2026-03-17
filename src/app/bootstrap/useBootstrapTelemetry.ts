import { useEffect } from 'react';
import { initTelemetry } from '../../services/Telemetry';

export default function useBootstrapTelemetry(): void {
  useEffect(() => {
    initTelemetry();
  }, []);
}

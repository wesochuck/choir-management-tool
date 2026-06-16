import { useMutation, useQuery } from '@tanstack/react-query';
import { ticketService, type ValidationResult, type ScanContext } from '../services/ticketService';
import { queryKeys } from '../lib/queryKeys';

export function useValidateScan() {
    return useMutation<ValidationResult, Error, { token: string; eventId: string }>({
        mutationFn: ({ token, eventId }) => ticketService.validateScan(token, eventId),
    });
}

export function useScanContext(sessionId: string | null, purchaseId: string | null) {
    return useQuery<ScanContext | null, Error>({
        queryKey: queryKeys.tickets.scanContext(sessionId || '', purchaseId || ''),
        queryFn: () =>
            sessionId && purchaseId
                ? ticketService.getScanContext(sessionId, purchaseId)
                : null,
        enabled: !!sessionId && !!purchaseId,
        staleTime: Infinity,
    });
}

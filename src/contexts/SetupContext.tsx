import React, { createContext, useContext, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { setupService } from '../services/setupService';
import { getPublicModuleState } from '../services/moduleService';
import type { PublicSetupStatus } from '../../pocketbase/pb_hooks_src/setup/setupTypes';
import type { ModuleId } from '../lib/modules';
import { pb } from '../lib/pocketbase';

interface SetupContextValue {
  loading: boolean;
  unavailable: boolean;
  status: PublicSetupStatus | undefined;
  enabledModules: Set<ModuleId>;
  refreshStatus: () => Promise<void>;
  refreshModules: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const SetupContext = createContext<SetupContextValue | undefined>(undefined);

export const SetupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.setup.status });
      void queryClient.invalidateQueries({ queryKey: queryKeys.modules.state });
    });
    return () => unsubscribe();
  }, [queryClient]);

  const statusQuery = useQuery<PublicSetupStatus>({
    queryKey: queryKeys.setup.status,
    queryFn: () => setupService.getStatus(),
    retry: false,
  });

  const modulesQuery = useQuery({
    queryKey: queryKeys.modules.state,
    queryFn: () => getPublicModuleState(),
    retry: false,
  });

  const refreshStatus = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.setup.status });
  }, [queryClient]);

  const refreshModules = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.modules.state });
  }, [queryClient]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.setup.status }),
      queryClient.invalidateQueries({ queryKey: queryKeys.modules.state }),
    ]);
  }, [queryClient]);

  const enabledModules = useMemo(() => {
    if (modulesQuery.data && Array.isArray(modulesQuery.data.enabled)) {
      return new Set<ModuleId>(modulesQuery.data.enabled);
    }
    return new Set<ModuleId>();
  }, [modulesQuery.data]);

  const value = useMemo(
    () => ({
      loading: statusQuery.isLoading || modulesQuery.isLoading,
      unavailable: statusQuery.isError || modulesQuery.isError,
      status: statusQuery.data,
      enabledModules,
      refreshStatus,
      refreshModules,
      refreshAll,
    }),
    [
      statusQuery.isLoading,
      statusQuery.isError,
      statusQuery.data,
      modulesQuery.isLoading,
      modulesQuery.isError,
      enabledModules,
      refreshStatus,
      refreshModules,
      refreshAll,
    ]
  );

  return <SetupContext.Provider value={value}>{children}</SetupContext.Provider>;
};

export const useSetup = () => {
  const ctx = useContext(SetupContext);
  if (!ctx) throw new Error('useSetup must be used within SetupProvider');
  return ctx;
};

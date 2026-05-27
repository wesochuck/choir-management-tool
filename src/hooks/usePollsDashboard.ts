import { useCallback, useEffect, useState } from 'react';
import { pollService, type PollRecord, type PollResponseRecord } from '../services/pollService';

export function usePollsDashboard() {
  const [polls, setPolls] = useState<PollRecord[]>([]);
  const [responses, setResponses] = useState<PollResponseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await pollService.getDashboardData();
      setPolls(data.polls);
      setResponses(data.responses);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const deletePoll = useCallback(async (pollId: string) => {
    await pollService.deletePoll(pollId);
    setPolls((previous) => previous.filter((poll) => poll.id !== pollId));
    setResponses((previous) => previous.filter((response) => response.pollId !== pollId));
  }, []);

  return { polls, responses, isLoading, reload: loadData, deletePoll };
}

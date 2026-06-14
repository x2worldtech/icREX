import { createActor } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useHighScores() {
  const { actor, isFetching } = useActor(createActor);

  return useQuery<Array<[string, bigint]>>({
    queryKey: ["highScores"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getHighScores();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSubmitScore() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      playerName,
      score,
    }: { playerName: string; score: number }) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.submitScore(playerName, BigInt(score));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["highScores"] });
    },
  });
}

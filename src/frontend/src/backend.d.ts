import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface backendInterface {
    getHighScores(): Promise<Array<[string, bigint]>>;
    submitScore(playerName: string, score: bigint): Promise<void>;
}

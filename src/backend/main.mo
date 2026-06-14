import Map "mo:core/Map";
import MixinViews "mo:caffeineai-data-viewer/MixinViews";

actor {
  // Persistent leaderboard: player name -> best score achieved.
  let highScores = Map.empty<Text, Nat>();

  include MixinViews();

  // Submit a score for a player. Only the player's personal best is kept,
  // so replaying with a lower score never overwrites a better result.
  public func submitScore(playerName : Text, score : Nat) : async () {
    switch (highScores.get(playerName)) {
      case (?existing) {
        if (score > existing) { highScores.add(playerName, score) };
      };
      case (null) { highScores.add(playerName, score) };
    };
  };

  // Return all stored high scores as (name, score) pairs.
  // The frontend is responsible for sorting / limiting for display.
  public query func getHighScores() : async [(Text, Nat)] {
    highScores.toArray();
  };
};

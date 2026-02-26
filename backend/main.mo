import Map "mo:core/Map";
import Text "mo:core/Text";



actor {
  var highScores = Map.empty<Text, Nat>();

  public func submitScore(playerName : Text, score : Nat) : async () {
    highScores.add(playerName, score);
  };

  public query func getHighScores() : async [(Text, Nat)] {
    highScores.toArray();
  };
};

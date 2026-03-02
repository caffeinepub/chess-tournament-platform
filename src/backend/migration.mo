import Map "mo:core/Map";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Nat "mo:core/Nat";

module {
  type TournamentStatus = { #registration; #active; #completed };
  type PlayerStatus = { #active; #oneLoss; #eliminated };
  type MatchResult = { #pending; #completed };

  type Tournament = {
    id : Text;
    name : Text;
    status : TournamentStatus;
    createdAt : Int;
    winner : ?Text;
    eliminationCount : Nat;
  };

  type Player = {
    id : Text;
    tournamentId : Text;
    name : Text;
    losses : Nat;
    eliminated : Bool;
    status : PlayerStatus;
  };

  type Round = {
    roundNumber : Nat;
    tournamentId : Text;
    matches : [Match];
    completed : Bool;
  };

  type Match = {
    id : Text;
    tournamentId : Text;
    roundNumber : Nat;
    player1Id : Text;
    player2Id : Text;
    player1Name : Text;
    player2Name : Text;
    winnerId : ?Text;
    loserId : ?Text;
    result : MatchResult;
    byePlayerId : ?Text;
  };

  type OldTuple = {
    tournaments : Map.Map<Text, Tournament>;
    players : Map.Map<Text, Player>;
    rounds : Map.Map<Text, Round>;
    matches : Map.Map<Text, Match>;
  };

  type NewTuple = {
    tournaments : Map.Map<Text, Tournament>;
    players : Map.Map<Text, Player>;
    rounds : Map.Map<Text, Round>;
    matches : Map.Map<Text, Match>;
  };

  public func run(old : OldTuple) : NewTuple {
    old;
  };
};

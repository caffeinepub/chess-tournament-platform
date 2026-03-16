import Map "mo:core/Map";
import Text "mo:core/Text";

module {
  type TournamentStatus = { #registration; #active; #completed };
  type PlayerStatus = { #active; #oneLoss; #eliminated };
  type MatchResult = { #pending; #completed };

  // Old types
  type OldTournament = {
    id : Text;
    name : Text;
    status : TournamentStatus;
    createdAt : Int;
    winner : ?Text;
    eliminationCount : Nat;
  };

  type OldPlayer = {
    id : Text;
    tournamentId : Text;
    name : Text;
    losses : Nat;
    eliminated : Bool;
    status : PlayerStatus;
  };

  type OldMatch = {
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

  type OldRound = {
    roundNumber : Nat;
    tournamentId : Text;
    matches : [OldMatch];
    completed : Bool;
  };

  type OldActor = {
    tournaments : Map.Map<Text, OldTournament>;
    players : Map.Map<Text, OldPlayer>;
    rounds : Map.Map<Text, OldRound>;
    matches : Map.Map<Text, OldMatch>;
  };

  // New types
  type NewTournament = OldTournament;

  type NewPlayer = {
    id : Text;
    tournamentId : Text;
    name : Text;
    losses : Nat;
    eliminated : Bool;
    status : PlayerStatus;
    wins : Nat;
    disqualified : Bool;
    rating : Nat;
  };

  type NewMatch = OldMatch;

  type NewRound = OldRound;

  type NewActor = {
    tournaments : Map.Map<Text, NewTournament>;
    players : Map.Map<Text, NewPlayer>;
    rounds : Map.Map<Text, NewRound>;
    matches : Map.Map<Text, NewMatch>;
  };

  public func run(old : OldActor) : NewActor {
    let newPlayers = old.players.map<Text, OldPlayer, NewPlayer>(
      func(_, oldPlayer) {
        {
          oldPlayer with
          wins = 0;
          disqualified = false;
          rating = 1200;
        };
      }
    );

    {
      old with
      players = newPlayers;
    };
  };
};

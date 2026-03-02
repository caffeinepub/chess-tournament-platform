import Map "mo:core/Map";
import Text "mo:core/Text";

module {
  type TournamentStatus = {
    #registration;
    #active;
    #completed;
  };

  type PlayerStatus = {
    #active;
    #oneLoss;
    #eliminated;
  };

  type MatchResult = {
    #pending;
    #completed;
  };

  type OldTournament = {
    id : Text;
    name : Text;
    status : TournamentStatus;
    createdAt : Int;
    winner : ?Text;
  };

  type NewTournament = {
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

  type OldActor = {
    tournaments : Map.Map<Text, OldTournament>;
    players : Map.Map<Text, Player>;
    rounds : Map.Map<Text, Round>;
    matches : Map.Map<Text, Match>;
  };

  type NewActor = {
    tournaments : Map.Map<Text, NewTournament>;
    players : Map.Map<Text, Player>;
    rounds : Map.Map<Text, Round>;
    matches : Map.Map<Text, Match>;
  };

  public func run(old : OldActor) : NewActor {
    let newTournaments = old.tournaments.map<Text, OldTournament, NewTournament>(
      func(_id, oldTournament) {
        { oldTournament with eliminationCount = 2 };
      }
    );
    {
      tournaments = newTournaments;
      players = old.players;
      rounds = old.rounds;
      matches = old.matches;
    };
  };
};

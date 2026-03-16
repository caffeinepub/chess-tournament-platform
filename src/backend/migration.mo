import Map "mo:core/Map";
import Text "mo:core/Text";
import List "mo:core/List";

module {
  type TournamentStatus = { #registration; #active; #completed };
  type PlayerStatus = { #active; #oneLoss; #eliminated };
  type MatchResult = { #pending; #completed };

  type Notification = {
    id : Text;
    tournamentId : Text;
    targetPlayerName : ?Text;
    title : Text;
    body : Text;
    notifType : Text;
    createdAt : Int;
    readByPlayerNames : List.List<Text>;
  };

  type NotificationSettings = {
    matchResultEnabled : Bool;
    nextRoundEnabled : Bool;
    tournamentStartEnabled : Bool;
  };

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
    wins : Nat;
    disqualified : Bool;
    rating : Nat;
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
    tournaments : Map.Map<Text, Tournament>;
    players : Map.Map<Text, Player>;
    rounds : Map.Map<Text, Round>;
    matches : Map.Map<Text, Match>;
  };

  type NewActor = {
    tournaments : Map.Map<Text, Tournament>;
    players : Map.Map<Text, Player>;
    rounds : Map.Map<Text, Round>;
    matches : Map.Map<Text, Match>;
    notifications : Map.Map<Text, Notification>;
    notificationSettings : Map.Map<Text, NotificationSettings>;
  };

  public func run(old : OldActor) : NewActor {
    {
      tournaments = old.tournaments;
      players = old.players;
      rounds = old.rounds;
      matches = old.matches;
      notifications = Map.empty<Text, Notification>();
      notificationSettings = Map.empty<Text, NotificationSettings>();
    };
  };
};
